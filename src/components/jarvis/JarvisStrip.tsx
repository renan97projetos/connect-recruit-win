import { useEffect, useState } from 'react';
import { Hexagon, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { JarvisContext } from '@/hooks/useJarvisContext';

interface Props {
  context: JarvisContext | null;
  onOpenPanel: () => void;
  hasAlert?: boolean;
}

const ROTATE_MS = 6000;

export function JarvisStrip({ context, onOpenPanel, hasAlert }: Props) {
  const [insights, setInsights] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!context) return;
    let cancelled = false;
    supabase.functions
      .invoke('jarvis-chat', { body: { mode: 'insights', context } })
      .then(({ data, error }) => {
        if (cancelled || error) return;
        const raw = (data as { content: string }).content || '';
        try {
          const cleaned = raw.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed.insights) && parsed.insights.length) {
            setInsights(parsed.insights.slice(0, 3));
          }
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});

    // fallback enquanto a IA carrega
    setInsights([
      `${context.pendingReview} candidatos aguardam análise`,
      `${context.applicationsThisWeek} candidaturas nesta semana`,
      `${context.activeJobs} vagas ativas`,
    ]);

    return () => {
      cancelled = true;
    };
  }, [context]);

  useEffect(() => {
    if (insights.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % insights.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [insights.length]);

  if (!context) return null;
  const current = insights[idx] ?? '';

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 h-9 text-xs"
      style={{
        background: '#1e1b4b',
        borderBottom: '1px solid #4c1d95',
        color: '#e9e7f7',
      }}
      data-tour="jarvis-strip"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="relative flex items-center justify-center shrink-0">
          <Hexagon
            className={`h-5 w-5 ${hasAlert ? 'animate-pulse' : ''}`}
            style={{
              color: hasAlert ? '#f59e0b' : '#7c3aed',
              fill: hasAlert ? '#f59e0b' : '#7c3aed',
            }}
          />
          <span className="absolute text-white font-bold text-[9px]">J</span>
        </span>
        <span
          key={idx}
          className="truncate animate-in fade-in slide-in-from-bottom-1 duration-500"
        >
          {current}
        </span>
      </div>
      <button
        onClick={onOpenPanel}
        className="flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-md font-medium hover:bg-white/10 transition-colors"
        style={{ color: '#c4b5fd' }}
      >
        Ver análise completa
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}
