import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type State =
  | { kind: 'loading' }
  | { kind: 'valid' }
  | { kind: 'already' }
  | { kind: 'invalid'; message: string }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    if (!token) {
      setState({ kind: 'invalid', message: 'Token não fornecido.' });
      return;
    }
    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: anonKey } }
        );
        const data = await res.json();
        if (data.valid === true) setState({ kind: 'valid' });
        else if (data.reason === 'already_unsubscribed') setState({ kind: 'already' });
        else setState({ kind: 'invalid', message: data.error || 'Link inválido ou expirado.' });
      } catch {
        setState({ kind: 'invalid', message: 'Não foi possível validar o link.' });
      }
    };
    validate();
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setState({ kind: 'submitting' });
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });
      if (error) throw error;
      if ((data as any)?.success) setState({ kind: 'success' });
      else if ((data as any)?.reason === 'already_unsubscribed') setState({ kind: 'already' });
      else setState({ kind: 'error', message: (data as any)?.error || 'Falha ao processar.' });
    } catch (err: any) {
      setState({ kind: 'error', message: err?.message || 'Falha ao processar.' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full p-8 border-2 border-foreground shadow-[6px_6px_0_hsl(var(--foreground))]">
        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-foreground">
            <Mail className="h-7 w-7 text-primary" />
          </div>
        </div>

        {state.kind === 'loading' && (
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Validando link...</p>
          </div>
        )}

        {state.kind === 'valid' && (
          <div className="text-center">
            <h1 className="text-xl font-bold mb-2">Cancelar inscrição de emails?</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Você não receberá mais emails da SinapseRH neste endereço.
            </p>
            <Button onClick={handleConfirm} className="w-full" size="lg">
              Confirmar cancelamento
            </Button>
          </div>
        )}

        {state.kind === 'submitting' && (
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Processando...</p>
          </div>
        )}

        {state.kind === 'success' && (
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
            <h1 className="text-xl font-bold mb-2">Inscrição cancelada</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Você não receberá mais nossos emails.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </div>
        )}

        {state.kind === 'already' && (
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h1 className="text-xl font-bold mb-2">Já cancelado</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Este endereço já foi removido da nossa lista.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </div>
        )}

        {(state.kind === 'invalid' || state.kind === 'error') && (
          <div className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
            <h1 className="text-xl font-bold mb-2">Não foi possível processar</h1>
            <p className="text-sm text-muted-foreground mb-6">{state.message}</p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
