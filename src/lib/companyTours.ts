import type { DriveStep } from 'driver.js';

export type TourId =
  | 'dashboard'
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
          title: '👋 Bem-vindo!',
          description:
            'Este é o seu painel de empresa. Por aqui você gerencia recrutamento e gestão de pessoas em um só lugar.',
          ...popoverBase,
        },
      },
      {
        element: '[data-tour="nav-main"]',
        popover: {
          title: 'Menu de Recrutamento',
          description:
            '<b>Dashboard</b>, <b>Requisições</b>, <b>Histórico</b> e <b>Banco de Talentos</b>: tudo o que você precisa para conduzir processos seletivos.',
          ...popoverBase,
        },
      },
      {
        element: '[data-tour="pipeline-stages"]',
        popover: {
          title: 'Pipeline de Vagas',
          description:
            'Cada card mostra quantas vagas estão em cada etapa: <b>Aberta</b>, <b>Triagem</b>, <b>Entrevista</b>, <b>Avaliação</b>, <b>Proposta</b>, <b>Admissão</b>, <b>Contratado</b> ou <b>Reprovado</b>. Clique para filtrar.',
          ...popoverBase,
        },
      },
      {
        element: '[data-tour="new-job-btn"]',
        popover: {
          title: 'Criar Nova Vaga',
          description:
            'Clique aqui para abrir o formulário de criação de vaga. Você pode usar IA para gerar descrição automaticamente.',
          ...popoverBase,
        },
      },
      {
        element: '[data-tour="metrics-btn"]',
        popover: {
          title: 'Métricas',
          description:
            'Veja gráficos de candidaturas dos últimos 30 dias, top vagas e funil de conversão. Pode exportar como PDF.',
          ...popoverBase,
        },
      },
      {
        element: '[data-tour="nav-help"]',
        popover: {
          title: 'Precisa de ajuda?',
          description:
            'A qualquer momento, clique neste botão <b>?</b> para refazer o tour da tela atual ou ver todos os tutoriais disponíveis.',
          ...popoverBase,
        },
      },
    ],
  },
  {
    id: 'job-requests',
    label: 'Requisições de Vaga',
    route: '/company/job-requests',
    steps: [
      {
        popover: {
          title: 'Requisições de Vaga',
          description:
            'Aqui colaboradores e gestores criam <b>solicitações de abertura de vaga</b>. Elas passam por um fluxo de aprovação antes de serem publicadas.',
          ...popoverBase,
        },
      },
      {
        element: '[data-tour="new-request-btn"]',
        popover: {
          title: 'Nova Requisição',
          description:
            'Crie uma nova requisição informando: motivo da abertura, perfil desejado, faixa salarial, requisitos e responsabilidades.',
          ...popoverBase,
        },
      },
      {
        element: '[data-tour="requests-list"]',
        popover: {
          title: 'Lista de Requisições',
          description:
            'Acompanhe o status de cada requisição: <b>Rascunho</b>, <b>Aguardando aprovação</b>, <b>Aprovada</b>, <b>Em criação</b>, <b>Em revisão</b> ou <b>Publicada</b>.',
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
