-- Criar tabela para membros da equipe
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  photo_url TEXT,
  bio TEXT,
  linkedin_url TEXT,
  order_position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ver membros ativos da equipe
CREATE POLICY "Qualquer pessoa pode ver membros da equipe"
ON public.team_members
FOR SELECT
USING (is_active = true);

-- Admins podem gerenciar membros da equipe
CREATE POLICY "Admins podem inserir membros"
ON public.team_members
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar membros"
ON public.team_members
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem deletar membros"
ON public.team_members
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar bucket para fotos da equipe
INSERT INTO storage.buckets (id, name, public) VALUES ('team-photos', 'team-photos', true);

-- Políticas de storage para fotos da equipe
CREATE POLICY "Fotos da equipe são públicas"
ON storage.objects
FOR SELECT
USING (bucket_id = 'team-photos');

CREATE POLICY "Admins podem fazer upload de fotos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'team-photos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar fotos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'team-photos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem deletar fotos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'team-photos' AND has_role(auth.uid(), 'admin'));