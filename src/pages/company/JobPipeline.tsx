import { useParams, useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Mail, Calendar, User, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Application {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  status: string;
  score: number | null;
  applied_at: string;
}

interface ScoreBreakdown {
  label: string;
  earned: number;
  max: number;
}

const calculateScoreBreakdown = (profile: any): ScoreBreakdown[] => {
  const breakdown: ScoreBreakdown[] = [];

  // Informações básicas (20 pts)
  let basic = 0;
  if (profile?.name) basic += 5;
  if (profile?.phone) basic += 5;
  if (profile?.city && profile?.state) basic += 5;
  if (profile?.summary) basic += 5;
  breakdown.push({ label: 'Informações básicas', earned: basic, max: 20 });

  // Experiências (30 pts)
  const experiences = Array.isArray(profile?.experiences) ? profile.experiences : [];
  breakdown.push({
    label: `Experiências (${experiences.length})`,
    earned: Math.min(experiences.length * 10, 30),
    max: 30,
  });

  // Formação (20 pts)
  const educations = Array.isArray(profile?.educations) ? profile.educations : [];
  breakdown.push({
    label: `Formação (${educations.length})`,
    earned: Math.min(educations.length * 10, 20),
    max: 20,
  });

  // Habilidades (20 pts)
  const skills = Array.isArray(profile?.skills) ? profile.skills : [];
  breakdown.push({
    label: `Habilidades (${skills.length})`,
    earned: Math.min(skills.length * 2, 20),
    max: 20,
  });

  // Currículo anexado (10 pts)
  breakdown.push({
    label: 'Currículo anexado',
    earned: profile?.cv_url ? 10 : 0,
    max: 10,
  });

  return breakdown;
};

export default function JobPipeline() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState('');
  const [applications, setApplications] = useState<Application[]>([]);
  const [breakdowns, setBreakdowns] = useState<Record<string, ScoreBreakdown[]>>({});
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
      const apps = (appsRes.data ?? []) as Application[];
      setApplications(apps);

      const candidateIds = Array.from(new Set(apps.map((a) => a.candidate_id)));
      if (candidateIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, phone, city, state, summary, experiences, educations, skills, cv_url')
          .in('id', candidateIds);
        const map: Record<string, ScoreBreakdown[]> = {};
        (profiles ?? []).forEach((p: any) => {
          map[p.id] = calculateScoreBreakdown(p);
        });
        setBreakdowns(map);
      }

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
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Triagem
          </span>
        </div>
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
        <TooltipProvider delayDuration={150}>
          <div className="grid gap-3">
            {applications.map((app) => {
              const breakdown = breakdowns[app.candidate_id];
              const total = breakdown?.reduce((acc, b) => acc + b.earned, 0) ?? app.score ?? 0;
              return (
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className="gap-1 cursor-help"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Score: {app.score}
                            <Info className="h-3 w-3" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="end" className="max-w-xs p-3">
                          <p className="font-semibold text-xs mb-2">
                            Como o score foi calculado
                          </p>
                          {breakdown ? (
                            <>
                              <ul className="space-y-1 text-xs">
                                {breakdown.map((b) => (
                                  <li
                                    key={b.label}
                                    className="flex items-center justify-between gap-3"
                                  >
                                    <span className="text-muted-foreground">{b.label}</span>
                                    <span
                                      className={
                                        b.earned > 0 ? 'font-medium' : 'text-muted-foreground'
                                      }
                                    >
                                      {b.earned}/{b.max}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs font-semibold">
                                <span>Total</span>
                                <span>{total}/100</span>
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Detalhes do perfil indisponíveis.
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Badge variant="outline" className="capitalize">
                      {app.status === 'pending' ? 'pendente' : app.status}
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </TooltipProvider>
      )}
    </CompanyLayout>
  );
}
