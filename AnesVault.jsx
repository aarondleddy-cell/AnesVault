import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

const CATEGORIES = [
  "Vital Sign Flow Charts",
  "General Consents",
  "Pre-op Assessment Forms",
  "Post-op Instructions",
  "Billing & Business Templates",
  "Patient Education Handouts",
  "Other / Miscellaneous",
];

const WRITE_OFFS = [
  {
    group: "Licensing & Credentialing",
    items: [
      { name: "State license renewal fees", note: "Annual or biennial RN/CRNA/AA licensure costs." },
      { name: "DEA registration", note: "Required for controlled substance prescribing/administration." },
      { name: "NBCRNA recertification fees", note: "Continued Professional Certification (CPC) program costs." },
      { name: "Credentialing & privileging fees", note: "Hospital or facility credentialing application costs." },
      { name: "Background checks & fingerprinting", note: "Required for facility privileges or contracts." },
    ],
  },
  {
    group: "Insurance",
    items: [
      { name: "Malpractice / professional liability insurance", note: "Often one of the largest deductible expenses." },
      { name: "General business liability insurance", note: "Covers your practice entity." },
      { name: "Health insurance premiums (self-employed)", note: "If self-employed and not eligible for an employer plan." },
      { name: "Disability insurance", note: "Business-use portion may be deductible — confirm with your CPA." },
    ],
  },
  {
    group: "Continuing Education",
    items: [
      { name: "CE course fees", note: "Required CEUs for license/certification renewal." },
      { name: "Conference registration", note: "AANA, state association meetings, specialty conferences." },
      { name: "Travel to conferences/CE", note: "Airfare, lodging, mileage, and meals (subject to limits)." },
      { name: "Books, journals & subscriptions", note: "Clinical references and professional publications." },
      { name: "ACLS / PALS / BLS certification", note: "Renewal courses and exam fees." },
    ],
  },
  {
    group: "Equipment & Supplies",
    items: [
      { name: "Medical equipment", note: "Stethoscope, monitors, point-of-care tools you personally own." },
      { name: "Scrubs & required uniforms", note: "Work-specific clothing not suitable for everyday wear." },
      { name: "Medical bag / equipment case", note: "Used to transport supplies between facilities." },
      { name: "Office supplies", note: "Paper, forms, printer ink for practice administration." },
    ],
  },
  {
    group: "Home Office & Administrative",
    items: [
      { name: "Home office deduction", note: "If you have a dedicated space used regularly for business admin." },
      { name: "Phone & internet (business %)", note: "Percentage used for scheduling, billing, communication." },
      { name: "Software & apps", note: "Scheduling, billing, EHR access, accounting software." },
      { name: "Accounting & bookkeeping fees", note: "CPA, bookkeeper, or tax prep services." },
      { name: "Legal fees", note: "Contract review, entity formation, compliance consulting." },
    ],
  },
  {
    group: "Travel & Vehicle",
    items: [
      { name: "Mileage between facilities", note: "Travel between job sites (not commute from home to one regular site)." },
      { name: "Vehicle expenses", note: "Actual expense or standard mileage rate — choose one method." },
      { name: "Parking & tolls", note: "Incurred while traveling for work between sites." },
    ],
  },
  {
    group: "Retirement & Business Structure",
    items: [
      { name: "Solo 401(k) / SEP IRA contributions", note: "Self-employed retirement plan contributions." },
      { name: "Business entity formation/maintenance", note: "LLC/PC filing fees, registered agent costs." },
      { name: "Self-employment tax deduction", note: "Half of SE tax is deductible above the line." },
    ],
  },
];

const CRED_CATEGORIES = ["ACLS", "BLS", "PALS", "DEA", "Malpractice", "Custom"];

