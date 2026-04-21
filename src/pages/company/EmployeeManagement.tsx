import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyLayout } from '@/components/CompanyLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeTable } from '@/components/admin/EmployeeTable';
import { Loader2 } from 'lucide-react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CandidateProfileView } from '@/components/CandidateProfileView';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function CompanyEmployeeManagement() {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();
  const { isOwner, loading: roleLoading } = useCompanyRole();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: employees, isLoading } = useQuery({
    queryKey: ['company-employees', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('employees')
        .select('*')
        .eq('company_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const filteredEmployees = employees?.filter((employee: any) => {
    const search = searchTerm.toLowerCase();
    return (
      employee.nome.toLowerCase().includes(search) ||
      employee.matricula.toLowerCase().includes(search) ||
      employee.cargo.toLowerCase().includes(search) ||
      employee.setor.toLowerCase().includes(search)
    );
  });

  if (roleLoading) {
    return (
      <CompanyLayout area="hr"
        title="Gestão de Colaboradores"
        description="Gerencie todos os colaboradores da sua empresa"
      >
        <div className="text-center py-4">Verificando permissões...</div>
      </CompanyLayout>
    );
  }

  if (!isOwner) {
    return (
      <CompanyLayout area="hr"
        title="Gestão de Colaboradores"
        description="Gerencie todos os colaboradores da sua empresa"
      >
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar este recurso. Apenas o gestor da empresa pode gerenciar colaboradores.
          </AlertDescription>
        </Alert>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout area="hr"
      title="Gestão de Colaboradores"
      description="Gerencie todos os colaboradores da sua empresa"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome, matrícula, cargo ou setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button data-tour="new-employee-btn" onClick={() => navigate('/company/employees/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Colaborador
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <EmployeeTable employees={filteredEmployees || []} isCompanyView={true} />
        )}
      </div>
    </CompanyLayout>
  );
}