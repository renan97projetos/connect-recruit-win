import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, Save, ShieldCheck } from 'lucide-react';

interface CompanyMember {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
}

export function ApprovalSettingsCard() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [approverId, setApproverId] = useState<string>('');
  const [deadlineDays, setDeadlineDays] = useState<string>('3');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [{ data: tenant }, { data: companyMembers }] = await Promise.all([
        supabase
          .from('tenants')
          .select('default_approver_id, default_approval_deadline_days')
          .eq('company_id', user.id)
          .maybeSingle(),
        supabase
          .from('company_users')
          .select('id, user_id, name, email')
          .eq('company_id', user.id)
          .eq('status', 'ativo'),
      ]);

      // adicionar o owner também
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .maybeSingle();

      const all: CompanyMember[] = [
        {
          id: user.id,
          user_id: user.id,
          name: `${ownerProfile?.name || 'Você'} (Owner)`,
          email: user.email || '',
        },
        ...(companyMembers || [])
          .filter((m: any) => m.user_id && m.user_id !== user.id)
          .map((m: any) => ({ id: m.user_id, user_id: m.user_id, name: m.name, email: m.email })),
      ];

      setMembers(all);
      setApproverId((tenant as any)?.default_approver_id || '');
      setDeadlineDays(String((tenant as any)?.default_approval_deadline_days ?? 3));
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('tenants')
      .update({
        default_approver_id: approverId || null,
        default_approval_deadline_days: deadlineDays ? parseInt(deadlineDays, 10) : null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('company_id', user.id);

    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Configuração salva', description: 'Aprovador padrão atualizado.' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Aprovação de Vagas
        </CardTitle>
        <CardDescription>
          Defina quem aprova as vagas que exigem aprovação antes da publicação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="approver">Aprovador padrão</Label>
              <Select value={approverId || 'none'} onValueChange={(v) => setApproverId(v === 'none' ? '' : v)}>
                <SelectTrigger id="approver">
                  <SelectValue placeholder="Selecione um aprovador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhum (sem aprovação)</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} — {m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Esta pessoa receberá um e-mail e a notificação no sistema.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deadline">Prazo de resposta (dias)</Label>
              <Input
                id="deadline"
                type="number"
                min={1}
                max={30}
                value={deadlineDays}
                onChange={(e) => setDeadlineDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Após o prazo, a vaga aparece marcada como vencida.
              </p>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
