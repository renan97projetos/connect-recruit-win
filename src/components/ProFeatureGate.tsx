import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { usePlanType } from '@/hooks/usePlanType';
import { cn } from '@/lib/utils';

interface ProFeatureGateProps {
  children: ReactNode;
  featureName?: string; // ex: "Banco de Talentos"
  className?: string;
  compact?: boolean; // se true, mostra só o cadeado sem texto (para usar em botões)
}

export function ProFeatureGate({
  children,
  featureName,
  className,
  compact = false,
}: ProFeatureGateProps) {
  const { isPro, loading } = usePlanType();

  if (loading) return <>{children}</>;
  if (isPro) return <>{children}</>;

  // Usuário Starter: renderiza o conteúdo com overlay de bloqueio
  return (
    <div className={cn('relative', className)}>
      {/* Conteúdo original com blur + interação desabilitada */}
      <div
        className="pointer-events-none select-none blur-sm opacity-60"
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Overlay de bloqueio */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px] rounded-xl">
        {compact ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background border border-border shadow-sm text-xs font-semibold text-foreground">
            <Lock className="h-3 w-3" />
            Pro
          </div>
        ) : (
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
            <a
              href="/company/profile"
              className="text-xs font-medium text-primary hover:underline mt-1"
            >
              Ver planos →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
