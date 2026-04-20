# Project Memory

## Core
- Roles: candidate, company (tenant), admin, super_admin. Public reg: candidate & company only.
- Multi-tenant SaaS: 'tenants' table mapped to 'platform_plans'. Backoffice for super_admin.
- Backoffice (`/backoffice/*`) REQUIRES super_admin login via BackofficeProtectedRoute.
- Routing: Login auto-redirects to role dashboard ('/candidate', '/company', '/backoffice/dashboard').
- UI Preference: Use standard `<input type="date">` to allow manual typing and native picker.

## Memories
- [RBAC Roles](mem://auth/rbac-roles) — System roles and registration constraints
- [SaaS Tenancy](mem://architecture/saas-tenancy) — Multi-tenant structure using tenants and platform_plans
- [Backoffice Access](mem://auth/backoffice-access) — Backoffice requires super_admin login
- [Recruitment Kanban](mem://features/recruitment-kanban-logic) — Dynamic Kanban stages and status synchronization
- [Recruitment UI](mem://features/recruitment-ui-pattern) — Dialog-based StagePanels for candidate selection
- [Super Admin Jobs](mem://features/super-admin-job-posting) — Direct job publishing without tenant association
- [Application Constraints](mem://features/job-application-constraints) — Role restriction for applying to jobs
- [Candidate Skills](mem://features/candidate-skills-logic) — Skill data structure and predefined levels
- [Candidate CV Storage](mem://features/candidate-cv-storage) — Path and bucket rules for CV uploads
- [Company Nav](mem://style/navigation-structure) — Visual sections for company navigation
- [Date Inputs](mem://style/date-input-preference) — Preference for standard HTML date input
- [Login Redirection](mem://auth/login-redirection-logic) — Role-based dashboard routing post-login
