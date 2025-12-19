import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { saveLead } from '@/lib/storage';
import { Lead } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cnpj: '',
    vacancyCount: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const lead: Lead = {
        id: uuidv4(),
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        cnpj: formData.cnpj || undefined,
        vacancyCount: formData.vacancyCount ? parseInt(formData.vacancyCount) : undefined,
        message: formData.message,
        source: 'form',
        status: 'new',
        createdAt: new Date().toISOString(),
        notes: [],
      };

      saveLead(lead);

      // Send email notification to admin
      const { supabase } = await import('@/integrations/supabase/client');
      const { error: emailError } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          cnpj: formData.cnpj,
          vacancyCount: formData.vacancyCount ? parseInt(formData.vacancyCount) : undefined,
          message: formData.message,
        },
      });

      if (emailError) {
        console.error('Error sending email:', emailError);
        toast({
          title: 'Solicitação registrada',
          description: 'Sua solicitação foi registrada, mas houve um problema ao enviar o email.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Solicitação enviada!',
          description: 'Nossa equipe entrará em contato em breve.',
        });
      }

      setFormData({
        name: '',
        email: '',
        phone: '',
        cnpj: '',
        vacancyCount: '',
        message: '',
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Erro ao enviar',
        description: 'Ocorreu um erro ao enviar sua solicitação. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Anunciar Vaga</h1>
            <p className="text-lg text-muted-foreground">
              Preencha o formulário e nossa equipe entrará em contato
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Informações de Contato</CardTitle>
              <CardDescription>
                Nos conte sobre sua empresa e necessidades
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome*</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email*</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone*</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(11) 98765-4321"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      placeholder="00.000.000/0000-00"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vacancyCount">Quantidade de Vagas</Label>
                  <Input
                    id="vacancyCount"
                    type="number"
                    min="1"
                    value={formData.vacancyCount}
                    onChange={(e) => setFormData({ ...formData, vacancyCount: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem*</Label>
                  <Textarea
                    id="message"
                    placeholder="Conte-nos sobre suas necessidades..."
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Enviando...' : 'Enviar Solicitação'}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link to="/">Cancelar</Link>
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
