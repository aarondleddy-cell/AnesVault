import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action, id, password } = req.body || {};

  // Every admin action requires the correct password, checked server-side only.
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  try {
    if (action === "verify") {
      // Used just to confirm login — no data returned beyond success.
      return res.status(200).json({ success: true });
    }

    if (action === "list") {
      const { data, error } = await supabaseAdmin
        .from("documents")
        .select("*")
        .eq("approved", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return res.status(200).json({ success: true, documents: data || [] });
    }

    if (action === "approve") {
      if (!id) return res.status(400).json({ error: "Missing document id" });
      const { error } = await supabaseAdmin.from("documents").update({ approved: true }).eq("id", id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    if (action === "reject") {
      if (!id) return res.status(400).json({ error: "Missing document id" });
      const { error } = await supabaseAdmin.from("documents").delete().eq("id", id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    console.error("admin-documents error:", err);
    return res.status(500).json({ error: "Server error — please try again." });
  }
}
