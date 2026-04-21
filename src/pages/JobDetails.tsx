import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MapPin, DollarSign, Building2, Clock, CheckCircle2, ArrowLeft, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/hooks/use-toast';

interface ScreeningQuestion {
  id: string;
  question: string;
  question_type: string;
  required: boolean;
  order_position: number;
}

export default function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<any | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ScreeningQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const { user } = useSupabaseAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Verifica se o usuário pode se candidatar (apenas candidatos)
  const canApply = userRole === 'candidate';

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      setLoading(true);
      
      // Fetch job details
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (jobError || !jobData) {
        setLoading(false);
        return;
      }

      setJob(jobData);

      // Fetch company logo from profiles (avatar_url)
      if (jobData.company_id) {
        const { data: companyProfile } = await supabase
          .from('profiles')
          .select('avatar_url, company_name')
          .eq('id', jobData.company_id)
          .maybeSingle();
        
        if (companyProfile?.avatar_url) {
          setCompanyLogo(companyProfile.avatar_url);
        }
      }

      // Fetch screening questions
      const { data: qs } = await supabase
        .from('screening_questions')
        .select('id, question, question_type, required, order_position')
        .eq('job_id', id)
        .order('order_position');
      setQuestions((qs as ScreeningQuestion[]) || []);
      
      // Check user role and if has applied
      if (user) {
        // Buscar role do usuário
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setUserRole(roleData?.role || null);

        // Verificar se já se candidatou (apenas se for candidato)
        if (roleData?.role === 'candidate') {
          const { data: applicationData } = await supabase
            .from('applications')
            .select('id')
            .eq('job_id', id)
            .eq('candidate_id', user.id)
            .maybeSingle();
          
          setHasApplied(!!applicationData);
        }
      }
      
      setLoading(false);
    };

    loadData();
  }, [id, user]);

  const handleApply = async () => {
    if (!user) {
      toast({
        title: 'Faça login para se candidatar',
        description: 'Você precisa estar logado como candidato',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    if (!canApply) {
      toast({
        title: 'Ação não permitida',
        description: 'Apenas candidatos podem se candidatar a vagas.',
        variant: 'destructive',
      });
      return;
    }

    if (!job) return;

    setApplying(true);

    try {
      // Get candidate profile with all details
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Calculate score based on profile completeness and data
      let calculatedScore = 0;
      
      if (profile) {
        // Profile basic info (20 points max)
        let profileScore = 0;
        if (profile.name) profileScore += 5;
        if (profile.phone) profileScore += 5;
        if (profile.city && profile.state) profileScore += 5;
        if (profile.summary) profileScore += 5;
        calculatedScore += profileScore;
        
        // Experience (30 points max)
        const experiences = profile.experiences || [];
        if (Array.isArray(experiences)) {
          const expPoints = Math.min(experiences.length * 10, 30);
          calculatedScore += expPoints;
        }
        
        // Education (20 points max)
        const educations = profile.educations || [];
        if (Array.isArray(educations)) {
          const eduPoints = Math.min(educations.length * 10, 20);
          calculatedScore += eduPoints;
        }
        
        // Skills (20 points max)
        const skills = profile.skills || [];
        if (Array.isArray(skills)) {
          const skillPoints = Math.min(skills.length * 2, 20);
          calculatedScore += skillPoints;
        }
        
        // CV uploaded (10 points)
        if (profile.cv_url) {
          calculatedScore += 10;
        }
      }
      
      // Ensure score is between 0 and 100
      const finalScore = Math.min(Math.max(calculatedScore, 0), 100);

      const { error } = await supabase
        .from('applications')
        .insert({
          job_id: job.id,
          candidate_id: user.id,
          candidate_name: profile?.name || user.email || 'Candidato',
          candidate_email: user.email || '',
          status: 'pending',
          current_stage: 'triagem',
          score: finalScore,
        });

      if (error) throw error;

      setHasApplied(true);

      toast({
        title: 'Candidatura enviada!',
        description: 'Acompanhe o status no seu painel',
      });
    } catch (error) {
      console.error('Error applying:', error);
      toast({
        title: 'Erro ao se candidatar',
        description: 'Ocorreu um erro ao enviar sua candidatura. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-soft">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Vaga não encontrada</p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/">Voltar</Link>
          </Button>
        </div>
      </div>
    );
  }

  const getJobTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'full-time': 'Tempo Integral',
      'part-time': 'Meio Período',
      'contract': 'Contrato',
      'freelance': 'Freelance',
      'internship': 'Estágio',
    };
    return labels[type] || type;
  };

  const getLocationLabel = (location: string) => {
    const labels: Record<string, string> = {
      'remote': 'Remoto',
      'onsite': 'Presencial',
      'hybrid': 'Híbrido',
    };
    return labels[location] || location;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>

        <div className="max-w-4xl mx-auto grid gap-6">
          {/* Company Logo Header */}
          {companyLogo && (
            <div className="flex justify-center py-6">
              <div className="bg-card rounded-2xl p-6 shadow-sm border">
                <img 
                  src={companyLogo} 
                  alt={`Logo ${job.company_name}`}
                  className="h-20 w-auto object-contain max-w-[200px]"
                />
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-3xl mb-2">{job.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4" />
                    {job.company_name}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {getJobTypeLabel(job.job_type)}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-4">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {getLocationLabel(job.location)}
                  {job.city && `, ${job.city}`}{job.state && ` - ${job.state}`}
                </div>
                {job.salary_min && job.salary_max && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {formatCurrency(job.salary_min)} - {formatCurrency(job.salary_max)}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Publicada há {Math.floor((Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24))} dias
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                {canApply ? (
                  <>
                    <Button
                      onClick={handleApply}
                      disabled={hasApplied || applying || job.is_archived}
                      size="lg"
                      className="w-full sm:w-auto"
                    >
                      {hasApplied ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Já Candidatado
                        </>
                      ) : job.is_archived ? (
                        'Vaga Arquivada'
                      ) : applying ? (
                        'Enviando...'
                      ) : (
                        'Candidatar-se'
                      )}
                    </Button>
                    {job.is_archived && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Esta vaga não está mais aceitando candidaturas
                      </p>
                    )}
                  </>
                ) : user ? (
                  <p className="text-sm text-muted-foreground">
                    Apenas candidatos podem se candidatar a vagas.
                  </p>
                ) : (
                  <>
                    <Button
                      onClick={() => navigate('/login')}
                      size="lg"
                      className="w-full sm:w-auto"
                    >
                      Candidatar-se
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      Faça login como candidato para se candidatar
                    </p>
                  </>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold text-lg mb-3">Descrição da Vaga</h3>
                <p className="text-muted-foreground whitespace-pre-line">{job.description}</p>
              </div>

              <Separator />

              {job.responsibilities && job.responsibilities.length > 0 && (
                <>
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Responsabilidades</h3>
                    <ul className="space-y-2">
                      {job.responsibilities.map((resp: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-muted-foreground">
                          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                </>
              )}

              {job.requirements && job.requirements.length > 0 && (
                <>
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Requisitos</h3>
                    <ul className="space-y-2">
                      {job.requirements.map((req: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-muted-foreground">
                          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                </>
              )}

              {job.benefits && job.benefits.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Benefícios</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.benefits.map((benefit: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {benefit}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
