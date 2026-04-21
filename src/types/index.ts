export type UserRole = 'candidate' | 'company' | 'admin';

export type JobType = 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';
export type JobLocation = 'remote' | 'onsite' | 'hybrid';

export type WorkflowStage = 'inscription' | 'screening' | 'interview' | 'evaluation' | 'candidate-management' | 'decision';
export type ApplicationStatus = 'pending' | 'in-review' | 'interview' | 'approved' | 'rejected';

export type PlanType = 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface CandidateProfile extends User {
  role: 'candidate';
  phone: string;
  birthDate: string;
  cpf: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  cvUrl?: string;
  experiences: Experience[];
  educations: Education[];
  skills: string[];
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  current: boolean;
}

export interface CompanyProfile extends User {
  role: 'company';
  cnpj: string;
  phone: string;
  description: string;
  website?: string;
  planType: PlanType;
  planStartDate: string;
  planEndDate?: string;
  isTrialing: boolean;
}

export interface AdminProfile extends User {
  role: 'admin';
}

export interface Job {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  type: JobType;
  location: JobLocation;
  city?: string;
  state?: string;
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  benefits: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  workflow: WorkflowConfig;
}

export interface WorkflowConfig {
  stages: WorkflowStageConfig[];
}

export interface WorkflowStageConfig {
  id: string;
  name: string;
  order: number;
  actions: WorkflowAction[];
}

export interface WorkflowAction {
  id: string;
  name: string;
  description: string;
  type: 'review' | 'score' | 'feedback' | 'schedule' | 'document' | 'test' | 'communication' | 'proposal';
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  status: ApplicationStatus;
  currentStage: string;
  score: number;
  appliedAt: string;
  updatedAt: string;
  stageHistory: StageHistory[];
  notes: ApplicationNote[];
}

export interface StageHistory {
  stageId: string;
  stageName: string;
  enteredAt: string;
  completedAt?: string;
  actions: ActionHistory[];
}

export interface ActionHistory {
  actionId: string;
  actionName: string;
  performedBy: string;
  performedAt: string;
  data: any;
}

export interface ApplicationNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  cnpj?: string;
  vacancyCount?: number;
  message: string;
  source: 'form' | 'chat';
  status: 'new' | 'contacted' | 'converted' | 'lost';
  createdAt: string;
  notes: LeadNote[];
}

export interface LeadNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface Plan {
  type: PlanType;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  limits: {
    activeJobs: number;
    applications: number;
    users: number;
  };
}

// Workflow Database Types (novo sistema de workflow configurável)
export type WorkflowStageType = 
  | 'screening' 
  | 'hr_interview' 
  | 'technical_interview' 
  | 'practical_test' 
  | 'automated_test' 
  | 'cultural_fit' 
  | 'manager_validation' 
  | 'documentation' 
  | 'final_approval';

export type CandidateStageStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'skipped';

export interface WorkflowData {
  id: string;
  job_id: string;
  company_id: string;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface WorkflowStageData {
  id: string;
  workflow_id: string;
  name: string;
  stage_type: WorkflowStageType;
  order_position: number;
  responsible_id?: string;
  description?: string;
  is_required: boolean;
  automation_config: {
    auto_move?: boolean;
    auto_reject?: {
      enabled: boolean;
      criteria?: string;
      days?: number;
    };
    email_notifications?: {
      on_enter?: boolean;
      on_approve?: boolean;
      on_reject?: boolean;
    };
    whatsapp_enabled?: boolean;
    whatsapp_message?: string;
  };
  stage_config: {
    meeting_link?: string;
    test_url?: string;
    documents_required?: string[];
    evaluation_criteria?: string[];
    min_score?: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CandidateStageData {
  id: string;
  candidate_id: string;
  job_id: string;
  workflow_id: string;
  stage_id: string;
  status: CandidateStageStatus;
  score?: number;
  entered_at: string;
  exited_at?: string;
  evaluator_id?: string;
  evaluation_data: any;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplateData {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  template_data: {
    stages: Omit<WorkflowStageData, 'id' | 'workflow_id' | 'created_at' | 'updated_at'>[];
  };
  created_at: string;
  updated_at: string;
}
