import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { QuickCandidateRegister } from '@/components/QuickCandidateRegister';

export default function Register() {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary border-r-3 border-foreground items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-12 left-12 w-24 h-24 bg-yellow rounded-xl border-3 border-foreground shadow-brutal-lg tilt-left" />
        <div className="absolute bottom-24 right-12 w-32 h-32 bg-cyan rounded-xl border-3 border-foreground shadow-brutal-lg tilt-right" />
        <div className="absolute top-1/3 right-24 w-16 h-16 bg-pink rounded-full border-3 border-foreground" />

        <div className="text-center text-primary-foreground z-10 max-w-md">
          <div className="w-20 h-20 bg-background rounded-xl border-3 border-foreground shadow-brutal-lg flex items-center justify-center mx-auto mb-8">
            <Zap className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-5xl font-black mb-4 leading-tight">
            Sua próxima oportunidade começa aqui.
          </h1>
          <p className="text-xl opacity-90">
            Crie seu perfil e candidate-se às melhores vagas em poucos minutos.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:hidden">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-12 h-12 bg-primary rounded-xl border-3 border-foreground shadow-brutal flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-black text-2xl">SinapseRH</span>
            </Link>
          </div>

          <QuickCandidateRegister />

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Já tem uma conta?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline underline-offset-4">
                Entrar
              </Link>
            </p>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground font-semibold inline-block">
              ← Voltar para o início
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
