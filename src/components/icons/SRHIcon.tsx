import logoIcon from '@/assets/srh-logo-official.png';

interface SRHIconProps {
  size?: number;
  className?: string;
}

export function SRHIcon({ size = 100, className = '' }: SRHIconProps) {
  return (
    <img 
      src={logoIcon} 
      alt="SRH Logo" 
      style={{ height: size }}
      className={`${className} w-auto`}
    />
  );
}
