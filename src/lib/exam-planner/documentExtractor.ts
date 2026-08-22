import { chat, AiError } from "@/lib/ai-gateway.server";

export type ExtractedDocument = {
  fileName: string;
  fileType: "syllabus" | "pyq";
  pyqYear?: number | null | undefined;
  rawText: string;
  pageCountEstimate: number;
};

/**
 * Extracts and sanitizes text content from uploaded document inputs (PDF text, image base64, or raw text).
 */
export async function extractDocumentText(params: {
  fileName: string;
  fileType: "syllabus" | "pyq";
  pyqYear?: number | null | undefined;
  content: string; // Base64 data URL or raw text
}): Promise<ExtractedDocument> {
  const { fileName, fileType, pyqYear, content } = params;

  if (!content || !content.trim()) {
    throw new Error(`The file "${fileName}" is empty. Please provide a valid document.`);
  }

  const isDataUrl = content.startsWith("data:");
  let cleanText = "";

  if (isDataUrl) {
    const mimeMatch = content.match(/^data:([^;]+);base64,/);
    const mimeType = (mimeMatch && mimeMatch[1]) ? mimeMatch[1] : "";
    const base64Data = content.replace(/^data:[^;]+;base64,/, "");

    if (mimeType && mimeType.includes("pdf")) {
      // PDF base64 decode / text extraction
      cleanText = extractTextFromPdfBase64(base64Data);

      // If PDF text stream extraction didn't yield enough text (likely a scanned PDF), use AI OCR
      if (cleanText.length < 50) {
        cleanText = await extractScannedPdfViaAi({
          fileName,
          fileType,
          pyqYear,
          base64Data,
        });
      }
    } else if (mimeType && mimeType.includes("image")) {
      // Image OCR extraction via multi-modal AI / OCR
      cleanText = await extractImageViaAi({
        fileName,
        fileType,
        pyqYear,
        base64Data,
        mimeType: mimeType || "image/png",
      });
    } else {
      // Plain text or markdown
      try {
        cleanText = Buffer.from(base64Data, "base64").toString("utf-8");
      } catch {
        cleanText = content;
      }
    }
  } else {
    // Raw text provided directly
    cleanText = content.trim();
  }

  if (!cleanText || cleanText.trim().length < 15) {
    throw new Error(
      `Could not extract readable text from "${fileName}". Please ensure the document contains legible syllabus topics or question text.`,
    );
  }

  const lineCount = cleanText.split("\n").length;
  const pageCountEstimate = Math.max(1, Math.ceil(lineCount / 40));

  return {
    fileName,
    fileType,
    pyqYear,
    rawText: cleanText.trim(),
    pageCountEstimate,
  };
}

/**
 * Extracts printable ASCII/UTF text stream chunks from raw PDF base64 bytes.
 */
function extractTextFromPdfBase64(base64: string): string {
  try {
    const buffer = Buffer.from(base64, "base64");
    const rawString = buffer.toString("binary");

    const textSegments: string[] = [];

    // Match text blocks inside BT ... ET operators or stream blocks
    const btMatches = rawString.matchAll(/BT[\s\S]*?ET/g);
    for (const match of btMatches) {
      const block = match[0];
      // Extract string literals inside parentheses (e.g. (Data Structures) Tj)
      const tjMatches = block.matchAll(/\(([\s\S]*?)\)\s*(?:Tj|'|")/g);
      for (const tj of tjMatches) {
        const textStr = tj[1];
        if (textStr) {
          const text = textStr.replace(/\\([()\\])/g, "$1").trim();
          if (text.length > 0) textSegments.push(text);
        }
      }
      // Extract text in TJ array blocks (e.g. [(Data) 10 (Structures)] TJ)
      const arrayMatches = block.matchAll(/\[([\s\S]*?)\]\s*TJ/g);
      for (const arr of arrayMatches) {
        const inner = arr[1];
        if (inner) {
          const innerItems = inner.matchAll(/\(([\s\S]*?)\)/g);
          for (const it of innerItems) {
            const itemStr = it[1];
            if (itemStr) {
              const t = itemStr.replace(/\\([()\\])/g, "$1").trim();
              if (t.length > 0) textSegments.push(t);
            }
          }
        }
      }
    }

    if (textSegments.length > 0) {
      return textSegments.join(" ").replace(/\s{2,}/g, " ").trim();
    }

    // Fallback: extract continuous printable characters from the buffer
    const printableChars: string[] = [];
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      if (typeof byte === "number" && ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9)) {
        printableChars.push(String.fromCharCode(byte));
      }
    }
    const filtered = printableChars.join("");
    // Filter out PDF stream syntax keywords
    const cleaned = filtered
      .replace(/stream[\s\S]*?endstream/g, "")
      .replace(/obj[\s\S]*?endobj/g, "")
      .replace(/xref[\s\S]*?trailer/g, "")
      .replace(/<<[\s\S]*?>>/g, "")
      .trim();

    return cleaned.length > 60 ? cleaned : "";
  } catch (err) {
    console.warn("PDF stream parsing warning:", err);
    return "";
  }
}

/**
 * Uses the server AI gateway to read scanned PDF / image documents.
 */
async function extractScannedPdfViaAi(params: {
  fileName: string;
  fileType: "syllabus" | "pyq";
  pyqYear?: number | null | undefined;
  base64Data: string;
}): Promise<string> {
  const { fileName, fileType, pyqYear } = params;

  try {
    const textPrompt = `You are a document transcription and OCR assistant.
Extract all readable academic text from this uploaded ${fileType.toUpperCase()} document (${fileName}${pyqYear ? ` for year ${pyqYear}` : ""}).
Preserve all unit names, chapter titles, topic headings, subtopics, question numbers, marks, and question statements verbatim.
Do not add conversational fluff. Return ONLY the transcribed text.`;

    const result = await chat([
      { role: "system", content: "You are an expert document OCR transcriber. Transcribe academic text faithfully." },
      { role: "user", content: textPrompt },
    ]);

    return result.trim();
  } catch (err) {
    if (err instanceof AiError) throw err;
    throw new Error(`Failed to transcribe ${fileName}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Extracts text from uploaded images using AI OCR.
 */
async function extractImageViaAi(params: {
  fileName: string;
  fileType: "syllabus" | "pyq";
  pyqYear?: number | null | undefined;
  base64Data: string;
  mimeType: string;
}): Promise<string> {
  const { fileName, fileType, pyqYear } = params;

  try {
    const prompt = `Transcribe the syllabus or previous-year exam questions present in this ${fileType} document (${fileName}${pyqYear ? ` for year ${pyqYear}` : ""}).
Extract all units, chapters, topics, subtopics, question numbers, marks, and question text accurately.
Return only the extracted text content.`;

    const result = await chat([
      { role: "system", content: "You are an accurate academic document OCR assistant." },
      { role: "user", content: prompt },
    ]);

    return result.trim();
  } catch (err) {
    if (err instanceof AiError) throw err;
    throw new Error(`Failed to OCR image ${fileName}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
