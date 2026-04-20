import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, MapPin, DollarSign, Building2, Clock, CheckCircle2 } from 'lucide-react';

interface JobPreviewData {
  title: string;
  description: string;
  type: string;
  location: string;
  city: string;
  state: string;
  salaryMin: string;
  salaryMax: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  companyName?: string;
}

const TYPE_LABELS: Record<string, string> = {
  'full-time': 'Tempo Integral',
  'part-time': 'Meio Período',
  'contract': 'Contrato',
  'freelance': 'Freelance',
  'internship': 'Estágio',
  'temporary': 'Temporário',
};

const LOCATION_LABELS: Record<string, string> = {
  'remote': 'Remoto',
  'onsite': 'Presencial',
  'hybrid': 'Híbrido',
};

export function JobPreview({ data }: { data: JobPreviewData }) {
  const formatSalary = () => {
    const min = data.salaryMin ? parseFloat(data.salaryMin) : null;
    const max = data.salaryMax ? parseFloat(data.salaryMax) : null;
    if (!min && !max) return null;
    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
    return fmt((min || max) as number);
  };

  const salary = formatSalary();
  const filteredReqs = data.requirements.filter(r => r.trim());
  const filteredResp = data.responsibilities.filter(r => r.trim());
  const filteredBen = data.benefits.filter(b => b.trim());

  return (
    <div className="sticky top-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Preview
        </span>
        <Badge variant="outline" className="text-xs">
          Visão do candidato
        </Badge>
      </div>

      <Card className="overflow-hidden border-2">
        <CardHeader className="bg-gradient-to-br from-primary/5 to-primary/10 pb-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold leading-tight text-foreground break-words">
                {data.title || 'Título da vaga'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.companyName || 'Sua empresa'}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {data.type && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {TYPE_LABELS[data.type] || data.type}
              </Badge>
            )}
            {data.location && (
              <Badge variant="secondary" className="gap-1">
                <Briefcase className="h-3 w-3" />
                {LOCATION_LABELS[data.location] || data.location}
              </Badge>
            )}
            {(data.city || data.state) && (
              <Badge variant="secondary" className="gap-1">
                <MapPin className="h-3 w-3" />
                {[data.city, data.state].filter(Boolean).join(', ')}
              </Badge>
            )}
            {salary && (
              <Badge variant="secondary" className="gap-1">
                <DollarSign className="h-3 w-3" />
                {salary}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Sobre a vaga</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
              {data.description || 'A descrição aparecerá aqui conforme você digita...'}
            </p>
          </section>

          {filteredResp.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Responsabilidades</h3>
              <ul className="space-y-1.5">
                {filteredResp.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {filteredReqs.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Requisitos</h3>
              <ul className="space-y-1.5">
                {filteredReqs.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {filteredBen.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Benefícios</h3>
              <div className="flex flex-wrap gap-1.5">
                {filteredBen.map((item, i) => (
                  <Badge key={i} variant="outline" className="font-normal">
                    {item}
                  </Badge>
                ))}
              </div>
            </section>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
