CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'company',
    'candidate',
    'super_admin'
);


--
-- Name: contract_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.contract_type AS ENUM (
    'clt',
    'pj',
    'estagio',
    'temporario'
);


--
-- Name: employee_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.employee_status AS ENUM (
    'ativo',
    'em_ferias',
    'afastado',
    'desligado',
    'aguardando_cadastro'
);


--
-- Name: job_request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.job_request_status AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'rejected',
    'in_creation',
    'pending_review',
    'published'
);


--
-- Name: occurrence_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.occurrence_type AS ENUM (
    'advertencia',
    'elogio',
    'feedback',
    'observacao'
);


--
-- Name: opening_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.opening_reason AS ENUM (
    'replacement',
    'expansion',
    'new_project',
    'seasonal',
    'other'
);


--
-- Name: permission_key; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.permission_key AS ENUM (
    'view_vagas',
    'create_vagas',
    'edit_vagas',
    'publish_vagas',
    'manage_candidatos',
    'avaliar_candidatos',
    'view_dashboard',
    'manage_configuracoes',
    'manage_usuarios',
    'approve_vagas',
    'reject_vagas',
    'delete_vagas'
);


--
-- Name: request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.request_status AS ENUM (
    'pendente',
    'aprovada',
    'rejeitada',
    'cancelada'
);


--
-- Name: request_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.request_type AS ENUM (
    'ferias',
    'troca_turno',
    'mudanca_setor',
    'mudanca_cargo',
    'alteracao_cadastral'
);


--
-- Name: shift_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shift_type AS ENUM (
    'primeiro',
    'segundo',
    'terceiro',
    'administrativo'
);


--
-- Name: can_manage_company_users(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_manage_company_users(_user_id uuid, _company_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.is_company_owner(_user_id, _company_id)
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Insere o perfil
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', 'User'));
  
  -- Insere a role automaticamente
  -- Pega a role dos metadados ou usa 'candidate' como padrão
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    new.id, 
    COALESCE((new.raw_user_meta_data->>'role')::app_role, 'candidate'::app_role)
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_company_owner(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_company_owner(_user_id uuid, _company_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  -- O OWNER é o usuário cujo ID é igual ao company_id (criador da empresa)
  SELECT _user_id = _company_id
$$;


--
-- Name: is_super_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'::app_role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_workflow_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_workflow_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: user_has_any_permission(uuid, uuid, public.permission_key[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_has_any_permission(_user_id uuid, _company_id uuid, _permissions public.permission_key[]) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    JOIN public.user_permissions up ON cu.id = up.company_user_id
    WHERE cu.user_id = _user_id
      AND cu.company_id = _company_id
      AND cu.status = 'ativo'
      AND up.permission_key = ANY(_permissions)
      AND up.allowed = true
  )
$$;


--
-- Name: user_has_permission(uuid, uuid, public.permission_key); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_has_permission(_user_id uuid, _company_id uuid, _permission public.permission_key) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    JOIN public.user_permissions up ON cu.id = up.company_user_id
    WHERE cu.user_id = _user_id
      AND cu.company_id = _company_id
      AND cu.status = 'ativo'
      AND up.permission_key = _permission
      AND up.allowed = true
  )
$$;


SET default_table_access_method = heap;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    candidate_name text NOT NULL,
    candidate_email text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    current_stage text,
    score integer DEFAULT 0,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stage_history jsonb DEFAULT '[]'::jsonb,
    notes jsonb DEFAULT '[]'::jsonb,
    is_favorite boolean DEFAULT false
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    company_user_id uuid,
    action text NOT NULL,
    changed_by uuid NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now()
);


--
-- Name: backoffice_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backoffice_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    super_admin_id uuid NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: candidate_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    candidate_id uuid NOT NULL,
    job_id uuid NOT NULL,
    workflow_id uuid NOT NULL,
    stage_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    score numeric,
    entered_at timestamp with time zone DEFAULT now(),
    exited_at timestamp with time zone,
    evaluator_id uuid,
    evaluation_data jsonb DEFAULT '{}'::jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT candidate_stages_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'approved'::text, 'rejected'::text, 'skipped'::text])))
);


--
-- Name: company_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    permissions text[] DEFAULT '{}'::text[] NOT NULL,
    token uuid DEFAULT gen_random_uuid() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    invited_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    accepted_at timestamp with time zone,
    CONSTRAINT company_invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: company_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    status text DEFAULT 'ativo'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    CONSTRAINT company_users_status_check CHECK ((status = ANY (ARRAY['ativo'::text, 'inativo'::text])))
);


--
-- Name: employee_evaluations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_evaluations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    avaliador_id uuid NOT NULL,
    periodo text NOT NULL,
    nota_desempenho integer,
    pontos_fortes text,
    pontos_melhoria text,
    metas text,
    pdi text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT employee_evaluations_nota_desempenho_check CHECK (((nota_desempenho >= 1) AND (nota_desempenho <= 5)))
);


