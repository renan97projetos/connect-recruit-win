import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
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
      const { data, error } = await (supabase as any).rpc('get_public_settings');

      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      setContent(row?.privacy_policy_content || `<h2>Política de Privacidade</h2>
        <p><em>Última atualização: ${new Date().toLocaleDateString('pt-BR')}</em></p>

        <p>A Sinapse RH está comprometida com a proteção dos seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).</p>

        <h3>1. Quem somos</h3>
        <p>A Sinapse RH é uma plataforma SaaS de recrutamento e seleção para pequenas e médias empresas brasileiras. Atuamos como controlador dos dados das empresas clientes e dos candidatos que utilizam a plataforma.</p>
        <p><strong>Encarregado de Dados (DPO):</strong> privacidade@sinapserh.com.br</p>

        <h3>2. Quais dados coletamos</h3>
        <ul>
          <li><strong>Empresas clientes:</strong> razão social, CNPJ, endereço, dados de contato, usuários cadastrados, informações de vagas e processos seletivos, dados de faturamento.</li>
          <li><strong>Candidatos:</strong> nome, e-mail, telefone, data de nascimento, endereço, currículo, experiências profissionais, formação, habilidades, respostas às perguntas de triagem, documentos de admissão, score de compatibilidade.</li>
          <li><strong>Dados automáticos:</strong> endereço IP, dispositivo, navegador, páginas acessadas, cookies de sessão.</li>
        </ul>

        <h3>3. Para que usamos seus dados</h3>
        <ul>
          <li><strong>Execução de contrato:</strong> criação e gestão da conta, operação da plataforma, processamento de candidaturas</li>
          <li><strong>Legítimo interesse:</strong> melhoria da plataforma, prevenção de fraudes, suporte técnico</li>
          <li><strong>Consentimento:</strong> comunicações de marketing (quando você optar por receber)</li>
          <li><strong>Obrigação legal:</strong> cumprimento de obrigações fiscais e regulatórias</li>
        </ul>

        <h3>4. Compartilhamento de dados</h3>
        <p>Não vendemos seus dados. Compartilhamos apenas com:</p>
        <ul>
          <li><strong>Prestadores de serviço:</strong> Supabase (infraestrutura), Anthropic (IA), provedores de e-mail — todos com cláusulas de proteção de dados</li>
          <li><strong>Empresas e candidatos:</strong> dados do candidato são compartilhados com a empresa do processo seletivo ao qual ele se candidatou</li>
          <li><strong>Obrigação legal:</strong> quando exigido por autoridade competente ou ordem judicial</li>
        </ul>

        <h3>5. Retenção dos dados</h3>
        <ul>
          <li><strong>Candidatos:</strong> mantidos enquanto a conta estiver ativa; excluídos em até 30 dias após solicitação, salvo obrigação legal</li>
          <li><strong>Empresas:</strong> mantidos durante o período contratual e por até 5 anos, conforme obrigações fiscais</li>
          <li><strong>Logs de acesso:</strong> 6 meses conforme Marco Civil da Internet (Lei nº 12.965/2014)</li>
        </ul>

        <h3>6. Seus direitos (Art. 18 da LGPD)</h3>
        <ul>
          <li><strong>Acesso:</strong> confirmar existência e obter cópia dos seus dados</li>
          <li><strong>Correção:</strong> corrigir dados incompletos ou desatualizados</li>
          <li><strong>Eliminação:</strong> solicitar exclusão dos dados tratados por consentimento</li>
          <li><strong>Portabilidade:</strong> receber dados em formato estruturado e interoperável</li>
          <li><strong>Oposição:</strong> opor-se ao tratamento por legítimo interesse</li>
          <li><strong>Revogação:</strong> retirar consentimento a qualquer momento</li>
        </ul>
        <p>Para exercer seus direitos: <strong>privacidade@sinapserh.com.br</strong>. Respondemos em até 15 dias úteis.</p>

        <h3>7. Segurança</h3>
        <ul>
          <li>Criptografia em trânsito (TLS/HTTPS) e em repouso</li>
          <li>Controle de acesso por funções (RLS — Row Level Security)</li>
          <li>Autenticação com tokens JWT</li>
          <li>Backups periódicos com retenção de 7 dias</li>
          <li>Audit log de operações sensíveis</li>
        </ul>

        <h3>8. Cookies</h3>
        <p>Usamos apenas cookies estritamente necessários para sessão e autenticação. Não utilizamos cookies de rastreamento publicitário de terceiros.</p>

        <h3>9. Transferência internacional</h3>
        <p>Alguns prestadores operam fora do Brasil (Supabase e Anthropic — EUA). Garantimos que essas transferências seguem o Art. 33 da LGPD com cláusulas contratuais adequadas.</p>

        <h3>10. Menores de idade</h3>
        <p>Nossa plataforma não é destinada a menores de 18 anos. Dados de menores identificados sem consentimento dos responsáveis serão excluídos imediatamente.</p>

        <h3>11. Alterações</h3>
        <p>Podemos atualizar esta Política periodicamente. Alterações relevantes serão comunicadas com antecedência mínima de 15 dias.</p>

        <h3>12. Contato</h3>
        <p><strong>DPO:</strong> privacidade@sinapserh.com.br<br/>
        <strong>Suporte:</strong> contato@sinapserh.com.br<br/>
        <strong>ANPD:</strong> www.gov.br/anpd</p>`);
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
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
            <p className="text-muted-foreground">Como tratamos seus dados</p>
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
