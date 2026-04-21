import { useEffect, useState } from 'react';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ContentManagement() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    about_content: `<h2>Sobre Nós</h2>
        
<p>Somos uma plataforma inovadora de gestão de recursos humanos que conecta empresas e talentos de forma eficiente e automatizada.</p>

<h3>Nossa Missão</h3>
<p>Transformar o processo de recrutamento e seleção, tornando-o mais ágil, inteligente e eficaz para empresas de todos os portes.</p>

<h3>Nossa Visão</h3>
<p>Ser a principal referência em tecnologia para gestão de RH, multiplicando a capacidade dos departamentos de recursos humanos através da automação e inteligência artificial.</p>

<h3>Nossos Valores</h3>
<ul>
  <li><strong>Inovação:</strong> Buscamos constantemente novas tecnologias e metodologias para melhorar nossos serviços</li>
  <li><strong>Eficiência:</strong> Reduzimos o tempo e os custos do processo de recrutamento</li>
  <li><strong>Transparência:</strong> Mantemos comunicação clara com empresas e candidatos</li>
  <li><strong>Excelência:</strong> Comprometemo-nos com a qualidade em cada etapa do processo</li>
</ul>

<h3>Por Que Nos Escolher?</h3>
<p>Com nossa plataforma, você pode:</p>
<ul>
  <li>Automatizar 90% das tarefas repetitivas de RH</li>
  <li>Reduzir o tempo de contratação em até 70%</li>
  <li>Acessar um pool de mais de 10.000 candidatos qualificados</li>
  <li>Gerenciar todo o processo seletivo em um único lugar</li>
</ul>`,
    privacy_policy_content: `<h2>Política de Privacidade</h2>
<p><em>Última atualização: ${new Date().toLocaleDateString('pt-BR')}</em></p>

<h3>1. Informações que Coletamos</h3>
<p>Coletamos informações que você nos fornece diretamente, incluindo:</p>
<ul>
  <li>Dados pessoais (nome, e-mail, telefone, CPF/CNPJ)</li>
  <li>Informações profissionais (currículo, experiências, formação)</li>
  <li>Dados de navegação e uso da plataforma</li>
</ul>

<h3>2. Como Usamos Suas Informações</h3>
<p>Utilizamos suas informações para:</p>
<ul>
  <li>Conectar candidatos com oportunidades de emprego</li>
  <li>Permitir que empresas avaliem perfis de candidatos</li>
  <li>Melhorar nossos serviços e experiência do usuário</li>
  <li>Enviar comunicações relevantes sobre vagas e serviços</li>
  <li>Cumprir obrigações legais</li>
</ul>

<h3>3. Compartilhamento de Dados</h3>
<p>Compartilhamos suas informações apenas:</p>
<ul>
  <li>Com empresas recrutadoras, quando você se candidata a uma vaga</li>
  <li>Com prestadores de serviços que nos auxiliam na operação da plataforma</li>
  <li>Quando exigido por lei ou para proteção de direitos</li>
</ul>

<h3>4. Segurança dos Dados</h3>
<p>Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados contra acesso não autorizado, perda ou alteração.</p>

<h3>5. Seus Direitos</h3>
<p>De acordo com a LGPD, você tem direito a:</p>
<ul>
  <li>Acessar seus dados pessoais</li>
  <li>Corrigir dados incompletos ou desatualizados</li>
  <li>Solicitar a exclusão de seus dados</li>
  <li>Revogar consentimento a qualquer momento</li>
  <li>Portabilidade dos dados</li>
</ul>

<h3>6. Cookies</h3>
<p>Utilizamos cookies para melhorar sua experiência. Você pode gerenciar suas preferências de cookies nas configurações do navegador.</p>

<h3>7. Contato</h3>
<p>Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, entre em contato conosco através da página de contato.</p>`,
    terms_of_use_content: `<h2>Termos de Uso</h2>
<p><em>Última atualização: ${new Date().toLocaleDateString('pt-BR')}</em></p>

<h3>1. Aceitação dos Termos</h3>
<p>Ao acessar e usar nossa plataforma, você concorda com estes Termos de Uso. Se não concordar, não utilize nossos serviços.</p>

<h3>2. Cadastro e Conta</h3>
<ul>
  <li>Você deve fornecer informações verdadeiras e atualizadas</li>
  <li>É responsável pela segurança de sua senha</li>
  <li>Deve ter pelo menos 18 anos para criar uma conta</li>
  <li>Cada usuário pode ter apenas uma conta ativa</li>
</ul>

<h3>3. Uso Permitido</h3>
<p>Você pode usar a plataforma para:</p>
<ul>
  <li>Candidatar-se a vagas de emprego (candidatos)</li>
  <li>Publicar vagas e avaliar candidatos (empresas)</li>
  <li>Gerenciar processos seletivos</li>
</ul>

<h3>4. Uso Proibido</h3>
<p>É expressamente proibido:</p>
<ul>
  <li>Fornecer informações falsas ou enganosas</li>
  <li>Usar a plataforma para fins ilegais</li>
  <li>Coletar dados de outros usuários sem autorização</li>
  <li>Interferir no funcionamento da plataforma</li>
  <li>Criar múltiplas contas ou usar automação não autorizada</li>
</ul>

<h3>5. Conteúdo do Usuário</h3>
<ul>
  <li>Você mantém os direitos sobre seu conteúdo (currículos, descrições, etc.)</li>
  <li>Nos concede licença para exibir e processar seu conteúdo conforme necessário</li>
  <li>É responsável pela veracidade e legalidade de seu conteúdo</li>
</ul>

<h3>6. Propriedade Intelectual</h3>
<p>Todo o conteúdo da plataforma (textos, design, código, logotipos) é de nossa propriedade e protegido por direitos autorais.</p>

<h3>7. Suspensão e Cancelamento</h3>
<p>Podemos suspender ou cancelar sua conta se você violar estes termos ou por motivos legais. Você pode cancelar sua conta a qualquer momento.</p>

<h3>8. Isenção de Responsabilidade</h3>
<ul>
  <li>Não garantimos a contratação de candidatos</li>
  <li>Não somos responsáveis pelas relações entre empresas e candidatos</li>
  <li>Não verificamos todas as informações fornecidas pelos usuários</li>
</ul>

<h3>9. Alterações nos Termos</h3>
<p>Podemos modificar estes termos a qualquer momento. Alterações significativas serão comunicadas com antecedência.</p>

<h3>10. Lei Aplicável</h3>
<p>Estes termos são regidos pelas leis brasileiras. Disputas serão resolvidas no foro da comarca de São Paulo/SP.</p>

<h3>11. Contato</h3>
<p>Para dúvidas sobre estes termos, entre em contato através da página de contato.</p>`,
    instagram_url: '',
    linkedin_url: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setFetching(true);
      // Busca o primeiro registro criado (o mais antigo)
      const { data, error } = await supabase
        .from('system_settings')
        .select('about_content, privacy_policy_content, terms_of_use_content, instagram_url, linkedin_url')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData(prev => ({
          about_content: data.about_content || prev.about_content,
          privacy_policy_content: data.privacy_policy_content || prev.privacy_policy_content,
          terms_of_use_content: data.terms_of_use_content || prev.terms_of_use_content,
          instagram_url: data.instagram_url || prev.instagram_url,
          linkedin_url: data.linkedin_url || prev.linkedin_url,
        }));
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
      if (!user) throw new Error('Usuário não autenticado');

      // Busca o primeiro registro criado (o mais antigo)
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Atualiza
        const { error } = await supabase
          .from('system_settings')
          .update({
            ...formData,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insere
        const { error } = await supabase
          .from('system_settings')
          .insert({
            ...formData,
            contact_email: 'contato@exemplo.com',
            updated_by: user.id,
          });

        if (error) throw error;
      }

      toast({
        title: 'Sucesso!',
        description: 'Conteúdo atualizado com sucesso.',
      });
      
      // Recarrega os dados atualizados
      fetchSettings();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar conteúdo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <CompanyLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gerenciamento de Conteúdo</h1>
        <p className="text-muted-foreground">Gerencie o conteúdo institucional e redes sociais</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="about">Sobre</TabsTrigger>
            <TabsTrigger value="privacy">Privacidade</TabsTrigger>
            <TabsTrigger value="terms">Termos</TabsTrigger>
            <TabsTrigger value="social">Redes Sociais</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Sobre Nós</CardTitle>
                <CardDescription>
                  Conteúdo da página "Sobre"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.about_content}
                  onChange={(e) => setFormData({ ...formData, about_content: e.target.value })}
                  placeholder="Digite o conteúdo da página Sobre..."
                  rows={15}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Política de Privacidade</CardTitle>
                <CardDescription>
                  Conteúdo da Política de Privacidade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.privacy_policy_content}
                  onChange={(e) => setFormData({ ...formData, privacy_policy_content: e.target.value })}
                  placeholder="Digite o conteúdo da Política de Privacidade..."
                  rows={15}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="terms" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Termos de Uso</CardTitle>
                <CardDescription>
                  Conteúdo dos Termos de Uso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.terms_of_use_content}
                  onChange={(e) => setFormData({ ...formData, terms_of_use_content: e.target.value })}
                  placeholder="Digite o conteúdo dos Termos de Uso..."
                  rows={15}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Redes Sociais</CardTitle>
                <CardDescription>
                  Links para suas redes sociais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram URL</Label>
                  <Input
                    id="instagram"
                    type="url"
                    value={formData.instagram_url}
                    onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/seu-perfil"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn URL</Label>
                  <Input
                    id="linkedin"
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/company/seu-perfil"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading} size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>
    </CompanyLayout>
  );
}
