import { useEffect, useState } from 'react';
import { CompanyLayout } from '@/components/CompanyLayout';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCompanyRole } from '@/hooks/useCompanyRole';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Shield, Loader2, Inbox, Lock } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { ProFeatureGate } from '@/components/ProFeatureGate';

interface AuditLogRow {
  id: string;
  company_id: string;
  company_user_id: string | null;
  action: string;
  changed_by: string;
  timestamp: string | null;
}

export default function AuditLog() {
  const { user } = useSupabaseAuth();
  const { isOwner, loading: roleLoading } = useCompanyRole();
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !isOwner) return;
    (async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(200);

      const rows = (data as AuditLogRow[]) || [];
      setLogs(rows);

      const ids = Array.from(new Set(rows.map((r) => r.changed_by).filter(Boolean)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', ids);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: any) => (map[p.id] = p.name));
        setUserMap(map);
      }

      setLoading(false);
    })();
  }, [user?.id, isOwner]);

  if (roleLoading) {
    return (
      <CompanyLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </CompanyLayout>
    );
  }

  if (!isOwner) {
    return (
      <CompanyLayout>
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="py-12 flex flex-col items-center text-center">
            <Lock className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-semibold">Acesso restrito</p>
            <p className="text-xs text-muted-foreground mt-1">
              Apenas o administrador da conta pode acessar o audit log.
            </p>
          </CardContent>
        </Card>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout>
      <ProFeatureGate featureName="Audit Log">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Audit Log</h1>
            <p className="text-sm text-muted-foreground">
              Registro das últimas 200 ações realizadas na conta
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Data/Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead className="w-[220px]">Realizado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-12 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-12 text-center">
                      <Inbox className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma ação registrada ainda.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.timestamp
                          ? format(new Date(log.timestamp), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{log.action}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {userMap[log.changed_by] || log.changed_by.slice(0, 8) + '…'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      </ProFeatureGate>
    </CompanyLayout>
  );
}
