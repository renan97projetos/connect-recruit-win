import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Linkedin, Instagram } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SRHIcon } from '@/components/icons/SRHIcon';

export function Footer() {
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    linkedin: '',
  });

  useEffect(() => {
    fetchSocialLinks();
  }, []);

  const fetchSocialLinks = async () => {
    try {
      // Busca o primeiro registro criado (o mais antigo)
      const { data, error } = await supabase
        .from('system_settings')
        .select('instagram_url, linkedin_url')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSocialLinks({
          instagram: data.instagram_url || '',
          linkedin: data.linkedin_url || '',
        });
      }
    } catch (error) {
      console.error('Error fetching social links:', error);
    }
  };

  return (
    <footer className="bg-card border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <SRHIcon size={48} className="text-primary" />
            <p className="text-sm text-muted-foreground">
              Plataforma SaaS para gestão e automação de recrutamento
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">Empresa</h4>
            <nav className="flex flex-col space-y-2">
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sobre
              </Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contato
              </Link>
            </nav>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">Legal</h4>
            <nav className="flex flex-col space-y-2">
              <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Política de Privacidade
              </Link>
              <Link to="/terms-of-use" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Termos de Uso
              </Link>
            </nav>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">Social</h4>
            <div className="flex gap-4">
              {socialLinks.linkedin && (
                <a 
                  href={socialLinks.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
              )}
              {socialLinks.instagram && (
                <a 
                  href={socialLinks.instagram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Sinapse RH. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
