


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (
    NEW.id,
    -- ✅ Use metadata role if exists, otherwise default to 'tenant'
    COALESCE(NEW.raw_user_meta_data->>'role', 'tenant'),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',  -- Google sends 'name' not 'full_name'
      split_part(NEW.email, '@', 1)     -- fallback to email username
    ),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;  -- ✅ Don't fail if profile already exists
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."account_deletion_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "reason" "text",
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "reviewed_at" timestamp without time zone,
    "reviewed_by" "uuid"
);

ALTER TABLE ONLY "public"."account_deletion_requests" REPLICA IDENTITY FULL;


ALTER TABLE "public"."account_deletion_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."complaints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "title" character varying(255),
    "description" "text",
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."complaints" REPLICA IDENTITY FULL;


ALTER TABLE "public"."complaints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid",
    "user_id" "uuid"
);

ALTER TABLE ONLY "public"."conversation_participants" REPLICA IDENTITY FULL;


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "type" character varying(50)
);

ALTER TABLE ONLY "public"."conversations" REPLICA IDENTITY FULL;


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid",
    "user_id" "uuid",
    "emoji" character varying(10),
    "created_at" timestamp without time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."message_reactions" REPLICA IDENTITY FULL;


ALTER TABLE "public"."message_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_reads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid",
    "user_id" "uuid",
    "seen_at" timestamp without time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."message_reads" REPLICA IDENTITY FULL;


ALTER TABLE "public"."message_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid",
    "sender_id" "uuid",
    "content" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "read" boolean DEFAULT false,
    "reply_to_id" "uuid",
    "is_edited" boolean DEFAULT false,
    "edited_at" timestamp without time zone
);

ALTER TABLE ONLY "public"."messages" REPLICA IDENTITY FULL;


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "landlord_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "phone_number" character varying(20),
    "mpesa_code" character varying(50),
    "account_number" character varying(100),
    "payment_month" character varying(7) NOT NULL,
    "payment_date" timestamp without time zone DEFAULT "now"(),
    "status" character varying(20) DEFAULT 'confirmed'::character varying,
    "payment_method" character varying(20) DEFAULT 'mpesa'::character varying,
    "notes" "text",
    "logged_by" character varying(20) DEFAULT 'system'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."payments" REPLICA IDENTITY FULL;


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text",
    "description" "text",
    "file_url" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_size" integer,
    "mime_type" "text",
    "category" "text" DEFAULT 'general'::"text",
    "tags" "text"[],
    "is_public" boolean DEFAULT false,
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(255),
    "content" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "category" character varying(100),
    "file_url" "text",
    "created_by" "uuid"
);

ALTER TABLE ONLY "public"."policies" REPLICA IDENTITY FULL;


ALTER TABLE "public"."policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" character varying(255) DEFAULT 'tenant'::character varying,
    "full_name" character varying(255),
    "email" character varying(255),
    "avatar_url" "text",
    "phone_number" character varying(20)
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_assignments" (
    "tenant_id" "uuid",
    "landlord_id" "uuid",
    "unit" character varying(50)
);


ALTER TABLE "public"."property_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rent_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "monthly_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "due_day" integer DEFAULT 5,
    "unit_number" character varying(50),
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."rent_settings" REPLICA IDENTITY FULL;


ALTER TABLE "public"."rent_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "title" character varying(255),
    "description" "text",
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "category" character varying(100)
);

ALTER TABLE ONLY "public"."requests" REPLICA IDENTITY FULL;


ALTER TABLE "public"."requests" OWNER TO "postgres";


ALTER TABLE ONLY "public"."account_deletion_requests"
    ADD CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_user_id_emoji_key" UNIQUE ("message_id", "user_id", "emoji");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_message_id_user_id_key" UNIQUE ("message_id", "user_id");



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_mpesa_code_key" UNIQUE ("mpesa_code");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."policies"
    ADD CONSTRAINT "policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rent_settings"
    ADD CONSTRAINT "rent_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rent_settings"
    ADD CONSTRAINT "rent_settings_tenant_id_key" UNIQUE ("tenant_id");



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_photos_category" ON "public"."photos" USING "btree" ("category");



CREATE INDEX "idx_photos_is_public" ON "public"."photos" USING "btree" ("is_public");



CREATE INDEX "idx_photos_uploaded_at" ON "public"."photos" USING "btree" ("uploaded_at" DESC);



CREATE INDEX "idx_photos_user_id" ON "public"."photos" USING "btree" ("user_id");



CREATE INDEX "profiles_phone_idx" ON "public"."profiles" USING "btree" ("phone_number");



ALTER TABLE ONLY "public"."account_deletion_requests"
    ADD CONSTRAINT "account_deletion_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."account_deletion_requests"
    ADD CONSTRAINT "account_deletion_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."complaints"
    ADD CONSTRAINT "complaints_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_landlord_id_fkey" FOREIGN KEY ("landlord_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."policies"
    ADD CONSTRAINT "policies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_assignments"
    ADD CONSTRAINT "property_assignments_landlord_id_fkey" FOREIGN KEY ("landlord_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."property_assignments"
    ADD CONSTRAINT "property_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."rent_settings"
    ADD CONSTRAINT "rent_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Landlords can view all photos" ON "public"."photos" FOR SELECT USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE (("profiles"."role")::"text" = 'landlord'::"text"))));



