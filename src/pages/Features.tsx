import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Briefcase,
  Users,
  BarChart3,
  Brain,
  Shield,
  Mail,
  Workflow,
  Building2,
  FileCheck,
  Calendar,
  MessageSquare,
  Sparkles,
  Globe,
  Clock,
  Star,
  CheckCircle2,
  X,
} from 'lucide-react';

interface Feature {
  title: string;
  description: string;
  starter: boolean;
  pro: boolean;
}

interface Category {
  icon: typeof Briefcase;
  title: string;
  bg: string;
  features: Feature[];
}

const categories: Category[] = [
  {
    icon: Briefcase,
    title: 'Recrutamento & Seleção',
    bg: 'bg-yellow',
    features: [
      { title: 'Publicação de vagas', description: 'Publique vagas em segundos com formulário guiado.', starter: true, pro: true },
      { title: 'Pipeline Kanban', description: 'Acompanhe candidatos arrastando entre etapas.', starter: true, pro: true },
      { title: 'Career page pública', description: 'Página de carreiras com slug próprio para divulgar.', starter: true, pro: true },
      { title: 'Career page personalizada', description: 'Personalize cores, descrição e identidade visual.', starter: false, pro: true },
      { title: 'Workflow configurável por vaga', description: 'Crie etapas, automações e responsáveis customizados.', starter: false, pro: true },
      { title: 'Triagem com perguntas eliminatórias', description: 'Defina perguntas obrigatórias por vaga.', starter: true, pro: true },
      { title: 'Requisição de vaga com aprovação', description: 'Fluxo de aprovação multinível antes da publicação.', starter: false, pro: true },
    ],
  },
  {
    icon: Users,
    title: 'Gestão de Candidatos',
    bg: 'bg-cyan',
    features: [
      { title: 'Banco de candidatos', description: 'Todos os perfis centralizados com filtros avançados.', starter: true, pro: true },
      { title: 'Score e notas', description: 'Avaliações qualitativas e quantitativas por candidato.', starter: true, pro: true },
      { title: 'Histórico por etapa', description: 'Veja a jornada completa de cada candidato.', starter: true, pro: true },
      { title: 'Banco de talentos', description: 'Reaproveite candidatos qualificados em novas vagas.', starter: false, pro: true },
      { title: 'Favoritos e tags', description: 'Marque candidatos estratégicos para acompanhar.', starter: true, pro: true },
      { title: 'Carta-proposta digital', description: 'Envie e acompanhe ofertas de contratação.', starter: false, pro: true },
    ],
  },
  {
    icon: Brain,
    title: 'Inteligência Artificial',
    bg: 'bg-lime',
    features: [
      { title: 'IA para descrição de vagas', description: 'Gere descrições profissionais a partir do cargo.', starter: false, pro: true },
      { title: 'Score automático de candidatos', description: 'IA calcula aderência do perfil à vaga.', starter: false, pro: true },
      { title: 'Jarvis Analista de RH', description: 'Assistente IA com briefing diário e insights proativos.', starter: false, pro: true },
      { title: 'Sugestões de próxima ação', description: 'Recomendações inteligentes do que fazer agora.', starter: false, pro: true },
      { title: 'Command Bar (Cmd+K)', description: 'Busca global e ações rápidas via teclado.', starter: false, pro: true },
    ],
  },
  {
    icon: Building2,
    title: 'Gestão de Colaboradores',
    bg: 'bg-pink',
    features: [
      { title: 'Cadastro completo de colaboradores', description: 'Dados pessoais, contratuais e de jornada.', starter: true, pro: true },
      { title: 'Controle de férias e licenças', description: 'Gerencie períodos aquisitivos e concessivos.', starter: true, pro: true },
      { title: 'Ocorrências e advertências', description: 'Registre eventos disciplinares com histórico.', starter: true, pro: true },
      { title: 'Avaliações de desempenho', description: 'Aplique ciclos de avaliação e PDI.', starter: false, pro: true },
      { title: 'Treinamentos e certificações', description: 'Controle capacitações e validades.', starter: false, pro: true },
      { title: 'Histórico de movimentações', description: 'Promoções, transferências e mudanças salariais.', starter: false, pro: true },
      { title: 'Solicitações de colaboradores', description: 'Workflow para férias, troca de turno, etc.', starter: false, pro: true },
    ],
  },
  {
    icon: BarChart3,
    title: 'Dashboards & Analytics',
    bg: 'bg-secondary',
    features: [
      { title: 'Dashboard básico', description: 'Visão geral de vagas ativas e candidatos.', starter: true, pro: true },
      { title: 'Métricas em tempo real', description: 'Acompanhamento ao vivo dos indicadores-chave.', starter: true, pro: true },
      { title: 'Analytics completo', description: 'Funil de conversão, tempo por etapa e origem.', starter: false, pro: true },
      { title: 'Relatório por e-mail', description: 'Receba resumos automáticos no seu e-mail.', starter: false, pro: true },
      { title: 'Briefing matinal automático', description: 'Resumo do dia ao abrir o sistema (via Jarvis).', starter: false, pro: true },
    ],
  },
  {
    icon: Workflow,
    title: 'Automação & Comunicação',
    bg: 'bg-primary text-primary-foreground',
    features: [
      { title: 'E-mails de status automáticos', description: 'Candidatos recebem updates a cada mudança.', starter: true, pro: true },
      { title: 'Templates de e-mail customizáveis', description: 'Crie modelos por etapa do processo.', starter: false, pro: true },
      { title: 'Automações por etapa', description: 'Dispare ações ao mover candidatos no pipeline.', starter: false, pro: true },
      { title: 'Envio de documentos de admissão', description: 'Solicite documentos e acompanhe entregas.', starter: false, pro: true },
      { title: 'Convites de entrevista', description: 'Agende e envie links automaticamente.', starter: true, pro: true },
    ],
  },
  {
    icon: Shield,
    title: 'Segurança & Permissões',
    bg: 'bg-yellow',
    features: [
      { title: 'Multi-usuário', description: 'Convide membros do time para colaborar.', starter: true, pro: true },
      { title: 'Permissões granulares', description: 'Controle quem pode ver, criar, editar e aprovar.', starter: false, pro: true },
      { title: 'Logs de auditoria', description: 'Registro completo de todas as ações no sistema.', starter: false, pro: true },
      { title: 'Aprovação multinível', description: 'Fluxo de aprovação configurável.', starter: false, pro: true },
      { title: 'Conformidade LGPD', description: 'Tratamento de dados conforme legislação brasileira.', starter: true, pro: true },
    ],
  },
  {
    icon: Sparkles,
    title: 'Suporte & Onboarding',
    bg: 'bg-cyan',
    features: [
      { title: 'Tour guiado no primeiro acesso', description: 'Aprenda o sistema com tour interativo.', starter: true, pro: true },
      { title: 'Botão de ajuda contextual', description: 'Reative tutoriais a qualquer momento.', starter: true, pro: true },
      { title: 'Suporte por e-mail', description: 'Time de suporte responde em até 48h.', starter: true, pro: true },
      { title: 'Suporte prioritário', description: 'Atendimento em até 4h em horário comercial.', starter: false, pro: true },
      { title: 'Onboarding personalizado', description: 'Treinamento dedicado para sua equipe.', starter: false, pro: true },
    ],
  },
];

