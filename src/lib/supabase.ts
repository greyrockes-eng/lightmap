import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Types ───
export interface Light {
  id: string;
  message: string;
  category: "kindness" | "encouragement" | "peace" | "relief";
  latitude: number;
  longitude: number;
  city: string | null;
  country: string;
  country_code: string | null;
  user_id: string | null;
  is_approved: boolean;
  boost_count: number;
  created_at: string;
}

export interface Arc {
  id: string;
  message: string;
  from_lat: number;
  from_lng: number;
  from_city: string | null;
  from_country: string;
  to_lat: number;
  to_lng: number;
  to_city: string | null;
  to_country: string;
  user_id: string | null;
  created_at: string;
}

export interface DailyStats {
  date: string;
  total_lights: number;
  total_arcs: number;
  total_countries: number;
  brightness_pct: number;
}

// ─── Data fetching helpers ───

export async function fetchRecentLights(limit = 50): Promise<Light[]> {
  const { data, error } = await supabase
    .from("lights")
    .select("*")
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function fetchRecentArcs(limit = 50): Promise<Arc[]> {
  const { data, error } = await supabase
    .from("arcs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function addLight(light: Omit<Light, "id" | "is_approved" | "boost_count" | "created_at" | "user_id">): Promise<Light> {
  const { data, error } = await supabase
    .from("lights")
    .insert(light)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addArc(arc: Omit<Arc, "id" | "created_at" | "user_id">): Promise<Arc> {
  const { data, error } = await supabase
    .from("arcs")
    .insert(arc)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getGlobalStats() {
  const [lightsResult, arcsResult, countriesResult] = await Promise.all([
    supabase.from("lights").select("id", { count: "exact", head: true }).eq("is_approved", true),
    supabase.from("arcs").select("id", { count: "exact", head: true }),
    supabase.from("lights").select("country").eq("is_approved", true),
  ]);

  const uniqueCountries = new Set(countriesResult.data?.map((r) => r.country) || []);

  return {
    totalLights: lightsResult.count || 0,
    totalArcs: arcsResult.count || 0,
    totalCountries: uniqueCountries.size,
    brightnessPct: Math.min(100, (uniqueCountries.size / 195) * 100),
  };
}

// ─── Real-time subscriptions ───

export function subscribeToLights(callback: (light: Light) => void) {
  return supabase
    .channel("lights-realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "lights", filter: "is_approved=eq.true" },
      (payload) => callback(payload.new as Light)
    )
    .subscribe();
}

export function subscribeToArcs(callback: (arc: Arc) => void) {
  return supabase
    .channel("arcs-realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "arcs" },
      (payload) => callback(payload.new as Arc)
    )
    .subscribe();
}
