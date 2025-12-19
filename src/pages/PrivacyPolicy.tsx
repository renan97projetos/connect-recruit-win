import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function PrivacyPolicy() {
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
        .select('privacy_policy_content')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setContent(data?.privacy_policy_content || `<h2>Política de Privacidade</h2>
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
        <p>Para exercer seus direitos ou esclarecer dúvidas sobre privacidade, entre em contato conosco através da página de contato.</p>`);
    } catch (error) {
      console.error('Error fetching privacy policy content:', error);
      setContent(`<h2>Política de Privacidade</h2>
        <p>Respeitamos sua privacidade e protegemos seus dados pessoais de acordo com a LGPD.</p>`);
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
    <DashboardLayout title="Política de Privacidade" description="Como tratamos seus dados">
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-lg shadow-sm p-8">
          <div className="prose prose-slate max-w-none dark:prose-invert">
            <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
