import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const ApiDocumentation = () => {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">Documentação da API</h1>
            <p className="text-muted-foreground text-lg">
              Documentação completa para integração com o sistema de recrutamento e gestão de colaboradores.
            </p>
          </div>

          <Tabs defaultValue="intro" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="intro">Introdução</TabsTrigger>
              <TabsTrigger value="auth">Autenticação</TabsTrigger>
              <TabsTrigger value="jobs">Vagas</TabsTrigger>
              <TabsTrigger value="applications">Candidaturas</TabsTrigger>
              <TabsTrigger value="profiles">Perfis</TabsTrigger>
              <TabsTrigger value="employees">Colaboradores</TabsTrigger>
            </TabsList>

            {/* Introdução */}
            <TabsContent value="intro">
              <Card>
                <CardHeader>
                  <CardTitle>Bem-vindo à API</CardTitle>
                  <CardDescription>Informações gerais sobre a API</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">URL Base</h3>
                    <code className="bg-muted p-2 rounded block">{baseUrl}/rest/v1</code>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Formato de Requisição/Resposta</h3>
                    <p className="text-sm text-muted-foreground">Todas as requisições e respostas utilizam JSON.</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Headers Obrigatórios</h3>
                    <pre className="bg-muted p-4 rounded overflow-x-auto">
{`{
  "apikey": "${anonKey}",
  "Content-Type": "application/json"
}`}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Códigos de Status HTTP</h3>
                    <ul className="space-y-2 text-sm">
                      <li><Badge>200</Badge> Sucesso</li>
                      <li><Badge variant="secondary">201</Badge> Criado com sucesso</li>
                      <li><Badge variant="destructive">400</Badge> Requisição inválida</li>
                      <li><Badge variant="destructive">401</Badge> Não autenticado</li>
                      <li><Badge variant="destructive">403</Badge> Acesso negado</li>
                      <li><Badge variant="destructive">404</Badge> Não encontrado</li>
                      <li><Badge variant="destructive">500</Badge> Erro no servidor</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Autenticação */}
            <TabsContent value="auth">
              <Card>
                <CardHeader>
                  <CardTitle>Autenticação</CardTitle>
                  <CardDescription>Como autenticar usuários no sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge variant="secondary">POST</Badge> Registrar Usuário
                    </h3>
                    <code className="text-sm">{baseUrl}/auth/v1/signup</code>
                    
                    <h4 className="font-semibold mt-4 mb-2">Corpo da Requisição:</h4>
                    <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`{
  "email": "usuario@exemplo.com",
  "password": "senha123",
  "data": {
    "name": "Nome do Usuário",
    "role": "candidate" // ou "company" ou "admin"
  }
}`}
                    </pre>

                    <h4 className="font-semibold mt-4 mb-2">Resposta de Sucesso (201):</h4>
                    <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`{
  "user": {
    "id": "uuid",
    "email": "usuario@exemplo.com",
    "created_at": "2025-01-01T00:00:00Z"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600
  }
}`}
                    </pre>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge variant="secondary">POST</Badge> Login
                    </h3>
                    <code className="text-sm">{baseUrl}/auth/v1/token?grant_type=password</code>
                    
                    <h4 className="font-semibold mt-4 mb-2">Corpo da Requisição:</h4>
                    <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}`}
                    </pre>

                    <h4 className="font-semibold mt-4 mb-2">Resposta de Sucesso (200):</h4>
                    <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`{
  "access_token": "jwt_token",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token",
  "user": {
    "id": "uuid",
    "email": "usuario@exemplo.com"
  }
}`}
                    </pre>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">Uso do Token</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Após o login, inclua o token em todas as requisições autenticadas:
                    </p>
                    <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`{
  "apikey": "${anonKey}",
  "Authorization": "Bearer {access_token}",
  "Content-Type": "application/json"
}`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Vagas */}
            <TabsContent value="jobs">
              <Card>
                <CardHeader>
                  <CardTitle>Endpoints de Vagas</CardTitle>
                  <CardDescription>Gerenciamento de vagas de emprego</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge>GET</Badge> Listar Vagas Ativas
                    </h3>
                    <code className="text-sm">{baseUrl}/rest/v1/jobs?is_active=eq.true</code>
                    
                    <h4 className="font-semibold mt-4 mb-2">Parâmetros de Query (opcionais):</h4>
                    <ul className="text-sm space-y-1 ml-4 list-disc">
                      <li><code>job_type=eq.full-time</code> - Filtrar por tipo de trabalho</li>
                      <li><code>location=eq.remote</code> - Filtrar por localização</li>
                      <li><code>city=eq.São Paulo</code> - Filtrar por cidade</li>
                      <li><code>select=id,title,description,salary_min,salary_max</code> - Selecionar campos específicos</li>
                      <li><code>order=created_at.desc</code> - Ordenar resultados</li>
                      <li><code>limit=10</code> - Limitar número de resultados</li>
                    </ul>

                    <h4 className="font-semibold mt-4 mb-2">Resposta de Sucesso (200):</h4>
                    <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`[
  {
    "id": "uuid",
    "company_id": "uuid",
    "company_name": "Empresa XYZ",
    "title": "Desenvolvedor Full Stack",
    "description": "Descrição da vaga...",
    "requirements": ["React", "Node.js", "TypeScript"],
    "responsibilities": ["Desenvolver features", "Code review"],
    "job_type": "full-time",
    "location": "hybrid",
    "city": "São Paulo",
    "state": "SP",
    "salary_min": 8000,
    "salary_max": 12000,
    "salary_currency": "BRL",
    "benefits": ["Vale refeição", "Plano de saúde"],
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
]`}
                    </pre>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge>GET</Badge> Buscar Vaga por ID
                    </h3>
                    <code className="text-sm">{baseUrl}/rest/v1/jobs?id=eq.{'{job_id}'}</code>
                    
                    <h4 className="font-semibold mt-4 mb-2">Resposta de Sucesso (200):</h4>
                    <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`[
  {
    "id": "uuid",
    "company_id": "uuid",
    "company_name": "Empresa XYZ",
    "title": "Desenvolvedor Full Stack",
    "description": "Descrição detalhada...",
    "requirements": ["React", "Node.js"],
    "responsibilities": ["Desenvolver features"],
    "job_type": "full-time",
    "location": "hybrid",
    "city": "São Paulo",
    "state": "SP",
    "salary_min": 8000,
    "salary_max": 12000,
    "salary_currency": "BRL",
    "benefits": ["Vale refeição"],
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
]`}
                    </pre>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge variant="secondary">POST</Badge> Criar Vaga
                    </h3>
                    <code className="text-sm">{baseUrl}/rest/v1/jobs</code>
                    <p className="text-sm text-muted-foreground mt-2">
                      🔒 Requer autenticação como empresa ou admin
                    </p>
                    
                    <h4 className="font-semibold mt-4 mb-2">Corpo da Requisição:</h4>
                    <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`{
  "company_id": "uuid",
  "company_name": "Empresa XYZ",
  "title": "Desenvolvedor Full Stack",
  "description": "Descrição da vaga...",
  "requirements": ["React", "Node.js", "TypeScript"],
  "responsibilities": ["Desenvolver features", "Code review"],
  "job_type": "full-time",
  "location": "hybrid",
  "city": "São Paulo",
  "state": "SP",
  "salary_min": 8000,
  "salary_max": 12000,
  "salary_currency": "BRL",
  "benefits": ["Vale refeição", "Plano de saúde"],
  "is_active": true
}`}
                    </pre>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge variant="outline">PATCH</Badge> Atualizar Vaga
                    </h3>
                    <code className="text-sm">{baseUrl}/rest/v1/jobs?id=eq.{'{job_id}'}</code>
                    <p className="text-sm text-muted-foreground mt-2">
                      🔒 Requer autenticação como empresa (proprietária) ou admin
                    </p>
                    
                    <h4 className="font-semibold mt-4 mb-2">Corpo da Requisição:</h4>
                    <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`{
  "title": "Novo título",
  "is_active": false
}`}
                    </pre>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge variant="destructive">DELETE</Badge> Deletar Vaga
                    </h3>
                    <code className="text-sm">{baseUrl}/rest/v1/jobs?id=eq.{'{job_id}'}</code>
                    <p className="text-sm text-muted-foreground mt-2">
                      🔒 Requer autenticação como empresa (proprietária) ou admin
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Candidaturas */}
            <TabsContent value="applications">
              <Card>
                <CardHeader>
                  <CardTitle>Endpoints de Candidaturas</CardTitle>
                  <CardDescription>Gerenciamento de candidaturas às vagas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge>GET</Badge> Listar Candidaturas
                    </h3>
                    <code className="text-sm">{baseUrl}/rest/v1/applications</code>
                    <p className="text-sm text-muted-foreground mt-2">
                      🔒 Requer autenticação. Candidatos veem apenas suas próprias candidaturas. Empresas veem candidaturas de suas vagas.
                    </p>
                    
                    <h4 className="font-semibold mt-4 mb-2">Parâmetros de Query (opcionais):</h4>
                    <ul className="text-sm space-y-1 ml-4 list-disc">
                      <li><code>job_id=eq.{'{job_id}'}</code> - Filtrar por vaga</li>
                      <li><code>status=eq.pending</code> - Filtrar por status (pending, in-review, interview, approved, rejected)</li>
                      <li><code>candidate_id=eq.{'{candidate_id}'}</code> - Filtrar por candidato</li>
                    </ul>

                    <h4 className="font-semibold mt-4 mb-2">Resposta de Sucesso (200):</h4>
                    <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`[
  {
    "id": "uuid",
    "job_id": "uuid",
    "candidate_id": "uuid",
    "candidate_name": "João Silva",
    "candidate_email": "joao@exemplo.com",
    "status": "pending",
    "current_stage": "screening",
    "score": 85,
    "is_favorite": false,
    "applied_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z",
    "notes": [],
    "stage_history": []
  }
]`}
                    </pre>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge variant="secondary">POST</Badge> Criar Candidatura
                    </h3>
                    <code className="text-sm">{baseUrl}/rest/v1/applications</code>
                    <p className="text-sm text-muted-foreground mt-2">
                      🔒 Requer autenticação como candidato
                    </p>
                    
                    <h4 className="font-semibold mt-4 mb-2">Corpo da Requisição:</h4>
                    <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`{
  "job_id": "uuid",
  "candidate_id": "uuid",
  "candidate_name": "João Silva",
  "candidate_email": "joao@exemplo.com",
  "status": "pending",
  "current_stage": "inscription",
  "score": 0
}`}
                    </pre>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge variant="outline">PATCH</Badge> Atualizar Candidatura
                    </h3>
                    <code className="text-sm">{baseUrl}/rest/v1/applications?id=eq.{'{application_id}'}</code>
                    <p className="text-sm text-muted-foreground mt-2">
                      🔒 Requer autenticação como empresa (da vaga) ou admin
                    </p>
                    
                    <h4 className="font-semibold mt-4 mb-2">Corpo da Requisição:</h4>
                    <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`{
  "status": "in-review",
  "current_stage": "screening",
  "score": 85,
  "is_favorite": true,
  "notes": [
    {
      "id": "uuid",
      "authorId": "uuid",
      "authorName": "Recrutador",
      "content": "Candidato interessante",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Perfis */}
            <TabsContent value="profiles">
              <Card>
                <CardHeader>
                  <CardTitle>Endpoints de Perfis</CardTitle>
                  <CardDescription>Gerenciamento de perfis de usuários</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge>GET</Badge> Buscar Perfil
                    </h3>
                    <code className="text-sm">{baseUrl}/rest/v1/profiles?id=eq.{'{user_id}'}</code>
                    <p className="text-sm text-muted-foreground mt-2">
                      🔒 Usuários podem ver apenas seu próprio perfil. Empresas podem ver perfis de candidatos.
                    </p>

                    <h4 className="font-semibold mt-4 mb-2">Resposta de Sucesso (200):</h4>
                    <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`[
  {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "phone": "(11) 98765-4321",
    "avatar_url": "https://...",
    "birth_date": "1990-01-01",
    "cpf": "123.456.789-00",
    "street": "Rua Exemplo, 123",
    "city": "São Paulo",
    "state": "SP",
    "zip_code": "01234-567",
    "summary": "Desenvolvedor com 5 anos de experiência...",
    "skills": ["React", "Node.js", "TypeScript"],
    "cv_url": "https://...",
    "linkedin_url": "https://linkedin.com/in/...",
    "portfolio_url": "https://...",
    "experiences": [
      {
        "id": "uuid",
        "company": "Empresa ABC",
        "position": "Desenvolvedor",
        "startDate": "2020-01-01",
        "endDate": "2023-01-01",
        "current": false,
        "description": "Desenvolvimento de aplicações web"
      }
    ],
    "educations": [
      {
        "id": "uuid",
        "institution": "Universidade XYZ",
        "degree": "Bacharelado",
        "field": "Ciência da Computação",
        "startDate": "2015-01-01",
        "endDate": "2019-12-01",
        "current": false
      }
    ],
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
]`}
                    </pre>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge variant="outline">PATCH</Badge> Atualizar Perfil
                    </h3>
                    <code className="text-sm">{baseUrl}/rest/v1/profiles?id=eq.{'{user_id}'}</code>
                    <p className="text-sm text-muted-foreground mt-2">
                      🔒 Usuários podem atualizar apenas seu próprio perfil
                    </p>
                    
                    <h4 className="font-semibold mt-4 mb-2">Corpo da Requisição:</h4>
                    <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`{
  "name": "João Silva",
  "phone": "(11) 98765-4321",
  "summary": "Desenvolvedor Full Stack...",
  "skills": ["React", "Node.js", "TypeScript", "Python"]
}`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Colaboradores */}
            <TabsContent value="employees">
              <Card>
                <CardHeader>
                  <CardTitle>Endpoints de Colaboradores</CardTitle>
                  <CardDescription>Gerenciamento de colaboradores internos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge>GET</Badge> Listar Colaboradores
                    </h3>
                    <code className="text-sm">{baseUrl}/rest/v1/employees</code>
                    <p className="text-sm text-muted-foreground mt-2">
                      🔒 Requer autenticação como empresa (proprietária) ou admin
                    </p>
                    
                    <h4 className="font-semibold mt-4 mb-2">Parâmetros de Query (opcionais):</h4>
                    <ul className="text-sm space-y-1 ml-4 list-disc">
                      <li><code>status=eq.ativo</code> - Filtrar por status (ativo, ferias, afastado, desligado)</li>
                      <li><code>setor=eq.TI</code> - Filtrar por setor</li>
                      <li><code>cargo=eq.Desenvolvedor</code> - Filtrar por cargo</li>
                    </ul>

                    <h4 className="font-semibold mt-4 mb-2">Resposta de Sucesso (200):</h4>
                    <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`[
  {
    "id": "uuid",
    "company_id": "uuid",
    "matricula": "EMP001",
    "nome": "Maria Santos",
    "cargo": "Desenvolvedora",
    "setor": "TI",
    "subsetor": "Frontend",
    "gestor_imediato": "João Manager",
    "email_corporativo": "maria@empresa.com",
    "telefone": "(11) 98765-4321",
    "data_admissao": "2023-01-15",
    "tipo_contrato": "clt",
    "status": "ativo",
    "salario": 8000.00,
    "turno": "manha",
    "horario_entrada": "08:00:00",
    "horario_saida": "17:00:00",
    "horario_almoco_inicio": "12:00:00",
    "horario_almoco_fim": "13:00:00",
    "trabalha_sabado": false,
    "local_trabalho": "Escritório SP",
    "status_aso": "apto",
    "proximas_ferias_previstas": "2025-07-01",
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
]`}
                    </pre>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Badge variant="secondary">POST</Badge> Criar Colaborador
                    </h3>
                    <code className="text-sm">{baseUrl}/rest/v1/employees</code>
                    <p className="text-sm text-muted-foreground mt-2">
                      🔒 Requer autenticação como empresa ou admin
                    </p>
                    
                    <h4 className="font-semibold mt-4 mb-2">Corpo da Requisição:</h4>
                    <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`{
  "company_id": "uuid",
  "matricula": "EMP001",
  "nome": "Maria Santos",
  "cargo": "Desenvolvedora",
  "setor": "TI",
  "subsetor": "Frontend",
  "email_corporativo": "maria@empresa.com",
  "telefone": "(11) 98765-4321",
  "data_admissao": "2023-01-15",
  "tipo_contrato": "clt",
  "status": "ativo",
  "salario": 8000.00,
  "turno": "manha",
  "horario_entrada": "08:00:00",
  "horario_saida": "17:00:00",
  "trabalha_sabado": false
}`}
                    </pre>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">Endpoints Relacionados</h3>
                    <ul className="space-y-2 text-sm">
                      <li><code>GET /employee_evaluations?employee_id=eq.{'{employee_id}'}</code> - Avaliações</li>
                      <li><code>GET /employee_history?employee_id=eq.{'{employee_id}'}</code> - Histórico</li>
                      <li><code>GET /employee_occurrences?employee_id=eq.{'{employee_id}'}</code> - Ocorrências</li>
                      <li><code>GET /employee_requests?employee_id=eq.{'{employee_id}'}</code> - Solicitações</li>
                      <li><code>GET /employee_trainings?employee_id=eq.{'{employee_id}'}</code> - Treinamentos</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Tipos de Dados (Enums)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Roles (app_role)</h4>
                <code className="text-sm">candidate | company | admin</code>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Job Types</h4>
                <code className="text-sm">full-time | part-time | contract | freelance | internship</code>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Job Locations</h4>
                <code className="text-sm">remote | onsite | hybrid</code>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Application Status</h4>
                <code className="text-sm">pending | in-review | interview | approved | rejected</code>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Employee Status</h4>
                <code className="text-sm">ativo | ferias | afastado | desligado</code>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Contract Types</h4>
                <code className="text-sm">clt | pj | estagio | temporario</code>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Shifts (Turnos)</h4>
                <code className="text-sm">manha | tarde | noite | madrugada | comercial | flexivel</code>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Exemplos de Uso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">JavaScript/TypeScript (Fetch)</h4>
                <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`// Listar vagas ativas
const response = await fetch('${baseUrl}/rest/v1/jobs?is_active=eq.true', {
  headers: {
    'apikey': '${anonKey}',
    'Content-Type': 'application/json'
  }
});
const jobs = await response.json();

// Criar candidatura (com autenticação)
const response = await fetch('${baseUrl}/rest/v1/applications', {
  method: 'POST',
  headers: {
    'apikey': '${anonKey}',
    'Authorization': 'Bearer ' + accessToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    job_id: 'uuid-da-vaga',
    candidate_id: 'uuid-do-candidato',
    candidate_name: 'Nome',
    candidate_email: 'email@exemplo.com',
    status: 'pending'
  })
});`}
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-2">cURL</h4>
                <pre className="bg-muted p-4 rounded overflow-x-auto text-sm">
{`# Listar vagas ativas
curl -X GET '${baseUrl}/rest/v1/jobs?is_active=eq.true' \\
  -H "apikey: ${anonKey}" \\
  -H "Content-Type: application/json"

# Criar vaga (com autenticação)
curl -X POST '${baseUrl}/rest/v1/jobs' \\
  -H "apikey: ${anonKey}" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "company_id": "uuid",
    "company_name": "Empresa XYZ",
    "title": "Desenvolvedor",
    "description": "Descrição...",
    "job_type": "full-time",
    "location": "remote",
    "is_active": true
  }'`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ApiDocumentation;