--
-- Name: employee_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    tipo_movimentacao text NOT NULL,
    cargo_anterior text,
    cargo_novo text,
    setor_anterior text,
    setor_novo text,
    salario_anterior numeric(10,2),
    salario_novo numeric(10,2),
    data_movimentacao date NOT NULL,
    observacoes text,
    registrado_por uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: employee_occurrences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_occurrences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    tipo public.occurrence_type NOT NULL,
    titulo text NOT NULL,
    descricao text NOT NULL,
    registrado_por uuid NOT NULL,
    data_ocorrencia date NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: employee_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    tipo public.request_type NOT NULL,
    status public.request_status DEFAULT 'pendente'::public.request_status,
    descricao text,
    data_inicio date,
    data_fim date,
    aprovador_id uuid,
    data_aprovacao timestamp with time zone,
    observacoes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: employee_trainings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_trainings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    nome_treinamento text NOT NULL,
    status text DEFAULT 'pendente'::text NOT NULL,
    data_prevista date,
    data_conclusao date,
    carga_horaria integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    matricula text NOT NULL,
    nome text NOT NULL,
    status public.employee_status DEFAULT 'ativo'::public.employee_status NOT NULL,
    cargo text NOT NULL,
    setor text NOT NULL,
    subsetor text,
    gestor_imediato text,
    turno public.shift_type NOT NULL,
    horario_entrada time without time zone NOT NULL,
    horario_saida time without time zone NOT NULL,
    trabalha_sabado boolean DEFAULT false,
    horario_almoco_inicio time without time zone,
    horario_almoco_fim time without time zone,
    horario_cafe_inicio time without time zone,
    horario_cafe_fim time without time zone,
    data_admissao date NOT NULL,
    tipo_contrato public.contract_type NOT NULL,
    email_corporativo text,
    telefone text,
    local_trabalho text,
    proximas_ferias_previstas date,
    status_aso text,
    salario numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    company_id uuid,
    CONSTRAINT employees_email_check CHECK (((email_corporativo IS NULL) OR (email_corporativo ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))),
    CONSTRAINT employees_horarios_check CHECK ((horario_entrada < horario_saida)),
    CONSTRAINT employees_salario_check CHECK (((salario IS NULL) OR (salario > (0)::numeric)))
);


--
-- Name: job_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    created_by uuid NOT NULL,
    opening_reason public.opening_reason NOT NULL,
    opening_reason_detail text,
    position_title text NOT NULL,
    department text,
    desired_profile text NOT NULL,
    requirements text[] DEFAULT '{}'::text[],
    responsibilities text[] DEFAULT '{}'::text[],
    salary_min numeric,
    salary_max numeric,
    job_type text NOT NULL,
    location text NOT NULL,
    city text,
    state text,
    status public.job_request_status DEFAULT 'draft'::public.job_request_status NOT NULL,
    current_stage integer DEFAULT 1 NOT NULL,
    requisition_approved_by uuid,
    requisition_approved_at timestamp with time zone,
    requisition_rejection_reason text,
    job_description text,
    benefits text[] DEFAULT '{}'::text[],
    review_approved_by uuid,
    review_approved_at timestamp with time zone,
    review_rejection_reason text,
    published_job_id uuid,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    company_name text NOT NULL,
    external_company_name text,
    external_job_url text,
    title text NOT NULL,
    description text NOT NULL,
    requirements text[] DEFAULT '{}'::text[],
    responsibilities text[] DEFAULT '{}'::text[],
    job_type text NOT NULL,
    location text NOT NULL,
    city text,
    state text,
    salary_min numeric,
    salary_max numeric,
    salary_currency text DEFAULT 'BRL'::text,
    benefits text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_archived boolean DEFAULT false,
    job_request_id uuid
);


--
-- Name: platform_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    total_tenants integer DEFAULT 0,
    active_tenants integer DEFAULT 0,
    total_users integer DEFAULT 0,
    total_jobs integer DEFAULT 0,
    total_applications integer DEFAULT 0,
    total_employees integer DEFAULT 0,
    new_tenants integer DEFAULT 0,
    churned_tenants integer DEFAULT 0,
    revenue_monthly numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: platform_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    max_users integer DEFAULT 10,
    max_jobs integer DEFAULT 50,
    max_employees integer DEFAULT 100,
    price_monthly numeric DEFAULT 0,
    price_yearly numeric DEFAULT 0,
    features jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    avatar_url text,
    phone text,
    company_name text,
    cnpj text,
    address text,
    city text,
    state text,
    zip_code text,
    birth_date date,
    cpf text,
    street text,
    experiences jsonb DEFAULT '[]'::jsonb,
    educations jsonb DEFAULT '[]'::jsonb,
    skills text[] DEFAULT ARRAY[]::text[],
    cv_url text,
    linkedin_url text,
    portfolio_url text,
    summary text,
    street_number text,
    neighborhood text
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_email text NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    whatsapp_number text,
    about_content text DEFAULT ''::text,
    privacy_policy_content text DEFAULT ''::text,
    terms_of_use_content text DEFAULT ''::text,
    instagram_url text DEFAULT ''::text,
    linkedin_url text DEFAULT ''::text
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    photo_url text,
    bio text,
    linkedin_url text,
    order_position integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    plan_id uuid,
    company_name text NOT NULL,
    company_email text NOT NULL,
    company_phone text,
    cnpj text,
    status text DEFAULT 'active'::text NOT NULL,
    trial_ends_at timestamp with time zone,
    subscription_starts_at timestamp with time zone,
    subscription_ends_at timestamp with time zone,
    billing_email text,
    current_users_count integer DEFAULT 0,
    current_jobs_count integer DEFAULT 0,
    current_employees_count integer DEFAULT 0,
    settings jsonb DEFAULT '{}'::jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tenants_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'blocked'::text, 'trial'::text, 'cancelled'::text])))
);


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_user_id uuid NOT NULL,
    permission_key public.permission_key NOT NULL,
    allowed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: workflow_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    name text NOT NULL,
    stage_type text NOT NULL,
    order_position integer NOT NULL,
    responsible_id uuid,
    description text,
    is_required boolean DEFAULT true,
    automation_config jsonb DEFAULT '{}'::jsonb,
    stage_config jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT workflow_stages_stage_type_check CHECK ((stage_type = ANY (ARRAY['screening'::text, 'hr_interview'::text, 'technical_interview'::text, 'practical_test'::text, 'automated_test'::text, 'cultural_fit'::text, 'manager_validation'::text, 'documentation'::text, 'final_approval'::text])))
);


