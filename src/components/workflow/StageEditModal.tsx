import { useState, useEffect } from 'react';
import { WorkflowStageData, WorkflowStageType } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const STAGE_TYPES: { value: WorkflowStageType; label: string; description: string }[] = [
  { value: 'screening', label: 'Triagem Inicial', description: 'Avaliação manual e filtros básicos' },
  { value: 'hr_interview', label: 'Entrevista RH', description: 'Entrevista com time de RH' },
  { value: 'technical_interview', label: 'Entrevista Técnica', description: 'Avaliação técnica da candidatura' },
  { value: 'practical_test', label: 'Teste Prático/Case', description: 'Teste prático ou estudo de caso' },
  { value: 'automated_test', label: 'Teste Automatizado', description: 'Teste online automatizado' },
  { value: 'cultural_fit', label: 'Fit Cultural', description: 'Avaliação de fit com a cultura' },
  { value: 'manager_validation', label: 'Validação do Gestor', description: 'Aprovação do gestor direto' },
  { value: 'documentation', label: 'Documentação', description: 'Coleta de documentos pré-admissão' },
  { value: 'final_approval', label: 'Aprovação Final', description: 'Última aprovação antes da contratação' },
];

interface StageEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (stage: Partial<WorkflowStageData>) => void;
  stage?: WorkflowStageData;
}

export function StageEditModal({ open, onClose, onSave, stage }: StageEditModalProps) {
  const [formData, setFormData] = useState<Partial<WorkflowStageData>>({
    name: '',
    stage_type: 'screening',
    description: '',
    is_required: true,
    automation_config: {},
    stage_config: {},
  });

  useEffect(() => {
    if (stage) {
      setFormData(stage);
    } else {
      setFormData({
        name: '',
        stage_type: 'screening',
        description: '',
        is_required: true,
        automation_config: {},
        stage_config: {},
      });
    }
  }, [stage, open]);

  const handleSubmit = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{stage ? 'Editar Etapa' : 'Nova Etapa'}</DialogTitle>
          <DialogDescription>
            Configure os detalhes da etapa do processo seletivo
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Básico</TabsTrigger>
            <TabsTrigger value="config">Configurações</TabsTrigger>
            <TabsTrigger value="automation">Automação</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stage_type">Tipo de Etapa *</Label>
              <Select
                value={formData.stage_type}
                onValueChange={(value: WorkflowStageType) =>
                  setFormData({ ...formData, stage_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {STAGE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="text-sm">{type.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome da Etapa *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Entrevista com CTO"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o objetivo desta etapa"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_required"
                checked={formData.is_required}
                onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
              />
              <Label htmlFor="is_required">Etapa obrigatória</Label>
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            {(formData.stage_type === 'hr_interview' || formData.stage_type === 'technical_interview') && (
              <div className="space-y-2">
                <Label htmlFor="meeting_link">Link de Reunião</Label>
                <Input
                  id="meeting_link"
                  value={formData.stage_config?.meeting_link || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stage_config: { ...formData.stage_config, meeting_link: e.target.value },
                    })
                  }
                  placeholder="https://meet.google.com/..."
                />
              </div>
            )}

            {(formData.stage_type === 'practical_test' || formData.stage_type === 'automated_test') && (
              <div className="space-y-2">
                <Label htmlFor="test_url">URL do Teste</Label>
                <Input
                  id="test_url"
                  value={formData.stage_config?.test_url || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stage_config: { ...formData.stage_config, test_url: e.target.value },
                    })
                  }
                  placeholder="https://..."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="min_score">Pontuação Mínima</Label>
              <Input
                id="min_score"
                type="number"
                value={formData.stage_config?.min_score || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    stage_config: { ...formData.stage_config, min_score: parseFloat(e.target.value) },
                  })
                }
                placeholder="0-100"
              />
            </div>
          </TabsContent>

          <TabsContent value="automation" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="auto_move"
                checked={formData.automation_config?.auto_move || false}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    automation_config: { ...formData.automation_config, auto_move: checked },
                  })
                }
              />
              <Label htmlFor="auto_move">Mover automaticamente para próxima etapa ao concluir</Label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto_reject_enabled"
                  checked={formData.automation_config?.auto_reject?.enabled || false}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      automation_config: {
                        ...formData.automation_config,
                        auto_reject: { ...formData.automation_config?.auto_reject, enabled: checked },
                      },
                    })
                  }
                />
                <Label htmlFor="auto_reject_enabled">Reprovação automática</Label>
              </div>

              {formData.automation_config?.auto_reject?.enabled && (
                <div className="ml-6 space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="auto_reject_days" className="text-sm">
                      Reprovar após (dias sem resposta)
                    </Label>
                    <Input
                      id="auto_reject_days"
                      type="number"
                      value={formData.automation_config?.auto_reject?.days || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          automation_config: {
                            ...formData.automation_config,
                            auto_reject: {
                              ...formData.automation_config?.auto_reject,
                              days: parseInt(e.target.value),
                            },
                          },
                        })
                      }
                      placeholder="7"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notificações por E-mail</Label>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="email_on_enter"
                  checked={formData.automation_config?.email_notifications?.on_enter || false}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      automation_config: {
                        ...formData.automation_config,
                        email_notifications: {
                          ...formData.automation_config?.email_notifications,
                          on_enter: checked,
                        },
                      },
                    })
                  }
                />
                <Label htmlFor="email_on_enter" className="text-sm font-normal">
                  Ao entrar na etapa
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="email_on_approve"
                  checked={formData.automation_config?.email_notifications?.on_approve || false}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      automation_config: {
                        ...formData.automation_config,
                        email_notifications: {
                          ...formData.automation_config?.email_notifications,
                          on_approve: checked,
                        },
                      },
                    })
                  }
                />
                <Label htmlFor="email_on_approve" className="text-sm font-normal">
                  Ao ser aprovado
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="email_on_reject"
                  checked={formData.automation_config?.email_notifications?.on_reject || false}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      automation_config: {
                        ...formData.automation_config,
                        email_notifications: {
                          ...formData.automation_config?.email_notifications,
                          on_reject: checked,
                        },
                      },
                    })
                  }
                />
                <Label htmlFor="email_on_reject" className="text-sm font-normal">
                  Ao ser reprovado
                </Label>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <Label className="text-sm font-medium">Mensagem WhatsApp automática</Label>
              <p className="text-xs text-muted-foreground">
                Abre o WhatsApp do candidato ao mover para esta etapa.
                Variáveis: {"{{candidato_nome}}"}, {"{{vaga_titulo}}"}
              </p>
              <div className="flex items-center space-x-2">
                <Switch
                  id="whatsapp_enabled"
                  checked={formData.automation_config?.whatsapp_enabled || false}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      automation_config: {
                        ...formData.automation_config,
                        whatsapp_enabled: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="whatsapp_enabled">Ativar mensagem automática</Label>
              </div>
              {formData.automation_config?.whatsapp_enabled && (
                <Textarea
                  rows={3}
                  placeholder="Olá {{candidato_nome}}, você avançou no processo para {{vaga_titulo}}. Em breve entraremos em contato!"
                  value={formData.automation_config?.whatsapp_message || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      automation_config: {
                        ...formData.automation_config,
                        whatsapp_message: e.target.value,
                      },
                    })
                  }
                  className="resize-none text-sm"
                />
              )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.name || !formData.stage_type}>
            {stage ? 'Salvar Alterações' : 'Criar Etapa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}