CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entidade" text NOT NULL,
	"entidade_id" uuid NOT NULL,
	"rateio_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"acao" text DEFAULT 'update' NOT NULL,
	"diff_json" jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "despesas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rateio_id" uuid NOT NULL,
	"data" date NOT NULL,
	"descricao" text NOT NULL,
	"pagador_user_id" uuid NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entidade_tipo" text NOT NULL,
	"entidade_id" uuid NOT NULL,
	"rateio_id" uuid NOT NULL,
	"url" text NOT NULL,
	"rotulo" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membros" (
	"rateio_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"cota" numeric(9, 6) DEFAULT '0' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rateios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"corrigir_ipca" boolean DEFAULT true NOT NULL,
	"criado_por_user_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"arquivado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reembolsos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rateio_id" uuid NOT NULL,
	"data" date NOT NULL,
	"pagador_user_id" uuid NOT NULL,
	"recebedor_user_id" uuid NOT NULL,
	"valor" numeric(14, 2) NOT NULL,
	"observacao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxas_ipca" (
	"mes" date PRIMARY KEY NOT NULL,
	"taxa" numeric(8, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_rateio_id_rateios_id_fk" FOREIGN KEY ("rateio_id") REFERENCES "public"."rateios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_rateio_id_rateios_id_fk" FOREIGN KEY ("rateio_id") REFERENCES "public"."rateios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_pagador_user_id_users_id_fk" FOREIGN KEY ("pagador_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_rateio_id_rateios_id_fk" FOREIGN KEY ("rateio_id") REFERENCES "public"."rateios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membros" ADD CONSTRAINT "membros_rateio_id_rateios_id_fk" FOREIGN KEY ("rateio_id") REFERENCES "public"."rateios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membros" ADD CONSTRAINT "membros_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rateios" ADD CONSTRAINT "rateios_criado_por_user_id_users_id_fk" FOREIGN KEY ("criado_por_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reembolsos" ADD CONSTRAINT "reembolsos_rateio_id_rateios_id_fk" FOREIGN KEY ("rateio_id") REFERENCES "public"."rateios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reembolsos" ADD CONSTRAINT "reembolsos_pagador_user_id_users_id_fk" FOREIGN KEY ("pagador_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reembolsos" ADD CONSTRAINT "reembolsos_recebedor_user_id_users_id_fk" FOREIGN KEY ("recebedor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;