// ─── Document Library (Supabase-backed) ────────────────────────────────────
const docAPI = {
  async getApproved() {
    const { data, error } = await supabase.from("documents").select("*").eq("approved", true).order("created_at", { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  },
  async getPending(password) {
    const res = await fetch("/api/admin-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not load pending documents");
    return json.documents || [];
  },
  async verifyAdmin(password) {
    const res = await fetch("/api/admin-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", password }),
    });
    return res.ok;
  },
  async approveDoc(id, password) {
    const res = await fetch("/api/admin-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", id, password }),
    });
    if (!res.ok) throw new Error("Could not approve");
  },
  async rejectDoc(id, password) {
    const res = await fetch("/api/admin-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", id, password }),
    });
    if (!res.ok) throw new Error("Could not reject");
  },
  async insert(doc) {
    const { error } = await supabase.from("documents").insert(doc);
    if (error) throw error;
  },
  async update(id, updates) {
    const { error } = await supabase.from("documents").update(updates).eq("id", id);
    if (error) throw error;
  },
  async remove(id) {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) throw error;
  },
  async uploadFile(file) {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("documents").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("documents").getPublicUrl(path);
    return { file_url: data.publicUrl, file_name: file.name };
  },
};

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr + "T00:00:00");
  return Math.round((exp - today) / 86400000);
}
function credStatus(dateStr) {
  const d = daysUntil(dateStr);
  if (d < 0) return "expired";
  if (d <= 90) return "soon";
  return "ok";
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20 }) => {
  const icons = {
    instagram: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
    tiktok: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/></svg>,
    download: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    upload: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    alert: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    shield: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    file: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    users: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    calendar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    lock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    chevron: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
    mail: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    stethoscope: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 006 6 6 6 0 006-6V4a2 2 0 00-2-2h-1a.2.2 0 10.3.3"/><path d="M8 15v1a6 6 0 006 6v0a6 6 0 006-6v-4"/><circle cx="20" cy="10" r="2"/></svg>,
    dollar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    book: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  };
  return icons[name] || null;
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  // Palette: deep slate-teal, clean white, warm gold accent, soft mist bg
  navy: "#0D2B3E",
  teal: "#1A6B7C",
  tealLight: "#2A8B9F",
  gold: "#C8963E",
  goldLight: "#E8B45A",
  white: "#FFFFFF",
  mist: "#F0F5F7",
  slate: "#4A6572",
  slateLight: "#8AA5B0",
  border: "#D0E2E8",
  success: "#2D7D5A",
  danger: "#C0392B",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: ${S.mist}; color: ${S.navy}; }

  .hub-root { max-width: 680px; margin: 0 auto; min-height: 100vh; }

  /* HEADER */
  .hub-header {
    background: linear-gradient(160deg, ${S.navy} 0%, ${S.teal} 100%);
    padding: 48px 24px 40px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .hub-header::before {
    content: '';
    position: absolute;
    top: -40px; right: -40px;
    width: 180px; height: 180px;
    border-radius: 50%;
    background: rgba(200,150,62,0.12);
    pointer-events: none;
  }
  .hub-eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.18em;
    color: ${S.goldLight};
    text-transform: uppercase;
    margin-bottom: 12px;
    opacity: 0.9;
  }
  .hub-title {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(28px, 6vw, 38px);
    color: ${S.white};
    line-height: 1.15;
    margin-bottom: 10px;
    letter-spacing: -0.01em;
  }
  .hub-tagline {
    font-size: 14px;
    color: rgba(255,255,255,0.72);
    line-height: 1.5;
    max-width: 340px;
    margin: 0 auto 24px;
  }
  .hub-socials {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-bottom: 24px;
  }
  .social-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 100px;
    border: 1.5px solid rgba(255,255,255,0.25);
    background: rgba(255,255,255,0.08);
    color: ${S.white};
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
  }
  .social-btn:hover { background: rgba(255,255,255,0.16); border-color: rgba(255,255,255,0.4); }
  .join-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 28px;
    background: ${S.gold};
    color: ${S.white};
    font-weight: 600;
    font-size: 15px;
    border-radius: 100px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 20px rgba(200,150,62,0.35);
  }
  .join-btn:hover { background: ${S.goldLight}; transform: translateY(-1px); box-shadow: 0 6px 24px rgba(200,150,62,0.45); }

  /* STATS BAR */
  .stats-bar {
    background: ${S.white};
    border-bottom: 1px solid ${S.border};
    display: flex;
    justify-content: space-around;
    padding: 16px 8px;
  }
  .stat-item { text-align: center; }
  .stat-num {
    font-family: 'DM Serif Display', serif;
    font-size: 22px;
    color: ${S.teal};
    display: block;
  }
  .stat-label {
    font-size: 11px;
    color: ${S.slate};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 500;
  }

  /* NAV LINKS */
  .nav-section { padding: 20px 16px 8px; }
  .nav-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .nav-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: ${S.white};
    border: 1.5px solid ${S.border};
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }
  .nav-card:hover { border-color: ${S.teal}; box-shadow: 0 4px 16px rgba(26,107,124,0.12); transform: translateY(-1px); }
  .nav-card.active { border-color: ${S.teal}; background: #EAF5F7; }
  .nav-icon {
    width: 40px; height: 40px;
    background: linear-gradient(135deg, ${S.teal}, ${S.tealLight});
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
  }
  .nav-icon.gold { background: linear-gradient(135deg, ${S.gold}, ${S.goldLight}); }
  .nav-icon.slate { background: linear-gradient(135deg, ${S.slate}, ${S.slateLight}); }
  .nav-label { font-weight: 600; font-size: 13px; color: ${S.navy}; line-height: 1.3; }
  .nav-sub { font-size: 11px; color: ${S.slate}; margin-top: 2px; }

  /* SECTION HEADINGS */
  .section-wrap { padding: 8px 16px 24px; }
  .section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid ${S.border};
  }
  .section-title {
    font-family: 'DM Serif Display', serif;
    font-size: 22px;
    color: ${S.navy};
  }
  .section-badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    background: ${S.teal};
    color: white;
    padding: 3px 10px;
    border-radius: 100px;
    font-weight: 500;
  }

  /* SEARCH & FILTER */
  .search-row { display: flex; gap: 8px; margin-bottom: 12px; }
  .search-box {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: ${S.white};
    border: 1.5px solid ${S.border};
    border-radius: 10px;
    color: ${S.slate};
  }
  .search-input {
    border: none; outline: none; background: transparent;
    font-size: 14px; color: ${S.navy}; width: 100%;
    font-family: 'Inter', sans-serif;
  }
  .filter-select {
    padding: 10px 14px;
    border: 1.5px solid ${S.border};
    border-radius: 10px;
    background: ${S.white};
    font-size: 13px;
    color: ${S.navy};
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    outline: none;
    max-width: 160px;
  }

  /* DOC CARDS */
  .doc-card {
    background: ${S.white};
    border: 1.5px solid ${S.border};
    border-radius: 14px;
    padding: 16px;
    margin-bottom: 10px;
    transition: all 0.2s;
  }
  .doc-card:hover { border-color: ${S.tealLight}; box-shadow: 0 4px 16px rgba(26,107,124,0.08); }
  .doc-top { display: flex; align-items: flex-start; gap: 12px; }
  .doc-icon {
    width: 42px; height: 42px;
    background: ${S.mist};
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    color: ${S.teal};
    flex-shrink: 0;
    border: 1px solid ${S.border};
  }
  .doc-info { flex: 1; min-width: 0; }
  .doc-title { font-weight: 600; font-size: 14px; color: ${S.navy}; margin-bottom: 3px; line-height: 1.3; }
  .doc-desc { font-size: 12px; color: ${S.slate}; line-height: 1.4; margin-bottom: 8px; }
  .doc-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .tag {
    font-size: 11px;
    font-weight: 500;
    padding: 3px 9px;
    border-radius: 100px;
    white-space: nowrap;
  }
  .tag-cat { background: #E8F4F7; color: ${S.teal}; }
  .tag-user { background: #F5F0E8; color: #8B6914; }
  .tag-date { background: ${S.mist}; color: ${S.slate}; font-family: 'JetBrains Mono', monospace; font-size: 10px; }
  .doc-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 10px; border-top: 1px solid ${S.border}; }
  .dl-count { font-size: 12px; color: ${S.slate}; display: flex; align-items: center; gap: 4px; }
  .dl-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 16px;
    background: ${S.teal};
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', sans-serif;
  }
  .dl-btn:hover { background: ${S.navy}; }

  /* UPLOAD FORM */
  .form-card {
    background: ${S.white};
    border: 1.5px solid ${S.border};
    border-radius: 16px;
    padding: 24px;
  }
  .form-group { margin-bottom: 18px; }
  .form-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: ${S.navy};
    margin-bottom: 6px;
  }
  .form-input, .form-select, .form-textarea {
    width: 100%;
    padding: 11px 14px;
    border: 1.5px solid ${S.border};
    border-radius: 10px;
    font-size: 14px;
    color: ${S.navy};
    font-family: 'Inter', sans-serif;
    outline: none;
    transition: border-color 0.2s;
    background: ${S.white};
  }
  .form-input:focus, .form-select:focus, .form-textarea:focus {
    border-color: ${S.teal};
    box-shadow: 0 0 0 3px rgba(26,107,124,0.1);
  }
  .form-textarea { resize: vertical; min-height: 80px; }
  .file-drop {
    border: 2px dashed ${S.border};
    border-radius: 12px;
    padding: 32px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    background: ${S.mist};
  }
  .file-drop:hover, .file-drop.active { border-color: ${S.teal}; background: #EAF5F7; }
  .file-drop-icon { color: ${S.teal}; margin-bottom: 10px; }
  .file-drop-text { font-size: 14px; font-weight: 500; color: ${S.slate}; margin-bottom: 4px; }
  .file-drop-sub { font-size: 12px; color: ${S.slateLight}; }
  .file-selected { font-size: 13px; font-weight: 600; color: ${S.teal}; margin-top: 8px; }
  .checkbox-row {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 14px;
    background: #FFF8EE;
    border: 1.5px solid #E8C875;
    border-radius: 10px;
    margin-bottom: 18px;
  }
  .checkbox-row input { width: 16px; height: 16px; margin-top: 2px; cursor: pointer; accent-color: ${S.gold}; flex-shrink: 0; }
  .checkbox-label { font-size: 13px; color: ${S.navy}; line-height: 1.5; }
  .anon-row {
    display: flex; align-items: center; gap: 8px;
    margin-top: -8px;
  }
  .anon-row input { accent-color: ${S.teal}; cursor: pointer; }
  .anon-label { font-size: 13px; color: ${S.slate}; }
  .submit-btn {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, ${S.teal}, ${S.navy});
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .submit-btn:hover { opacity: 0.92; transform: translateY(-1px); }
  .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  /* SUCCESS TOAST */
  .toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: ${S.success};
    color: white;
    padding: 14px 24px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 14px;
    z-index: 999;
    display: flex; align-items: center; gap: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    animation: slideUp 0.3s ease;
    white-space: nowrap;
  }
  @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

  /* GUIDELINES */
  .guidelines-card {
    background: linear-gradient(135deg, #0D2B3E 0%, #1A4A5C 100%);
    border-radius: 16px;
    padding: 24px;
    color: white;
  }
  .guideline-item {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  .guideline-item:last-child { border-bottom: none; }
  .g-icon { color: ${S.goldLight}; flex-shrink: 0; margin-top: 1px; }
  .g-text { font-size: 14px; line-height: 1.5; opacity: 0.9; }
  .g-title { font-weight: 600; opacity: 1; margin-bottom: 2px; }
  .moderation-note {
    margin-top: 16px;
    background: rgba(200,150,62,0.15);
    border: 1px solid rgba(200,150,62,0.3);
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 13px;
    opacity: 0.9;
    line-height: 1.5;
    display: flex; align-items: center; gap: 8px;
  }

  /* WRITE-OFFS */
  .disclaimer-banner {
    display: flex; align-items: flex-start; gap: 10px;
    background: #FFF8EE;
    border: 1.5px solid #E8C875;
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 20px;
    font-size: 13px;
    color: ${S.navy};
    line-height: 1.5;
  }
  .disclaimer-banner .g-icon { color: ${S.gold}; }
  .writeoff-group { margin-bottom: 22px; }
  .writeoff-group-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${S.teal};
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1.5px solid ${S.border};
  }
  .writeoff-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid ${S.border};
  }
  .writeoff-item:last-child { border-bottom: none; }
  .writeoff-bullet {
    width: 22px; height: 22px;
    border-radius: 7px;
    background: #E8F4F7;
    color: ${S.teal};
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .writeoff-name { font-size: 14px; font-weight: 600; color: ${S.navy}; margin-bottom: 2px; }
  .writeoff-note { font-size: 12px; color: ${S.slate}; line-height: 1.4; }

  /* ADMIN */
  .admin-login {
    background: ${S.white};
    border: 1.5px solid ${S.border};
    border-radius: 16px;
    padding: 32px 24px;
    text-align: center;
  }
  .pending-card {
    background: ${S.white};
    border: 1.5px solid #F0D080;
    border-radius: 14px;
    padding: 16px;
    margin-bottom: 10px;
  }
  .admin-actions { display: flex; gap: 8px; margin-top: 12px; }
  .approve-btn {
    flex: 1; padding: 9px; background: ${S.success}; color: white;
    border: none; border-radius: 8px; font-weight: 600; font-size: 13px;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
    font-family: 'Inter', sans-serif;
  }
  .reject-btn {
    flex: 1; padding: 9px; background: ${S.danger}; color: white;
    border: none; border-radius: 8px; font-weight: 600; font-size: 13px;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
    font-family: 'Inter', sans-serif;
  }
  .empty-state {
    text-align: center; padding: 48px 24px;
    color: ${S.slate};
  }

  /* CREDENTIAL TRACKER */
  .cred-login-wrap { padding: 60px 24px; }
  .cred-banner {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: 10px; margin-bottom: 16px;
    font-size: 13px; font-weight: 600;
  }
  .cred-banner.expired { background: #FBEAE7; color: ${S.danger}; border: 1.5px solid #EBC2BA; }
  .cred-banner.soon { background: #FFF6E4; color: #8A6416; border: 1.5px solid #EFDBA0; }
  .holder-block { margin-bottom: 22px; }
  .holder-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 8px;
  }
  .holder-name { font-weight: 700; font-size: 14px; color: ${S.navy}; }
  .holder-role { font-size: 11px; color: ${S.slate}; text-transform: uppercase; letter-spacing: 0.06em; margin-left: 6px; }
  .add-mini-btn {
    font-size: 12px; font-weight: 600; color: ${S.teal}; background: none; border: none; cursor: pointer;
    display: flex; align-items: center; gap: 4px; font-family: 'Inter', sans-serif;
  }
  .cred-card {
    display: flex; align-items: center; gap: 12px;
    background: ${S.white}; border: 1.5px solid ${S.border}; border-radius: 12px;
    padding: 12px 14px; margin-bottom: 8px;
  }
  .cred-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .cred-dot.ok { background: ${S.success}; }
  .cred-dot.soon { background: #D89A2B; }
  .cred-dot.expired { background: ${S.danger}; }
  .cred-info { flex: 1; min-width: 0; }
  .cred-label { font-weight: 600; font-size: 13px; color: ${S.navy}; }
  .cred-sub { font-size: 11px; color: ${S.slate}; margin-top: 2px; }
  .cred-status-text { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  .cred-status-text.ok { color: ${S.success}; }
  .cred-status-text.soon { color: #B37E1F; }
  .cred-status-text.expired { color: ${S.danger}; }
  .tracker-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
  .tracker-tabs { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
  .tracker-tab {
    padding: 8px 14px; border-radius: 100px; font-size: 12px; font-weight: 600;
    border: 1.5px solid ${S.border}; background: ${S.white}; color: ${S.slate}; cursor: pointer;
  }
  .tracker-tab.active { background: ${S.teal}; border-color: ${S.teal}; color: white; }
  .logout-link { font-size: 12px; color: ${S.slate}; cursor: pointer; text-decoration: underline; }
  .empty-icon { color: ${S.border}; margin-bottom: 12px; }
  .empty-text { font-size: 15px; font-weight: 600; margin-bottom: 6px; color: ${S.slate}; }
  .empty-sub { font-size: 13px; color: ${S.slateLight}; }

  /* FOOTER */
  .hub-footer {
    background: ${S.navy};
    color: rgba(255,255,255,0.6);
    padding: 32px 24px;
    text-align: center;
    margin-top: 32px;
  }
  .footer-logo {
    font-family: 'DM Serif Display', serif;
    font-size: 18px;
    color: white;
    margin-bottom: 6px;
  }
  .footer-tagline { font-size: 12px; margin-bottom: 20px; }
  .footer-links { display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
  .footer-link { font-size: 13px; color: rgba(255,255,255,0.6); cursor: pointer; text-decoration: none; }
  .footer-link:hover { color: ${S.goldLight}; }
  .footer-copy { font-size: 11px; opacity: 0.45; }

  /* JOIN MODAL */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 100; padding: 16px;
  }
  .modal-box {
    background: white; border-radius: 20px; padding: 32px 24px;
    max-width: 380px; width: 100%;
    box-shadow: 0 24px 80px rgba(0,0,0,0.3);
  }
  .modal-title { font-family: 'DM Serif Display', serif; font-size: 24px; color: ${S.navy}; margin-bottom: 8px; }
  .modal-sub { font-size: 14px; color: ${S.slate}; margin-bottom: 24px; line-height: 1.5; }
  .modal-close { float: right; background: none; border: none; cursor: pointer; color: ${S.slate}; margin-top: -4px; }

  /* PREVIEW MODAL */
  .preview-box {
    background: white; border-radius: 20px;
    max-width: 520px; width: 100%; max-height: 88vh;
    display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 24px 80px rgba(0,0,0,0.3);
  }
  .preview-head {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 20px 24px; border-bottom: 1px solid ${S.border};
  }
  .preview-head-icon {
    width: 44px; height: 44px; flex-shrink: 0;
    background: ${S.mist}; border: 1px solid ${S.border}; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; color: ${S.teal};
  }
  .preview-titles { flex: 1; min-width: 0; }
  .preview-title { font-family: 'DM Serif Display', serif; font-size: 20px; color: ${S.navy}; line-height: 1.2; }
  .preview-cat { font-size: 12px; color: ${S.teal}; font-weight: 600; margin-top: 2px; }
  .preview-body { padding: 20px 24px; overflow-y: auto; }
  .preview-pane {
    background: ${S.mist};
    border: 1px solid ${S.border};
    border-radius: 12px;
    padding: 40px 24px;
    text-align: center;
    margin-bottom: 18px;
  }
  .preview-page {
    background: white; border: 1px solid ${S.border}; border-radius: 6px;
    max-width: 300px; margin: 0 auto; padding: 24px 22px; text-align: left;
    box-shadow: 0 6px 20px rgba(13,43,62,0.08);
  }
  .preview-line { height: 8px; border-radius: 4px; background: ${S.border}; margin-bottom: 9px; }
  .preview-note { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: ${S.slateLight}; margin-top: 16px; }
  .preview-desc { font-size: 13px; color: ${S.slate}; line-height: 1.5; margin-bottom: 16px; }
  .preview-meta-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
  .preview-foot {
    display: flex; align-items: center; gap: 10px;
    padding: 16px 24px; border-top: 1px solid ${S.border};
  }
  .preview-close-btn {
    padding: 12px 18px; background: ${S.mist}; color: ${S.slate};
    border: 1.5px solid ${S.border}; border-radius: 10px; font-weight: 600;
    font-size: 14px; cursor: pointer; font-family: 'Inter', sans-serif;
  }
`;

function AnesVault() {
  const [view, setView] = useState("home");
  const [docs, setDocs] = useState([]);
  const [pending, setPending] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [toast, setToast] = useState(null);
  const [showJoin, setShowJoin] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [credAuth, setCredAuth] = useState(null);
  const [credEmail, setCredEmail] = useState("");
  const [credPw, setCredPw] = useState("");
  const [credAuthMode, setCredAuthMode] = useState("signin");
  const [credBusy, setCredBusy] = useState(false);
  const [holders, setHolders] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [trackerTab, setTrackerTab] = useState("dashboard");
  const [holderForm, setHolderForm] = useState({ name: "", role: "employee" });
  const [credForm, setCredForm] = useState({ holderId: "", category: "ACLS", customLabel: "", issueDate: "", expirationDate: "", notes: "", file: null });


  const previewExt = (previewDoc?.file_name || previewDoc?.file_url || "").split(".").pop()?.toLowerCase();
  const previewIsPdf = previewExt === "pdf";
  const previewIsImage = ["png", "jpg", "jpeg", "gif", "webp"].includes(previewExt);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [adminLoginBusy, setAdminLoginBusy] = useState(false);
  const [joinEmail, setJoinEmail] = useState("");
  const [form, setForm] = useState({ title: "", category: "", description: "", uploader: "", anon: false, file: null, agreed: false });
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef();

  const refreshDocs = async () => {
    setDocsLoading(true);
    const data = await docAPI.getApproved();
    setDocs(data);
    setDocsLoading(false);
  };
  useEffect(() => { refreshDocs(); }, []);

  const handleAdminLogin = async () => {
    if (!adminPw) { setToast("❌ Enter a password"); return; }
    setAdminLoginBusy(true);
    const ok = await docAPI.verifyAdmin(adminPw);
    setAdminLoginBusy(false);
    if (ok) setAdminAuth(true);
    else setToast("❌ Incorrect password");
  };

  const refreshPending = async () => {
    try {
      const data = await docAPI.getPending(adminPw);
      setPending(data);
    } catch {
      setToast("❌ Could not load pending documents.");
    }
  };
  useEffect(() => { if (view === "admin" && adminAuth) refreshPending(); }, [view, adminAuth]);

  // ── Supabase auth session + data load ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setCredAuth(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setCredAuth(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshTrackerData = async () => {
    if (!credAuth) { setHolders([]); setCredentials([]); return; }
    const { data: h } = await supabase.from("credential_holders").select("*").order("created_at");
    setHolders(h || []);
    const holderIds = (h || []).map(x => x.id);
    if (holderIds.length === 0) { setCredentials([]); return; }
    const { data: c } = await supabase.from("credentials").select("*").in("holder_id", holderIds);
    setCredentials(c || []);
  };
  useEffect(() => { refreshTrackerData(); }, [credAuth]);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t); }
  }, [toast]);

  const filteredDocs = docs.filter(d =>
    d.approved &&
    (catFilter === "All" || d.category === catFilter) &&
    (search === "" || d.title.toLowerCase().includes(search.toLowerCase()) || d.description.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDownload = async (id) => {
    const doc = docs.find(d => d.id === id) || pending.find(d => d.id === id);
    if (!doc || !doc.file_url) { setToast("ℹ️ No file attached to this document."); return; }
    try {
      await supabase.rpc("increment_document_downloads", { doc_id: id });
      setDocs(prev => prev.map(d => d.id === id ? { ...d, downloads: (d.downloads || 0) + 1 } : d));
      // Fetch as blob so mobile browsers handle the download reliably
      const response = await fetch(doc.file_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name || doc.title;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => {
        const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
        if (isIOS) window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }, 100);
      setToast("📥 Download started!");
    } catch {
      window.open(doc.file_url, "_blank");
      setToast("📥 Download started!");
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.category || !form.agreed) return;
    setUploading(true);
    try {
      let file_url = null, file_name = null;
      if (form.file) {
        const uploaded = await docAPI.uploadFile(form.file);
        file_url = uploaded.file_url;
        file_name = uploaded.file_name;
      }
      await docAPI.insert({
        title: form.title,
        category: form.category,
        description: form.description || "Community-submitted document.",
        uploader: form.anon ? "Anonymous" : (form.uploader || "Anonymous"),
        file_url,
        file_name,
        downloads: 0,
        approved: false,
      });
      setForm({ title: "", category: "", description: "", uploader: "", anon: false, file: null, agreed: false });
      setToast("✅ Submitted for review! You'll see it live once approved.");
      setView("library");
    } catch {
      setToast("❌ Upload failed. Please try again.");
    }
    setUploading(false);
  };

  const handleApprove = async (id) => {
    try {
      await docAPI.approveDoc(id, adminPw);
      setPending(prev => prev.filter(d => d.id !== id));
      await refreshDocs();
      setToast("✅ Document approved and published!");
    } catch {
      setToast("❌ Could not approve — try again.");
    }
  };

  const handleReject = async (id) => {
    try {
      await docAPI.rejectDoc(id, adminPw);
      setPending(prev => prev.filter(d => d.id !== id));
      setToast("🗑 Document rejected.");
    } catch {
      setToast("❌ Could not reject — try again.");
    }
  };

  // ── Credential Tracker (Supabase) ──
  const handleCredAuthSubmit = async () => {
    if (!credEmail || !credPw) { setToast("❌ Enter email and password"); return; }
    setCredBusy(true);
    const { error } = credAuthMode === "signup"
      ? await supabase.auth.signUp({ email: credEmail, password: credPw })
      : await supabase.auth.signInWithPassword({ email: credEmail, password: credPw });
    setCredBusy(false);
    if (error) { setToast(`❌ ${error.message}`); return; }
    setCredPw("");
    setToast(credAuthMode === "signup" ? "✅ Account created — check your email to confirm, then sign in." : "✅ Signed in.");
  };
  const handleCredLogout = async () => {
    await supabase.auth.signOut();
    setCredEmail(""); setCredPw("");
  };
  const addHolder = async () => {
    if (!holderForm.name || !credAuth) return;
    const { error } = await supabase.from("credential_holders").insert({
      user_id: credAuth.id, name: holderForm.name, role: holderForm.role,
    });
    if (error) { setToast(`❌ ${error.message}`); return; }
    setHolderForm({ name: "", role: "employee" });
    setToast("✅ Person added.");
    setTrackerTab("dashboard");
    refreshTrackerData();
  };
  const deleteHolder = async (id) => {
    await supabase.from("credential_holders").delete().eq("id", id);
    refreshTrackerData();
  };
  const addCredential = async () => {
    if (!credForm.holderId || !credForm.expirationDate) return;
    let document_url = null;
    if (credForm.file) {
      const path = `${credAuth.id}/${Date.now()}_${credForm.file.name}`;
      const { error: upErr } = await supabase.storage.from("credential-docs").upload(path, credForm.file);
      if (upErr) { setToast(`❌ Upload failed: ${upErr.message}`); return; }
      document_url = path;
    }
    const { error } = await supabase.from("credentials").insert({
      holder_id: credForm.holderId,
      category: credForm.category,
      custom_label: credForm.category === "Custom" ? credForm.customLabel : null,
      issue_date: credForm.issueDate || null,
      expiration_date: credForm.expirationDate,
      notes: credForm.notes || null,
      document_url,
    });
    if (error) { setToast(`❌ ${error.message}`); return; }
    setCredForm({ holderId: "", category: "ACLS", customLabel: "", issueDate: "", expirationDate: "", notes: "", file: null });
    setToast("✅ Credential added.");
    setTrackerTab("dashboard");
    refreshTrackerData();
  };
  const deleteCredential = async (id) => {
    await supabase.from("credentials").delete().eq("id", id);
    refreshTrackerData();
  };

  const expiringCount = credentials.filter(c => credStatus(c.expiration_date) === "soon").length;
  const expiredCount = credentials.filter(c => credStatus(c.expiration_date) === "expired").length;
  const expiringSoonList = credentials
    .filter(c => { const s = credStatus(c.expiration_date); return s === "soon" || s === "expired"; })
    .sort((a, b) => daysUntil(a.expiration_date) - daysUntil(b.expiration_date));

  const handleDrop = (e) => {
    e.preventDefault(); setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) setForm(f => ({ ...f, file }));
  };

  return (
    <div className="hub-root">
      <style>{css}</style>

      {/* HEADER */}
      <header className="hub-header">
        <div className="hub-eyebrow">Small Business Anesthesia</div>
        <h1 className="hub-title">Anes<span style={{ fontStyle: "italic", color: S.goldLight }}>Vault</span></h1>
        <p className="hub-tagline">Your community. Your resources.<br />Built by anesthesia, for anesthesia.</p>
        <div className="hub-socials">
          <a className="social-btn" href="https://www.instagram.com/anes.vault" target="_blank" rel="noopener noreferrer"><Icon name="instagram" size={16} /> @Anes.Vault</a>
          <a className="social-btn" href="https://www.tiktok.com/@anes.vault" target="_blank" rel="noopener noreferrer"><Icon name="tiktok" size={16} /> @Anes.Vault</a>
        </div>
        <button className="join-btn" onClick={() => setShowJoin(true)}>
          <Icon name="users" size={16} /> Join the Community
        </button>
      </header>

      {/* STATS */}
      <div className="stats-bar">
        <div className="stat-item"><span className="stat-num">{docs.filter(d => d.approved).length}</span><span className="stat-label">Documents</span></div>
        <div className="stat-item"><span className="stat-num">{docs.filter(d => d.approved).reduce((a, d) => a + d.downloads, 0)}</span><span className="stat-label">Downloads</span></div>
        <div className="stat-item"><span className="stat-num">{CATEGORIES.length}</span><span className="stat-label">Categories</span></div>
        <div className="stat-item"><span className="stat-num">{pending.length}</span><span className="stat-label">Pending</span></div>
      </div>

      {/* NAV */}
      <div className="nav-section">
        <div className="nav-grid">
          <div className={`nav-card ${view === "library" ? "active" : ""}`} onClick={() => setView("library")}>
            <div className="nav-icon"><Icon name="download" size={18} /></div>
            <div><div className="nav-label">Browse & Download</div><div className="nav-sub">Free resources</div></div>
          </div>
          <div className={`nav-card ${view === "upload" ? "active" : ""}`} onClick={() => setView("upload")}>
            <div className="nav-icon gold"><Icon name="upload" size={18} /></div>
            <div><div className="nav-label">Upload a Doc</div><div className="nav-sub">Share with peers</div></div>
          </div>
          <div className={`nav-card ${view === "guidelines" ? "active" : ""}`} onClick={() => setView("guidelines")}>
            <div className="nav-icon slate"><Icon name="shield" size={18} /></div>
            <div><div className="nav-label">Guidelines</div><div className="nav-sub">PHI & rules</div></div>
          </div>
          <div className={`nav-card ${view === "writeoffs" ? "active" : ""}`} onClick={() => setView("writeoffs")}>
            <div className="nav-icon gold"><Icon name="dollar" size={18} /></div>
            <div><div className="nav-label">Business Write-Offs</div><div className="nav-sub">Tax deduction guide</div></div>
          </div>
          <div className={`nav-card ${view === "education" ? "active" : ""}`} onClick={() => setView("education")}>
            <div className="nav-icon"><Icon name="book" size={18} /></div>
            <div><div className="nav-label">Educational Resource</div><div className="nav-sub">Learn & reference</div></div>
          </div>
          <div className={`nav-card ${view === "tracker" ? "active" : ""}`} onClick={() => setView("tracker")}>
            <div className="nav-icon slate"><Icon name="calendar" size={18} /></div>
            <div><div className="nav-label">Credential Tracker</div><div className="nav-sub">Track expirations</div></div>
          </div>
        </div>
      </div>

      {/* ── LIBRARY ── */}
      {view === "library" && (
        <div className="section-wrap">
          <div className="section-head">
            <span className="section-title">Document Library</span>
            <span className="section-badge">{filteredDocs.length} docs</span>
          </div>
          <div className="search-row">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input className="search-input" placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {docsLoading ? (
            <div className="loading">Loading documents…</div>
          ) : filteredDocs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="file" size={48} /></div>
              <div className="empty-text">No documents found</div>
              <div className="empty-sub">Try a different search or <span style={{ color: S.teal, cursor: "pointer", fontWeight: 600 }} onClick={() => setView("upload")}>upload the first one</span></div>
            </div>
          ) : filteredDocs.map(doc => (
            <div key={doc.id} className="doc-card">
              <div className="doc-top" style={{ cursor: "pointer" }} onClick={() => setPreviewDoc(doc)}>
                <div className="doc-icon"><Icon name="file" size={20} /></div>
                <div className="doc-info">
                  <div className="doc-title">{doc.title}</div>
                  <div className="doc-desc">{doc.description}</div>
                  <div className="doc-meta">
                    <span className="tag tag-cat">{doc.category}</span>
                    <span className="tag tag-user">↑ {doc.uploader}</span>
                    <span className="tag tag-date">{doc.created_at?.slice(0, 10)}</span>
                  </div>
                </div>
              </div>
              <div className="doc-footer">
                <span className="dl-count"><Icon name="download" size={13} /> {doc.downloads || 0} downloads</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="dl-btn" style={{ background: S.mist, color: S.teal, border: `1.5px solid ${S.border}` }} onClick={() => setPreviewDoc(doc)}><Icon name="search" size={14} /> Preview</button>
                  <button className="dl-btn" onClick={() => handleDownload(doc.id)}><Icon name="download" size={14} /> Download</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── UPLOAD ── */}
      {view === "upload" && (
        <div className="section-wrap">
          <div className="section-head">
            <span className="section-title">Upload a Document</span>
          </div>
          <div className="form-card">
            <div className="form-group">
              <label className="form-label">Document Title *</label>
              <input className="form-input" placeholder="e.g. Adult Vital Signs Flow Chart" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">Select a category…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Brief Description</label>
              <textarea className="form-textarea" placeholder="What is this document and who is it for?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Your Name / Handle</label>
              <input className="form-input" placeholder="e.g. CRNA_Texas or your Instagram handle" value={form.uploader} onChange={e => setForm(f => ({ ...f, uploader: e.target.value }))} disabled={form.anon} />
              <div className="anon-row" style={{ marginTop: 8 }}>
                <input type="checkbox" id="anon" checked={form.anon} onChange={e => setForm(f => ({ ...f, anon: e.target.checked }))} />
                <label className="anon-label" htmlFor="anon">Post anonymously</label>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Upload File</label>
              <div
                className={`file-drop ${dragActive ? "active" : ""}`}
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <div className="file-drop-icon"><Icon name="upload" size={32} /></div>
                <div className="file-drop-text">{form.file ? form.file.name : "Drag & drop or tap to choose"}</div>
                <div className="file-drop-sub">PDF, DOCX, or XLSX · Max 10 MB</div>
                {form.file && <div className="file-selected">✓ {form.file.name}</div>}
                <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx" style={{ display: "none" }} onChange={e => setForm(f => ({ ...f, file: e.target.files[0] }))} />
              </div>
            </div>
            <div className="checkbox-row">
              <input type="checkbox" id="agree" checked={form.agreed} onChange={e => setForm(f => ({ ...f, agreed: e.target.checked }))} />
              <label className="checkbox-label" htmlFor="agree">
                I confirm I have the right to share this document and it <strong>contains no patient PHI</strong> (Protected Health Information) or identifiable patient data.
              </label>
            </div>
            <button className="submit-btn" disabled={!form.title || !form.category || !form.agreed || uploading} onClick={handleSubmit}>
              <Icon name="upload" size={18} /> {uploading ? "Uploading…" : "Submit for Review"}
            </button>
          </div>
        </div>
      )}

      {/* ── GUIDELINES ── */}
      {view === "guidelines" && (
        <div className="section-wrap">
          <div className="section-head">
            <span className="section-title">Community Guidelines</span>
          </div>
          <div className="guidelines-card">
            {[
              { title: "No PHI — Ever", text: "Documents must contain zero Protected Health Information. No patient names, DOBs, MRNs, or identifiable data of any kind." },
              { title: "Own What You Share", text: "Only upload documents you created or have explicit permission to distribute. Respect institutional and proprietary resources." },
              { title: "Anesthesia Professionals Only", text: "This hub is designed for CRNAs, MDAs, and independent anesthesia practices — keep content clinically relevant." },
              { title: "Be a Good Colleague", text: "Label documents clearly, write an honest description, and credit original authors when appropriate." },
              { title: "Moderation Queue", text: "Every uploaded document is reviewed before going live. We typically review within 48 hours." },
            ].map(g => (
              <div key={g.title} className="guideline-item">
                <div className="g-icon"><Icon name="check" size={16} /></div>
                <div><div className="g-text g-title">{g.title}</div><div className="g-text">{g.text}</div></div>
              </div>
            ))}
            <div className="moderation-note">
              <Icon name="shield" size={16} />
              All uploads are reviewed by volunteer moderators from the community. Thank you for keeping AnesVault safe.
            </div>
          </div>
        </div>
      )}

      {/* ── PRIVACY POLICY ── */}
      {view === "privacy" && (
        <div className="section-wrap">
          <div className="section-head">
            <span className="section-title">Privacy Policy</span>
          </div>
          <div className="guidelines-card">
            {[
              { title: "What We Collect", text: "If you join the community, we store the email address you provide so we can send resource updates. Uploaded documents include the handle or name you choose, or \"Anonymous\" if you opt out." },
              { title: "No Patient Data", text: "AnesVault is not for Protected Health Information. Do not submit documents containing patient names, DOBs, MRNs, or any identifiable patient data. Uploads found to contain PHI are removed immediately." },
              { title: "How We Use It", text: "We use your email only to send AnesVault updates — never marketing from third parties. We never sell, rent, or share your personal information." },
              { title: "Document Sharing", text: "Documents you submit and that pass moderation are made publicly available for other members to download. Only upload material you have the right to distribute." },
              { title: "Your Choices", text: "You can unsubscribe from emails at any time, and you can request removal of a document you uploaded by contacting us." },
            ].map(g => (
              <div key={g.title} className="guideline-item">
                <div className="g-icon"><Icon name="shield" size={16} /></div>
                <div><div className="g-text g-title">{g.title}</div><div className="g-text">{g.text}</div></div>
              </div>
            ))}
            <div className="moderation-note">
              <Icon name="mail" size={16} />
              Questions about your data? Email us at ADLMedgroup@gmail.com.
            </div>
          </div>
        </div>
      )}

      {/* ── EDUCATIONAL RESOURCE ── */}
      {view === "education" && (
        <div className="section-wrap">
          <div className="section-head">
            <span className="section-title">Educational Resource</span>
          </div>
          <div className="empty-state">
            <div className="empty-icon"><Icon name="book" size={48} /></div>
            <div className="empty-text">Educational resources coming soon</div>
            <div className="empty-sub">Curated guides, references, and learning materials for anesthesia providers will live here.</div>
          </div>
        </div>
      )}

      {/* ── CREDENTIAL TRACKER ── */}
      {view === "tracker" && (
        <div className="section-wrap">
          {!credAuth ? (
            <div className="cred-login-wrap">
              <div className="admin-login">
                <div style={{ marginBottom: 16, color: S.slate }}><Icon name="calendar" size={32} /></div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, marginBottom: 8 }}>Credential Tracker</div>
                <div style={{ fontSize: 13, color: S.slate, marginBottom: 20 }}>Sign in to track your and your team's credential expirations. This area is private to your account.</div>
                <div className="tracker-tabs" style={{ justifyContent: "center" }}>
                  <button className={`tracker-tab ${credAuthMode === "signin" ? "active" : ""}`} onClick={() => setCredAuthMode("signin")}>Sign In</button>
                  <button className={`tracker-tab ${credAuthMode === "signup" ? "active" : ""}`} onClick={() => setCredAuthMode("signup")}>Create Account</button>
                </div>
                <input className="form-input" type="email" placeholder="Email" value={credEmail} onChange={e => setCredEmail(e.target.value)} style={{ marginBottom: 10 }} />
                <input className="form-input" type="password" placeholder="Password" value={credPw} onChange={e => setCredPw(e.target.value)} style={{ marginBottom: 12 }} />
                <button className="submit-btn" onClick={handleCredAuthSubmit} disabled={credBusy}>
                  <Icon name="lock" size={16} /> {credBusy ? "Please wait…" : credAuthMode === "signup" ? "Create Account" : "Sign In"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="tracker-topbar">
                <span className="section-title">Credential Tracker</span>
                <span className="logout-link" onClick={handleCredLogout}>Sign out ({credAuth.email})</span>
              </div>
              {expiredCount > 0 && (
                <div className="cred-banner expired"><Icon name="alert" size={16} /> {expiredCount} credential{expiredCount !== 1 ? "s" : ""} expired</div>
              )}
              {expiringCount > 0 && (
                <div className="cred-banner soon"><Icon name="calendar" size={16} /> {expiringCount} credential{expiringCount !== 1 ? "s" : ""} expiring within 90 days</div>
              )}
              <div className="tracker-tabs">
                <button className={`tracker-tab ${trackerTab === "dashboard" ? "active" : ""}`} onClick={() => setTrackerTab("dashboard")}>Dashboard</button>
                <button className={`tracker-tab ${trackerTab === "expiring" ? "active" : ""}`} onClick={() => setTrackerTab("expiring")}>Expiring Soon</button>
                <button className={`tracker-tab ${trackerTab === "addHolder" ? "active" : ""}`} onClick={() => setTrackerTab("addHolder")}>+ Person</button>
                <button className={`tracker-tab ${trackerTab === "addCredential" ? "active" : ""}`} onClick={() => setTrackerTab("addCredential")}>+ Credential</button>
              </div>

              {trackerTab === "dashboard" && (
                holders.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><Icon name="calendar" size={48} /></div>
                    <div className="empty-text">No one tracked yet</div>
                    <div className="empty-sub">Add yourself or an employee to start tracking credential expirations.</div>
                  </div>
                ) : holders.map(h => {
                  const hCreds = credentials.filter(c => c.holder_id === h.id);
                  return (
                    <div key={h.id} className="holder-block">
                      <div className="holder-head">
                        <div><span className="holder-name">{h.name}</span><span className="holder-role">{h.role}</span></div>
                        <span className="add-mini-btn" onClick={() => deleteHolder(h.id)}><Icon name="x" size={12} /> Remove</span>
                      </div>
                      {hCreds.length === 0 ? (
                        <div className="empty-sub" style={{ padding: "8px 0" }}>No credentials logged.</div>
                      ) : hCreds.map(c => {
                        const st = credStatus(c.expiration_date);
                        const d = daysUntil(c.expiration_date);
                        return (
                          <div key={c.id} className="cred-card">
                            <div className={`cred-dot ${st}`}></div>
                            <div className="cred-info">
                              <div className="cred-label">{c.category === "Custom" ? c.custom_label : c.category}</div>
                              <div className="cred-sub">Expires {c.expiration_date}{c.notes ? ` · ${c.notes}` : ""}</div>
                            </div>
                            <div className={`cred-status-text ${st}`}>{st === "expired" ? `${Math.abs(d)}d overdue` : st === "soon" ? `${d}d left` : "Current"}</div>
                            <span className="add-mini-btn" onClick={() => deleteCredential(c.id)}><Icon name="x" size={12} /></span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}

              {trackerTab === "expiring" && (
                expiringSoonList.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><Icon name="check" size={48} /></div>
                    <div className="empty-text">Nothing expiring soon</div>
                    <div className="empty-sub">All tracked credentials are more than 90 days from expiration.</div>
                  </div>
                ) : expiringSoonList.map(c => {
                  const holder = holders.find(h => h.id === c.holder_id);
                  const st = credStatus(c.expiration_date);
                  const d = daysUntil(c.expiration_date);
                  return (
                    <div key={c.id} className="cred-card">
                      <div className={`cred-dot ${st}`}></div>
                      <div className="cred-info">
                        <div className="cred-label">{c.category === "Custom" ? c.custom_label : c.category} — {holder ? holder.name : "Unknown"}</div>
                        <div className="cred-sub">Expires {c.expiration_date}</div>
                      </div>
                      <div className={`cred-status-text ${st}`}>{st === "expired" ? `${Math.abs(d)}d overdue` : `${d}d left`}</div>
                    </div>
                  );
                })
              )}

              {trackerTab === "addHolder" && (
                <div className="admin-login" style={{ textAlign: "left" }}>
                  <div className="form-label">Name</div>
                  <input className="form-input" placeholder="Full name" value={holderForm.name} onChange={e => setHolderForm(f => ({ ...f, name: e.target.value }))} style={{ marginBottom: 12 }} />
                  <div className="form-label">Role</div>
                  <select className="form-input" value={holderForm.role} onChange={e => setHolderForm(f => ({ ...f, role: e.target.value }))} style={{ marginBottom: 16 }}>
                    <option value="self">Self</option>
                    <option value="employee">Employee</option>
                  </select>
                  <button className="submit-btn" onClick={addHolder}><Icon name="check" size={16} /> Add Person</button>
                </div>
              )}

              {trackerTab === "addCredential" && (
                <div className="admin-login" style={{ textAlign: "left" }}>
                  <div className="form-label">Person</div>
                  <select className="form-input" value={credForm.holderId} onChange={e => setCredForm(f => ({ ...f, holderId: e.target.value }))} style={{ marginBottom: 12 }}>
                    <option value="">Select a person…</option>
                    {holders.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                  <div className="form-label">Category</div>
                  <select className="form-input" value={credForm.category} onChange={e => setCredForm(f => ({ ...f, category: e.target.value }))} style={{ marginBottom: 12 }}>
                    {CRED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {credForm.category === "Custom" && (
                    <input className="form-input" placeholder="Custom category name" value={credForm.customLabel} onChange={e => setCredForm(f => ({ ...f, customLabel: e.target.value }))} style={{ marginBottom: 12 }} />
                  )}
                  <div className="form-label">Issue Date</div>
                  <input className="form-input" type="date" value={credForm.issueDate} onChange={e => setCredForm(f => ({ ...f, issueDate: e.target.value }))} style={{ marginBottom: 12 }} />
                  <div className="form-label">Expiration Date</div>
                  <input className="form-input" type="date" value={credForm.expirationDate} onChange={e => setCredForm(f => ({ ...f, expirationDate: e.target.value }))} style={{ marginBottom: 12 }} />
                  <div className="form-label">Notes (optional)</div>
                  <input className="form-input" placeholder="Notes" value={credForm.notes} onChange={e => setCredForm(f => ({ ...f, notes: e.target.value }))} style={{ marginBottom: 12 }} />
                  <div className="form-label">Document (optional)</div>
                  <input className="form-input" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setCredForm(f => ({ ...f, file: e.target.files[0] || null }))} style={{ marginBottom: 16 }} />
                  <button className="submit-btn" onClick={addCredential} disabled={holders.length === 0}><Icon name="check" size={16} /> Add Credential</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── WRITE-OFFS ── */}
      {view === "writeoffs" && (
        <div className="section-wrap">
          <div className="section-head">
            <span className="section-title">Business Write-Offs</span>
            <span className="section-badge">{WRITE_OFFS.reduce((a, g) => a + g.items.length, 0)} deductions</span>
          </div>
          <div className="disclaimer-banner">
            <div className="g-icon"><Icon name="shield" size={16} /></div>
            <div>
              <strong>Not tax advice.</strong> This is a general educational list for independent anesthesia providers. Every situation is different — always confirm deductions with a licensed CPA or tax professional before filing.
            </div>
          </div>
          {WRITE_OFFS.map(group => (
            <div key={group.group} className="writeoff-group">
              <div className="writeoff-group-title">{group.group}</div>
              {group.items.map(item => (
                <div key={item.name} className="writeoff-item">
                  <div className="writeoff-bullet"><Icon name="dollar" size={12} /></div>
                  <div>
                    <div className="writeoff-name">{item.name}</div>
                    <div className="writeoff-note">{item.note}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── ADMIN ── */}
      {view === "admin" && (
        <div className="section-wrap">
          <div className="section-head">
            <span className="section-title">Admin Panel</span>
            {adminAuth && <span className="section-badge">{pending.length} pending</span>}
          </div>
          {!adminAuth ? (
            <div className="admin-login">
              <div style={{ marginBottom: 16, color: S.slate }}><Icon name="lock" size={32} /></div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, marginBottom: 8 }}>Moderator Access</div>
              <div style={{ fontSize: 13, color: S.slate, marginBottom: 20 }}>Enter the admin password to review pending uploads.</div>
              <input className="form-input" type="password" placeholder="Password" value={adminPw} onChange={e => setAdminPw(e.target.value)} style={{ marginBottom: 12 }} onKeyDown={e => e.key === "Enter" && handleAdminLogin()} />
              <button className="submit-btn" disabled={adminLoginBusy} onClick={handleAdminLogin}>
                <Icon name="lock" size={16} /> {adminLoginBusy ? "Checking…" : "Sign In"}
              </button>
            </div>
          ) : (
            <>
              {pending.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon"><Icon name="check" size={48} /></div>
                  <div className="empty-text">All caught up!</div>
                  <div className="empty-sub">No documents pending review.</div>
                </div>
              ) : pending.map(doc => (
                <div key={doc.id} className="pending-card">
                  <div className="doc-title">{doc.title}</div>
                  <div style={{ marginTop: 4, marginBottom: 8 }}>
                    <span className="tag tag-cat">{doc.category}</span>{" "}
                    <span className="tag tag-user">↑ {doc.uploader}</span>
                  </div>
                  <div style={{ fontSize: 13, color: S.slate }}>{doc.description}</div>
                  {doc.file_url && <div style={{ fontSize: 12, color: S.teal, marginTop: 6 }}><a href={doc.file_url} target="_blank" rel="noopener noreferrer">Preview file ↗</a></div>}
                  <div className="admin-actions">
                    <button className="approve-btn" onClick={() => handleApprove(doc.id)}><Icon name="check" size={14} /> Approve</button>
                    <button className="reject-btn" onClick={() => handleReject(doc.id)}><Icon name="x" size={14} /> Reject</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* FOOTER */}
      <footer className="hub-footer">
        <div className="footer-logo">AnesVault</div>
        <div className="footer-tagline">Built by anesthesia, for anesthesia.</div>
        <div className="footer-links">
          <span className="footer-link" onClick={() => setView("guidelines")}>Guidelines</span>
          <span className="footer-link" onClick={() => setView("privacy")}>Privacy Policy</span>
          <a className="footer-link" href="mailto:ADLMedgroup@gmail.com?subject=AnesVault%20Inquiry">Contact</a>
          <span className="footer-link" onClick={() => setView("upload")}>Suggest a Category</span>
          <span className="footer-link" onClick={() => setView("admin")}>Admin Sign In</span>
        </div>
        <div className="hub-socials" style={{ justifyContent: "center" }}>
          <a className="social-btn" href="https://www.instagram.com/anes.vault" target="_blank" rel="noopener noreferrer"><Icon name="instagram" size={14} /> @Anes.Vault</a>
          <a className="social-btn" href="https://www.tiktok.com/@anes.vault" target="_blank" rel="noopener noreferrer"><Icon name="tiktok" size={14} /> @Anes.Vault</a>
        </div>
        <div className="footer-copy">© 2026 AnesVault Community · Not a substitute for clinical judgment</div>
      </footer>

      {/* PREVIEW MODAL */}
      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="preview-box" onClick={e => e.stopPropagation()}>
            <div className="preview-head">
              <div className="preview-head-icon"><Icon name="file" size={22} /></div>
              <div className="preview-titles">
                <div className="preview-title">{previewDoc.title}</div>
                <div className="preview-cat">{previewDoc.category}</div>
              </div>
              <button className="modal-close" onClick={() => setPreviewDoc(null)}><Icon name="x" size={20} /></button>
            </div>
            <div className="preview-body">
              {previewDoc.file_url && previewIsPdf ? (
                <div style={{ marginBottom: 18 }}>
                  <iframe title="PDF preview" src={previewDoc.file_url} style={{ width: "100%", height: "50vh", border: `1px solid ${S.border}`, borderRadius: 12, background: "#fff" }}></iframe>
                  <div style={{ textAlign: "center", marginTop: 8 }}>
                    <a href={previewDoc.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: S.teal, fontWeight: 600 }}>Open full preview ↗</a>
                  </div>
                </div>
              ) : previewDoc.file_url && previewIsImage ? (
                <div style={{ marginBottom: 18, textAlign: "center" }}>
                  <img alt="preview" src={previewDoc.file_url} style={{ maxWidth: "100%", maxHeight: "50vh", borderRadius: 12, border: `1px solid ${S.border}` }} />
                </div>
              ) : previewDoc.file_url ? (
                <div style={{ marginBottom: 18, textAlign: "center", padding: "24px 0" }}>
                  <div style={{ marginBottom: 12, color: S.teal }}><Icon name="file" size={40} /></div>
                  <div className="preview-note">{previewDoc.file_name || "Attached file"} · preview not available for this file type</div>
                  <a href={previewDoc.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: S.teal, fontWeight: 600, display: "inline-block", marginTop: 8 }}>Open file ↗</a>
                </div>
              ) : (
                <div className="preview-pane">
                  <div className="preview-note">No file attached to this document.</div>
                </div>
              )}
              <div className="preview-desc">{previewDoc.description}</div>
              <div className="preview-meta-row">
                <span className="tag tag-user">↑ {previewDoc.uploader}</span>
                <span className="tag tag-date">{previewDoc.created_at?.slice(0, 10)}</span>
                <span className="tag tag-cat">{previewDoc.downloads || 0} downloads</span>
              </div>
            </div>
            <div className="preview-foot">
              <button className="preview-close-btn" onClick={() => setPreviewDoc(null)}>Close</button>
              <button className="dl-btn" style={{ flex: 1, justifyContent: "center", padding: 12 }} onClick={() => { handleDownload(previewDoc.id); setPreviewDoc(null); }}><Icon name="download" size={16} /> Download</button>
            </div>
          </div>
        </div>
      )}

      {/* JOIN MODAL */}
      {showJoin && (
        <div className="modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowJoin(false)}><Icon name="x" size={20} /></button>
            <div className="modal-title">Join AnesVault</div>
            <div className="modal-sub">Get notified when new resources are added. No spam — anesthesia updates only.</div>
            <div className="form-group">
              <label className="form-label">Your Email</label>
              <input className="form-input" type="email" placeholder="you@email.com" value={joinEmail} onChange={e => setJoinEmail(e.target.value)} />
            </div>
            <button className="submit-btn" onClick={() => { setShowJoin(false); setToast("🎉 You're on the list! Welcome to the community."); setJoinEmail(""); }}>
              <Icon name="mail" size={16} /> Subscribe
            </button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && <div className="toast"><Icon name="check" size={16} />{toast}</div>}
    </div>
  );
}

export default AnesVault;
