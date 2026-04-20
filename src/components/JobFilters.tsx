import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
export interface JobFilters {
  keyword: string;
  city: string;
  state: string;
  jobType: string;
  salaryRange: [number, number];
  location: string;
  experienceLevel: string;
  datePosted: string;
}
const defaultFilterValue = 'all';
interface JobFiltersProps {
  filters: JobFilters;
  onFilterChange: (filters: JobFilters) => void;
  onReset: () => void;
}
export function JobFiltersComponent({
  filters,
  onFilterChange,
  onReset
}: JobFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'salaryRange') return value[0] > 0 || value[1] < 50000;
    return value !== '' && value !== 'all';
  }).length;
  const handleChange = (key: keyof JobFilters, value: any) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };
  const FilterContent = () => <div className="space-y-6">
      {/* Filtros principais sempre visíveis */}
      <div className="space-y-2">
        <Label htmlFor="keyword">Palavra-chave / Cargo</Label>
        <Input id="keyword" placeholder="Ex: Desenvolvedor, Analista..." value={filters.keyword} onChange={e => handleChange('keyword', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" placeholder="Ex: São Paulo" value={filters.city} onChange={e => handleChange('city', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">Estado</Label>
          <Input id="state" placeholder="Ex: SP" value={filters.state} onChange={e => handleChange('state', e.target.value)} />
        </div>
      </div>

      {/* Botão Mais Filtros */}
      <Collapsible open={showMoreFilters} onOpenChange={setShowMoreFilters}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Mais filtros
            <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showMoreFilters ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-6 mt-6">
          <div className="space-y-2">
            <Label htmlFor="jobType">Tipo de Vaga</Label>
            <Select value={filters.jobType} onValueChange={value => handleChange('jobType', value)}>
              <SelectTrigger id="jobType">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="full-time">Tempo Integral</SelectItem>
                <SelectItem value="part-time">Meio Período</SelectItem>
                <SelectItem value="contract">Contrato</SelectItem>
                <SelectItem value="freelance">Freelance</SelectItem>
                <SelectItem value="internship">Estágio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Modalidade</Label>
            <Select value={filters.location} onValueChange={value => handleChange('location', value)}>
              <SelectTrigger id="location">
                <SelectValue placeholder="Selecione a modalidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="remote">Remoto</SelectItem>
                <SelectItem value="onsite">Presencial</SelectItem>
                <SelectItem value="hybrid">Híbrido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experienceLevel">Nível de Experiência</Label>
            <Select value={filters.experienceLevel} onValueChange={value => handleChange('experienceLevel', value)}>
              <SelectTrigger id="experienceLevel">
                <SelectValue placeholder="Selecione o nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="junior">Júnior</SelectItem>
                <SelectItem value="pleno">Pleno</SelectItem>
                <SelectItem value="senior">Sênior</SelectItem>
                <SelectItem value="especialista">Especialista</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label>Faixa Salarial (R$)</Label>
            <div className="px-2">
              <Slider min={0} max={50000} step={1000} value={filters.salaryRange} onValueChange={value => handleChange('salaryRange', value as [number, number])} className="w-full" />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>R$ {filters.salaryRange[0].toLocaleString('pt-BR')}</span>
              <span>R$ {filters.salaryRange[1].toLocaleString('pt-BR')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="datePosted">Data de Publicação</Label>
            <Select value={filters.datePosted} onValueChange={value => handleChange('datePosted', value)}>
              <SelectTrigger id="datePosted">
                <SelectValue placeholder="Qualquer data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer data</SelectItem>
                <SelectItem value="24h">Últimas 24 horas</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex flex-col sm:flex-row gap-2 pt-4">
        <Button onClick={onReset} variant="outline" className="w-full sm:flex-1 min-w-0 text-sm px-[15px]">
          Limpar Filtros
        </Button>
        <Button onClick={() => setIsOpen(false)} className="w-full sm:flex-1 min-w-0 px-2 text-sm bg-blue-900 hover:bg-blue-800">
          Aplicar
        </Button>
      </div>
    </div>;
  return <>
      {/* Desktop Filters */}
      <div className="hidden lg:block">
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg">Filtros</h3>
            {activeFiltersCount > 0 && <Badge variant="secondary">{activeFiltersCount} ativos</Badge>}
          </div>
          <FilterContent />
        </div>
      </div>

      {/* Mobile Filters */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount}
                </Badge>}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtros de Busca</SheetTitle>
              <SheetDescription>
                Refine sua busca com os filtros abaixo
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>;
}