import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function VideoPresentationModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Abre sempre que entrar na landing page
    const timer = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="max-w-4xl w-[95vw] p-0 border-4 border-foreground shadow-brutal-lg bg-background overflow-hidden"
      >
        <div className="flex flex-col">
          {/* Video Container - 16:9 */}
          <div className="relative w-full bg-foreground">
            <div className="aspect-video">
              {/*
                INSTRUÇÕES PARA EMBED DE VÍDEO:

                YouTube — substitua VIDEO_ID:
                <iframe
                  src="https://www.youtube.com/embed/VIDEO_ID?autoplay=1&rel=0&modestbranding=1"
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Apresentação Sinapse RH"
                />

                Vimeo — substitua VIDEO_ID:
                <iframe
                  src="https://player.vimeo.com/video/VIDEO_ID?autoplay=1"
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title="Apresentação Sinapse RH"
                />
              */}

              {/* Placeholder até adicionar o vídeo */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-background to-cyan/20">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center border-4 border-foreground shadow-brutal">
                    <svg className="w-10 h-10 text-primary-foreground ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <div className="absolute -top-2 -right-2 bg-yellow text-foreground text-xs font-bold px-2 py-1 rounded-lg border-2 border-foreground rotate-12">
                    Em breve!
                  </div>
                </div>
                <p className="text-muted-foreground mt-6 text-center max-w-md px-4">
                  O vídeo de apresentação será adicionado aqui.
                </p>
              </div>
            </div>
          </div>

          {/* Frase de impacto - brilha e pulsa */}
          <div className="bg-foreground py-8 px-6 text-center border-t-4 border-foreground">
            <h2 className="impact-shine text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Veja como transformar seu RH em{' '}
              <span className="text-yellow">X passos</span>
            </h2>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
