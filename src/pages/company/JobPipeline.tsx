import { useParams, useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
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
  adherence_score: number | null;
  profile_completeness: number | null;
  score_breakdown: any;
  applied_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  skills: 'Habilidades',
  experience: 'Experiência',
  education: 'Formação',
  location: 'Localização',
};

const getScoreClassification = (score: number) => {
  if (score >= 80) return { label: 'Alto', color: 'text-success', bg: 'bg-success', badge: 'bg-success/10 text-success border-success/20' };
  if (score >= 50) return { label: 'Médio', color: 'text-warning', bg: 'bg-warning', badge: 'bg-warning/10 text-warning border-warning/20' };
  return { label: 'Baixo', color: 'text-destructive', bg: 'bg-destructive', badge: 'bg-destructive/10 text-destructive border-destructive/20' };
};

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
          .select('id, candidate_id, candidate_name, candidate_email, status, score, adherence_score, profile_completeness, score_breakdown, applied_at')
          .eq('job_id', id)
          .order('adherence_score', { ascending: false })
          .order('applied_at', { ascending: false }),
      ]);
      if (jobRes.data) setJobTitle(jobRes.data.title);
      setApplications((appsRes.data ?? []) as Application[]);
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
              const score = app.adherence_score ?? app.score ?? 0;
              const completeness = app.profile_completeness ?? 0;
              const classification = getScoreClassification(score);
              const breakdown = app.score_breakdown || {};

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
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Perfil {completeness}% completo</span>
                        <div className="flex-1 max-w-[120px]">
                          <Progress value={completeness} className="h-1" />
                        </div>
                      </div>
                    </div>

                    {/* Score de Aderência destacado */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="flex flex-col items-end gap-1 min-w-[140px] cursor-help"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`text-lg font-bold tabular-nums ${classification.color}`}>
                              {score}
                            </span>
                            <span className="text-xs text-muted-foreground">/100</span>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <div className="w-full">
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full ${classification.bg} transition-all`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${classification.badge}`}>
                            {classification.label}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left" align="start" className="max-w-xs p-3">
                        <p className="font-semibold text-xs mb-2">Detalhamento do score</p>
                        {Object.keys(breakdown).length > 0 ? (
                          <>
                            <ul className="space-y-1.5 text-xs">
                              {(['skills', 'experience', 'education', 'location'] as const).map((key) => {
                                const item = breakdown[key];
                                if (!item) return null;
                                const earned = item.earned ?? 0;
                                const max = item.max ?? 0;
                                const extra =
                                  key === 'skills' && item.matched != null && item.required != null
                                    ? ` (${item.matched}/${item.required} skills)`
                                    : key === 'experience' && item.years != null
                                      ? ` (${item.years} anos)`
                                      : '';
                                return (
                                  <li key={key} className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">
                                      {CATEGORY_LABELS[key]}
                                      <span className="text-[10px]">{extra}</span>
                                    </span>
                                    <span className={earned > 0 ? 'font-medium' : 'text-muted-foreground'}>
                                      {earned}/{max}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                            <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs font-semibold">
                              <span>Total</span>
                              <span>{score}/100</span>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Score ainda não calculado. Configure os requisitos da vaga e o sistema recalculará automaticamente.
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>

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
