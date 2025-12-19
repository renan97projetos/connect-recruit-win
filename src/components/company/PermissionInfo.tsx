import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PermissionInfo() {
  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Sistema de Permissões Ativo:</strong> O acesso a recursos é controlado pelas permissões 
          configuradas pelo Gestor Master. Se você não consegue acessar alguma funcionalidade, 
          solicite ao administrador a atribuição das permissões necessárias.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Permissões do Workflow de Vagas</CardTitle>
          <CardDescription>Como as permissões se integram com o processo de criação de vagas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">1. Criação de Requisição</h4>
            <p className="text-sm text-muted-foreground">
              • <strong>create_vagas:</strong> Permite criar novas requisições de vaga
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">2. Aprovação de Requisição</h4>
            <p className="text-sm text-muted-foreground">
              • <strong>manage_usuarios:</strong> Permite aprovar ou rejeitar requisições de vaga
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">3. Edição da Vaga</h4>
            <p className="text-sm text-muted-foreground">
              • <strong>edit_vagas:</strong> Permite editar os detalhes da vaga após aprovação
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">4. Revisão e Publicação</h4>
            <p className="text-sm text-muted-foreground">
              • <strong>publish_vagas:</strong> Permite aprovar a revisão final e publicar a vaga
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">5. Visualização</h4>
            <p className="text-sm text-muted-foreground">
              • <strong>view_vagas:</strong> Permite visualizar requisições e vagas
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
