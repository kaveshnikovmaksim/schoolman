-- 1. Add new role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'class_account';

-- 2. Create class_accounts table
CREATE TABLE public.class_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_class_accounts_user_id ON public.class_accounts(user_id);
CREATE INDEX idx_class_accounts_class_id ON public.class_accounts(class_id);

ALTER TABLE public.class_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage class_accounts"
ON public.class_accounts FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Class account reads own"
ON public.class_accounts FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 3. Helper function: get class_id of current class_account user
CREATE OR REPLACE FUNCTION public.get_my_class_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT class_id FROM public.class_accounts WHERE user_id = auth.uid() LIMIT 1
$$;
