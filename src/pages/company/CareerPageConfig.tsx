import { useState, useEffect } from 'react';
import { CompanyLayout } from '@/components/CompanyLayout';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Copy, ExternalLink } from 'lucide-react';

export default function CareerPageConfig() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    slug: '',
    custom_title: '',
    custom_description: '',
    primary_color: '#7c3aed',
    is_active: true,
  });
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (supabase as any)
      .from('career_pages')
      .select('*')
      .eq('company_id', user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setExistingId(data.id);
          setForm({
            slug: data.slug,
            custom_title: data.custom_title || '',
            custom_description: data.custom_description || '',
            primary_color: data.primary_color || '#7c3aed',
            is_active: data.is_active,
          });
        }
        setLoading(false);
      });
  }, [user?.id]);

  const pageUrl = `${window.location.origin}/careers/${form.slug}`;

  const handleSave = async () => {
    if (!form.slug.trim() || !user?.id) return;
    setSaving(true);
    const payload = {
      company_id: user.id,
      slug: form.slug.trim().toLowerCase().replace(/\s+/g, '-'),
      custom_title: form.custom_title.trim() || null,
      custom_description: form.custom_description.trim() || null,
      primary_color: form.primary_color,
      is_active: form.is_active,
    };
    const { error, data } = existingId
      ? await (supabase as any).from('career_pages').update(payload).eq('id', existingId).select().maybeSingle()
      : await (supabase as any).from('career_pages').insert(payload).select().maybeSingle();
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    if (data?.id && !existingId) setExistingId(data.id);
    toast({ title: 'Career page salva!' });
  };

  if (loading) {
    return (
      <CompanyLayout>
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Career Page</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sua página pública de vagas com a identidade da sua empresa
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-5">
          <div>
            <Label className="text-xs text-gray-600">URL da página (slug) *</Label>
            <div className="flex items-center mt-1 rounded-md border border-input overflow-hidden">
              <span className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-r border-input">
                /careers/
              </span>
              <Input
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                placeholder="minha-empresa"
                className="border-0 rounded-none focus-visible:ring-0"
              />
            </div>
          </div>

          {form.slug && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md text-xs">
              <span className="flex-1 truncate text-gray-600">{pageUrl}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(pageUrl);
                  toast({ title: 'Link copiado!' });
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Copiar"
              >
                <Copy className="h-3.5 w-3.5 text-gray-600" />
              </button>
              <a
                href={pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Abrir"
              >
                <ExternalLink className="h-3.5 w-3.5 text-gray-600" />
              </a>
            </div>
          )}

          <div>
            <Label className="text-xs text-gray-600">Título personalizado</Label>
            <Input
              value={form.custom_title}
              onChange={(e) => setForm((p) => ({ ...p, custom_title: e.target.value }))}
              placeholder="Ex: Venha fazer parte do nosso time"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs text-gray-600">Descrição</Label>
            <Textarea
              value={form.custom_description}
              onChange={(e) => setForm((p) => ({ ...p, custom_description: e.target.value }))}
              rows={3}
              placeholder="Conte um pouco sobre sua empresa e cultura..."
              className="mt-1 resize-none"
            />
          </div>

          <div>
            <Label className="text-xs text-gray-600">Cor de destaque</Label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => setForm((p) => ({ ...p, primary_color: e.target.value }))}
                className="h-8 w-14 rounded border border-gray-200 cursor-pointer"
              />
              <span className="text-xs text-gray-500">{form.primary_color}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div>
              <Label className="text-xs text-gray-600">Página ativa</Label>
              <p className="text-[11px] text-gray-500 mt-0.5">Quando desativada, a URL retorna 404</p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
            />
          </div>

          <Button onClick={handleSave} disabled={!form.slug.trim() || saving} className="w-full">
            {saving ? 'Salvando...' : 'Salvar career page'}
          </Button>
        </div>
      </div>
    </CompanyLayout>
  );
}