--
-- Name: workflow_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_public boolean DEFAULT false,
    template_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid,
    company_id uuid NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT workflows_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])))
);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: backoffice_audit_logs backoffice_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backoffice_audit_logs
    ADD CONSTRAINT backoffice_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: candidate_stages candidate_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_stages
    ADD CONSTRAINT candidate_stages_pkey PRIMARY KEY (id);


--
-- Name: company_invitations company_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_invitations
    ADD CONSTRAINT company_invitations_pkey PRIMARY KEY (id);


--
-- Name: company_users company_users_company_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_company_id_email_key UNIQUE (company_id, email);


--
-- Name: company_users company_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_pkey PRIMARY KEY (id);


--
-- Name: employee_evaluations employee_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_evaluations
    ADD CONSTRAINT employee_evaluations_pkey PRIMARY KEY (id);


--
-- Name: employee_history employee_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_history
    ADD CONSTRAINT employee_history_pkey PRIMARY KEY (id);


--
-- Name: employee_occurrences employee_occurrences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_occurrences
    ADD CONSTRAINT employee_occurrences_pkey PRIMARY KEY (id);


--
-- Name: employee_requests employee_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_requests
    ADD CONSTRAINT employee_requests_pkey PRIMARY KEY (id);


--
-- Name: employee_trainings employee_trainings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_trainings
    ADD CONSTRAINT employee_trainings_pkey PRIMARY KEY (id);


--
-- Name: employees employees_matricula_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricula_key UNIQUE (matricula);


--
-- Name: employees employees_matricula_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_matricula_unique UNIQUE (matricula);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: job_requests job_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_requests
    ADD CONSTRAINT job_requests_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: platform_metrics platform_metrics_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_metrics
    ADD CONSTRAINT platform_metrics_date_key UNIQUE (date);


--
-- Name: platform_metrics platform_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_metrics
    ADD CONSTRAINT platform_metrics_pkey PRIMARY KEY (id);


--
-- Name: platform_plans platform_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_plans
    ADD CONSTRAINT platform_plans_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_company_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_company_id_key UNIQUE (company_id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_company_user_id_permission_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_company_user_id_permission_key_key UNIQUE (company_user_id, permission_key);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_roles user_roles_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);


--
-- Name: workflow_stages workflow_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_stages
    ADD CONSTRAINT workflow_stages_pkey PRIMARY KEY (id);


--
-- Name: workflow_templates workflow_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_templates
    ADD CONSTRAINT workflow_templates_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_logs_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_company_id ON public.audit_logs USING btree (company_id);


--
-- Name: idx_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp" DESC);


--
-- Name: idx_candidate_stages_candidate_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_stages_candidate_id ON public.candidate_stages USING btree (candidate_id);


--
-- Name: idx_candidate_stages_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_stages_job_id ON public.candidate_stages USING btree (job_id);


--
-- Name: idx_candidate_stages_stage_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_stages_stage_id ON public.candidate_stages USING btree (stage_id);


--
-- Name: idx_candidate_stages_workflow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_stages_workflow_id ON public.candidate_stages USING btree (workflow_id);


--
-- Name: idx_company_invitations_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_invitations_company ON public.company_invitations USING btree (company_id);


--
-- Name: idx_company_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_invitations_email ON public.company_invitations USING btree (email);


--
-- Name: idx_company_invitations_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_invitations_token ON public.company_invitations USING btree (token);


--
-- Name: idx_company_users_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_users_company_id ON public.company_users USING btree (company_id);


--
-- Name: idx_company_users_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_users_user_id ON public.company_users USING btree (user_id);


--
-- Name: idx_employee_evaluations_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_evaluations_employee_id ON public.employee_evaluations USING btree (employee_id);


--
-- Name: idx_employee_evaluations_periodo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_evaluations_periodo ON public.employee_evaluations USING btree (periodo);


--
-- Name: idx_employee_history_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_history_data ON public.employee_history USING btree (data_movimentacao DESC);


--
-- Name: idx_employee_history_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_history_employee_id ON public.employee_history USING btree (employee_id);


--
-- Name: idx_employee_occurrences_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_occurrences_data ON public.employee_occurrences USING btree (data_ocorrencia DESC);


