import { WorkflowTemplateData, WorkflowStageData } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, Code, Briefcase } from 'lucide-react';

const DEFAULT_TEMPLATES: Omit<WorkflowTemplateData, 'id' | 'company_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Processo Completo',
    description: 'Workflow completo com todas as etapas recomendadas',
    is_public: true,
    template_data: {
      stages: [
        {
          name: 'Triagem de Currículos',
          stage_type: 'screening',
          order_position: 1,
          description: 'Análise inicial dos currículos recebidos',
          is_required: true,
          automation_config: {},
          stage_config: {},
          is_active: true,
        },
        {
          name: 'Entrevista com RH',
          stage_type: 'hr_interview',
          order_position: 2,
          description: 'Primeira entrevista para conhecer o candidato',
          is_required: true,
          automation_config: {
            email_notifications: { on_enter: true },
          },
          stage_config: {},
          is_active: true,
        },
        {
          name: 'Teste Técnico',
          stage_type: 'practical_test',
          order_position: 3,
          description: 'Avaliação técnica prática',
          is_required: true,
          automation_config: {},
          stage_config: {},
          is_active: true,
        },
        {
          name: 'Entrevista Técnica',
          stage_type: 'technical_interview',
          order_position: 4,
          description: 'Entrevista com time técnico',
          is_required: true,
          automation_config: {},
          stage_config: {},
          is_active: true,
        },
        {
          name: 'Avaliação Cultural',
          stage_type: 'cultural_fit',
          order_position: 5,
          description: 'Verificação de fit com a cultura da empresa',
          is_required: false,
          automation_config: {},
          stage_config: {},
          is_active: true,
        },
        {
          name: 'Aprovação Final',
          stage_type: 'final_approval',
          order_position: 6,
          description: 'Decisão final de contratação',
          is_required: true,
          automation_config: {},
          stage_config: {},
          is_active: true,
        },
      ],
    },
  },
  {
    name: 'Processo Rápido',
    description: 'Workflow simplificado para contratações ágeis',
    is_public: true,
    template_data: {
      stages: [
        {
          name: 'Triagem Inicial',
          stage_type: 'screening',
          order_position: 1,
          description: 'Análise rápida do perfil',
          is_required: true,
          automation_config: {
            auto_reject: { enabled: true, days: 3 },
          },
          stage_config: {},
          is_active: true,
        },
        {
          name: 'Entrevista Única',
          stage_type: 'hr_interview',
          order_position: 2,
          description: 'Entrevista consolidada',
          is_required: true,
          automation_config: {},
          stage_config: {},
          is_active: true,
        },
        {
          name: 'Decisão',
          stage_type: 'final_approval',
          order_position: 3,
          description: 'Aprovação da contratação',
          is_required: true,
          automation_config: {
            auto_move: true,
          },
          stage_config: {},
          is_active: true,
        },
      ],
    },
  },
  {
    name: 'Tech & Engineering',
    description: 'Otimizado para vagas de tecnologia e engenharia',
    is_public: true,
    template_data: {
      stages: [
        {
          name: 'Análise de Portfólio',
          stage_type: 'screening',
          order_position: 1,
          description: 'Revisão de portfólio e projetos anteriores',
          is_required: true,
          automation_config: {},
          stage_config: {},
          is_active: true,
        },
        {
          name: 'Desafio de Código',
          stage_type: 'automated_test',
          order_position: 2,
          description: 'Teste automatizado de programação',
          is_required: true,
          automation_config: {
            auto_reject: { enabled: true, days: 5 },
          },
          stage_config: { min_score: 70 },
          is_active: true,
        },
        {
          name: 'Code Review',
          stage_type: 'technical_interview',
          order_position: 3,
          description: 'Revisão do código e discussão técnica',
          is_required: true,
          automation_config: {},
          stage_config: {},
          is_active: true,
        },
        {
          name: 'Entrevista com Time',
          stage_type: 'hr_interview',
          order_position: 4,
          description: 'Conversa com futuros colegas de equipe',
          is_required: true,
          automation_config: {},
          stage_config: {},
          is_active: true,
        },
        {
          name: 'Aprovação Final',
          stage_type: 'final_approval',
          order_position: 5,
          description: 'Decisão de contratação',
          is_required: true,
          automation_config: {},
          stage_config: {},
          is_active: true,
        },
      ],
    },
  },
  {
    name: 'Comercial & Vendas',
    description: 'Focado em posições comerciais e de vendas',
    is_public: true,
    template_data: {
      stages: [
        {
          name: 'Triagem de Perfil',
          stage_type: 'screening',
          order_position: 1,
          description: 'Análise de experiência em vendas',
          is_required: true,
          automation_config: {},
          stage_config: {},
          is_active: true,
        },
        {
          name: 'Entrevista RH',
          stage_type: 'hr_interview',
          order_position: 2,
          description: 'Avaliação comportamental',
          is_required: true,
          automation_config: {},
          stage_config: {},
          is_active: true,
        },
        {
          name: 'Role Play de Vendas',
          stage_type: 'practical_test',
          order_position: 3,
          description: 'Simulação de situação de venda',
          is_required: true,
          automation_config: {},
          stage_config: {},
          is_active: true,
        },
        {
          name: 'Entrevista com Gestor',
          stage_type: 'manager_validation',
          order_position: 4,
          description: 'Avaliação do gestor comercial',
          is_required: true,
          automation_config: {},
          stage_config: {},
          is_active: true,
        },
        {
          name: 'Aprovação',
          stage_type: 'final_approval',
          order_position: 5,
          description: 'Decisão final',
          is_required: true,
          automation_config: {},
          stage_config: {},
          is_active: true,
        },
      ],
    },
  },
];

const TEMPLATE_ICONS: Record<string, any> = {
  'Processo Completo': FileText,
  'Processo Rápido': Users,
  'Tech & Engineering': Code,
  'Comercial & Vendas': Briefcase,
};

interface WorkflowTemplatesProps {
  onSelectTemplate: (stages: Omit<WorkflowStageData, 'id' | 'workflow_id' | 'created_at' | 'updated_at'>[]) => void;
}

export function WorkflowTemplates({ onSelectTemplate }: WorkflowTemplatesProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Templates de Workflow</h3>
        <p className="text-sm text-muted-foreground">
          Comece rapidamente com um template predefinido
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {DEFAULT_TEMPLATES.map((template) => {
          const Icon = TEMPLATE_ICONS[template.name] || FileText;
          
          return (
            <Card key={template.name} className="hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {template.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">
                    {template.template_data.stages.length} etapas
                  </Badge>
                  {template.template_data.stages.some((s) => s.automation_config.auto_move) && (
                    <Badge variant="outline" className="text-xs">
                      Auto-movimentação
                    </Badge>
                  )}
                  {template.template_data.stages.some((s) => s.automation_config.auto_reject?.enabled) && (
                    <Badge variant="outline" className="text-xs">
                      Auto-reprovação
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={() => onSelectTemplate(template.template_data.stages)}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  Usar Template
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}