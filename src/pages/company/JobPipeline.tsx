import { useParams, useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { CandidatePipeline } from '@/components/company/CandidatePipeline';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

export default function JobPipeline() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobTitle, setJobTitle] = useState('');

  useEffect(() => {
    if (!id) return;
    supabase
      .from('jobs')
      .select('title')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setJobTitle(data.title);
      });
  }, [id]);

  const handleExportCSV = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('applications')
      .select('candidate_name, candidate_email, status, current_stage, score, applied_at')
      .eq('job_id', id)
      .order('applied_at', { ascending: false });

    if (!data || data.length === 0) {
      toast({ title: 'Nenhum candidato para exportar' });
      return;
    }

    const csv = Papa.unparse(
      data.map((a) => ({
        Nome: a.candidate_name,
        'E-mail': a.candidate_email,
        Etapa: a.current_stage || 'triagem',
        Status: a.status,
        Score: a.score ?? '',
        Candidatura: new Date(a.applied_at).toLocaleDateString('pt-BR'),
      }))
    );

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `candidatos-${(jobTitle || 'vaga').replace(/\s+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <CompanyLayout>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/company/dashboard')}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar para vagas
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {jobTitle || 'Vaga'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pipeline de candidatos desta vaga
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {id && <CandidatePipeline jobId={id} jobTitle={jobTitle} />}
    </CompanyLayout>
  );
}