--
-- Name: idx_employee_occurrences_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_occurrences_employee_id ON public.employee_occurrences USING btree (employee_id);


--
-- Name: idx_employee_requests_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_requests_employee_id ON public.employee_requests USING btree (employee_id);


--
-- Name: idx_employee_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_requests_status ON public.employee_requests USING btree (status);


--
-- Name: idx_employee_trainings_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_trainings_employee_id ON public.employee_trainings USING btree (employee_id);


--
-- Name: idx_employee_trainings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_trainings_status ON public.employee_trainings USING btree (status);


--
-- Name: idx_employees_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_company_id ON public.employees USING btree (company_id);


--
-- Name: idx_employees_matricula; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_matricula ON public.employees USING btree (matricula);


--
-- Name: idx_employees_nome; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_nome ON public.employees USING btree (nome);


--
-- Name: idx_employees_setor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_setor ON public.employees USING btree (setor);


--
-- Name: idx_employees_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_status ON public.employees USING btree (status);


--
-- Name: idx_jobs_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_company_id ON public.jobs USING btree (company_id);


--
-- Name: idx_jobs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_created_at ON public.jobs USING btree (created_at DESC);


--
-- Name: idx_jobs_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_is_active ON public.jobs USING btree (is_active);


--
-- Name: idx_jobs_is_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_is_archived ON public.jobs USING btree (is_archived);


--
-- Name: idx_user_permissions_company_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_permissions_company_user_id ON public.user_permissions USING btree (company_user_id);


--
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: idx_workflow_stages_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_stages_order ON public.workflow_stages USING btree (workflow_id, order_position);


--
-- Name: idx_workflow_stages_workflow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_stages_workflow_id ON public.workflow_stages USING btree (workflow_id);


--
-- Name: idx_workflow_templates_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_templates_company_id ON public.workflow_templates USING btree (company_id);


--
-- Name: idx_workflows_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflows_company_id ON public.workflows USING btree (company_id);


--
-- Name: idx_workflows_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflows_job_id ON public.workflows USING btree (job_id);


--
-- Name: applications update_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: candidate_stages update_candidate_stages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_candidate_stages_updated_at BEFORE UPDATE ON public.candidate_stages FOR EACH ROW EXECUTE FUNCTION public.update_workflow_updated_at();


--
-- Name: company_users update_company_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_company_users_updated_at BEFORE UPDATE ON public.company_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: employee_requests update_employee_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_employee_requests_updated_at BEFORE UPDATE ON public.employee_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: employees update_employees_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: job_requests update_job_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_job_requests_updated_at BEFORE UPDATE ON public.job_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: jobs update_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: platform_plans update_platform_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_platform_plans_updated_at BEFORE UPDATE ON public.platform_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: team_members update_team_members_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tenants update_tenants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workflow_stages update_workflow_stages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workflow_stages_updated_at BEFORE UPDATE ON public.workflow_stages FOR EACH ROW EXECUTE FUNCTION public.update_workflow_updated_at();


--
-- Name: workflow_templates update_workflow_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON public.workflow_templates FOR EACH ROW EXECUTE FUNCTION public.update_workflow_updated_at();


--
-- Name: workflows update_workflows_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.workflows FOR EACH ROW EXECUTE FUNCTION public.update_workflow_updated_at();


--
-- Name: applications applications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);


--
-- Name: audit_logs audit_logs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_company_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_company_user_id_fkey FOREIGN KEY (company_user_id) REFERENCES public.company_users(id) ON DELETE SET NULL;


--
-- Name: candidate_stages candidate_stages_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_stages
    ADD CONSTRAINT candidate_stages_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: candidate_stages candidate_stages_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_stages
    ADD CONSTRAINT candidate_stages_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.workflow_stages(id) ON DELETE CASCADE;


