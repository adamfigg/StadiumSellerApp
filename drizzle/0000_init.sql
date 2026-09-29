CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert" (
	"id" text PRIMARY KEY NOT NULL,
	"seller_id" text NOT NULL,
	"want_id" text NOT NULL,
	"matched_on" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer" (
	"id" text PRIMARY KEY NOT NULL,
	"want_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"price" double precision NOT NULL,
	"shipping" double precision DEFAULT 0 NOT NULL,
	"fulfillment" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"superseded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "seller_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"seller_type" text NOT NULL,
	"business_name" text,
	"interests" text[] DEFAULT '{}' NOT NULL,
	"stripe_account_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "want" (
	"id" text PRIMARY KEY NOT NULL,
	"buyer_id" text NOT NULL,
	"card_name" text NOT NULL,
	"set_name" text NOT NULL,
	"card_number" text,
	"description" text DEFAULT '' NOT NULL,
	"tcg_card_id" text,
	"official_image" text,
	"rarity" text,
	"market_price" double precision,
	"condition" jsonb NOT NULL,
	"price_min" double precision NOT NULL,
	"price_max" double precision NOT NULL,
	"scope" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"accepted_offer_id" text,
	"closed_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_seller_id_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_want_id_want_id_fk" FOREIGN KEY ("want_id") REFERENCES "public"."want"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_want_id_want_id_fk" FOREIGN KEY ("want_id") REFERENCES "public"."want"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_seller_id_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_profile" ADD CONSTRAINT "seller_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "want" ADD CONSTRAINT "want_buyer_id_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "alert_seller_idx" ON "alert" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "offer_want_idx" ON "offer" USING btree ("want_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "want_status_idx" ON "want" USING btree ("status");--> statement-breakpoint
CREATE INDEX "want_buyer_idx" ON "want" USING btree ("buyer_id");