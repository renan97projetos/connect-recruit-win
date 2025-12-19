import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const DOCUMENT_TYPES = [
  { id: 'rg_frente', label: 'RG (Frente)' },
  { id: 'rg_verso', label: 'RG (Verso)' },
  { id: 'cpf', label: 'CPF' },
  { id: 'comprovante_residencia', label: 'Comprovante de Residência' },
  { id: 'ctps', label: 'Carteira de Trabalho' },
  { id: 'titulo_eleitor', label: 'Título de Eleitor' },
  { id: 'reservista', label: 'Certificado de Reservista' },
  { id: 'escolaridade', label: 'Comprovante de Escolaridade' },
  { id: 'certidao', label: 'Certidão de Nascimento/Casamento' },
  { id: 'foto_3x4', label: 'Foto 3x4' },
];

export default function UploadDocuments() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<any>(null);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, File>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadApplication();
  }, [applicationId]);

  const loadApplication = async () => {
    if (!applicationId) return;

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        jobs (
          title
        )
      `)
      .eq('id', applicationId)
      .maybeSingle();

    if (error || !data) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as informações da candidatura.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    setApplication(data);
    setLoading(false);
  };

  const handleFileChange = (docType: string, file: File | null) => {
    if (!file) {
      const newDocs = { ...uploadedDocs };
      delete newDocs[docType];
      setUploadedDocs(newDocs);
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10485760) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O arquivo deve ter no máximo 10MB.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Tipo de arquivo inválido',
        description: 'Apenas PDF, JPG e PNG são permitidos.',
        variant: 'destructive',
      });
      return;
    }

    setUploadedDocs(prev => ({ ...prev, [docType]: file }));
  };

  const handleUpload = async () => {
    if (Object.keys(uploadedDocs).length === 0) {
      toast({
        title: 'Nenhum documento selecionado',
        description: 'Selecione pelo menos um documento para enviar.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = Object.keys(uploadedDocs).length;
      let uploadedCount = 0;

      for (const [docType, file] of Object.entries(uploadedDocs)) {
        const fileName = `${applicationId}/${docType}_${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('hiring-documents')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        uploadedCount++;
        setUploadProgress((uploadedCount / totalFiles) * 100);
      }

      toast({
        title: 'Documentos enviados!',
        description: 'Seus documentos foram enviados com sucesso.',
      });

      setUploadedDocs({});
    } catch (error: any) {
      console.error('Error uploading documents:', error);
      toast({
        title: 'Erro ao enviar documentos',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-center">Candidatura não encontrada</CardTitle>
            <CardDescription className="text-center">
              Não foi possível encontrar esta candidatura.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">Parabéns pela aprovação!</CardTitle>
                <CardDescription className="text-base mt-1">
                  Vaga: {application.jobs?.title}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm">
                <strong>Candidato:</strong> {application.candidate_name}
              </p>
              <p className="text-sm mt-1">
                <strong>Email:</strong> {application.candidate_email}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">📋 Documentos para Upload</h3>
              <div className="grid gap-4">
                {DOCUMENT_TYPES.map(docType => (
                  <div key={docType.id} className="space-y-2">
                    <Label htmlFor={docType.id} className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {docType.label}
                      {uploadedDocs[docType.id] && (
                        <CheckCircle className="h-4 w-4 text-primary ml-auto" />
                      )}
                    </Label>
                    <Input
                      id={docType.id}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(docType.id, e.target.files?.[0] || null)}
                      disabled={uploading}
                    />
                    {uploadedDocs[docType.id] && (
                      <p className="text-xs text-muted-foreground">
                        Arquivo: {uploadedDocs[docType.id].name} ({(uploadedDocs[docType.id].size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Enviando documentos...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Importante:</strong> Envie apenas arquivos em formato PDF, JPG ou PNG, com tamanho máximo de 10MB cada.
              </p>
            </div>

            <Button 
              onClick={handleUpload} 
              disabled={uploading || Object.keys(uploadedDocs).length === 0}
              size="lg"
              className="w-full"
            >
              <Upload className="mr-2 h-5 w-5" />
              {uploading ? 'Enviando...' : `Enviar ${Object.keys(uploadedDocs).length} Documento(s)`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}