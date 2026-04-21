import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MapPin, Briefcase } from 'lucide-react';

interface PageData {
  id: string;
  slug: string;
  custom_title: string | null;
  custom_description: string | null;
  primary_color: string | null;
  is_active: boolean;
  company_id: string;
  companyName?: string | null;
  logo?: string | null;
}

interface JobItem {
  id: string;
  title: string;
  job_type: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  salary_min: number | null;
  salary_max: number | null;
}

export default function CareerPage() {
  const { slug } = useParams();
  const [page, setPage] = useState<PageData | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      const { data: pageData } = await (supabase as any)
        .from('career_pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (!pageData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name, avatar_url')
        .eq('id', pageData.company_id)
        .maybeSingle();

      const { data: jobsData } = await supabase
        .from('jobs')
        .select('id, title, job_type, location, city, state, salary_min, salary_max')
        .eq('company_id', pageData.company_id)
        .eq('is_active', true)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      setPage({
        ...(pageData as any),
        companyName: profile?.company_name,
        logo: profile?.avatar_url,
      });
      setJobs((jobsData as JobItem[]) || []);
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Página não encontrada.
        </div>
        <Footer />
      </div>
    );
  }

  const color = page?.primary_color || '#7c3aed';

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8f6]">
      <Navbar />

      <header
        className="w-full py-12 px-4"
        style={{ background: `linear-gradient(135deg, ${color}15, ${color}05)` }}
      >
        <div className="max-w-4xl mx-auto text-center">
          {page?.logo && (
            <img
              src={page.logo}
              alt={page.companyName || 'Logo'}
              className="h-16 w-16 rounded-lg object-contain bg-white border border-gray-200 mx-auto mb-4 p-1"
            />
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            {page?.custom_title || `Trabalhe na ${page?.companyName || 'nossa empresa'}`}
          </h1>
          {page?.custom_description && (
            <p className="mt-3 text-gray-600 max-w-2xl mx-auto">{page.custom_description}</p>
          )}
          <div
            className="mt-4 inline-block text-xs font-medium px-3 py-1 rounded-full"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {jobs.length} {jobs.length === 1 ? 'vaga disponível' : 'vagas disponíveis'}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {jobs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma vaga aberta no momento.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {jobs.map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}?ref=career_page`}
                className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-gray-900">{job.title}</h3>
                  {job.job_type && (
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded uppercase whitespace-nowrap"
                      style={{ backgroundColor: `${color}15`, color }}
                    >
                      {job.job_type.replace('-', ' ')}
                    </span>
                  )}
                </div>
                {(job.city || job.location) && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                    <MapPin className="h-3 w-3" />
                    {[job.city, job.state].filter(Boolean).join(' / ')}
                    {job.location ? ` · ${job.location}` : ''}
                  </div>
                )}
                <div className="mt-3 text-xs font-medium" style={{ color }}>
                  Ver detalhes →
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
