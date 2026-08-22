-- ====================================================================
-- EDUPILOT CONSOLIDATED DATABASE MIGRATION
-- Project: Shadow_Coder / EduPilot
-- Tables: Socratic AI + Exam Mastery Planner
-- Instructions: Run this script in the Supabase Dashboard -> SQL Editor
-- ====================================================================

-- 1. Ensure set_updated_at helper function exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END; 
$$;


-- ====================================================================
-- PART 1: SOCRATIC CHALLENGE & MISCONCEPTION TRACKING
-- ====================================================================

-- Socratic Sessions Table
CREATE TABLE IF NOT EXISTS public.socratic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  question_id TEXT,
  question TEXT NOT NULL,
  expected_concept TEXT,
  student_answer TEXT NOT NULL,
  student_reasoning TEXT NOT NULL,
  initial_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  challenge TEXT,
  challenge_type TEXT,
  challenge_difficulty TEXT DEFAULT 'medium',
  student_defense TEXT,
  defense_evaluation JSONB DEFAULT '{}'::jsonb,
  misconception TEXT,
  mastery_before NUMERIC(5,2) DEFAULT 0,
  mastery_after NUMERIC(5,2) DEFAULT 0,
  strictness TEXT NOT NULL DEFAULT 'balanced',
  status TEXT NOT NULL DEFAULT 'pending_defense',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.socratic_sessions TO authenticated;
GRANT ALL ON public.socratic_sessions TO service_role;
ALTER TABLE public.socratic_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own socratic sessions" ON public.socratic_sessions;
CREATE POLICY "Users manage own socratic sessions" 
ON public.socratic_sessions 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS socratic_sessions_user_topic_idx ON public.socratic_sessions (user_id, topic, created_at DESC);
CREATE INDEX IF NOT EXISTS socratic_sessions_created_idx ON public.socratic_sessions (created_at DESC);

