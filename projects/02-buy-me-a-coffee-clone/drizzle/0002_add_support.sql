CREATE TABLE "support" (
	"id" serial PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"supporter_name" text NOT NULL,
	"amount" integer NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"order_id" text NOT NULL,
	"payment_key" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"fail_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp,
	CONSTRAINT "support_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
ALTER TABLE "support" ADD CONSTRAINT "support_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_creatorId_idx" ON "support" USING btree ("creator_id");