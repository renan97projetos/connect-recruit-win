import { useEffect, useState, useMemo } from 'react';
import { BackofficeLayout } from '@/components/backoffice/BackofficeLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ExternalLink, Save, Megaphone, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface JobRow {
  id: string;
  title: string;
  company_name: string;
  company_id: string | null;
  city: string | null;
  state: string | null;
  is_remote: boolean | null;
  job_type: string | null;
  location: string | null;
  experience_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  description: string | null;
  requirements: string[] | null;
  responsibilities: string[] | null;
  benefits: string[] | null;
  required_skills: string[] | null;
  job_area: string | null;
  required_education_level: string | null;
  required_education_area: string | null;
  created_at: string;
}

interface PublicationRequest {
  id: string;
  job_id: string;
  status: 'pending' | 'in_progress' | 'published' | 'dismissed';
  published_channels: string[];
  notes: string | null;
  handled_at: string | null;
  created_at: string;
  updated_at: string;
  job?: JobRow;
}

const STATUS_LABEL: Record<string, { label: string; variant: any }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  in_progress: { label: 'Em andamento', variant: 'default' },
  published: { label: 'Publicada', variant: 'outline' },
  dismissed: { label: 'Dispensada', variant: 'destructive' },
};

const CHANNELS = ['LinkedIn', 'Indeed', 'Google Jobs', 'WhatsApp', 'Instagram', 'Facebook', 'Outros'];

