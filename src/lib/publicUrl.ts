// Domínio público canônico usado em links compartilháveis (emails, share, redirects de auth)
export const PUBLIC_SITE_URL = "https://www.sinapserh.com.br";

/**
 * Retorna a URL pública absoluta para um caminho.
 * Sempre usa o domínio canônico (www.sinapserh.com.br), independente de onde o app está rodando.
 */
export function publicUrl(path: string = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_SITE_URL}${normalized}`;
}
