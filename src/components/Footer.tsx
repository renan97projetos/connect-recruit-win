import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Linkedin, Instagram, Zap, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
export function Footer() {
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    linkedin: ''
  });
  useEffect(() => {
    fetchSocialLinks();
  }, []);
  const fetchSocialLinks = async () => {
    try {
      const { data, error } = await (supabase as any).rpc('get_public_settings');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setSocialLinks({
          instagram: row.instagram_url || '',
          linkedin: row.linkedin_url || ''
        });
      }
    } catch (error) {
      console.error('Error fetching social links:', error);
    }
  };
  return <footer className="bg-foreground text-background border-t-3 border-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg border-3 border-background flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-black text-xl">SinapseRH</span>
            </div>
            <p className="text-sm opacity-70 leading-relaxed">
              Plataforma de recrutamento que funciona. Sem complicação, sem enrolação.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h4 className="font-black uppercase tracking-wide">Empresa</h4>
            <nav className="flex flex-col space-y-2">
              <Link to="/about" className="text-sm opacity-70 hover:opacity-100 transition-opacity inline-flex items-center gap-1 group">
                Sobre
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link to="/contact" className="text-sm opacity-70 hover:opacity-100 transition-opacity inline-flex items-center gap-1 group">
                Contato
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-black uppercase tracking-wide">Legal</h4>
            <nav className="flex flex-col space-y-2">
              <Link to="/privacy-policy" className="text-sm opacity-70 hover:opacity-100 transition-opacity inline-flex items-center gap-1 group">
                Privacidade
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link to="/terms-of-use" className="text-sm opacity-70 hover:opacity-100 transition-opacity inline-flex items-center gap-1 group">
                Termos
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </nav>
          </div>

          {/* Social */}
          <div className="space-y-4">
            <h4 className="font-black uppercase tracking-wide">Social</h4>
            <div className="flex gap-3">
              {socialLinks.linkedin && <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-background text-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all border-3 border-background">
                  <Linkedin className="h-5 w-5" />
                </a>}
              {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-background text-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all border-3 border-background">
                  <Instagram className="h-5 w-5" />
                </a>}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-background/20 mt-12 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm opacity-60">
              © {new Date().getFullYear()} Sinapse RH. Todos os direitos reservados.
            </p>
            
          </div>
        </div>
      </div>
    </footer>;
}