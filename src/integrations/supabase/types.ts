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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      absences: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          student_id: string
          subject_id: string
          type: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          student_id: string
          subject_id: string
          type: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          student_id?: string
          subject_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absences_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_calendar: {
        Row: {
          date: string
          day_type: string
          id: string
          label: string | null
        }
        Insert: {
          date: string
          day_type: string
          id?: string
          label?: string | null
        }
        Update: {
          date?: string
          day_type?: string
          id?: string
          label?: string | null
        }
        Relationships: []
      }
      academic_quarters: {
        Row: {
          access_mode: string
          end_date: string
          id: string
          name: string
          start_date: string
          year: string
        }
        Insert: {
          access_mode?: string
          end_date: string
          id?: string
          name: string
          start_date: string
          year?: string
        }
        Update: {
          access_mode?: string
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          year?: string
        }
        Relationships: []
      }
      cell_comments: {
        Row: {
          class_id: string
          comment: string
          created_at: string
          date: string
          id: string
          student_id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          comment?: string
          created_at?: string
          date: string
          id?: string
          student_id: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          comment?: string
          created_at?: string
          date?: string
          id?: string
          student_id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_accounts: {
        Row: {
          class_id: string
          created_at: string
          email: string
          id: string
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          email: string
          id?: string
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_accounts_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedule: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          id: string
          lesson_number: number
          published: boolean
          room: string | null
          subject_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          id?: string
          lesson_number?: number
          published?: boolean
          room?: string | null
          subject_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          id?: string
          lesson_number?: number
          published?: boolean
          room?: string | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedule_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_schedule_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      class_subjects: {
        Row: {
          class_id: string
          hours_per_week: number
          id: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          hours_per_week?: number
          id?: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          hours_per_week?: number
          id?: string
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          id: string
          name: string
          teacher_id: string | null
          year: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          teacher_id?: string | null
          year?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          teacher_id?: string | null
          year?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_history: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          changed_by_name: string | null
          class_id: string
          comment: string | null
          date: string
          grade_id: string | null
          id: string
          new_value: number | null
          old_comment: string | null
          old_value: number | null
          student_id: string
          subject_id: string
          work_type_id: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          class_id: string
          comment?: string | null
          date: string
          grade_id?: string | null
          id?: string
          new_value?: number | null
          old_comment?: string | null
          old_value?: number | null
          student_id: string
          subject_id: string
          work_type_id?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          changed_by_name?: string | null
          class_id?: string
          comment?: string | null
          date?: string
          grade_id?: string | null
          id?: string
          new_value?: number | null
          old_comment?: string | null
          old_value?: number | null
          student_id?: string
          subject_id?: string
          work_type_id?: string | null
        }
        Relationships: []
      }
      grades: {
        Row: {
          class_id: string
          comment: string | null
          created_at: string
          date: string
          id: string
          provisional_until: string | null
          student_id: string
          subject_id: string
          value: number
          weight: number
          work_type_id: string | null
        }
        Insert: {
          class_id: string
          comment?: string | null
          created_at?: string
          date: string
          id?: string
          provisional_until?: string | null
          student_id: string
          subject_id: string
          value: number
          weight?: number
          work_type_id?: string | null
        }
        Update: {
          class_id?: string
          comment?: string | null
          created_at?: string
          date?: string
          id?: string
          provisional_until?: string | null
          student_id?: string
          subject_id?: string
          value?: number
          weight?: number
          work_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_work_type_id_fkey"
            columns: ["work_type_id"]
            isOneToOne: false
            referencedRelation: "work_types"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          class_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          status: string
          subject_id: string
          teacher_id: string
          title: string
        }
        Insert: {
          class_id: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          status?: string
          subject_id: string
          teacher_id: string
          title: string
        }
        Update: {
          class_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          status?: string
          subject_id?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_date_access: {
        Row: {
          class_id: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          reason: string | null
          subject_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          reason?: string | null
          subject_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          reason?: string | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_date_access_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_date_access_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_works: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          subject_id: string
          work_type_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          subject_id: string
          work_type_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          subject_id?: string
          work_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_works_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_works_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_works_work_type_id_fkey"
            columns: ["work_type_id"]
            isOneToOne: false
            referencedRelation: "work_types"
            referencedColumns: ["id"]
          },
        ]
      }
      school_display_defaults: {
        Row: {
          quarter_id: string | null
          target: string
        }
        Insert: {
          quarter_id?: string | null
          target: string
        }
        Update: {
          quarter_id?: string | null
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_display_defaults_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "academic_quarters"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          hours_per_week: number
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          hours_per_week?: number
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          hours_per_week?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      teacher_classes: {
        Row: {
          class_id: string
          id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          id?: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_display_defaults: {
        Row: {
          class_id: string | null
          teacher_id: string
        }
        Insert: {
          class_id?: string | null
          teacher_id: string
        }
        Update: {
          class_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_display_defaults_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_display_defaults_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_requests: {
        Row: {
          acknowledged: boolean
          created_at: string
          id: string
          message: string | null
          request_type: string
          status: string
          target_id: string
          target_name: string
          teacher_id: string
        }
        Insert: {
          acknowledged?: boolean
          created_at?: string
          id?: string
          message?: string | null
          request_type: string
          status?: string
          target_id: string
          target_name: string
          teacher_id: string
        }
        Update: {
          acknowledged?: boolean
          created_at?: string
          id?: string
          message?: string | null
          request_type?: string
          status?: string
          target_id?: string
          target_name?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_subjects: {
        Row: {
          id: string
          pending_removal: boolean
          subject_id: string
          teacher_id: string
        }
        Insert: {
          id?: string
          pending_removal?: boolean
          subject_id: string
          teacher_id: string
        }
        Update: {
          id?: string
          pending_removal?: boolean
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      trimester_grades: {
        Row: {
          class_id: string
          created_at: string
          id: string
          quarter_id: string
          student_id: string
          subject_id: string
          value: number
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          quarter_id: string
          student_id: string
          subject_id: string
          value: number
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          quarter_id?: string
          student_id?: string
          subject_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "trimester_grades_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trimester_grades_quarter_id_fkey"
            columns: ["quarter_id"]
            isOneToOne: false
            referencedRelation: "academic_quarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trimester_grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trimester_grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_types: {
        Row: {
          created_at: string
          id: string
          name: string
          short_name: string
          subject_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          short_name: string
          subject_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          short_name?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_types_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_class: { Args: { _class_id: string }; Returns: boolean }
      get_my_class_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_school_member: { Args: never; Returns: boolean }
      my_teacher_id: { Args: never; Returns: string }
      teaches_class: { Args: { _class_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "teacher" | "class_account"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher", "class_account"],
    },
  },
} as const
