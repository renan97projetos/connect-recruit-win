import { AlertCircle, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { usePlanLimits } from '@/hooks/usePlanLimits';

interface PlanLimitBannerProps {
  resource: 'jobs' | 'users' | 'employees';
  className?: string;
}

const LABELS: Record<PlanLimitBannerProps['resource'], { single: string; plural: string }> = {
  jobs: { single: 'vaga', plural: 'vagas' },
  users: { single: 'usuário interno', plural: 'usuários internos' },
  employees: { single: 'colaborador', plural: 'colaboradores' },
};

export function PlanLimitBanner({ resource, className }: PlanLimitBannerProps) {
  const { limits, usage, loading, canCreate, isUnlimited } = usePlanLimits();

  if (loading || !limits) return null;

  const max =
    resource === 'jobs' ? limits.maxJobs :
    resource === 'users' ? limits.maxUsers :
    limits.maxEmployees;

  if (isUnlimited(max)) return null;

  const used = usage[resource];
  const reached = !canCreate(resource);
  const remaining = Math.max(0, max - used);
  const labels = LABELS[resource];

  return (
    <Alert variant={reached ? 'destructive' : 'default'} className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        Plano {limits.planName}: {used} de {max} {labels.plural}
      </AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>
          {reached
            ? `Você atingiu o limite de ${labels.plural} do seu plano. Faça upgrade para continuar.`
            : `Você ainda pode adicionar ${remaining} ${remaining === 1 ? labels.single : labels.plural}.`}
        </span>
        {reached && (
          <Button asChild size="sm" variant="outline">
            <Link to="/company/profile">
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Ver planos
            </Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
