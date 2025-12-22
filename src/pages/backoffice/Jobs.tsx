import { useState, useEffect } from 'react';
import { BackofficeLayout } from '@/components/backoffice/BackofficeLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Job {
  id: string;
  title: string;
  company_name: string;
  job_type: string;
  location: string;
  city: string | null;
  state: string | null;
  is_active: boolean;
  created_at: string;
}

export default function BackofficeJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, company_name, job_type, location, city, state, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast({
        title: 'Erro ao carregar vagas',
        description: 'Não foi possível carregar a lista de vagas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleJobStatus = async (job: Job) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ is_active: !job.is_active })
        .eq('id', job.id);

      if (error) throw error;

      toast({
        title: job.is_active ? 'Vaga desativada' : 'Vaga ativada',
        description: `A vaga "${job.title}" foi ${job.is_active ? 'desativada' : 'ativada'} com sucesso.`,
      });

      loadJobs();
    } catch (error) {
      console.error('Error toggling job status:', error);
      toast({
        title: 'Erro ao atualizar vaga',
        description: 'Não foi possível atualizar o status da vaga.',
        variant: 'destructive',
      });
    }
  };

  const deleteJob = async (job: Job) => {
    if (!confirm(`Tem certeza que deseja excluir a vaga "${job.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', job.id);

      if (error) throw error;

      toast({
        title: 'Vaga excluída',
        description: `A vaga "${job.title}" foi excluída com sucesso.`,
      });

      loadJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      toast({
        title: 'Erro ao excluir vaga',
        description: 'Não foi possível excluir a vaga.',
        variant: 'destructive',
      });
    }
  };

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(search.toLowerCase()) ||
    job.company_name.toLowerCase().includes(search.toLowerCase())
  );

  const getJobTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'full-time': 'Tempo Integral',
      'part-time': 'Meio Período',
      'contract': 'Contrato',
      'freelance': 'Freelance',
      'internship': 'Estágio',
    };
    return types[type] || type;
  };

  const getLocationLabel = (location: string) => {
    const locations: Record<string, string> = {
      'remote': 'Remoto',
      'onsite': 'Presencial',
      'hybrid': 'Híbrido',
    };
    return locations[location] || location;
  };

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Vagas</h1>
            <p className="text-muted-foreground">
              Gerencie todas as vagas publicadas na plataforma
            </p>
          </div>
          <Button onClick={() => navigate('/backoffice/jobs/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Vaga
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Todas as Vagas</CardTitle>
            <CardDescription>
              {filteredJobs.length} vaga(s) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título ou empresa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma vaga encontrada.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>{job.company_name}</TableCell>
                      <TableCell>{getJobTypeLabel(job.job_type)}</TableCell>
                      <TableCell>{getLocationLabel(job.location)}</TableCell>
                      <TableCell>
                        {job.city && job.state ? `${job.city}/${job.state}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={job.is_active ? 'default' : 'secondary'}>
                          {job.is_active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(job.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/backoffice/jobs/${job.id}/edit`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleJobStatus(job)}>
                              {job.is_active ? (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  Desativar
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ativar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteJob(job)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </BackofficeLayout>
  );
}
