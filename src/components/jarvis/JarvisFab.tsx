import { Hexagon } from 'lucide-react';

interface Props {
  onClick: () => void;
}

export function JarvisFab({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label="Abrir Jarvis"
      className="fixed bottom-6 right-6 z-40 group flex items-center gap-2 rounded-full pl-3 pr-4 py-2.5 shadow-2xl transition-transform hover:scale-105"
      style={{
        background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
        boxShadow: '0 10px 40px -10px rgba(124, 58, 237, 0.6)',
      }}
    >
      <span className="relative flex items-center justify-center">
        <Hexagon className="h-7 w-7" style={{ color: '#fff', fill: '#7c3aed' }} />
        <span className="absolute text-white font-bold text-xs">J</span>
        <span
          className="absolute -inset-1 rounded-full animate-ping opacity-40"
          style={{ background: '#7c3aed' }}
        />
      </span>
      <span className="text-white text-sm font-medium">Jarvis</span>
    </button>
  );
}
