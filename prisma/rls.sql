-- Example PostgreSQL Row-Level Security policies for tenant-owned tables.
-- Apply this using a migration after reviewing the application role and query flow.
-- The application must set app.current_tenant_id transaction-locally for each request.

ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" FORCE ROW LEVEL SECURITY;

CREATE POLICY project_tenant_isolation ON "Project"
  USING ("tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "UsageEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UsageEvent" FORCE ROW LEVEL SECURITY;

CREATE POLICY usage_event_tenant_isolation ON "UsageEvent"
  USING ("tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_log_tenant_isolation ON "AuditLog"
  USING ("tenantId" = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

-- Example transaction context:
-- SELECT set_config('app.current_tenant_id', '<tenant-uuid>', true);
-- The third argument true makes the setting transaction-local.
-- Use a non-owner application DB role that does not have BYPASSRLS.
