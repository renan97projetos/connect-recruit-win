import { useState, useEffect } from 'react';
import { CandidateLayout } from '@/components/CandidateLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  FileText,
  ExternalLink
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
import { BRAZIL_STATES, fetchCitiesByState } from '@/lib/brazilLocations';
import { INTEREST_AREAS, ALL_ROLES, OTHER_OPTION, getRolesForArea } from '@/lib/candidateRoles';

const CANDIDATE_PREREGISTRATION_KEY = 'candidate_preregistration';

function getCandidatePreregistration(userEmail?: string) {
  if (typeof window === 'undefined') return null;

  try {
    const normalizedEmail = userEmail?.toLowerCase().trim();
    const scopedKey = normalizedEmail
      ? `${CANDIDATE_PREREGISTRATION_KEY}:${normalizedEmail}`
      : null;
    const raw = (scopedKey ? window.localStorage.getItem(scopedKey) : null)
      || window.localStorage.getItem(CANDIDATE_PREREGISTRATION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (normalizedEmail && parsed?.email && parsed.email.toLowerCase().trim() !== normalizedEmail) return null;

    return {
      city: typeof parsed?.city === 'string' ? parsed.city : '',
      state: typeof parsed?.state === 'string' ? parsed.state : '',
      desired_role: typeof parsed?.desired_role === 'string' ? parsed.desired_role : '',
      cv_url: typeof parsed?.cv_url === 'string' ? parsed.cv_url : '',
    };
  } catch {
    return null;
  }
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const dmy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    let [, d, m, y] = dmy;
    let yearNum = parseInt(y, 10);
    if (yearNum < 100) yearNum += 2000;

    const dayNum = parseInt(d, 10);
    const monthNum = parseInt(m, 10);
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return null;

    const result = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
    if (result.getUTCDate() !== dayNum || result.getUTCMonth() !== monthNum - 1) return null;
    return result;
  }

  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const result = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
    if (result.getUTCDate() !== +iso[3] || result.getUTCMonth() !== +iso[2] - 1) return null;
    return result;
  }

  return null;
}

function formatDateForDisplay(dateStr?: string) {
  const parsed = dateStr ? parseDate(dateStr) : null;
  if (!parsed) return '';

  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const year = parsed.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateToIso(dateStr: string) {
  const parsed = parseDate(dateStr);
  if (!parsed) return null;

  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const year = parsed.getUTCFullYear();
  return `${year}-${month}-${day}`;
}

function pickFallbackValue(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0) || '';
}

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
  desired_role: string;
  interest_area: string;
  linkedin_url: string;
  portfolio_url: string;
  experiences: Experience[];
  educations: Education[];
  skills: Array<{ name: string; level: 'basico' | 'intermediario' | 'avancado' }> | string[];
  cv_url: string;
  avatar_url?: string;
}

interface Skill {
  name: string;
  level: 'basico' | 'intermediario' | 'avancado';
}

