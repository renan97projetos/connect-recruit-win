import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CandidatePipeline } from '@/components/company/CandidatePipeline';

export default function JobPipeline() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasJob, setHasJob] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('jobs')
        .select('title')
        .eq('id', id)
        .maybeSingle();
      if (data) {
        setJobTitle(data.title);
        setHasJob(true);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  return (
    <CompanyLayout>
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/company/dashboard')}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para vagas
        </Button>
        <h1 className="text-3xl font-bold">{jobTitle || 'Vaga'}</h1>
        <p className="text-muted-foreground">
          Pipeline de candidatos desta vaga
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : !hasJob || !id ? (
        <Card className="p-12 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Vaga não encontrada.</p>
        </Card>
      ) : (
        <CandidatePipeline jobId={id} jobTitle={jobTitle} />
      )}
    </CompanyLayout>
  );
}