DROP TRIGGER IF EXISTS socratic_sessions_updated_at ON public.socratic_sessions;
CREATE TRIGGER socratic_sessions_updated_at 
BEFORE UPDATE ON public.socratic_sessions 
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Student Misconceptions Tracking Table
CREATE TABLE IF NOT EXISTS public.student_misconceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  concept TEXT NOT NULL,
  misconception TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'conceptual_misunderstanding',
  severity TEXT NOT NULL DEFAULT 'medium',
  resolved BOOLEAN NOT NULL DEFAULT false,
  frequency INTEGER NOT NULL DEFAULT 1,
  first_detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  session_id UUID REFERENCES public.socratic_sessions(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_misconceptions TO authenticated;
GRANT ALL ON public.student_misconceptions TO service_role;
ALTER TABLE public.student_misconceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own misconceptions" ON public.student_misconceptions;
CREATE POLICY "Users manage own misconceptions" 
ON public.student_misconceptions 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS student_misconceptions_user_topic_idx ON public.student_misconceptions (user_id, topic, resolved);
CREATE INDEX IF NOT EXISTS student_misconceptions_topic_resolved_idx ON public.student_misconceptions (topic, resolved);


-- ====================================================================
-- PART 2: EXAM MASTERY PLANNER (PERSONALIZED EXAM PREPARATION)
-- ====================================================================

-- 1. Exams Table
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_date DATE NOT NULL,
  target_score NUMERIC(5,2) DEFAULT 90,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own exams" ON public.exams;
CREATE POLICY "Users manage own exams" ON public.exams
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS exams_user_id_idx ON public.exams (user_id, exam_date ASC);

DROP TRIGGER IF EXISTS exams_updated_at ON public.exams;
CREATE TRIGGER exams_updated_at
  BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Uploaded Documents Table
CREATE TABLE IF NOT EXISTS public.uploaded_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'syllabus' | 'pyq'
  pyq_year INTEGER,        -- e.g. 2024, 2025
  extracted_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.uploaded_documents TO authenticated;
GRANT ALL ON public.uploaded_documents TO service_role;
ALTER TABLE public.uploaded_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own uploaded documents" ON public.uploaded_documents;
CREATE POLICY "Users manage own uploaded documents" ON public.uploaded_documents
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS uploaded_docs_exam_idx ON public.uploaded_documents (exam_id, file_type);

-- 3. Syllabus Topics Table
CREATE TABLE IF NOT EXISTS public.syllabus_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_name TEXT NOT NULL DEFAULT 'Unit 1',
  chapter_name TEXT,
  topic TEXT NOT NULL,
  subtopics JSONB NOT NULL DEFAULT '[]'::jsonb,
  weightage NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.syllabus_topics TO authenticated;
GRANT ALL ON public.syllabus_topics TO service_role;
ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own syllabus topics" ON public.syllabus_topics;
CREATE POLICY "Users manage own syllabus topics" ON public.syllabus_topics
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS syllabus_topics_exam_idx ON public.syllabus_topics (exam_id, unit_name);

-- 4. PYQ Questions Table
CREATE TABLE IF NOT EXISTS public.pyq_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  marks NUMERIC(5,2),
  question_type TEXT NOT NULL DEFAULT 'long', -- 'short' | 'long' | 'numerical' | 'conceptual'
  mapped_topic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pyq_questions TO authenticated;
GRANT ALL ON public.pyq_questions TO service_role;
ALTER TABLE public.pyq_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own pyq questions" ON public.pyq_questions;
CREATE POLICY "Users manage own pyq questions" ON public.pyq_questions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS pyq_questions_exam_idx ON public.pyq_questions (exam_id, year);

-- 5. Topic PYQ Analysis Table
CREATE TABLE IF NOT EXISTS public.topic_pyq_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  unit_name TEXT,
  pyq_count INTEGER NOT NULL DEFAULT 0,
  years_appeared JSONB NOT NULL DEFAULT '[]'::jsonb,
  repeat_pattern TEXT NOT NULL DEFAULT 'single_year',
  priority TEXT NOT NULL DEFAULT 'medium',
  priority_reason TEXT NOT NULL DEFAULT '',
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_difficulty TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, topic)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_pyq_analysis TO authenticated;
GRANT ALL ON public.topic_pyq_analysis TO service_role;
ALTER TABLE public.topic_pyq_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own topic pyq analysis" ON public.topic_pyq_analysis;
CREATE POLICY "Users manage own topic pyq analysis" ON public.topic_pyq_analysis
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS topic_analysis_exam_priority_idx ON public.topic_pyq_analysis (exam_id, priority);

DROP TRIGGER IF EXISTS topic_pyq_analysis_updated_at ON public.topic_pyq_analysis;
CREATE TRIGGER topic_pyq_analysis_updated_at
  BEFORE UPDATE ON public.topic_pyq_analysis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Student Topic Selections Table
CREATE TABLE IF NOT EXISTS public.student_topic_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  selected BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, user_id, topic)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_topic_selections TO authenticated;
GRANT ALL ON public.student_topic_selections TO service_role;
ALTER TABLE public.student_topic_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own topic selections" ON public.student_topic_selections;
CREATE POLICY "Users manage own topic selections" ON public.student_topic_selections
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Exam Study Plans Table
CREATE TABLE IF NOT EXISTS public.exam_study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  days_until_exam INTEGER NOT NULL DEFAULT 0,
  plan_schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_study_plans TO authenticated;
GRANT ALL ON public.exam_study_plans TO service_role;
ALTER TABLE public.exam_study_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own exam study plans" ON public.exam_study_plans;
CREATE POLICY "Users manage own exam study plans" ON public.exam_study_plans
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS exam_study_plans_updated_at ON public.exam_study_plans;
CREATE TRIGGER exam_study_plans_updated_at
  BEFORE UPDATE ON public.exam_study_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
