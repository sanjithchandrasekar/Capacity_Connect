-- Migration: 00069_contact_messages.sql
-- Description: Create contact_messages table for public contact submissions and admin management

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread', -- 'unread', 'read', 'resolved'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone (public/anon/authenticated) to insert messages
CREATE POLICY "Allow public insert to contact_messages"
ON public.contact_messages
FOR INSERT
TO public
WITH CHECK (true);

-- Allow authenticated admins to view and manage messages
CREATE POLICY "Allow admins all on contact_messages"
ON public.contact_messages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admins WHERE admins.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admins WHERE admins.id = auth.uid()
  )
);

-- Grant table privileges
GRANT ALL ON public.contact_messages TO anon, authenticated, service_role;
