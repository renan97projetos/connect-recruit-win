---
name: Backoffice Access
description: Backoffice routes require super_admin login (reverted previous public-access exception)
type: feature
---
- All `/backoffice/*` routes are wrapped in `BackofficeProtectedRoute`.
- `/backoffice/login` is the only public backoffice route.
- Auth handled by `BackofficeAuthContext` — only users with `user_roles.role = 'super_admin'` can access.
- RLS on `tenants`, `platform_plans`, `platform_metrics`, `backoffice_audit_logs`, etc. depends on `is_super_admin(auth.uid())` — without login, listings come back empty.
