
-- 1. company_invitations: remover SELECT público
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.company_invitations;

-- Permite o dono da empresa ver os convites (já existe), e o convidado ver pelo email
CREATE POLICY "Invitee can view own invitation"
ON public.company_invitations
FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Função SECURITY DEFINER pra olhar convite por token (usada na página de aceitar convite, sem login)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token uuid)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  email text,
  name text,
  permissions text[],
  status text,
  expires_at timestamptz,
  invited_by uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, company_id, email, name, permissions, status, expires_at, invited_by
  FROM public.company_invitations
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(uuid) TO anon, authenticated;

-- 2. profiles: empresas só veem candidatos que se aplicaram às SUAS vagas
DROP POLICY IF EXISTS "Empresas podem ver perfis de candidatos" ON public.profiles;

CREATE POLICY "Empresas veem candidatos que se aplicaram às suas vagas"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'company'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.candidate_id = profiles.id
      AND j.company_id = auth.uid()
  )
);

-- 3. user_roles: bloquear privilege escalation
DROP POLICY IF EXISTS "Users can insert their own role during signup" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

CREATE POLICY "Users can self-assign only candidate or company role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role IN ('candidate'::app_role, 'company'::app_role)
  AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
);

-- 4. system_settings: bloquear leitura pública total + criar função pública só com campos públicos
DROP POLICY IF EXISTS "Qualquer pessoa pode ver número do WhatsApp" ON public.system_settings;
DROP POLICY IF EXISTS "Qualquer pessoa pode ver configurações públicas" ON public.system_settings;
DROP POLICY IF EXISTS "Anyone can view system settings" ON public.system_settings;

-- Mantém SELECT só pra admins
CREATE POLICY "Admins podem ver system_settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR is_super_admin(auth.uid()));

-- Função pública: retorna só campos não-sensíveis
CREATE OR REPLACE FUNCTION public.get_public_settings()
RETURNS TABLE (
  whatsapp_number text,
  instagram_url text,
  linkedin_url text,
  about_content text,
  privacy_policy_content text,
  terms_of_use_content text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT whatsapp_number, instagram_url, linkedin_url,
         about_content, privacy_policy_content, terms_of_use_content
  FROM public.system_settings
  ORDER BY created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_settings() TO anon, authenticated;

-- 5. Storage: bloquear listagem em massa nos buckets públicos
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

CREATE POLICY "Public can read avatar files by exact path"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars' AND name IS NOT NULL);

DROP POLICY IF EXISTS "Team photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view team photos" ON storage.objects;

CREATE POLICY "Public can read team-photo files by exact path"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'team-photos' AND name IS NOT NULL);
