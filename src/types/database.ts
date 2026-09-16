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

export type ExamDifficulty = 'easy' | 'medium' | 'hard';

export type ExamStatus = 'active' | 'completed' | 'archived';

export type TaskType = 'study' | 'review' | 'quiz' | 'practice' | 'break';

export type TaskStatus = 'pending' | 'completed' | 'skipped';

export type PlanSource = 'ai' | 'deterministic';

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

export type ExamRow = {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  /** Fecha del examen en formato `YYYY-MM-DD`. */
  exam_date: string;
  difficulty: ExamDifficulty;
  daily_minutes: number;
  /** Días disponibles en formato ISO: 1 = lunes … 7 = domingo. */
  available_weekdays: number[];
  status: ExamStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TopicRow = {
  id: string;
  user_id: string;
  exam_id: string;
  name: string;
  position: number;
  weight: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StudyPlanRow = {
  id: string;
  user_id: string;
  exam_id: string;
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
};

export type StudyPlanVersionRow = {
  id: string;
  user_id: string;
  plan_id: string;
  version: number;
  source: PlanSource;
  reason: string;
  summary: Json;
  created_at: string;
};

export type StudyTaskRow = {
  id: string;
  user_id: string;
  exam_id: string;
  plan_version_id: string;
  topic_id: string | null;
  topic_label: string;
  /** Fecha programada en formato `YYYY-MM-DD`. */
  scheduled_date: string;
  duration_minutes: number;
  type: TaskType;
  status: TaskStatus;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

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
      exams: {
        Row: ExamRow;
        Insert: Insertable<
          ExamRow,
          | 'id'
          | 'subject_id'
          | 'difficulty'
          | 'daily_minutes'
          | 'available_weekdays'
          | 'status'
          | 'notes'
          | 'created_at'
          | 'updated_at'
        >;
        Update: Partial<ExamRow>;
        Relationships: [];
      };
      topics: {
        Row: TopicRow;
        Insert: Insertable<
          TopicRow,
          'id' | 'position' | 'weight' | 'completed_at' | 'created_at' | 'updated_at'
        >;
        Update: Partial<TopicRow>;
        Relationships: [];
      };
      study_plans: {
        Row: StudyPlanRow;
        Insert: Insertable<
          StudyPlanRow,
          'id' | 'current_version_id' | 'created_at' | 'updated_at'
        >;
        Update: Partial<StudyPlanRow>;
        Relationships: [];
      };
      study_plan_versions: {
        Row: StudyPlanVersionRow;
        Insert: Insertable<StudyPlanVersionRow, 'id' | 'reason' | 'summary' | 'created_at'>;
        Update: Partial<StudyPlanVersionRow>;
        Relationships: [];
      };
      study_tasks: {
        Row: StudyTaskRow;
        Insert: Insertable<
          StudyTaskRow,
          | 'id'
          | 'topic_id'
          | 'type'
          | 'status'
          | 'position'
          | 'completed_at'
          | 'created_at'
          | 'updated_at'
        >;
        Update: Partial<StudyTaskRow>;
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
      exam_difficulty: ExamDifficulty;
      exam_status: ExamStatus;
      task_type: TaskType;
      task_status: TaskStatus;
      plan_source: PlanSource;
    };
    CompositeTypes: Record<string, never>;
  };
}
