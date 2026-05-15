ALTER TABLE "issue_classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "issue_classes" FORCE ROW LEVEL SECURITY;
CREATE POLICY "issue_classes_organization_isolation" ON "issue_classes"
  USING ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "issue_media" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "issue_media" FORCE ROW LEVEL SECURITY;
CREATE POLICY "issue_media_organization_isolation" ON "issue_media"
  USING ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "issues" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "issues" FORCE ROW LEVEL SECURITY;
CREATE POLICY "issues_organization_isolation" ON "issues"
  USING ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
CREATE POLICY "notifications_organization_isolation" ON "notifications"
  USING ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "project_modules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_modules" FORCE ROW LEVEL SECURITY;
CREATE POLICY "project_modules_organization_isolation" ON "project_modules"
  USING ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" FORCE ROW LEVEL SECURITY;
CREATE POLICY "projects_organization_isolation" ON "projects"
  USING ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "team_member_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "team_member_roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY "team_member_roles_organization_isolation" ON "team_member_roles"
  USING ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teams" FORCE ROW LEVEL SECURITY;
CREATE POLICY "teams_organization_isolation" ON "teams"
  USING ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "teams_to_projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teams_to_projects" FORCE ROW LEVEL SECURITY;
CREATE POLICY "teams_to_projects_organization_isolation" ON "teams_to_projects"
  USING ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "users_to_teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users_to_teams" FORCE ROW LEVEL SECURITY;
CREATE POLICY "users_to_teams_organization_isolation" ON "users_to_teams"
  USING ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid)
  WITH CHECK ("organization_id" = nullif(current_setting('app.current_organization_id', true), '')::uuid);
