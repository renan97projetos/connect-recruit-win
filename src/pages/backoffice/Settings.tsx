import { BackofficeLayout } from '@/components/backoffice/BackofficeLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Settings, Shield, Bell, Database, Mail } from 'lucide-react';

export default function BackofficeSettings() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: 'Configurações salvas',
      description: 'As alterações foram aplicadas com sucesso.',
    });
  };

  return (
    <BackofficeLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Configurações gerais do backoffice</p>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <CardTitle>Configurações Gerais</CardTitle>
            </div>
            <CardDescription>Configurações básicas da plataforma</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome da Plataforma</Label>
                <Input defaultValue="SinapseRH" />
              </div>
              <div className="space-y-2">
                <Label>Domínio Principal</Label>
                <Input defaultValue="sinapserh.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email de Suporte</Label>
              <Input type="email" defaultValue="suporte@sinapserh.com" />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle>Segurança</CardTitle>
            </div>
            <CardDescription>Configurações de segurança e acesso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Autenticação de dois fatores</p>
                <p className="text-sm text-muted-foreground">
                  Exigir 2FA para todos os Super Admins
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sessões ativas</p>
                <p className="text-sm text-muted-foreground">
                  Encerrar sessões após 24h de inatividade
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Logs de auditoria</p>
                <p className="text-sm text-muted-foreground">
                  Registrar todas as ações no backoffice
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <CardTitle>Notificações</CardTitle>
            </div>
            <CardDescription>Configurações de alertas e notificações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Novas empresas</p>
                <p className="text-sm text-muted-foreground">
                  Notificar quando nova empresa se cadastrar
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Problemas de pagamento</p>
                <p className="text-sm text-muted-foreground">
                  Alertar sobre falhas em cobranças
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Limites atingidos</p>
                <p className="text-sm text-muted-foreground">
                  Alertar quando empresas atingirem limites do plano
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              <CardTitle>Email</CardTitle>
            </div>
            <CardDescription>Configurações de envio de emails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Remetente (Nome)</Label>
                <Input defaultValue="SinapseRH" />
              </div>
              <div className="space-y-2">
                <Label>Remetente (Email)</Label>
                <Input type="email" defaultValue="noreply@sinapserh.com" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <CardTitle>Banco de Dados</CardTitle>
            </div>
            <CardDescription>Informações e manutenção do banco de dados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Backup automático</p>
                <p className="text-sm text-muted-foreground">
                  Backup diário às 03:00 (UTC-3)
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Retenção de logs</p>
                <p className="text-sm text-muted-foreground">
                  Manter logs de auditoria por 90 dias
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input type="number" defaultValue="90" className="w-20" />
                <span className="text-sm text-muted-foreground">dias</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave}>Salvar Configurações</Button>
        </div>
      </div>
    </BackofficeLayout>
  );
}
