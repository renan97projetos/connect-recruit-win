import { useState, useEffect, useRef } from 'react';
import { CompanyLayout } from '@/components/CompanyLayout';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, User, Building2, Save, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlanSection } from '@/components/company/PlanSection';

const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  company_name: z.string().optional(),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type ImageKind = 'avatar' | 'logo';

export default function CompanyProfile() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  // Arquivos selecionados aguardando "Salvar"
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [pendingAvatarPreview, setPendingAvatarPreview] = useState<string | null>(null);
  const [pendingLogoPreview, setPendingLogoPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      company_name: '',
      cnpj: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
    },
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const [{ data: profile, error: profileErr }, { data: tenant }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user?.id).maybeSingle(),
        supabase
          .from('tenants')
          .select('company_name, cnpj, company_email, company_phone, notes')
          .eq('company_id', user?.id)
          .maybeSingle(),
      ]);

      if (profileErr) throw profileErr;

      const parseNote = (key: string) => {
        if (!tenant?.notes) return '';
        const m = tenant.notes.split('|').map((p) => p.trim()).find((p) => p.toLowerCase().startsWith(`${key.toLowerCase()}:`));
        return m ? m.split(':').slice(1).join(':').trim() : '';
      };

      form.reset({
        name: profile?.name || tenant?.company_name || '',
        company_name: tenant?.company_name || profile?.company_name || '',
        cnpj: tenant?.cnpj || profile?.cnpj || '',
        phone: tenant?.company_phone || profile?.phone || '',
        address: profile?.address || parseNote('Endereço') || '',
        city: profile?.city || parseNote('Cidade') || '',
        state: profile?.state || parseNote('UF') || '',
        zip_code: profile?.zip_code || '',
      });
      const profileAny = profile as any;
      setCompanyLogoUrl(profileAny?.company_logo_url ?? null);
      // Compatibilidade: se ainda não existe foto do usuário separada, mantém avatar_url existente como avatar do usuário
      setAvatarUrl(profile?.avatar_url ?? null);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o perfil',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      const notes = [
        data.address && `Endereço: ${data.address}`,
        data.city && `Cidade: ${data.city}`,
        data.state && `UF: ${data.state}`,
      ].filter(Boolean).join(' | ');

      await supabase
        .from('tenants')
        .update({
          company_name: data.company_name || data.name,
          cnpj: data.cnpj || null,
          company_phone: data.phone || null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('company_id', user?.id);

      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado com sucesso',
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectImage = (
    event: React.ChangeEvent<HTMLInputElement>,
    kind: ImageKind,
  ) => {
    const file = event.target.files?.[0];
    // limpar valor para permitir reselecionar o mesmo arquivo
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Erro', description: 'Por favor, selecione uma imagem', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Erro', description: 'A imagem deve ter no máximo 2MB', variant: 'destructive' });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (kind === 'avatar') {
      if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
      setPendingAvatar(file);
      setPendingAvatarPreview(previewUrl);
    } else {
      if (pendingLogoPreview) URL.revokeObjectURL(pendingLogoPreview);
      setPendingLogo(file);
      setPendingLogoPreview(previewUrl);
    }
  };

  const cancelPending = (kind: ImageKind) => {
    if (kind === 'avatar') {
      if (pendingAvatarPreview) URL.revokeObjectURL(pendingAvatarPreview);
      setPendingAvatar(null);
      setPendingAvatarPreview(null);
    } else {
      if (pendingLogoPreview) URL.revokeObjectURL(pendingLogoPreview);
      setPendingLogo(null);
      setPendingLogoPreview(null);
    }
  };

  const saveImage = async (kind: ImageKind) => {
    const file = kind === 'avatar' ? pendingAvatar : pendingLogo;
    if (!file) return;
    try {
      const setUploading = kind === 'avatar' ? setUploadingAvatar : setUploadingLogo;
      const currentUrl = kind === 'avatar' ? avatarUrl : companyLogoUrl;
      const baseName = kind === 'avatar' ? 'avatar' : 'logo';
      const dbField = kind === 'avatar' ? 'avatar_url' : 'company_logo_url';

      setUploading(true);

      if (currentUrl) {
        try {
          const cleanUrl = currentUrl.split('?')[0];
          const oldPath = cleanUrl.split('/').slice(-2).join('/');
          await supabase.storage.from('avatars').remove([oldPath]);
        } catch {/* ignore */}
      }

      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `${user?.id}/${baseName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, cacheControl: '3600' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      const finalUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [dbField]: finalUrl } as any)
        .eq('id', user?.id);
      if (updateError) throw updateError;

      if (kind === 'avatar') setAvatarUrl(finalUrl);
      else setCompanyLogoUrl(finalUrl);

      // Notificar outros componentes (ex: TopNav) imediatamente
      window.dispatchEvent(
        new CustomEvent('profile-image-updated', { detail: { kind, url: finalUrl } })
      );

      cancelPending(kind);
      toast({
        title: 'Salvo',
        description: kind === 'avatar' ? 'Foto de perfil atualizada' : 'Logo da empresa atualizada',
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a imagem',
        variant: 'destructive',
      });
    } finally {
      if (kind === 'avatar') setUploadingAvatar(false);
      else setUploadingLogo(false);
    }
  };

  return (
    <CompanyLayout title="Configurações da Conta" description="Gerencie suas informações de perfil">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Foto do usuário */}
          <Card>
            <CardHeader>
              <CardTitle>Foto do Usuário</CardTitle>
              <CardDescription>Sua foto pessoal exibida no perfil</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={pendingAvatarPreview || avatarUrl || undefined} alt="Foto do usuário" />
                <AvatarFallback>
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {pendingAvatar ? 'Trocar' : 'Carregar Foto'}
                  </Button>
                  {pendingAvatar && (
                    <>
                      <Button
                        type="button"
                        variant="default"
                        disabled={uploadingAvatar}
                        onClick={() => saveImage('avatar')}
                      >
                        {uploadingAvatar ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                        ) : (
                          <><Save className="mr-2 h-4 w-4" /> Salvar</>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={uploadingAvatar}
                        onClick={() => cancelPending('avatar')}
                      >
                        <X className="mr-2 h-4 w-4" /> Cancelar
                      </Button>
                    </>
                  )}
                </div>
                <Input
                  ref={avatarInputRef}
                  id="user-avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleSelectImage(e, 'avatar')}
                  disabled={uploadingAvatar}
                />
                <p className="text-sm text-muted-foreground">JPG, PNG ou GIF. Máx 2MB.</p>
              </div>
            </CardContent>
          </Card>

          {/* Logo da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle>Logo da Empresa</CardTitle>
              <CardDescription>Identidade visual exibida no header e Career Page</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <Avatar className="h-24 w-24 rounded-md">
                <AvatarImage src={pendingLogoPreview || companyLogoUrl || undefined} alt="Logo da empresa" className="object-contain" />
                <AvatarFallback className="rounded-md">
                  <Building2 className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {pendingLogo ? 'Trocar' : 'Carregar Logo'}
                  </Button>
                  {pendingLogo && (
                    <>
                      <Button
                        type="button"
                        variant="default"
                        disabled={uploadingLogo}
                        onClick={() => saveImage('logo')}
                      >
                        {uploadingLogo ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                        ) : (
                          <><Save className="mr-2 h-4 w-4" /> Salvar</>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={uploadingLogo}
                        onClick={() => cancelPending('logo')}
                      >
                        <X className="mr-2 h-4 w-4" /> Cancelar
                      </Button>
                    </>
                  )}
                </div>
                <Input
                  ref={logoInputRef}
                  id="company-logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleSelectImage(e, 'logo')}
                  disabled={uploadingLogo}
                />
                <p className="text-sm text-muted-foreground">JPG, PNG ou SVG. Máx 2MB.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações da Empresa</CardTitle>
            <CardDescription>Atualize os dados da sua empresa</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Empresa</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="00.000.000/0000-00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(00) 00000-0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ES" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="zip_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="00000-000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <PlanSection />

        <Card>
          <CardHeader>
            <CardTitle>Informações da Conta</CardTitle>
            <CardDescription>Detalhes de autenticação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <Label>E-mail</Label>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CompanyLayout>
  );
}
