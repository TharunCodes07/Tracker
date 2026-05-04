CREATE TABLE "issue_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"media_type" varchar(16) NOT NULL,
	"bucket" text NOT NULL,
	"object_key" text NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(127) NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issue_media" ADD CONSTRAINT "issue_media_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_media" ADD CONSTRAINT "issue_media_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_media" ADD CONSTRAINT "issue_media_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "issue_media_project_id_idx" ON "issue_media" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "issue_media_issue_id_idx" ON "issue_media" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "issue_media_media_type_idx" ON "issue_media" USING btree ("media_type");--> statement-breakpoint
CREATE INDEX "issue_media_created_by_idx" ON "issue_media" USING btree ("created_by");
