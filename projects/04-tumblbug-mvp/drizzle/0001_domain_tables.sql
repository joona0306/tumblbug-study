CREATE TABLE "funding" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"supporter_id" text NOT NULL,
	"reward_id" integer,
	"quantity" integer DEFAULT 1 NOT NULL,
	"extra_amount" integer DEFAULT 0 NOT NULL,
	"amount" integer NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"recipient_name" text,
	"recipient_phone" text,
	"address" text,
	"order_id" text NOT NULL,
	"payment_key" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"fail_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp,
	CONSTRAINT "funding_order_id_unique" UNIQUE("order_id"),
	CONSTRAINT "funding_payment_key_unique" UNIQUE("payment_key"),
	CONSTRAINT "funding_status_check" CHECK ("funding"."status" in ('pending','paid','failed')),
	CONSTRAINT "funding_amount_check" CHECK ("funding"."amount" between 1000 and 1000000),
	CONSTRAINT "funding_quantity_check" CHECK ("funding"."quantity" between 1 and 5),
	CONSTRAINT "funding_extra_check" CHECK ("funding"."extra_amount" >= 0),
	CONSTRAINT "funding_paid_check" CHECK ("funding"."status" <> 'paid' or ("funding"."payment_key" is not null and "funding"."paid_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "payment_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"order_id" text NOT NULL,
	"status" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_event_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" serial PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"goal_amount" integer NOT NULL,
	"deadline" date NOT NULL,
	"image_url" text NOT NULL,
	"status" text DEFAULT 'funding' NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_category_check" CHECK ("project"."category" in ('living','craft','publishing','music','beauty','game')),
	CONSTRAINT "project_status_check" CHECK ("project"."status" in ('funding','success','failed')),
	CONSTRAINT "project_goal_check" CHECK ("project"."goal_amount" between 10000 and 100000000)
);
--> statement-breakpoint
CREATE TABLE "project_like" (
	"user_id" text NOT NULL,
	"project_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_like_user_id_project_id_pk" PRIMARY KEY("user_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "reward" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"limit_qty" integer,
	"sold_qty" integer DEFAULT 0 NOT NULL,
	"delivery_month" date NOT NULL,
	"needs_shipping" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reward_price_check" CHECK ("reward"."price" between 1000 and 1000000),
	CONSTRAINT "reward_limit_check" CHECK ("reward"."limit_qty" is null or "reward"."limit_qty" > 0),
	CONSTRAINT "reward_sold_check" CHECK ("reward"."sold_qty" >= 0 and ("reward"."limit_qty" is null or "reward"."sold_qty" <= "reward"."limit_qty"))
);
--> statement-breakpoint
ALTER TABLE "funding" ADD CONSTRAINT "funding_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding" ADD CONSTRAINT "funding_supporter_id_user_id_fk" FOREIGN KEY ("supporter_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding" ADD CONSTRAINT "funding_reward_id_reward_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."reward"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_like" ADD CONSTRAINT "project_like_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_like" ADD CONSTRAINT "project_like_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward" ADD CONSTRAINT "reward_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "funding_supporter_idx" ON "funding" USING btree ("supporter_id");--> statement-breakpoint
CREATE INDEX "project_creator_idx" ON "project" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "project_like_project_idx" ON "project_like" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "reward_project_idx" ON "reward" USING btree ("project_id");