CREATE POLICY "Users can delete their own photos" ON "public"."photos" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own photos" ON "public"."photos" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own photos" ON "public"."photos" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own photos" ON "public"."photos" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("is_public" = true)));



ALTER TABLE "public"."account_deletion_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."complaints" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "complaints_delete" ON "public"."complaints" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'landlord'::"text")))));



CREATE POLICY "complaints_insert" ON "public"."complaints" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "auth"."uid"()));



CREATE POLICY "complaints_select" ON "public"."complaints" FOR SELECT TO "authenticated" USING ((("tenant_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'landlord'::"text"))))));



CREATE POLICY "complaints_update" ON "public"."complaints" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'landlord'::"text")))));



ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversations_insert" ON "public"."conversations" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "conversations_select" ON "public"."conversations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "deletion_requests_insert" ON "public"."account_deletion_requests" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "deletion_requests_select" ON "public"."account_deletion_requests" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'landlord'::"text"))))));



CREATE POLICY "deletion_requests_update_landlord" ON "public"."account_deletion_requests" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'landlord'::"text")))));



ALTER TABLE "public"."message_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_reads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_insert" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK (("sender_id" = "auth"."uid"()));



CREATE POLICY "messages_select" ON "public"."messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "messages"."conversation_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "participants_insert" ON "public"."conversation_participants" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "participants_select" ON "public"."conversation_participants" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_landlord_delete" ON "public"."payments" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'landlord'::"text")))));



CREATE POLICY "payments_landlord_insert" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'landlord'::"text")))));



CREATE POLICY "payments_landlord_update" ON "public"."payments" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'landlord'::"text")))));



CREATE POLICY "payments_tenant_select" ON "public"."payments" FOR SELECT TO "authenticated" USING ((("tenant_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'landlord'::"text"))))));



ALTER TABLE "public"."photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."policies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "policies_delete" ON "public"."policies" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'landlord'::"text")))));



CREATE POLICY "policies_insert" ON "public"."policies" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'landlord'::"text")))));



CREATE POLICY "policies_select" ON "public"."policies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "policies_update" ON "public"."policies" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'landlord'::"text")))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "reactions_delete" ON "public"."message_reactions" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "reactions_insert" ON "public"."message_reactions" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "reactions_select" ON "public"."message_reactions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "reads_insert" ON "public"."message_reads" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "reads_select" ON "public"."message_reads" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."rent_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rent_settings_landlord" ON "public"."rent_settings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'landlord'::"text")))));



CREATE POLICY "rent_settings_select" ON "public"."rent_settings" FOR SELECT TO "authenticated" USING ((("tenant_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'landlord'::"text"))))));



ALTER TABLE "public"."requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "requests_delete" ON "public"."requests" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'landlord'::"text")))));



CREATE POLICY "requests_insert" ON "public"."requests" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" = "auth"."uid"()));



CREATE POLICY "requests_select" ON "public"."requests" FOR SELECT TO "authenticated" USING ((("tenant_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'landlord'::"text"))))));



CREATE POLICY "requests_update" ON "public"."requests" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = 'landlord'::"text")))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."account_deletion_requests";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."complaints";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversation_participants";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."conversations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."message_reactions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."message_reads";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."payments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."policies";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."rent_settings";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."requests";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


















GRANT ALL ON TABLE "public"."account_deletion_requests" TO "anon";
GRANT ALL ON TABLE "public"."account_deletion_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."account_deletion_requests" TO "service_role";



GRANT ALL ON TABLE "public"."complaints" TO "anon";
GRANT ALL ON TABLE "public"."complaints" TO "authenticated";
GRANT ALL ON TABLE "public"."complaints" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_participants" TO "anon";
GRANT ALL ON TABLE "public"."conversation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."message_reactions" TO "anon";
GRANT ALL ON TABLE "public"."message_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."message_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."message_reads" TO "anon";
GRANT ALL ON TABLE "public"."message_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."message_reads" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."photos" TO "anon";
GRANT ALL ON TABLE "public"."photos" TO "authenticated";
GRANT ALL ON TABLE "public"."photos" TO "service_role";



GRANT ALL ON TABLE "public"."policies" TO "anon";
GRANT ALL ON TABLE "public"."policies" TO "authenticated";
GRANT ALL ON TABLE "public"."policies" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."property_assignments" TO "anon";
GRANT ALL ON TABLE "public"."property_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."property_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."rent_settings" TO "anon";
GRANT ALL ON TABLE "public"."rent_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."rent_settings" TO "service_role";



GRANT ALL ON TABLE "public"."requests" TO "anon";
GRANT ALL ON TABLE "public"."requests" TO "authenticated";
GRANT ALL ON TABLE "public"."requests" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































