import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, MessageCircle } from 'lucide-react';

export default function SystemSettings() {
  const [contactEmail, setContactEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('contact_email, whatsapp_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setContactEmail(data.contact_email);
        setWhatsappNumber(data.whatsapp_number || '');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Check if there's an existing setting
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .limit(1)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('system_settings')
          .update({
            contact_email: contactEmail,
            whatsapp_number: whatsappNumber,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('system_settings')
          .insert({
            contact_email: contactEmail,
            whatsapp_number: whatsappNumber,
            updated_by: user.id,
          });

        if (error) throw error;
      }

      toast({
        title: 'Configurações atualizadas',
        description: 'O email de contato foi atualizado com sucesso.',
      });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Ocorreu um erro ao atualizar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <DashboardLayout title="Configurações do Sistema">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Configurações do Sistema">
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Configurações do Sistema</h1>
            <p className="text-muted-foreground">
              Gerencie as configurações gerais da plataforma
            </p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email de Contato
                </CardTitle>
                <CardDescription>
                  Este email receberá todas as solicitações enviadas pelo formulário de contato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="contato@suaempresa.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Certifique-se de que este email está ativo e é monitorado regularmente
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp de Contato
                </CardTitle>
                <CardDescription>
                  Configure o número do WhatsApp para o botão flutuante de atendimento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber">Número do WhatsApp</Label>
                  <Input
                    id="whatsappNumber"
                    type="text"
                    placeholder="5511999999999"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Digite apenas números, incluindo código do país e DDD (ex: 5511999999999)
                  </p>
                </div>
              </CardContent>
            </Card>

            <form onSubmit={handleSubmit}>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
