/**
 * Tipos de la base de datos de Planora.
 *
 * Se mantienen a mano y deben reflejar `supabase/migrations/*`.
 * Para regenerarlos desde un proyecto real:
 *   supabase gen types typescript --project-id <id> > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type EducationLevel =
  | 'eso'
  | 'bachillerato'
  | 'fp'
  | 'universidad'
  | 'oposiciones'
  | 'otro';

export type PrimaryGoal = 'aprobar' | 'buena_nota' | 'organizarme' | 'crear_habito';

export type ThemePreference = 'system' | 'light' | 'dark';

export type FeedbackType = 'sugerencia' | 'problema' | 'valoracion';

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  education_level: EducationLevel | null;
  primary_goal: PrimaryGoal | null;
  daily_minutes_available: number | null;
  timezone: string;
  onboarding_completed_at: string | null;
  first_plan_created_at: string | null;
  created_at: string;
  updated_at: string;
}

export type UserSettingsRow = {
  user_id: string;
  theme: ThemePreference;
  study_reminders: boolean;
  exam_reminders: boolean;
  habit_reminders: boolean;
  marketing_opt_in: boolean;
  locale: string;
  created_at: string;
  updated_at: string;
}

export type SubjectRow = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AnalyticsEventRow = {
  id: string;
  user_id: string | null;
  name: string;
  properties: Json;
  created_at: string;
}

export type FeedbackRow = {
  id: string;
  user_id: string | null;
  type: FeedbackType;
  message: string;
  rating: number | null;
  created_at: string;
}

type Insertable<Row, Optional extends keyof Row> = Omit<Row, Optional> & Partial<Pick<Row, Optional>>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Insertable<
          ProfileRow,
          | 'email'
          | 'full_name'
          | 'username'
          | 'education_level'
          | 'primary_goal'
          | 'daily_minutes_available'
          | 'timezone'
          | 'onboarding_completed_at'
          | 'first_plan_created_at'
          | 'created_at'
          | 'updated_at'
        >;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      user_settings: {
        Row: UserSettingsRow;
        Insert: Insertable<UserSettingsRow, Exclude<keyof UserSettingsRow, 'user_id'>>;
        Update: Partial<UserSettingsRow>;
        Relationships: [];
      };
      subjects: {
        Row: SubjectRow;
        Insert: Insertable<
          SubjectRow,
          'id' | 'color' | 'archived_at' | 'created_at' | 'updated_at'
        >;
        Update: Partial<SubjectRow>;
        Relationships: [];
      };
      analytics_events: {
        Row: AnalyticsEventRow;
        Insert: Insertable<AnalyticsEventRow, 'id' | 'properties' | 'created_at'>;
        Update: Partial<AnalyticsEventRow>;
        Relationships: [];
      };
      feedback: {
        Row: FeedbackRow;
        Insert: Insertable<FeedbackRow, 'id' | 'rating' | 'created_at'>;
        Update: Partial<FeedbackRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      education_level: EducationLevel;
      primary_goal: PrimaryGoal;
      theme_preference: ThemePreference;
      feedback_type: FeedbackType;
    };
    CompositeTypes: Record<string, never>;
  };
}
