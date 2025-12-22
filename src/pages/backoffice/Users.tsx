import { useEffect, useState } from 'react';
import { BackofficeLayout } from '@/components/backoffice/BackofficeLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Search, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserWithRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile?: {
    name: string;
    phone: string | null;
  } | null;
  email?: string;
}

export default function BackofficeUsers() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Buscar roles e profiles separadamente
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      const { data: profiles } = await supabase.from('profiles').select('id, name, phone');

      // Map profiles to roles
      const usersWithProfiles = roles?.map((r) => {
        const profile = profiles?.find((p) => p.id === r.user_id);
        return {
          ...r,
          profile: profile ? { name: profile.name, phone: profile.phone } : null,
        };
      }) || [];

      setUsers(usersWithProfiles);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.profile?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      super_admin: 'bg-red-500/10 text-red-500',
      admin: 'bg-purple-500/10 text-purple-500',
      company: 'bg-blue-500/10 text-blue-500',
      candidate: 'bg-green-500/10 text-green-500',
    };
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      company: 'Empresa',
      candidate: 'Candidato',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[role] || 'bg-slate-500/10 text-slate-500'}`}>
        {labels[role] || role}
      </span>
    );
  };

  const uniqueRoles = [...new Set(users.map((u) => u.role))];

  return (
    <BackofficeLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">Todos os usuários cadastrados na plataforma</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total de Usuários</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Super Admins</p>
              <p className="text-2xl font-bold">{users.filter((u) => u.role === 'super_admin').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Empresas</p>
              <p className="text-2xl font-bold">{users.filter((u) => u.role === 'company').length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Candidatos</p>
              <p className="text-2xl font-bold">{users.filter((u) => u.role === 'candidate').length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os roles</SelectItem>
                  {uniqueRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role === 'super_admin'
                        ? 'Super Admin'
                        : role === 'admin'
                        ? 'Admin'
                        : role === 'company'
                        ? 'Empresa'
                        : role === 'candidate'
                        ? 'Candidato'
                        : role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.profile?.name || 'Sem nome'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {user.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{user.profile?.phone || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </BackofficeLayout>
  );
}
