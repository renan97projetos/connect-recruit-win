import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeTable } from '@/components/admin/EmployeeTable';
import { Loader2 } from 'lucide-react';

export default function EmployeeManagement() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
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

  return (
    <DashboardLayout
      title="Gestão de Colaboradores"
      description="Gerencie todos os colaboradores admitidos"
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
          <Button onClick={() => navigate('/admin/employees/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Colaborador
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <EmployeeTable employees={filteredEmployees || []} />
        )}
      </div>
    </DashboardLayout>
  );
}
