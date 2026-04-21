import { useEffect, useState } from 'react';
import { Hexagon, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import type { JarvisContext } from '@/hooks/useJarvisContext';

interface Props {
  context: JarvisContext | null;
  userName: string;
  onClose: () => void;
}

interface BriefingData {
  highlights: string[];
  agenda: string[];
  alert: string | null;
}

const todayLabel = () =>
  new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

export function JarvisBriefing({ context, userName, onClose }: Props) {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!context) return;
    let cancelled = false;
    setLoading(true);

    supabase.functions
      .invoke('jarvis-chat', { body: { mode: 'briefing', context } })
      .then(({ data: res, error }) => {
        if (cancelled) return;
        if (error) throw error;
        const raw = (res as { content: string }).content || '';
        try {
          const cleaned = raw.replace(/```json|```/g, '').trim();
          setData(JSON.parse(cleaned));
        } catch {
          // fallback bruto
          setData({
            highlights: [
              `${context.applicationsToday} novas candidaturas hoje`,
              `${context.pendingReview} candidatos aguardam análise`,
              `${context.activeJobs} vagas ativas`,
            ],
            agenda: [
              context.staleCandidates > 0
                ? `Revisar ${context.staleCandidates} candidatos parados há mais de 7 dias`
                : 'Acompanhar pipeline de candidatos',
              context.pendingApprovals > 0
                ? `Aprovar ${context.pendingApprovals} requisições pendentes`
                : 'Verificar requisições do dia',
              context.pendingOffers > 0
                ? `Cobrar resposta em ${context.pendingOffers} propostas enviadas`
                : 'Revisar etapas de proposta',
            ],
            alert:
              context.staleCandidates > 5
                ? `${context.staleCandidates} candidatos esquecidos no pipeline`
                : null,
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setData({
          highlights: ['Não consegui gerar o resumo agora.'],
          agenda: ['Acompanhar candidatos pendentes', 'Revisar requisições e propostas'],
          alert: null,
        });
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [context]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 350);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ${
        closing ? 'opacity-0' : 'opacity-100 animate-in fade-in duration-500'
      }`}
      style={{
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1040 100%)',
      }}
    >
      <div className="w-full max-w-6xl px-8 py-10 grid grid-cols-1 md:grid-cols-5 gap-10">
        {/* Esquerda */}
        <div className="md:col-span-2 flex flex-col justify-center">
          <div className="relative h-16 w-16 mb-6">
            <Hexagon className="h-16 w-16" style={{ color: '#7c3aed', fill: '#7c3aed' }} />
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">
              J
            </span>
            <span
              className="absolute -inset-2 rounded-full animate-ping opacity-30"
              style={{ background: '#7c3aed' }}
            />
          </div>
          <h1 className="text-white text-3xl font-semibold mb-2">
            Bom dia, {userName}.
          </h1>
          <p className="text-base mb-6" style={{ color: '#c4b5fd' }}>
            Aqui está o seu briefing de {todayLabel()}.
          </p>

          {data?.alert && (
            <div
              className="rounded-lg p-3 mb-5 flex items-start gap-2 text-sm"
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid #f59e0b',
                color: '#fcd34d',
              }}
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{data.alert}</span>
            </div>
          )}

          {loading || !data ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full bg-white/10" />
              <Skeleton className="h-4 w-5/6 bg-white/10" />
              <Skeleton className="h-4 w-4/6 bg-white/10" />
            </div>
          ) : (
            <ul className="space-y-2.5">
              {data.highlights.map((h, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-sm leading-relaxed"
                  style={{ color: '#e9e7f7' }}
                >
                  <span style={{ color: '#7c3aed' }}>•</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Direita */}
        <div className="md:col-span-3">
          <div
            className="rounded-2xl p-6 h-full flex flex-col"
            style={{
              background: 'rgba(26, 16, 64, 0.7)',
              border: '1px solid #4c1d95',
              boxShadow: '0 20px 60px -20px rgba(124, 58, 237, 0.4)',
            }}
          >
            <h2 className="text-white text-xl font-semibold mb-1">Pauta do dia</h2>
            <p className="text-xs mb-5" style={{ color: '#c4b5fd' }}>
              Prioridades sugeridas pelo Jarvis
            </p>

            <div className="flex-1">
              {loading || !data ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full bg-white/10" />
                  <Skeleton className="h-12 w-full bg-white/10" />
                  <Skeleton className="h-12 w-full bg-white/10" />
                </div>
              ) : (
                <ol className="space-y-2.5">
                  {data.agenda.map((item, i) => (
                    <li
                      key={i}
                      className="rounded-lg p-3 text-sm flex gap-3 items-start"
                      style={{
                        background: '#0f0f1a',
                        border: '1px solid #4c1d95',
                        color: '#e9e7f7',
                      }}
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                        style={{ background: '#7c3aed', color: '#fff' }}
                      >
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <Button
              onClick={handleClose}
              className="mt-6 self-end gap-2 hover:opacity-90"
              style={{ background: '#7c3aed', color: '#fff' }}
              size="lg"
            >
              Entrar no sistema
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
