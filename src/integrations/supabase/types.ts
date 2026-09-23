export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      home_page_settings: {
        Row: {
          id: string
          featured_programs_enabled: boolean
          featured_programs_tag: string
          featured_programs_title: string
          featured_programs_subtitle: string
          featured_programs_btn_text: string
          featured_programs_btn_link: string
          featured_programs_items: Json
          announcements_bar_enabled: boolean
          announcements_bar_label: string
          announcements_bar_speed: number
          announcements_items: Json
          upcoming_tracks_enabled: boolean
          upcoming_tracks_tag: string
          upcoming_tracks_title: string
          upcoming_tracks_subtitle: string
          upcoming_tracks_btn_text: string
          upcoming_tracks_items: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          featured_programs_enabled?: boolean
          featured_programs_tag?: string
          featured_programs_title?: string
          featured_programs_subtitle?: string
          featured_programs_btn_text?: string
          featured_programs_btn_link?: string
          featured_programs_items?: Json
          announcements_bar_enabled?: boolean
          announcements_bar_label?: string
          announcements_bar_speed?: number
          announcements_items?: Json
          upcoming_tracks_enabled?: boolean
          upcoming_tracks_tag?: string
          upcoming_tracks_title?: string
          upcoming_tracks_subtitle?: string
          upcoming_tracks_btn_text?: string
          upcoming_tracks_items?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          featured_programs_enabled?: boolean
          featured_programs_tag?: string
          featured_programs_title?: string
          featured_programs_subtitle?: string
          featured_programs_btn_text?: string
          featured_programs_btn_link?: string
          featured_programs_items?: Json
          announcements_bar_enabled?: boolean
          announcements_bar_label?: string
          announcements_bar_speed?: number
          announcements_items?: Json
          upcoming_tracks_enabled?: boolean
          upcoming_tracks_tag?: string
          upcoming_tracks_title?: string
          upcoming_tracks_subtitle?: string
          upcoming_tracks_btn_text?: string
          upcoming_tracks_items?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      admins: {
        Row: {
          id: string
          full_name: string
          email: string | null
          role: 'admin' | 'super_admin'
          approval_status: 'pending' | 'approved' | 'rejected' | 'suspended'
          avatar_path: string | null
          password: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string
          email?: string | null
          role?: 'admin' | 'super_admin'
          approval_status?: 'pending' | 'approved' | 'rejected' | 'suspended'
          avatar_path?: string | null
          password?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string | null
          role?: 'admin' | 'super_admin'
          approval_status?: 'pending' | 'approved' | 'rejected' | 'suspended'
          avatar_path?: string | null
          password?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      trainers: {
        Row: {
          id: string
          full_name: string
          email: string | null
          role: 'trainer'
          approval_status: 'pending' | 'approved' | 'rejected' | 'suspended'
          avatar_path: string | null
          proof_path: string | null
          biodata_path: string | null
          study_details: string | null
          bio: string | null
          years_of_experience: number | null
          qualifications: string | null
          availability: string | null
          mobile_number: string | null
          is_mobile_verified: boolean
          password: string | null
          created_at: string
          updated_at: string
          work_experience: string | null
          interests: string | null
        }
        Insert: {
          id: string
          full_name?: string
          email?: string | null
          role?: 'trainer'
          approval_status?: 'pending' | 'approved' | 'rejected' | 'suspended'
          avatar_path?: string | null
          proof_path?: string | null
          biodata_path?: string | null
          study_details?: string | null
          bio?: string | null
          years_of_experience?: number | null
          qualifications?: string | null
          availability?: string | null
          mobile_number?: string | null
          is_mobile_verified?: boolean
          is_email_verified?: boolean
          password?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string | null
          role?: 'trainer'
          approval_status?: 'pending' | 'approved' | 'rejected' | 'suspended'
          avatar_path?: string | null
          proof_path?: string | null
          biodata_path?: string | null
          study_details?: string | null
          bio?: string | null
          years_of_experience?: number | null
          qualifications?: string | null
          availability?: string | null
          mobile_number?: string | null
          is_mobile_verified?: boolean
          is_email_verified?: boolean
          password?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      trainees: {
        Row: {
          id: string
          full_name: string
          email: string | null
          role: 'trainee'
          approval_status: 'pending' | 'approved' | 'rejected' | 'suspended'
          avatar_path: string | null
          proof_path: string | null
          department: string | null
          designation: string | null
          mobile_number: string | null
          is_mobile_verified: boolean
          is_email_verified: boolean
          password: string | null
          created_at: string
          updated_at: string
          qualifications: string | null
          work_experience: string | null
          interests: string | null
        }
        Insert: {
          id: string
          full_name?: string
          email?: string | null
          role?: 'trainee'
          approval_status?: 'pending' | 'approved' | 'rejected' | 'suspended'
          avatar_path?: string | null
          proof_path?: string | null
          department?: string | null
          designation?: string | null
          mobile_number?: string | null
          is_mobile_verified?: boolean
          is_email_verified?: boolean
          password?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string | null
          role?: 'trainee'
          approval_status?: 'pending' | 'approved' | 'rejected' | 'suspended'
          avatar_path?: string | null
          proof_path?: string | null
          department?: string | null
          designation?: string | null
          mobile_number?: string | null
          is_mobile_verified?: boolean
          is_email_verified?: boolean
          password?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          id: string
          title: string
          description: string | null
          course_type: string
          trainer_id: string | null
          department: string | null
          duration_minutes: number | null
          passing_score: number | null
          status: 'draft' | 'pending_review' | 'published' | 'archived'
          thumbnail_path: string | null
          learning_objectives: Json | null
          competencies: Json | null
          created_at: string
          updated_at: string
          published_at: string | null
          meet_link: string | null
          start_date: string | null
          end_date: string | null
          delivery_mode: string | null
          session_flow_text: string | null
          session_flow_document_path: string | null
          live_class_timing: string | null
          mock_test_timing: string | null
          final_exam_timing: string | null
          final_test_date: string | null
          final_test_start_time: string | null
          final_test_end_time: string | null
          planned_assessments_count: number | null
          planned_mock_tests_count: number | null
          max_trainees: number | null
          trainer_suggestion: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          course_type?: string
          trainer_id?: string | null
          department?: string | null
          duration_minutes?: number | null
          passing_score?: number
          status?: 'draft' | 'pending_review' | 'published' | 'archived'
          thumbnail_path?: string | null
          learning_objectives?: Json | null
          competencies?: Json | null
          created_at?: string
          updated_at?: string
          published_at?: string | null
          meet_link?: string | null
          start_date?: string | null
          end_date?: string | null
          delivery_mode?: string | null
          session_flow_text?: string | null
          session_flow_document_path?: string | null
          live_class_timing?: string | null
          mock_test_timing?: string | null
          final_exam_timing?: string | null
          final_test_date?: string | null
          final_test_start_time?: string | null
          final_test_end_time?: string | null
          planned_assessments_count?: number | null
          planned_mock_tests_count?: number | null
          max_trainees?: number | null
          trainer_suggestion?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          course_type?: string
          trainer_id?: string | null
          department?: string | null
          duration_minutes?: number | null
          passing_score?: number
          status?: 'draft' | 'pending_review' | 'published' | 'archived'
          thumbnail_path?: string | null
          learning_objectives?: Json | null
          competencies?: Json | null
          created_at?: string
          updated_at?: string
          published_at?: string | null
          meet_link?: string | null
          start_date?: string | null
          end_date?: string | null
          delivery_mode?: string | null
          session_flow_text?: string | null
          session_flow_document_path?: string | null
          live_class_timing?: string | null
          mock_test_timing?: string | null
          final_exam_timing?: string | null
          final_test_date?: string | null
          final_test_start_time?: string | null
          final_test_end_time?: string | null
          planned_assessments_count?: number | null
          planned_mock_tests_count?: number | null
          max_trainees?: number | null
          trainer_suggestion?: string | null
        }
        Relationships: []
      }
      course_sessions: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          start_time: string | null
          end_time: string | null
          meet_link: string | null
          order_index: number
          created_at: string
          updated_at: string
          session_type: string | null
          location: string | null
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          description?: string | null
          start_time?: string | null
          end_time?: string | null
          meet_link?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
          session_type?: string | null
          location?: string | null
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          description?: string | null
          start_time?: string | null
          end_time?: string | null
          meet_link?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
          session_type?: string | null
          location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
      }
      materials: {
        Row: {
          id: string
          course_id: string
          uploaded_by: string
          file_name: string
          storage_path: string
          mime_type: string | null
          file_size: number | null
          extracted_text: string | null
          extraction_status: 'pending' | 'completed' | 'failed'
          material_type: 'file' | 'link' | 'video'
          url: string | null
          created_at: string
          session_id: string | null
        }
        Insert: {
          id?: string
          course_id: string
          uploaded_by: string
          file_name: string
          storage_path: string
          mime_type?: string | null
          file_size?: number | null
          extracted_text?: string | null
          extraction_status?: 'pending' | 'completed' | 'failed'
          material_type?: 'file' | 'link' | 'video'
          url?: string | null
          created_at?: string
          session_id?: string | null
        }
        Update: {
          id?: string
          course_id?: string
          uploaded_by?: string
          file_name?: string
          storage_path?: string
          mime_type?: string | null
          file_size?: number | null
          extracted_text?: string | null
          extraction_status?: 'pending' | 'completed' | 'failed'
          material_type?: 'file' | 'link' | 'video'
          url?: string | null
          created_at?: string
          session_id?: string | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          id: string
          user_id: string
          course_id: string
          status: 'pending_approval' | 'enrolled' | 'in_progress' | 'completed' | 'withdrawn' | 'rejected'
          progress_percent: number
          enrolled_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          status?: 'pending_approval' | 'enrolled' | 'in_progress' | 'completed' | 'withdrawn' | 'rejected'
          progress_percent?: number
          enrolled_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          status?: 'pending_approval' | 'enrolled' | 'in_progress' | 'completed' | 'withdrawn' | 'rejected'
          progress_percent?: number
          enrolled_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      assessments: {
        Row: {
          id: string
          course_id: string
          title: string
          instructions: string | null
          passing_score: number
          status: 'draft' | 'pending_review' | 'published' | 'archived'
          created_by: string
          created_at: string
          updated_at: string
          assessment_type: string
          requires_sea: boolean
          sea_link: string | null
          scheduled_date: string | null
          start_time: string | null
          end_time: string | null
          duration_minutes: number | null
            results_publish_date: string | null
            is_adaptive: boolean | null
            is_simulation: boolean | null
            simulation_dataset_url: string | null
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          instructions?: string | null
          passing_score?: number
          status?: 'draft' | 'pending_review' | 'published' | 'archived'
          created_by: string
          created_at?: string
          updated_at?: string
          assessment_type?: string
          requires_sea?: boolean
          sea_link?: string | null
          scheduled_date?: string | null
          start_time?: string | null
          end_time?: string | null
          duration_minutes?: number | null
            results_publish_date?: string | null
            is_adaptive?: boolean | null
            is_simulation?: boolean | null
            simulation_dataset_url?: string | null
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          instructions?: string | null
          passing_score?: number
          status?: 'draft' | 'pending_review' | 'published' | 'archived'
          created_by?: string
          created_at?: string
          updated_at?: string
          assessment_type?: string
          requires_sea?: boolean
          sea_link?: string | null
          scheduled_date?: string | null
          start_time?: string | null
          end_time?: string | null
          duration_minutes?: number | null
            results_publish_date?: string | null
            is_adaptive?: boolean | null
            is_simulation?: boolean | null
            simulation_dataset_url?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          id: string
          assessment_id: string
          question_text: string
          options: Json
          correct_answer: string
          explanation: string | null
          position: number
          approved: boolean
          created_at: string
            difficulty: 'easy' | 'medium' | 'hard' | null
        }
        Insert: {
          id?: string
          assessment_id: string
          question_text: string
          options: Json
          correct_answer: string
          explanation?: string | null
          position?: number
          approved?: boolean
          created_at?: string
            difficulty?: 'easy' | 'medium' | 'hard' | null
        }
        Update: {
          id?: string
          assessment_id?: string
          question_text?: string
          options?: Json
          correct_answer?: string
          explanation?: string | null
          position?: number
          approved?: boolean
          created_at?: string
            difficulty?: 'easy' | 'medium' | 'hard' | null
        }
        Relationships: []
      }
      assessment_attempts: {
        Row: {
          id: string
          assessment_id: string
          user_id: string
          score: number | null
          passed: boolean | null
          started_at: string
          submitted_at: string | null
        }
        Insert: {
          id?: string
          assessment_id: string
          user_id: string
          score?: number | null
          passed?: boolean | null
          started_at?: string
          submitted_at?: string | null
        }
        Update: {
          id?: string
          assessment_id?: string
          user_id?: string
          score?: number | null
          passed?: boolean | null
          started_at?: string
          submitted_at?: string | null
        }
        Relationships: []
      }
      attempt_answers: {
        Row: {
          id: string
          attempt_id: string
          question_id: string
          selected_answer: string
          is_correct: boolean
          created_at: string
        }
        Insert: {
          id?: string
          attempt_id: string
          question_id: string
          selected_answer: string
          is_correct: boolean
          created_at?: string
        }
        Update: {
          id?: string
          attempt_id?: string
          question_id?: string
          selected_answer?: string
          is_correct?: boolean
          created_at?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          id: string
          certificate_number: string
          user_id: string
          course_id: string
          final_score: number
          storage_path: string
          verification_hash: string
          issued_at: string
          expires_at: string | null
          status: 'valid' | 'revoked'
          revoked_at: string | null
          revoked_by: string | null
        }
        Insert: {
          id?: string
          certificate_number: string
          user_id: string
          course_id: string
          final_score: number
          storage_path: string
          verification_hash: string
          issued_at?: string
          expires_at?: string | null
          status?: 'valid' | 'revoked'
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Update: {
          id?: string
          certificate_number?: string
          user_id?: string
          course_id?: string
          final_score?: number
          storage_path?: string
          verification_hash?: string
          issued_at?: string
          expires_at?: string | null
          status?: 'valid' | 'revoked'
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Relationships: []
      }
      skills: {
        Row: {
          id: string
          name: string
          category: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_skills: {
        Row: {
          user_id: string
          skill_id: string
          level: number
        }
        Insert: {
          user_id: string
          skill_id: string
          level?: number
        }
        Update: {
          user_id?: string
          skill_id?: string
          level?: number
        }
        Relationships: []
      }
      course_skills: {
        Row: {
          course_id: string
          skill_id: string
          required_level: number
        }
        Insert: {
          course_id: string
          skill_id: string
          required_level?: number
        }
        Update: {
          course_id?: string
          skill_id?: string
          required_level?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          related_certificate_id: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          related_certificate_id?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          related_certificate_id?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          id: string
          title: string
          content: string
          author_id: string
          target_audience: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          author_id: string
          target_audience?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          author_id?: string
          target_audience?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }

      course_announcements: {
        Row: {
          id: string
          course_id: string
          trainer_id: string
          title: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          trainer_id: string
          title: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          trainer_id?: string
          title?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_announcements_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      course_messages: {
        Row: {
          id: string
          course_id: string
          sender_id: string
          content: string
          is_private: boolean
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          sender_id: string
          content: string
          is_private?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          sender_id?: string
          content?: string
          is_private?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_messages_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      course_feedback: {
        Row: {
          id: string
          course_id: string
          user_id: string
          rating: number
          comments: string | null
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          user_id: string
          rating: number
          comments?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          user_id?: string
          rating?: number
          comments?: string | null
          created_at?: string
        }
        Relationships: []
      }
      scenario_modules: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      scenario_nodes: {
        Row: {
          id: string
          scenario_id: string
          question: string
          options: Json
          correct_option: string
          explanation: string | null
          position: number
          next_node_id: string | null
          score_value: number
        }
        Insert: {
          id?: string
          scenario_id: string
          question: string
          options: Json
          correct_option: string
          explanation?: string | null
          position?: number
          next_node_id?: string | null
          score_value?: number
        }
        Update: {
          id?: string
          scenario_id?: string
          question?: string
          options?: Json
          correct_option?: string
          explanation?: string | null
          position?: number
          next_node_id?: string | null
          score_value?: number
        }
        Relationships: []
      }
    }
    Views: {
      questions_safe: {
        Row: {
          id: string | null
          assessment_id: string | null
          question_text: string | null
          options: Json | null
          position: number | null
        }
        Relationships: []
      }
      scenario_nodes_safe: {
        Row: {
          id: string | null
          scenario_id: string | null
          question: string | null
          options: Json | null
          position: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      admin_update_user: {
        Args: {
          target_user_id: string
          new_role: string
          new_status: string
        }
        Returns: void
      }
      admin_delete_user: {
        Args: {
          target_user_id: string
        }
        Returns: void
      }
      super_admin_promote_to_admin: {
        Args: {
          target_user_id: string
        }
        Returns: void
      }
      admin_update_course: {
        Args: {
          target_course_id: string
          new_status: string
        }
        Returns: void
      }
      generate_mobile_otp: {
        Args: {
          p_mobile: string
        }
        Returns: string
      }
      verify_mobile_otp: {
        Args: {
          p_mobile: string
          p_otp: string
          p_user_id: string
        }
        Returns: boolean
      }
      generate_otp: {
        Args: {
          p_identifier: string
          p_type: string
        }
        Returns: string
      }
      verify_otp: {
        Args: {
          p_identifier: string
          p_otp: string
          p_user_id: string
          p_type: string
        }
        Returns: boolean
      }
      check_otp_match: {
        Args: {
          p_identifier: string
          p_otp: string
          p_type: string
        }
        Returns: boolean
      }
    }
    Enums: {}
    CompositeTypes: {}
  }
}
