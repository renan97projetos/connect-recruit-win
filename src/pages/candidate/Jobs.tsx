import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CandidateLayout } from '@/components/CandidateLayout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MapPin,
  DollarSign,
  Building2,
  ArrowRight,
  Search,
  Zap,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { JobFiltersComponent, JobFilters } from '@/components/JobFilters';

const getJobTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    contract: 'Contrato',
    freelance: 'Freelance',
    internship: 'Estágio',
  };
  return labels[type] || type;
};

const getLocationLabel = (location: string) => {
  const labels: Record<string, string> = {
    remote: 'Remoto',
    onsite: 'Presencial',
    hybrid: 'Híbrido',
  };
  return labels[location] || location;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function CandidateJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date');
  const [filters, setFilters] = useState<JobFilters>({
    keyword: '',
    cities: [],
    state: '',
    jobType: 'all',
    salaryRange: [0, 50000],
    location: 'all',
    experienceLevel: 'all',
    datePosted: 'all',
  });

  useEffect(() => {
    const loadJobs = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });
      if (!error && data) setJobs(data);
      setLoading(false);
    };
    loadJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    let filtered = jobs;
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(keyword) ||
          job.description.toLowerCase().includes(keyword) ||
          job.company_name.toLowerCase().includes(keyword),
      );
    }
    if (filters.cities && filters.cities.length > 0) {
      const lower = filters.cities.map((c) => c.toLowerCase());
      filtered = filtered.filter((job) => job.city && lower.includes(job.city.toLowerCase()));
    }
    if (filters.state) {
      filtered = filtered.filter(
        (job) => job.state?.toLowerCase() === filters.state.toLowerCase(),
      );
    }
    if (filters.jobType && filters.jobType !== 'all') {
      filtered = filtered.filter((job) => job.job_type === filters.jobType);
    }
    if (filters.location && filters.location !== 'all') {
      filtered = filtered.filter((job) => job.location === filters.location);
    }
    const [minSalary, maxSalary] = filters.salaryRange;
    if (minSalary > 0 || maxSalary < 50000) {
      filtered = filtered.filter((job) => {
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
      filtered = filtered.filter((job) => {
        if (job.experience_level) return job.experience_level === filters.experienceLevel;
        const haystack = `${job.title || ''} ${job.description || ''}`.toLowerCase();
        return kws.some((k) => haystack.includes(k));
      });
    }
    if (filters.datePosted && filters.datePosted !== 'all') {
      const now = Date.now();
      const DAY = 24 * 60 * 60 * 1000;
      const ranges: Record<string, { minDays: number; maxDays: number }> = {
        '24h': { minDays: 0, maxDays: 1 },
        '7d': { minDays: 1, maxDays: 7 },
        '30d': { minDays: 7, maxDays: 30 },
      };
      const range = ranges[filters.datePosted];
      if (range) {
        const lowerBound = now - range.maxDays * DAY;
        const upperBound = now - range.minDays * DAY;
        filtered = filtered.filter((job) => {
          const t = new Date(job.created_at).getTime();
          return t >= lowerBound && t <= upperBound;
        });
      }
    }
    if (sortBy === 'date') {
      filtered = [...filtered].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
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
      datePosted: 'all',
    });
  };

  return (
    <CandidateLayout
      title="Portal de Vagas"
      description="Explore as oportunidades disponíveis e candidate-se com um clique"
    >
      <div className="grid lg:grid-cols-[280px,1fr] xl:grid-cols-[300px,1fr] gap-6 lg:gap-8">
        <JobFiltersComponent
          filters={filters}
          onFilterChange={setFilters}
          onReset={resetFilters}
        />

        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-black">Vagas Abertas</h2>
              <p className="text-sm text-muted-foreground mt-2 font-mono">
                {filteredJobs.length}{' '}
                {filteredJobs.length === 1 ? 'vaga' : 'vagas'} disponíveis
              </p>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Mais recentes</SelectItem>
                <SelectItem value="salary">Maior salário</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {loading ? (
              <div className="rounded-lg border bg-card p-12 text-center">
                <div className="animate-bounce-subtle inline-block">
                  <Zap className="h-12 w-12 text-primary" />
                </div>
                <p className="text-muted-foreground font-bold mt-4">Carregando vagas...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="rounded-lg border bg-card p-12 text-center">
                <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-2xl font-black mb-2">Nenhuma vaga encontrada</h3>
                <p className="text-muted-foreground mb-6">
                  Tente ajustar os filtros para ver mais oportunidades.
                </p>
                <Button onClick={resetFilters} variant="outline">
                  Limpar filtros
                </Button>
              </div>
            ) : (
              filteredJobs.map((job) => (
                <Card key={job.id} className="group">
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
                      <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-semibold">
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
                      {job.salary_min && job.salary_max && (
                        <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-lg font-semibold">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(job.salary_min)} - {formatCurrency(job.salary_max)}
                        </span>
                      )}
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
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </CandidateLayout>
  );
}
