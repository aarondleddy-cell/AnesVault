// Supabase Edge Function: emails each account owner a digest of credentials
// expiring within 90 days (or already expired). Schedule weekly via pg_cron
// (see schema.sql comment) or Supabase Dashboard > Edge Functions > Schedules.
//
// Deploy: supabase functions deploy credential-digest
// Secrets needed: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: holders, error: hErr } = await supabase
    .from("credential_holders")
    .select("id, user_id, name");
  if (hErr) return new Response(hErr.message, { status: 500 });

  const holderIds = holders.map((h) => h.id);
  const { data: creds, error: cErr } = await supabase
    .from("credentials")
    .select("id, holder_id, category, custom_label, expiration_date")
    .in("holder_id", holderIds.length ? holderIds : ["00000000-0000-0000-0000-000000000000"]);
  if (cErr) return new Response(cErr.message, { status: 500 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const byUser = new Map<string, { name: string; label: string; days: number }[]>();
  for (const c of creds) {
    const holder = holders.find((h) => h.id === c.holder_id);
    if (!holder) continue;
    const exp = new Date(c.expiration_date + "T00:00:00");
    const days = Math.round((exp.getTime() - today.getTime()) / 86400000);
    if (days > 90) continue;
    const label = c.category === "Custom" ? c.custom_label : c.category;
    const list = byUser.get(holder.user_id) ?? [];
    list.push({ name: holder.name, label, days });
    byUser.set(holder.user_id, list);
  }

  let sent = 0;
  for (const [userId, items] of byUser) {
    const { data: userRes } = await supabase.auth.admin.getUserById(userId);
    const email = userRes?.user?.email;
    if (!email) continue;

    const rows = items
      .sort((a, b) => a.days - b.days)
      .map((i) => `<tr><td style="padding:6px 12px">${i.name}</td><td style="padding:6px 12px">${i.label}</td><td style="padding:6px 12px">${i.days < 0 ? `${Math.abs(i.days)}d overdue` : `${i.days}d left`}</td></tr>`)
      .join("");

    const html = `<h2>Credential Tracker — Weekly Digest</h2>
      <p>The following credentials need attention:</p>
      <table style="border-collapse:collapse">${rows}</table>
      <p><a href="https://anesvault.com">Open Credential Tracker</a></p>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "hello@anesvault.com",
        to: email,
        subject: `${items.length} credential${items.length !== 1 ? "s" : ""} need attention`,
        html,
      }),
    });
    sent++;
  }

  return new Response(JSON.stringify({ emailsSent: sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
