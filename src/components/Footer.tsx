import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Linkedin, Instagram, ArrowUpRight } from 'lucide-react';
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
    <footer className="bg-accent text-accent-foreground border-t-2 border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <SRHIcon size={48} className="text-primary" />
            <p className="font-body text-sm text-accent-foreground/70 leading-relaxed">
              Plataforma SaaS para gestão e automação de recrutamento humanizado
            </p>
          </div>

          {/* Company Links */}
          <div className="space-y-4">
            <h4 className="font-display text-lg font-semibold">Empresa</h4>
            <nav className="flex flex-col space-y-3">
              <Link 
                to="/about" 
                className="font-body text-sm text-accent-foreground/70 hover:text-primary transition-colors inline-flex items-center gap-1 group"
              >
                Sobre
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link 
                to="/contact" 
                className="font-body text-sm text-accent-foreground/70 hover:text-primary transition-colors inline-flex items-center gap-1 group"
              >
                Contato
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </nav>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h4 className="font-display text-lg font-semibold">Legal</h4>
            <nav className="flex flex-col space-y-3">
              <Link 
                to="/privacy-policy" 
                className="font-body text-sm text-accent-foreground/70 hover:text-primary transition-colors inline-flex items-center gap-1 group"
              >
                Política de Privacidade
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link 
                to="/terms-of-use" 
                className="font-body text-sm text-accent-foreground/70 hover:text-primary transition-colors inline-flex items-center gap-1 group"
              >
                Termos de Uso
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </nav>
          </div>

          {/* Social */}
          <div className="space-y-4">
            <h4 className="font-display text-lg font-semibold">Conecte-se</h4>
            <div className="flex gap-4">
              {socialLinks.linkedin && (
                <a 
                  href={socialLinks.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-accent-foreground/10 flex items-center justify-center text-accent-foreground/70 hover:bg-primary hover:text-primary-foreground transition-all"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
              )}
              {socialLinks.instagram && (
                <a 
                  href={socialLinks.instagram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-accent-foreground/10 flex items-center justify-center text-accent-foreground/70 hover:bg-primary hover:text-primary-foreground transition-all"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-accent-foreground/10 mt-12 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-body text-sm text-accent-foreground/60">
              © {new Date().getFullYear()} Sinapse RH. Todos os direitos reservados.
            </p>
            <p className="font-body text-xs text-accent-foreground/40">
              Feito com cuidado para humanos
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
