import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyHeader } from '@/components/CompanyHeader';
import { Briefcase, Users, ArrowRight, BarChart3, Settings, Check, Circle, Lock } from 'lucide-react';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { usePlanType } from '@/hooks/usePlanType';
import { Button } from '@/components/ui/button';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { checkOnboardingStatus, type OnboardingStatus } from '@/lib/onboarding';

export default function CompanyHub() {
  const navigate = useNavigate();
  const { isOwner, loading: roleLoading } = useCompanyRole();
  const { isPro } = usePlanType();
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
    <div className="min-h-screen bg-[#f8f8f6] app-internal">
      <CompanyHeader showHubLink={false} />

      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3">Bem-vindo</h1>
            <p className="text-lg text-gray-500">
              Escolha por onde quer começar
            </p>
          </div>

          {/* Onboarding checklist */}
          {onboarding && !onboarding.isComplete && (
            <div className="mb-10 bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-1">Configure sua conta</h2>
                  <p className="text-sm text-gray-500">
                    Complete os passos abaixo para começar
                  </p>
                </div>
                <div className="bg-primary/10 text-primary rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap">
                  {doneCount}/{checklist.length}
                </div>
              </div>

              <ul className="space-y-2">
                {checklist.map((item, i) => (
                  <li key={i}>
                    <button
                      onClick={() => navigate(item.href)}
                      className="w-full flex items-center gap-3 text-left bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center ${
                          item.done ? 'bg-green-100 border-green-400' : 'bg-green-50 border-gray-300'
                        }`}
                      >
                        {item.done ? (
                          <Check className="h-3.5 w-3.5 text-green-700" strokeWidth={3} />
                        ) : (
                          <Circle className="h-2 w-2 text-gray-400" />
                        )}
                      </div>
                      <span
                        className={`text-sm font-medium flex-1 ${
                          item.done ? 'line-through text-gray-400' : 'text-gray-700'
                        }`}
                      >
                        {item.label}
                      </span>
                      {!item.done && <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-400" />}
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
              className="group text-left bg-white border border-gray-200 rounded-2xl p-8 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Briefcase className="h-8 w-8 text-primary" />
                </div>
                <ArrowRight className="h-8 w-8 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">Recrutamento e Seleção</h2>
              <p className="text-gray-500 text-sm mb-6">
                Solicitações, processo seletivo, banco de talentos e dashboard de recrutamento.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-md flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" /> Dashboard
                </span>
                <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                  Solicitações
                </span>
                <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                  Banco de Talentos
                </span>
              </div>
            </button>

            {/* Gestão RH Interna - apenas para owner; bloqueado no plano Starter */}
            {!roleLoading && isOwner && (
              <button
                onClick={() => navigate(isPro ? '/company/employee-dashboard' : '/company/profile')}
                className={`group relative text-left bg-white border border-gray-200 rounded-2xl p-8 transition-all ${
                  isPro ? 'hover:border-primary/40 hover:shadow-md' : 'hover:border-violet-300'
                }`}
              >
                {!isPro && (
                  <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-violet-100 text-violet-600 rounded">
                    <Lock className="h-3 w-3" /> PRO
                  </span>
                )}
                <div className="flex items-start justify-between mb-6">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${isPro ? 'bg-primary/10' : 'bg-gray-100'}`}>
                    <Users className={`h-8 w-8 ${isPro ? 'text-primary' : 'text-gray-400'}`} />
                  </div>
                  {isPro && <ArrowRight className="h-8 w-8 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </div>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">Gestão RH Interna</h2>
                <p className="text-gray-500 text-sm mb-6">
                  {isPro
                    ? 'Colaboradores, avaliações de desempenho, treinamentos e solicitações internas.'
                    : 'Disponível no plano Pro. Faça upgrade para acessar colaboradores, avaliações e mais.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                    Colaboradores
                  </span>
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                    Avaliações
                  </span>
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
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
