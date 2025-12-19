import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Search, Eye, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

export default function JobHistory() {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['archived-jobs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, applications(count)')
        .eq('company_id', user?.id)
        .eq('is_archived', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filteredJobs = jobs?.filter((job: any) => {
    const search = searchTerm.toLowerCase();
    return (
      job.title.toLowerCase().includes(search) ||
      job.location.toLowerCase().includes(search) ||
      job.job_type.toLowerCase().includes(search)
    );
  });

  const jobTypeLabels: { [key: string]: string } = {
    'full-time': 'Tempo Integral',
    'part-time': 'Meio Período',
    'contract': 'Contrato',
    'internship': 'Estágio',
  };

  return (
    <CompanyLayout
      title="Histórico de Processos"
      description="Vagas arquivadas e processos seletivos encerrados"
    >
      <div className="space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar vagas arquivadas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredJobs && filteredJobs.length > 0 ? (
          <div className="grid gap-4">
            {filteredJobs.map((job: any) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Archive className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                      </div>
                      <CardDescription>{job.location}</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-muted">
                      Arquivada
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">
                        <span className="font-medium">Tipo:</span>{' '}
                        {jobTypeLabels[job.job_type] || job.job_type}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">Candidatos:</span>{' '}
                        {job.applications?.[0]?.count || 0}
                      </p>
                      <p className="text-muted-foreground">
                        <span className="font-medium">Arquivada em:</span>{' '}
                        {format(new Date(job.updated_at), "dd 'de' MMMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/company/selection-process/${job.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm
                  ? 'Nenhuma vaga arquivada encontrada com esses critérios'
                  : 'Nenhuma vaga arquivada ainda'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </CompanyLayout>
  );
}
