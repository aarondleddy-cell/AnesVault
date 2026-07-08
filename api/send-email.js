export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const welcomeHtml = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #0D2B3E;">
      <div style="background: linear-gradient(160deg, #0D2B3E, #1A6B7C); padding: 40px 32px; text-align: center; border-radius: 12px 12px 0 0;">
        <div style="font-size: 32px; color: white; margin-bottom: 6px;">Anes<span style="color: #E8B45A; font-style: italic;">Vault</span></div>
        <div style="font-size: 13px; color: rgba(255,255,255,0.7); letter-spacing: 0.1em; text-transform: uppercase;">Welcome to the Community</div>
      </div>
      <div style="background: #F0F5F7; padding: 32px; border-radius: 0 0 12px 12px;">
        <p style="font-size: 18px; font-weight: bold; margin-bottom: 12px;">Hey ${name || "there"}, welcome to AnesVault! 🎉</p>
        <p style="font-size: 14px; line-height: 1.7; color: #4A6572; margin-bottom: 20px;">You've just joined a growing community of CRNAs and MDAs in independent practice who are sharing resources, building better businesses, and supporting each other along the way.</p>
        <div style="background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #1A6B7C;">
          <p style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #0D2B3E;">Here's what you can do on AnesVault:</p>
          <ul style="font-size: 13px; color: #4A6572; line-height: 2; padding-left: 20px; margin: 0;">
            <li>📄 <strong>Browse & Download</strong> free business documents shared by your peers</li>
            <li>⬆️ <strong>Upload your own</strong> templates, forms, and resources</li>
            <li>💰 <strong>Explore Business Write-Offs</strong> built specifically for anesthesia providers</li>
            <li>🎥 <strong>Watch educational content</strong> on our YouTube channel @AnesVault</li>
          </ul>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="https://anesvault.com" style="display: inline-block; padding: 14px 32px; background: #1A6B7C; color: white; text-decoration: none; border-radius: 100px; font-weight: bold; font-size: 15px;">Visit AnesVault →</a>
        </div>
        <p style="font-size: 13px; color: #4A6572; line-height: 1.6; margin-bottom: 20px;">We'll reach out whenever new documents are added or exciting updates roll out. In the meantime, follow us on <a href="https://instagram.com/anes.vault" style="color: #1A6B7C;">Instagram</a> and <a href="https://tiktok.com/@anes.vault" style="color: #1A6B7C;">TikTok</a> @Anes.Vault for daily content.</p>
        <p style="font-size: 13px; color: #4A6572;">Have questions or want to suggest a resource? Reply to this email anytime — we read every one.</p>
        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #D0E2E8; font-size: 11px; color: #8AA5B0; text-align: center;">
          AnesVault · anesvault.com · Built by anesthesia, for anesthesia.<br/>
          You're receiving this because you joined AnesVault. <a href="mailto:ADLMedgroup@gmail.com?subject=Unsubscribe" style="color: #8AA5B0;">Unsubscribe</a>
        </div>
      </div>
    </div>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer re_SS2bcB6o_E2riBrj7S2cM1Kwobo3DfqaM"
      },
      body: JSON.stringify({
        from: "AnesVault <hello@anesvault.com>",
        to: [email],
        bcc: ["ADLMedgroup@gmail.com"],
        subject: "Welcome to AnesVault 🔐",
        html: welcomeHtml,
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(400).json({ error: data });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
