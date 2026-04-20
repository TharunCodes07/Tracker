CREATE TABLE "team_member_roles" (
	"user_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"role" varchar(24) NOT NULL,
	CONSTRAINT "team_member_roles_user_id_team_id_role_pk" PRIMARY KEY("user_id","team_id","role")
);
--> statement-breakpoint
DROP INDEX "project_modules_project_name_unique";--> statement-breakpoint
ALTER TABLE "project_modules" ADD COLUMN "parent_module_id" uuid;--> statement-breakpoint
ALTER TABLE "team_member_roles" ADD CONSTRAINT "team_member_roles_membership_fk" FOREIGN KEY ("user_id","team_id") REFERENCES "public"."users_to_teams"("user_id","team_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_member_roles_user_id_idx" ON "team_member_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_member_roles_team_id_idx" ON "team_member_roles" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_member_roles_role_idx" ON "team_member_roles" USING btree ("role");--> statement-breakpoint
ALTER TABLE "project_modules" ADD CONSTRAINT "project_modules_parent_module_id_project_modules_id_fk" FOREIGN KEY ("parent_module_id") REFERENCES "public"."project_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_modules_parent_module_id_idx" ON "project_modules" USING btree ("parent_module_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_modules_project_parent_name_unique" ON "project_modules" USING btree ("project_id","parent_module_id","name");