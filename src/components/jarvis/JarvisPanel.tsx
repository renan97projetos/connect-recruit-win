import { useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Send, X, Hexagon, Sparkles, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { JarvisContext } from '@/hooks/useJarvisContext';

interface Props {
  open: boolean;
  onClose: () => void;
  context: JarvisContext | null;
  injectedExchange?: { question: string; answer: string } | null;
  onExchangeConsumed?: () => void;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

interface Suggestion {
  title: string;
  reason: string;
  cta: string;
}

const ctaToRoute = (cta: string): string => {
  const c = cta.toLowerCase();
  if (c.includes('vaga')) return '/company/dashboard';
  if (c.includes('candidato')) return '/company/talent-pool';
  if (c.includes('requisi')) return '/company/job-requests';
  if (c.includes('proposta')) return '/company/dashboard';
  return '/company/dashboard';
};

export function JarvisPanel({ open, onClose, context, injectedExchange, onExchangeConsumed }: Props) {
  const navigate = useNavigate();
  const [report, setReport] = useState<string>('');
  const [reportLoading, setReportLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggLoading, setSuggLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const generatedRef = useRef(false);

  const callJarvis = async (mode: 'report' | 'suggestions' | 'chat', msgs?: ChatMsg[]) => {
    const { data, error } = await supabase.functions.invoke('jarvis-chat', {
      body: { mode, context, messages: msgs },
    });
    if (error) throw error;
    return (data as { content: string }).content;
  };

  // Gerar relatório + sugestões na primeira abertura com contexto
  useEffect(() => {
    if (!open || !context || generatedRef.current) return;
    generatedRef.current = true;

    setReportLoading(true);
    callJarvis('report')
      .then((c) => setReport(c))
      .catch(() => setReport('Não consegui gerar a análise no momento. Tente novamente em instantes.'))
      .finally(() => setReportLoading(false));

    setSuggLoading(true);
    callJarvis('suggestions')
      .then((c) => {
        try {
          const cleaned = c.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          setSuggestions(parsed.suggestions || []);
        } catch {
          setSuggestions([]);
        }
      })
      .catch(() => setSuggestions([]))
      .finally(() => setSuggLoading(false));
  }, [open, context]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setChatLoading(true);
    try {
      const reply = await callJarvis('chat', next);
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([
        ...next,
        { role: 'assistant', content: 'Desculpe, tive um problema ao responder. Tente novamente.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[700px] p-0 border-l-0 [&>button]:hidden"
        style={{ background: '#0f0f1a', color: '#fff' }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ background: '#1a1040', borderBottom: '1px solid #4c1d95' }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Hexagon
                  className="h-9 w-9"
                  style={{ color: '#7c3aed', fill: '#7c3aed' }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                  J
                </span>
                <span
                  className="absolute -inset-1 rounded-full animate-ping opacity-30"
                  style={{ background: '#7c3aed' }}
                />
              </div>
              <div>
                <div className="font-semibold text-white text-base">Jarvis</div>
                <div className="text-xs" style={{ color: '#c4b5fd' }}>
                  Analista de RH
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Conteúdo scrollável */}
          <ScrollArea className="flex-1">
            <div className="px-6 py-5 space-y-6">
              {/* Relatório */}
              <section>
                <h3
                  className="text-xs uppercase tracking-wider mb-3 flex items-center gap-2"
                  style={{ color: '#c4b5fd' }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Relatório do momento
                </h3>
                <div
                  className="rounded-lg p-4 text-sm leading-relaxed whitespace-pre-line"
                  style={{
                    background: '#1a1040',
                    border: '1px solid #4c1d95',
                    color: '#e9e7f7',
                  }}
                >
                  {reportLoading || !context ? (
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-full bg-white/10" />
                      <Skeleton className="h-3 w-11/12 bg-white/10" />
                      <Skeleton className="h-3 w-4/5 bg-white/10" />
                    </div>
                  ) : (
                    report
                  )}
                </div>
              </section>

              {/* Sugestões */}
              <section>
                <h3
                  className="text-xs uppercase tracking-wider mb-3 flex items-center gap-2"
                  style={{ color: '#c4b5fd' }}
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  Sugestões proativas
                </h3>
                {suggLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full bg-white/10" />
                    <Skeleton className="h-16 w-full bg-white/10" />
                  </div>
                ) : suggestions.length === 0 ? (
                  <p className="text-xs" style={{ color: '#9ca3af' }}>
                    Nenhuma sugestão crítica no momento.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {suggestions.map((s, i) => (
                      <li
                        key={i}
                        className="rounded-lg p-3 flex items-start justify-between gap-3"
                        style={{ background: '#1a1040', border: '1px solid #4c1d95' }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white">{s.title}</div>
                          <div className="text-xs mt-0.5" style={{ color: '#c4b5fd' }}>
                            {s.reason}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="shrink-0"
                          style={{ background: '#7c3aed', color: '#fff' }}
                          onClick={() => {
                            navigate(ctaToRoute(s.cta));
                            onClose();
                          }}
                        >
                          {s.cta}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Histórico de chat */}
              {messages.length > 0 && (
                <section>
                  <h3
                    className="text-xs uppercase tracking-wider mb-3"
                    style={{ color: '#c4b5fd' }}
                  >
                    Conversa
                  </h3>
                  <div className="space-y-2" ref={scrollRef}>
                    {messages.map((m, i) => (
                      <div
                        key={i}
                        className={`rounded-lg px-3 py-2 text-sm whitespace-pre-line ${
                          m.role === 'user' ? 'ml-8' : 'mr-8'
                        }`}
                        style={{
                          background: m.role === 'user' ? '#4c1d95' : '#1a1040',
                          border: m.role === 'user' ? 'none' : '1px solid #4c1d95',
                          color: '#fff',
                        }}
                      >
                        {m.content}
                      </div>
                    ))}
                    {chatLoading && (
                      <div
                        className="mr-8 rounded-lg px-3 py-2 text-sm flex gap-1"
                        style={{ background: '#1a1040', border: '1px solid #4c1d95' }}
                      >
                        <span className="h-2 w-2 rounded-full bg-white/60 animate-bounce" />
                        <span
                          className="h-2 w-2 rounded-full bg-white/60 animate-bounce"
                          style={{ animationDelay: '0.15s' }}
                        />
                        <span
                          className="h-2 w-2 rounded-full bg-white/60 animate-bounce"
                          style={{ animationDelay: '0.3s' }}
                        />
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          </ScrollArea>

          {/* Input do chat */}
          <div
            className="px-4 py-3 flex gap-2 items-end"
            style={{ background: '#1a1040', borderTop: '1px solid #4c1d95' }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Pergunte ao Jarvis..."
              rows={1}
              className="resize-none bg-[#0f0f1a] border-[#4c1d95] text-white placeholder:text-white/40 focus-visible:ring-[#7c3aed]"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || chatLoading}
              size="icon"
              style={{ background: '#7c3aed' }}
              className="shrink-0 hover:opacity-90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