export default function Features() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="border-b-3 border-foreground bg-yellow py-16">
        <div className="container mx-auto px-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold mb-6 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Voltar para a home
          </Link>
          <div className="max-w-3xl">
            <Badge className="bg-foreground text-background border-2 border-foreground mb-4">
              FUNCIONALIDADES COMPLETAS
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">
              Tudo que você pode fazer com o SinapseRH
            </h1>
            <p className="text-lg md:text-xl font-medium opacity-80">
              Compare recursos por categoria e veja o que cada plano entrega.
              Sem letra miúda, sem surpresa.
            </p>
          </div>
        </div>
      </section>

      {/* Plans legend */}
      <section className="border-b-3 border-foreground bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded-full bg-muted border-2 border-foreground" />
              <span className="font-bold">STARTER</span>
              <span className="text-muted-foreground">— organizando o RH</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded-full bg-primary border-2 border-foreground" />
              <span className="font-bold">PRO</span>
              <span className="text-muted-foreground">— automação, IA e gestão completa</span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-12">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.title}
                  className="border-3 border-foreground rounded-2xl overflow-hidden shadow-brutal-lg bg-background"
                >
                  {/* Header */}
                  <div className={`${cat.bg} border-b-3 border-foreground p-6 flex items-center gap-4`}>
                    <div className="bg-background border-3 border-foreground rounded-xl p-3 shadow-brutal">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black">{cat.title}</h2>
                      <p className="text-sm opacity-80 font-medium">
                        {cat.features.length} recursos disponíveis
                      </p>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="divide-y-2 divide-foreground/10">
                    {/* Header row */}
                    <div className="grid grid-cols-[1fr_100px_100px] md:grid-cols-[1fr_140px_140px] gap-2 px-4 md:px-6 py-3 bg-muted text-xs font-black uppercase tracking-wide">
                      <div>Recurso</div>
                      <div className="text-center">Starter</div>
                      <div className="text-center">Pro</div>
                    </div>

                    {cat.features.map((f) => (
                      <div
                        key={f.title}
                        className="grid grid-cols-[1fr_100px_100px] md:grid-cols-[1fr_140px_140px] gap-2 px-4 md:px-6 py-4 items-center hover:bg-muted/40 transition-colors"
                      >
                        <div>
                          <div className="font-bold text-sm md:text-base">{f.title}</div>
                          <div className="text-xs md:text-sm text-muted-foreground mt-0.5">
                            {f.description}
                          </div>
                        </div>
                        <div className="flex justify-center">
                          {f.starter ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="flex justify-center">
                          {f.pro ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground/40" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-foreground text-background py-16 border-t-3 border-foreground">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            Pronto para transformar seu RH?
          </h2>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-3 border-background font-bold bg-transparent text-background hover:bg-background hover:text-foreground"
            >
              <a
                href="https://wa.me/5527998119863?text=Ol%C3%A1%2C%20tenho%20interesse%20no%20SinapseRH"
                target="_blank"
                rel="noopener noreferrer"
              >
                Falar com vendas
              </a>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