--
-- Name: candidate_stages candidate_stages_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_stages
    ADD CONSTRAINT candidate_stages_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: company_users company_users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_company_id_fkey FOREIGN KEY (company_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: company_users company_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: employee_evaluations employee_evaluations_avaliador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_evaluations
    ADD CONSTRAINT employee_evaluations_avaliador_id_fkey FOREIGN KEY (avaliador_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: employee_evaluations employee_evaluations_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_evaluations
    ADD CONSTRAINT employee_evaluations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: employee_history employee_history_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_history
    ADD CONSTRAINT employee_history_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: employee_history employee_history_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_history
    ADD CONSTRAINT employee_history_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: employee_occurrences employee_occurrences_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_occurrences
    ADD CONSTRAINT employee_occurrences_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: employee_occurrences employee_occurrences_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_occurrences
    ADD CONSTRAINT employee_occurrences_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: employee_requests employee_requests_aprovador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_requests
    ADD CONSTRAINT employee_requests_aprovador_id_fkey FOREIGN KEY (aprovador_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: employee_requests employee_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_requests
    ADD CONSTRAINT employee_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: employee_trainings employee_trainings_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_trainings
    ADD CONSTRAINT employee_trainings_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: employees employees_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_company_id_fkey FOREIGN KEY (company_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: job_requests job_requests_published_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_requests
    ADD CONSTRAINT job_requests_published_job_id_fkey FOREIGN KEY (published_job_id) REFERENCES public.jobs(id);


--
-- Name: jobs jobs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_company_id_fkey FOREIGN KEY (company_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_job_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_job_request_id_fkey FOREIGN KEY (job_request_id) REFERENCES public.job_requests(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: system_settings system_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: tenants tenants_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.platform_plans(id);


--
-- Name: user_permissions user_permissions_company_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_company_user_id_fkey FOREIGN KEY (company_user_id) REFERENCES public.company_users(id) ON DELETE CASCADE;


--
-- Name: workflow_stages workflow_stages_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_stages
    ADD CONSTRAINT workflow_stages_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: workflows workflows_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: jobs Admins can create jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: jobs Admins can delete all jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete all jobs" ON public.jobs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: jobs Admins can update all jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all jobs" ON public.jobs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: jobs Admins can view all jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all jobs" ON public.jobs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_evaluations Admins podem atualizar avaliações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem atualizar avaliações" ON public.employee_evaluations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employees Admins podem atualizar colaboradores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem atualizar colaboradores" ON public.employees FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_settings Admins podem atualizar configurações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem atualizar configurações" ON public.system_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_history Admins podem atualizar histórico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem atualizar histórico" ON public.employee_history FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: team_members Admins podem atualizar membros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem atualizar membros" ON public.team_members FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_occurrences Admins podem atualizar ocorrências; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem atualizar ocorrências" ON public.employee_occurrences FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_requests Admins podem atualizar solicitações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem atualizar solicitações" ON public.employee_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: applications Admins podem atualizar todas as candidaturas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem atualizar todas as candidaturas" ON public.applications FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: job_requests Admins podem atualizar todas as requisições; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem atualizar todas as requisições" ON public.job_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_trainings Admins podem atualizar treinamentos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem atualizar treinamentos" ON public.employee_trainings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_evaluations Admins podem deletar avaliações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem deletar avaliações" ON public.employee_evaluations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: applications Admins podem deletar candidaturas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem deletar candidaturas" ON public.applications FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employees Admins podem deletar colaboradores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem deletar colaboradores" ON public.employees FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_history Admins podem deletar histórico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem deletar histórico" ON public.employee_history FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: team_members Admins podem deletar membros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem deletar membros" ON public.team_members FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_occurrences Admins podem deletar ocorrências; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem deletar ocorrências" ON public.employee_occurrences FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins podem deletar profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem deletar profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: job_requests Admins podem deletar requisições; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem deletar requisições" ON public.job_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins podem deletar roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem deletar roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_requests Admins podem deletar solicitações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem deletar solicitações" ON public.employee_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_trainings Admins podem deletar treinamentos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem deletar treinamentos" ON public.employee_trainings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_evaluations Admins podem inserir avaliações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem inserir avaliações" ON public.employee_evaluations FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employees Admins podem inserir colaboradores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem inserir colaboradores" ON public.employees FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_settings Admins podem inserir configurações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem inserir configurações" ON public.system_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: team_members Admins podem inserir membros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem inserir membros" ON public.team_members FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_history Admins podem inserir no histórico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem inserir no histórico" ON public.employee_history FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_occurrences Admins podem inserir ocorrências; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem inserir ocorrências" ON public.employee_occurrences FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_requests Admins podem inserir solicitações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem inserir solicitações" ON public.employee_requests FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_trainings Admins podem inserir treinamentos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem inserir treinamentos" ON public.employee_trainings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_settings Admins podem ver configurações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver configurações" ON public.system_settings FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_evaluations Admins podem ver todas as avaliações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todas as avaliações" ON public.employee_evaluations FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: applications Admins podem ver todas as candidaturas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todas as candidaturas" ON public.applications FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: workflow_stages Admins podem ver todas as etapas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todas as etapas" ON public.workflow_stages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_occurrences Admins podem ver todas as ocorrências; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todas as ocorrências" ON public.employee_occurrences FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_permissions Admins podem ver todas as permissões; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todas as permissões" ON public.user_permissions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: job_requests Admins podem ver todas as requisições; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todas as requisições" ON public.job_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_requests Admins podem ver todas as solicitações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todas as solicitações" ON public.employee_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_history Admins podem ver todo o histórico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todo o histórico" ON public.employee_history FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employees Admins podem ver todos os colaboradores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todos os colaboradores" ON public.employees FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: audit_logs Admins podem ver todos os logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todos os logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: candidate_stages Admins podem ver todos os registros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todos os registros" ON public.candidate_stages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: workflow_templates Admins podem ver todos os templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todos os templates" ON public.workflow_templates FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employee_trainings Admins podem ver todos os treinamentos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todos os treinamentos" ON public.employee_trainings FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: company_users Admins podem ver todos os usuários; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todos os usuários" ON public.company_users FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: workflows Admins podem ver todos os workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todos os workflows" ON public.workflows FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: jobs Anyone can view active jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active jobs" ON public.jobs FOR SELECT USING ((is_active = true));


--
-- Name: company_invitations Anyone can view invitation by token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view invitation by token" ON public.company_invitations FOR SELECT USING (true);


--
-- Name: user_permissions Apenas OWNER pode atualizar permissões; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Apenas OWNER pode atualizar permissões" ON public.user_permissions FOR UPDATE USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.company_users cu
  WHERE ((cu.id = user_permissions.company_user_id) AND public.is_company_owner(auth.uid(), cu.company_id))))));


--
-- Name: company_users Apenas OWNER pode atualizar usuários; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Apenas OWNER pode atualizar usuários" ON public.company_users FOR UPDATE USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND public.is_company_owner(auth.uid(), company_id)));


--
-- Name: user_permissions Apenas OWNER pode criar permissões; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Apenas OWNER pode criar permissões" ON public.user_permissions FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.company_users cu
  WHERE ((cu.id = user_permissions.company_user_id) AND public.is_company_owner(auth.uid(), cu.company_id))))));


