export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          applied_at: string
          candidate_email: string
          candidate_id: string
          candidate_name: string
          current_stage: string | null
          id: string
          is_favorite: boolean | null
          job_id: string
          notes: Json | null
          score: number | null
          stage_history: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          applied_at?: string
          candidate_email: string
          candidate_id: string
          candidate_name: string
          current_stage?: string | null
          id?: string
          is_favorite?: boolean | null
          job_id: string
          notes?: Json | null
          score?: number | null
          stage_history?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          applied_at?: string
          candidate_email?: string
          candidate_id?: string
          candidate_name?: string
          current_stage?: string | null
          id?: string
          is_favorite?: boolean | null
          job_id?: string
          notes?: Json | null
          score?: number | null
          stage_history?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_by: string
          company_id: string
          company_user_id: string | null
          id: string
          timestamp: string | null
        }
        Insert: {
          action: string
          changed_by: string
          company_id: string
          company_user_id?: string | null
          id?: string
          timestamp?: string | null
        }
        Update: {
          action?: string
          changed_by?: string
          company_id?: string
          company_user_id?: string | null
          id?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_user_id_fkey"
            columns: ["company_user_id"]
            isOneToOne: false
            referencedRelation: "company_users"
            referencedColumns: ["id"]
          },
        ]
      }
      backoffice_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          super_admin_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          super_admin_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          super_admin_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      candidate_stages: {
        Row: {
          candidate_id: string
          created_at: string | null
          entered_at: string | null
          evaluation_data: Json | null
          evaluator_id: string | null
          exited_at: string | null
          id: string
          job_id: string
          notes: string | null
          score: number | null
          stage_id: string
          status: string
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          entered_at?: string | null
          evaluation_data?: Json | null
          evaluator_id?: string | null
          exited_at?: string | null
          id?: string
          job_id: string
          notes?: string | null
          score?: number | null
          stage_id: string
          status?: string
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          entered_at?: string | null
          evaluation_data?: Json | null
          evaluator_id?: string | null
          exited_at?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          score?: number | null
          stage_id?: string
          status?: string
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_stages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_stages_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_stages_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          name: string
          permissions: string[]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          name: string
          permissions?: string[]
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          name?: string
          permissions?: string[]
          status?: string
          token?: string
        }
        Relationships: []
      }
      company_users: {
        Row: {
          company_id: string
          created_at: string | null
          email: string
          id: string
          name: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email: string
          id?: string
          name: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      employee_evaluations: {
        Row: {
          avaliador_id: string
          created_at: string | null
          employee_id: string
          id: string
          metas: string | null
          nota_desempenho: number | null
          pdi: string | null
          periodo: string
          pontos_fortes: string | null
          pontos_melhoria: string | null
        }
        Insert: {
          avaliador_id: string
          created_at?: string | null
          employee_id: string
          id?: string
          metas?: string | null
          nota_desempenho?: number | null
          pdi?: string | null
          periodo: string
          pontos_fortes?: string | null
          pontos_melhoria?: string | null
        }
        Update: {
          avaliador_id?: string
          created_at?: string | null
          employee_id?: string
          id?: string
          metas?: string | null
          nota_desempenho?: number | null
          pdi?: string | null
          periodo?: string
          pontos_fortes?: string | null
          pontos_melhoria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_evaluations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_history: {
        Row: {
          cargo_anterior: string | null
          cargo_novo: string | null
          created_at: string | null
          data_movimentacao: string
          employee_id: string
          id: string
          observacoes: string | null
          registrado_por: string
          salario_anterior: number | null
          salario_novo: number | null
          setor_anterior: string | null
          setor_novo: string | null
          tipo_movimentacao: string
        }
        Insert: {
          cargo_anterior?: string | null
          cargo_novo?: string | null
          created_at?: string | null
          data_movimentacao: string
          employee_id: string
          id?: string
          observacoes?: string | null
          registrado_por: string
          salario_anterior?: number | null
          salario_novo?: number | null
          setor_anterior?: string | null
          setor_novo?: string | null
          tipo_movimentacao: string
        }
        Update: {
          cargo_anterior?: string | null
          cargo_novo?: string | null
          created_at?: string | null
          data_movimentacao?: string
          employee_id?: string
          id?: string
          observacoes?: string | null
          registrado_por?: string
          salario_anterior?: number | null
          salario_novo?: number | null
          setor_anterior?: string | null
          setor_novo?: string | null
          tipo_movimentacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_occurrences: {
        Row: {
          created_at: string | null
          data_ocorrencia: string
          descricao: string
          employee_id: string
          id: string
          registrado_por: string
          tipo: Database["public"]["Enums"]["occurrence_type"]
          titulo: string
        }
        Insert: {
          created_at?: string | null
          data_ocorrencia: string
          descricao: string
          employee_id: string
          id?: string
          registrado_por: string
          tipo: Database["public"]["Enums"]["occurrence_type"]
          titulo: string
        }
        Update: {
          created_at?: string | null
          data_ocorrencia?: string
          descricao?: string
          employee_id?: string
          id?: string
          registrado_por?: string
          tipo?: Database["public"]["Enums"]["occurrence_type"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_occurrences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_requests: {
        Row: {
          aprovador_id: string | null
          created_at: string | null
          data_aprovacao: string | null
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          employee_id: string
          id: string
          observacoes: string | null
          status: Database["public"]["Enums"]["request_status"] | null
          tipo: Database["public"]["Enums"]["request_type"]
          updated_at: string | null
        }
        Insert: {
          aprovador_id?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          employee_id: string
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          tipo: Database["public"]["Enums"]["request_type"]
          updated_at?: string | null
        }
        Update: {
          aprovador_id?: string | null
          created_at?: string | null
          data_aprovacao?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          employee_id?: string
          id?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["request_status"] | null
          tipo?: Database["public"]["Enums"]["request_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_trainings: {
        Row: {
          carga_horaria: number | null
          created_at: string | null
          data_conclusao: string | null
          data_prevista: string | null
          employee_id: string
          id: string
          nome_treinamento: string
          status: string
        }
        Insert: {
          carga_horaria?: number | null
          created_at?: string | null
          data_conclusao?: string | null
          data_prevista?: string | null
          employee_id: string
          id?: string
          nome_treinamento: string
          status?: string
        }
        Update: {
          carga_horaria?: number | null
          created_at?: string | null
          data_conclusao?: string | null
          data_prevista?: string | null
          employee_id?: string
          id?: string
          nome_treinamento?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_trainings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          cargo: string
          company_id: string | null
          created_at: string | null
          data_admissao: string
          email_corporativo: string | null
          gestor_imediato: string | null
          horario_almoco_fim: string | null
          horario_almoco_inicio: string | null
          horario_cafe_fim: string | null
          horario_cafe_inicio: string | null
          horario_entrada: string
          horario_saida: string
          id: string
          local_trabalho: string | null
          matricula: string
          nome: string
          proximas_ferias_previstas: string | null
          salario: number | null
          setor: string
          status: Database["public"]["Enums"]["employee_status"]
          status_aso: string | null
          subsetor: string | null
          telefone: string | null
          tipo_contrato: Database["public"]["Enums"]["contract_type"]
          trabalha_sabado: boolean | null
          turno: Database["public"]["Enums"]["shift_type"]
          updated_at: string | null
        }
        Insert: {
          cargo: string
          company_id?: string | null
          created_at?: string | null
          data_admissao: string
          email_corporativo?: string | null
          gestor_imediato?: string | null
          horario_almoco_fim?: string | null
          horario_almoco_inicio?: string | null
          horario_cafe_fim?: string | null
          horario_cafe_inicio?: string | null
          horario_entrada: string
          horario_saida: string
          id?: string
          local_trabalho?: string | null
          matricula: string
          nome: string
          proximas_ferias_previstas?: string | null
          salario?: number | null
          setor: string
          status?: Database["public"]["Enums"]["employee_status"]
          status_aso?: string | null
          subsetor?: string | null
          telefone?: string | null
          tipo_contrato: Database["public"]["Enums"]["contract_type"]
          trabalha_sabado?: boolean | null
          turno: Database["public"]["Enums"]["shift_type"]
          updated_at?: string | null
        }
        Update: {
          cargo?: string
          company_id?: string | null
          created_at?: string | null
          data_admissao?: string
          email_corporativo?: string | null
          gestor_imediato?: string | null
          horario_almoco_fim?: string | null
          horario_almoco_inicio?: string | null
          horario_cafe_fim?: string | null
          horario_cafe_inicio?: string | null
          horario_entrada?: string
          horario_saida?: string
          id?: string
          local_trabalho?: string | null
          matricula?: string
          nome?: string
          proximas_ferias_previstas?: string | null
          salario?: number | null
          setor?: string
          status?: Database["public"]["Enums"]["employee_status"]
          status_aso?: string | null
          subsetor?: string | null
          telefone?: string | null
          tipo_contrato?: Database["public"]["Enums"]["contract_type"]
          trabalha_sabado?: boolean | null
          turno?: Database["public"]["Enums"]["shift_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      job_requests: {
        Row: {
          benefits: string[] | null
          city: string | null
          company_id: string
          created_at: string | null
          created_by: string
          current_stage: number
          department: string | null
          desired_profile: string
          id: string
          job_description: string | null
          job_type: string
          location: string
          opening_reason: Database["public"]["Enums"]["opening_reason"]
          opening_reason_detail: string | null
          position_title: string
          published_at: string | null
          published_job_id: string | null
          requirements: string[] | null
          requisition_approved_at: string | null
          requisition_approved_by: string | null
          requisition_rejection_reason: string | null
          responsibilities: string[] | null
          review_approved_at: string | null
          review_approved_by: string | null
          review_rejection_reason: string | null
          salary_max: number | null
          salary_min: number | null
          state: string | null
          status: Database["public"]["Enums"]["job_request_status"]
          updated_at: string | null
        }
        Insert: {
          benefits?: string[] | null
          city?: string | null
          company_id: string
          created_at?: string | null
          created_by: string
          current_stage?: number
          department?: string | null
          desired_profile: string
          id?: string
          job_description?: string | null
          job_type: string
          location: string
          opening_reason: Database["public"]["Enums"]["opening_reason"]
          opening_reason_detail?: string | null
          position_title: string
          published_at?: string | null
          published_job_id?: string | null
          requirements?: string[] | null
          requisition_approved_at?: string | null
          requisition_approved_by?: string | null
          requisition_rejection_reason?: string | null
          responsibilities?: string[] | null
          review_approved_at?: string | null
          review_approved_by?: string | null
          review_rejection_reason?: string | null
          salary_max?: number | null
          salary_min?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["job_request_status"]
          updated_at?: string | null
        }
        Update: {
          benefits?: string[] | null
          city?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string
          current_stage?: number
          department?: string | null
          desired_profile?: string
          id?: string
          job_description?: string | null
          job_type?: string
          location?: string
          opening_reason?: Database["public"]["Enums"]["opening_reason"]
          opening_reason_detail?: string | null
          position_title?: string
          published_at?: string | null
          published_job_id?: string | null
          requirements?: string[] | null
          requisition_approved_at?: string | null
          requisition_approved_by?: string | null
          requisition_rejection_reason?: string | null
          responsibilities?: string[] | null
          review_approved_at?: string | null
          review_approved_by?: string | null
          review_rejection_reason?: string | null
          salary_max?: number | null
          salary_min?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["job_request_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_requests_published_job_id_fkey"
            columns: ["published_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          benefits: string[] | null
          city: string | null
          company_id: string | null
          company_name: string
          created_at: string | null
          description: string
          external_company_name: string | null
          external_job_url: string | null
          id: string
          is_active: boolean | null
          is_archived: boolean | null
          job_request_id: string | null
          job_type: string
          location: string
          pipeline_stage: string
          requirements: string[] | null
          responsibilities: string[] | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          state: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          benefits?: string[] | null
          city?: string | null
          company_id?: string | null
          company_name: string
          created_at?: string | null
          description: string
          external_company_name?: string | null
          external_job_url?: string | null
          id?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          job_request_id?: string | null
          job_type: string
          location: string
          pipeline_stage?: string
          requirements?: string[] | null
          responsibilities?: string[] | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          state?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          benefits?: string[] | null
          city?: string | null
          company_id?: string | null
          company_name?: string
          created_at?: string | null
          description?: string
          external_company_name?: string | null
          external_job_url?: string | null
          id?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          job_request_id?: string | null
          job_type?: string
          location?: string
          pipeline_stage?: string
          requirements?: string[] | null
          responsibilities?: string[] | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          state?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_job_request_id_fkey"
            columns: ["job_request_id"]
            isOneToOne: false
            referencedRelation: "job_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_metrics: {
        Row: {
          active_tenants: number | null
          churned_tenants: number | null
          created_at: string | null
          date: string
          id: string
          new_tenants: number | null
          revenue_monthly: number | null
          total_applications: number | null
          total_employees: number | null
          total_jobs: number | null
          total_tenants: number | null
          total_users: number | null
        }
        Insert: {
          active_tenants?: number | null
          churned_tenants?: number | null
          created_at?: string | null
          date: string
          id?: string
          new_tenants?: number | null
          revenue_monthly?: number | null
          total_applications?: number | null
          total_employees?: number | null
          total_jobs?: number | null
          total_tenants?: number | null
          total_users?: number | null
        }
        Update: {
          active_tenants?: number | null
          churned_tenants?: number | null
          created_at?: string | null
          date?: string
          id?: string
          new_tenants?: number | null
          revenue_monthly?: number | null
          total_applications?: number | null
          total_employees?: number | null
          total_jobs?: number | null
          total_tenants?: number | null
          total_users?: number | null
        }
        Relationships: []
      }
      platform_plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_employees: number | null
          max_jobs: number | null
          max_users: number | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_employees?: number | null
          max_jobs?: number | null
          max_users?: number | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_employees?: number | null
          max_jobs?: number | null
          max_users?: number | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          birth_date: string | null
          city: string | null
          cnpj: string | null
          company_name: string | null
          cpf: string | null
          created_at: string | null
          cv_url: string | null
          educations: Json | null
          experiences: Json | null
          id: string
          linkedin_url: string | null
          name: string
          neighborhood: string | null
          phone: string | null
          portfolio_url: string | null
          skills: string[] | null
          state: string | null
          street: string | null
          street_number: string | null
          summary: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          cnpj?: string | null
          company_name?: string | null
          cpf?: string | null
          created_at?: string | null
          cv_url?: string | null
          educations?: Json | null
          experiences?: Json | null
          id: string
          linkedin_url?: string | null
          name: string
          neighborhood?: string | null
          phone?: string | null
          portfolio_url?: string | null
          skills?: string[] | null
          state?: string | null
          street?: string | null
          street_number?: string | null
          summary?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          city?: string | null
          cnpj?: string | null
          company_name?: string | null
          cpf?: string | null
          created_at?: string | null
          cv_url?: string | null
          educations?: Json | null
          experiences?: Json | null
          id?: string
          linkedin_url?: string | null
          name?: string
          neighborhood?: string | null
          phone?: string | null
          portfolio_url?: string | null
          skills?: string[] | null
          state?: string | null
          street?: string | null
          street_number?: string | null
          summary?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          about_content: string | null
          contact_email: string
          created_at: string | null
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          privacy_policy_content: string | null
          terms_of_use_content: string | null
          updated_at: string | null
          updated_by: string | null
          whatsapp_number: string | null
        }
        Insert: {
          about_content?: string | null
          contact_email: string
          created_at?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          privacy_policy_content?: string | null
          terms_of_use_content?: string | null
          updated_at?: string | null
          updated_by?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          about_content?: string | null
          contact_email?: string
          created_at?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          privacy_policy_content?: string | null
          terms_of_use_content?: string | null
          updated_at?: string | null
          updated_by?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          is_active: boolean | null
          linkedin_url: string | null
          name: string
          order_position: number | null
          photo_url: string | null
          role: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          linkedin_url?: string | null
          name: string
          order_position?: number | null
          photo_url?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          linkedin_url?: string | null
          name?: string
          order_position?: number | null
          photo_url?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          billing_email: string | null
          cnpj: string | null
          company_email: string
          company_id: string
          company_name: string
          company_phone: string | null
          created_at: string | null
          current_employees_count: number | null
          current_jobs_count: number | null
          current_users_count: number | null
          id: string
          notes: string | null
          plan_id: string | null
          settings: Json | null
          status: string
          subscription_ends_at: string | null
          subscription_starts_at: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          billing_email?: string | null
          cnpj?: string | null
          company_email: string
          company_id: string
          company_name: string
          company_phone?: string | null
          created_at?: string | null
          current_employees_count?: number | null
          current_jobs_count?: number | null
          current_users_count?: number | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          settings?: Json | null
          status?: string
          subscription_ends_at?: string | null
          subscription_starts_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_email?: string | null
          cnpj?: string | null
          company_email?: string
          company_id?: string
          company_name?: string
          company_phone?: string | null
          created_at?: string | null
          current_employees_count?: number | null
          current_jobs_count?: number | null
          current_users_count?: number | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          settings?: Json | null
          status?: string
          subscription_ends_at?: string | null
          subscription_starts_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "platform_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          allowed: boolean
          company_user_id: string
          created_at: string | null
          id: string
          permission_key: Database["public"]["Enums"]["permission_key"]
        }
        Insert: {
          allowed?: boolean
          company_user_id: string
          created_at?: string | null
          id?: string
          permission_key: Database["public"]["Enums"]["permission_key"]
        }
        Update: {
          allowed?: boolean
          company_user_id?: string
          created_at?: string | null
          id?: string
          permission_key?: Database["public"]["Enums"]["permission_key"]
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_company_user_id_fkey"
            columns: ["company_user_id"]
            isOneToOne: false
            referencedRelation: "company_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_stages: {
        Row: {
          automation_config: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          name: string
          order_position: number
          responsible_id: string | null
          stage_config: Json | null
          stage_type: string
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          automation_config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name: string
          order_position: number
          responsible_id?: string | null
          stage_config?: Json | null
          stage_type: string
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          automation_config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          name?: string
          order_position?: number
          responsible_id?: string | null
          stage_config?: Json | null
          stage_type?: string
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stages_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          template_data: Json
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          template_data: Json
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          template_data?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      workflows: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          job_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          job_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          job_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflows_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_company_users: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_owner: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      user_has_any_permission: {
        Args: {
          _company_id: string
          _permissions: Database["public"]["Enums"]["permission_key"][]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_permission: {
        Args: {
          _company_id: string
          _permission: Database["public"]["Enums"]["permission_key"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "company" | "candidate" | "super_admin"
      contract_type: "clt" | "pj" | "estagio" | "temporario"
      employee_status:
        | "ativo"
        | "em_ferias"
        | "afastado"
        | "desligado"
        | "aguardando_cadastro"
      job_request_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "in_creation"
        | "pending_review"
        | "published"
      occurrence_type: "advertencia" | "elogio" | "feedback" | "observacao"
      opening_reason:
        | "replacement"
        | "expansion"
        | "new_project"
        | "seasonal"
        | "other"
      permission_key:
        | "view_vagas"
        | "create_vagas"
        | "edit_vagas"
        | "publish_vagas"
        | "manage_candidatos"
        | "avaliar_candidatos"
        | "view_dashboard"
        | "manage_configuracoes"
        | "manage_usuarios"
        | "approve_vagas"
        | "reject_vagas"
        | "delete_vagas"
      request_status: "pendente" | "aprovada" | "rejeitada" | "cancelada"
      request_type:
        | "ferias"
        | "troca_turno"
        | "mudanca_setor"
        | "mudanca_cargo"
        | "alteracao_cadastral"
      shift_type: "primeiro" | "segundo" | "terceiro" | "administrativo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "company", "candidate", "super_admin"],
      contract_type: ["clt", "pj", "estagio", "temporario"],
      employee_status: [
        "ativo",
        "em_ferias",
        "afastado",
        "desligado",
        "aguardando_cadastro",
      ],
      job_request_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "in_creation",
        "pending_review",
        "published",
      ],
      occurrence_type: ["advertencia", "elogio", "feedback", "observacao"],
      opening_reason: [
        "replacement",
        "expansion",
        "new_project",
        "seasonal",
        "other",
      ],
      permission_key: [
        "view_vagas",
        "create_vagas",
        "edit_vagas",
        "publish_vagas",
        "manage_candidatos",
        "avaliar_candidatos",
        "view_dashboard",
        "manage_configuracoes",
        "manage_usuarios",
        "approve_vagas",
        "reject_vagas",
        "delete_vagas",
      ],
      request_status: ["pendente", "aprovada", "rejeitada", "cancelada"],
      request_type: [
        "ferias",
        "troca_turno",
        "mudanca_setor",
        "mudanca_cargo",
        "alteracao_cadastral",
      ],
      shift_type: ["primeiro", "segundo", "terceiro", "administrativo"],
    },
  },
} as const
