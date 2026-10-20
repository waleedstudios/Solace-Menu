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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ingredient_aliases: {
        Row: {
          alias: string
          created_at: string
          id: string
          ingredient_id: string
          product_code: string | null
          restaurant_id: string
          vendor_name: string | null
        }
        Insert: {
          alias: string
          created_at?: string
          id?: string
          ingredient_id: string
          product_code?: string | null
          restaurant_id: string
          vendor_name?: string | null
        }
        Update: {
          alias?: string
          created_at?: string
          id?: string
          ingredient_id?: string
          product_code?: string | null
          restaurant_id?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_aliases_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_aliases_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          added_sugar_per_100: number | null
          allergens: string[] | null
          base_unit: string
          brand: string | null
          calories_per_100g: number
          carbs_per_100g: number
          category: string | null
          created_at: string
          current_cost: number | null
          current_cost_date: string | null
          current_cost_invoice_id: string | null
          density_g_per_ml: number | null
          fats_per_100g: number
          fiber_per_100: number | null
          id: string
          label_image_path: string | null
          name: string
          nutrition_source: string | null
          pack_count: number | null
          pack_size: number | null
          pack_unit: string | null
          protein_per_100g: number
          purchase_unit: string | null
          restaurant_id: string | null
          sat_fat_per_100: number | null
          serving_size_text: string | null
          servings_per_container: number | null
          sodium_mg_per_100: number | null
          sugar_per_100: number | null
          supplier_code: string | null
          updated_at: string
          user_id: string | null
          vendor_id: string | null
          yield_pct: number
        }
        Insert: {
          added_sugar_per_100?: number | null
          allergens?: string[] | null
          base_unit?: string
          brand?: string | null
          calories_per_100g?: number
          carbs_per_100g?: number
          category?: string | null
          created_at?: string
          current_cost?: number | null
          current_cost_date?: string | null
          current_cost_invoice_id?: string | null
          density_g_per_ml?: number | null
          fats_per_100g?: number
          fiber_per_100?: number | null
          id?: string
          label_image_path?: string | null
          name: string
          nutrition_source?: string | null
          pack_count?: number | null
          pack_size?: number | null
          pack_unit?: string | null
          protein_per_100g?: number
          purchase_unit?: string | null
          restaurant_id?: string | null
          sat_fat_per_100?: number | null
          serving_size_text?: string | null
          servings_per_container?: number | null
          sodium_mg_per_100?: number | null
          sugar_per_100?: number | null
          supplier_code?: string | null
          updated_at?: string
          user_id?: string | null
          vendor_id?: string | null
          yield_pct?: number
        }
        Update: {
          added_sugar_per_100?: number | null
          allergens?: string[] | null
          base_unit?: string
          brand?: string | null
          calories_per_100g?: number
          carbs_per_100g?: number
          category?: string | null
          created_at?: string
          current_cost?: number | null
          current_cost_date?: string | null
          current_cost_invoice_id?: string | null
          density_g_per_ml?: number | null
          fats_per_100g?: number
          fiber_per_100?: number | null
          id?: string
          label_image_path?: string | null
          name?: string
          nutrition_source?: string | null
          pack_count?: number | null
          pack_size?: number | null
          pack_unit?: string | null
          protein_per_100g?: number
          purchase_unit?: string | null
          restaurant_id?: string | null
          sat_fat_per_100?: number | null
          serving_size_text?: string | null
          servings_per_container?: number | null
          sodium_mg_per_100?: number | null
          sugar_per_100?: number | null
          supplier_code?: string | null
          updated_at?: string
          user_id?: string | null
          vendor_id?: string | null
          yield_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          ingredient_id: string | null
          invoice_id: string
          line_total: number | null
          match_confidence: number | null
          match_reason: string | null
          match_status: string
          pack_count: number | null
          pack_size: number | null
          pack_unit: string | null
          position: number
          product_code: string | null
          quantity: number | null
          restaurant_id: string
          uncertain: boolean
          uncertain_note: string | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          ingredient_id?: string | null
          invoice_id: string
          line_total?: number | null
          match_confidence?: number | null
          match_reason?: string | null
          match_status?: string
          pack_count?: number | null
          pack_size?: number | null
          pack_unit?: string | null
          position?: number
          product_code?: string | null
          quantity?: number | null
          restaurant_id: string
          uncertain?: boolean
          uncertain_note?: string | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          ingredient_id?: string | null
          invoice_id?: string
          line_total?: number | null
          match_confidence?: number | null
          match_reason?: string | null
          match_status?: string
          pack_count?: number | null
          pack_size?: number | null
          pack_unit?: string | null
          position?: number
          product_code?: string | null
          quantity?: number | null
          restaurant_id?: string
          uncertain?: boolean
          uncertain_note?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          corrects_invoice_id: string | null
          created_at: string
          delivery: number | null
          discount: number | null
          doc_type: string
          extraction_error: string | null
          file_hash: string | null
          file_paths: string[]
          id: string
          invoice_date: string | null
          invoice_number: string | null
          location_id: string | null
          restaurant_id: string
          status: string
          subtotal: number | null
          tax: number | null
          total: number | null
          uncertain_fields: string[]
          updated_at: string
          uploaded_by: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          corrects_invoice_id?: string | null
          created_at?: string
          delivery?: number | null
          discount?: number | null
          doc_type?: string
          extraction_error?: string | null
          file_hash?: string | null
          file_paths?: string[]
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          location_id?: string | null
          restaurant_id: string
          status?: string
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          uncertain_fields?: string[]
          updated_at?: string
          uploaded_by?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          corrects_invoice_id?: string | null
          created_at?: string
          delivery?: number | null
          discount?: number | null
          doc_type?: string
          extraction_error?: string | null
          file_hash?: string | null
          file_paths?: string[]
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          location_id?: string | null
          restaurant_id?: string
          status?: string
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          uncertain_fields?: string[]
          updated_at?: string
          uploaded_by?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_corrects_invoice_id_fkey"
            columns: ["corrects_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          restaurant_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          restaurant_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_published: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portion_units: {
        Row: {
          average_grams: number
          created_at: string
          id: string
          max_grams: number | null
          min_grams: number | null
          name: string
          user_id: string
        }
        Insert: {
          average_grams: number
          created_at?: string
          id?: string
          max_grams?: number | null
          min_grams?: number | null
          name: string
          user_id: string
        }
        Update: {
          average_grams?: number
          created_at?: string
          id?: string
          max_grams?: number | null
          min_grams?: number | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          base_unit: string
          cost_per_base: number
          created_at: string
          id: string
          ingredient_id: string
          invoice_date: string
          invoice_id: string | null
          invoice_line_id: string | null
          location_id: string | null
          pack_base_qty: number | null
          pack_description: string | null
          restaurant_id: string
          vendor_name: string | null
        }
        Insert: {
          base_unit: string
          cost_per_base: number
          created_at?: string
          id?: string
          ingredient_id: string
          invoice_date: string
          invoice_id?: string | null
          invoice_line_id?: string | null
          location_id?: string | null
          pack_base_qty?: number | null
          pack_description?: string | null
          restaurant_id: string
          vendor_name?: string | null
        }
        Update: {
          base_unit?: string
          cost_per_base?: number
          created_at?: string
          id?: string
          ingredient_id?: string
          invoice_date?: string
          invoice_id?: string | null
          invoice_line_id?: string | null
          location_id?: string | null
          pack_base_qty?: number | null
          pack_description?: string | null
          restaurant_id?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_invoice_line_id_fkey"
            columns: ["invoice_line_id"]
            isOneToOne: false
            referencedRelation: "invoice_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          restaurant_name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          restaurant_name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          restaurant_name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      recipe_items: {
        Row: {
          created_at: string
          grams: number | null
          id: string
          ingredient_id: string
          is_modifier: boolean
          menu_item_id: string
          modifier_type: string | null
          portion_quantity: number | null
          portion_unit_id: string | null
        }
        Insert: {
          created_at?: string
          grams?: number | null
          id?: string
          ingredient_id: string
          is_modifier?: boolean
          menu_item_id: string
          modifier_type?: string | null
          portion_quantity?: number | null
          portion_unit_id?: string | null
        }
        Update: {
          created_at?: string
          grams?: number | null
          id?: string
          ingredient_id?: string
          is_modifier?: boolean
          menu_item_id?: string
          modifier_type?: string | null
          portion_quantity?: number | null
          portion_unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_portion_unit_id_fkey"
            columns: ["portion_unit_id"]
            isOneToOne: false
            referencedRelation: "portion_units"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_lines: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string | null
          position: number
          quantity: number
          recipe_id: string
          sub_recipe_id: string | null
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id?: string | null
          position?: number
          quantity: number
          recipe_id: string
          sub_recipe_id?: string | null
          unit: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string | null
          position?: number
          quantity?: number
          recipe_id?: string
          sub_recipe_id?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_lines_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_lines_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_lines_sub_recipe_id_fkey"
            columns: ["sub_recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          recipe_id: string
          restaurant_id: string
          snapshot: Json
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          recipe_id: string
          restaurant_id: string
          snapshot: Json
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          recipe_id?: string
          restaurant_id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_versions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_versions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          batch_yield_qty: number
          batch_yield_unit: string
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          instructions: string | null
          is_published: boolean
          is_subrecipe: boolean
          name: string
          packaging_cost: number
          public_macros: Json | null
          restaurant_id: string
          selling_price: number | null
          serving_size_text: string | null
          servings_per_batch: number
          updated_at: string
          version: number
        }
        Insert: {
          batch_yield_qty?: number
          batch_yield_unit?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_published?: boolean
          is_subrecipe?: boolean
          name: string
          packaging_cost?: number
          public_macros?: Json | null
          restaurant_id: string
          selling_price?: number | null
          serving_size_text?: string | null
          servings_per_batch?: number
          updated_at?: string
          version?: number
        }
        Update: {
          batch_yield_qty?: number
          batch_yield_unit?: string
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_published?: boolean
          is_subrecipe?: boolean
          name?: string
          packaging_cost?: number
          public_macros?: Json | null
          restaurant_id?: string
          selling_price?: number | null
          serving_size_text?: string | null
          servings_per_batch?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_members: {
        Row: {
          created_at: string
          email: string | null
          id: string
          restaurant_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          restaurant_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          restaurant_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_members_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          created_at: string
          id: string
          invoice_retention_days: number | null
          name: string
          owner_id: string
          price_alert_threshold_pct: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_retention_days?: number | null
          name: string
          owner_id: string
          price_alert_threshold_pct?: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_retention_days?: number | null
          name?: string
          owner_id?: string
          price_alert_threshold_pct?: number
        }
        Relationships: []
      }
      sales_imports: {
        Row: {
          created_at: string
          created_by: string | null
          file_name: string | null
          id: string
          location_id: string | null
          period_end: string | null
          period_start: string | null
          restaurant_id: string
          row_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          location_id?: string | null
          period_end?: string | null
          period_start?: string | null
          restaurant_id: string
          row_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          location_id?: string | null
          period_end?: string | null
          period_start?: string | null
          restaurant_id?: string
          row_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_imports_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_imports_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_lines: {
        Row: {
          discounts: number
          id: string
          import_id: string
          item_name: string
          location_id: string | null
          modifiers: string | null
          net_sales: number
          quantity: number
          refunds: number
          restaurant_id: string
          sale_date: string | null
        }
        Insert: {
          discounts?: number
          id?: string
          import_id: string
          item_name: string
          location_id?: string | null
          modifiers?: string | null
          net_sales?: number
          quantity?: number
          refunds?: number
          restaurant_id: string
          sale_date?: string | null
        }
        Update: {
          discounts?: number
          id?: string
          import_id?: string
          item_name?: string
          location_id?: string | null
          modifiers?: string | null
          net_sales?: number
          quantity?: number
          refunds?: number
          restaurant_id?: string
          sale_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_lines_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "sales_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lines_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lines_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_mappings: {
        Row: {
          id: string
          ignored: boolean
          recipe_id: string | null
          restaurant_id: string
          sales_item_name: string
        }
        Insert: {
          id?: string
          ignored?: boolean
          recipe_id?: string | null
          restaurant_id: string
          sales_item_name: string
        }
        Update: {
          id?: string
          ignored?: boolean
          recipe_id?: string | null
          restaurant_id?: string
          sales_item_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_mappings_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_mappings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
      vendors: {
        Row: {
          created_at: string
          id: string
          name: string
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          restaurant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_member_by_email: {
        Args: {
          _email: string
          _restaurant: string
          _role: Database["public"]["Enums"]["member_role"]
        }
        Returns: string
      }
      can_manage: { Args: { _restaurant: string }; Returns: boolean }
      get_public_menu: {
        Args: { _slug: string }
        Returns: {
          category: string
          description: string
          id: string
          image_url: string
          macros: Json
          name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member: { Args: { _restaurant: string }; Returns: boolean }
      is_owner: { Args: { _restaurant: string }; Returns: boolean }
      member_role_of: {
        Args: { _restaurant: string }
        Returns: Database["public"]["Enums"]["member_role"]
      }
      slugify: { Args: { value: string }; Returns: string }
    }
    Enums: {
      app_role: "admin"
      member_role: "owner" | "manager" | "staff"
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
      app_role: ["admin"],
      member_role: ["owner", "manager", "staff"],
    },
  },
} as const
