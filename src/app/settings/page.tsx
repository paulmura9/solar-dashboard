import { getSupabaseServerClient } from "@/lib/supabase/server";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const rawName = user?.user_metadata?.full_name ?? user?.user_metadata?.name;
  const name = typeof rawName === "string" && rawName.trim() ? rawName.trim() : null;

  return (
    <SettingsClient
      lastSignInAt={user?.last_sign_in_at ?? null}
      email={user?.email ?? null}
      name={name}
    />
  );
}
