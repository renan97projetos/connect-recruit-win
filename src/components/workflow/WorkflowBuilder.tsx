import { useState } from 'react';
import { WorkflowStageData } from '@/types';
import { StageCard } from './StageCard';
import { StageEditModal } from './StageEditModal';
import { Button } from '@/components/ui/button';
import { Plus, Save, ArrowRight } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface WorkflowBuilderProps {
  stages: WorkflowStageData[];
  onStagesChange: (stages: WorkflowStageData[]) => void;
  onSave?: () => void;
  readonly?: boolean;
}

export function WorkflowBuilder({ stages, onStagesChange, onSave, readonly = false }: WorkflowBuilderProps) {
  const [editingStage, setEditingStage] = useState<WorkflowStageData | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(stages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order_position for all stages
    const updatedStages = items.map((item, index) => ({
      ...item,
      order_position: index + 1,
    }));

    onStagesChange(updatedStages);
  };

  const handleAddStage = () => {
    setEditingStage(undefined);
    setIsModalOpen(true);
  };

  const handleEditStage = (stage: WorkflowStageData) => {
    setEditingStage(stage);
    setIsModalOpen(true);
  };

  const handleSaveStage = (stageData: Partial<WorkflowStageData>) => {
    if (editingStage) {
      // Update existing stage
      const updatedStages = stages.map((s) =>
        s.id === editingStage.id ? { ...s, ...stageData } : s
      );
      onStagesChange(updatedStages);
    } else {
      // Add new stage
      const newStage: WorkflowStageData = {
        id: `temp-${Date.now()}`, // Temporary ID, will be replaced by backend
        workflow_id: '', // Will be set when saving workflow
        name: stageData.name || '',
        stage_type: stageData.stage_type || 'screening',
        order_position: stages.length + 1,
        description: stageData.description,
        is_required: stageData.is_required ?? true,
        automation_config: stageData.automation_config || {},
        stage_config: stageData.stage_config || {},
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      onStagesChange([...stages, newStage]);
    }
  };

  const handleDeleteStage = (stageId: string) => {
    const updatedStages = stages
      .filter((s) => s.id !== stageId)
      .map((s, index) => ({ ...s, order_position: index + 1 }));
    onStagesChange(updatedStages);
  };

  const handleDuplicateStage = (stage: WorkflowStageData) => {
    const duplicatedStage: WorkflowStageData = {
      ...stage,
      id: `temp-${Date.now()}`,
      name: `${stage.name} (Cópia)`,
      order_position: stages.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onStagesChange([...stages, duplicatedStage]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Etapas do Processo Seletivo</h3>
          <p className="text-sm text-muted-foreground">
            Configure o fluxo que os candidatos seguirão nesta vaga
          </p>
        </div>
        {!readonly && (
          <div className="flex gap-2">
            <Button onClick={handleAddStage} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Etapa
            </Button>
            {onSave && (
              <Button onClick={onSave} size="sm" variant="default">
                <Save className="mr-2 h-4 w-4" />
                Salvar Workflow
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Workflow Pipeline */}
      {stages.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Nenhuma etapa configurada ainda
          </p>
          {!readonly && (
            <Button onClick={handleAddStage} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Etapa
            </Button>
          )}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="workflow-stages" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-4 overflow-x-auto pb-4"
              >
                {stages
                  .sort((a, b) => a.order_position - b.order_position)
                  .map((stage, index) => (
                    <div key={stage.id} className="flex items-center gap-4">
                      <Draggable
                        draggableId={stage.id}
                        index={index}
                        isDragDisabled={readonly}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <StageCard
                              stage={stage}
                              onEdit={() => handleEditStage(stage)}
                              onDelete={() => handleDeleteStage(stage.id)}
                              onDuplicate={() => handleDuplicateStage(stage)}
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                      {index < stages.length - 1 && (
                        <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Edit Modal */}
      <StageEditModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveStage}
        stage={editingStage}
      />
    </div>
  );
}