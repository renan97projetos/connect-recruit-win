import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Loader2, Sparkles } from 'lucide-react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OpenOptions {
  featureName?: string;
}

interface UpgradeModalContextValue {
  openUpgradeModal: (opts?: OpenOptions) => void;
  closeUpgradeModal: () => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextValue | null>(null);

export function useUpgradeModal() {
  const ctx = useContext(UpgradeModalContext);
  if (!ctx) throw new Error('useUpgradeModal must be used within UpgradeModalProvider');
  return ctx;
}

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [featureName, setFeatureName] = useState<string | undefined>();
  const [requesting, setRequesting] = useState(false);

  const openUpgradeModal = useCallback((opts?: OpenOptions) => {
    setFeatureName(opts?.featureName);
    setOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => setOpen(false), []);

  const confirmUpgrade = async () => {
    if (!user) return;
    try {
      setRequesting(true);
      await supabase.from('leads').insert({
        name: user.user_metadata?.name || user.email || 'Empresa',
        email: user.email!,
        message: `Solicitação de upgrade para o plano Pro${featureName ? ` (origem: ${featureName})` : ''}.`,
        source: 'plan_upgrade_request',
        status: 'new',
      });
      toast({
        title: 'Solicitação enviada',
        description: 'Nossa equipe entrará em contato em breve para concluir o upgrade.',
      });
      setOpen(false);
    } catch (e: any) {
      toast({
        title: 'Erro ao solicitar upgrade',
        description: e?.message ?? 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setRequesting(false);
    }
  };

  return (
    <UpgradeModalContext.Provider value={{ openUpgradeModal, closeUpgradeModal }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">
              {featureName ? `${featureName} é um recurso Pro` : 'Faça upgrade para o plano Pro'}
            </DialogTitle>
            <DialogDescription className="text-center">
              Desbloqueie todos os recursos avançados da plataforma.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-lg flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                Plano Pro
              </h4>
              <Badge variant="outline" className="text-xs">Recomendado</Badge>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                Gestão RH Interna completa
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                Banco de talentos & IA
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                Templates de e-mail e Career Page
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                Avaliações e Audit log completo
              </li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Ao confirmar, nossa equipe entrará em contato pelo seu e-mail cadastrado para finalizar
            a contratação.
          </p>

          <DialogFooter className="sm:justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={requesting}
              className="border border-border shadow-none normal-case font-medium tracking-normal hover:translate-x-0 hover:translate-y-0 hover:shadow-none active:shadow-none"
            >
              Agora não
            </Button>
            <Button
              onClick={confirmUpgrade}
              disabled={requesting}
              className="border border-primary shadow-none normal-case font-medium tracking-normal hover:translate-x-0 hover:translate-y-0 hover:shadow-none active:shadow-none"
            >
              {requesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
              Solicitar upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UpgradeModalContext.Provider>
  );
}
