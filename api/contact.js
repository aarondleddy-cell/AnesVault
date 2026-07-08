export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, email, message } = req.body;
  if (!email || !message) return res.status(400).json({ error: "Email and message are required" });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer re_SS2bcB6o_E2riBrj7S2cM1Kwobo3DfqaM"
      },
      body: JSON.stringify({
        from: "AnesVault Contact <hello@anesvault.com>",
        to: ["ADLMedgroup@gmail.com"],
        reply_to: email,
        subject: `AnesVault Contact: Message from ${name || email}`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #0D2B3E;">
            <div style="background: linear-gradient(160deg, #0D2B3E, #1A6B7C); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="font-size: 24px; color: white;">Anes<span style="color: #E8B45A; font-style: italic;">Vault</span></div>
              <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.1em;">New Contact Message</div>
            </div>
            <div style="background: #F0F5F7; padding: 32px; border-radius: 0 0 12px 12px;">
              <p style="font-size: 14px; color: #4A6572; margin-bottom: 6px;"><strong>From:</strong> ${name || "Not provided"}</p>
              <p style="font-size: 14px; color: #4A6572; margin-bottom: 20px;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #1A6B7C;">${email}</a></p>
              <div style="background: white; border-radius: 10px; padding: 20px; border-left: 4px solid #C8963E;">
                <p style="font-size: 14px; font-weight: bold; color: #0D2B3E; margin-bottom: 8px;">Message:</p>
                <p style="font-size: 14px; color: #4A6572; line-height: 1.7; white-space: pre-wrap;">${message}</p>
              </div>
              <p style="font-size: 12px; color: #8AA5B0; margin-top: 20px;">Reply directly to this email to respond to ${name || email}.</p>
            </div>
          </div>
        `
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(400).json({ error: data });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