const SKILL_SUGGESTIONS: { name: string; level: 'basico' | 'intermediario' | 'avancado' }[] = [
  // Ferramentas de escritório - geralmente intermediário
  { name: 'Microsoft Excel', level: 'intermediario' },
  { name: 'Microsoft Word', level: 'intermediario' },
  { name: 'Microsoft PowerPoint', level: 'intermediario' },
  { name: 'Google Sheets', level: 'intermediario' },
  { name: 'Pacote Office', level: 'intermediario' },
  // Sistemas corporativos - geralmente básico para iniciantes
  { name: 'SAP', level: 'basico' },
  { name: 'ERP', level: 'basico' },
  { name: 'CRM', level: 'basico' },
  { name: 'Salesforce', level: 'basico' },
  { name: 'Power BI', level: 'intermediario' },
  // Idiomas - geralmente intermediário
  { name: 'Inglês', level: 'intermediario' },
  { name: 'Espanhol', level: 'basico' },
  { name: 'Alemão', level: 'basico' },
  { name: 'Francês', level: 'basico' },
  { name: 'Mandarim', level: 'basico' },
  // Soft skills - geralmente intermediário
  { name: 'Liderança', level: 'intermediario' },
  { name: 'Gestão de Pessoas', level: 'intermediario' },
  { name: 'Gestão de Projetos', level: 'intermediario' },
  { name: 'Comunicação', level: 'avancado' },
  { name: 'Trabalho em Equipe', level: 'avancado' },
  { name: 'Resolução de Problemas', level: 'intermediario' },
  { name: 'Pensamento Crítico', level: 'intermediario' },
  // Comercial
  { name: 'Negociação', level: 'intermediario' },
  { name: 'Vendas', level: 'intermediario' },
  { name: 'Atendimento ao Cliente', level: 'intermediario' },
  { name: 'Marketing Digital', level: 'basico' },
  { name: 'SEO', level: 'basico' },
  { name: 'Google Ads', level: 'basico' },
  { name: 'Facebook Ads', level: 'basico' },
  { name: 'Redes Sociais', level: 'intermediario' },
  // Programação
  { name: 'JavaScript', level: 'intermediario' },
  { name: 'Python', level: 'intermediario' },
  { name: 'Java', level: 'intermediario' },
  { name: 'SQL', level: 'intermediario' },
  { name: 'React', level: 'intermediario' },
  { name: 'Node.js', level: 'intermediario' },
  { name: 'HTML', level: 'intermediario' },
  { name: 'CSS', level: 'intermediario' },
  { name: 'Git', level: 'basico' },
  // Design e ferramentas visuais
  { name: 'Photoshop', level: 'intermediario' },
  { name: 'Illustrator', level: 'intermediario' },
  { name: 'Figma', level: 'intermediario' },
  { name: 'Canva', level: 'intermediario' },
  { name: 'AutoCAD', level: 'intermediario' },
  // Administrativo
  { name: 'Contabilidade', level: 'intermediario' },
  { name: 'Finanças', level: 'intermediario' },
  { name: 'Análise de Dados', level: 'intermediario' },
  { name: 'Logística', level: 'intermediario' },
  // RH
  { name: 'Recrutamento', level: 'intermediario' },
  { name: 'Treinamento', level: 'intermediario' },
  { name: 'Departamento Pessoal', level: 'intermediario' },
  // Qualidade
  { name: 'ISO 9001', level: 'basico' },
  { name: 'Lean', level: 'basico' },
  { name: 'Six Sigma', level: 'basico' },
];

