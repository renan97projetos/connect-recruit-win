import { useState, useEffect } from 'react';
import { CandidateLayout } from '@/components/CandidateLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Loader2
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
      const fileName = `${user.id}-cv-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      updateProfileMutation.mutate({ cv_url: publicUrl });
    } catch (error) {
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
                  />
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
                  <p className="text-sm text-muted-foreground">
                    CV enviado
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
                <Input
                  id="edu-degree"
                  placeholder="Ex: Bacharelado"
                  value={educationForm.degree}
                  onChange={(e) => setEducationForm({ ...educationForm, degree: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edu-field">Área *</Label>
                <Input
                  id="edu-field"
                  placeholder="Ex: Ciência da Computação"
                  value={educationForm.field}
                  onChange={(e) => setEducationForm({ ...educationForm, field: e.target.value })}
                />
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