--
-- Name: company_users Apenas OWNER pode criar usuários; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Apenas OWNER pode criar usuários" ON public.company_users FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'company'::public.app_role) AND public.is_company_owner(auth.uid(), company_id)));


--
-- Name: user_permissions Apenas OWNER pode deletar permissões; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Apenas OWNER pode deletar permissões" ON public.user_permissions FOR DELETE USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.company_users cu
  WHERE ((cu.id = user_permissions.company_user_id) AND public.is_company_owner(auth.uid(), cu.company_id))))));


--
-- Name: company_users Apenas OWNER pode deletar usuários; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Apenas OWNER pode deletar usuários" ON public.company_users FOR DELETE USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND public.is_company_owner(auth.uid(), company_id)));


--
-- Name: audit_logs Apenas OWNER pode ver logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Apenas OWNER pode ver logs" ON public.audit_logs FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role(auth.uid(), 'company'::public.app_role) AND public.is_company_owner(auth.uid(), company_id))));


--
-- Name: applications Candidatos podem criar suas próprias candidaturas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Candidatos podem criar suas próprias candidaturas" ON public.applications FOR INSERT WITH CHECK ((candidate_id = auth.uid()));


--
-- Name: candidate_stages Candidatos podem ver seus próprios registros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Candidatos podem ver seus próprios registros" ON public.candidate_stages FOR SELECT TO authenticated USING ((candidate_id = auth.uid()));


--
-- Name: applications Candidatos podem ver suas próprias candidaturas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Candidatos podem ver suas próprias candidaturas" ON public.applications FOR SELECT USING ((candidate_id = auth.uid()));


--
-- Name: jobs Company users can create jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company users can create jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK ((((company_id = auth.uid()) AND public.has_role(auth.uid(), 'company'::public.app_role)) OR (public.has_role(auth.uid(), 'company'::public.app_role) AND public.user_has_permission(auth.uid(), company_id, 'create_vagas'::public.permission_key))));


--
-- Name: jobs Company users can delete their own jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company users can delete their own jobs" ON public.jobs FOR DELETE USING (((company_id = auth.uid()) AND public.user_has_permission(auth.uid(), company_id, 'manage_usuarios'::public.permission_key)));


--
-- Name: jobs Company users can update their own jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company users can update their own jobs" ON public.jobs FOR UPDATE USING (((company_id = auth.uid()) AND public.user_has_permission(auth.uid(), company_id, 'edit_vagas'::public.permission_key)));


--
-- Name: jobs Company users can view their own jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company users can view their own jobs" ON public.jobs FOR SELECT USING (((company_id = auth.uid()) AND public.user_has_permission(auth.uid(), company_id, 'view_vagas'::public.permission_key)));


--
-- Name: applications Empresas podem atualizar candidaturas de suas vagas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem atualizar candidaturas de suas vagas" ON public.applications FOR UPDATE USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.jobs
  WHERE ((jobs.id = applications.job_id) AND (jobs.company_id = auth.uid()))))));


--
-- Name: workflow_stages Empresas podem atualizar etapas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem atualizar etapas" ON public.workflow_stages FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.workflows
  WHERE ((workflows.id = workflow_stages.workflow_id) AND (workflows.company_id = auth.uid()))))));


--
-- Name: candidate_stages Empresas podem atualizar registros de candidatos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem atualizar registros de candidatos" ON public.candidate_stages FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.workflows
  WHERE ((workflows.id = candidate_stages.workflow_id) AND (workflows.company_id = auth.uid()))))));


--
-- Name: employees Empresas podem atualizar seus colaboradores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem atualizar seus colaboradores" ON public.employees FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (company_id = auth.uid())));


--
-- Name: workflow_templates Empresas podem atualizar seus templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem atualizar seus templates" ON public.workflow_templates FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (company_id = auth.uid())));


--
-- Name: workflows Empresas podem atualizar seus workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem atualizar seus workflows" ON public.workflows FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (company_id = auth.uid())));


--
-- Name: employee_requests Empresas podem atualizar solicitações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem atualizar solicitações" ON public.employee_requests FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.employees
  WHERE ((employees.id = employee_requests.employee_id) AND (employees.company_id = auth.uid()))))));


--
-- Name: employee_trainings Empresas podem atualizar treinamentos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem atualizar treinamentos" ON public.employee_trainings FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.employees
  WHERE ((employees.id = employee_trainings.employee_id) AND (employees.company_id = auth.uid()))))));


