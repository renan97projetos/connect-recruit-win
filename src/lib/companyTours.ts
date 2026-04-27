import type { DriveStep } from 'driver.js';

export type TourId =
  | 'dashboard'
  | 'job-pipeline'
  | 'job-requests'
  | 'job-history'
  | 'talent-pool'
  | 'employees'
  | 'profile'
  | 'career-page';

export interface TourMeta {
  id: TourId;
  label: string;
  route: string;
  steps: DriveStep[];
}

const popoverBase = { showButtons: ['next', 'previous', 'close'] as any };

export const COMPANY_TOURS: TourMeta[] = [
  {
    id: 'dashboard',
    label: 'Dashboard de Vagas',
    route: '/company/dashboard',
    steps: [
      {
        element: '[data-tour="company-logo"]',
        popover: {
          title: '👋 Bem-vindo ao SinapseRH!',
          description:
            'Este é o painel de controle da sua empresa. Aqui você gerencia todos os seus processos seletivos em um só lugar.',
          ...popoverBase,
        },
      },
      {
        element: '[data-tour="nav-main"]',
        popover: {
          title: 'Menu principal',
          description:
            '<b>Recrutamento</b>, <b>Dashboard</b>, <b>Histórico</b> e <b>Banco de Talentos</b>: navegue entre as áreas do sistema por aqui.',
          ...popoverBase,
        },
      },
      {
        element: '[data-tour="new-job-btn"]',
        popover: {
          title: 'Criar nova vaga',
          description:
            'Clique aqui para abrir o formulário de criação de vaga. Use a IA para gerar a descrição automaticamente em segundos.',
          ...popoverBase,
        },
      },
      {
        element: '[data-tour="metrics-btn"]',
        popover: {
          title: 'Métricas do processo seletivo',
          description:
            'Veja gráficos de candidaturas, funil de conversão por etapa e tempo médio em cada fase. Exporte como PDF.',
          ...popoverBase,
        },
      },
      {
        popover: {
          title: 'Tabela de vagas',
          description:
            'Todas as suas vagas aparecem aqui com o status (Ativa, Rascunho, Pausada, Encerrada) e o número de candidatos. Clique em qualquer vaga para abrir o pipeline de candidatos.',
          ...popoverBase,
        },
      },
      {
        element: '[data-tour="nav-help"]',
        popover: {
          title: 'Precisa de ajuda?',
          description:
            'A qualquer momento clique neste <b>?</b> para refazer o tour da tela atual ou ver todos os tutoriais disponíveis.',
          ...popoverBase,
        },
      },
    ],
  },
  {
    id: 'job-pipeline' as any,
    label: 'Pipeline de Candidatos',
    route: '/company/jobs',
    steps: [
      {
        popover: {
          title: 'Pipeline de candidatos',
          description:
            'Esta é a tela central do recrutamento. Cada etapa (Triagem, Entrevista, Avaliação, Proposta, Admissão) mostra quantos candidatos estão nela. Clique na etapa para ver os cards.',
          ...popoverBase,
        },
      },
      {
        popover: {
          title: 'Triagem — tabela ranqueada',
          description:
            'Na Triagem, os candidatos aparecem em tabela ordenada por score. Use o botão <b>→</b> para avançar para Entrevista ou o <b>👎</b> para reprovar (o candidato recebe um e-mail automático).',
          ...popoverBase,
        },
      },
      {
        popover: {
          title: 'Entrevista — agendamento',
          description:
            'Na etapa de Entrevista, clique no ícone de calendário para agendar: defina data, horário, formato (vídeo, presencial, telefone) e link. O candidato recebe o e-mail com todos os detalhes automaticamente.',
          ...popoverBase,
        },
      },
      {
        popover: {
          title: 'Proposta e Admissão',
          description:
            'Na etapa de Proposta, registre o salário e benefícios. O candidato recebe o e-mail. Em Admissão, solicite os documentos de contratação com um clique — o sistema envia a lista completa por e-mail.',
          ...popoverBase,
        },
      },
      {
        popover: {
          title: 'Notas e WhatsApp',
          description:
            'Em qualquer etapa, use o ícone de nota 📝 para registrar observações internas (visível só para sua equipe) e o ícone do WhatsApp para contato direto com o candidato.',
          ...popoverBase,
        },
      },
    ],
  },
  {
    id: 'job-history',
    label: 'Histórico de Vagas',
    route: '/company/job-history',
    steps: [
      {
        popover: {
          title: 'Histórico de Vagas',
          description:
            'Lista completa de todas as vagas já publicadas pela empresa, incluindo as encerradas e arquivadas.',
          ...popoverBase,
        },
      },
      {
        element: '[data-tour="history-filters"]',
        popover: {
          title: 'Filtros',
          description:
            'Filtre por status, data de criação ou cargo para encontrar rapidamente uma vaga antiga.',
          ...popoverBase,
        },
      },
    ],
  },
  {
    id: 'talent-pool',
    label: 'Banco de Talentos',
    route: '/company/talent-pool',
    steps: [
      {
        popover: {
          title: 'Banco de Talentos',
          description:
            'Todos os candidatos que já se aplicaram às suas vagas ficam reunidos aqui — uma base própria de talentos para futuras oportunidades.',
          ...popoverBase,
        },
      },
      {
        element: '[data-tour="talent-search"]',
        popover: {
          title: 'Busca Avançada',
          description:
            'Pesquise por nome, e-mail, habilidades ou empresas onde já trabalhou.',
          ...popoverBase,
        },
      },
      {
        element: '[data-tour="talent-export"]',
        popover: {
          title: 'Exportar CSV',
          description:
            'Baixe a lista filtrada em CSV para usar em planilhas ou sistemas externos.',
          ...popoverBase,
        },
      },
    ],
  },
  {
    id: 'employees',
    label: 'Colaboradores',
    route: '/company/employees',
    steps: [
      {
        popover: {
          title: 'Gestão de Colaboradores',
          description:
            'Cadastre e acompanhe todo o seu time: dados pessoais, cargo, setor, salário, histórico, treinamentos, avaliações e ocorrências.',
          ...popoverBase,
        },
      },
      {
        element: '[data-tour="new-employee-btn"]',
        popover: {
          title: 'Novo Colaborador',
          description:
            'Cadastre um novo colaborador com dados completos: matrícula, contrato (CLT/PJ/Estágio), turno e horários.',
          ...popoverBase,
        },
      },
    ],
  },
  {
    id: 'profile',
    label: 'Perfil da Empresa',
    route: '/company/profile',
    steps: [
      {
        popover: {
          title: 'Minha Conta',
          description:
            'Configure os dados da sua empresa: nome, CNPJ, logo, endereço e dados de contato.',
          ...popoverBase,
        },
      },
    ],
  },
  {
    id: 'career-page',
    label: 'Página de Carreiras',
    route: '/company/career-page',
    steps: [
      {
        popover: {
          title: 'Sua Página de Carreiras',
          description:
            'Personalize a página pública onde candidatos enxergam todas as suas vagas. Defina cores, título, descrição e o link único da empresa.',
          ...popoverBase,
        },
      },
    ],
  },
];

export const TOURS_BY_ROUTE = COMPANY_TOURS.reduce<Record<string, TourMeta>>((acc, t) => {
  acc[t.route] = t;
  return acc;
}, {});

export function findTourForPath(pathname: string): TourMeta | null {
  if (TOURS_BY_ROUTE[pathname]) return TOURS_BY_ROUTE[pathname];
  // match prefixes for routes like /company/jobs/:id
  const match = COMPANY_TOURS.find((t) => pathname.startsWith(t.route));
  return match || null;
}
