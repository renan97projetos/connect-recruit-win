import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Users, Edit, MapPin, Briefcase, DollarSign, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface JobStagePanelProps {
  job: any;
  onClose: () => void;
}

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  aberta: { label: 'Vaga aberta', color: 'bg-violet-50 text-violet-700' },
  triagem: { label: 'Triagem', color: 'bg-gray-100 text-gray-700' },
  entrevista: { label: 'Entrevista', color: 'bg-blue-50 text-blue-700' },
  avaliacao: { label: 'Avaliação', color: 'bg-amber-50 text-amber-700' },
  proposta: { label: 'Proposta', color: 'bg-orange-50 text-orange-700' },
  admissao: { label: 'Admissão', color: 'bg-teal-50 text-teal-700' },
  contratado: { label: 'Contratado', color: 'bg-green-50 text-green-700' },
  reprovado: { label: 'Reprovado', color: 'bg-red-50 text-red-700' },
};

const LOCATION_LABELS: Record<string, string> = {
  remote: 'Remoto',
  onsite: 'Presencial',
  hybrid: 'Híbrido',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);

const daysAgo = (date: string) => {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

export function JobStagePanel({ job, onClose }: JobStagePanelProps) {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCandidates = async () => {
      if (!job?.id) return;
      setLoading(true);
      const { data } = await supabase
        .from('applications')
        .select('id, candidate_name, candidate_email, status, score, applied_at')
        .eq('job_id', job.id)
        .order('applied_at', { ascending: false })
        .limit(5);
      setCandidates(data || []);
      setLoading(false);
    };
    loadCandidates();
  }, [job?.id]);

  const stage = STAGE_LABELS[job.pipeline_stage || 'aberta'] || STAGE_LABELS.aberta;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-200">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-gray-900 truncate">{job.title}</h2>
          <span
            className={cn(
              'inline-block mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full',
              stage.color
            )}
          >
            {stage.label}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Ações desta etapa */}
        <section className="px-6 py-5 border-b border-gray-200">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-3">
            Ações desta etapa
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate(`/company/jobs/${job.id}/candidates`)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-primary/50 hover:bg-primary/5 text-sm font-medium text-gray-700 transition-colors"
            >
              <Users className="h-4 w-4 text-primary" />
              Ver candidatos
            </button>
            <button
              onClick={() => navigate(`/company/jobs/${job.id}/edit`)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-primary/50 hover:bg-primary/5 text-sm font-medium text-gray-700 transition-colors"
            >
              <Edit className="h-4 w-4 text-primary" />
              Editar vaga
            </button>
          </div>
        </section>

        {/* Informações */}
        <section className="px-6 py-5 border-b border-gray-200">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-3">
            Informações
          </p>
          <dl className="space-y-3">
            <div className="flex items-start gap-3">
              <Briefcase className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <dt className="text-[11px] uppercase text-gray-500">Tipo</dt>
                <dd className="text-[13px] text-gray-900 font-medium">{job.job_type || '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <dt className="text-[11px] uppercase text-gray-500">Localização</dt>
                <dd className="text-[13px] text-gray-900 font-medium">
                  {LOCATION_LABELS[job.location] || job.location}
                  {job.city && ` · ${job.city}`}
                  {job.state && `/${job.state}`}
                </dd>
              </div>
            </div>
            {(job.salary_min || job.salary_max) && (
              <div className="flex items-start gap-3">
                <DollarSign className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <dt className="text-[11px] uppercase text-gray-500">Salário</dt>
                  <dd className="text-[13px] text-gray-900 font-medium">
                    {job.salary_min && formatCurrency(Number(job.salary_min))}
                    {job.salary_min && job.salary_max && ' – '}
                    {job.salary_max && formatCurrency(Number(job.salary_max))}
                  </dd>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <dt className="text-[11px] uppercase text-gray-500">Criada em</dt>
                <dd className="text-[13px] text-gray-900 font-medium">
                  {new Date(job.created_at).toLocaleDateString('pt-BR')}
                </dd>
              </div>
            </div>
          </dl>
        </section>

        {/* Candidatos */}
        <section className="px-6 py-5 border-b border-gray-200">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-3">
            Últimos candidatos
          </p>
          {loading ? (
            <p className="text-[13px] text-gray-400">Carregando…</p>
          ) : candidates.length === 0 ? (
            <p className="text-[13px] text-gray-400">Nenhum candidato ainda.</p>
          ) : (
            <ul className="space-y-2">
              {candidates.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{c.candidate_name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{c.candidate_email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.score != null && (
                      <span className="text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {c.score}
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-wide text-gray-500">
                      {c.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Histórico */}
        <section className="px-6 py-5">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-3">
            Histórico
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <Clock className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-[13px] text-gray-700">Vaga criada</p>
                <p className="text-[11px] text-gray-500">
                  Há {daysAgo(job.created_at)} dia(s) ·{' '}
                  {new Date(job.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </li>
            {job.updated_at && job.updated_at !== job.created_at && (
              <li className="flex items-start gap-2">
                <Clock className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-[13px] text-gray-700">Última atualização</p>
                  <p className="text-[11px] text-gray-500">
                    {new Date(job.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
