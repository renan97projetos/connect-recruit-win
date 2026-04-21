import { useEffect, useRef, useState } from 'react';
import { Hexagon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { JarvisContext } from '@/hooks/useJarvisContext';

interface Props {
  open: boolean;
  onClose: () => void;
  context: JarvisContext | null;
  onAnswer?: (question: string, answer: string) => void;
}

const SUGGESTIONS = [
  'Quantas candidaturas recebemos esta semana?',
  'Quais candidatos estão parados há mais de 7 dias?',
  'Faça um resumo do estado atual do recrutamento',
  'Quais vagas precisam de atenção?',
];

export function JarvisCommandBar({ open, onClose, context, onAnswer }: Props) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setInput('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const submit = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('jarvis-chat', {
        body: {
          mode: 'chat',
          context,
          messages: [{ role: 'user', content: q }],
        },
      });
      if (error) throw error;
      const answer = (data as { content: string }).content || '';
      onAnswer?.(q, answer);
      onClose();
    } catch {
      onAnswer?.(q, 'Não consegui responder agora. Tente novamente em instantes.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center pt-[18vh] px-4 animate-in fade-in duration-150"
      style={{ background: 'rgba(15, 15, 26, 0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-200"
        style={{
          background: '#0f0f1a',
          border: '1px solid #4c1d95',
          boxShadow: '0 30px 80px -20px rgba(124, 58, 237, 0.5)',
        }}
      >
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid #4c1d95' }}
        >
          <div className="relative flex items-center justify-center shrink-0">
            <Hexagon className="h-7 w-7" style={{ color: '#7c3aed', fill: '#7c3aed' }} />
            <span className="absolute text-white font-bold text-xs">J</span>
          </div>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="Pergunte ao Jarvis ou dê um comando..."
            disabled={loading}
            className="flex-1 bg-transparent outline-none text-white text-base placeholder:text-white/40"
          />
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#c4b5fd' }} />
          )}
          <kbd
            className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{ background: '#1a1040', color: '#c4b5fd', border: '1px solid #4c1d95' }}
          >
            Esc
          </kbd>
        </div>

        <div className="p-3">
          <div
            className="text-[10px] uppercase tracking-wider px-2 pt-1 pb-2"
            style={{ color: '#c4b5fd' }}
          >
            Sugestões
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                disabled={loading}
                className="text-xs px-2.5 py-1.5 rounded-md text-left transition-colors hover:bg-white/5 disabled:opacity-50"
                style={{
                  background: '#1a1040',
                  border: '1px solid #4c1d95',
                  color: '#e9e7f7',
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="mt-3 px-2 pb-1 text-[10px]" style={{ color: '#9ca3af' }}>
            Pressione Enter para enviar · Cmd/Ctrl + K para abrir/fechar
          </div>
        </div>
      </div>
    </div>
  );
}
