import { useState, useEffect } from 'react';
import { CompanyLayout } from '@/components/CompanyLayout';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Mail, Pencil, Trash2, Plus, Loader2 } from 'lucide-react';

const STAGE_OPTIONS = [
  { value: 'none', label: 'Sem vínculo (manual)' },
  { value: 'in-review', label: 'Em análise' },
  { value: 'interview', label: 'Entrevista' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'rejected', label: 'Reprovado' },
];

const STAGE_LABEL: Record<string, string> = {
  'in-review': 'Em análise',
  interview: 'Entrevista',
  approved: 'Aprovado',
  rejected: 'Reprovado',
};

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  stage_trigger: string | null;
  created_at: string;
}

export default function EmailTemplates() {
  const { user } = useSupabaseAuth();
  const { isOwner, loading: roleLoading } = useCompanyRole();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    subject: '',
    body: '',
    stage_trigger: 'none',
  });

  const load = async () => {
    if (!user?.id) return;
    setLoadingData(true);
    const { data } = await supabase
      .from('email_templates' as any)
      .select('*')
      .eq('company_id', user.id)
      .order('created_at', { ascending: false });
    setTemplates((data as any) || []);
    setLoadingData(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', subject: '', body: '', stage_trigger: 'none' });
    setDialogOpen(true);
  };

  const openEdit = (t: EmailTemplate) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      subject: t.subject,
      body: t.body,
      stage_trigger: t.stage_trigger || 'none',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim() || !user?.id) return;
    setSaving(true);
    const payload = {
      company_id: user.id,
      name: form.name.trim(),
      subject: form.subject.trim(),
      body: form.body.trim(),
      stage_trigger: form.stage_trigger === 'none' ? null : form.stage_trigger,
    };
    const { error } = editingId
      ? await supabase.from('email_templates' as any).update(payload).eq('id', editingId)
      : await supabase.from('email_templates' as any).insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editingId ? 'Template atualizado!' : 'Template criado!' });
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('email_templates' as any).delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    } else {
      toast({ title: 'Template excluído' });
      load();
    }
    setDeleteId(null);
  };

  if (roleLoading) {
    return (
      <CompanyLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </CompanyLayout>
    );
  }

  if (!isOwner) {
    return (
      <CompanyLayout>
        <div className="max-w-2xl mx-auto p-6 text-center text-muted-foreground">
          Apenas administradores podem gerenciar templates de e-mail.
        </div>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Templates de E-mail</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Personalize as mensagens enviadas aos candidatos em cada etapa do funil
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Novo template
          </Button>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : templates.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg py-16 text-center">
            <Mail className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Nenhum template criado ainda.
            </p>
            <Button onClick={openNew} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro template
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="border border-border rounded-lg p-4 bg-card hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{t.name}</h3>
                      {t.stage_trigger && (
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                          {STAGE_LABEL[t.stage_trigger] || t.stage_trigger}
                        </span>
                      )}
                      {!t.stage_trigger && (
                        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          Manual
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      <span className="font-medium">Assunto:</span> {t.subject}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(t.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar template' : 'Novo template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="tpl-name">Nome do template *</Label>
              <Input
                id="tpl-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Convite para entrevista"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Etapa que dispara este template</Label>
              <Select
                value={form.stage_trigger}
                onValueChange={(v) => setForm((p) => ({ ...p, stage_trigger: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tpl-subject">Assunto *</Label>
              <Input
                id="tpl-subject"
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Ex: Próxima etapa para a vaga {{vaga_titulo}}"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="tpl-body">Corpo do e-mail *</Label>
              <Textarea
                id="tpl-body"
                value={form.body}
                onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                placeholder="Olá {{candidato_nome}}, temos novidades sobre a vaga {{vaga_titulo}} na {{empresa_nome}}..."
                rows={8}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Variáveis disponíveis:{' '}
                <code className="text-foreground">{'{{candidato_nome}}'}</code>{' '}
                <code className="text-foreground">{'{{vaga_titulo}}'}</code>{' '}
                <code className="text-foreground">{'{{empresa_nome}}'}</code>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving || !form.name.trim() || !form.subject.trim() || !form.body.trim()
              }
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : editingId ? (
                'Salvar alterações'
              ) : (
                'Criar template'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O template será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CompanyLayout>
  );
}
