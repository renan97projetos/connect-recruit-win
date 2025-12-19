import { useState, useEffect } from 'react';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getApplicationsByJob, getJobsByCompany, getUserById, getApplications } from '@/lib/storage';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { CandidateProfile, Application } from '@/types';
import { User, Mail, Phone, Briefcase, GraduationCap, Award, FileText, Search, TrendingUp, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CandidateProfileView } from '@/components/CandidateProfileView';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function TalentPool() {
  const { user } = useSupabaseAuth();
  const [candidates, setCandidates] = useState<Array<{ profile: CandidateProfile; applications: Application[] }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCandidates, setFilteredCandidates] = useState<Array<{ profile: CandidateProfile; applications: Application[] }>>([]);

  useEffect(() => {
    if (!user) return;

    // Get all jobs from this company
    const companyJobs = getJobsByCompany(user.id);
    
    // Get all unique candidates who applied to these jobs
    const candidateMap = new Map<string, { profile: CandidateProfile; applications: Application[] }>();
    
    companyJobs.forEach(job => {
      const jobApplications = getApplicationsByJob(job.id);
      
      jobApplications.forEach(app => {
        const candidateProfile = getUserById(app.candidateId) as CandidateProfile | undefined;
        
        if (candidateProfile && candidateProfile.role === 'candidate') {
          if (candidateMap.has(app.candidateId)) {
            candidateMap.get(app.candidateId)!.applications.push(app);
          } else {
            candidateMap.set(app.candidateId, {
              profile: candidateProfile,
              applications: [app]
            });
          }
        }
      });
    });

    const candidateList = Array.from(candidateMap.values());
    setCandidates(candidateList);
    setFilteredCandidates(candidateList);
  }, [user]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCandidates(candidates);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = candidates.filter(({ profile }) => {
      return (
        profile.name.toLowerCase().includes(query) ||
        profile.email.toLowerCase().includes(query) ||
        (profile.skills || []).some(skill => skill.toLowerCase().includes(query)) ||
        (profile.experiences || []).some(exp => 
          exp.company.toLowerCase().includes(query) ||
          exp.position.toLowerCase().includes(query)
        )
      );
    });

    setFilteredCandidates(filtered);
  }, [searchQuery, candidates]);

  const getAverageScore = (applications: Application[]) => {
    if (applications.length === 0) return 0;
    const sum = applications.reduce((acc, app) => acc + app.score, 0);
    return Math.round(sum / applications.length);
  };

  const CandidateCard = ({ candidateData }: { candidateData: { profile: CandidateProfile; applications: Application[] } }) => {
    const { profile, applications } = candidateData;
    const avgScore = getAverageScore(applications);

    return (
      <Card>
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
                  Score médio deste candidato em todas as suas candidaturas. 
                  Calculado automaticamente baseado no match com os requisitos das vagas.
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

            {profile.experiences && profile.experiences.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  Experiência Profissional
                </div>
                <div className="space-y-2 pl-6">
                  {profile.experiences.slice(0, 2).map(exp => (
                    <div key={exp.id} className="text-sm">
                      <p className="font-medium">{exp.position}</p>
                      <p className="text-muted-foreground">{exp.company}</p>
                    </div>
                  ))}
                  {profile.experiences.length > 2 && (
                    <p className="text-sm text-muted-foreground">+{profile.experiences.length - 2} mais...</p>
                  )}
                </div>
              </div>
            )}

            {profile.educations && profile.educations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  Formação
                </div>
                <div className="pl-6">
                  {profile.educations.slice(0, 1).map(edu => (
                    <div key={edu.id} className="text-sm">
                      <p className="font-medium">{edu.degree} em {edu.field}</p>
                      <p className="text-muted-foreground">{edu.institution}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.skills && profile.skills.length > 0 && (
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
                  {applications.length} candidatura{applications.length !== 1 ? 's' : ''}
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <FileText className="mr-2 h-4 w-4" />
                      Ver Perfil Completo
                    </Button>
                  </DialogTrigger>
                  <ProfileDialog candidateId={profile.id} candidateEmail={profile.email} />
                </Dialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ProfileDialog = ({ candidateId, candidateEmail }: { candidateId: string; candidateEmail: string }) => {
    const { data: profile, isLoading } = useQuery({
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
        {isLoading ? (
          <div className="flex justify-center p-8">
            <p>Carregando perfil...</p>
          </div>
        ) : profile ? (
          <CandidateProfileView profile={profile} email={candidateEmail} />
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
      <CompanyLayout
        title="Banco de Talentos"
        description="Todos os candidatos que se candidataram às suas vagas"
      >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Buscar Candidatos</CardTitle>
            <CardDescription>Pesquise por nome, email, habilidades ou experiência</CardDescription>
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
          <h2 className="text-2xl font-bold">
            {filteredCandidates.length} Candidato{filteredCandidates.length !== 1 ? 's' : ''}
          </h2>
        </div>

        {filteredCandidates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'Nenhum candidato encontrado' : 'Nenhum candidato no banco de talentos ainda'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredCandidates.map(candidateData => (
              <CandidateCard key={candidateData.profile.id} candidateData={candidateData} />
            ))}
          </div>
        )}
      </div>
      </CompanyLayout>
    </TooltipProvider>
  );
}
