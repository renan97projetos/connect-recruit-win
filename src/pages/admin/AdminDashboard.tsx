import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Briefcase, Plus, ExternalLink, Users, Settings, FileText } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

interface Job {
  id: string;
  title: string;
  company_name: string;
  external_company_name: string | null;
  external_job_url: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminDashboard() {
  const { userRole, loading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    if (!loading && userRole !== 'admin') {
      navigate('/');
    }
  }, [userRole, loading, navigate]);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  if (loading || userRole !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Painel Administrativo</h1>
              <p className="text-muted-foreground">Gerencie vagas e visualize estatísticas</p>
            </div>
          </div>
          
          <Button asChild>
            <Link to="/company/jobs/new">
              <Plus className="mr-2 h-4 w-4" />
              Nova Vaga
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Vagas Criadas
              </CardTitle>
              <CardDescription>
                {jobs.length} {jobs.length === 1 ? 'vaga' : 'vagas'} no total
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingJobs ? (
                <p className="text-muted-foreground">Carregando vagas...</p>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Nenhuma vaga criada ainda
                  </p>
                  <Button asChild>
                    <Link to="/company/jobs/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Criar primeira vaga
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.slice(0, 3).map((job) => (
                    <Card key={job.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{job.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {job.external_company_name || job.company_name}
                            </p>
                            {job.external_job_url && (
                              <a 
                                href={job.external_job_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                              >
                                Ver vaga original
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              job.is_active 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {job.is_active ? 'Ativa' : 'Inativa'}
                            </span>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(job.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {jobs.length > 3 && (
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/admin/jobs">Ver todas as vagas</Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestão de Colaboradores
              </CardTitle>
              <CardDescription>
                Gerencie colaboradores admitidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Acesse o módulo completo de gestão de colaboradores para:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Gerenciar dados cadastrais
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Controlar férias e licenças
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Registrar ocorrências e avaliações
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Visualizar histórico completo
                  </li>
                </ul>
                <Button className="w-full" asChild>
                  <Link to="/admin/employees">
                    <Users className="mr-2 h-4 w-4" />
                    Acessar Gestão de Colaboradores
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Conteúdo Institucional
              </CardTitle>
              <CardDescription>
                Gerencie páginas e redes sociais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configure o conteúdo do site:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Página Sobre
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Política de Privacidade
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Termos de Uso
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Links das Redes Sociais
                  </li>
                </ul>
                <Button className="w-full" asChild>
                  <Link to="/admin/content">
                    <FileText className="mr-2 h-4 w-4" />
                    Gerenciar Conteúdo
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações
              </CardTitle>
              <CardDescription>
                Configure o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Gerencie as configurações do sistema:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Email para receber contatos
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Notificações do sistema
                  </li>
                </ul>
                <Button className="w-full" asChild>
                  <Link to="/admin/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Acessar Configurações
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}