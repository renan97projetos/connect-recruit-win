import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

export function FloatingWhatsAppButton() {
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    fetchWhatsAppNumber();
  }, []);

  const fetchWhatsAppNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('whatsapp_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching WhatsApp number:', error);
        return;
      }

      if (data?.whatsapp_number) {
        setWhatsappNumber(data.whatsapp_number);
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp number:', error);
    }
  };

  const handleWhatsAppClick = () => {
    if (whatsappNumber) {
      const message = encodeURIComponent('Olá! Gostaria de falar com um especialista.');
      window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
    }
  };

  if (!isVisible || !whatsappNumber) {
    return null;
  }

  return (
    <Button
      onClick={handleWhatsAppClick}
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform duration-200 z-50 bg-[#25D366] hover:bg-[#20BA5A]"
      size="icon"
      aria-label="Falar com especialista no WhatsApp"
    >
      <MessageCircle className="h-7 w-7 text-white" />
    </Button>
  );
}
