import { useParams, useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Mail, Calendar, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Application {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  status: string;
  score: number | null;
  applied_at: string;
}

export default function JobPipeline() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState('');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      const [jobRes, appsRes] = await Promise.all([
        supabase.from('jobs').select('title').eq('id', id).maybeSingle(),
        supabase
          .from('applications')
          .select('id, candidate_id, candidate_name, candidate_email, status, score, applied_at')
          .eq('job_id', id)
          .order('applied_at', { ascending: false }),
      ]);
      if (jobRes.data) setJobTitle(jobRes.data.title);
      if (appsRes.data) setApplications(appsRes.data as Application[]);
      setLoading(false);
    };

    load();
  }, [id]);

  const initials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  return (
    <CompanyLayout>
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/company/dashboard')}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">{jobTitle || 'Vaga'}</h1>
        <p className="text-muted-foreground">
          {applications.length} {applications.length === 1 ? 'candidato' : 'candidatos'}
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando candidatos...</p>
      ) : applications.length === 0 ? (
        <Card className="p-12 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum candidato se aplicou a esta vaga ainda.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {applications.map((app) => (
            <Card
              key={app.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/company/candidates/${app.candidate_id}`)}
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-11 w-11">
                  <AvatarFallback>{initials(app.candidate_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{app.candidate_name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      {app.candidate_email}
                    </span>
                    <span className="flex items-center gap-1 flex-shrink-0">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(app.applied_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
                {app.score != null && app.score > 0 && (
                  <Badge variant="secondary">Score: {app.score}</Badge>
                )}
                <Badge variant="outline" className="capitalize">
                  {app.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </CompanyLayout>
  );
}
