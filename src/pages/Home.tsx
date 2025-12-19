import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, DollarSign, Building2, ArrowRight, Search, CheckCircle2, Users, Zap, BarChart3, Brain, Clock, Quote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { JobFiltersComponent, JobFilters } from '@/components/JobFilters';
export default function Home() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date');
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

    // Keyword filter
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      filtered = filtered.filter(job => job.title.toLowerCase().includes(keyword) || job.description.toLowerCase().includes(keyword) || job.company_name.toLowerCase().includes(keyword));
    }

    // Location filters
    if (filters.city) {
      filtered = filtered.filter(job => job.city?.toLowerCase().includes(filters.city.toLowerCase()));
    }
    if (filters.state) {
      filtered = filtered.filter(job => job.state?.toLowerCase().includes(filters.state.toLowerCase()));
    }

    // Job type filter
    if (filters.jobType && filters.jobType !== 'all') {
      filtered = filtered.filter(job => job.job_type === filters.jobType);
    }

    // Location mode filter
    if (filters.location && filters.location !== 'all') {
      filtered = filtered.filter(job => job.location === filters.location);
    }

    // Salary range filter
    const [minSalary, maxSalary] = filters.salaryRange;
    if (minSalary > 0 || maxSalary < 50000) {
      filtered = filtered.filter(job => {
        if (!job.salary_min || !job.salary_max) return false;
        return job.salary_min >= minSalary && job.salary_max <= maxSalary;
      });
    }

    // Date posted filter
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

    // Sort
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
  return <div className="min-h-screen bg-gradient-soft">
      <Navbar />
      
      {/* Marquee Banner */}
      <div className="w-full overflow-hidden bg-gradient-to-r from-[#1a1a3e] via-[#0a0a1f] to-[#2d1b4e] py-2 border-b border-border/50">
        <div className="relative flex items-center">
          <div className="flex animate-marquee whitespace-nowrap items-center">
            <span className="mx-8 flex items-center gap-4 text-xl font-mono font-bold italic text-[hsl(var(--marquee-cyan))] drop-shadow-[0_0_15px_rgba(0,191,255,0.8)]">
              <Zap className="h-5 w-5 text-[hsl(var(--gold-star))] fill-[hsl(var(--gold-star))] drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]" />
              Multiplique seu RH por 10. É hora de colocar um sistema para trabalhar por você.
            </span>
            <span className="mx-8 flex items-center gap-4 text-xl font-mono font-bold italic text-[hsl(var(--marquee-cyan))] drop-shadow-[0_0_15px_rgba(0,191,255,0.8)]">
              <Zap className="h-5 w-5 text-[hsl(var(--gold-star))] fill-[hsl(var(--gold-star))] drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]" />
              Multiplique seu RH por 10. É hora de colocar um sistema para trabalhar por você.
            </span>
            <span className="mx-8 flex items-center gap-4 text-xl font-mono font-bold italic text-[hsl(var(--marquee-cyan))] drop-shadow-[0_0_15px_rgba(0,191,255,0.8)]">
              <Zap className="h-5 w-5 text-[hsl(var(--gold-star))] fill-[hsl(var(--gold-star))] drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]" />
              Multiplique seu RH por 10. É hora de colocar um sistema para trabalhar por você.
            </span>
            <span className="mx-8 flex items-center gap-4 text-xl font-mono font-bold italic text-[hsl(var(--marquee-cyan))] drop-shadow-[0_0_15px_rgba(0,191,255,0.8)]">
              <Zap className="h-5 w-5 text-[hsl(var(--gold-star))] fill-[hsl(var(--gold-star))] drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]" />
              Multiplique seu RH por 10. É hora de colocar um sistema para trabalhar por você.
            </span>
          </div>
        </div>
      </div>
      
      {/* Hero Section */}
      <section className="container px-4 py-16 md:py-24 mx-0 bg-muted border-[#584998]">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
            Encontre o talento certo, na hora certa
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Automatize seu RH e economize 90% do tempo gasto em recrutamento
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button size="lg" asChild className="text-lg px-8">
              <a href="#vagas" className="bg-blue-900">Ver vagas disponíveis</a>
            </Button>
            <Button size="lg" asChild className="text-lg px-8 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg">
              <Link to="/prospect-funnel">Para Empresas — Começar</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20">
            <CardContent className="py-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-3xl font-bold text-primary">+120</p>
                  <p className="text-sm text-muted-foreground mt-1">empresas ativas</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">+10.000</p>
                  <p className="text-sm text-muted-foreground mt-1">candidatos cadastrados</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">Rápido</p>
                  <p className="text-sm text-muted-foreground mt-1">recrutamento inteligente</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Vagas Abertas</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filteredJobs.length} {filteredJobs.length === 1 ? 'vaga encontrada' : 'vagas encontradas'}
                  </p>
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Mais recentes</SelectItem>
                    <SelectItem value="salary">Maior salário</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-6">
                {loading ? <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">Carregando vagas...</p>
                    </CardContent>
                  </Card> : filteredJobs.length === 0 ? <Card>
                    <CardContent className="py-16 text-center space-y-6">
                      <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold">Nenhuma vaga disponível no momento</h3>
                        <p className="text-muted-foreground">
                          Em breve novas oportunidades serão publicadas
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                        <Button asChild size="lg">
                          <Link to="/register">Cadastrar currículo</Link>
                        </Button>
                        <Button asChild variant="outline" size="lg">
                          <Link to="/contact">Entre em contato</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card> : filteredJobs.map(job => <Card key={job.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {job.company_name}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary">{getJobTypeLabel(job.job_type)}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {job.description}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {getLocationLabel(job.location)}
                            {job.city && ` • ${job.city}, ${job.state}`}
                          </div>
                          {job.salary_min && job.salary_max && <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {formatCurrency(job.salary_min)} - {formatCurrency(job.salary_max)}
                            </div>}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button asChild variant="outline" className="w-full group">
                          <Link to={`/jobs/${job.id}`}>
                            Ver detalhes
                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Como Funciona</h2>
            <p className="text-lg text-muted-foreground">Simples e eficiente em 3 passos</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>1. Cadastre-se</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Crie sua conta como empresa ou candidato em poucos minutos
                </p>
              </CardContent>
            </Card>
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>2. Conecte-se</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Publique vagas ou encontre oportunidades ideais para você
                </p>
              </CardContent>
            </Card>
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>3. Acompanhe</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Receba notificações e gerencie tudo em um único painel
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Porque escolher nossa plataforma - Destaques/Diferenciais */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Por que escolher nossa plataforma?</h2>
              <p className="text-lg text-muted-foreground">Recursos que fazem a diferença</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Automação completa</CardTitle>
                      <CardDescription className="mt-2">
                        Automatize todo o processo seletivo e economize tempo valioso
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Search className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Filtros inteligentes</CardTitle>
                      <CardDescription className="mt-2">
                        Encontre o match perfeito entre talentos e oportunidades
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Dashboard completo</CardTitle>
                      <CardDescription className="mt-2">
                        Indicadores e métricas de recrutamento em tempo real
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">IA que recomenda</CardTitle>
                      <CardDescription className="mt-2">
                        Inteligência artificial sugere os candidatos ideais
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Rápido e intuitivo</CardTitle>
                      <CardDescription className="mt-2">
                        Plataforma leve com interface fácil de usar
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Gestão eficiente</CardTitle>
                      <CardDescription className="mt-2">
                        Controle total de candidatos e processos seletivos
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">O que dizem sobre nós</h2>
            <p className="text-lg text-muted-foreground">Histórias reais de sucesso</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="relative">
              <CardHeader>
                <Quote className="h-8 w-8 text-primary/20 absolute top-6 right-6" />
                <CardDescription className="text-base leading-relaxed">
                  "Preenchemos 3 vagas técnicas em menos de 10 dias com esta plataforma. 
                  A automação do processo seletivo economizou horas de trabalho manual."
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <div>
                  <p className="font-semibold">João P.</p>
                  <p className="text-sm text-muted-foreground">Coordenador de RH</p>
                </div>
              </CardFooter>
            </Card>
            <Card className="relative">
              <CardHeader>
                <Quote className="h-8 w-8 text-primary/20 absolute top-6 right-6" />
                <CardDescription className="text-base leading-relaxed">
                  "Interface intuitiva, fácil de usar e economiza tempo. 
                  O dashboard com métricas ajuda muito na tomada de decisões."
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <div>
                  <p className="font-semibold">Ana M.</p>
                  <p className="text-sm text-muted-foreground">Analista de Recrutamento</p>
                </div>
              </CardFooter>
            </Card>
            <Card className="relative">
              <CardHeader>
                <Quote className="h-8 w-8 text-primary/20 absolute top-6 right-6" />
                <CardDescription className="text-base leading-relaxed">
                  "A recomendação de candidatos por IA é impressionante. 
                  Conseguimos encontrar talentos que realmente se encaixam na cultura da empresa."
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <div>
                  <p className="font-semibold">Carlos R.</p>
                  <p className="text-sm text-muted-foreground">Gerente de Talentos</p>
                </div>
              </CardFooter>
            </Card>
            <Card className="relative">
              <CardHeader>
                <Quote className="h-8 w-8 text-primary/20 absolute top-6 right-6" />
                <CardDescription className="text-base leading-relaxed">
                  "Como candidato, adorei a facilidade de encontrar vagas e me candidatar. 
                  O processo é transparente e recebi feedback rapidamente."
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <div>
                  <p className="font-semibold">Marina S.</p>
                  <p className="text-sm text-muted-foreground">Desenvolvedora Full Stack</p>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-background py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold">
              Transforme seu recrutamento hoje
            </h2>
            <p className="text-xl text-muted-foreground">
              Crie sua conta gratuita e experimente a plataforma agora mesmo
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button size="lg" asChild className="text-lg px-8">
                <Link to="/register" className="border-blue-900 bg-blue-900">Sou empresa</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8">
                <Link to="/register">Sou candidato</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>;
}