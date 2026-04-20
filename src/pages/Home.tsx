import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, DollarSign, Building2, ArrowRight, Search, CheckCircle2, Users, Zap, BarChart3, Brain, Clock, Quote, Sparkles, Star, Rocket, Target, Heart, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { JobFiltersComponent, JobFilters } from '@/components/JobFilters';
import { QuickCandidateRegister } from '@/components/QuickCandidateRegister';
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
    city: '',
    state: '',
    jobType: 'all',
    salaryRange: [0, 50000],
    location: 'all',
    experienceLevel: 'all',
    datePosted: 'all'
  });
  useEffect(() => {
    supabase
      .from('system_settings')
      .select('whatsapp_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.whatsapp_number) setWhatsappNumber(data.whatsapp_number);
      });
  }, []);
  const handleCompanyWhatsApp = () => {
    if (!whatsappNumber) return;
    const msg = encodeURIComponent('Olá! Sou de uma empresa e gostaria de saber mais sobre o Sinapse RH.');
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
    if (filters.city) {
      filtered = filtered.filter(job => job.city?.toLowerCase().includes(filters.city.toLowerCase()));
    }
    if (filters.state) {
      filtered = filtered.filter(job => job.state?.toLowerCase().includes(filters.state.toLowerCase()));
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
        if (!job.salary_min || !job.salary_max) return false;
        return job.salary_min >= minSalary && job.salary_max <= maxSalary;
      });
    }
    if (filters.datePosted && filters.datePosted !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      if (filters.datePosted === '24h') {
        filterDate.setDate(now.getDate() - 1);
      } else if (filters.datePosted === '7d') {
        filterDate.setDate(now.getDate() - 7);
      } else if (filters.datePosted === '30d') {
        filterDate.setDate(now.getDate() - 30);
      }
      filtered = filtered.filter(job => {
        const jobDate = new Date(job.created_at);
        return jobDate >= filterDate;
      });
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
      city: '',
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
      <Navbar />
      
      {/* Video Hero Section - Full Screen */}
      <section className="relative w-full bg-foreground border-b-3 border-foreground overflow-hidden">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-5xl mx-auto">
            {/* Video Title */}
            <div className="text-center mb-6">
              <span className="inline-block bg-yellow text-foreground px-4 py-2 rounded-xl border-3 border-foreground font-bold uppercase tracking-wide text-sm mb-4">
                Conheça a Sinapse RH
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-background mb-2">
                Veja como transformar seu RH
              </h2>
              <p className="text-background/70 max-w-xl mx-auto">
                Um tour rápido pelo sistema que automatiza todo seu processo de recrutamento
              </p>
            </div>
            
            {/* Video Container - 16:9 Aspect Ratio */}
            <div className="relative w-full rounded-2xl border-4 border-background shadow-brutal-lg overflow-hidden bg-background">
              <div className="aspect-video">
                {/* 
                  INSTRUÇÕES PARA EMBED DE VÍDEO:
                  
                  Para YouTube, substitua VIDEO_ID pelo ID do seu vídeo:
                  <iframe 
                    src="https://www.youtube.com/embed/VIDEO_ID?autoplay=0&rel=0&modestbranding=1" 
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Apresentação Sinapse RH"
                  />
                  
                  Para Vimeo, substitua VIDEO_ID pelo ID do seu vídeo:
                  <iframe 
                    src="https://player.vimeo.com/video/VIDEO_ID" 
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title="Apresentação Sinapse RH"
                  />
                */}
                
                {/* Placeholder até adicionar o vídeo */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-background to-cyan/20">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center border-4 border-foreground shadow-brutal cursor-pointer hover:scale-105 transition-transform">
                      <svg className="w-10 h-10 text-primary-foreground ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <div className="absolute -top-2 -right-2 bg-yellow text-foreground text-xs font-bold px-2 py-1 rounded-lg border-2 border-foreground rotate-12">
                      Em breve!
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-6 text-center max-w-md px-4">
                    O vídeo de apresentação será adicionado aqui.<br/>
                    <span className="text-sm opacity-70">Cole o embed do YouTube ou Vimeo no código</span>
                  </p>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>
      
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
        <div className="container px-4 py-4 md:py-8 mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className="space-y-8">
              <div className="inline-block">
                
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[0.9] tracking-tight">
                Encontre o{' '}
                <span className="bg-primary text-primary-foreground px-2 -rotate-1 inline-block">talento</span>{' '}
                certo, na hora certa
              </h1>

              <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                Automatize seu RH e economize{' '}
                <span className="bg-yellow px-1 font-bold">90% do tempo</span>{' '}
                gasto em recrutamento. Sem complicação.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <a href="#vagas">
                    Ver vagas
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

              {/* Stats Grid - Compact */}
              <div className="grid grid-cols-4 gap-3 pt-4">
                <div className="card-yellow p-3 text-center">
                  <p className="text-2xl font-black">+120</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide mt-1">Empresas</p>
                </div>
                <div className="card-cyan p-3 text-center">
                  <p className="text-2xl font-black">+10k</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide mt-1">Candidatos</p>
                </div>
                <div className="card-pink p-3 text-center">
                  <p className="text-2xl font-black">90%</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide mt-1">Tempo salvo</p>
                </div>
                <div className="card-lime p-3 text-center">
                  <p className="text-2xl font-black">24h</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide mt-1">Suporte</p>
                </div>
              </div>
            </div>

            {/* Right - Quick Candidate Register Form */}
            <div>
              <QuickCandidateRegister />
            </div>
          </div>
        </div>
      </section>

      {/* Jobs Section */}
      <section id="vagas" className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[300px,1fr] gap-8">
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
                      <Button variant="outline" asChild>
                        <Link to="/prospect-funnel">Falar conosco</Link>
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
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black mb-4">Por que escolher a gente?</h2>
              <p className="text-lg text-muted-foreground">Recursos que fazem diferença de verdade</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[{
              icon: Zap,
              title: "Automação total",
              desc: "Todo processo seletivo automatizado",
              bg: "bg-yellow"
            }, {
              icon: Search,
              title: "Filtros smart",
              desc: "Match perfeito entre talento e vaga",
              bg: "bg-cyan"
            }, {
              icon: BarChart3,
              title: "Dashboard show",
              desc: "Métricas em tempo real",
              bg: "bg-pink"
            }, {
              icon: Brain,
              title: "IA que ajuda",
              desc: "Recomendações inteligentes",
              bg: "bg-lime"
            }, {
              icon: Clock,
              title: "Rápido demais",
              desc: "Interface leve e intuitiva",
              bg: "bg-secondary"
            }, {
              icon: Heart,
              title: "Suporte humano",
              desc: "Time de verdade te ajudando",
              bg: "bg-primary text-primary-foreground"
            }].map((feature, i) => <div key={i} className={`${feature.bg} p-6 rounded-xl border-3 border-foreground shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-hover transition-all`}>
                  <feature.icon className="h-8 w-8 mb-4" />
                  <h3 className="text-lg font-black mb-1">{feature.title}</h3>
                  <p className="text-sm opacity-80">{feature.desc}</p>
                </div>)}
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
              color: "bg-yellow text-foreground"
            }, {
              quote: "Interface intuitiva e dashboard incrível. Tomada de decisões muito mais fácil.",
              name: "Ana M.",
              role: "Recrutadora",
              color: "bg-cyan text-foreground"
            }, {
              quote: "A IA de recomendação é surreal. Encontra talentos que encaixam na cultura.",
              name: "Carlos R.",
              role: "Gerente",
              color: "bg-pink text-foreground"
            }, {
              quote: "Como candidato, o processo é transparente. Recebi feedback super rápido!",
              name: "Marina S.",
              role: "Dev",
              color: "bg-lime text-foreground"
            }].map((testimonial, i) => <div key={i} className={`${testimonial.color} p-6 rounded-xl border-3 border-foreground shadow-brutal-lg`}>
                  <Quote className="h-8 w-8 opacity-30 mb-4" />
                  <p className="text-lg font-semibold mb-6 leading-relaxed">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-foreground/20 flex items-center justify-center font-black">
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