--
-- Name: employee_evaluations Empresas podem criar avaliações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem criar avaliações" ON public.employee_evaluations FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.employees
  WHERE ((employees.id = employee_evaluations.employee_id) AND (employees.company_id = auth.uid()))))));


--
-- Name: employees Empresas podem criar colaboradores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem criar colaboradores" ON public.employees FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'company'::public.app_role) AND (company_id = auth.uid())));


--
-- Name: workflow_stages Empresas podem criar etapas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem criar etapas" ON public.workflow_stages FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.workflows
  WHERE ((workflows.id = workflow_stages.workflow_id) AND (workflows.company_id = auth.uid()))))));


--
-- Name: employee_history Empresas podem criar histórico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem criar histórico" ON public.employee_history FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.employees
  WHERE ((employees.id = employee_history.employee_id) AND (employees.company_id = auth.uid()))))));


--
-- Name: employee_occurrences Empresas podem criar ocorrências; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem criar ocorrências" ON public.employee_occurrences FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.employees
  WHERE ((employees.id = employee_occurrences.employee_id) AND (employees.company_id = auth.uid()))))));


--
-- Name: candidate_stages Empresas podem criar registros de candidatos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem criar registros de candidatos" ON public.candidate_stages FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.workflows
  WHERE ((workflows.id = candidate_stages.workflow_id) AND (workflows.company_id = auth.uid()))))));


--
-- Name: job_requests Empresas podem criar requisições; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem criar requisições" ON public.job_requests FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'company'::public.app_role) AND (company_id = auth.uid())));


--
-- Name: workflow_templates Empresas podem criar templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem criar templates" ON public.workflow_templates FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'company'::public.app_role) AND (company_id = auth.uid())));


--
-- Name: employee_trainings Empresas podem criar treinamentos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem criar treinamentos" ON public.employee_trainings FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.employees
  WHERE ((employees.id = employee_trainings.employee_id) AND (employees.company_id = auth.uid()))))));


--
-- Name: workflows Empresas podem criar workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem criar workflows" ON public.workflows FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'company'::public.app_role) AND (company_id = auth.uid())));


--
-- Name: workflow_stages Empresas podem deletar etapas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem deletar etapas" ON public.workflow_stages FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.workflows
  WHERE ((workflows.id = workflow_stages.workflow_id) AND (workflows.company_id = auth.uid()))))));


--
-- Name: employees Empresas podem deletar seus colaboradores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem deletar seus colaboradores" ON public.employees FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (company_id = auth.uid())));


--
-- Name: workflow_templates Empresas podem deletar seus templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem deletar seus templates" ON public.workflow_templates FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (company_id = auth.uid())));


--
-- Name: workflows Empresas podem deletar seus workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem deletar seus workflows" ON public.workflows FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (company_id = auth.uid())));


--
-- Name: employee_evaluations Empresas podem ver avaliações de seus colaboradores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem ver avaliações de seus colaboradores" ON public.employee_evaluations FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.employees
  WHERE ((employees.id = employee_evaluations.employee_id) AND (employees.company_id = auth.uid()))))));


--
-- Name: candidate_stages Empresas podem ver candidatos de suas vagas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem ver candidatos de suas vagas" ON public.candidate_stages FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.workflows
  WHERE ((workflows.id = candidate_stages.workflow_id) AND (workflows.company_id = auth.uid()))))));


--
-- Name: applications Empresas podem ver candidaturas de suas vagas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem ver candidaturas de suas vagas" ON public.applications FOR SELECT USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.jobs
  WHERE ((jobs.id = applications.job_id) AND (jobs.company_id = auth.uid()))))));


--
-- Name: workflow_stages Empresas podem ver etapas de seus workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem ver etapas de seus workflows" ON public.workflow_stages FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.workflows
  WHERE ((workflows.id = workflow_stages.workflow_id) AND (workflows.company_id = auth.uid()))))));


--
-- Name: employee_history Empresas podem ver histórico de seus colaboradores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem ver histórico de seus colaboradores" ON public.employee_history FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.employees
  WHERE ((employees.id = employee_history.employee_id) AND (employees.company_id = auth.uid()))))));


--
-- Name: employee_occurrences Empresas podem ver ocorrências de seus colaboradores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem ver ocorrências de seus colaboradores" ON public.employee_occurrences FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.employees
  WHERE ((employees.id = employee_occurrences.employee_id) AND (employees.company_id = auth.uid()))))));


--
-- Name: profiles Empresas podem ver perfis de candidatos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem ver perfis de candidatos" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'company'::public.app_role));


--
-- Name: employees Empresas podem ver seus colaboradores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem ver seus colaboradores" ON public.employees FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (company_id = auth.uid())));


--
-- Name: workflows Empresas podem ver seus workflows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem ver seus workflows" ON public.workflows FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (company_id = auth.uid())));


--
-- Name: employee_requests Empresas podem ver solicitações de seus colaboradores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem ver solicitações de seus colaboradores" ON public.employee_requests FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.employees
  WHERE ((employees.id = employee_requests.employee_id) AND (employees.company_id = auth.uid()))))));


--
-- Name: job_requests Empresas podem ver suas requisições; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem ver suas requisições" ON public.job_requests FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (company_id = auth.uid())));


