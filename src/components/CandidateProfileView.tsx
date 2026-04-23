import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  FileText,
  Briefcase,
  GraduationCap,
  Award,
  Linkedin,
  Globe,
  Download
} from 'lucide-react';

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

interface Skill {
  name: string;
  level: 'basico' | 'intermediario' | 'avancado';
}

interface ProfileData {
  name: string;
  phone?: string;
  birth_date?: string;
  cpf?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  summary?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  experiences: Experience[];
  educations: Education[];
  skills: Array<Skill | string>;
  cv_url?: string;
}

const SKILL_LEVELS = {
  basico: { label: 'Básico', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  intermediario: { label: 'Intermediário', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  avancado: { label: 'Avançado', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' }
};

const VALID_LEVELS: Skill['level'][] = ['basico', 'intermediario', 'avancado'];

const normalizeSkill = (skill: Skill | string): Skill => {
  if (typeof skill === 'string') {
    // Tenta parsear caso seja um JSON serializado
    const trimmed = skill.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && parsed.name) {
          const level = VALID_LEVELS.includes(parsed.level) ? parsed.level : 'intermediario';
          return { name: String(parsed.name), level };
        }
      } catch {
        // cai no fallback
      }
    }
    return { name: skill, level: 'intermediario' };
  }
  const level = VALID_LEVELS.includes(skill?.level) ? skill.level : 'intermediario';
  return { name: skill.name, level };
};

interface CandidateProfileViewProps {
  profile: ProfileData;
  email?: string;
}

export function CandidateProfileView({ profile, email }: CandidateProfileViewProps) {
  const formatDate = (date?: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getPeriod = (startDate: string, endDate?: string, current?: boolean) => {
    if (current) return `${formatDate(startDate)} - Atual`;
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header com dados pessoais */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl">{profile.name}</CardTitle>
              {profile.summary && (
                <CardDescription className="mt-2 text-base">
                  {profile.summary}
                </CardDescription>
              )}
            </div>
            {profile.cv_url && (
              <Button variant="outline" asChild>
                <a href={profile.cv_url} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar CV
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            {email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{email}</span>
              </div>
            )}
            {profile.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{profile.phone}</span>
              </div>
            )}
            {profile.birth_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(profile.birth_date)}</span>
              </div>
            )}
            {(profile.city || profile.state) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{[profile.city, profile.state].filter(Boolean).join(', ')}</span>
              </div>
            )}
          </div>
          
          {(profile.linkedin_url || profile.portfolio_url) && (
            <div className="flex gap-2 pt-2">
              {profile.linkedin_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="mr-2 h-4 w-4" />
                    LinkedIn
                  </a>
                </Button>
              )}
              {profile.portfolio_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer">
                    <Globe className="mr-2 h-4 w-4" />
                    Portfólio
                  </a>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Experiências Profissionais */}
      {profile.experiences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Experiências Profissionais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.experiences.map((exp) => (
              <div key={exp.id} className="border-l-2 border-primary pl-4 pb-4 last:pb-0">
                <h3 className="font-semibold text-lg">{exp.position}</h3>
                <p className="text-muted-foreground">{exp.company}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {getPeriod(exp.startDate, exp.endDate, exp.current)}
                </p>
                {exp.description && (
                  <p className="mt-2 text-sm whitespace-pre-wrap">{exp.description}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Formação Acadêmica */}
      {profile.educations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Formação Acadêmica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.educations.map((edu) => (
              <div key={edu.id} className="border-l-2 border-primary pl-4 pb-4 last:pb-0">
                <h3 className="font-semibold text-lg">{edu.degree}</h3>
                <p className="text-muted-foreground">{edu.institution}</p>
                <p className="text-sm text-muted-foreground">
                  {edu.field}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {getPeriod(edu.startDate, edu.endDate, edu.current)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Habilidades */}
      {profile.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Habilidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill, index) => {
                const normalizedSkill = normalizeSkill(skill);
                return (
                  <Badge 
                    key={index} 
                    variant="secondary"
                    className={SKILL_LEVELS[normalizedSkill.level].color}
                  >
                    {normalizedSkill.name}
                    <span className="ml-1.5 text-xs opacity-75">
                      ({SKILL_LEVELS[normalizedSkill.level].label})
                    </span>
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