const SKILL_LEVELS = {
  basico: { label: 'Básico', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  intermediario: { label: 'Intermediário', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  avancado: { label: 'Avançado', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' }
};

export default function CandidateProfile() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // "Outros" toggles for area de interesse / cargo (free-text mode)
  const [interestAreaOther, setInterestAreaOther] = useState(false);
  const [desiredRoleOther, setDesiredRoleOther] = useState(false);

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
  const [newSkillLevel, setNewSkillLevel] = useState<'basico' | 'intermediario' | 'avancado'>('intermediario');

  // Cities by selected state
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [currentStateLoaded, setCurrentStateLoaded] = useState<string>('');
  const [birthDateInput, setBirthDateInput] = useState('');

  // Helper to normalize skills (handles string[], JSON strings, and Skill[] formats)
  const normalizeSkills = (skills: any[] | null): Skill[] => {
    if (!skills || skills.length === 0) return [];
    
    return skills.map(skill => {
      // If it's already a proper Skill object
      if (typeof skill === 'object' && skill !== null && typeof skill.name === 'string' && !skill.name.startsWith('{')) {
        return { name: skill.name, level: skill.level || 'intermediario' } as Skill;
      }
      
      // If it's a string (could be plain text or JSON)
      if (typeof skill === 'string') {
        try {
          let parsed = JSON.parse(skill);
          // Handle nested JSON strings
          while (typeof parsed.name === 'string' && parsed.name.startsWith('{')) {
            parsed = JSON.parse(parsed.name);
          }
          return { name: parsed.name, level: parsed.level || 'intermediario' } as Skill;
        } catch {
          // Plain string skill
          return { name: skill, level: 'intermediario' as const };
        }
      }
      
      // If skill.name is a JSON string (corrupted data)
      if (typeof skill === 'object' && typeof skill.name === 'string' && skill.name.startsWith('{')) {
        try {
          let parsed = JSON.parse(skill.name);
          while (typeof parsed.name === 'string' && parsed.name.startsWith('{')) {
            parsed = JSON.parse(parsed.name);
          }
          return { name: parsed.name, level: parsed.level || 'intermediario' } as Skill;
        } catch {
          return { name: skill.name, level: skill.level || 'intermediario' } as Skill;
        }
      }
      
      return { name: String(skill), level: 'intermediario' as const };
    }).filter(s => s.name && !s.name.startsWith('{'));
  };

  // Fetch profile data
  const { data: profile, isLoading, error: profileError } = useQuery({
    queryKey: ['candidate-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const metadata = user.user_metadata || {};
      const preregistrationData = getCandidatePreregistration(user.email);
      const authFallbackFields = {
        city: pickFallbackValue(
          typeof metadata.city === 'string' ? metadata.city : '',
          typeof user.user_metadata?.city === 'string' ? user.user_metadata.city : ''
        ),
        state: pickFallbackValue(
          typeof metadata.state === 'string' ? metadata.state : '',
          typeof user.user_metadata?.state === 'string' ? user.user_metadata.state : ''
        ),
        desired_role: pickFallbackValue(
          typeof metadata.desired_role === 'string' ? metadata.desired_role : '',
          typeof user.user_metadata?.desired_role === 'string' ? user.user_metadata.desired_role : ''
        ),
        cv_url: pickFallbackValue(
          typeof metadata.cv_url === 'string' ? metadata.cv_url : '',
          typeof user.user_metadata?.cv_url === 'string' ? user.user_metadata.cv_url : ''
        ),
      };
      const fallbackProfileFields = {
        city: pickFallbackValue(preregistrationData?.city, authFallbackFields.city),
        state: pickFallbackValue(preregistrationData?.state, authFallbackFields.state),
        desired_role: pickFallbackValue(preregistrationData?.desired_role, authFallbackFields.desired_role),
        cv_url: pickFallbackValue(preregistrationData?.cv_url, authFallbackFields.cv_url),
      };
      
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
      
      // If no profile exists, create one (use upsert to handle race with handle_new_user trigger)
      if (!data) {
        const newProfile = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
          city: fallbackProfileFields.city || null,
          state: fallbackProfileFields.state || null,
          desired_role: fallbackProfileFields.desired_role || null,
          cv_url: fallbackProfileFields.cv_url || null,
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .upsert(newProfile, { onConflict: 'id' })
          .select()
          .single();

        if (createError) {
          console.error('Profile create error:', createError);
          // Foreign key violation: auth.users does not contain this id anymore
          // (e.g. user was deleted but session is still cached on the client).
          if ((createError as any)?.code === '23503') {
            throw new Error(
              'Sua sessão expirou ou sua conta não está mais ativa. Faça logout e entre novamente.'
            );
          }
          throw createError;
        }

        return {
          ...createdProfile,
          experiences: [],
          educations: [],
          skills: [],
        } as ProfileData;
      }

      const mergedProfile = {
        ...data,
        city: data.city || fallbackProfileFields.city,
        state: data.state || fallbackProfileFields.state,
        desired_role: data.desired_role || fallbackProfileFields.desired_role,
        cv_url: data.cv_url || fallbackProfileFields.cv_url,
      };

      if (
        (!data.city && fallbackProfileFields.city) ||
        (!data.state && fallbackProfileFields.state) ||
        (!data.desired_role && fallbackProfileFields.desired_role) ||
        (!data.cv_url && fallbackProfileFields.cv_url)
      ) {
        await supabase
          .from('profiles')
          .update({
            city: mergedProfile.city,
            state: mergedProfile.state,
            desired_role: mergedProfile.desired_role,
            cv_url: mergedProfile.cv_url,
          })
          .eq('id', user.id);
      }
      
      return {
        ...mergedProfile,
        experiences: (data.experiences as any as Experience[]) || [],
        educations: (data.educations as any as Education[]) || [],
        skills: data.skills || [],
      } as ProfileData;
    },
    enabled: !!user,
    retry: 1,
    staleTime: 30000,
  });

  // Carrega cidades sempre que o estado do perfil mudar
  useEffect(() => {
    const uf = profile?.state;
    if (!uf) {
      setCities([]);
      setCurrentStateLoaded('');
      return;
    }
    if (uf === currentStateLoaded) return;
    let cancelled = false;
    setLoadingCities(true);
    fetchCitiesByState(uf)
      .then((list) => {
        if (!cancelled) {
          setCities(list);
          setCurrentStateLoaded(uf);
        }
      })
      .finally(() => { if (!cancelled) setLoadingCities(false); });
    return () => { cancelled = true; };
  }, [profile?.state, currentStateLoaded]);

  useEffect(() => {
    const formatted = formatDateForDisplay(profile?.birth_date || '');
    // Só sincroniza com o profile se o input atual NÃO corresponde ao mesmo valor ISO.
    // Isso evita reescrever o que o usuário está digitando (ex.: ao digitar o ano).
    setBirthDateInput((current) => {
      const currentIso = formatDateToIso(current);
      const profileIso = profile?.birth_date || '';
      if (currentIso && currentIso === profileIso) return current;
      // Se o usuário está no meio da digitação (texto não vazio sem ISO válido),
      // preserva o que ele digitou e não sobrescreve com o valor do profile.
      if (current && !currentIso && !profileIso) return current;
      return formatted;
    });
  }, [profile?.birth_date]);

  // Inicializa modo "Outros" quando o perfil carrega com valores fora das listas
  useEffect(() => {
    if (profile?.interest_area && !INTEREST_AREAS.includes(profile.interest_area)) {
      setInterestAreaOther(true);
    }
    if (profile?.desired_role && !ALL_ROLES.includes(profile.desired_role)) {
      setDesiredRoleOther(true);
    }
  }, [profile?.interest_area, profile?.desired_role]);


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
      desired_role: profile.desired_role,
      interest_area: profile.interest_area,
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

  const handleAddSkill = (skillName?: string, skillLevel?: 'basico' | 'intermediario' | 'avancado') => {
    if (!profile) return;
    const skillToAdd = skillName || newSkill.trim();
    if (!skillToAdd) return;

    const currentSkills = normalizeSkills(profile.skills);
    
    if (currentSkills.some(s => s.name.toLowerCase() === skillToAdd.toLowerCase())) {
      toast({
        title: 'Habilidade já existe',
        variant: 'destructive',
      });
      return;
    }

    // Use o nível passado como parâmetro (para sugestões) ou o nível do dropdown (para input manual)
    const levelToUse = skillLevel || newSkillLevel;
    const newSkillObj: Skill = { name: skillToAdd, level: levelToUse };
    const updatedSkills = [...currentSkills, newSkillObj];
    updateProfileMutation.mutate({ skills: updatedSkills as any });
    setNewSkill('');
  };

  const handleDeleteSkill = (skillName: string) => {
    if (!profile) return;

    const currentSkills = normalizeSkills(profile.skills);
    const updatedSkills = currentSkills.filter(s => s.name !== skillName);
    updateProfileMutation.mutate({ skills: updatedSkills as any });
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Selecione uma imagem (JPG, PNG, etc).',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Imagem muito grande',
        description: 'A foto deve ter no máximo 5 MB.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      updateProfileMutation.mutate({ avatar_url: publicUrl });

      toast({
        title: 'Foto atualizada!',
        description: 'Sua foto de perfil foi salva com sucesso.',
      });
    } catch (error) {
      console.error('Erro no upload da foto:', error);
      toast({
        title: 'Erro ao enviar foto',
        description: 'Não foi possível fazer o upload da imagem.',
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
              {/* Avatar Upload */}
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-2">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full border-2 border-border bg-muted overflow-hidden flex items-center justify-center">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Foto de perfil"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <Label htmlFor="avatar-upload" className="text-base">Foto de perfil</Label>
                  <p className="text-xs text-muted-foreground">
                    JPG ou PNG, até 5 MB. Sua foto aparecerá no menu e nas candidaturas.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {profile.avatar_url ? 'Trocar foto' : 'Enviar foto'}
                    </Button>
                    {profile.avatar_url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => updateProfileMutation.mutate({ avatar_url: null as any })}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remover
                      </Button>
                    )}
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                </div>
              </div>

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
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    readOnly
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado
                  </p>
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
                    type="text"
                    inputMode="numeric"
                    placeholder="DD/MM/AAAA"
                    value={birthDateInput}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, '').slice(0, 8);
                      const maskedValue = rawValue
                        .replace(/^(\d{2})(\d)/, '$1/$2')
                        .replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2');

                      setBirthDateInput(maskedValue);

                      const isoValue = formatDateToIso(maskedValue);

                      if (isoValue || maskedValue === '') {
                        queryClient.setQueryData(['candidate-profile', user?.id], {
                          ...profile,
                          birth_date: isoValue || '',
                        });
                      }
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
                    <Label htmlFor="state">Estado</Label>
                    <Select
                      value={profile.state || ''}
                      onValueChange={(v) => {
                        queryClient.setQueryData(['candidate-profile', user?.id], {
                          ...profile,
                          state: v,
                          city: '',
                        });
                      }}
                    >
                      <SelectTrigger id="state">
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {BRAZIL_STATES.map((s) => (
                          <SelectItem key={s.uf} value={s.uf}>{s.uf} - {s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Select
                      value={profile.city || ''}
                      onValueChange={(v) => {
                        queryClient.setQueryData(['candidate-profile', user?.id], {
                          ...profile,
                          city: v,
                        });
                      }}
                      disabled={!profile.state || loadingCities}
                    >
                      <SelectTrigger id="city">
                        <SelectValue placeholder={
                          !profile.state ? 'Selecione o estado primeiro'
                          : loadingCities ? 'Carregando cidades...'
                          : 'Selecione a cidade'
                        } />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {loadingCities ? (
                          <div className="flex items-center justify-center py-3 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando...
                          </div>
                        ) : (
                          <>
                            {/* Mantém a cidade atual mesmo se ainda não estiver na lista carregada */}
                            {profile.city && !cities.includes(profile.city) && (
                              <SelectItem value={profile.city}>{profile.city}</SelectItem>
                            )}
                            {cities.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interest_area">Área de Interesse</Label>
                  <Select
                    value={
                      interestAreaOther
                        ? OTHER_OPTION
                        : profile.interest_area && INTEREST_AREAS.includes(profile.interest_area)
                          ? profile.interest_area
                          : ''
                    }
                    onValueChange={(value) => {
                      if (value === OTHER_OPTION) {
                        setInterestAreaOther(true);
                        queryClient.setQueryData(['candidate-profile', user?.id], {
                          ...profile,
                          interest_area: '',
                          desired_role: '',
                        });
                        setDesiredRoleOther(false);
                      } else {
                        setInterestAreaOther(false);
                        queryClient.setQueryData(['candidate-profile', user?.id], {
                          ...profile,
                          interest_area: value,
                          // Reset cargo when area changes (unless current cargo belongs to new area)
                          desired_role: getRolesForArea(value).includes(profile.desired_role || '')
                            ? profile.desired_role
                            : '',
                        });
                        setDesiredRoleOther(false);
                      }
                    }}
                  >
                    <SelectTrigger id="interest_area">
                      <SelectValue placeholder="Selecione uma área" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {INTEREST_AREAS.map((area) => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                      <SelectItem value={OTHER_OPTION}>{OTHER_OPTION}</SelectItem>
                    </SelectContent>
                  </Select>
                  {interestAreaOther && (
                    <Input
                      placeholder="Digite a área de interesse"
                      value={profile.interest_area || ''}
                      onChange={(e) => {
                        queryClient.setQueryData(['candidate-profile', user?.id], {
                          ...profile,
                          interest_area: e.target.value,
                        });
                      }}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desired_role">Cargo</Label>
                  {(() => {
                    const availableRoles = interestAreaOther
                      ? []
                      : getRolesForArea(profile.interest_area);
                    const hasArea = interestAreaOther || !!profile.interest_area;
                    const canUseSelect = !interestAreaOther && availableRoles.length > 0;

                    if (!canUseSelect) {
                      // Free text when no area selected, area is "Outros", or area has no predefined roles
                      return (
                        <Input
                          id="desired_role"
                          placeholder={
                            hasArea
                              ? 'Digite o cargo'
                              : 'Selecione uma área de interesse primeiro'
                          }
                          disabled={!hasArea}
                          value={profile.desired_role || ''}
                          onChange={(e) => {
                            queryClient.setQueryData(['candidate-profile', user?.id], {
                              ...profile,
                              desired_role: e.target.value,
                            });
                          }}
                        />
                      );
                    }

                    return (
                      <>
                        <Select
                          value={
                            desiredRoleOther
                              ? OTHER_OPTION
                              : profile.desired_role && availableRoles.includes(profile.desired_role)
                                ? profile.desired_role
                                : ''
                          }
                          onValueChange={(value) => {
                            if (value === OTHER_OPTION) {
                              setDesiredRoleOther(true);
                              queryClient.setQueryData(['candidate-profile', user?.id], {
                                ...profile,
                                desired_role: '',
                              });
                            } else {
                              setDesiredRoleOther(false);
                              queryClient.setQueryData(['candidate-profile', user?.id], {
                                ...profile,
                                desired_role: value,
                              });
                            }
                          }}
                        >
                          <SelectTrigger id="desired_role">
                            <SelectValue placeholder="Selecione um cargo" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {availableRoles.map((role) => (
                              <SelectItem key={role} value={role}>{role}</SelectItem>
                            ))}
                            <SelectItem value={OTHER_OPTION}>{OTHER_OPTION}</SelectItem>
                          </SelectContent>
                        </Select>
                        {desiredRoleOther && (
                          <Input
                            placeholder="Digite o cargo"
                            value={profile.desired_role || ''}
                            onChange={(e) => {
                              queryClient.setQueryData(['candidate-profile', user?.id], {
                                ...profile,
                                desired_role: e.target.value,
                              });
                            }}
                          />
                        )}
                      </>
                    );
                  })()}
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    id="cv"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleCVUpload}
                    className="flex-1"
                  />
                  {profile.cv_url && (
                    <Button variant="outline" asChild>
                      <a href={profile.cv_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Ver currículo atual
                      </a>
                    </Button>
                  )}
                </div>
                {profile.cv_url && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>
                      CV enviado:{' '}
                      <span className="font-medium text-foreground">{profile.cv_url.split('/').pop()?.split('?')[0] || 'arquivo.pdf'}</span>
                    </span>
                  </div>
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
            <CardContent className="space-y-6">
              {/* Input para adicionar habilidade */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite uma habilidade e pressione Enter..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSkill.trim()) {
                        e.preventDefault();
                        handleAddSkill();
                        // Mantém o foco para permitir adicionar várias em sequência
                        e.currentTarget.focus();
                      }
                    }}
                    className="flex-1"
                    autoComplete="off"
                  />
                  <Select value={newSkillLevel} onValueChange={(v) => setNewSkillLevel(v as any)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basico">Básico</SelectItem>
                      <SelectItem value="intermediario">Intermediário</SelectItem>
                      <SelectItem value="avancado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => handleAddSkill()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Sugestões de habilidades */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Sugestões (clique para adicionar):
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {SKILL_SUGGESTIONS.filter(suggestion => 
                    !normalizeSkills(profile.skills).some(s => s.name.toLowerCase() === suggestion.name.toLowerCase())
                  ).slice(0, 20).map((suggestion) => (
                    <Badge
                      key={suggestion.name}
                      variant="outline"
                      className={`cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs ${SKILL_LEVELS[suggestion.level].color}`}
                      onClick={() => handleAddSkill(suggestion.name, suggestion.level)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {suggestion.name}
                      <span className="ml-1 opacity-70">• {SKILL_LEVELS[suggestion.level].label}</span>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Lista de habilidades adicionadas */}
              {normalizeSkills(profile.skills).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma habilidade adicionada ainda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Suas habilidades:</Label>
                  <div className="flex flex-wrap gap-2">
                    {normalizeSkills(profile.skills).map((skill) => (
                      <Badge 
                        key={skill.name} 
                        variant="secondary" 
                        className={cn("text-sm py-1.5 px-3", SKILL_LEVELS[skill.level].color)}
                      >
                        {skill.name}
                        <span className="ml-1.5 text-xs opacity-75">
                          ({SKILL_LEVELS[skill.level].label})
                        </span>
                        <button
                          onClick={() => handleDeleteSkill(skill.name)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
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
