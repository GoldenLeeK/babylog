export interface Database {
  public: {
    Tables: {
      baby_profiles: {
        Row: {
          id: string;
          family_id: string;
          name: string;
          nickname: string | null;
          date_of_birth: string;
          gender: 'male' | 'female' | null;
          birth_weight: number | null;
          current_weight: number | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          name: string;
          nickname?: string | null;
          date_of_birth: string;
          gender?: 'male' | 'female' | null;
          birth_weight?: number | null;
          current_weight?: number | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          name?: string;
          nickname?: string | null;
          date_of_birth?: string;
          gender?: 'male' | 'female' | null;
          birth_weight?: number | null;
          current_weight?: number | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      feeding_records: {
        Row: {
          id: string;
          user_id: string;
          family_id: string;
          baby_id: string | null;
          start_time: string;
          end_time: string;
          duration: number;
          left_duration: number;
          right_duration: number;
          note: string;
          feeding_type: 'breast' | 'bottle' | null;
          amount: number | null;
          left_side: boolean | null;
          right_side: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          family_id: string;
          baby_id?: string | null;
          start_time: string;
          end_time: string;
          duration: number;
          left_duration: number;
          right_duration: number;
          note?: string;
          feeding_type?: 'breast' | 'bottle' | null;
          amount?: number | null;
          left_side?: boolean | null;
          right_side?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          family_id?: string;
          baby_id?: string | null;
          start_time?: string;
          end_time?: string;
          duration?: number;
          left_duration?: number;
          right_duration?: number;
          note?: string;
          feeding_type?: 'breast' | 'bottle' | null;
          amount?: number | null;
          left_side?: boolean | null;
          right_side?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      diaper_records: {
        Row: {
          id: string;
          user_id: string;
          family_id: string;
          baby_id: string | null;
          time: string;
          type: 'pee' | 'poop' | 'both';
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          family_id: string;
          baby_id?: string | null;
          time: string;
          type: 'pee' | 'poop' | 'both';
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          family_id?: string;
          baby_id?: string | null;
          time?: string;
          type?: 'pee' | 'poop' | 'both';
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sleep_records: {
        Row: {
          id: string;
          user_id: string;
          family_id: string;
          baby_id: string | null;
          start_time: string;
          end_time: string | null;
          duration: number | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          family_id: string;
          baby_id?: string | null;
          start_time: string;
          end_time?: string | null;
          duration?: number | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          family_id?: string;
          baby_id?: string | null;
          start_time?: string;
          end_time?: string | null;
          duration?: number | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}