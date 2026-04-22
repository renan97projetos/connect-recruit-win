import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SlidersHorizontal, ChevronDown, X, Loader2 } from 'lucide-react';
import { BRAZIL_STATES, fetchCitiesByState } from '@/lib/brazilLocations';

export interface JobFilters {
  keyword: string;
  cities: string[];
  state: string;
  jobType: string;
  salaryRange: [number, number];
  location: string;
  experienceLevel: string;
  datePosted: string;
}

interface JobFiltersProps {
  filters: JobFilters;
  onFilterChange: (filters: JobFilters) => void;
  onReset: () => void;
}

export function JobFiltersComponent({ filters, onFilterChange, onReset }: JobFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'salaryRange') return (value as number[])[0] > 0 || (value as number[])[1] < 50000;
    if (key === 'cities') return Array.isArray(value) && value.length > 0;
    return value !== '' && value !== 'all';
  }).length;

  const handleChange = (key: keyof JobFilters, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  // Carrega cidades sempre que o estado mudar
  useEffect(() => {
    let cancelled = false;
    if (!filters.state) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    fetchCitiesByState(filters.state)
      .then((list) => {
        if (!cancelled) setCities(list);
      })
      .finally(() => {
        if (!cancelled) setLoadingCities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters.state]);

  const handleStateChange = (value: string) => {
    const newState = value === 'all' ? '' : value;
    // Ao trocar de estado, limpa as cidades selecionadas
    onFilterChange({ ...filters, state: newState, cities: [] });
    setCitySearch('');
  };

  const toggleCity = (city: string) => {
    const exists = filters.cities.includes(city);
    const next = exists ? filters.cities.filter((c) => c !== city) : [...filters.cities, city];
    handleChange('cities', next);
  };

  const removeCity = (city: string) => {
    handleChange('cities', filters.cities.filter((c) => c !== city));
  };

  const filteredCities = citySearch
    ? cities.filter((c) => c.toLowerCase().includes(citySearch.toLowerCase()))
    : cities;

  const filterContent = (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="keyword">Palavra-chave / Cargo</Label>
        <Input
          id="keyword"
          placeholder="Ex: Desenvolvedor, Analista..."
          value={filters.keyword}
          onChange={(e) => handleChange('keyword', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="state">Estado</Label>
        <Select value={filters.state || 'all'} onValueChange={handleStateChange}>
          <SelectTrigger id="state">
            <SelectValue placeholder="Selecione o estado" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">Todos os estados</SelectItem>
            {BRAZIL_STATES.map((s) => (
              <SelectItem key={s.uf} value={s.uf}>
                {s.name} ({s.uf})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Cidades</Label>
        {!filters.state ? (
          <p className="text-xs text-muted-foreground">
            Selecione um estado para listar as cidades.
          </p>
        ) : loadingCities ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando cidades...
          </div>
        ) : (
          <>
            {filters.cities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-2">
                {filters.cities.map((city) => (
                  <Badge key={city} variant="secondary" className="gap-1 pr-1">
                    {city}
                    <button
                      type="button"
                      onClick={() => removeCity(city)}
                      className="rounded-sm hover:bg-muted-foreground/20 p-0.5"
                      aria-label={`Remover ${city}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Input
              placeholder="Buscar cidade..."
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
            />
            <div className="max-h-48 overflow-y-auto rounded-md border border-input divide-y">
              {filteredCities.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3">Nenhuma cidade encontrada.</p>
              ) : (
                filteredCities.map((city) => {
                  const checked = filters.cities.includes(city);
                  return (
                    <label
                      key={city}
                      className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleCity(city)}
                      />
                      <span className="truncate">{city}</span>
                    </label>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

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
            <Select value={filters.jobType} onValueChange={(value) => handleChange('jobType', value)}>
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
            <Select value={filters.location} onValueChange={(value) => handleChange('location', value)}>
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
            <Select value={filters.experienceLevel} onValueChange={(value) => handleChange('experienceLevel', value)}>
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
              <Slider
                min={0}
                max={50000}
                step={1000}
                value={filters.salaryRange}
                onValueChange={(value) => handleChange('salaryRange', value as [number, number])}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>R$ {filters.salaryRange[0].toLocaleString('pt-BR')}</span>
              <span>R$ {filters.salaryRange[1].toLocaleString('pt-BR')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="datePosted">Data de Publicação</Label>
            <Select value={filters.datePosted} onValueChange={(value) => handleChange('datePosted', value)}>
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
        <Button onClick={onReset} variant="outline" className="w-full sm:flex-1 min-w-0 text-sm">
          Limpar Filtros
        </Button>
        <Button
          onClick={() => setIsOpen(false)}
          className="w-full sm:flex-1 min-w-0 px-2 text-sm bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Aplicar
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Filters */}
      <div className="hidden lg:block">
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg">Filtros</h3>
            {activeFiltersCount > 0 && <Badge variant="secondary">{activeFiltersCount} ativos</Badge>}
          </div>
          {filterContent}
        </div>
      </div>

      {/* Mobile Filters */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtros de Busca</SheetTitle>
              <SheetDescription>Refine sua busca com os filtros abaixo</SheetDescription>
            </SheetHeader>
            <div className="mt-6">{filterContent}</div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
