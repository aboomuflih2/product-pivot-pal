import { supabase } from "@/integrations/supabase/client";

export async function invokeFunction<T = any>(name: string, body?: any): Promise<{ data?: T; error?: any }> {
  try {
    const { data, error } = await supabase.functions.invoke(name, body ? { body } : undefined);
    if (!error) return { data };
  } catch (_) {}

  const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
  if (!functionsUrl) return { error: new Error("Edge Function unavailable and no fallback URL configured") };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${functionsUrl.replace(/\/$/, "")}/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (res.ok) return { data: json };
    return { error: json?.error || new Error(`Function ${name} failed`) };
  } catch (e: any) {
    return { error: e };
  }
}

