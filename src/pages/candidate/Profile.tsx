import { useState, useEffect } from 'react';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CandidateLayout } from '@/components/CandidateLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Trash2, 
  Upload, 
  User, 
  Briefcase, 
  GraduationCap, 
  Award,
  Save,
  X,
  Loader2,
  CalendarIcon
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PhoneInput } from '@/components/PhoneInput';

interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  current: boolean;
}

interface ProfileData {
  name: string;
  phone: string;
  birth_date: string;
  cpf: string;
  address: string;
  street: string;
  street_number: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  summary: string;
  linkedin_url: string;
  portfolio_url: string;
  experiences: Experience[];
  educations: Education[];
  skills: string[];
  cv_url: string;
}

export default function CandidateProfile() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Experience dialog state
  const [experienceDialog, setExperienceDialog] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [experienceForm, setExperienceForm] = useState({
    company: '',
    position: '',
    startDate: '',
    endDate: '',
    current: false,
    description: '',
  });

  // Education dialog state
  const [educationDialog, setEducationDialog] = useState(false);
  const [editingEducation, setEditingEducation] = useState<Education | null>(null);
  const [educationForm, setEducationForm] = useState({
    institution: '',
    degree: '',
    field: '',
    startDate: '',
    endDate: '',
    current: false,
  });

  // Skills state
  const [newSkill, setNewSkill] = useState('');

  // Fetch profile data
  const { data: profile, isLoading, error: profileError } = useQuery({
    queryKey: ['candidate-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // First try to get existing profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error);
        throw error;
      }
      
      // If no profile exists, create one
      if (!data) {
        const newProfile = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
        };
        
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
          
        if (createError) {
          console.error('Profile create error:', createError);
          throw createError;
        }
        
        return {
          ...createdProfile,
          experiences: [],
          educations: [],
          skills: [],
        } as ProfileData;
      }
      
      return {
        ...data,
        experiences: (data.experiences as any as Experience[]) || [],
        educations: (data.educations as any as Education[]) || [],
        skills: data.skills || [],
      } as ProfileData;
    },
    enabled: !!user,
    retry: 1,
    staleTime: 30000,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<ProfileData>) => {
      if (!user) throw new Error('No user');
      
      const dbUpdates: any = { ...updates };
      if (updates.experiences) {
        dbUpdates.experiences = updates.experiences as any;
      }
      if (updates.educations) {
        dbUpdates.educations = updates.educations as any;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-profile', user?.id] });
      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar suas informações.',
        variant: 'destructive',
      });
    },
  });

  const handleCepSearch = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          title: 'CEP não encontrado',
          variant: 'destructive',
        });
        return;
      }

      queryClient.setQueryData(['candidate-profile', user?.id], {
        ...profile,
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
      });
    } catch (error) {
      toast({
        title: 'Erro ao buscar CEP',
        description: 'Não foi possível buscar o endereço.',
        variant: 'destructive',
      });
    }
  };

  const handleSavePersonalInfo = async () => {
    if (!profile) return;
    
    updateProfileMutation.mutate({
      name: profile.name,
      phone: profile.phone,
      birth_date: profile.birth_date,
      cpf: profile.cpf,
      street: profile.street,
      street_number: profile.street_number,
      neighborhood: profile.neighborhood,
      city: profile.city,
      state: profile.state,
      zip_code: profile.zip_code,
      summary: profile.summary,
      linkedin_url: profile.linkedin_url,
      portfolio_url: profile.portfolio_url,
    });
  };

  const handleAddExperience = () => {
    setEditingExperience(null);
    setExperienceForm({
      company: '',
      position: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
    });
    setExperienceDialog(true);
  };

  const handleEditExperience = (exp: Experience) => {
    setEditingExperience(exp);
    setExperienceForm({
      company: exp.company,
      position: exp.position,
      startDate: exp.startDate,
      endDate: exp.endDate || '',
      current: exp.current,
      description: exp.description,
    });
    setExperienceDialog(true);
  };

  const handleSaveExperience = () => {
    if (!profile) return;

    const experience: Experience = {
      id: editingExperience?.id || uuidv4(),
      ...experienceForm,
      endDate: experienceForm.current ? undefined : experienceForm.endDate,
    };

    let updatedExperiences: Experience[];
    if (editingExperience) {
      updatedExperiences = profile.experiences.map(exp =>
        exp.id === editingExperience.id ? experience : exp
      );
    } else {
      updatedExperiences = [...profile.experiences, experience];
    }

    updateProfileMutation.mutate({ experiences: updatedExperiences });
    setExperienceDialog(false);
  };

  const handleDeleteExperience = (id: string) => {
    if (!profile) return;

    const updatedExperiences = profile.experiences.filter(exp => exp.id !== id);
    updateProfileMutation.mutate({ experiences: updatedExperiences });
  };

  const handleAddEducation = () => {
    setEditingEducation(null);
    setEducationForm({
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      current: false,
    });
    setEducationDialog(true);
  };

  const handleEditEducation = (edu: Education) => {
    setEditingEducation(edu);
    setEducationForm({
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field,
      startDate: edu.startDate,
      endDate: edu.endDate || '',
      current: edu.current,
    });
    setEducationDialog(true);
  };

  const handleSaveEducation = () => {
    if (!profile) return;

    const education: Education = {
      id: editingEducation?.id || uuidv4(),
      ...educationForm,
      endDate: educationForm.current ? undefined : educationForm.endDate,
    };

    let updatedEducations: Education[];
    if (editingEducation) {
      updatedEducations = profile.educations.map(edu =>
        edu.id === editingEducation.id ? education : edu
      );
    } else {
      updatedEducations = [...profile.educations, education];
    }

    updateProfileMutation.mutate({ educations: updatedEducations });
    setEducationDialog(false);
  };

  const handleDeleteEducation = (id: string) => {
    if (!profile) return;

    const updatedEducations = profile.educations.filter(edu => edu.id !== id);
    updateProfileMutation.mutate({ educations: updatedEducations });
  };

  const handleAddSkill = () => {
    if (!profile || !newSkill.trim()) return;

    if (profile.skills.includes(newSkill.trim())) {
      toast({
        title: 'Habilidade já existe',
        variant: 'destructive',
      });
      return;
    }

    const updatedSkills = [...profile.skills, newSkill.trim()];
    updateProfileMutation.mutate({ skills: updatedSkills });
    setNewSkill('');
  };

  const handleDeleteSkill = (skill: string) => {
    if (!profile) return;

    const updatedSkills = profile.skills.filter(s => s !== skill);
    updateProfileMutation.mutate({ skills: updatedSkills });
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const fileExt = file.name.split('.').pop();
      // Salvar na pasta do usuário para atender à política RLS
      const filePath = `${user.id}/cv-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      updateProfileMutation.mutate({ cv_url: publicUrl });
      
      toast({
        title: 'CV enviado!',
        description: 'Seu currículo foi atualizado com sucesso.',
      });
    } catch (error) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro ao enviar CV',
        description: 'Não foi possível fazer o upload do arquivo.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <CandidateLayout title="Meu Perfil" description="Carregando...">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CandidateLayout>
    );
  }

  if (profileError || !profile) {
    return (
      <CandidateLayout title="Meu Perfil" description="Perfil não encontrado">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Não foi possível carregar seu perfil.</p>
          <p className="text-sm text-muted-foreground">
            {profileError ? `Erro: ${(profileError as any).message}` : 'Perfil não encontrado para este usuário.'}
          </p>
        </div>
      </CandidateLayout>
    );
  }

  return (
    <CandidateLayout
      title="Meu Perfil"
      description="Gerencie suas informações e currículo"
    >
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">
            <User className="h-4 w-4 mr-2" />
            Dados Pessoais
          </TabsTrigger>
          <TabsTrigger value="experience">
            <Briefcase className="h-4 w-4 mr-2" />
            Experiências
          </TabsTrigger>
          <TabsTrigger value="education">
            <GraduationCap className="h-4 w-4 mr-2" />
            Formação
          </TabsTrigger>
          <TabsTrigger value="skills">
            <Award className="h-4 w-4 mr-2" />
            Habilidades
          </TabsTrigger>
        </TabsList>

        {/* Personal Info Tab */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>
                Mantenha seus dados atualizados para melhor experiência
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={profile.name || ''}
                    onChange={(e) => {
                      queryClient.setQueryData(['candidate-profile', user?.id], {
                        ...profile,
                        name: e.target.value
                      });
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <PhoneInput
                  label="Telefone"
                  required
                  value={profile.phone || ''}
                  onChange={(value) => {
                    queryClient.setQueryData(['candidate-profile', user?.id], {
                      ...profile,
                      phone: value
                    });
                  }}
                />
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Data de Nascimento *</Label>
                  <div className="relative">
                    <Input
                      id="birthDate"
                      type="date"
                      value={profile.birth_date || ''}
                      onChange={(e) => {
                        queryClient.setQueryData(['candidate-profile', user?.id], {
                          ...profile,
                          birth_date: e.target.value
                        });
                      }}
                      className="pr-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={profile.cpf || ''}
                  onChange={(e) => {
                    queryClient.setQueryData(['candidate-profile', user?.id], {
                      ...profile,
                      cpf: e.target.value
                    });
                  }}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Endereço</h3>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">CEP *</Label>
                  <Input
                    id="zipCode"
                    placeholder="00000-000"
                    value={profile.zip_code || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      queryClient.setQueryData(['candidate-profile', user?.id], {
                        ...profile,
                        zip_code: value
                      });
                    }}
                    onBlur={(e) => handleCepSearch(e.target.value)}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="street">Rua</Label>
                    <Input
                      id="street"
                      value={profile.street || ''}
                      onChange={(e) => {
                        queryClient.setQueryData(['candidate-profile', user?.id], {
                          ...profile,
                          street: e.target.value
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="streetNumber">Número</Label>
                    <Input
                      id="streetNumber"
                      value={profile.street_number || ''}
                      onChange={(e) => {
                        queryClient.setQueryData(['candidate-profile', user?.id], {
                          ...profile,
                          street_number: e.target.value
                        });
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={profile.neighborhood || ''}
                    onChange={(e) => {
                      queryClient.setQueryData(['candidate-profile', user?.id], {
                        ...profile,
                        neighborhood: e.target.value
                      });
                    }}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={profile.city || ''}
                      onChange={(e) => {
                        queryClient.setQueryData(['candidate-profile', user?.id], {
                          ...profile,
                          city: e.target.value
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      maxLength={2}
                      placeholder="UF"
                      value={profile.state || ''}
                      onChange={(e) => {
                        queryClient.setQueryData(['candidate-profile', user?.id], {
                          ...profile,
                          state: e.target.value.toUpperCase()
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Resumo Profissional</Label>
                <Textarea
                  id="summary"
                  placeholder="Conte um pouco sobre sua trajetória profissional..."
                  value={profile.summary || ''}
                  rows={4}
                  onChange={(e) => {
                    queryClient.setQueryData(['candidate-profile', user?.id], {
                      ...profile,
                      summary: e.target.value
                    });
                  }}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    placeholder="https://linkedin.com/in/seu-perfil"
                    value={profile.linkedin_url || ''}
                    onChange={(e) => {
                      queryClient.setQueryData(['candidate-profile', user?.id], {
                        ...profile,
                        linkedin_url: e.target.value
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolio">Portfólio</Label>
                  <Input
                    id="portfolio"
                    placeholder="https://seu-portfolio.com"
                    value={profile.portfolio_url || ''}
                    onChange={(e) => {
                      queryClient.setQueryData(['candidate-profile', user?.id], {
                        ...profile,
                        portfolio_url: e.target.value
                      });
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cv">Currículo (PDF)</Label>
                <div className="flex gap-2">
                  <Input
                    id="cv"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleCVUpload}
                    className="flex-1"
                  />
                  {profile.cv_url && (
                    <Button variant="outline" size="icon" asChild>
                      <a href={profile.cv_url} target="_blank" rel="noopener noreferrer">
                        <Upload className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
                {profile.cv_url && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    CV enviado: <span className="font-medium text-foreground">{profile.cv_url.split('/').pop()?.split('?')[0] || 'arquivo.pdf'}</span>
                  </p>
                )}
              </div>

              <Button 
                onClick={handleSavePersonalInfo} 
                disabled={updateProfileMutation.isPending} 
                className="w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experience Tab */}
        <TabsContent value="experience">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Experiências Profissionais</CardTitle>
                  <CardDescription>
                    Adicione suas experiências de trabalho
                  </CardDescription>
                </div>
                <Button onClick={handleAddExperience}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {profile.experiences.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma experiência adicionada ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {profile.experiences.map((exp) => (
                    <Card key={exp.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{exp.position}</h3>
                            <p className="text-muted-foreground">{exp.company}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(exp.startDate).toLocaleDateString('pt-BR', {
                                month: 'short',
                                year: 'numeric'
                              })} - {exp.current ? 'Atual' : new Date(exp.endDate!).toLocaleDateString('pt-BR', {
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                            <p className="text-sm mt-2">{exp.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditExperience(exp)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteExperience(exp.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Education Tab */}
        <TabsContent value="education">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Formação Acadêmica</CardTitle>
                  <CardDescription>
                    Adicione sua formação educacional
                  </CardDescription>
                </div>
                <Button onClick={handleAddEducation}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {profile.educations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma formação adicionada ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {profile.educations.map((edu) => (
                    <Card key={edu.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{edu.degree} em {edu.field}</h3>
                            <p className="text-muted-foreground">{edu.institution}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(edu.startDate).toLocaleDateString('pt-BR', {
                                month: 'short',
                                year: 'numeric'
                              })} - {edu.current ? 'Cursando' : new Date(edu.endDate!).toLocaleDateString('pt-BR', {
                                month: 'short',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditEducation(edu)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteEducation(edu.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <CardTitle>Habilidades</CardTitle>
              <CardDescription>
                Liste suas principais competências e tecnologias
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite uma habilidade..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                />
                <Button onClick={handleAddSkill}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {profile.skills.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma habilidade adicionada ainda</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-sm py-1.5 px-3">
                      {skill}
                      <button
                        onClick={() => handleDeleteSkill(skill)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Experience Dialog */}
      <Dialog open={experienceDialog} onOpenChange={setExperienceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingExperience ? 'Editar Experiência' : 'Nova Experiência'}
            </DialogTitle>
            <DialogDescription>
              Preencha os detalhes da sua experiência profissional
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exp-company">Empresa *</Label>
                <Input
                  id="exp-company"
                  value={experienceForm.company}
                  onChange={(e) => setExperienceForm({ ...experienceForm, company: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-position">Cargo *</Label>
                <Input
                  id="exp-position"
                  value={experienceForm.position}
                  onChange={(e) => setExperienceForm({ ...experienceForm, position: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exp-start">Data de Início *</Label>
                <Input
                  id="exp-start"
                  type="date"
                  value={experienceForm.startDate}
                  onChange={(e) => setExperienceForm({ ...experienceForm, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-end">Data de Término</Label>
                <Input
                  id="exp-end"
                  type="date"
                  value={experienceForm.endDate}
                  onChange={(e) => setExperienceForm({ ...experienceForm, endDate: e.target.value })}
                  disabled={experienceForm.current}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="exp-current"
                checked={experienceForm.current}
                onCheckedChange={(checked) =>
                  setExperienceForm({ ...experienceForm, current: checked as boolean })
                }
              />
              <Label htmlFor="exp-current" className="font-normal cursor-pointer">
                Trabalho aqui atualmente
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-description">Descrição</Label>
              <Textarea
                id="exp-description"
                rows={4}
                placeholder="Descreva suas responsabilidades e conquistas..."
                value={experienceForm.description}
                onChange={(e) => setExperienceForm({ ...experienceForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExperienceDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveExperience}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Education Dialog */}
      <Dialog open={educationDialog} onOpenChange={setEducationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEducation ? 'Editar Formação' : 'Nova Formação'}
            </DialogTitle>
            <DialogDescription>
              Preencha os detalhes da sua formação acadêmica
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edu-institution">Instituição *</Label>
              <Input
                id="edu-institution"
                value={educationForm.institution}
                onChange={(e) => setEducationForm({ ...educationForm, institution: e.target.value })}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edu-degree">Grau *</Label>
                <Select
                  value={educationForm.degree}
                  onValueChange={(value) => setEducationForm({ ...educationForm, degree: value })}
                >
                  <SelectTrigger id="edu-degree">
                    <SelectValue placeholder="Selecione o grau" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ensino Médio">Ensino Médio</SelectItem>
                    <SelectItem value="Técnico">Técnico</SelectItem>
                    <SelectItem value="Tecnólogo">Tecnólogo</SelectItem>
                    <SelectItem value="Bacharelado">Bacharelado</SelectItem>
                    <SelectItem value="Licenciatura">Licenciatura</SelectItem>
                    <SelectItem value="Pós-graduação">Pós-graduação</SelectItem>
                    <SelectItem value="MBA">MBA</SelectItem>
                    <SelectItem value="Mestrado">Mestrado</SelectItem>
                    <SelectItem value="Doutorado">Doutorado</SelectItem>
                    <SelectItem value="Pós-doutorado">Pós-doutorado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edu-field">Área *</Label>
                <Select
                  value={educationForm.field}
                  onValueChange={(value) => setEducationForm({ ...educationForm, field: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administração">Administração</SelectItem>
                    <SelectItem value="Administração Pública">Administração Pública</SelectItem>
                    <SelectItem value="Agronomia">Agronomia</SelectItem>
                    <SelectItem value="Análise e Desenvolvimento de Sistemas">Análise e Desenvolvimento de Sistemas</SelectItem>
                    <SelectItem value="Antropologia">Antropologia</SelectItem>
                    <SelectItem value="Arquitetura e Urbanismo">Arquitetura e Urbanismo</SelectItem>
                    <SelectItem value="Artes Cênicas">Artes Cênicas</SelectItem>
                    <SelectItem value="Artes Visuais">Artes Visuais</SelectItem>
                    <SelectItem value="Biblioteconomia">Biblioteconomia</SelectItem>
                    <SelectItem value="Biologia">Biologia</SelectItem>
                    <SelectItem value="Biomedicina">Biomedicina</SelectItem>
                    <SelectItem value="Ciência da Computação">Ciência da Computação</SelectItem>
                    <SelectItem value="Ciência de Dados">Ciência de Dados</SelectItem>
                    <SelectItem value="Ciências Atuariais">Ciências Atuariais</SelectItem>
                    <SelectItem value="Ciências Contábeis">Ciências Contábeis</SelectItem>
                    <SelectItem value="Ciências Econômicas">Ciências Econômicas</SelectItem>
                    <SelectItem value="Ciências Sociais">Ciências Sociais</SelectItem>
                    <SelectItem value="Cinema e Audiovisual">Cinema e Audiovisual</SelectItem>
                    <SelectItem value="Comércio Exterior">Comércio Exterior</SelectItem>
                    <SelectItem value="Comunicação Social">Comunicação Social</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Design de Interiores">Design de Interiores</SelectItem>
                    <SelectItem value="Design de Moda">Design de Moda</SelectItem>
                    <SelectItem value="Design Gráfico">Design Gráfico</SelectItem>
                    <SelectItem value="Direito">Direito</SelectItem>
                    <SelectItem value="Educação Física">Educação Física</SelectItem>
                    <SelectItem value="Enfermagem">Enfermagem</SelectItem>
                    <SelectItem value="Engenharia Aeronáutica">Engenharia Aeronáutica</SelectItem>
                    <SelectItem value="Engenharia Agrícola">Engenharia Agrícola</SelectItem>
                    <SelectItem value="Engenharia Ambiental">Engenharia Ambiental</SelectItem>
                    <SelectItem value="Engenharia Biomédica">Engenharia Biomédica</SelectItem>
                    <SelectItem value="Engenharia Civil">Engenharia Civil</SelectItem>
                    <SelectItem value="Engenharia da Computação">Engenharia da Computação</SelectItem>
                    <SelectItem value="Engenharia de Alimentos">Engenharia de Alimentos</SelectItem>
                    <SelectItem value="Engenharia de Controle e Automação">Engenharia de Controle e Automação</SelectItem>
                    <SelectItem value="Engenharia de Materiais">Engenharia de Materiais</SelectItem>
                    <SelectItem value="Engenharia de Minas">Engenharia de Minas</SelectItem>
                    <SelectItem value="Engenharia de Petróleo">Engenharia de Petróleo</SelectItem>
                    <SelectItem value="Engenharia de Produção">Engenharia de Produção</SelectItem>
                    <SelectItem value="Engenharia de Software">Engenharia de Software</SelectItem>
                    <SelectItem value="Engenharia de Telecomunicações">Engenharia de Telecomunicações</SelectItem>
                    <SelectItem value="Engenharia Elétrica">Engenharia Elétrica</SelectItem>
                    <SelectItem value="Engenharia Florestal">Engenharia Florestal</SelectItem>
                    <SelectItem value="Engenharia Mecânica">Engenharia Mecânica</SelectItem>
                    <SelectItem value="Engenharia Mecatrônica">Engenharia Mecatrônica</SelectItem>
                    <SelectItem value="Engenharia Naval">Engenharia Naval</SelectItem>
                    <SelectItem value="Engenharia Nuclear">Engenharia Nuclear</SelectItem>
                    <SelectItem value="Engenharia Química">Engenharia Química</SelectItem>
                    <SelectItem value="Estatística">Estatística</SelectItem>
                    <SelectItem value="Farmácia">Farmácia</SelectItem>
                    <SelectItem value="Filosofia">Filosofia</SelectItem>
                    <SelectItem value="Física">Física</SelectItem>
                    <SelectItem value="Fisioterapia">Fisioterapia</SelectItem>
                    <SelectItem value="Fonoaudiologia">Fonoaudiologia</SelectItem>
                    <SelectItem value="Gastronomia">Gastronomia</SelectItem>
                    <SelectItem value="Geografia">Geografia</SelectItem>
                    <SelectItem value="Gestão Ambiental">Gestão Ambiental</SelectItem>
                    <SelectItem value="Gestão Comercial">Gestão Comercial</SelectItem>
                    <SelectItem value="Gestão da Qualidade">Gestão da Qualidade</SelectItem>
                    <SelectItem value="Gestão de Recursos Humanos">Gestão de Recursos Humanos</SelectItem>
                    <SelectItem value="Gestão de TI">Gestão de TI</SelectItem>
                    <SelectItem value="Gestão Financeira">Gestão Financeira</SelectItem>
                    <SelectItem value="Gestão Hospitalar">Gestão Hospitalar</SelectItem>
                    <SelectItem value="Gestão Pública">Gestão Pública</SelectItem>
                    <SelectItem value="História">História</SelectItem>
                    <SelectItem value="Hotelaria">Hotelaria</SelectItem>
                    <SelectItem value="Jornalismo">Jornalismo</SelectItem>
                    <SelectItem value="Letras">Letras</SelectItem>
                    <SelectItem value="Logística">Logística</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Matemática">Matemática</SelectItem>
                    <SelectItem value="Medicina">Medicina</SelectItem>
                    <SelectItem value="Medicina Veterinária">Medicina Veterinária</SelectItem>
                    <SelectItem value="Música">Música</SelectItem>
                    <SelectItem value="Nutrição">Nutrição</SelectItem>
                    <SelectItem value="Oceanografia">Oceanografia</SelectItem>
                    <SelectItem value="Odontologia">Odontologia</SelectItem>
                    <SelectItem value="Pedagogia">Pedagogia</SelectItem>
                    <SelectItem value="Processos Gerenciais">Processos Gerenciais</SelectItem>
                    <SelectItem value="Psicologia">Psicologia</SelectItem>
                    <SelectItem value="Publicidade e Propaganda">Publicidade e Propaganda</SelectItem>
                    <SelectItem value="Química">Química</SelectItem>
                    <SelectItem value="Radiologia">Radiologia</SelectItem>
                    <SelectItem value="Redes de Computadores">Redes de Computadores</SelectItem>
                    <SelectItem value="Relações Internacionais">Relações Internacionais</SelectItem>
                    <SelectItem value="Relações Públicas">Relações Públicas</SelectItem>
                    <SelectItem value="Secretariado Executivo">Secretariado Executivo</SelectItem>
                    <SelectItem value="Segurança da Informação">Segurança da Informação</SelectItem>
                    <SelectItem value="Segurança do Trabalho">Segurança do Trabalho</SelectItem>
                    <SelectItem value="Serviço Social">Serviço Social</SelectItem>
                    <SelectItem value="Sistemas de Informação">Sistemas de Informação</SelectItem>
                    <SelectItem value="Sociologia">Sociologia</SelectItem>
                    <SelectItem value="Teologia">Teologia</SelectItem>
                    <SelectItem value="Terapia Ocupacional">Terapia Ocupacional</SelectItem>
                    <SelectItem value="Turismo">Turismo</SelectItem>
                    <SelectItem value="Zootecnia">Zootecnia</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edu-start">Data de Início *</Label>
                <Input
                  id="edu-start"
                  type="date"
                  value={educationForm.startDate}
                  onChange={(e) => setEducationForm({ ...educationForm, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edu-end">Data de Conclusão</Label>
                <Input
                  id="edu-end"
                  type="date"
                  value={educationForm.endDate}
                  onChange={(e) => setEducationForm({ ...educationForm, endDate: e.target.value })}
                  disabled={educationForm.current}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edu-current"
                checked={educationForm.current}
                onCheckedChange={(checked) =>
                  setEducationForm({ ...educationForm, current: checked as boolean })
                }
              />
              <Label htmlFor="edu-current" className="font-normal cursor-pointer">
                Cursando atualmente
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEducationDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEducation}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CandidateLayout>
  );
}
