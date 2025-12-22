import { useState, useEffect } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  Star, 
  Phone, 
  Mail, 
  Calendar,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Filter,
  MessageSquare,
  Video,
  Award,
  Target,
  ThumbsUp,
  ThumbsDown,
  Send,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Application {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  score: number | null;
  status: string;
  current_stage: string | null;
  applied_at: string;
  is_favorite: boolean | null;
  notes: any;
}

interface StagePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageId: string;
  stageTitle: string;
  itemId: string;
  itemType: 'request' | 'job';
  itemTitle: string;
  onRefresh: () => void;
}

// Helper para obter iniciais
const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// Componente para painel de Triagem (Screening)
function ScreeningPanel({ jobId, onRefresh }: { jobId: string; onRefresh: () => void }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'score' | 'date'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadApplications();
  }, [jobId]);

  const loadApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('job_id', jobId)
        .in('status', ['pending', 'screening']);

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error loading applications:', error);
      toast.error('Erro ao carregar candidatos');
    } finally {
      setLoading(false);
    }
  };

  const sortedApplications = [...applications].sort((a, b) => {
    if (sortBy === 'score') {
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
    } else {
      const dateA = new Date(a.applied_at).getTime();
      const dateB = new Date(b.applied_at).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    }
  });

  const toggleSort = (field: 'score' | 'date') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === applications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(applications.map(a => a.id));
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedIds.length === 0) {
      toast.error('Selecione pelo menos um candidato');
      return;
    }

    try {
      const newStatus = action === 'approve' ? 'interview' : 'rejected';
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus, current_stage: action === 'approve' ? 'interview' : null })
        .in('id', selectedIds);

      if (error) throw error;

      toast.success(`${selectedIds.length} candidato(s) ${action === 'approve' ? 'aprovado(s)' : 'reprovado(s)'}`);
      setSelectedIds([]);
      loadApplications();
      onRefresh();
    } catch (error) {
      console.error('Error updating applications:', error);
      toast.error('Erro ao atualizar candidatos');
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{applications.length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Score Médio</p>
                <p className="text-2xl font-bold">
                  {applications.length > 0 
                    ? Math.round(applications.reduce((acc, a) => acc + (a.score || 0), 0) / applications.length)
                    : 0}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Selecionados</p>
                <p className="text-2xl font-bold">{selectedIds.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações em Massa */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedIds.length} selecionado(s)</span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={() => handleBulkAction('approve')}>
            <ThumbsUp className="h-4 w-4 mr-2" />
            Aprovar
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleBulkAction('reject')}>
            <ThumbsDown className="h-4 w-4 mr-2" />
            Reprovar
          </Button>
        </div>
      )}

      {/* Tabela de Candidatos */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox 
                  checked={selectedIds.length === applications.length && applications.length > 0}
                  onCheckedChange={selectAll}
                />
              </TableHead>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Candidato</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => toggleSort('score')}
              >
                <div className="flex items-center gap-1">
                  Score
                  {sortBy === 'score' && (
                    sortOrder === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => toggleSort('date')}
              >
                <div className="flex items-center gap-1">
                  Data
                  {sortBy === 'date' && (
                    sortOrder === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedApplications.map((app, index) => (
              <TableRow key={app.id} className={selectedIds.includes(app.id) ? 'bg-muted/50' : ''}>
                <TableCell>
                  <Checkbox 
                    checked={selectedIds.includes(app.id)}
                    onCheckedChange={() => toggleSelect(app.id)}
                  />
                </TableCell>
                <TableCell className="font-medium text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{getInitials(app.candidate_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{app.candidate_name}</p>
                      <p className="text-xs text-muted-foreground">{app.candidate_email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${getScoreColor(app.score)}`}>
                      {app.score || 0}
                    </span>
                    <Progress value={app.score || 0} className="w-16 h-2" />
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(app.applied_at).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {applications.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum candidato nesta etapa
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Componente genérico para outras etapas
function GenericStagePanel({ stageId, stageTitle, jobId }: { stageId: string; stageTitle: string; jobId: string }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, [jobId, stageId]);

  const loadApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('job_id', jobId)
        .eq('current_stage', stageId);

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Candidatos em {stageTitle}</CardTitle>
          <CardDescription>{applications.length} candidato(s) nesta etapa</CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length > 0 ? (
            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(app.candidate_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{app.candidate_name}</p>
                    <p className="text-sm text-muted-foreground">{app.candidate_email}</p>
                  </div>
                  <Badge variant="outline">Score: {app.score || 0}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum candidato nesta etapa</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Painel para etapas de requisição
function RequestStagePanel({ stageId, itemId, itemTitle }: { stageId: string; itemId: string; itemTitle: string }) {
  const stageLabels: Record<string, { title: string; description: string }> = {
    draft: { title: 'Rascunho', description: 'A requisição está em elaboração. Preencha todos os campos necessários antes de enviar para aprovação.' },
    pending_approval: { title: 'Aguardando Aprovação', description: 'A requisição foi enviada e aguarda aprovação do gestor responsável.' },
    approved: { title: 'Aprovada', description: 'A requisição foi aprovada. Agora você pode iniciar a criação da descrição da vaga.' },
    in_creation: { title: 'Em Criação', description: 'A descrição da vaga está sendo elaborada. Complete todos os detalhes antes de enviar para revisão.' },
    pending_review: { title: 'Revisão Final', description: 'A vaga está pronta para revisão. Após aprovação, será publicada automaticamente.' },
  };

  const stageInfo = stageLabels[stageId] || { title: stageId, description: '' };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{stageInfo.title}</CardTitle>
          <CardDescription>{stageInfo.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg text-center">
            <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
            <p className="font-medium">{itemTitle}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Use o menu de ações para gerenciar esta requisição
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function StagePanel({ 
  open, 
  onOpenChange, 
  stageId, 
  stageTitle, 
  itemId, 
  itemType,
  itemTitle,
  onRefresh 
}: StagePanelProps) {
  const renderPanelContent = () => {
    // Painéis de requisição
    if (itemType === 'request') {
      return <RequestStagePanel stageId={stageId} itemId={itemId} itemTitle={itemTitle} />;
    }

    // Painéis de vagas publicadas
    switch (stageId) {
      case 'screening':
      case 'published':
        return <ScreeningPanel jobId={itemId} onRefresh={onRefresh} />;
      default:
        return <GenericStagePanel stageId={stageId} stageTitle={stageTitle} jobId={itemId} />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {stageTitle}
          </SheetTitle>
          <SheetDescription>
            {itemTitle}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          {renderPanelContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
