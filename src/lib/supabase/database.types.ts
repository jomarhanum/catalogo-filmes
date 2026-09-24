export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      genres: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      movie_genres: {
        Row: {
          genre_id: number
          movie_id: number
        }
        Insert: {
          genre_id: number
          movie_id: number
        }
        Update: {
          genre_id?: number
          movie_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "movie_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_genres_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_providers: {
        Row: {
          access_type: Database["public"]["Enums"]["access_type"]
          last_seen_at: string
          movie_id: number
          provider_id: number
        }
        Insert: {
          access_type: Database["public"]["Enums"]["access_type"]
          last_seen_at?: string
          movie_id: number
          provider_id: number
        }
        Update: {
          access_type?: Database["public"]["Enums"]["access_type"]
          last_seen_at?: string
          movie_id?: number
          provider_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "movie_providers_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_providers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "available_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_providers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      movies: {
        Row: {
          backdrop_path: string | null
          details_synced_at: string | null
          id: number
          original_language: string
          original_title: string
          overview: string | null
          popularity: number
          poster_path: string | null
          release_date: string | null
          runtime: number | null
          title: string
          trailer_key: string | null
          vote_average: number
          vote_count: number
        }
        Insert: {
          backdrop_path?: string | null
          details_synced_at?: string | null
          id: number
          original_language: string
          original_title: string
          overview?: string | null
          popularity?: number
          poster_path?: string | null
          release_date?: string | null
          runtime?: number | null
          title: string
          trailer_key?: string | null
          vote_average?: number
          vote_count?: number
        }
        Update: {
          backdrop_path?: string | null
          details_synced_at?: string | null
          id?: number
          original_language?: string
          original_title?: string
          overview?: string | null
          popularity?: number
          poster_path?: string | null
          release_date?: string | null
          runtime?: number | null
          title?: string
          trailer_key?: string | null
          vote_average?: number
          vote_count?: number
        }
        Relationships: []
      }
      providers: {
        Row: {
          display_priority: number
          id: number
          logo_path: string | null
          name: string
        }
        Insert: {
          display_priority?: number
          id: number
          logo_path?: string | null
          name: string
        }
        Update: {
          display_priority?: number
          id?: number
          logo_path?: string | null
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      available_providers: {
        Row: {
          display_priority: number | null
          id: number | null
          logo_path: string | null
          name: string | null
        }
        Insert: {
          display_priority?: number | null
          id?: number | null
          logo_path?: string | null
          name?: string | null
        }
        Update: {
          display_priority?: number | null
          id?: number | null
          logo_path?: string | null
          name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      f_unaccent: { Args: { "": string }; Returns: string }
      search_movies: {
        Args: {
          p_access?: Database["public"]["Enums"]["access_type"][]
          p_genres?: number[]
          p_language?: string
          p_limit?: number
          p_max_runtime?: number
          p_min_rating?: number
          p_offset?: number
          p_providers?: number[]
          p_sort?: string
          p_year_max?: number
          p_year_min?: number
        }
        Returns: {
          id: number
          poster_path: string
          providers: Json
          release_date: string
          runtime: number
          title: string
          total_count: number
          vote_average: number
        }[]
      }
      search_titles: {
        Args: { p_limit?: number; p_offset?: number; p_query: string }
        Returns: {
          id: number
          poster_path: string
          providers: Json
          release_date: string
          runtime: number
          title: string
          total_count: number
          vote_average: number
        }[]
      }
    }
    Enums: {
      access_type: "flatrate" | "rent" | "buy"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      access_type: ["flatrate", "rent", "buy"],
    },
  },
} as const

