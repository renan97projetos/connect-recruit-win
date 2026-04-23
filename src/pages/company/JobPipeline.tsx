import { useParams, useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { CandidatePipeline } from '@/components/company/CandidatePipeline';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function JobPipeline() {
  const { id } = useParams();
  const navigate = useNavigate();
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
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">{jobTitle || 'Vaga'}</h1>
        <p className="text-muted-foreground">Pipeline de candidatos</p>
      </div>

      {id && <CandidatePipeline jobId={id} jobTitle={jobTitle} />}
    </CompanyLayout>
  );
}
