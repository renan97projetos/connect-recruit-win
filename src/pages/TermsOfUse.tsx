import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function TermsOfUse() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      // Busca o primeiro registro criado (o mais antigo)
      const { data, error } = await supabase
        .from('system_settings')
        .select('terms_of_use_content')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setContent(data?.terms_of_use_content || `<h2>Termos de Uso</h2>
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
        <p>Para dúvidas sobre estes termos, entre em contato através da página de contato.</p>`);
    } catch (error) {
      console.error('Error fetching terms of use content:', error);
      setContent(`<h2>Termos de Uso</h2>
        <p>Ao usar nossa plataforma, você concorda com nossos termos e condições.</p>`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
            <p className="text-muted-foreground">Regras de utilização da plataforma</p>
          </div>
          <div className="bg-card rounded-lg shadow-sm p-8">
            <div className="prose prose-slate max-w-none dark:prose-invert">
              <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
