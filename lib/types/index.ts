export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          created_at: string | null
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blockchain_transactions: {
        Row: {
          block_hash: string
          confirmations: number | null
          confirmed: boolean | null
          from_entity: string | null
          id: string
          timestamp: string | null
          to_entity: string | null
          transaction_data: Json
          transaction_hash: string
          transaction_type: string
        }
        Insert: {
          block_hash: string
          confirmations?: number | null
          confirmed?: boolean | null
          from_entity?: string | null
          id?: string
          timestamp?: string | null
          to_entity?: string | null
          transaction_data?: Json
          transaction_hash: string
          transaction_type: string
        }
        Update: {
          block_hash?: string
          confirmations?: number | null
          confirmed?: boolean | null
          from_entity?: string | null
          id?: string
          timestamp?: string | null
          to_entity?: string | null
          transaction_data?: Json
          transaction_hash?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "blockchain_transactions_block_hash_fkey"
            columns: ["block_hash"]
            isOneToOne: false
            referencedRelation: "landlord_blocks"
            referencedColumns: ["block_hash"]
          },
        ]
      }
      complaints: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          status: string | null
          tenant_id: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          tenant_id?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          tenant_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "complaints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          agreed_to_terms: boolean
          created_at: string | null
          email: string
          first_name: string
          id: string
          inquiry_type: string
          ip_address: string | null
          last_name: string
          message: string
          phone: string | null
          preferred_contact: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          agreed_to_terms?: boolean
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          inquiry_type: string
          ip_address?: string | null
          last_name: string
          message: string
          phone?: string | null
          preferred_contact?: string
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          agreed_to_terms?: boolean
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          inquiry_type?: string
          ip_address?: string | null
          last_name?: string
          message?: string
          phone?: string | null
          preferred_contact?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          type?: string | null
        }
        Relationships: []
      }
      landlord_blocks: {
        Row: {
          block_data: Json
          block_hash: string
          block_number: number
          blockchain_signature: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          landlord_code: string
          landlord_email: string
          landlord_id: string
          landlord_name: string
          nonce: number | null
          previous_block_hash: string | null
          property_capacity: number
          property_used: number
        }
        Insert: {
          block_data?: Json
          block_hash: string
          block_number: number
          blockchain_signature?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          landlord_code: string
          landlord_email: string
          landlord_id: string
          landlord_name: string
          nonce?: number | null
          previous_block_hash?: string | null
          property_capacity?: number
          property_used?: number
        }
        Update: {
          block_data?: Json
          block_hash?: string
          block_number?: number
          blockchain_signature?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          landlord_code?: string
          landlord_email?: string
          landlord_id?: string
          landlord_name?: string
          nonce?: number | null
          previous_block_hash?: string | null
          property_capacity?: number
          property_used?: number
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string | null
          id: string
          message_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          emoji?: string | null
          id?: string
          message_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          emoji?: string | null
          id?: string
          message_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          id: string
          message_id: string | null
          seen_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          seen_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          seen_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string | null
          edited_at: string | null
          id: string
          is_edited: boolean | null
          read: boolean | null
          reply_to_id: string | null
          sender_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          read?: boolean | null
          reply_to_id?: string | null
          sender_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          read?: boolean | null
          reply_to_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          account_number: string | null
          amount: number
          created_at: string | null
          id: string
          landlord_id: string | null
          logged_by: string | null
          mpesa_code: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          payment_month: string
          phone_number: string | null
          status: string | null
          tenant_id: string | null
        }
        Insert: {
          account_number?: string | null
          amount: number
          created_at?: string | null
          id?: string
          landlord_id?: string | null
          logged_by?: string | null
          mpesa_code?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_month: string
          phone_number?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Update: {
          account_number?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          landlord_id?: string | null
          logged_by?: string | null
          mpesa_code?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_month?: string
          phone_number?: string | null
          status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          category: string | null
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          is_public: boolean | null
          mime_type: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          uploaded_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          is_public?: boolean | null
          mime_type?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_public?: boolean | null
          mime_type?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          file_url: string | null
          id: string
          title: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          title?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blockchain_verified: boolean | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          kyc_verified: boolean | null
          landlord_block_id: string | null
          landlord_code: string | null
          phone_number: string | null
          property_setup_complete: boolean | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          blockchain_verified?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          kyc_verified?: boolean | null
          landlord_block_id?: string | null
          landlord_code?: string | null
          phone_number?: string | null
          property_setup_complete?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          blockchain_verified?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          kyc_verified?: boolean | null
          landlord_block_id?: string | null
          landlord_code?: string | null
          phone_number?: string | null
          property_setup_complete?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_landlord_block_id_fkey"
            columns: ["landlord_block_id"]
            isOneToOne: false
            referencedRelation: "landlord_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          created_at: string | null
          id: string
          landlord_block_id: string
          property_address: string
          property_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          landlord_block_id: string
          property_address: string
          property_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          landlord_block_id?: string
          property_address?: string
          property_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_landlord_block_id_fkey"
            columns: ["landlord_block_id"]
            isOneToOne: false
            referencedRelation: "landlord_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      property_assignments: {
        Row: {
          landlord_id: string | null
          tenant_id: string | null
          unit: string | null
        }
        Insert: {
          landlord_id?: string | null
          tenant_id?: string | null
          unit?: string | null
        }
        Update: {
          landlord_id?: string | null
          tenant_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_assignments_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          endpoint: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          p256dh_key: string
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          p256dh_key: string
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          p256dh_key?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rent_settings: {
        Row: {
          created_at: string | null
          due_day: number | null
          id: string
          monthly_amount: number
          tenant_id: string | null
          unit_number: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          due_day?: number | null
          id?: string
          monthly_amount?: number
          tenant_id?: string | null
          unit_number?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          due_day?: number | null
          id?: string
          monthly_amount?: number
          tenant_id?: string | null
          unit_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rent_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          status: string | null
          tenant_id: string | null
          title: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          tenant_id?: string | null
          title?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          tenant_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          availability: string
          company_name: string | null
          created_at: string | null
          created_by: string | null
          email: string
          experience_years: number | null
          first_name: string
          hourly_rate: number | null
          id: string
          is_active: boolean
          last_name: string
          notes: string | null
          phone: string
          rating: number | null
          specialty: string
          total_jobs: number | null
          updated_at: string | null
        }
        Insert: {
          availability?: string
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          experience_years?: number | null
          first_name: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          last_name: string
          notes?: string | null
          phone: string
          rating?: number | null
          specialty: string
          total_jobs?: number | null
          updated_at?: string | null
        }
        Update: {
          availability?: string
          company_name?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          experience_years?: number | null
          first_name?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          last_name?: string
          notes?: string | null
          phone?: string
          rating?: number | null
          specialty?: string
          total_jobs?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      staff_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          property_id: string | null
          staff_id: string
          status: string
          tenant_id: string
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          property_id?: string | null
          staff_id: string
          status?: string
          tenant_id: string
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          property_id?: string | null
          staff_id?: string
          status?: string
          tenant_id?: string
          unit_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_availability: {
        Row: {
          created_at: string | null
          date: string
          end_time: string
          id: string
          notes: string | null
          staff_id: string
          start_time: string
          status: string
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          notes?: string | null
          staff_id: string
          start_time: string
          status?: string
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          notes?: string | null
          staff_id?: string
          start_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_availability_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_slots: {
        Row: {
          created_at: string | null
          id: string
          is_occupied: boolean | null
          landlord_block_id: string
          lease_end_date: string | null
          lease_start_date: string | null
          monthly_rent: number | null
          occupied_at: string | null
          property_id: string | null
          slot_number: number
          tenant_code: string
          tenant_email: string | null
          tenant_id: string | null
          tenant_name: string | null
          tenant_phone: string | null
          vacated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_occupied?: boolean | null
          landlord_block_id: string
          lease_end_date?: string | null
          lease_start_date?: string | null
          monthly_rent?: number | null
          occupied_at?: string | null
          property_id?: string | null
          slot_number: number
          tenant_code: string
          tenant_email?: string | null
          tenant_id?: string | null
          tenant_name?: string | null
          tenant_phone?: string | null
          vacated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_occupied?: boolean | null
          landlord_block_id?: string
          lease_end_date?: string | null
          lease_start_date?: string | null
          monthly_rent?: number | null
          occupied_at?: string | null
          property_id?: string | null
          slot_number?: number
          tenant_code?: string
          tenant_email?: string | null
          tenant_id?: string | null
          tenant_name?: string | null
          tenant_phone?: string | null
          vacated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_slots_landlord_block_id_fkey"
            columns: ["landlord_block_id"]
            isOneToOne: false
            referencedRelation: "landlord_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_slots_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      viewing_requests: {
        Row: {
          agreed_to_terms: boolean
          budget: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          email: string
          first_name: string
          group_size: string
          id: string
          ip_address: string | null
          last_name: string
          message: string | null
          phone: string
          preferred_date: string
          preferred_time: string
          property_type: string
          status: string
          updated_at: string | null
          urgency: string
          user_agent: string | null
        }
        Insert: {
          agreed_to_terms?: boolean
          budget?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          email: string
          first_name: string
          group_size: string
          id?: string
          ip_address?: string | null
          last_name: string
          message?: string | null
          phone: string
          preferred_date: string
          preferred_time: string
          property_type: string
          status?: string
          updated_at?: string | null
          urgency: string
          user_agent?: string | null
        }
        Update: {
          agreed_to_terms?: boolean
          budget?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          group_size?: string
          id?: string
          ip_address?: string | null
          last_name?: string
          message?: string | null
          phone?: string
          preferred_date?: string
          preferred_time?: string
          property_type?: string
          status?: string
          updated_at?: string | null
          urgency?: string
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
