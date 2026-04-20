import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export function VideoPresentationModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        {/* Cinemascope bars (top + bottom) */}
        {open && <div className="cinema-bars" aria-hidden="true" />}

        {/* Vignette backdrop */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 cinema-vignette',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />

        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-[95vw] max-w-4xl',
            'translate-x-[-50%] translate-y-[-50%]',
            'cinema-dialog cinema-glow',
            'rounded-2xl bg-background border-4 border-foreground overflow-hidden',
          )}
        >
          <div className="relative flex flex-col">
            {/* Floating sparkles */}
            <span className="cinema-spark" style={{ top: '8%', left: '4%', ['--tx' as any]: '14px', ['--ty' as any]: '-18px', animationDelay: '0.2s' }} />
            <span className="cinema-spark" style={{ top: '12%', right: '6%', ['--tx' as any]: '-12px', ['--ty' as any]: '-14px', animationDelay: '0.9s' }} />
            <span className="cinema-spark" style={{ bottom: '14%', left: '8%', ['--tx' as any]: '12px', ['--ty' as any]: '14px', animationDelay: '1.6s' }} />
            <span className="cinema-spark" style={{ bottom: '10%', right: '5%', ['--tx' as any]: '-14px', ['--ty' as any]: '12px', animationDelay: '2.1s' }} />

            {/* Video Container - 16:9 */}
            <div className="relative w-full bg-foreground">
              <div className="aspect-video relative">
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
                */}

                {/* Placeholder até adicionar o vídeo */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/30 via-foreground to-accent/30">
                  <div className="relative animate-bounce-subtle">
                    <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center border-4 border-background shadow-brutal">
                      <svg className="w-10 h-10 text-primary-foreground ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <div className="absolute -top-2 -right-2 bg-yellow text-foreground text-xs font-bold px-2 py-1 rounded-lg border-2 border-foreground rotate-12">
                      Em breve!
                    </div>
                  </div>
                  <p className="text-background/80 mt-6 text-center max-w-md px-4 font-mono text-sm">
                    O vídeo de apresentação será adicionado aqui.
                  </p>
                </div>

                {/* Cinematic light sweep */}
                <div className="cinema-sweep" aria-hidden="true" />
              </div>
            </div>

            {/* Frase de impacto */}
            <div className="bg-foreground py-10 px-6 text-center border-t-4 border-foreground relative overflow-hidden">
              {/* radial glow behind text */}
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-60"
                style={{
                  background:
                    'radial-gradient(ellipse at center, hsl(var(--primary) / 0.35) 0%, transparent 60%)',
                }}
              />
              <h2 className="impact-shine relative text-3xl md:text-5xl font-black tracking-tight leading-tight">
                Veja como transformar seu <span>RH</span>
              </h2>
            </div>

            {/* Close button - cinema style */}
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="absolute top-3 right-3 z-50 h-10 w-10 flex items-center justify-center rounded-full bg-background border-3 border-foreground shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-hover transition-all focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