--
-- Name: workflow_templates Empresas podem ver templates públicos e próprios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem ver templates públicos e próprios" ON public.workflow_templates FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND ((is_public = true) OR (company_id = auth.uid()))));


--
-- Name: employee_trainings Empresas podem ver treinamentos de seus colaboradores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Empresas podem ver treinamentos de seus colaboradores" ON public.employee_trainings FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.employees
  WHERE ((employees.id = employee_trainings.employee_id) AND (employees.company_id = auth.uid()))))));


--
-- Name: company_users OWNER e colaboradores podem ver usuários da empresa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "OWNER e colaboradores podem ver usuários da empresa" ON public.company_users FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role(auth.uid(), 'company'::public.app_role) AND public.is_company_owner(auth.uid(), company_id)) OR (public.has_role(auth.uid(), 'company'::public.app_role) AND (user_id = auth.uid()))));


--
-- Name: user_permissions OWNER e próprio usuário podem ver permissões; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "OWNER e próprio usuário podem ver permissões" ON public.user_permissions FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role(auth.uid(), 'company'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.company_users cu
  WHERE ((cu.id = user_permissions.company_user_id) AND (public.is_company_owner(auth.uid(), cu.company_id) OR (cu.user_id = auth.uid()))))))));


--
-- Name: audit_logs OWNER e sistema podem criar logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "OWNER e sistema podem criar logs" ON public.audit_logs FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'company'::public.app_role) AND public.is_company_owner(auth.uid(), company_id)));


--
-- Name: job_requests Owner pode atualizar requisições; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner pode atualizar requisições" ON public.job_requests FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role(auth.uid(), 'company'::public.app_role) AND (company_id = auth.uid())) OR (public.has_role(auth.uid(), 'company'::public.app_role) AND (created_by = auth.uid()) AND (status = 'draft'::public.job_request_status) AND public.user_has_permission(auth.uid(), company_id, 'create_vagas'::public.permission_key))));


--
-- Name: company_invitations Owners can create invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can create invitations" ON public.company_invitations FOR INSERT WITH CHECK (((company_id = auth.uid()) AND (invited_by = auth.uid())));


--
-- Name: company_invitations Owners can update their company invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can update their company invitations" ON public.company_invitations FOR UPDATE USING ((company_id = auth.uid()));


--
-- Name: company_invitations Owners can view their company invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can view their company invitations" ON public.company_invitations FOR SELECT USING ((company_id = auth.uid()));


--
-- Name: team_members Qualquer pessoa pode ver membros da equipe; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Qualquer pessoa pode ver membros da equipe" ON public.team_members FOR SELECT USING ((is_active = true));


--
-- Name: system_settings Qualquer pessoa pode ver número do WhatsApp; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Qualquer pessoa pode ver número do WhatsApp" ON public.system_settings FOR SELECT USING (true);


--
-- Name: platform_plans Qualquer um pode ver planos ativos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Qualquer um pode ver planos ativos" ON public.platform_plans FOR SELECT USING ((is_active = true));


--
-- Name: jobs Super admins podem atualizar vagas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins podem atualizar vagas" ON public.jobs FOR UPDATE USING (public.is_super_admin(auth.uid()));


--
-- Name: backoffice_audit_logs Super admins podem criar logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins podem criar logs" ON public.backoffice_audit_logs FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: jobs Super admins podem criar vagas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins podem criar vagas" ON public.jobs FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: jobs Super admins podem deletar vagas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins podem deletar vagas" ON public.jobs FOR DELETE USING (public.is_super_admin(auth.uid()));


--
-- Name: platform_metrics Super admins podem gerenciar métricas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins podem gerenciar métricas" ON public.platform_metrics USING (public.is_super_admin(auth.uid()));


--
-- Name: platform_plans Super admins podem gerenciar planos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins podem gerenciar planos" ON public.platform_plans USING (public.is_super_admin(auth.uid()));


--
-- Name: tenants Super admins podem gerenciar tenants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins podem gerenciar tenants" ON public.tenants USING (public.is_super_admin(auth.uid()));


--
-- Name: backoffice_audit_logs Super admins podem ver logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins podem ver logs" ON public.backoffice_audit_logs FOR SELECT USING (public.is_super_admin(auth.uid()));


--
-- Name: platform_metrics Super admins podem ver métricas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins podem ver métricas" ON public.platform_metrics FOR SELECT USING (public.is_super_admin(auth.uid()));


--
-- Name: jobs Super admins podem ver todas as vagas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins podem ver todas as vagas" ON public.jobs FOR SELECT USING (public.is_super_admin(auth.uid()));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: user_roles Users can insert their own role during signup; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own role during signup" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (NOT (EXISTS ( SELECT 1
   FROM public.user_roles user_roles_1
  WHERE (user_roles_1.user_id = auth.uid()))))));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: user_roles Users can view their own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: backoffice_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.backoffice_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: candidate_stages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.candidate_stages ENABLE ROW LEVEL SECURITY;

--
-- Name: company_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: company_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_evaluations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employee_evaluations ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employee_history ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_occurrences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employee_occurrences ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employee_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_trainings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employee_trainings ENABLE ROW LEVEL SECURITY;

--
-- Name: employees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

--
-- Name: job_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.job_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: system_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: user_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_stages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: workflows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;