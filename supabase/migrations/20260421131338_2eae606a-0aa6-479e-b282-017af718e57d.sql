
-- 1. user_roles: agora só permite self-assign de 'candidate'
DROP POLICY IF EXISTS "Users can self-assign only candidate or company role" ON public.user_roles;

CREATE POLICY "Users can self-assign only candidate role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'candidate'::app_role
  AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
);

-- A role 'company' continua sendo criada via trigger handle_new_user (SECURITY DEFINER),
-- que já lê role do metadata do signup. Manual insert do front bloqueado.

-- 2. Storage: bucket avatars (que armazena CVs também)
-- Estrutura de path: {user_id}/avatar.jpg ou {user_id}/cv.pdf
DROP POLICY IF EXISTS "Todos podem visualizar CVs" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can read avatar files by exact path" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;

-- Avatares: leitura pública (precisa para mostrar foto em vagas etc)
-- Apenas arquivos com extensão de imagem ficam públicos; CVs (pdf/doc) não
CREATE POLICY "Public read avatar images only"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'avatars'
  AND (
    name ILIKE '%.jpg' OR name ILIKE '%.jpeg' OR
    name ILIKE '%.png' OR name ILIKE '%.webp' OR
    name ILIKE '%.gif'
  )
);

-- CVs e outros arquivos: só o dono
CREATE POLICY "Owner reads own files in avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Empresas leem CVs de candidatos que se aplicaram às suas vagas
CREATE POLICY "Company reads CVs of candidates applied to their jobs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND has_role(auth.uid(), 'company'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.candidate_id::text = (storage.foldername(name))[1]
      AND j.company_id = auth.uid()
  )
);

-- 3. screening_questions: remover acesso público
DROP POLICY IF EXISTS "Anyone can view screening questions" ON public.screening_questions;

CREATE POLICY "Authenticated users can view screening questions"
ON public.screening_questions
FOR SELECT
TO authenticated
USING (true);
