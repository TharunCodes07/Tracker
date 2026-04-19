CREATE TABLE "issue_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "module_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "issue_class_id" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "issue_classes" ADD CONSTRAINT "issue_classes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_modules" ADD CONSTRAINT "project_modules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_classes_project_id_idx" ON "issue_classes" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_classes_project_name_unique" ON "issue_classes" USING btree ("project_id","name");--> statement-breakpoint
CREATE INDEX "project_modules_project_id_idx" ON "project_modules" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_modules_project_name_unique" ON "project_modules" USING btree ("project_id","name");--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_module_id_project_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."project_modules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_issue_class_id_issue_classes_id_fk" FOREIGN KEY ("issue_class_id") REFERENCES "public"."issue_classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issues_module_id_idx" ON "issues" USING btree ("module_id");--> statement-breakpoint
CREATE INDEX "issues_issue_class_id_idx" ON "issues" USING btree ("issue_class_id");--> statement-breakpoint
CREATE INDEX "issues_reviewed_by_idx" ON "issues" USING btree ("reviewed_by");--> statement-breakpoint
CREATE INDEX "issues_created_by_idx" ON "issues" USING btree ("created_by");