import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CandidateProfileView } from '@/components/CandidateProfileView';

export default function CandidateView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any | null>(null);
  const [email, setEmail] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      // Pega o e-mail mais recente da tabela applications
      const { data: appData } = await supabase
        .from('applications')
        .select('candidate_email')
        .eq('candidate_id', id)
        .order('applied_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profileData) {
        setProfile({
          ...profileData,
          experiences: Array.isArray(profileData.experiences) ? profileData.experiences : [],
          educations: Array.isArray(profileData.educations) ? profileData.educations : [],
          skills: Array.isArray(profileData.skills) ? profileData.skills : [],
        });
      }
      if (appData?.candidate_email) setEmail(appData.candidate_email);

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
          onClick={() => navigate(-1)}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">Perfil do candidato</h1>
        <p className="text-muted-foreground">
          Visualização das informações cadastradas pelo candidato.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando perfil...</p>
      ) : !profile ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            Perfil não encontrado ou ainda não preenchido pelo candidato.
          </p>
        </Card>
      ) : (
        <CandidateProfileView profile={profile} email={email} />
      )}
    </CompanyLayout>
  );
}
