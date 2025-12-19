import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, DollarSign, Building2, ArrowRight, Search, CheckCircle2, Users, Zap, BarChart3, Brain, Clock, Quote, Sparkles, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { JobFiltersComponent, JobFilters } from '@/components/JobFilters';

export default function Home() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date');
  const { user } = useSupabaseAuth();
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
    const loadJobs = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });
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
      filtered = filtered.filter(job => 
        job.title.toLowerCase().includes(keyword) || 
        job.description.toLowerCase().includes(keyword) || 
        job.company_name.toLowerCase().includes(keyword)
      );
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
      'full-time': 'Tempo Integral',
      'part-time': 'Meio Período',
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Marquee Banner - Editorial Style */}
      <div className="w-full overflow-hidden bg-accent py-3 border-y-2 border-foreground/10">
        <div className="relative flex items-center">
          <div className="flex animate-marquee whitespace-nowrap items-center">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className="mx-12 flex items-center gap-4 text-lg font-body font-medium text-accent-foreground">
                <Star className="h-4 w-4 text-primary fill-primary" />
                <span className="italic">Multiplique seu RH por 10</span>
                <span className="text-primary">•</span>
                <span>É hora de colocar um sistema para trabalhar por você</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      
      {/* Hero Section - Editorial Design */}
      <section className="relative overflow-hidden">
        {/* Organic background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary/5 rounded-blob animate-float" />
          <div className="absolute top-1/2 -left-32 w-64 h-64 bg-secondary/30 rounded-organic" style={{ animationDelay: '2s' }} />
        </div>

        <div className="container px-4 py-20 md:py-32 mx-auto relative">
          <div className="max-w-5xl mx-auto">
            {/* Stamp badge */}
            <div className="flex justify-center mb-8">
              <span className="stamp text-primary border-primary">
                Recrutamento humanizado
              </span>
            </div>

            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] text-center mb-8">
              Encontre o{' '}
              <span className="relative inline-block">
                <span className="relative z-10">talento certo</span>
                <svg className="absolute -bottom-2 left-0 w-full h-4 text-primary/30" viewBox="0 0 200 12" preserveAspectRatio="none">
                  <path d="M0 8 Q50 0, 100 8 T200 8" stroke="currentColor" strokeWidth="4" fill="none" />
                </svg>
              </span>
              , na hora certa
            </h1>

            <p className="font-body text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto text-center mb-12 leading-relaxed">
              Automatize seu RH e economize{' '}
              <span className="text-primary font-semibold">90% do tempo</span>{' '}
              gasto em recrutamento
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" asChild className="text-lg px-8 py-6 shadow-editorial hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform">
                <a href="#vagas">
                  Ver vagas disponíveis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                asChild 
                className="text-lg px-8 py-6 border-2 border-foreground/20 hover:border-primary hover:bg-primary/5 transition-all"
              >
                <Link to="/prospect-funnel">
                  Para Empresas — Começar
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Banner - Editorial Cards */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-editorial p-8 text-center rotate-slight-left">
              <p className="font-display text-5xl font-bold text-primary mb-2">+120</p>
              <p className="font-body text-sm text-muted-foreground uppercase tracking-wide">empresas ativas</p>
            </div>
            <div className="card-editorial p-8 text-center">
              <p className="font-display text-5xl font-bold text-primary mb-2">+10k</p>
              <p className="font-body text-sm text-muted-foreground uppercase tracking-wide">candidatos cadastrados</p>
            </div>
            <div className="card-editorial p-8 text-center rotate-slight-right">
              <p className="font-display text-5xl font-bold text-primary mb-2">Rápido</p>
              <p className="font-body text-sm text-muted-foreground uppercase tracking-wide">recrutamento inteligente</p>
            </div>
          </div>
        </div>
      </section>

      {/* Jobs Section */}
      <section id="vagas" className="container mx-auto px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[300px,1fr] gap-8">
            {/* Filters Sidebar */}
            <JobFiltersComponent filters={filters} onFilterChange={setFilters} onReset={resetFilters} />

            {/* Jobs List */}
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="font-display text-3xl font-bold">Vagas Abertas</h2>
                  <p className="font-body text-sm text-muted-foreground mt-2">
                    {filteredJobs.length} {filteredJobs.length === 1 ? 'vaga encontrada' : 'vagas encontradas'}
                  </p>
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px] border-2">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Mais recentes</SelectItem>
                    <SelectItem value="salary">Maior salário</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-6">
                {loading ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="py-12 text-center">
                      <div className="animate-pulse">
                        <p className="text-muted-foreground font-body">Carregando vagas...</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : filteredJobs.length === 0 ? (
                  <Card className="border-2 border-dashed bg-muted/30">
                    <CardContent className="py-16 text-center space-y-6">
                      <div className="w-20 h-20 mx-auto bg-primary/10 rounded-blob flex items-center justify-center">
                        <Search className="h-10 w-10 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-display text-2xl font-semibold">Nenhuma vaga disponível no momento</h3>
                        <p className="font-body text-muted-foreground">
                          Em breve novas oportunidades serão publicadas
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                        <Button asChild size="lg">
                          <Link to="/register">Cadastrar currículo</Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="border-2">
                          <Link to="/contact">Entre em contato</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  filteredJobs.map((job, index) => (
                    <Card 
                      key={job.id} 
                      className="border-2 border-border hover:border-primary/30 transition-all duration-300 hover:shadow-md group"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="font-display text-xl mb-2 group-hover:text-primary transition-colors">
                              {job.title}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 font-body">
                              <Building2 className="h-4 w-4" />
                              {job.company_name}
                            </CardDescription>
                          </div>
                          <Badge 
                            variant="secondary" 
                            className="font-body text-xs uppercase tracking-wide border border-current"
                          >
                            {getJobTypeLabel(job.job_type)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="font-body text-sm text-muted-foreground line-clamp-2 mb-4">
                          {job.description}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-body">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-primary" />
                            {getLocationLabel(job.location)}
                            {job.city && ` • ${job.city}, ${job.state}`}
                          </div>
                          {job.salary_min && job.salary_max && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-primary" />
                              {formatCurrency(job.salary_min)} - {formatCurrency(job.salary_max)}
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button asChild variant="outline" className="w-full group/btn border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary">
                          <Link to={`/jobs/${job.id}`}>
                            Ver detalhes
                            <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona - Editorial Steps */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <span className="stamp text-muted-foreground border-muted-foreground mb-4 inline-block">
                Simples assim
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-bold mt-4">Como Funciona</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connection line */}
              <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

              {[
                { icon: CheckCircle2, title: "Cadastre-se", desc: "Crie sua conta como empresa ou candidato em poucos minutos", num: "01" },
                { icon: Users, title: "Conecte-se", desc: "Publique vagas ou encontre oportunidades ideais para você", num: "02" },
                { icon: BarChart3, title: "Acompanhe", desc: "Receba notificações e gerencie tudo em um único painel", num: "03" },
              ].map((step, i) => (
                <div key={i} className="relative">
                  <Card className="text-center border-2 hover:border-primary/30 transition-all h-full bg-background">
                    <CardHeader>
                      <div className="relative mx-auto mb-4">
                        <div className="h-20 w-20 rounded-blob bg-primary/10 flex items-center justify-center">
                          <step.icon className="h-10 w-10 text-primary" />
                        </div>
                        <span className="absolute -top-2 -right-2 font-display text-4xl font-bold text-primary/20">
                          {step.num}
                        </span>
                      </div>
                      <CardTitle className="font-display text-xl">{step.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-body text-muted-foreground">{step.desc}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features - Asymmetric Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
                Por que escolher nossa plataforma?
              </h2>
              <p className="font-body text-lg text-muted-foreground">Recursos que fazem a diferença</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Zap, title: "Automação completa", desc: "Automatize todo o processo seletivo e economize tempo valioso", featured: true },
                { icon: Search, title: "Filtros inteligentes", desc: "Encontre o match perfeito entre talentos e oportunidades" },
                { icon: BarChart3, title: "Dashboard completo", desc: "Indicadores e métricas de recrutamento em tempo real" },
                { icon: Brain, title: "IA que recomenda", desc: "Inteligência artificial sugere os candidatos ideais" },
                { icon: Clock, title: "Rápido e intuitivo", desc: "Plataforma leve com interface fácil de usar" },
                { icon: Users, title: "Gestão eficiente", desc: "Controle total de candidatos e processos seletivos" },
              ].map((feature, i) => (
                <Card 
                  key={i} 
                  className={`border-2 transition-all hover:shadow-md ${
                    feature.featured ? 'md:col-span-2 lg:col-span-1 bg-primary/5 border-primary/20' : 'hover:border-primary/30'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        feature.featured ? 'bg-primary text-primary-foreground' : 'bg-primary/10'
                      }`}>
                        <feature.icon className={`h-6 w-6 ${feature.featured ? '' : 'text-primary'}`} />
                      </div>
                      <div>
                        <CardTitle className="font-display text-xl">{feature.title}</CardTitle>
                        <CardDescription className="font-body mt-2">{feature.desc}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials - Editorial Quote Style */}
      <section className="bg-accent text-accent-foreground py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">O que dizem sobre nós</h2>
              <p className="font-body text-lg text-accent-foreground/70">Histórias reais de sucesso</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {[
                { quote: "Preenchemos 3 vagas técnicas em menos de 10 dias com esta plataforma. A automação do processo seletivo economizou horas de trabalho manual.", name: "João P.", role: "Coordenador de RH" },
                { quote: "Interface intuitiva, fácil de usar e economiza tempo. O dashboard com métricas ajuda muito na tomada de decisões.", name: "Ana M.", role: "Analista de Recrutamento" },
                { quote: "A recomendação de candidatos por IA é impressionante. Conseguimos encontrar talentos que realmente se encaixam na cultura da empresa.", name: "Carlos R.", role: "Gerente de Talentos" },
                { quote: "Como candidato, adorei a facilidade de encontrar vagas e me candidatar. O processo é transparente e recebi feedback rapidamente.", name: "Marina S.", role: "Desenvolvedora Full Stack" },
              ].map((testimonial, i) => (
                <div 
                  key={i} 
                  className="relative p-8 bg-accent-foreground/5 rounded-lg border border-accent-foreground/10"
                >
                  <Quote className="h-10 w-10 text-primary/30 absolute top-6 right-6" />
                  <p className="font-body text-lg leading-relaxed mb-6 text-accent-foreground/90">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="font-display font-bold text-primary">{testimonial.name[0]}</span>
                    </div>
                    <div>
                      <p className="font-body font-semibold">{testimonial.name}</p>
                      <p className="font-body text-sm text-accent-foreground/60">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final - Bold Editorial */}
      <section className="relative py-24 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-secondary/30 rounded-blob" />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <span className="stamp text-primary border-primary">
              Comece agora
            </span>
            <h2 className="font-display text-5xl md:text-6xl font-bold leading-tight">
              Transforme seu recrutamento hoje
            </h2>
            <p className="font-body text-xl text-muted-foreground">
              Crie sua conta gratuita e experimente a plataforma agora mesmo
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button size="lg" asChild className="text-lg px-8 py-6 shadow-editorial">
                <Link to="/register">
                  Sou empresa
                  <Sparkles className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6 border-2">
                <Link to="/register">Sou candidato</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
