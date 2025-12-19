import { User, Job, Application, Lead, Notification, CandidateProfile, CompanyProfile, AdminProfile } from '@/types';

const STORAGE_KEYS = {
  USERS: 'talenthub_users',
  JOBS: 'talenthub_jobs',
  APPLICATIONS: 'talenthub_applications',
  LEADS: 'talenthub_leads',
  NOTIFICATIONS: 'talenthub_notifications',
  CURRENT_USER: 'talenthub_current_user',
} as const;

// Generic storage functions
function getFromStorage<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Users
export function getUsers(): User[] {
  return getFromStorage<User>(STORAGE_KEYS.USERS);
}

export function saveUser(user: User): void {
  const users = getUsers();
  const index = users.findIndex(u => u.id === user.id);
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  saveToStorage(STORAGE_KEYS.USERS, users);
}

export function getUserById(id: string): User | undefined {
  return getUsers().find(u => u.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  return getUsers().find(u => u.email === email);
}

// Current User
export function getCurrentUser(): User | null {
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

// Jobs
export function getJobs(): Job[] {
  return getFromStorage<Job>(STORAGE_KEYS.JOBS);
}

export function getActiveJobs(): Job[] {
  return getJobs().filter(job => job.isActive);
}

export function getJobById(id: string): Job | undefined {
  return getJobs().find(j => j.id === id);
}

export function getJobsByCompany(companyId: string): Job[] {
  return getJobs().filter(j => j.companyId === companyId);
}

export function saveJob(job: Job): void {
  const jobs = getJobs();
  const index = jobs.findIndex(j => j.id === job.id);
  if (index >= 0) {
    jobs[index] = job;
  } else {
    jobs.push(job);
  }
  saveToStorage(STORAGE_KEYS.JOBS, jobs);
}

export function deleteJob(id: string): void {
  const jobs = getJobs().filter(j => j.id !== id);
  saveToStorage(STORAGE_KEYS.JOBS, jobs);
}

// Applications
export function getApplications(): Application[] {
  return getFromStorage<Application>(STORAGE_KEYS.APPLICATIONS);
}

export function getApplicationById(id: string): Application | undefined {
  return getApplications().find(a => a.id === id);
}

export function getApplicationsByJob(jobId: string): Application[] {
  return getApplications().filter(a => a.jobId === jobId);
}

export function getApplicationsByCandidate(candidateId: string): Application[] {
  return getApplications().filter(a => a.candidateId === candidateId);
}

export function saveApplication(application: Application): void {
  const applications = getApplications();
  const index = applications.findIndex(a => a.id === application.id);
  if (index >= 0) {
    applications[index] = application;
  } else {
    applications.push(application);
  }
  saveToStorage(STORAGE_KEYS.APPLICATIONS, applications);
}

export function deleteApplication(id: string): void {
  const applications = getApplications();
  const filtered = applications.filter(a => a.id !== id);
  saveToStorage(STORAGE_KEYS.APPLICATIONS, filtered);
}

// Leads
export function getLeads(): Lead[] {
  return getFromStorage<Lead>(STORAGE_KEYS.LEADS);
}

export function saveLead(lead: Lead): void {
  const leads = getLeads();
  const index = leads.findIndex(l => l.id === lead.id);
  if (index >= 0) {
    leads[index] = lead;
  } else {
    leads.push(lead);
  }
  saveToStorage(STORAGE_KEYS.LEADS, leads);
}

// Notifications
export function getNotifications(): Notification[] {
  return getFromStorage<Notification>(STORAGE_KEYS.NOTIFICATIONS);
}

export function getNotificationsByUser(userId: string): Notification[] {
  return getNotifications().filter(n => n.userId === userId);
}

export function saveNotification(notification: Notification): void {
  const notifications = getNotifications();
  notifications.push(notification);
  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
}

export function markNotificationAsRead(id: string): void {
  const notifications = getNotifications();
  const notification = notifications.find(n => n.id === id);
  if (notification) {
    notification.read = true;
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
  }
}

// Initialize with demo data
export function initializeDemoData(): void {
  if (getUsers().length > 0) return;

  // Demo admin
  const admin: AdminProfile = {
    id: 'admin-1',
    email: 'admin@talenthub.com',
    name: 'Admin User',
    role: 'admin',
    createdAt: new Date().toISOString(),
  };
  saveUser(admin);

  // Demo company
  const company: CompanyProfile = {
    id: 'company-1',
    email: 'empresa@exemplo.com',
    name: 'Tech Solutions Ltda',
    role: 'company',
    cnpj: '12.345.678/0001-90',
    phone: '(11) 98765-4321',
    description: 'Empresa líder em soluções tecnológicas',
    planType: 'professional',
    planStartDate: new Date().toISOString(),
    isTrialing: false,
    createdAt: new Date().toISOString(),
  };
  saveUser(company);

  // Demo candidate
  const candidate: CandidateProfile = {
    id: 'candidate-1',
    email: 'candidato@exemplo.com',
    name: 'João Silva',
    role: 'candidate',
    phone: '(11) 91234-5678',
    birthDate: '1995-05-15',
    cpf: '123.456.789-00',
    address: {
      street: 'Rua Exemplo, 123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
    },
    experiences: [
      {
        id: 'exp-1',
        company: 'Empresa Anterior',
        position: 'Desenvolvedor Full Stack',
        startDate: '2020-01-01',
        endDate: '2024-12-31',
        current: false,
        description: 'Desenvolvimento de aplicações web com React e Node.js',
      },
    ],
    educations: [
      {
        id: 'edu-1',
        institution: 'Universidade de São Paulo',
        degree: 'Bacharelado',
        field: 'Ciência da Computação',
        startDate: '2014-01-01',
        endDate: '2018-12-31',
        current: false,
      },
    ],
    skills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'SQL'],
    createdAt: new Date().toISOString(),
  };
  saveUser(candidate);

  // Demo jobs
  const demoJob: Job = {
    id: 'job-1',
    companyId: company.id,
    companyName: company.name,
    title: 'Desenvolvedor Full Stack Sênior',
    description: 'Buscamos desenvolvedor experiente para liderar projetos desafiadores.',
    requirements: [
      '5+ anos de experiência com JavaScript',
      'Experiência com React e Node.js',
      'Conhecimento em bancos de dados SQL e NoSQL',
      'Inglês avançado',
    ],
    responsibilities: [
      'Desenvolver e manter aplicações web',
      'Liderar equipe de desenvolvimento',
      'Participar de decisões arquiteturais',
    ],
    type: 'full-time',
    location: 'hybrid',
    city: 'São Paulo',
    state: 'SP',
    salary: {
      min: 12000,
      max: 18000,
      currency: 'BRL',
    },
    benefits: ['Vale refeição', 'Plano de saúde', 'Home office', 'Auxílio educação'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    workflow: {
      stages: [
        {
          id: 'stage-1',
          name: 'Inscrição',
          order: 1,
          actions: [
            {
              id: 'action-1',
              name: 'Análise de CV',
              description: 'Revisar currículo do candidato',
              type: 'review',
            },
            {
              id: 'action-2',
              name: 'Pontuação Automática',
              description: 'Sistema calcula pontuação baseado em critérios',
              type: 'score',
            },
          ],
        },
        {
          id: 'stage-2',
          name: 'Triagem',
          order: 2,
          actions: [
            {
              id: 'action-3',
              name: 'Teste Técnico',
              description: 'Enviar teste técnico para candidato',
              type: 'document',
            },
            {
              id: 'action-4',
              name: 'Avaliação do Teste',
              description: 'Avaliar resultado do teste técnico',
              type: 'score',
            },
          ],
        },
        {
          id: 'stage-3',
          name: 'Entrevista',
          order: 3,
          actions: [
            {
              id: 'action-5',
              name: 'Agendar Entrevista',
              description: 'Agendar entrevista com o candidato',
              type: 'schedule',
            },
            {
              id: 'action-6',
              name: 'Feedback da Entrevista',
              description: 'Registrar feedback da entrevista',
              type: 'feedback',
            },
          ],
        },
        {
          id: 'stage-4',
          name: 'Decisão Final',
          order: 4,
          actions: [
            {
              id: 'action-7',
              name: 'Decisão',
              description: 'Aprovar ou rejeitar candidato',
              type: 'review',
            },
          ],
        },
      ],
    },
  };
  saveJob(demoJob);
}
