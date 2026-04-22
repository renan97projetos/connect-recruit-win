// Lista de estados brasileiros (UF + nome)
export const BRAZIL_STATES = [
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' },
] as const;

const cityCache = new Map<string, string[]>();

/**
 * Busca cidades de um estado brasileiro usando a API pública do IBGE.
 * Resultados são cacheados em memória.
 */
export async function fetchCitiesByState(uf: string): Promise<string[]> {
  if (!uf) return [];
  const key = uf.toUpperCase();
  if (cityCache.has(key)) return cityCache.get(key)!;

  try {
    const res = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${key}/municipios`,
    );
    if (!res.ok) throw new Error('Falha ao buscar cidades');
    const data = await res.json();
    const cities: string[] = (data || [])
      .map((c: any) => c?.nome)
      .filter(Boolean)
      .sort((a: string, b: string) => a.localeCompare(b, 'pt-BR'));
    cityCache.set(key, cities);
    return cities;
  } catch (e) {
    console.error('[brazilLocations] erro ao buscar cidades de', uf, e);
    return [];
  }
}
