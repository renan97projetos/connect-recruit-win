import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowRight, ArrowLeft, Sparkles, Users, AlertCircle, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';

interface FunnelData {
  vacancyVolume: number;
  teamSize: string;
  mainChallenge: string;
  essentialFeatures: string[];
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  jobTitle: string;
  phone: string;
  country: string;
  newsletter: boolean;
  termsAccepted: boolean;
}

export default function ProspectFunnel() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FunnelData>({
    vacancyVolume: 10,
    teamSize: '',
    mainChallenge: '',
    essentialFeatures: [],
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    jobTitle: '',
    phone: '',
    country: '',
    newsletter: false,
    termsAccepted: false
  });

  const updateData = (field: keyof FunnelData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const toggleFeature = (feature: string) => {
    setData(prev => ({
      ...prev,
      essentialFeatures: prev.essentialFeatures.includes(feature)
        ? prev.essentialFeatures.filter(f => f !== feature)
        : [...prev.essentialFeatures, feature]
    }));
  };

  const handleNext = () => {
    if (step === 2 && !data.teamSize) {
      toast.error('Por favor, selecione o tamanho da equipe');
      return;
    }
    if (step === 3 && !data.mainChallenge) {
      toast.error('Por favor, selecione seu maior desafio');
      return;
    }
    if (step === 4 && data.essentialFeatures.length === 0) {
      toast.error('Por favor, selecione ao menos uma funcionalidade');
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!data.email) {
      toast.error('Email é obrigatório');
      return;
    }
    
    if (!data.termsAccepted) {
      toast.error('Você precisa aceitar o processamento de dados pessoais');
      return;
    }

    setLoading(true);

    try {
      // Enviar email com os dados do funil
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: `${data.firstName} ${data.lastName}`.trim() || 'Prospect',
          email: data.email,
          phone: data.phone || '',
          isFunnel: true,
          funnelData: {
            vacancyVolume: data.vacancyVolume,
            teamSize: data.teamSize,
            mainChallenge: data.mainChallenge,
            essentialFeatures: data.essentialFeatures,
            organization: data.organization,
            jobTitle: data.jobTitle,
            country: data.country
          },
          message: ''
        }
      });

      if (error) throw error;

      toast.success('Obrigado! Entraremos em contato em breve.');
      navigate('/');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao enviar formulário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Card className="max-w-3xl mx-auto border-2 border-primary/20 shadow-xl">
            <CardHeader className="text-center space-y-4 pb-8">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-full flex items-center justify-center shadow-lg">
                <Sparkles className="h-10 w-10 text-primary-foreground" />
              </div>
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Otimize seu processo de Recrutamento e Seleção
              </CardTitle>
              <CardDescription className="text-lg">
                Descubra se nosso SaaS é ideal para sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              <p className="text-center text-muted-foreground">
                Responda algumas perguntas rápidas para receber uma análise personalizada.
              </p>
              <Button 
                onClick={() => setStep(1)} 
                size="lg" 
                className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Começar
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        );

      case 1:
        return (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-bold">1</span>
                </div>
                <CardTitle className="text-2xl">Quantas vagas você abre por mês?</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-5xl font-bold text-primary">{data.vacancyVolume}</p>
                  <p className="text-sm text-muted-foreground mt-2">vagas por mês</p>
                </div>
                <Slider
                  value={[data.vacancyVolume]}
                  onValueChange={(value) => updateData('vacancyVolume', value[0])}
                  min={1}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>1</span>
                  <span>100+</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" size="lg" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={handleNext} size="lg" className="w-full">
                  Próximo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-2xl">Qual é o tamanho da sua equipe de RH?</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Select value={data.teamSize} onValueChange={(value) => updateData('teamSize', value)}>
                <SelectTrigger className="h-14 text-lg">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-5">1-5 pessoas</SelectItem>
                  <SelectItem value="6-10">6-10 pessoas</SelectItem>
                  <SelectItem value="11-20">11-20 pessoas</SelectItem>
                  <SelectItem value="20+">Mais de 20 pessoas</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" size="lg" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={handleNext} size="lg" className="w-full">
                  Próximo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-2xl">Qual é seu maior desafio atual no processo seletivo?</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={data.mainChallenge} onValueChange={(value) => updateData('mainChallenge', value)}>
                <div className="space-y-3">
                  {[
                    { value: 'volume', label: 'Alto volume de candidatos' },
                    { value: 'quality', label: 'Baixa qualidade dos candidatos' },
                    { value: 'time', label: 'Tempo gasto na triagem' },
                    { value: 'automation', label: 'Falta de automação' }
                  ].map((option) => (
                    <div key={option.value} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="flex-1 cursor-pointer text-base">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" size="lg" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={handleNext} size="lg" className="w-full">
                  Próximo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Wand2 className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-2xl">Quais funcionalidades você considera essenciais?</CardTitle>
              </div>
              <CardDescription>Selecione todas que se aplicam</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {[
                  { id: 'screening', label: 'Triagem automática' },
                  { id: 'talent-pool', label: 'Banco de talentos' },
                  { id: 'video-interviews', label: 'Entrevistas por vídeo' },
                  { id: 'ats-integration', label: 'Integrações com ATS' },
                  { id: 'communication', label: 'Automação de comunicação' }
                ].map((feature) => (
                  <div key={feature.id} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent transition-colors">
                    <Checkbox
                      id={feature.id}
                      checked={data.essentialFeatures.includes(feature.id)}
                      onCheckedChange={() => toggleFeature(feature.id)}
                    />
                    <Label htmlFor={feature.id} className="flex-1 cursor-pointer text-base">
                      {feature.label}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" size="lg" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={handleNext} size="lg" className="w-full">
                  Próximo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Preencha seus dados para receber sua avaliação personalizada</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={data.firstName}
                      onChange={(e) => updateData('firstName', e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={data.lastName}
                      onChange={(e) => updateData('lastName', e.target.value)}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={data.email}
                    onChange={(e) => updateData('email', e.target.value)}
                    placeholder="john.doe@company.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">Organization name</Label>
                  <Input
                    id="organization"
                    value={data.organization}
                    onChange={(e) => updateData('organization', e.target.value)}
                    placeholder="Company Inc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job title</Label>
                  <Input
                    id="jobTitle"
                    value={data.jobTitle}
                    onChange={(e) => updateData('jobTitle', e.target.value)}
                    placeholder="HR Manager"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={data.phone}
                    onChange={(e) => updateData('phone', e.target.value)}
                    placeholder="+55 11 99999-9999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select value={data.country} onValueChange={(value) => updateData('country', value)}>
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BR">Brasil</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="PT">Portugal</SelectItem>
                      <SelectItem value="ES">España</SelectItem>
                      <SelectItem value="Other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="newsletter"
                      checked={data.newsletter}
                      onCheckedChange={(checked) => updateData('newsletter', checked === true)}
                    />
                    <Label htmlFor="newsletter" className="cursor-pointer text-sm">
                      Subscribe to newsletter
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms"
                      required
                      checked={data.termsAccepted}
                      onCheckedChange={(checked) => updateData('termsAccepted', checked === true)}
                    />
                    <Label htmlFor="terms" className="cursor-pointer text-sm">
                      I agree to the <a href="/privacy-policy" className="underline text-primary hover:text-primary/80">processing of personal data</a> *
                    </Label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" onClick={handleBack} variant="outline" size="lg" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                  <Button type="submit" size="lg" className="w-full" disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar'}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        {/* Progress bar */}
        {step > 0 && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Etapa {step} de 5</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        {renderStep()}
      </div>
      <Footer />
    </div>
  );
}
