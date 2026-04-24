import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ClipboardList, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CandidateProfileView } from '@/components/CandidateProfileView';

interface ScreeningItem {
  id: string;
  question: string;
  question_type: string;
  source_key: string | null;
  answer: string | null;
  order_position: number;
}

interface JobScreeningGroup {
  applicationId: string;
  jobTitle: string;
  items: ScreeningItem[];
  totalQuestions: number;
}

export default function CandidateView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any | null>(null);
  const [email, setEmail] = useState<string | undefined>();
  const [screeningGroups, setScreeningGroups] = useState<JobScreeningGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      // Pega TODAS as candidaturas do candidato
      const { data: apps } = await supabase
        .from('applications')
        .select('id, candidate_email, job_id, jobs(title)')
        .eq('candidate_id', id)
        .order('applied_at', { ascending: false });

      if (profileData) {
        setProfile({
          ...profileData,
          experiences: Array.isArray(profileData.experiences) ? profileData.experiences : [],
          educations: Array.isArray(profileData.educations) ? profileData.educations : [],
          skills: Array.isArray(profileData.skills) ? profileData.skills : [],
        });
      }
      if (apps && apps.length > 0 && apps[0].candidate_email) {
        setEmail(apps[0].candidate_email);
      }

      // Busca respostas e perguntas para cada candidatura
      if (apps && apps.length > 0) {
        const groups: JobScreeningGroup[] = [];
        for (const app of apps) {
          const [{ data: answersData }, { count: totalCount }] = await Promise.all([
            supabase
              .from('screening_answers')
              .select('id, answer, question_id, screening_questions(question, question_type, source_key, order_position)')
              .eq('application_id', app.id),
            supabase
              .from('screening_questions')
              .select('id', { count: 'exact', head: true })
              .eq('job_id', app.job_id),
          ]);

          const items: ScreeningItem[] = ((answersData as any[]) || [])
            .map((row) => ({
              id: row.id,
              answer: row.answer,
              question: row.screening_questions?.question ?? '',
              question_type: row.screening_questions?.question_type ?? 'text',
              source_key: row.screening_questions?.source_key ?? null,
              order_position: row.screening_questions?.order_position ?? 0,
            }))
            .sort((a, b) => a.order_position - b.order_position);

          groups.push({
            applicationId: app.id,
            jobTitle: (app as any).jobs?.title ?? 'Vaga',
            items,
            totalQuestions: totalCount ?? 0,
          });
        }
        setScreeningGroups(groups);
      }

      setLoading(false);
    };
    load();
  }, [id]);

  const renderAnswerBadge = (item: ScreeningItem) => {
    const a = (item.answer ?? '').trim();
    if (!a) {
      return <span className="text-sm text-muted-foreground italic">Sem resposta</span>;
    }
    if (item.question_type === 'yes_no') {
      const isYes = a.toLowerCase() === 'sim';
      return (
        <Badge variant={isYes ? 'default' : 'destructive'} className="gap-1">
          {isYes ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {a}
        </Badge>
      );
    }
    if (item.question_type === 'url') {
      return (
        <a
          href={a}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline break-all"
        >
          {a}
        </a>
      );
    }
    if (item.question_type === 'email') {
      return (
        <a href={`mailto:${a}`} className="text-sm text-primary underline break-all">
          {a}
        </a>
      );
    }
    if (item.question_type === 'text_long') {
      return <p className="text-sm text-foreground whitespace-pre-wrap">{a}</p>;
    }
    return <Badge variant="secondary" className="break-all">{a}</Badge>;
  };

  return (
    <CompanyLayout>
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">Perfil do candidato</h1>
        <p className="text-muted-foreground">
          Visualização das informações cadastradas pelo candidato.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando perfil...</p>
      ) : !profile ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            Perfil não encontrado ou ainda não preenchido pelo candidato.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CandidateProfileView profile={profile} email={email} />
          </div>
          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardList className="h-5 w-5" />
                  Respostas do Screening
                </CardTitle>
                {jobTitle && (
                  <p className="text-xs text-muted-foreground">Vaga: {jobTitle}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {screening.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Este candidato ainda não respondeu perguntas customizadas.
                  </p>
                ) : (
                  screening.map((item) => (
                    <div key={item.id} className="border-l-2 border-primary/40 pl-3">
                      <p className="text-sm font-medium mb-1.5 leading-snug">
                        {item.question}
                      </p>
                      <div>{renderAnswerBadge(item)}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </CompanyLayout>
  );
}
