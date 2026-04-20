import { useNavigate } from 'react-router-dom';
import { CompanyHeader } from '@/components/CompanyHeader';
import { Briefcase, Users, ArrowRight, BarChart3, Settings } from 'lucide-react';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { Button } from '@/components/ui/button';

export default function CompanyHub() {
  const navigate = useNavigate();
  const { isOwner, loading: roleLoading } = useCompanyRole();

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
              <h2 className="text-2xl md:text-3xl font-black mb-2">Gestão de Vagas</h2>
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
