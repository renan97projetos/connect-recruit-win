import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Linkedin, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  photo_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
}

export default function About() {
  const [content, setContent] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
    fetchTeamMembers();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await (supabase as any).rpc('get_public_settings');

      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      setContent(row?.about_content || `<h2>Sobre Nós</h2>
        
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

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('is_active', true)
        .order('order_position', { ascending: true });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Sobre Nós</h1>
            <p className="text-muted-foreground mt-2">Conheça nossa plataforma</p>
          </div>

          <div className="space-y-12">
            {/* Conteúdo sobre a empresa */}
            <div className="bg-card rounded-lg shadow-sm p-8 border-3 border-foreground">
              <div className="prose prose-slate max-w-none dark:prose-invert">
                <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }} />
              </div>
            </div>

            {/* Seção da Equipe */}
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight">Nossa Equipe</h2>
                <p className="text-muted-foreground mt-2">
                  Conheça os profissionais por trás do SinapseRH
                </p>
              </div>

              {teamMembers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {teamMembers.map((member) => (
                    <Card key={member.id} className="border-3 border-foreground shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-hover transition-all">
                      <CardContent className="pt-6 text-center">
                        <Avatar className="w-24 h-24 mx-auto mb-4 border-3 border-foreground">
                          <AvatarImage src={member.photo_url || undefined} alt={member.name} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-bold text-lg">{member.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{member.role}</p>
                        {member.bio && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{member.bio}</p>
                        )}
                        {member.linkedin_url && (
                          <a
                            href={member.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline mt-3 text-sm"
                          >
                            <Linkedin className="h-4 w-4" />
                            LinkedIn
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg border-3 border-dashed border-muted-foreground/30 p-12 text-center">
                  <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Equipe em breve</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Os membros da equipe serão exibidos aqui. Administradores podem adicionar membros através do painel administrativo.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
