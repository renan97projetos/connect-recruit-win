-- Adicionar novas permissões ao enum permission_key
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'approve_vagas';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'reject_vagas';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'delete_vagas';