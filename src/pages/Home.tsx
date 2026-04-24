import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, DollarSign, Building2, ArrowRight, Search, CheckCircle2, Users, Zap, BarChart3, Brain, Clock, Quote, Sparkles, Star, Rocket, Target, Heart, MessageCircle, Briefcase, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { JobFiltersComponent, JobFilters } from '@/components/JobFilters';
import { QuickCandidateRegister } from '@/components/QuickCandidateRegister';
import { VideoPresentationModal } from '@/components/VideoPresentationModal';
export default function Home() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date');
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const {
    user
  } = useSupabaseAuth();
  const [filters, setFilters] = useState<JobFilters>({
    keyword: '',
    cities: [],
    state: '',
    jobType: 'all',
    salaryRange: [0, 50000],
    location: 'all',
    experienceLevel: 'all',
    datePosted: 'all'
  });
  useEffect(() => {
    (supabase as any)
      .rpc('get_public_settings')
      .then(({ data }: { data: any }) => {
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.whatsapp_number) setWhatsappNumber(row.whatsapp_number);
      });
  }, []);
  const handleCompanyWhatsApp = () => {
    if (!whatsappNumber) return;
    const msg = encodeURIComponent('Olá! Sou de uma empresa e gostaria de saber mais sobre o SinapseRH.');
    window.open(`https://wa.me/${whatsappNumber}?text=${msg}`, '_blank');
  };
  useEffect(() => {
    const loadJobs = async () => {
      const {
        data,
        error
      } = await supabase.from('jobs').select('*').eq('is_active', true).eq('is_archived', false).order('created_at', {
        ascending: false
      });
      if (!error && data) {
        setJobs(data);
      }
      setLoading(false);
    };
    loadJobs();
  }, []);
  const filteredJobs = useMemo(() => {
    let filtered = jobs;
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      filtered = filtered.filter(job => job.title.toLowerCase().includes(keyword) || job.description.toLowerCase().includes(keyword) || job.company_name.toLowerCase().includes(keyword));
    }
    if (filters.cities && filters.cities.length > 0) {
      const lower = filters.cities.map((c) => c.toLowerCase());
      filtered = filtered.filter((job) => job.city && lower.includes(job.city.toLowerCase()));
    }
    if (filters.state) {
      filtered = filtered.filter((job) => job.state?.toLowerCase() === filters.state.toLowerCase());
    }
    if (filters.jobType && filters.jobType !== 'all') {
      filtered = filtered.filter(job => job.job_type === filters.jobType);
    }
    if (filters.location && filters.location !== 'all') {
      filtered = filtered.filter(job => job.location === filters.location);
    }
    const [minSalary, maxSalary] = filters.salaryRange;
    if (minSalary > 0 || maxSalary < 50000) {
      filtered = filtered.filter(job => {
        // Aceita vagas que tenham qualquer sobreposição com o intervalo selecionado
        const jMin = job.salary_min ?? job.salary_max ?? null;
        const jMax = job.salary_max ?? job.salary_min ?? null;
        if (jMin == null && jMax == null) return false;
        return (jMax ?? 0) >= minSalary && (jMin ?? 0) <= maxSalary;
      });
    }
    if (filters.experienceLevel && filters.experienceLevel !== 'all') {
      const levelKeywords: Record<string, string[]> = {
        junior: ['junior', 'júnior', 'jr', 'trainee', 'estágio', 'estagio'],
        pleno: ['pleno', 'pl'],
        senior: ['senior', 'sênior', 'sr'],
        especialista: ['especialista', 'specialist', 'lead', 'principal'],
      };
      const kws = levelKeywords[filters.experienceLevel] || [];
      filtered = filtered.filter(job => {
        // 1) Match exato pelo campo dedicado da vaga (preferencial)
        if (job.experience_level) {
          return job.experience_level === filters.experienceLevel;
        }
        // 2) Fallback: heurística por palavras-chave em título/descrição (vagas antigas sem o campo)
        const haystack = `${job.title || ''} ${job.description || ''}`.toLowerCase();
        return kws.some(k => haystack.includes(k));
      });
    }
    if (filters.datePosted && filters.datePosted !== 'all') {
      const now = Date.now();
      const DAY = 24 * 60 * 60 * 1000;
      // Faixas EXCLUSIVAS: cada opção mostra um intervalo diferente
      const ranges: Record<string, { minDays: number; maxDays: number }> = {
        '24h': { minDays: 0, maxDays: 1 },   // últimas 24h
        '7d': { minDays: 1, maxDays: 7 },    // entre 1 e 7 dias atrás
        '30d': { minDays: 7, maxDays: 30 },  // entre 7 e 30 dias atrás
      };
      const range = ranges[filters.datePosted];
      if (range) {
        const lowerBound = now - range.maxDays * DAY;
        const upperBound = now - range.minDays * DAY;
        filtered = filtered.filter(job => {
          const t = new Date(job.created_at).getTime();
          return t >= lowerBound && t <= upperBound;
        });
      }
    }
    if (sortBy === 'date') {
      filtered = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'salary') {
      filtered = [...filtered].sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0));
    }
    return filtered;
  }, [jobs, filters, sortBy]);
  const resetFilters = () => {
    setFilters({
      keyword: '',
      cities: [],
      state: '',
      jobType: 'all',
      salaryRange: [0, 50000],
      location: 'all',
      experienceLevel: 'all',
      datePosted: 'all'
    });
  };
  const getJobTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'full-time': 'Full-time',
      'part-time': 'Part-time',
      'contract': 'Contrato',
      'freelance': 'Freelance',
      'internship': 'Estágio'
    };
    return labels[type] || type;
  };
  const getLocationLabel = (location: string) => {
    const labels: Record<string, string> = {
      'remote': 'Remoto',
      'onsite': 'Presencial',
      'hybrid': 'Híbrido'
    };
    return labels[location] || location;
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  return <div className="min-h-screen bg-background">
      {/* <VideoPresentationModal /> — temporariamente oculto */}
      <Navbar />
      
      {/* Marquee Banner - Neubrutalist */}
      <div className="w-full overflow-hidden bg-yellow border-y-3 border-foreground">
        <div className="relative flex items-center py-3">
          <div className="flex animate-marquee whitespace-nowrap items-center">
            {[1, 2, 3, 4, 5, 6].map(i => <span key={i} className="mx-8 flex items-center gap-3 text-base font-bold uppercase tracking-wide text-foreground">
                <Star className="h-5 w-5 fill-current" />
                Multiplique seu RH por 10
                <span className="text-2xl">→</span>
                Sistema trabalhando por você
              </span>)}
          </div>
        </div>
      </div>
      
      {/* Hero Section - NEUBRUTALIST */}
      <section className="border-b-3 border-foreground">
        <div className="container py-6 md:py-10 lg:py-14">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-center">
            {/* Left content */}
            <div className="space-y-6 lg:space-y-8 min-w-0">
              <h1
                className="font-black leading-[0.95] tracking-tight"
                style={{ fontSize: 'clamp(2.25rem, 5.5vw, 5rem)' }}
              >
                Encontre o{' '}
                <span className="bg-primary text-primary-foreground px-2 -rotate-1 inline-block">talento</span>{' '}
                certo, na hora certa
              </h1>

              <p
                className="text-muted-foreground max-w-xl leading-relaxed"
                style={{ fontSize: 'clamp(1rem, 1.4vw, 1.25rem)' }}
              >
                Automatize seu RH e economize{' '}
                <span className="bg-yellow px-1 font-bold">90% do tempo</span>{' '}
                gasto em recrutamento. Sem complicação.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <a href="#vagas">
                    Solicite um Demo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="yellow"
                  onClick={handleCompanyWhatsApp}
                  disabled={!whatsappNumber}
                >
                  Se você é empresa, fale com a gente
                  <MessageCircle className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Right - Quick Candidate Register Form */}
            <div className="min-w-0">
              <QuickCandidateRegister />
            </div>
          </div>
        </div>
      </section>

      {/* Jobs Section */}
      <section id="vagas" className="app-internal bg-background">
        <div className="container py-12 md:py-16">
        <div>
          <div className="grid lg:grid-cols-[280px,1fr] xl:grid-cols-[300px,1fr] gap-6 lg:gap-8">
            <JobFiltersComponent filters={filters} onFilterChange={setFilters} onReset={resetFilters} />

            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-4xl font-black">Vagas Abertas</h2>
                  <p className="text-sm text-muted-foreground mt-2 font-mono">
                    {filteredJobs.length} {filteredJobs.length === 1 ? 'vaga' : 'vagas'} disponíveis
                  </p>
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px] border-3 border-foreground shadow-brutal">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent className="border-3 border-foreground shadow-brutal">
                    <SelectItem value="date">Mais recentes</SelectItem>
                    <SelectItem value="salary">Maior salário</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4">
                {loading ? <div className="card-brutal p-12 text-center bg-muted">
                    <div className="animate-bounce-subtle inline-block">
                      <Zap className="h-12 w-12 text-primary" />
                    </div>
                    <p className="text-muted-foreground font-bold mt-4">Carregando vagas...</p>
                  </div> : filteredJobs.length === 0 ? <div className="card-brutal p-12 text-center bg-yellow">
                    <Search className="h-16 w-16 mx-auto mb-4" />
                    <h3 className="text-2xl font-black mb-2">Nenhuma vaga no momento</h3>
                    <p className="text-muted-foreground mb-6">Em breve novas oportunidades!</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button asChild>
                        <a href="#cadastro">Cadastrar currículo</a>
                      </Button>
                    </div>
                  </div> : filteredJobs.map(job => <Card key={job.id} className="group">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-xl group-hover:text-primary transition-colors">
                              {job.title}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Building2 className="h-4 w-4" />
                              {job.company_name}
                            </CardDescription>
                          </div>
                          <span className="badge-brutal text-xs">
                            {getJobTypeLabel(job.job_type)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {job.description}
                        </p>
                        <div className="flex flex-wrap gap-3 text-sm">
                          <span className="inline-flex items-center gap-1 bg-secondary px-2 py-1 rounded-lg font-semibold">
                            <MapPin className="h-3 w-3" />
                            {getLocationLabel(job.location)}
                            {job.city && ` • ${job.city}`}
                          </span>
                          {job.salary_min && job.salary_max && <span className="inline-flex items-center gap-1 bg-lime px-2 py-1 rounded-lg font-semibold">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(job.salary_min)} - {formatCurrency(job.salary_max)}
                            </span>}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button asChild variant="outline" className="w-full">
                          <Link to={`/jobs/${job.id}`}>
                            Ver detalhes
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>)}
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Como Funciona - Chunky Steps */}
      <section className="bg-primary text-primary-foreground py-20 border-y-3 border-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <span className="inline-block bg-yellow text-foreground px-4 py-2 rounded-xl border-3 border-foreground font-bold uppercase tracking-wide text-sm mb-4">
                Super simples
              </span>
              <h2 className="text-4xl md:text-5xl font-black">Como Funciona</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[{
              icon: CheckCircle2,
              title: "Cadastre-se",
              desc: "Crie sua conta em minutos",
              num: "01",
              color: "bg-yellow text-foreground"
            }, {
              icon: Users,
              title: "Conecte-se",
              desc: "Publique ou encontre vagas",
              num: "02",
              color: "bg-cyan text-foreground"
            }, {
              icon: BarChart3,
              title: "Acompanhe",
              desc: "Gerencie tudo em um painel",
              num: "03",
              color: "bg-pink text-foreground"
            }].map((step, i) => <div key={i} className={`${step.color} p-6 rounded-xl border-3 border-foreground shadow-brutal-lg`}>
                  <div className="flex items-start justify-between mb-4">
                    <step.icon className="h-10 w-10" />
                    <span className="font-mono text-4xl font-black opacity-30">{step.num}</span>
                  </div>
                  <h3 className="text-xl font-black mb-2">{step.title}</h3>
                  <p className="text-sm opacity-80">{step.desc}</p>
                </div>)}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                Por que escolher a gente?
              </h2>
              <p className="text-lg text-muted-foreground">
                Tudo que o seu RH precisa — do primeiro contato à contratação
              </p>
            </div>

            {/* JARVIS — destaque principal */}
            <div className="bg-foreground text-background rounded-2xl border-3 border-foreground shadow-brutal-lg p-8 mb-6 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-primary rounded-xl border-3 border-background flex items-center justify-center shadow-brutal">
                  <Sparkles className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="text-2xl font-black">Jarvis — seu Analista de RH Digital</h3>
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full border-2 border-background">
                    Exclusivo PRO
                  </span>
                </div>
                <p className="text-background/80 text-base leading-relaxed">
                  Todo dia, ao abrir o sistema, o Jarvis te entrega um briefing do que
                  aconteceu ontem e o que precisa de atenção hoje. Ele monitora todos os
                  seus processos, faz análises em tempo real, sugere ações e — quando você
                  mandar — ele executa. É como ter um analista sênior de RH disponível 24h.
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="flex flex-col gap-2 text-sm">
                  {["Briefing matinal automático",
                    "Sugestões proativas com dados reais",
                    "Executa ações por comando (Cmd+K)"].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-background/80">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* GRID 3x3 — 9 features */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  icon: Briefcase,
                  title: "Gestão de Vagas em Pipeline",
                  desc: "Visualize todas as suas vagas e candidatos num pipeline estilo kanban. Do currículo à contratação, tudo em uma tela.",
                  bg: "bg-yellow",
                  badge: null as string | null,
                },
                {
                  icon: Users,
                  title: "Triagem com Score e Notas",
                  desc: "Avalie candidatos com score, adicione notas internas e mova no pipeline com arrasta e solta. Decisões mais rápidas.",
                  bg: "bg-cyan",
                  badge: null,
                },
                {
                  icon: MessageCircle,
                  title: "WhatsApp Integrado",
                  desc: "Fale com qualquer candidato em um clique. Mensagem pré-preenchida com o nome e a vaga, sem precisar digitar nada.",
                  bg: "bg-lime",
                  badge: null,
                },
                {
                  icon: Brain,
                  title: "IA para Gerar Vagas e Score",
                  desc: "Descreva o cargo em uma frase e a IA monta a descrição completa. Candidatos recebem score de compatibilidade automático.",
                  bg: "bg-pink",
                  badge: "PRO",
                },
                {
                  icon: Settings,
                  title: "Workflow Configurável",
                  desc: "Cada vaga pode ter seu próprio processo seletivo: triagem, entrevista técnica, fit cultural, proposta. Você define as etapas.",
                  bg: "bg-secondary",
                  badge: "PRO",
                },
                {
                  icon: Star,
                  title: "Banco de Talentos",
                  desc: "Candidatos de processos anteriores ficam salvos e buscáveis por cargo, habilidade ou histórico. Nunca perca um bom perfil.",
                  bg: "bg-yellow",
                  badge: "PRO",
                },
                {
                  icon: Building2,
                  title: "Página de Carreira da Empresa",
                  desc: "Uma página pública com suas vagas abertas, logo e identidade da sua empresa. Link próprio para compartilhar em qualquer lugar.",
                  bg: "bg-cyan",
                  badge: "PRO",
                },
                {
                  icon: BarChart3,
                  title: "Funil Analytics Completo",
                  desc: "Veja onde os candidatos travam, quanto tempo ficam em cada etapa e qual a taxa de conversão do seu processo seletivo.",
                  bg: "bg-lime",
                  badge: "PRO",
                },
                {
                  icon: Zap,
                  title: "Do Currículo à Contratação",
                  desc: "Abertura de vaga, triagem, entrevistas, proposta, admissão e documentos — tudo dentro da mesma plataforma, sem planilha.",
                  bg: "bg-primary text-primary-foreground",
                  badge: null,
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className={`${feature.bg} p-6 rounded-xl border-3 border-foreground shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-hover transition-all relative`}
                >
                  {feature.badge && (
                    <span className="absolute top-4 right-4 bg-foreground text-background text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {feature.badge}
                    </span>
                  )}
                  <feature.icon className="h-7 w-7 mb-3" />
                  <h3 className="text-base font-black mb-1.5">{feature.title}</h3>
                  <p className="text-sm opacity-80 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-3 border-foreground font-bold shadow-brutal hover:shadow-brutal-lg hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              >
                <Link to="/funcionalidades">
                  Saber mais sobre todas as funcionalidades
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                Veja a lista completa de recursos por plano e categoria
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Planos */}
      <section className="py-20 border-y-3 border-foreground bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Planos simples, resultado real
            </h2>
            <p className="text-muted-foreground text-lg">
              Sem surpresas. Cancele quando quiser.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Starter */}
            <div className="bg-background border-3 border-foreground rounded-2xl p-8 shadow-brutal">
              <div className="inline-block bg-yellow text-foreground text-xs font-bold px-3 py-1 rounded-full border-2 border-foreground mb-4">
                STARTER
              </div>
              <p className="text-muted-foreground mb-6 text-sm">
                Substitua suas planilhas. Ideal para PMEs organizando o RH.
              </p>
              <div className="text-4xl font-black mb-1">
                R$ XX<span className="text-lg font-normal text-muted-foreground">/mês</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                até 2 usuários · até 5 vagas ativas
              </p>
              <ul className="space-y-2 mb-8 text-sm">
                {["Pipeline Kanban de vagas", "Publicação de vagas", "Gestão de candidatos", "Score e notas", "Dashboard básico", "Career page pública"].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-success font-bold">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full border-3 border-foreground font-bold shadow-brutal">
                Começar grátis →
              </Button>
            </div>
            {/* Pro */}
            <div className="bg-primary text-primary-foreground border-3 border-foreground rounded-2xl p-8 shadow-brutal-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow text-foreground text-xs font-bold px-4 py-1 rounded-full border-2 border-foreground whitespace-nowrap">
                ✦ MAIS POPULAR
              </div>
              <div className="inline-block bg-primary-foreground/20 text-primary-foreground text-xs font-bold px-3 py-1 rounded-full border-2 border-primary-foreground/30 mb-4">
                PRO
              </div>
              <p className="text-primary-foreground/80 mb-6 text-sm">
                Automação, IA e gestão completa para crescer.
              </p>
              <div className="text-4xl font-black mb-1">
                R$ XX<span className="text-lg font-normal opacity-70">/mês</span>
              </div>
              <p className="text-xs opacity-70 mb-6">
                usuários ilimitados · vagas ilimitadas
              </p>
              <ul className="space-y-2 mb-8 text-sm">
                {["Tudo do Starter", "Workflow configurável por vaga", "IA para descrição e score", "Banco de talentos", "Permissões granulares", "Career page própria", "Analytics completo", "Suporte prioritário"].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-yellow font-bold">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Button className="w-full bg-yellow text-foreground border-3 border-foreground font-bold shadow-brutal hover:shadow-brutal-lg">
                Começar com Pro →
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-foreground text-background py-20 border-y-3 border-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black mb-4">O que dizem sobre nós</h2>
              <p className="text-lg opacity-70">Histórias reais de sucesso</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[{
              quote: "Preenchemos 3 vagas técnicas em menos de 10 dias. A automação economizou horas!",
              name: "João P.",
              role: "RH Lead",
              accent: "border-yellow"
            }, {
              quote: "Interface intuitiva e dashboard incrível. Tomada de decisões muito mais fácil.",
              name: "Ana M.",
              role: "Recrutadora",
              accent: "border-cyan"
            }, {
              quote: "A IA de recomendação é surreal. Encontra talentos que encaixam na cultura.",
              name: "Carlos R.",
              role: "Gerente",
              accent: "border-pink"
            }, {
              quote: "Como candidato, o processo é transparente. Recebi feedback super rápido!",
              name: "Marina S.",
              role: "Dev",
              accent: "border-lime"
            }].map((testimonial, i) => <div key={i} className={`bg-primary/10 border-3 border-primary/30 ${testimonial.accent} border-t-4 p-6 rounded-xl shadow-brutal-lg`}>
                  <Quote className="h-8 w-8 opacity-50 mb-4" />
                  <p className="text-lg font-semibold mb-6 leading-relaxed">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-background/20 flex items-center justify-center font-black">
                      {testimonial.name[0]}
                    </div>
                    <div>
                      <p className="font-bold">{testimonial.name}</p>
                      <p className="text-sm opacity-70 font-mono">{testimonial.role}</p>
                    </div>
                  </div>
                </div>)}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <span className="sticker mb-6 inline-block">
              ⚡ Bora?
            </span>
            <h2 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
              Transforme seu recrutamento{' '}
              <span className="bg-yellow px-2 inline-block -rotate-1">hoje</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Conta gratuita. Começa em 2 minutos. Sem cartão.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={handleCompanyWhatsApp}
                disabled={!whatsappNumber}
              >
                Se você é empresa, fale com a gente
                <MessageCircle className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="cyan" asChild>
                <a href="#cadastro">
                  Sou candidato
                  <Target className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>;
}