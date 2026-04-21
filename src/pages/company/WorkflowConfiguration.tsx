import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { WorkflowBuilder } from '@/components/workflow/WorkflowBuilder';
import { WorkflowTemplates } from '@/components/workflow/WorkflowTemplates';
import { WorkflowStageData } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProFeatureGate } from '@/components/ProFeatureGate';

export default function WorkflowConfiguration() {
  const { id } = useParams(); // job_id
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stages, setStages] = useState<WorkflowStageData[]>([]);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState('');

  const isEditing = !!id && !!workflowId;
  const returnUrl = searchParams.get('return') || '/company/dashboard';

  useEffect(() => {
    if (id) {
      loadWorkflow();
    }
  }, [id]);

  const loadWorkflow = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Load job info
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('title')
        .eq('id', id)
        .single();

      if (jobError) throw jobError;
      if (job) setJobTitle(job.title);

      // Load existing workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .select('*')
        .eq('job_id', id)
        .eq('status', 'active')
        .maybeSingle();

      if (workflowError) throw workflowError;

      if (workflow) {
        setWorkflowId(workflow.id);

        // Load stages
        const { data: stagesData, error: stagesError } = await supabase
          .from('workflow_stages')
          .select('*')
          .eq('workflow_id', workflow.id)
          .eq('is_active', true)
          .order('order_position');

        if (stagesError) throw stagesError;
        if (stagesData) {
          setStages(stagesData as WorkflowStageData[]);
        }
      }
    } catch (error: any) {
      console.error('Error loading workflow:', error);
      toast({
        title: 'Erro ao carregar workflow',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (templateStages: Omit<WorkflowStageData, 'id' | 'workflow_id' | 'created_at' | 'updated_at'>[]) => {
    const newStages: WorkflowStageData[] = templateStages.map((stage, index) => ({
      ...stage,
      id: `temp-${Date.now()}-${index}`,
      workflow_id: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    setStages(newStages);
    toast({
      title: 'Template aplicado',
      description: 'Você pode ajustar as etapas conforme necessário',
    });
  };

  const handleSaveWorkflow = async () => {
    if (!user || !id) return;

    if (stages.length === 0) {
      toast({
        title: 'Adicione etapas',
        description: 'O workflow precisa ter pelo menos uma etapa',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      let currentWorkflowId = workflowId;

      // Create or get workflow
      if (!currentWorkflowId) {
        const { data: newWorkflow, error: workflowError } = await supabase
          .from('workflows')
          .insert({
            job_id: id,
            company_id: user.id,
            status: 'active',
          })
          .select()
          .single();

        if (workflowError) throw workflowError;
        currentWorkflowId = newWorkflow.id;
        setWorkflowId(currentWorkflowId);
      }

      // Delete existing stages if editing
      if (isEditing) {
        const { error: deleteError } = await supabase
          .from('workflow_stages')
          .delete()
          .eq('workflow_id', currentWorkflowId);

        if (deleteError) throw deleteError;
      }

      // Insert new stages
      const stagesToInsert = stages.map((stage) => ({
        workflow_id: currentWorkflowId,
        name: stage.name,
        stage_type: stage.stage_type,
        order_position: stage.order_position,
        responsible_id: stage.responsible_id,
        description: stage.description,
        is_required: stage.is_required,
        automation_config: stage.automation_config,
        stage_config: stage.stage_config,
        is_active: true,
      }));

      const { error: insertError } = await supabase
        .from('workflow_stages')
        .insert(stagesToInsert);

      if (insertError) throw insertError;

      toast({
        title: 'Workflow salvo!',
        description: 'As etapas do processo foram configuradas com sucesso',
      });

      // Navigate back
      navigate(returnUrl);
    } catch (error: any) {
      console.error('Error saving workflow:', error);
      toast({
        title: 'Erro ao salvar workflow',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <CompanyLayout title="Carregando...">
        <div className="text-center py-12">Carregando configuração do workflow...</div>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout
      title={isEditing ? 'Editar Workflow' : 'Configurar Workflow'}
      description={jobTitle ? `Vaga: ${jobTitle}` : 'Configure as etapas do processo seletivo'}
    >
      <ProFeatureGate featureName="Workflow Configurável">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(returnUrl)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <Button onClick={handleSaveWorkflow} disabled={saving || stages.length === 0}>
            {saving ? (
              'Salvando...'
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar e Concluir
              </>
            )}
          </Button>
        </div>

        {stages.length === 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Configure o fluxo de etapas que os candidatos seguirão nesta vaga. Você pode começar
              com um template ou criar do zero.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="builder" className="w-full">
          <TabsList>
            <TabsTrigger value="builder">Construtor de Workflow</TabsTrigger>
            {stages.length === 0 && <TabsTrigger value="templates">Templates</TabsTrigger>}
          </TabsList>

          <TabsContent value="builder" className="space-y-6">
            <WorkflowBuilder
              stages={stages}
              onStagesChange={setStages}
              onSave={handleSaveWorkflow}
            />
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <WorkflowTemplates onSelectTemplate={handleSelectTemplate} />
          </TabsContent>
        </Tabs>
      </div>
      </ProFeatureGate>
    </CompanyLayout>
  );
}