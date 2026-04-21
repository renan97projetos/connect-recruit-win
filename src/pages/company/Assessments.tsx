import { useState, useEffect } from 'react';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Clock, CheckCircle, ExternalLink, Trash2, AlertTriangle } from 'lucide-react';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ProFeatureGate } from '@/components/ProFeatureGate';

export default function Assessments() {
  const { isOwner, loading: roleLoading } = useCompanyRole();
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', test_url: '' });

  const load = async () => {
    if (!user?.id) return;
    setLoadingData(true);
    const { data } = await (supabase as any)
      .from('assessments')
      .select('*')
      .eq('company_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    setAssessments(data || []);
    setLoadingData(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const handleSave = async () => {
    if (!form.title.trim() || !user?.id) return;
    setSaving(true);
    const { error } = await (supabase as any).from('assessments').insert({
      company_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      test_url: form.test_url.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Avaliação criada!' });
    setDialogOpen(false);
    setForm({ title: '', description: '', test_url: '' });
    load();
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from('assessments').update({ status: 'archived' }).eq('id', id);
    toast({ title: 'Avaliação removida' });
    load();
  };

  if (roleLoading) {
    return (
      <CompanyLayout area="hr">
        <div className="text-center py-4">Verificando permissões...</div>
      </CompanyLayout>
    );
  }

  if (!isOwner) {
    return (
      <CompanyLayout area="hr">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar este recurso. Apenas o gestor da empresa pode gerenciar testes e avaliações.
          </AlertDescription>
        </Alert>
      </CompanyLayout>
    );
  }

  const total = assessments.length;
  const ativas = assessments.filter((a) => a.status === 'active').length;

  return (
    <CompanyLayout area="hr">
      <ProFeatureGate featureName="Testes e Avaliações">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Testes e Avaliações</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie testes e avaliações para seus processos seletivos
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Avaliação
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
              <p className="text-xs text-muted-foreground">cadastradas no sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ativas</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ativas}</div>
              <p className="text-xs text-muted-foreground">disponíveis para uso</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com link externo</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assessments.filter((a) => !!a.test_url).length}</div>
              <p className="text-xs text-muted-foreground">conectadas a teste online</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Suas Avaliações</CardTitle>
            <CardDescription>Lista de todas as avaliações cadastradas</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
            ) : assessments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma avaliação cadastrada ainda</p>
                <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar primeira avaliação
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {assessments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-md border bg-card hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{a.title}</div>
                      {a.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description}</div>
                      )}
                      {a.test_url && (
                        <div className="text-[11px] text-muted-foreground mt-1 truncate">{a.test_url}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {a.test_url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(a.test_url, '_blank', 'noopener,noreferrer')}
                          title="Abrir teste"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(a.id)}
                        title="Remover"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Nova avaliação</DialogTitle>
            <DialogDescription className="text-xs">
              Cadastre um teste ou avaliação para usar nos processos seletivos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Teste de lógica"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="mt-1 resize-none"
                placeholder="Sobre o que é a avaliação..."
              />
            </div>
            <div>
              <Label className="text-xs">Link do teste</Label>
              <Input
                value={form.test_url}
                onChange={(e) => setForm((f) => ({ ...f, test_url: e.target.value }))}
                placeholder="https://forms.google.com/..."
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !form.title.trim()}>
              {saving ? 'Salvando...' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </ProFeatureGate>
    </CompanyLayout>
  );
}
