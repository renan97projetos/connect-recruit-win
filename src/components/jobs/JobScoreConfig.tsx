import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Plus, X, Target, Info, Wand2, MessageSquare } from 'lucide-react';

export type ScoreWeights = {
  skills: number;
  experience: number;
  education: number;
  location: number;
};

export type ScoreConfig = {
  required_skills: string[];
  job_area: string;
  required_education_level: string;
  required_education_area: string;
  min_experience_years: number;
  is_remote: boolean;
  score_weights: ScoreWeights;
};

export type CustomScoredQuestion = {
  /** índice da pergunta na lista do JobForm (para callback) */
  index: number;
  question: string;
  weight: number;
};

interface Props {
  value: ScoreConfig;
  onChange: (config: ScoreConfig) => void;
  /** Perguntas customizadas marcadas como "Contar no score" */
  customScoredQuestions?: CustomScoredQuestion[];
  /** Atualiza o peso de uma pergunta customizada (índice na lista original) */
  onCustomWeightChange?: (index: number, weight: number) => void;
  /** Limite máximo de perguntas customizadas pontuáveis */
  maxCustomScored?: number;
}

const DEFAULT_WEIGHTS: ScoreWeights = { skills: 40, experience: 30, education: 20, location: 10 };

export function JobScoreConfig({
  value,
  onChange,
  customScoredQuestions = [],
  onCustomWeightChange,
  maxCustomScored = 5,
}: Props) {
  const [skillInput, setSkillInput] = useState('');
  const [weights, setWeights] = useState<ScoreWeights>(value.score_weights || DEFAULT_WEIGHTS);

  useEffect(() => {
    setWeights(value.score_weights || DEFAULT_WEIGHTS);
  }, [value.score_weights]);

  const update = (patch: Partial<ScoreConfig>) => onChange({ ...value, ...patch });

  const addSkill = () => {
    const v = skillInput.trim();
    if (!v) return;
    if (value.required_skills.some((s) => s.toLowerCase() === v.toLowerCase())) return;
    update({ required_skills: [...value.required_skills, v] });
    setSkillInput('');
  };

  const removeSkill = (s: string) => {
    update({ required_skills: value.required_skills.filter((x) => x !== s) });
  };

  const customTotal = customScoredQuestions.reduce((acc, q) => acc + (q.weight || 0), 0);
  const standardTotal = weights.skills + weights.experience + weights.education + weights.location;
  const totalWeight = standardTotal + customTotal;

  const updateWeight = (key: keyof ScoreWeights, val: number) => {
    const next = { ...weights, [key]: val };
    setWeights(next);
    update({ score_weights: next });
  };

  const resetWeights = () => {
    setWeights(DEFAULT_WEIGHTS);
    update({ score_weights: DEFAULT_WEIGHTS });
  };

  /** Redistribui proporcionalmente para o total dar exatamente 100 */
  const redistributeTo100 = () => {
    if (totalWeight <= 0) return;
    const factor = 100 / totalWeight;

    // Escala padrão (arredondando)
    const newStandard: ScoreWeights = {
      skills: Math.round(weights.skills * factor),
      experience: Math.round(weights.experience * factor),
      education: Math.round(weights.education * factor),
      location: Math.round(weights.location * factor),
    };

    // Escala perguntas customizadas
    const newCustomWeights = customScoredQuestions.map((q) => Math.round(q.weight * factor));

    // Ajusta o resíduo de arredondamento na primeira categoria padrão com peso > 0
    const sumAfter =
      newStandard.skills + newStandard.experience + newStandard.education + newStandard.location +
      newCustomWeights.reduce((a, b) => a + b, 0);
    const diff = 100 - sumAfter;
    if (diff !== 0) {
      const keys: (keyof ScoreWeights)[] = ['skills', 'experience', 'education', 'location'];
      const target = keys.find((k) => newStandard[k] + diff >= 0) || 'skills';
      newStandard[target] = newStandard[target] + diff;
    }

    setWeights(newStandard);
    update({ score_weights: newStandard });

    // Aplica nas perguntas customizadas
    if (onCustomWeightChange) {
      customScoredQuestions.forEach((q, i) => {
        const w = Math.max(0, newCustomWeights[i]);
        if (w !== q.weight) onCustomWeightChange(q.index, w);
      });
    }
  };

  const reachedLimit = customScoredQuestions.length >= maxCustomScored;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Score de Aderência
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Quanto melhor configurado, mais preciso será o cálculo de aderência dos candidatos.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Skills requeridas */}
        <div className="space-y-2">
          <Label className="text-sm">Habilidades requeridas</Label>
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="Ex: React, Node.js, SQL..."
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={addSkill}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {value.required_skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {value.required_skills.map((s) => (
                <Badge key={s} variant="secondary" className="gap-1 pr-1">
                  {s}
                  <button
                    type="button"
                    onClick={() => removeSkill(s)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            O sistema compara essas skills com as do candidato (insensível a maiúsculas e variações).
          </p>
        </div>

        {/* Área da vaga */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="job_area" className="text-sm">Área da vaga</Label>
            <Input
              id="job_area"
              value={value.job_area}
              onChange={(e) => update({ job_area: e.target.value })}
              placeholder="Ex: Desenvolvimento, Marketing"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="min_exp" className="text-sm">Anos mínimos de experiência</Label>
            <Input
              id="min_exp"
              type="number"
              min={0}
              step={0.5}
              value={value.min_experience_years || ''}
              onChange={(e) => update({ min_experience_years: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
        </div>

        {/* Formação */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edu_level" className="text-sm">Formação mínima</Label>
            <Select
              value={value.required_education_level || 'none'}
              onValueChange={(v) => update({ required_education_level: v === 'none' ? '' : v })}
            >
              <SelectTrigger id="edu_level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não exige</SelectItem>
                <SelectItem value="ensino_medio">Ensino Médio</SelectItem>
                <SelectItem value="tecnico">Técnico</SelectItem>
                <SelectItem value="superior">Superior</SelectItem>
                <SelectItem value="pos">Pós-graduação</SelectItem>
                <SelectItem value="mestrado">Mestrado</SelectItem>
                <SelectItem value="doutorado">Doutorado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edu_area" className="text-sm">Área da formação</Label>
            <Input
              id="edu_area"
              value={value.required_education_area}
              onChange={(e) => update({ required_education_area: e.target.value })}
              placeholder="Ex: Sistemas de Informação"
            />
          </div>
        </div>

        {/* Trabalho remoto */}
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label htmlFor="is_remote" className="text-sm cursor-pointer">Vaga 100% remota</Label>
            <p className="text-xs text-muted-foreground">
              Quando marcada, todos os candidatos pontuam o máximo em localização.
            </p>
          </div>
          <Switch
            id="is_remote"
            checked={value.is_remote}
            onCheckedChange={(v) => update({ is_remote: v })}
          />
        </div>

        {/* Pesos */}
        <div className="space-y-3 rounded-md border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <Label className="text-sm font-semibold">Pesos das categorias</Label>
              <p className="text-xs text-muted-foreground">
                Total:{' '}
                <span className={totalWeight === 100 ? 'text-foreground font-semibold' : 'text-destructive font-semibold'}>
                  {totalWeight}/100
                </span>
              </p>
            </div>
            <div className="flex gap-1.5">
              {totalWeight !== 100 && (
                <Button type="button" variant="outline" size="sm" onClick={redistributeTo100} className="gap-1.5">
                  <Wand2 className="h-3.5 w-3.5" />
                  Redistribuir para 100
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={resetWeights}>
                Padrão
              </Button>
            </div>
          </div>

          {(['skills', 'experience', 'education', 'location'] as const).map((key) => {
            const labels = {
              skills: 'Habilidades',
              experience: 'Experiência',
              education: 'Formação',
              location: 'Localização',
            };
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{labels[key]}</span>
                  <span className="font-medium tabular-nums">{weights[key]} pts</span>
                </div>
                <Slider
                  value={[weights[key]]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(v) => updateWeight(key, v[0])}
                />
              </div>
            );
          })}

          {/* Perguntas customizadas pontuáveis */}
          {customScoredQuestions.length > 0 && (
            <div className="space-y-2 pt-2 mt-2 border-t border-border/60">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                <Label className="text-xs font-semibold text-foreground">
                  Perguntas customizadas ({customScoredQuestions.length}/{maxCustomScored})
                </Label>
              </div>
              {customScoredQuestions.map((q) => (
                <div key={q.index} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="text-muted-foreground truncate" title={q.question}>
                      {q.question || `Pergunta ${q.index + 1}`}
                    </span>
                    <span className="font-medium tabular-nums whitespace-nowrap">{q.weight} pts</span>
                  </div>
                  <Slider
                    value={[q.weight]}
                    min={1}
                    max={100}
                    step={1}
                    onValueChange={(v) => onCustomWeightChange?.(q.index, v[0])}
                  />
                </div>
              ))}
            </div>
          )}

          {totalWeight !== 100 && (
            <div className="flex items-start gap-2 rounded border border-warning/30 bg-warning/10 p-2 text-xs text-warning-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                Os pesos somam <strong>{totalWeight}</strong>. O total precisa ser <strong>100</strong> para o score
                ficar entre 0–100. Use <strong>Redistribuir para 100</strong> para ajustar automaticamente.
              </span>
            </div>
          )}

          {reachedLimit && (
            <div className="flex items-start gap-2 rounded border border-primary/20 bg-primary/5 p-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
              <span>
                Limite de <strong>{maxCustomScored} perguntas customizadas pontuáveis</strong> atingido. Desmarque
                alguma para liberar espaço.
              </span>
            </div>
          )}
        </div>

        {/* Hint sobre perguntas customizadas */}
        <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">Quer perguntas além das padrões?</p>
            <p className="text-muted-foreground">
              Use a seção <strong>Perguntas customizadas (triagem)</strong> abaixo. Marque{' '}
              <strong>Contar no Score de Aderência</strong> em cada uma para que ela apareça aqui na tabela de pesos
              (até <strong>{maxCustomScored}</strong> perguntas).
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
