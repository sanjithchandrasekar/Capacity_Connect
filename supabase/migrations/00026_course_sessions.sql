-- Add course_sessions table
CREATE TABLE IF NOT EXISTS public.course_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    meet_link TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for course_sessions
CREATE POLICY "Trainers can manage sessions for their courses" ON public.course_sessions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE id = course_sessions.course_id
            AND trainer_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can view sessions for published courses" ON public.course_sessions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE id = course_sessions.course_id
            AND status = 'published'
        )
    );

-- Add session_id to materials
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.course_sessions(id) ON DELETE SET NULL;
