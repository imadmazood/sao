import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          created_at?: string;
        };
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          role: 'admin' | 'member';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: 'admin' | 'member';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: 'admin' | 'member';
          created_at?: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          user_id: string;
          avatar: string | null;
          offer: string | null;
          calendar_url: string | null;
          goal: string | null;
          status: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          avatar?: string | null;
          offer?: string | null;
          calendar_url?: string | null;
          goal?: string | null;
          status?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          avatar?: string | null;
          offer?: string | null;
          calendar_url?: string | null;
          goal?: string | null;
          status?: string | null;
          created_at?: string;
        };
      };
      campaign_sequences: {
        Row: {
          id: string;
          campaign_id: string;
          step_number: number;
          message_type: 'call' | 'sms' | 'whatsapp' | 'email';
          message_content: string | null;
          delay_hours: number;
          conditions: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          step_number: number;
          message_type: 'call' | 'sms' | 'whatsapp' | 'email';
          message_content?: string | null;
          delay_hours: number;
          conditions?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          step_number?: number;
          message_type?: 'call' | 'sms' | 'whatsapp' | 'email';
          message_content?: string | null;
          delay_hours?: number;
          conditions?: string | null;
          created_at?: string;
        };
      };
      conversation_history: {
        Row: {
          id: string;
          lead_id: string;
          campaign_id: string;
          channel: 'vapi' | 'sms' | 'whatsapp';
          from_role: 'ai' | 'lead';
          message: string;
          timestamp: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          campaign_id: string;
          channel: 'vapi' | 'sms' | 'whatsapp';
          from_role: 'ai' | 'lead';
          message: string;
          timestamp?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          campaign_id?: string;
          channel?: 'vapi' | 'sms' | 'whatsapp';
          from_role?: 'ai' | 'lead';
          message?: string;
          timestamp?: string;
        };
      };
      training_resources: {
        Row: {
          id: string;
          user_id: string;
          campaign_id: string | null;
          resource_type: 'note' | 'file' | 'link';
          title: string | null;
          content: string | null;
          file_url: string | null;
          link_url: string | null;
          tags: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          campaign_id?: string | null;
          resource_type: 'note' | 'file' | 'link';
          title?: string | null;
          content?: string | null;
          file_url?: string | null;
          link_url?: string | null;
          tags?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          campaign_id?: string | null;
          resource_type?: 'note' | 'file' | 'link';
          title?: string | null;
          content?: string | null;
          file_url?: string | null;
          link_url?: string | null;
          tags?: string[] | null;
          created_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          lead_id: string;
          campaign_id: string;
          booking_type: 'calendar' | 'manual' | 'reply';
          booking_date: string | null;
          booking_url: string | null;
          notes: string | null;
          status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          campaign_id: string;
          booking_type: 'calendar' | 'manual' | 'reply';
          booking_date?: string | null;
          booking_url?: string | null;
          notes?: string | null;
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          campaign_id?: string;
          booking_type?: 'calendar' | 'manual' | 'reply';
          booking_date?: string | null;
          booking_url?: string | null;
          notes?: string | null;
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
          created_at?: string;
        };
      };
      lead_sequence_progress: {
        Row: {
          id: string;
          lead_id: string;
          campaign_id: string;
          current_step: number;
          last_contact_date: string | null;
          next_contact_date: string | null;
          completed: boolean;
          paused: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          campaign_id: string;
          current_step?: number;
          last_contact_date?: string | null;
          next_contact_date?: string | null;
          completed?: boolean;
          paused?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          campaign_id?: string;
          current_step?: number;
          last_contact_date?: string | null;
          next_contact_date?: string | null;
          completed?: boolean;
          paused?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      uploaded_leads: {
        Row: {
          id: string;
          user_id: string;
          campaign_id: string;
          name: string | null;
          phone: string | null;
          email: string | null;
          company_name: string | null;
          job_title: string | null;
          source_url: string | null;
          source_platform: string | null;
          status: string | null;
          booking_url: string | null;
          vapi_call_id: string | null;
          twilio_sms_status: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          campaign_id: string;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          company_name?: string | null;
          job_title?: string | null;
          source_url?: string | null;
          source_platform?: string | null;
          status?: string | null;
          booking_url?: string | null;
          vapi_call_id?: string | null;
          twilio_sms_status?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          campaign_id?: string;
          name?: string | null;
          phone?: string | null;
          email?: string | null;
          company_name?: string | null;
          job_title?: string | null;
          source_url?: string | null;
          source_platform?: string | null;
          status?: string | null;
          booking_url?: string | null;
          vapi_call_id?: string | null;
          twilio_sms_status?: string | null;
          created_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          campaign_id: string;
          user_id: string;
          name: string | null;
          phone: string | null;
          status: string | null;
          booking_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          user_id: string;
          name?: string | null;
          phone?: string | null;
          status?: string | null;
          booking_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          user_id?: string;
          name?: string | null;
          phone?: string | null;
          status?: string | null;
          booking_url?: string | null;
          created_at?: string;
        };
      };
    };
  };
};