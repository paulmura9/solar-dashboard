import { getSupabaseServerClient } from "@/lib/supabase/server";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <SettingsClient lastSignInAt={user?.last_sign_in_at ?? null} />;
}
