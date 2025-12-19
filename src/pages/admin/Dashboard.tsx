import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { getUsers, getJobs, getApplications, getLeads } from '@/lib/storage';
import { User, Job, Application, Lead } from '@/types';
import { Users, Briefcase, FileText, TrendingUp, Mail, Phone, Building2, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    setUsers(getUsers());
    setJobs(getJobs());
    setApplications(getApplications());
    setLeads(getLeads());
  }, []);

  const candidates = users.filter(u => u.role === 'candidate');
  const companies = users.filter(u => u.role === 'company');
  const activeJobs = jobs.filter(j => j.isActive);
  const newLeads = leads.filter(l => l.status === 'new');

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'new': 'Novo',
      'contacted': 'Contatado',
      'converted': 'Convertido',
      'lost': 'Perdido',
    };
    return labels[status] || status;
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      'new': 'default',
      'contacted': 'secondary',
      'converted': 'outline',
      'lost': 'destructive',
    };
    return variants[status] || 'default';
  };

  return (
    <TooltipProvider>
      <DashboardLayout
        title="Painel Administrativo"
        description="Visão geral da plataforma"
      >
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total de usuários cadastrados na plataforma (candidatos e empresas)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                {candidates.length} candidatos, {companies.length} empresas
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Vagas Ativas</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Vagas publicadas e abertas para receber candidaturas</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeJobs.length}</div>
              <p className="text-xs text-muted-foreground">
                de {jobs.length} total
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Candidaturas</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total de candidaturas realizadas na plataforma. Mostra quantas foram aprovadas.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
              <p className="text-xs text-muted-foreground">
                {applications.filter(a => a.status === 'approved').length} aprovadas
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Novos Leads</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Leads não contactados ainda. Empresas interessadas em anunciar vagas.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{newLeads.length}</div>
              <p className="text-xs text-muted-foreground">
                de {leads.length} total
              </p>
            </CardContent>
          </Card>
        </div>

      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
          <TabsTrigger value="companies">Empresas ({companies.length})</TabsTrigger>
          <TabsTrigger value="candidates">Candidatos ({candidates.length})</TabsTrigger>
          <TabsTrigger value="jobs">Vagas ({jobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-4">
          {leads.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhum lead registrado</p>
              </CardContent>
            </Card>
          ) : (
            leads.map(lead => (
              <Card key={lead.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle>{lead.name}</CardTitle>
                      <CardDescription>
                        {lead.source === 'form' ? 'Formulário de contato' : 'Chat AI'}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusVariant(lead.status)}>
                      {getStatusLabel(lead.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {lead.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {lead.phone}
                  </div>
                  {lead.cnpj && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      CNPJ: {lead.cnpj}
                    </div>
                  )}
                  {lead.vacancyCount && (
                    <p className="text-sm text-muted-foreground">
                      Quantidade de vagas: {lead.vacancyCount}
                    </p>
                  )}
                  <p className="text-sm pt-2">{lead.message}</p>
                  <p className="text-xs text-muted-foreground">
                    Recebido em {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="companies" className="space-y-4">
          {companies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma empresa cadastrada</p>
              </CardContent>
            </Card>
          ) : (
            companies.map(company => {
              const companyJobs = jobs.filter(j => j.companyId === company.id);
              return (
                <Card key={company.id}>
                  <CardHeader>
                    <CardTitle>{company.name}</CardTitle>
                    <CardDescription>{company.email}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {companyJobs.length} {companyJobs.length === 1 ? 'vaga' : 'vagas'} publicadas
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cadastrado em {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="candidates" className="space-y-4">
          {candidates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhum candidato cadastrado</p>
              </CardContent>
            </Card>
          ) : (
            candidates.map(candidate => {
              const candidateApps = applications.filter(a => a.candidateId === candidate.id);
              return (
                <Card key={candidate.id}>
                  <CardHeader>
                    <CardTitle>{candidate.name}</CardTitle>
                    <CardDescription>{candidate.email}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {candidateApps.length} {candidateApps.length === 1 ? 'candidatura' : 'candidaturas'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cadastrado em {new Date(candidate.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          {jobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma vaga cadastrada</p>
              </CardContent>
            </Card>
          ) : (
            jobs.map(job => {
              const jobApps = applications.filter(a => a.jobId === job.id);
              return (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle>{job.title}</CardTitle>
                        <CardDescription>{job.companyName}</CardDescription>
                      </div>
                      <Badge variant={job.isActive ? 'default' : 'secondary'}>
                        {job.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {jobApps.length} {jobApps.length === 1 ? 'candidato' : 'candidatos'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Publicada em {new Date(job.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
      </DashboardLayout>
    </TooltipProvider>
  );
}
