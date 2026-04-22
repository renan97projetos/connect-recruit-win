import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Sparkles, Compass, Zap, BookOpen, ArrowRight } from 'lucide-react';

export function WelcomeModal() {
  const { showWelcome, closeWelcome, startFullTour, startTour } = useOnboarding();

  const handleQuick = () => {
    closeWelcome(true);
    setTimeout(() => startTour('dashboard'), 300);
  };

  const handleFull = () => {
    closeWelcome(true);
    setTimeout(() => startFullTour(), 300);
  };

  const handleSkip = () => closeWelcome(true);

  return (
    <Dialog open={showWelcome} onOpenChange={(open) => !open && closeWelcome(true)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Bem-vindo à SinapseRH</span>
          </div>
          <DialogTitle className="text-2xl">
            Vamos te mostrar como tudo funciona
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Escolha como prefere conhecer o sistema. Você pode refazer o tour a qualquer momento clicando no
            botão <span className="font-semibold text-foreground">?</span> no topo da tela.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 mt-2">
          <button
            onClick={handleQuick}
            className="text-left p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <Zap className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Rápido • ~1 min
              </span>
            </div>
            <h3 className="text-lg font-semibold mb-1.5 group-hover:text-primary transition-colors">
              Visão Geral
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Tour rápido pelo Dashboard mostrando os principais menus e onde encontrar cada coisa.
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              Começar <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>

          <button
            onClick={handleFull}
            className="text-left p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all group"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-violet-100 text-violet-700">
                <Compass className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Detalhado • ~5 min
              </span>
            </div>
            <h3 className="text-lg font-semibold mb-1.5 group-hover:text-primary transition-colors">
              Tour Completo
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Passamos por cada tela: Vagas, Requisições, Banco de Talentos, Colaboradores e mais.
            </p>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              Começar <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t mt-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            Você pode pular agora e iniciar depois pelo botão de ajuda.
          </span>
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Pular por agora
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
