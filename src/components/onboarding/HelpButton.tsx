import { HelpCircle, RefreshCw, BookOpen, Compass } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOnboarding } from '@/contexts/OnboardingContext';

export function HelpButton() {
  const { startTourOfCurrentScreen, startFullTour, openWelcome, startTour, tours, currentScreenTour } =
    useOnboarding();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-tour="nav-help"
          aria-label="Ajuda e tutoriais"
          className="flex items-center justify-center h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 shadow-lg border border-gray-200">
        <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
          Tutoriais e ajuda
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {currentScreenTour && (
          <DropdownMenuItem onClick={startTourOfCurrentScreen} className="cursor-pointer">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refazer tour: <span className="font-medium ml-1">{currentScreenTour.label}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={startFullTour} className="cursor-pointer">
          <Compass className="h-4 w-4 mr-2" />
          Tour completo do sistema
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <BookOpen className="h-4 w-4 mr-2" />
            Tour por tela
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            {tours.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={() => startTour(t.id)}
                className="cursor-pointer"
              >
                {t.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={openWelcome} className="cursor-pointer">
          <HelpCircle className="h-4 w-4 mr-2" />
          Reabrir tela de boas-vindas
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
