import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyHeader } from '@/components/CompanyHeader';
import { Briefcase, Users, ArrowRight, BarChart3, Settings, Check, Circle } from 'lucide-react';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { Button } from '@/components/ui/button';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { checkOnboardingStatus, type OnboardingStatus } from '@/lib/onboarding';

export default function CompanyHub() {
  const navigate = useNavigate();
  const { isOwner, loading: roleLoading } = useCompanyRole();
  const { user } = useSupabaseAuth();
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    checkOnboardingStatus(user.id).then(setOnboarding);
  }, [user?.id]);

  const checklist = onboarding
    ? [
        { done: onboarding.hasCompanyProfile, label: 'Preencher nome e dados da empresa', href: '/company/profile' },
        { done: onboarding.hasLogo, label: 'Adicionar logo da empresa', href: '/company/profile' },
        { done: onboarding.hasFirstJob, label: 'Criar primeira vaga', href: '/company/jobs/new' },
        { done: onboarding.hasWorkflow, label: 'Configurar workflow de um processo seletivo', href: '/company/dashboard' },
      ]
    : [];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="min-h-screen bg-background">
      <CompanyHeader showHubLink={false} />

      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black mb-3">Bem-vindo</h1>
            <p className="text-lg text-muted-foreground">
              Escolha por onde quer começar
            </p>
          </div>

          {/* Onboarding checklist */}
          {onboarding && !onboarding.isComplete && (
            <div className="mb-10 bg-yellow border-3 border-foreground rounded-2xl shadow-brutal-lg p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl md:text-2xl font-black mb-1">Configure sua conta</h2>
                  <p className="text-sm text-foreground/80 font-semibold">
                    Complete os passos abaixo para começar
                  </p>
                </div>
                <div className="bg-background border-3 border-foreground rounded-xl px-3 py-1.5 shadow-brutal text-sm font-black whitespace-nowrap">
                  {doneCount}/{checklist.length}
                </div>
              </div>

              <ul className="space-y-2">
                {checklist.map((item, i) => (
                  <li key={i}>
                    <button
                      onClick={() => navigate(item.href)}
                      className="w-full flex items-center gap-3 text-left bg-background border-2 border-foreground rounded-lg px-4 py-3 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal transition-all"
                    >
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 border-foreground flex items-center justify-center ${
                          item.done ? 'bg-lime' : 'bg-background'
                        }`}
                      >
                        {item.done ? (
                          <Check className="h-3.5 w-3.5 text-foreground" strokeWidth={3} />
                        ) : (
                          <Circle className="h-2 w-2 text-muted-foreground" />
                        )}
                      </div>
                      <span
                        className={`text-sm font-semibold flex-1 ${
                          item.done ? 'line-through text-muted-foreground' : ''
                        }`}
                      >
                        {item.label}
                      </span>
                      {!item.done && <ArrowRight className="h-4 w-4 flex-shrink-0" />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={`grid gap-6 ${!roleLoading && isOwner ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-xl mx-auto'}`}>
            {/* Gestão de Vagas */}
            <button
              onClick={() => navigate('/company/dashboard')}
              className="group text-left bg-lime border-3 border-foreground rounded-2xl shadow-brutal-lg p-8 hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-brutal-hover transition-all"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 bg-background rounded-xl border-3 border-foreground flex items-center justify-center shadow-brutal">
                  <Briefcase className="h-8 w-8 text-foreground" />
                </div>
                <ArrowRight className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black mb-2">Recrutamento e Seleção</h2>
              <p className="text-foreground/80 font-semibold mb-6">
                Solicitações, processo seletivo, banco de talentos e dashboard de recrutamento.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-bold uppercase tracking-wide bg-background/60 border-2 border-foreground px-2 py-1 rounded-lg flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" /> Dashboard
                </span>
                <span className="text-xs font-bold uppercase tracking-wide bg-background/60 border-2 border-foreground px-2 py-1 rounded-lg">
                  Solicitações
                </span>
                <span className="text-xs font-bold uppercase tracking-wide bg-background/60 border-2 border-foreground px-2 py-1 rounded-lg">
                  Banco de Talentos
                </span>
              </div>
            </button>

            {/* Gestão RH Interna - apenas para owner */}
            {!roleLoading && isOwner && (
              <button
                onClick={() => navigate('/company/employee-dashboard')}
                className="group text-left bg-cyan border-3 border-foreground rounded-2xl shadow-brutal-lg p-8 hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-brutal-hover transition-all"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 bg-background rounded-xl border-3 border-foreground flex items-center justify-center shadow-brutal">
                    <Users className="h-8 w-8 text-foreground" />
                  </div>
                  <ArrowRight className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h2 className="text-2xl md:text-3xl font-black mb-2">Gestão RH Interna</h2>
                <p className="text-foreground/80 font-semibold mb-6">
                  Colaboradores, avaliações de desempenho, treinamentos e solicitações internas.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide bg-background/60 border-2 border-foreground px-2 py-1 rounded-lg">
                    Colaboradores
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide bg-background/60 border-2 border-foreground px-2 py-1 rounded-lg">
                    Avaliações
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide bg-background/60 border-2 border-foreground px-2 py-1 rounded-lg">
                    Solicitações
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* Atalho para configurações */}
          <div className="mt-10 flex justify-center">
            <Button
              variant="outline"
              onClick={() => navigate('/company/profile')}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurações & Minha Conta
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
