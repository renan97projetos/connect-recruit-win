import { useState, useEffect } from 'react';
import { CompanyLayout } from '@/components/CompanyLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
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
import { Plus, Pencil, Trash2, Upload, Loader2, GripVertical } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  photo_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
  order_position: number;
  is_active: boolean;
}

export default function TeamManagement() {
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    bio: '',
    linkedin_url: '',
    photo_url: '',
    is_active: true,
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('order_position', { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os membros da equipe.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (member?: TeamMember) => {
    if (member) {
      setSelectedMember(member);
      setFormData({
        name: member.name,
        role: member.role,
        bio: member.bio || '',
        linkedin_url: member.linkedin_url || '',
        photo_url: member.photo_url || '',
        is_active: member.is_active,
      });
    } else {
      setSelectedMember(null);
      setFormData({
        name: '',
        role: '',
        bio: '',
        linkedin_url: '',
        photo_url: '',
        is_active: true,
      });
    }
    setModalOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('team-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('team-photos')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, photo_url: publicUrl }));
      toast({
        title: 'Sucesso',
        description: 'Foto enviada com sucesso!',
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a foto.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.role) {
      toast({
        title: 'Erro',
        description: 'Nome e cargo são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (selectedMember) {
        const { error } = await supabase
          .from('team_members')
          .update({
            name: formData.name,
            role: formData.role,
            bio: formData.bio || null,
            linkedin_url: formData.linkedin_url || null,
            photo_url: formData.photo_url || null,
            is_active: formData.is_active,
          })
          .eq('id', selectedMember.id);

        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Membro atualizado com sucesso!',
        });
      } else {
        const maxPosition = members.length > 0 
          ? Math.max(...members.map(m => m.order_position)) + 1 
          : 0;

        const { error } = await supabase
          .from('team_members')
          .insert({
            name: formData.name,
            role: formData.role,
            bio: formData.bio || null,
            linkedin_url: formData.linkedin_url || null,
            photo_url: formData.photo_url || null,
            is_active: formData.is_active,
            order_position: maxPosition,
          });

        if (error) throw error;
        toast({
          title: 'Sucesso',
          description: 'Membro adicionado com sucesso!',
        });
      }

      setModalOpen(false);
      fetchMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o membro.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMember) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', selectedMember.id);

      if (error) throw error;
      
      toast({
        title: 'Sucesso',
        description: 'Membro removido com sucesso!',
      });
      
      setDeleteDialogOpen(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o membro.',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <CompanyLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Equipe</h1>
        <p className="text-muted-foreground">Gerencie os membros da equipe exibidos na página Sobre</p>
      </div>
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Membro
          </Button>
        </div>

        {members.length === 0 ? (
          <Card className="border border-dashed border-gray-300">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Nenhum membro cadastrado. Clique em "Adicionar Membro" para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <Card key={member.id} className={`border border-gray-200 shadow-sm ${!member.is_active ? 'opacity-50' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                      <Avatar className="h-12 w-12 border border-gray-200">
                        <AvatarImage src={member.photo_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenModal(member)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedMember(member);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-bold">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                  {!member.is_active && (
                    <span className="text-xs text-destructive">Inativo</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Adicionar/Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedMember ? 'Editar Membro' : 'Adicionar Membro'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Foto */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24 border-2 border-gray-200">
                <AvatarImage src={formData.photo_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {formData.name ? getInitials(formData.name) : '?'}
                </AvatarFallback>
              </Avatar>
              <Label htmlFor="photo-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? 'Enviando...' : 'Enviar foto'}
                </div>
                <Input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
              </Label>
            </div>

            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>

            {/* Cargo */}
            <div className="space-y-2">
              <Label htmlFor="role">Cargo *</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                placeholder="Ex: CEO, Desenvolvedor, Designer..."
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Biografia</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Breve descrição sobre o membro"
                rows={3}
              />
            </div>

            {/* LinkedIn */}
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                value={formData.linkedin_url}
                onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            {/* Ativo */}
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Ativo (visível na página Sobre)</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {selectedMember?.name} da equipe? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CompanyLayout>
  );
}
