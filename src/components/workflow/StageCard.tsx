import { WorkflowStageData, WorkflowStageType } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardList,
  MessageSquare,
  Code,
  FileText,
  Bot,
  Heart,
  CheckCircle,
  FileCheck,
  Shield,
  Edit,
  Trash2,
  GripVertical,
  Copy
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const STAGE_TYPE_CONFIG: Record<WorkflowStageType, { icon: any; label: string; color: string }> = {
  screening: { icon: ClipboardList, label: 'Triagem Inicial', color: 'bg-blue-500' },
  hr_interview: { icon: MessageSquare, label: 'Entrevista RH', color: 'bg-purple-500' },
  technical_interview: { icon: Code, label: 'Entrevista Técnica', color: 'bg-green-500' },
  practical_test: { icon: FileText, label: 'Teste Prático', color: 'bg-orange-500' },
  automated_test: { icon: Bot, label: 'Teste Automatizado', color: 'bg-cyan-500' },
  cultural_fit: { icon: Heart, label: 'Fit Cultural', color: 'bg-pink-500' },
  manager_validation: { icon: CheckCircle, label: 'Validação Gestor', color: 'bg-indigo-500' },
  documentation: { icon: FileCheck, label: 'Documentação', color: 'bg-yellow-500' },
  final_approval: { icon: Shield, label: 'Aprovação Final', color: 'bg-emerald-500' },
};

interface StageCardProps {
  stage: WorkflowStageData;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  isDragging?: boolean;
}

export function StageCard({ stage, onEdit, onDelete, onDuplicate, isDragging }: StageCardProps) {
  const config = STAGE_TYPE_CONFIG[stage.stage_type];
  const Icon = config.icon;

  return (
    <Card className={`relative p-4 min-w-[280px] transition-all ${isDragging ? 'opacity-50 rotate-2' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <div className={`p-2 rounded-lg ${config.color} bg-opacity-10 flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${config.color.replace('bg-', 'text-')}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{stage.name}</h4>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <span className="sr-only">Menu</span>
                  <Edit className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {stage.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {stage.description}
            </p>
          )}
          
          <div className="flex flex-wrap gap-1 mt-3">
            {stage.is_required && (
              <Badge variant="secondary" className="text-xs">Obrigatória</Badge>
            )}
            {stage.automation_config?.auto_move && (
              <Badge variant="outline" className="text-xs">Auto-mover</Badge>
            )}
            {stage.automation_config?.auto_reject?.enabled && (
              <Badge variant="outline" className="text-xs">Auto-reprovar</Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}