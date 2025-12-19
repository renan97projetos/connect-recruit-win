import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function About() {
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
        .select('about_content')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setContent(data?.about_content || `<h2>Sobre Nós</h2>
        
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
        </ul>`);
    } catch (error) {
      console.error('Error fetching about content:', error);
      setContent(`<h2>Sobre Nós</h2>
        
        <p>Somos uma plataforma inovadora de gestão de recursos humanos que conecta empresas e talentos de forma eficiente e automatizada.</p>
        
        <h3>Nossa Missão</h3>
        <p>Transformar o processo de recrutamento e seleção, tornando-o mais ágil, inteligente e eficaz para empresas de todos os portes.</p>`);
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
    <DashboardLayout title="Sobre Nós" description="Conheça nossa plataforma">
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