const fmtMoney = (v: number | null) =>
  v == null
    ? '—'
    : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function BackofficeJobPublications() {
  const [items, setItems] = useState<PublicationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<PublicationRequest | null>(null);
  const [draftStatus, setDraftStatus] = useState<string>('pending');
  const [draftChannels, setDraftChannels] = useState<string[]>([]);
  const [draftNotes, setDraftNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data: reqs, error } = await supabase
      .from('manual_publication_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const jobIds = (reqs || []).map((r: any) => r.job_id);
    let jobsById: Record<string, JobRow> = {};
    if (jobIds.length) {
      const { data: jobs } = await supabase
        .from('jobs')
        .select(
          'id,title,company_name,company_id,city,state,is_remote,job_type,location,experience_level,salary_min,salary_max,description,requirements,responsibilities,benefits,required_skills,job_area,required_education_level,required_education_area,created_at',
        )
        .in('id', jobIds);
      (jobs || []).forEach((j: any) => {
        jobsById[j.id] = j;
      });
    }

    setItems(
      (reqs || []).map((r: any) => ({ ...r, job: jobsById[r.job_id] })) as PublicationRequest[],
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const t = r.job?.title?.toLowerCase() || '';
        const c = r.job?.company_name?.toLowerCase() || '';
        if (!t.includes(q) && !c.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, statusFilter]);

  const counters = useMemo(() => {
    const c = { pending: 0, in_progress: 0, published: 0, dismissed: 0 };
    items.forEach((i) => {
      c[i.status as keyof typeof c] = (c[i.status as keyof typeof c] || 0) + 1;
    });
    return c;
  }, [items]);

  const openDetails = (r: PublicationRequest) => {
    setSelected(r);
    setDraftStatus(r.status);
    setDraftChannels(r.published_channels || []);
    setDraftNotes(r.notes || '');
  };

  const toggleChannel = (ch: string) => {
    setDraftChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    const update: any = {
      status: draftStatus,
      published_channels: draftChannels,
      notes: draftNotes || null,
    };
    if (draftStatus === 'published' || draftStatus === 'dismissed') {
      update.handled_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from('manual_publication_requests')
      .update(update)
      .eq('id', selected.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Atualizado' });
    setSelected(null);
    load();
  };

  const copyJobInfo = () => {
    if (!selected?.job) return;
    const j = selected.job;
    const loc = j.is_remote ? 'Remoto' : [j.city, j.state].filter(Boolean).join(', ') || '—';
    const url = `https://www.sinapserh.com.br/jobs/${j.id}`;
    const text = [
      `Vaga: ${j.title}`,
      `Empresa: ${j.company_name}`,
      `Local: ${loc}`,
      `Tipo: ${j.job_type || '—'}`,
      j.salary_min ? `Salário: ${fmtMoney(j.salary_min)}${j.salary_max ? ` - ${fmtMoney(j.salary_max)}` : ''}` : '',
      ``,
      j.description || '',
      ``,
      `Candidate-se: ${url}`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="w-6 h-6" /> Publicação Manual de Vagas
            </h1>
            <p className="text-sm text-muted-foreground">
              Controle das vagas que precisam ser divulgadas em canais externos.
            </p>
          </div>
          <Button variant="outline" onClick={load}>Atualizar</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['pending', 'in_progress', 'published', 'dismissed'] as const).map((s) => (
            <Card key={s}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{STATUS_LABEL[s].label}</p>
                <p className="text-2xl font-bold">{counters[s]}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Solicitações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por vaga ou empresa..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="in_progress">Em andamento</SelectItem>
                  <SelectItem value="published">Publicadas</SelectItem>
                  <SelectItem value="dismissed">Dispensadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">
                Nenhuma vaga aguardando publicação manual.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vaga</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Canais</TableHead>
                      <TableHead>Solicitada em</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => {
                      const j = r.job;
                      const loc = j?.is_remote
                        ? 'Remoto'
                        : [j?.city, j?.state].filter(Boolean).join(', ') || '—';
                      const st = STATUS_LABEL[r.status] || STATUS_LABEL.pending;
                      return (
                        <TableRow key={r.id} className="cursor-pointer" onClick={() => openDetails(r)}>
                          <TableCell className="font-medium">{j?.title || '—'}</TableCell>
                          <TableCell>{j?.company_name || '—'}</TableCell>
                          <TableCell>{loc}</TableCell>
                          <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                          <TableCell className="text-xs">
                            {r.published_channels?.length
                              ? r.published_channels.join(', ')
                              : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">Detalhes</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.job?.title || 'Vaga'}</DialogTitle>
          </DialogHeader>

          {selected?.job && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{selected.job.company_name}</Badge>
                {selected.job.job_type && <Badge variant="secondary">{selected.job.job_type}</Badge>}
                {selected.job.experience_level && (
                  <Badge variant="secondary">{selected.job.experience_level}</Badge>
                )}
                <a
                  href={`https://www.sinapserh.com.br/jobs/${selected.job.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                >
                  Ver no portal <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Local:</span> {selected.job.is_remote ? 'Remoto' : [selected.job.city, selected.job.state].filter(Boolean).join(', ') || '—'}</div>
                <div><span className="text-muted-foreground">Modalidade:</span> {selected.job.location || '—'}</div>
                <div><span className="text-muted-foreground">Área:</span> {selected.job.job_area || '—'}</div>
                <div><span className="text-muted-foreground">Salário:</span> {fmtMoney(selected.job.salary_min)}{selected.job.salary_max ? ` - ${fmtMoney(selected.job.salary_max)}` : ''}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Formação:</span> {[selected.job.required_education_level, selected.job.required_education_area].filter(Boolean).join(' — ') || '—'}</div>
              </div>

              {selected.job.description && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">DESCRIÇÃO</p>
                  <p className="text-sm whitespace-pre-wrap">{selected.job.description}</p>
                </div>
              )}

              {!!selected.job.requirements?.length && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">REQUISITOS</p>
                  <ul className="text-sm list-disc pl-5 space-y-0.5">
                    {selected.job.requirements.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {!!selected.job.benefits?.length && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">BENEFÍCIOS</p>
                  <ul className="text-sm list-disc pl-5 space-y-0.5">
                    {selected.job.benefits.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {!!selected.job.required_skills?.length && (
                <div className="flex flex-wrap gap-1">
                  {selected.job.required_skills.map((s, i) => (
                    <Badge key={i} variant="outline">{s}</Badge>
                  ))}
                </div>
              )}

              <Button variant="outline" size="sm" onClick={copyJobInfo}>
                {copied ? <><Check className="w-4 h-4 mr-2" /> Copiado</> : <><Copy className="w-4 h-4 mr-2" /> Copiar texto da vaga</>}
              </Button>

              <div className="border-t pt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium">Status da divulgação</label>
                  <Select value={draftStatus} onValueChange={setDraftStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="in_progress">Em andamento</SelectItem>
                      <SelectItem value="published">Publicada</SelectItem>
                      <SelectItem value="dismissed">Dispensada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Canais publicados</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {CHANNELS.map((ch) => (
                      <label key={ch} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={draftChannels.includes(ch)}
                          onCheckedChange={() => toggleChannel(ch)}
                        />
                        {ch}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Observações internas</label>
                  <Textarea
                    rows={3}
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    placeholder="Notas, links das publicações, etc."
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BackofficeLayout>
  );
}
