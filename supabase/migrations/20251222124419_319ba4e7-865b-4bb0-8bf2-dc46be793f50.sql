-- Tabela para convites pendentes de empresa
CREATE TABLE public.company_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT company_invitations_status_check CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
);

-- Índices para busca rápida
CREATE INDEX idx_company_invitations_token ON public.company_invitations(token);
CREATE INDEX idx_company_invitations_email ON public.company_invitations(email);
CREATE INDEX idx_company_invitations_company ON public.company_invitations(company_id);

-- Enable RLS
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

-- Política para owners verem convites da sua empresa
CREATE POLICY "Owners can view their company invitations"
ON public.company_invitations
FOR SELECT
USING (company_id = auth.uid());

-- Política para owners criarem convites
CREATE POLICY "Owners can create invitations"
ON public.company_invitations
FOR INSERT
WITH CHECK (company_id = auth.uid() AND invited_by = auth.uid());

-- Política para owners cancelarem convites
CREATE POLICY "Owners can update their company invitations"
ON public.company_invitations
FOR UPDATE
USING (company_id = auth.uid());

-- Política pública para aceitar convites (via token)
CREATE POLICY "Anyone can view invitation by token"
ON public.company_invitations
FOR SELECT
USING (true);