-- Create session_attendance_meta table
CREATE TABLE IF NOT EXISTS public.session_attendance_meta (
    session_id UUID PRIMARY KEY REFERENCES public.course_sessions(id) ON DELETE CASCADE,
    total_generated INT NOT NULL DEFAULT 0,
    is_manual_mapping BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.session_attendance_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their session meta" ON public.session_attendance_meta
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.course_sessions cs
            JOIN public.courses c ON c.id = cs.course_id
            WHERE cs.id = session_attendance_meta.session_id
            AND c.trainer_id = auth.uid()
        )
    );

CREATE POLICY "Trainees can view their session meta" ON public.session_attendance_meta
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.course_sessions cs
            JOIN public.enrollments e ON e.course_id = cs.course_id
            WHERE cs.id = session_attendance_meta.session_id
            AND e.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can do everything on session meta" ON public.session_attendance_meta
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admins a WHERE a.id = auth.uid()
        )
    );

-- Create session_attendance table
CREATE TABLE IF NOT EXISTS public.session_attendance (
    session_id UUID REFERENCES public.course_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    entered_count INT NOT NULL DEFAULT 0,
    status_override TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (session_id, user_id)
);

ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage attendance for their sessions" ON public.session_attendance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.course_sessions cs
            JOIN public.courses c ON c.id = cs.course_id
            WHERE cs.id = session_attendance.session_id
            AND c.trainer_id = auth.uid()
        )
    );

CREATE POLICY "Trainees can view and update their own attendance" ON public.session_attendance
    FOR ALL USING (
        user_id = auth.uid()
    );

CREATE POLICY "Admins can do everything on attendance" ON public.session_attendance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admins a WHERE a.id = auth.uid()
        )
    );

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_attendance_meta;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_attendance;
