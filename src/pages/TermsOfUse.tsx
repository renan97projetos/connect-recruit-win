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
      const { data, error } = await (supabase as any).rpc('get_public_settings');

      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      setContent(row?.terms_of_use_content || `<h2>Termos de Uso</h2>
        <p><em>Última atualização: ${new Date().toLocaleDateString('pt-BR')}</em></p>

        <p>Estes Termos regulam o acesso e uso da plataforma Sinapse RH em <strong>www.sinapserh.com.br</strong>. Ao criar uma conta ou usar qualquer funcionalidade, você concorda com estes termos na integralidade.</p>

        <h3>1. Definições</h3>
        <ul>
          <li><strong>Plataforma:</strong> o software SaaS Sinapse RH e todos os seus módulos</li>
          <li><strong>Empresa:</strong> pessoa jurídica que contrata o Sinapse RH para gestão de recrutamento</li>
          <li><strong>Candidato:</strong> pessoa física que usa a plataforma para se candidatar a vagas</li>
          <li><strong>Plano:</strong> modalidade de assinatura contratada (Starter ou Pro)</li>
        </ul>

        <h3>2. Aceitação e capacidade</h3>
        <p>Para usar a plataforma, você declara que é maior de 18 anos ou representante legal autorizado de uma pessoa jurídica, que as informações fornecidas são verdadeiras e que aceita estes Termos e a Política de Privacidade.</p>

        <h3>3. Cadastro e segurança da conta</h3>
        <ul>
          <li>Você é responsável pela confidencialidade de suas credenciais</li>
          <li>Notifique imediatamente sobre uso não autorizado: <strong>suporte@sinapserh.com.br</strong></li>
          <li>É proibido compartilhar credenciais com terceiros não autorizados</li>
        </ul>

        <h3>4. Planos e pagamento</h3>
        <ul>
          <li>A plataforma é oferecida nos planos Starter e Pro com funcionalidades descritas na página de planos</li>
          <li>O acesso é condicionado ao pagamento da assinatura vigente</li>
          <li>Em caso de inadimplência, o acesso poderá ser suspenso após aviso prévio de 5 dias úteis</li>
          <li>Reembolsos analisados caso a caso mediante solicitação em até 7 dias corridos após a cobrança</li>
          <li>Valores dos planos podem ser reajustados com comunicação prévia de 30 dias</li>
        </ul>

        <h3>5. Uso permitido</h3>
        <ul>
          <li>Publicação e gestão de vagas de emprego legítimas</li>
          <li>Condução de processos seletivos e avaliação de candidatos</li>
          <li>Candidatura a vagas e acompanhamento de processos seletivos</li>
        </ul>

        <h3>6. Uso proibido</h3>
        <ul>
          <li>Publicar vagas falsas, enganosas ou com requisitos discriminatórios ilegais</li>
          <li>Coletar dados de candidatos para finalidades distintas do processo seletivo</li>
          <li>Spam, phishing ou qualquer atividade fraudulenta</li>
          <li>Engenharia reversa, cópia ou distribuição do código da plataforma</li>
          <li>Praticar discriminação vedada pela CLT e Lei nº 9.029/1995</li>
        </ul>

        <h3>7. Responsabilidades das empresas</h3>
        <p>As empresas são responsáveis pela veracidade das vagas publicadas, cumprimento da LGPD no tratamento dos dados dos candidatos, decisões de contratação e reprovação, e cumprimento da legislação trabalhista.</p>

        <h3>8. Propriedade intelectual</h3>
        <p>Todo o conteúdo da plataforma — código, design, marca, logotipos — é de propriedade exclusiva do Sinapse RH, protegido pela Lei nº 9.610/1998. Os dados inseridos pelas empresas permanecem de propriedade do cliente.</p>

        <h3>9. Limitação de responsabilidade</h3>
        <p>O Sinapse RH não se responsabiliza por decisões de contratação, informações inverídicas de usuários, perdas indiretas ou lucros cessantes. Nossa responsabilidade total fica limitada ao valor pago pelo plano nos últimos 3 meses.</p>

        <h3>10. Suspensão e cancelamento</h3>
        <ul>
          <li>O usuário pode cancelar a conta pelo painel ou por <strong>suporte@sinapserh.com.br</strong></li>
          <li>Dados mantidos por 30 dias após cancelamento para recuperação, depois excluídos</li>
          <li>O Sinapse RH pode suspender contas que violem estes Termos</li>
        </ul>

        <h3>11. Alterações</h3>
        <p>Alterações substanciais serão comunicadas com antecedência mínima de 15 dias. O uso continuado implica aceitação das alterações.</p>

        <h3>12. Lei aplicável e foro</h3>
        <p>Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de Vitória, Espírito Santo, com renúncia a qualquer outro por mais privilegiado que seja.</p>

        <h3>13. Contato</h3>
        <p><strong>suporte@sinapserh.com.br</strong> — www.sinapserh.com.br</p>`);
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
