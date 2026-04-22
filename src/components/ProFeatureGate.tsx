import { ReactNode } from 'react';
import { Lock, Crown } from 'lucide-react';
import { usePlanType } from '@/hooks/usePlanType';
import { useUpgradeModal } from '@/contexts/UpgradeModalContext';
import { cn } from '@/lib/utils';

interface ProFeatureGateProps {
  children: ReactNode;
  featureName?: string; // ex: "Banco de Talentos"
  className?: string;
  compact?: boolean; // se true, mostra só o badge compacto (para usar em botões)
}

export function ProFeatureGate({
  children,
  featureName,
  className,
  compact = false,
}: ProFeatureGateProps) {
  const { isPro, loading } = usePlanType();
  const { openUpgradeModal } = useUpgradeModal();

  if (loading) return <>{children}</>;
  if (isPro) return <>{children}</>;

  const handleUpgrade = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openUpgradeModal({ featureName });
  };

  // Modo compact: pílula auto-contida (sem overlay sobre conteúdo) — evita
  // distorções de largura quando usada ao lado de labels/botões pequenos.
  if (compact) {
    return (
      <button
        type="button"
        onClick={handleUpgrade}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background border border-border shadow-sm text-xs font-semibold text-foreground hover:bg-muted transition-colors whitespace-nowrap',
          className,
        )}
        title={featureName ? `${featureName} — Disponível no plano Pro` : 'Disponível no plano Pro'}
      >
        <Lock className="h-3 w-3" />
        <span>{featureName ? `${featureName} • Pro` : 'Pro'}</span>
        <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
          <Crown className="h-2.5 w-2.5" />
          Upgrade
        </span>
      </button>
    );
  }

  // Modo padrão: overlay sobre o conteúdo bloqueado
  return (
    <div className={cn('relative', className)}>
      <div
        className="pointer-events-none select-none blur-sm opacity-60"
        aria-hidden="true"
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px] rounded-xl">
        <div className="flex flex-col items-center justify-center text-center gap-1 px-6 py-4 rounded-xl bg-background border border-border shadow-sm max-w-xs">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center mb-1">
            <Lock className="h-4 w-4 text-primary" />
          </div>
          {featureName && (
            <p className="text-sm font-semibold text-foreground">
              {featureName}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Disponível no plano Pro
          </p>
          <button
            type="button"
            onClick={handleUpgrade}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Crown className="h-3.5 w-3.5" />
            Fazer upgrade
          </button>
        </div>
      </div>
    </div>
  );
}
