CREATE TABLE "funnel_event" (
	"visitor_id" text NOT NULL,
	"project_id" integer NOT NULL,
	"step" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "funnel_event_visitor_id_project_id_step_pk" PRIMARY KEY("visitor_id","project_id","step"),
	CONSTRAINT "funnel_event_step_check" CHECK ("funnel_event"."step" in ('view','reward','shipping','payment_request','paid'))
);
--> statement-breakpoint
ALTER TABLE "funnel_event" ADD CONSTRAINT "funnel_event_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "funnel_event_created_idx" ON "funnel_event" USING btree ("created_at");