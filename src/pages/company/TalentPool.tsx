import { useState, useMemo } from 'react';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Award,
  FileText,
  Search,
  TrendingUp,
  Loader2,
  Download,
} from 'lucide-react';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CandidateProfileView } from '@/components/CandidateProfileView';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

type Experience = { id?: string; company: string; position: string; [k: string]: any };
type Education = { id?: string; institution: string; degree: string; field: string; [k: string]: any };

type TalentRow = {
  profile: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    skills: string[];
    experiences: Experience[];
    educations: Education[];
  };
  applications: Array<{ id: string; score: number | null; job_id: string }>;
};

export default function TalentPool() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const handleExportCSV = async () => {
    if (!filteredCandidates || filteredCandidates.length === 0) {
      toast({ title: 'Nenhum candidato para exportar' });
      return;
    }

    // Buscar títulos das vagas para a "última vaga aplicada"
    const allJobIds = Array.from(
      new Set(filteredCandidates.flatMap((c) => c.applications.map((a) => a.job_id)))
    );
    const { data: jobsData } = await supabase
      .from('jobs')
      .select('id, title')
      .in('id', allJobIds);
    const jobTitleMap = new Map((jobsData || []).map((j) => [j.id, j.title]));

    const rows = filteredCandidates.map(({ profile, applications }) => {
      const lastJobId = applications[applications.length - 1]?.job_id;
      return {
        Nome: profile.name,
        'E-mail': profile.email,
        Telefone: profile.phone || '',
        Habilidades: (profile.skills || []).join(', '),
        'Última vaga aplicada': lastJobId ? jobTitleMap.get(lastJobId) || '' : '',
        Candidaturas: applications.length,
      };
    });

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `banco-de-talentos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };


  const { data: candidates = [], isLoading } = useQuery<TalentRow[]>({
    queryKey: ['talent-pool', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // 1. vagas da empresa
      const { data: jobs, error: jobsErr } = await supabase
        .from('jobs')
        .select('id')
        .eq('company_id', user!.id);

      if (jobsErr) throw jobsErr;
      const jobIds = (jobs || []).map((j) => j.id);
      if (jobIds.length === 0) return [];

      // 2. candidaturas dessas vagas
      const { data: apps, error: appsErr } = await supabase
        .from('applications')
        .select('id, score, job_id, candidate_id, candidate_email')
        .in('job_id', jobIds);

      if (appsErr) throw appsErr;
      if (!apps || apps.length === 0) return [];

      // 3. perfis únicos
      const candidateIds = Array.from(new Set(apps.map((a) => a.candidate_id)));
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, name, phone, skills, experiences, educations')
        .in('id', candidateIds);

      if (profErr) throw profErr;

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      // 4. agrupar por candidato
      const map = new Map<string, TalentRow>();
      apps.forEach((a) => {
        const p = profileMap.get(a.candidate_id);
        if (!p) return;
        const existing = map.get(a.candidate_id);
        const appEntry = { id: a.id, score: a.score, job_id: a.job_id };
        if (existing) {
          existing.applications.push(appEntry);
        } else {
          map.set(a.candidate_id, {
            profile: {
              id: p.id,
              name: p.name,
              email: a.candidate_email,
              phone: p.phone,
              skills: p.skills || [],
              experiences: (p.experiences as any) || [],
              educations: (p.educations as any) || [],
            },
            applications: [appEntry],
          });
        }
      });

      return Array.from(map.values());
    },
  });

  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter(({ profile }) => {
      return (
        profile.name?.toLowerCase().includes(q) ||
        profile.email?.toLowerCase().includes(q) ||
        profile.skills.some((s) => s.toLowerCase().includes(q)) ||
        profile.experiences.some(
          (e) =>
            e.company?.toLowerCase().includes(q) ||
            e.position?.toLowerCase().includes(q)
        )
      );
    });
  }, [searchQuery, candidates]);

  const getAverageScore = (apps: TalentRow['applications']) => {
    if (apps.length === 0) return 0;
    const sum = apps.reduce((acc, a) => acc + (a.score || 0), 0);
    return Math.round(sum / apps.length);
  };

  const ProfileDialog = ({
    candidateId,
    candidateEmail,
  }: {
    candidateId: string;
    candidateEmail: string;
  }) => {
    const { data: profile, isLoading: pl } = useQuery({
      queryKey: ['candidate-profile-view', candidateId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', candidateId)
          .single();
        if (error) throw error;
        return {
          ...data,
          experiences: (data.experiences as any) || [],
          educations: (data.educations as any) || [],
          skills: data.skills || [],
        };
      },
    });

    return (
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Perfil do Candidato</DialogTitle>
        </DialogHeader>
        {pl ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : profile ? (
          <CandidateProfileView profile={profile as any} email={candidateEmail} />
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            <p>Perfil não encontrado</p>
          </div>
        )}
      </DialogContent>
    );
  };

  return (
    <TooltipProvider>
      <CompanyLayout title="Banco de Talentos">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Banco de Talentos</h1>
            <p className="text-sm text-gray-500">
              Todos os candidatos que se candidataram às suas vagas
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Buscar Candidatos</CardTitle>
              <CardDescription>
                Pesquise por nome, email, habilidades ou experiência
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar candidatos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {filteredCandidates.length} Candidato
              {filteredCandidates.length !== 1 ? 's' : ''}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredCandidates.length === 0}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Exportar CSV
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCandidates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? 'Nenhum candidato encontrado'
                    : 'Nenhum candidato no banco de talentos ainda'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredCandidates.map(({ profile, applications }) => {
                const avgScore = getAverageScore(applications);
                return (
                  <Card key={profile.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{profile.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Mail className="h-3 w-3" />
                              {profile.email}
                            </CardDescription>
                          </div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 cursor-help">
                              <TrendingUp className="h-4 w-4 text-primary" />
                              <span className="text-lg font-bold">{avgScore}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              Score médio do candidato em todas as candidaturas dele
                              nas suas vagas.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {profile.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{profile.phone}</span>
                          </div>
                        )}

                        {profile.experiences.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium mb-2">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              Experiência
                            </div>
                            <div className="space-y-2 pl-6">
                              {profile.experiences.slice(0, 2).map((exp, idx) => (
                                <div key={exp.id || idx} className="text-sm">
                                  <p className="font-medium">{exp.position}</p>
                                  <p className="text-muted-foreground">{exp.company}</p>
                                </div>
                              ))}
                              {profile.experiences.length > 2 && (
                                <p className="text-sm text-muted-foreground">
                                  +{profile.experiences.length - 2} mais...
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {profile.educations.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium mb-2">
                              <GraduationCap className="h-4 w-4 text-muted-foreground" />
                              Formação
                            </div>
                            <div className="pl-6">
                              {profile.educations.slice(0, 1).map((edu, idx) => (
                                <div key={edu.id || idx} className="text-sm">
                                  <p className="font-medium">
                                    {edu.degree} em {edu.field}
                                  </p>
                                  <p className="text-muted-foreground">
                                    {edu.institution}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {profile.skills.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium mb-2">
                              <Award className="h-4 w-4 text-muted-foreground" />
                              Habilidades
                            </div>
                            <div className="flex flex-wrap gap-2 pl-6">
                              {profile.skills.slice(0, 5).map((skill, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {profile.skills.length > 5 && (
                                <Badge variant="outline" className="text-xs">
                                  +{profile.skills.length - 5}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                              {applications.length} candidatura
                              {applications.length !== 1 ? 's' : ''}
                            </p>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <FileText className="mr-2 h-4 w-4" />
                                  Ver Perfil
                                </Button>
                              </DialogTrigger>
                              <ProfileDialog
                                candidateId={profile.id}
                                candidateEmail={profile.email}
                              />
                            </Dialog>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </CompanyLayout>
    </TooltipProvider>
  );
}
