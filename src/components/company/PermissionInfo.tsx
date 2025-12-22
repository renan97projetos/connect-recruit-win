import { Info, Crown, Users, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function PermissionInfo() {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Sistema RBAC (Role Based Access Control):</strong> O acesso a recursos é controlado 
          pelo OWNER da empresa, que pode atribuir permissões específicas a cada colaborador.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Hierarquia de Acesso
          </CardTitle>
          <CardDescription>Como funciona o controle de acesso na empresa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-4 w-4 text-amber-600" />
              <span className="font-semibold text-amber-800 dark:text-amber-400">OWNER (Gestor Master)</span>
            </div>
            <p className="text-sm text-muted-foreground">
              O criador da conta da empresa. Tem acesso total a todas as funcionalidades e é o 
              <strong> único que pode</strong>:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li>Adicionar novos usuários à empresa</li>
              <li>Definir e editar permissões dos colaboradores</li>
              <li>Remover usuários da empresa</li>
              <li>Visualizar logs de auditoria</li>
              <li>Aprovar requisições de vaga (no painel Admin)</li>
            </ul>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-semibold">Colaboradores</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Usuários convidados pelo OWNER. Acessam apenas as funcionalidades 
              permitidas pelas permissões atribuídas a eles.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Permissões Disponíveis
          </CardTitle>
          <CardDescription>Permissões que podem ser atribuídas aos colaboradores</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <Badge variant="outline" className="mt-0.5 shrink-0">view_vagas</Badge>
              <div>
                <p className="font-medium text-sm">Ver vagas abertas</p>
                <p className="text-xs text-muted-foreground">Visualizar requisições e vagas publicadas</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <Badge variant="outline" className="mt-0.5 shrink-0">create_vagas</Badge>
              <div>
                <p className="font-medium text-sm">Criar novas vagas</p>
                <p className="text-xs text-muted-foreground">Criar requisições de vaga para aprovação</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <Badge variant="outline" className="mt-0.5 shrink-0">edit_vagas</Badge>
              <div>
                <p className="font-medium text-sm">Editar vagas existentes</p>
                <p className="text-xs text-muted-foreground">Modificar detalhes de vagas após aprovação</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <Badge variant="outline" className="mt-0.5 shrink-0">publish_vagas</Badge>
              <div>
                <p className="font-medium text-sm">Publicar ou desativar vagas</p>
                <p className="text-xs text-muted-foreground">Controlar o status de publicação das vagas</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <Badge variant="outline" className="mt-0.5 shrink-0">manage_candidatos</Badge>
              <div>
                <p className="font-medium text-sm">Gerenciar candidatos</p>
                <p className="text-xs text-muted-foreground">Visualizar e editar informações de candidatos</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <Badge variant="outline" className="mt-0.5 shrink-0">avaliar_candidatos</Badge>
              <div>
                <p className="font-medium text-sm">Avaliar candidatos</p>
                <p className="text-xs text-muted-foreground">Inserir feedbacks e notas nas etapas do processo</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <Badge variant="outline" className="mt-0.5 shrink-0">view_dashboard</Badge>
              <div>
                <p className="font-medium text-sm">Acessar dashboard</p>
                <p className="text-xs text-muted-foreground">Visualizar relatórios e indicadores</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
              <Badge variant="outline" className="mt-0.5 shrink-0">manage_configuracoes</Badge>
              <div>
                <p className="font-medium text-sm">Gerenciar configurações</p>
                <p className="text-xs text-muted-foreground">Alterar configurações da conta da empresa</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card opacity-50">
              <Badge variant="secondary" className="mt-0.5 shrink-0">manage_usuarios</Badge>
              <div>
                <p className="font-medium text-sm">Gerenciar usuários <span className="text-xs text-amber-600">(Apenas OWNER)</span></p>
                <p className="text-xs text-muted-foreground">Esta permissão é exclusiva do OWNER e não pode ser atribuída a colaboradores</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
