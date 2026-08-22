-- ====================================================================
-- Socratic Challenge System & Misconception Tracking Migration
-- ====================================================================

-- 1. Socratic Sessions Table
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

CREATE POLICY "Users manage own socratic sessions" 
ON public.socratic_sessions 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS socratic_sessions_user_topic_idx ON public.socratic_sessions (user_id, topic, created_at DESC);
CREATE INDEX IF NOT EXISTS socratic_sessions_created_idx ON public.socratic_sessions (created_at DESC);

-- Trigger for updated_at on socratic_sessions
CREATE TRIGGER socratic_sessions_updated_at 
BEFORE UPDATE ON public.socratic_sessions 
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 2. Student Misconceptions Tracking Table
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

CREATE POLICY "Users manage own misconceptions" 
ON public.student_misconceptions 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS student_misconceptions_user_topic_idx ON public.student_misconceptions (user_id, topic, resolved);
CREATE INDEX IF NOT EXISTS student_misconceptions_topic_resolved_idx ON public.student_misconceptions (topic, resolved);
