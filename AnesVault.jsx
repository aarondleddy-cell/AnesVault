import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://dfcajbdhgcgzhtnazsfw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2FqYmRoZ2Nnemh0bmF6c2Z3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTUwODksImV4cCI6MjA5ODU5MTA4OX0.yCoi4SvqTLcZQ-6e_ufMxxpyTCL4LdIN0qDm8zjfheo";

const sb = {
  async getDocs() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/documents?approved=eq.true&order=created_at.desc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    return res.json();
  },
  async getPending() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/documents?approved=eq.false&order=created_at.desc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    return res.json();
  },
  async insertDoc(doc) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(doc)
    });
    return res.json();
  },
  async updateDoc(id, updates) {
    await fetch(`${SUPABASE_URL}/rest/v1/documents?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
  },
  async deleteDoc(id) {
    await fetch(`${SUPABASE_URL}/rest/v1/documents?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
  },
  async uploadFile(file) {
    const ext = file.name.split(".").pop();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/documents/${filename}`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": file.type },
      body: file
    });
    if (!res.ok) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/documents/${filename}`;
  },
  async getApprovedWriteoffs() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/writeoffs?approved=eq.true&order=created_at.desc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    return res.json();
  },
  async getPendingWriteoffs() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/writeoffs?approved=eq.false&order=created_at.desc`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
    return res.json();
  },
  async insertWriteoff(wo) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/writeoffs`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(wo)
    });
    return res.json();
  },
  async updateWriteoff(id, updates) {
    await fetch(`${SUPABASE_URL}/rest/v1/writeoffs?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
  },
  async deleteWriteoff(id) {
    await fetch(`${SUPABASE_URL}/rest/v1/writeoffs?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
    });
  },
};

const CATEGORIES = [
  "Vital Sign Flow Charts","General Consents","Pre-op Assessment Forms",
  "Post-op Instructions","Billing & Business Templates","Patient Education Handouts","Other / Miscellaneous",
];

const WRITE_OFFS = [
  { group: "Licensing & Credentialing", items: [
    { name: "State license renewal fees", note: "Annual or biennial RN/CRNA licensure costs." },
    { name: "DEA registration", note: "Required for controlled substance prescribing/administration." },
    { name: "NBCRNA recertification fees", note: "Continued Professional Certification (CPC) program costs." },
    { name: "Credentialing & privileging fees", note: "Hospital or facility credentialing application costs." },
    { name: "Background checks & fingerprinting", note: "Required for facility privileges or contracts." },
  ]},
  { group: "Insurance", items: [
    { name: "Malpractice / professional liability insurance", note: "Often one of the largest deductible expenses." },
    { name: "General business liability insurance", note: "Covers your practice entity." },
    { name: "Health insurance premiums (self-employed)", note: "If self-employed and not eligible for an employer plan." },
    { name: "Disability insurance", note: "Business-use portion may be deductible — confirm with your CPA." },
  ]},
  { group: "Continuing Education", items: [
    { name: "CE course fees", note: "Required CEUs for license/certification renewal." },
    { name: "Conference registration", note: "AANA, state association meetings, specialty conferences." },
    { name: "Travel to conferences/CE", note: "Airfare, lodging, mileage, and meals (subject to limits)." },
    { name: "Books, journals & subscriptions", note: "Clinical references and professional publications." },
    { name: "ACLS / PALS / BLS certification", note: "Renewal courses and exam fees." },
  ]},
  { group: "Equipment & Supplies", items: [
    { name: "Medical equipment", note: "Stethoscope, monitors, point-of-care tools you personally own." },
    { name: "Scrubs & required uniforms", note: "Work-specific clothing not suitable for everyday wear." },
    { name: "Medical bag / equipment case", note: "Used to transport supplies between facilities." },
    { name: "Office supplies", note: "Paper, forms, printer ink for practice administration." },
  ]},
  { group: "Home Office & Administrative", items: [
    { name: "Home office deduction", note: "If you have a dedicated space used regularly for business admin." },
    { name: "Phone & internet (business %)", note: "Percentage used for scheduling, billing, communication." },
    { name: "Software & apps", note: "Scheduling, billing, EHR access, accounting software." },
    { name: "Accounting & bookkeeping fees", note: "CPA, bookkeeper, or tax prep services." },
    { name: "Legal fees", note: "Contract review, entity formation, compliance consulting." },
  ]},
  { group: "Travel & Vehicle", items: [
    { name: "Mileage between facilities", note: "Travel between job sites (not commute from home to one regular site)." },
    { name: "Vehicle expenses", note: "Actual expense or standard mileage rate — choose one method." },
    { name: "Parking & tolls", note: "Incurred while traveling for work between sites." },
  ]},
  { group: "Retirement & Business Structure", items: [
    { name: "Solo 401(k) / SEP IRA contributions", note: "Self-employed retirement plan contributions." },
    { name: "Business entity formation/maintenance", note: "LLC/PC filing fees, registered agent costs." },
    { name: "Self-employment tax deduction", note: "Half of SE tax is deductible above the line." },
  ]},
];

const S = {
  navy: "#0D2B3E", teal: "#1A6B7C", tealLight: "#2A8B9F",
  gold: "#C8963E", goldLight: "#E8B45A", white: "#FFFFFF",
  mist: "#F0F5F7", slate: "#4A6572", slateLight: "#8AA5B0",
  border: "#D0E2E8", success: "#2D7D5A", danger: "#C0392B",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: ${S.mist}; color: ${S.navy}; }
  .hub-root { max-width: 680px; margin: 0 auto; min-height: 100vh; }
  .hub-header { background: linear-gradient(160deg, ${S.navy} 0%, ${S.teal} 100%); padding: 48px 24px 40px; text-align: center; position: relative; overflow: hidden; }
  .hub-header::before { content: ''; position: absolute; top: -40px; right: -40px; width: 180px; height: 180px; border-radius: 50%; background: rgba(200,150,62,0.12); pointer-events: none; }
  .hub-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 500; letter-spacing: 0.18em; color: ${S.goldLight}; text-transform: uppercase; margin-bottom: 12px; opacity: 0.9; }
  .hub-title { font-family: 'DM Serif Display', serif; font-size: clamp(28px, 6vw, 38px); color: ${S.white}; line-height: 1.15; margin-bottom: 10px; }
  .hub-tagline { font-size: 14px; color: rgba(255,255,255,0.72); line-height: 1.5; max-width: 340px; margin: 0 auto 24px; }
  .hub-socials { display: flex; justify-content: center; gap: 12px; margin-bottom: 24px; }
  .social-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 100px; border: 1.5px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.08); color: ${S.white}; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; text-decoration: none; }
  .social-btn:hover { background: rgba(255,255,255,0.16); }
  .join-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 28px; background: ${S.gold}; color: ${S.white}; font-weight: 600; font-size: 15px; border-radius: 100px; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 20px rgba(200,150,62,0.35); }
  .join-btn:hover { background: ${S.goldLight}; transform: translateY(-1px); }
  .stats-bar { background: ${S.white}; border-bottom: 1px solid ${S.border}; display: flex; justify-content: space-around; padding: 16px 8px; }
  .stat-item { text-align: center; }
  .stat-num { font-family: 'DM Serif Display', serif; font-size: 22px; color: ${S.teal}; display: block; }
  .stat-label { font-size: 11px; color: ${S.slate}; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 500; }
  .nav-section { padding: 20px 16px 8px; }
  .nav-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .nav-card { display: flex; align-items: center; gap: 12px; padding: 16px; background: ${S.white}; border: 1.5px solid ${S.border}; border-radius: 14px; cursor: pointer; transition: all 0.2s; }
  .nav-card:hover { border-color: ${S.teal}; box-shadow: 0 4px 16px rgba(26,107,124,0.12); transform: translateY(-1px); }
  .nav-card.active { border-color: ${S.teal}; background: #EAF5F7; }
  .nav-icon { width: 40px; height: 40px; background: linear-gradient(135deg, ${S.teal}, ${S.tealLight}); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
  .nav-icon.gold { background: linear-gradient(135deg, ${S.gold}, ${S.goldLight}); }
  .nav-icon.slate { background: linear-gradient(135deg, ${S.slate}, ${S.slateLight}); }
  .nav-label { font-weight: 600; font-size: 13px; color: ${S.navy}; line-height: 1.3; }
  .nav-sub { font-size: 11px; color: ${S.slate}; margin-top: 2px; }
  .section-wrap { padding: 8px 16px 24px; }
  .section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid ${S.border}; }
  .section-title { font-family: 'DM Serif Display', serif; font-size: 22px; color: ${S.navy}; }
  .section-badge { font-family: 'JetBrains Mono', monospace; font-size: 11px; background: ${S.teal}; color: white; padding: 3px 10px; border-radius: 100px; }
  .search-row { display: flex; gap: 8px; margin-bottom: 12px; }
  .search-box { flex: 1; display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: ${S.white}; border: 1.5px solid ${S.border}; border-radius: 10px; color: ${S.slate}; }
  .search-input { border: none; outline: none; background: transparent; font-size: 14px; color: ${S.navy}; width: 100%; font-family: 'Inter', sans-serif; }
  .filter-select { padding: 10px 14px; border: 1.5px solid ${S.border}; border-radius: 10px; background: ${S.white}; font-size: 13px; color: ${S.navy}; font-family: 'Inter', sans-serif; cursor: pointer; outline: none; max-width: 160px; }
  .doc-card { background: ${S.white}; border: 1.5px solid ${S.border}; border-radius: 14px; padding: 16px; margin-bottom: 10px; transition: all 0.2s; cursor: pointer; }
  .doc-card:hover { border-color: ${S.tealLight}; box-shadow: 0 4px 16px rgba(26,107,124,0.08); }
  .doc-top { display: flex; align-items: flex-start; gap: 12px; }
  .doc-icon { width: 42px; height: 42px; background: ${S.mist}; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: ${S.teal}; flex-shrink: 0; border: 1px solid ${S.border}; }
  .doc-info { flex: 1; min-width: 0; }
  .doc-title { font-weight: 600; font-size: 14px; color: ${S.navy}; margin-bottom: 3px; line-height: 1.3; }
  .doc-desc { font-size: 12px; color: ${S.slate}; line-height: 1.4; margin-bottom: 8px; }
  .doc-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .tag { font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 100px; white-space: nowrap; }
  .tag-cat { background: #E8F4F7; color: ${S.teal}; }
  .tag-user { background: #F5F0E8; color: #8B6914; }
  .tag-date { background: ${S.mist}; color: ${S.slate}; font-family: 'JetBrains Mono', monospace; font-size: 10px; }
  .doc-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 10px; border-top: 1px solid ${S.border}; }
  .dl-count { font-size: 12px; color: ${S.slate}; display: flex; align-items: center; gap: 4px; }
  .preview-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: ${S.teal}; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
  .preview-btn:hover { background: ${S.navy}; }
  .form-card { background: ${S.white}; border: 1.5px solid ${S.border}; border-radius: 16px; padding: 24px; }
  .form-group { margin-bottom: 18px; }
  .form-label { display: block; font-size: 13px; font-weight: 600; color: ${S.navy}; margin-bottom: 6px; }
  .form-input, .form-select, .form-textarea { width: 100%; padding: 11px 14px; border: 1.5px solid ${S.border}; border-radius: 10px; font-size: 14px; color: ${S.navy}; font-family: 'Inter', sans-serif; outline: none; transition: border-color 0.2s; background: ${S.white}; }
  .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: ${S.teal}; box-shadow: 0 0 0 3px rgba(26,107,124,0.1); }
  .form-textarea { resize: vertical; min-height: 80px; }
  .file-drop { border: 2px dashed ${S.border}; border-radius: 12px; padding: 32px 20px; text-align: center; cursor: pointer; transition: all 0.2s; background: ${S.mist}; }
  .file-drop:hover, .file-drop.active { border-color: ${S.teal}; background: #EAF5F7; }
  .file-drop-icon { color: ${S.teal}; margin-bottom: 10px; }
  .file-drop-text { font-size: 14px; font-weight: 500; color: ${S.slate}; margin-bottom: 4px; }
  .file-drop-sub { font-size: 12px; color: ${S.slateLight}; }
  .checkbox-row { display: flex; align-items: flex-start; gap: 10px; padding: 14px; background: #FFF8EE; border: 1.5px solid #E8C875; border-radius: 10px; margin-bottom: 18px; }
  .checkbox-row input { width: 16px; height: 16px; margin-top: 2px; cursor: pointer; accent-color: ${S.gold}; flex-shrink: 0; }
  .checkbox-label { font-size: 13px; color: ${S.navy}; line-height: 1.5; }
  .anon-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
  .anon-row input { accent-color: ${S.teal}; cursor: pointer; }
  .anon-label { font-size: 13px; color: ${S.slate}; }
  .submit-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, ${S.teal}, ${S.navy}); color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .submit-btn:hover { opacity: 0.92; transform: translateY(-1px); }
  .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .progress-bar { width: 100%; height: 6px; background: ${S.border}; border-radius: 100px; margin-bottom: 18px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, ${S.teal}, ${S.gold}); border-radius: 100px; transition: width 0.3s; }
  .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: ${S.success}; color: white; padding: 14px 24px; border-radius: 12px; font-weight: 600; font-size: 14px; z-index: 999; display: flex; align-items: center; gap: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); animation: slideUp 0.3s ease; white-space: nowrap; }
  @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  .guidelines-card { background: linear-gradient(135deg, #0D2B3E 0%, #1A4A5C 100%); border-radius: 16px; padding: 24px; color: white; }
  .guideline-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .guideline-item:last-child { border-bottom: none; }
  .g-icon { color: ${S.goldLight}; flex-shrink: 0; margin-top: 1px; }
  .g-text { font-size: 14px; line-height: 1.5; opacity: 0.9; }
  .g-title { font-weight: 600; opacity: 1; margin-bottom: 2px; }
  .moderation-note { margin-top: 16px; background: rgba(200,150,62,0.15); border: 1px solid rgba(200,150,62,0.3); border-radius: 10px; padding: 12px 16px; font-size: 13px; opacity: 0.9; line-height: 1.5; display: flex; align-items: center; gap: 8px; }
  .disclaimer-banner { display: flex; align-items: flex-start; gap: 10px; background: #FFF8EE; border: 1.5px solid #E8C875; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; font-size: 13px; color: ${S.navy}; line-height: 1.5; }
  .writeoff-group { margin-bottom: 22px; }
  .writeoff-group-title { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: ${S.teal}; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1.5px solid ${S.border}; }
  .writeoff-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid ${S.border}; }
  .writeoff-item:last-child { border-bottom: none; }
  .writeoff-bullet { width: 22px; height: 22px; border-radius: 7px; background: #E8F4F7; color: ${S.teal}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
  .writeoff-name { font-size: 14px; font-weight: 600; color: ${S.navy}; margin-bottom: 2px; }
  .writeoff-note { font-size: 12px; color: ${S.slate}; line-height: 1.4; }
  .admin-login { background: ${S.white}; border: 1.5px solid ${S.border}; border-radius: 16px; padding: 32px 24px; text-align: center; }
  .pending-card { background: ${S.white}; border: 1.5px solid #F0D080; border-radius: 14px; padding: 16px; margin-bottom: 10px; }
  .admin-actions { display: flex; gap: 8px; margin-top: 12px; }
  .approve-btn { flex: 1; padding: 9px; background: ${S.success}; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: 'Inter', sans-serif; }
  .reject-btn { flex: 1; padding: 9px; background: ${S.danger}; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: 'Inter', sans-serif; }
  .empty-state { text-align: center; padding: 48px 24px; color: ${S.slate}; }
  .empty-icon { color: ${S.border}; margin-bottom: 12px; }
  .empty-text { font-size: 15px; font-weight: 600; margin-bottom: 6px; color: ${S.slate}; }
  .empty-sub { font-size: 13px; color: ${S.slateLight}; }
  .loading { text-align: center; padding: 48px 24px; color: ${S.slate}; font-size: 14px; }
  .hub-footer { background: ${S.navy}; color: rgba(255,255,255,0.6); padding: 32px 24px; text-align: center; margin-top: 32px; }
  .footer-logo { font-family: 'DM Serif Display', serif; font-size: 18px; color: white; margin-bottom: 6px; }
  .footer-tagline { font-size: 12px; margin-bottom: 20px; }
  .footer-links { display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
  .footer-link { font-size: 13px; color: rgba(255,255,255,0.6); cursor: pointer; }
  .footer-link:hover { color: ${S.goldLight}; }
  .footer-copy { font-size: 11px; opacity: 0.45; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: flex-end; justify-content: center; z-index: 100; }
  .modal-box { background: white; border-radius: 20px 20px 0 0; padding: 24px; width: 100%; max-width: 680px; max-height: 92vh; display: flex; flex-direction: column; box-shadow: 0 -8px 40px rgba(0,0,0,0.2); }
  .modal-title { font-family: 'DM Serif Display', serif; font-size: 20px; color: ${S.navy}; margin-bottom: 4px; }
  .modal-sub { font-size: 13px; color: ${S.slate}; margin-bottom: 16px; line-height: 1.5; }
  .modal-close { position: absolute; top: 20px; right: 20px; background: ${S.mist}; border: none; cursor: pointer; color: ${S.slate}; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
  .preview-area { flex: 1; overflow: hidden; border-radius: 12px; border: 1.5px solid ${S.border}; background: ${S.mist}; margin-bottom: 16px; min-height: 300px; display: flex; align-items: center; justify-content: center; position: relative; }
  .preview-iframe { width: 100%; height: 100%; min-height: 380px; border: none; border-radius: 10px; }
  .preview-placeholder { text-align: center; padding: 32px 24px; color: ${S.slate}; }
  .preview-placeholder-icon { color: ${S.border}; margin-bottom: 12px; }
  .dl-options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .dl-option-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 13px; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.2s; }
  .dl-option-pdf { background: linear-gradient(135deg, ${S.teal}, ${S.navy}); color: white; }
  .dl-option-pdf:hover { opacity: 0.9; transform: translateY(-1px); }
  .dl-option-jpg { background: linear-gradient(135deg, ${S.gold}, ${S.goldLight}); color: white; }
  .dl-option-jpg:hover { opacity: 0.9; transform: translateY(-1px); }
  .dl-option-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .join-modal-box { background: white; border-radius: 20px; padding: 32px 24px; max-width: 380px; width: 100%; margin: auto; box-shadow: 0 24px 80px rgba(0,0,0,0.3); }
  .join-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; }
`;

const Icon = ({ name, size = 20 }) => {
  const icons = {
    instagram: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
    tiktok: <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/></svg>,
    download: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    upload: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    shield: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    file: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    eye: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    users: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    lock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    mail: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    dollar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    image: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  };
  return icons[name] || null;
};

function ApprovedWriteoffsList({ onToast }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    sb.getApprovedWriteoffs().then(data => setItems(Array.isArray(data) ? data : []));
  }, []);

  if (items.length === 0) return (
    <div style={{ background: "#fff", border: "1.5px solid #D0E2E8", borderRadius: 12, padding: "16px", marginBottom: 16, fontSize: 13, color: "#4A6572", textAlign: "center" }}>
      No community write-offs published yet
    </div>
  );

  return (
    <div style={{ marginBottom: 16 }}>
      {items.map(wo => (
        <div key={wo.id} className="pending-card" style={{ borderColor: "#F0D080" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div className="doc-title">{wo.name}</div>
              <div style={{ marginTop: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 100, background: "#FFF0D6", color: "#C8963E" }}>{wo.category}</span>
              </div>
              {wo.note && <div style={{ fontSize: 12, color: "#4A6572" }}>{wo.note}</div>}
            </div>
            <button
              onClick={async () => {
                if (window.confirm(`Delete "${wo.name}"? This cannot be undone.`)) {
                  await sb.deleteWriteoff(wo.id);
                  setItems(prev => prev.filter(w => w.id !== wo.id));
                  onToast("🗑 Write-off deleted.");
                }
              }}
              style={{ background: "#C0392B", color: "white", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, flexShrink: 0, fontFamily: "'Inter', sans-serif" }}
            >
              <Icon name="x" size={13} /> Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function WriteOffsView({ onToast }) {
  const [communityItems, setCommunityItems] = useState([]);
  const [newName, setNewName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const WO_CATEGORIES = [
    "Licensing & Credentialing",
    "Insurance",
    "Continuing Education",
    "Equipment & Supplies",
    "Home Office & Administrative",
    "Travel & Vehicle",
    "Retirement & Business Structure",
    "Miscellaneous",
  ];

  useEffect(() => {
    sb.getApprovedWriteoffs().then(data => {
      setCommunityItems(Array.isArray(data) ? data : []);
    });
  }, []);

  const handleSubmit = async () => {
    if (!newName.trim() || !newCategory) return;
    setSubmitting(true);
    try {
      await sb.insertWriteoff({ name: newName.trim(), note: newNote.trim(), category: newCategory, approved: false });
      setNewName(""); setNewNote(""); setNewCategory("");
      setSubmitted(true);
      onToast("✅ Write-off submitted for review!");
      setTimeout(() => setSubmitted(false), 4000);
    } catch { onToast("❌ Submission failed. Try again."); }
    setSubmitting(false);
  };

  const handleDownloadPDF = () => {
    const totalItems = WRITE_OFFS.reduce((a, g) => a + g.items.length, 0) + communityItems.length;
    const allGroupsForPDF = WRITE_OFFS.map(group => {
      const communityForGroup = communityItems.filter(i => i.category === group.group);
      return {
        ...group,
        items: [
          ...group.items,
          ...communityForGroup.map(i => ({ name: i.name, note: i.note, community: true })),
        ]
      };
    });
    const miscCommunityPDF = communityItems.filter(i => i.category === "Miscellaneous");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>AnesVault Business Write-Offs</title>
        <style>
          body { font-family: Georgia, serif; max-width: 750px; margin: 0 auto; padding: 40px 32px; color: #0D2B3E; }
          .header { text-align: center; border-bottom: 3px solid #1A6B7C; padding-bottom: 24px; margin-bottom: 32px; }
          .logo { font-size: 32px; color: #1A6B7C; margin-bottom: 4px; }
          .logo span { color: #C8963E; font-style: italic; }
          .subtitle { font-size: 13px; color: #4A6572; letter-spacing: 0.1em; text-transform: uppercase; }
          .date { font-size: 12px; color: #8AA5B0; margin-top: 6px; }
          .disclaimer { background: #FFF8EE; border: 1.5px solid #E8C875; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #0D2B3E; margin-bottom: 28px; line-height: 1.5; }
          .group { margin-bottom: 24px; page-break-inside: avoid; }
          .group-title { font-size: 11px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #1A6B7C; border-bottom: 1.5px solid #D0E2E8; padding-bottom: 6px; margin-bottom: 10px; font-family: monospace; }
          .item { display: flex; gap: 10px; padding: 7px 0; border-bottom: 1px solid #F0F5F7; }
          .item:last-child { border-bottom: none; }
          .bullet { color: #C8963E; font-size: 14px; flex-shrink: 0; margin-top: 1px; }
          .item-name { font-size: 13px; font-weight: bold; color: #0D2B3E; margin-bottom: 2px; }
          .item-note { font-size: 11px; color: #4A6572; line-height: 1.4; }
          .community-badge { font-size: 9px; background: #FFF0D6; color: #C8963E; padding: 2px 6px; border-radius: 100px; margin-left: 6px; font-weight: bold; vertical-align: middle; }
          .footer { text-align: center; margin-top: 40px; padding-top: 16px; border-top: 1px solid #D0E2E8; font-size: 11px; color: #8AA5B0; }
          .total { text-align: right; font-size: 12px; color: #4A6572; margin-bottom: 24px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Anes<span>Vault</span></div>
          <div class="subtitle">Business Write-Off Reference Guide</div>
          <div class="date">Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
        </div>
        <div class="disclaimer">
          ⚠️ <strong>Not tax advice.</strong> This is a general educational reference for independent anesthesia providers (CRNAs, MDAs). Always confirm deductions with a licensed CPA or tax professional before filing.
        </div>
        <div class="total">${totalItems} deductions across ${allGroupsForPDF.length + (miscCommunityPDF.length > 0 ? 1 : 0)} categories</div>
        ${allGroupsForPDF.map(group => `
          <div class="group">
            <div class="group-title">${group.group}</div>
            ${group.items.map(item => `
              <div class="item">
                <div class="bullet">$</div>
                <div>
                  <div class="item-name">${item.name}${item.community ? '<span class="community-badge">community</span>' : ''}</div>
                  ${item.note ? `<div class="item-note">${item.note}</div>` : ""}
                </div>
              </div>
            `).join("")}
          </div>
        `).join("")}
        ${miscCommunityPDF.length > 0 ? `
          <div class="group">
            <div class="group-title">Miscellaneous</div>
            ${miscCommunityPDF.map(item => `
              <div class="item">
                <div class="bullet">$</div>
                <div>
                  <div class="item-name">${item.name}<span class="community-badge">community</span></div>
                  ${item.note ? `<div class="item-note">${item.note}</div>` : ""}
                </div>
              </div>
            `).join("")}
          </div>
        ` : ""}
        <div class="footer">
          AnesVault · anesvault.com · @Anes.Vault on Instagram & TikTok<br/>
          Built by anesthesia, for anesthesia.
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "text/html" });
    const url = window.URL.createObjectURL(blob);
    const printWindow = window.open(url, "_blank");
    printWindow.onload = () => {
      printWindow.print();
      window.URL.revokeObjectURL(url);
    };
  };

  // Merge static + community approved, grouped by category
  const allGroups = WRITE_OFFS.map(group => {
    const communityForGroup = communityItems.filter(i => i.category === group.group);
    return {
      ...group,
      items: [
        ...group.items,
        ...communityForGroup.map(i => ({ name: i.name, note: i.note, community: true })),
      ]
    };
  });

  const miscCommunity = communityItems.filter(i => i.category === "Miscellaneous");

  return (
    <div className="section-wrap">
      <div className="section-head">
        <span className="section-title">Business Write-Offs</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="section-badge">{WRITE_OFFS.reduce((a, g) => a + g.items.length, 0) + communityItems.length} total</span>
          <button onClick={handleDownloadPDF} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: S.teal, color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            <Icon name="download" size={13} /> PDF
          </button>
        </div>
      </div>

      <div className="disclaimer-banner">
        <div className="g-icon"><Icon name="shield" size={16} /></div>
        <div><strong>Not tax advice.</strong> General educational list for independent anesthesia providers. Always confirm with a licensed CPA before filing.</div>
      </div>

      {/* Submit a write-off */}
      <div style={{ background: "#fff", border: `1.5px solid ${S.border}`, borderRadius: 16, padding: 20, marginBottom: 24 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: S.navy, marginBottom: 4 }}>Suggest a Write-Off</div>
        <div style={{ fontSize: 13, color: S.slate, marginBottom: 16 }}>Know a deduction we missed? Submit it for review — if approved it'll appear in the community list below.</div>

        {submitted ? (
          <div style={{ background: "#EAF7F0", border: `1.5px solid #A8D9C0`, borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#2D7D5A", fontWeight: 600, textAlign: "center" }}>
            ✅ Submitted! It will appear below once approved.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #D0E2E8", borderRadius: 10, fontSize: 14, color: "#0D2B3E", fontFamily: "'Inter', sans-serif", outline: "none", background: "white", cursor: "pointer" }}
            >
              <option value="">Select a category…</option>
              {WO_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #D0E2E8", borderRadius: 10, fontSize: 14, color: "#0D2B3E", fontFamily: "'Inter', sans-serif", outline: "none", background: "white" }}
              placeholder="Write-off name e.g. Stethoscope replacement"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <input
              style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #D0E2E8", borderRadius: 10, fontSize: 14, color: "#0D2B3E", fontFamily: "'Inter', sans-serif", outline: "none", background: "white" }}
              placeholder="Notes (optional) e.g. Purchased for work use only"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
            />
            <button
              onClick={handleSubmit}
              disabled={!newName.trim() || !newCategory || submitting}
              style={{ padding: "11px", background: (newName.trim() && newCategory) ? "linear-gradient(135deg, #C8963E, #E8B45A)" : "#D0E2E8", color: "white", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: (newName.trim() && newCategory) ? "pointer" : "not-allowed", fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Icon name="check" size={16} /> {submitting ? "Submitting…" : "Submit for Review"}
            </button>
          </div>
        )}
      </div>

      {/* Community reference list */}
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: S.slate, marginBottom: 16 }}>
        Community Reference List
      </div>
      {allGroups.map(group => (
        <div key={group.group} className="writeoff-group">
          <div className="writeoff-group-title">{group.group}</div>
          {group.items.map((item, i) => (
            <div key={i} className="writeoff-item">
              <div className="writeoff-bullet" style={item.community ? { background: "#FFF0D6", color: S.gold } : {}}><Icon name="dollar" size={12} /></div>
              <div>
                <div className="writeoff-name">{item.name}{item.community && <span style={{ fontSize: 10, color: S.gold, marginLeft: 6, fontWeight: 500 }}>community</span>}</div>
                {item.note && <div className="writeoff-note">{item.note}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Miscellaneous community items */}
      {miscCommunity.length > 0 && (
        <div className="writeoff-group">
          <div className="writeoff-group-title">Miscellaneous</div>
          {miscCommunity.map((item, i) => (
            <div key={i} className="writeoff-item">
              <div className="writeoff-bullet" style={{ background: "#FFF0D6", color: S.gold }}><Icon name="dollar" size={12} /></div>
              <div>
                <div className="writeoff-name">{item.name}<span style={{ fontSize: 10, color: S.gold, marginLeft: 6, fontWeight: 500 }}>community</span></div>
                {item.note && <div className="writeoff-note">{item.note}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnesVault() {
  const [view, setView] = useState("home");
  const [docs, setDocs] = useState([]);
  const [pending, setPending] = useState([]);
  const [pendingWriteoffs, setPendingWriteoffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [toast, setToast] = useState(null);
  const [showJoin, setShowJoin] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [converting, setConverting] = useState(false);
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [joinEmail, setJoinEmail] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [form, setForm] = useState({ title: "", category: "", description: "", uploader: "", anon: false, file: null, agreed: false });
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef();

  useEffect(() => { fetchDocs(); }, []);

  async function fetchDocs() {
    setLoading(true);
    try {
      const data = await sb.getDocs();
      setDocs(Array.isArray(data) ? data : []);
    } catch { setDocs([]); }
    setLoading(false);
  }

  async function fetchPending() {
    try {
      const data = await sb.getPending();
      setPending(Array.isArray(data) ? data : []);
      const woData = await sb.getPendingWriteoffs();
      setPendingWriteoffs(Array.isArray(woData) ? woData : []);
    } catch { setPending([]); setPendingWriteoffs([]); }
  }

  useEffect(() => {
    if (view === "admin" && adminAuth) fetchPending();
  }, [view, adminAuth]);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t); }
  }, [toast]);

  const filteredDocs = docs.filter(d =>
    (catFilter === "All" || d.category === catFilter) &&
    (search === "" || d.title?.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase()))
  );

  const openPreview = (doc) => {
    setPreviewDoc(doc);
  };

  const handleDownloadPDFFromCard = async (e, doc) => {
    e.stopPropagation();
    await sb.updateDoc(doc.id, { downloads: (doc.downloads || 0) + 1 });
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, downloads: (d.downloads || 0) + 1 } : d));
    if (!doc.file_url) return;
    try {
      const response = await fetch(doc.file_url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const ext = doc.file_url.split(".").pop().split("?")[0];
      a.download = `${doc.title}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      setToast("📥 Download saved!");
    } catch {
      window.open(doc.file_url, "_blank");
      setToast("📥 Opening file…");
    }
  };

  const downloadFile = async (url, filename, mimeType) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(new Blob([blob], { type: mimeType }));
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      setToast("📥 Download saved!");
    } catch {
      window.open(url, "_blank");
      setToast("📥 Opening file…");
    }
  };

  const handleDownloadPDF = async () => {
    if (!previewDoc?.file_url) return;
    const ext = previewDoc.file_url.split(".").pop().split("?")[0];
    await downloadFile(previewDoc.file_url, `${previewDoc.title}.${ext}`, "application/pdf");
  };

  const handleOpenInBrowser = () => {
    if (!previewDoc?.file_url) return;
    window.open(previewDoc.file_url, "_blank");
    setToast("🌐 Opened in browser — use Share to save!");
  };

  const handleSubmit = async () => {
    if (!form.title || !form.category || !form.agreed) return;
    setUploading(true);
    setUploadProgress(20);
    try {
      let file_url = null;
      if (form.file) {
        setUploadProgress(50);
        file_url = await sb.uploadFile(form.file);
      }
      setUploadProgress(80);
      await sb.insertDoc({
        title: form.title, category: form.category,
        description: form.description || "Community-submitted document.",
        uploader: form.anon ? "Anonymous" : (form.uploader || "Anonymous"),
        file_url, downloads: 0, approved: false,
      });
      setUploadProgress(100);
      setForm({ title: "", category: "", description: "", uploader: "", anon: false, file: null, agreed: false });
      setToast("✅ Submitted for review! You'll see it live once approved.");
      setView("library");
    } catch { setToast("❌ Upload failed. Please try again."); }
    setUploading(false);
    setUploadProgress(0);
  };

  const handleApprove = async (id) => {
    await sb.updateDoc(id, { approved: true });
    setPending(prev => prev.filter(d => d.id !== id));
    await fetchDocs();
    setToast("✅ Document approved and published!");
  };

  const handleReject = async (id) => {
    await sb.deleteDoc(id);
    setPending(prev => prev.filter(d => d.id !== id));
    setToast("🗑 Document rejected and deleted.");
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) setForm(f => ({ ...f, file }));
  };

  const isPDF = (url) => url?.toLowerCase().includes(".pdf");

  return (
    <div className="hub-root">
      <style>{css}</style>

      <header className="hub-header">
        <div className="hub-eyebrow">Small Business Anesthesia</div>
        <h1 className="hub-title">Anes<span style={{ fontStyle: "italic", color: S.goldLight }}>Vault</span></h1>
        <p className="hub-tagline">Your community. Your resources.<br />Built by anesthesia, for anesthesia.</p>
        <div className="hub-socials">
          <a href="https://www.instagram.com/anes.vault" target="_blank" rel="noreferrer" className="social-btn"><Icon name="instagram" size={16} /> @Anes.Vault</a>
          <a href="https://www.tiktok.com/@anes.vault" target="_blank" rel="noreferrer" className="social-btn"><Icon name="tiktok" size={16} /> @Anes.Vault</a>
        </div>
        <button className="join-btn" onClick={() => setShowJoin(true)}>
          <Icon name="users" size={16} /> Join the Community
        </button>
      </header>

      <div className="stats-bar">
        <div className="stat-item"><span className="stat-num">{docs.length}</span><span className="stat-label">Documents</span></div>
        <div className="stat-item"><span className="stat-num">{docs.reduce((a, d) => a + (d.downloads || 0), 0)}</span><span className="stat-label">Downloads</span></div>
        <div className="stat-item"><span className="stat-num">{CATEGORIES.length}</span><span className="stat-label">Categories</span></div>
        <div className="stat-item"><span className="stat-num">{pending.length}</span><span className="stat-label">Pending</span></div>
      </div>

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
        </div>
      </div>

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
          {loading ? (
            <div className="loading">Loading documents…</div>
          ) : filteredDocs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="file" size={48} /></div>
              <div className="empty-text">No documents yet</div>
              <div className="empty-sub"><span style={{ color: S.teal, cursor: "pointer", fontWeight: 600 }} onClick={() => setView("upload")}>Be the first to upload one!</span></div>
            </div>
          ) : filteredDocs.map(doc => (
            <div key={doc.id} className="doc-card" onClick={() => openPreview(doc)}>
              <div className="doc-top">
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
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="preview-btn" style={{ background: S.slate }} onClick={e => { e.stopPropagation(); openPreview(doc); }}>
                    <Icon name="eye" size={14} /> Preview
                  </button>
                  <button className="preview-btn" onClick={e => handleDownloadPDFFromCard(e, doc)}>
                    <Icon name="download" size={14} /> Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "upload" && (
        <div className="section-wrap">
          <div className="section-head"><span className="section-title">Upload a Document</span></div>
          <div className="form-card">
            {uploading && <div className="progress-bar"><div className="progress-fill" style={{ width: `${uploadProgress}%` }} /></div>}
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
              <div className="anon-row">
                <input type="checkbox" id="anon" checked={form.anon} onChange={e => setForm(f => ({ ...f, anon: e.target.checked }))} />
                <label className="anon-label" htmlFor="anon">Post anonymously</label>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Upload File</label>
              <div className={`file-drop ${dragActive ? "active" : ""}`}
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}>
                <div className="file-drop-icon"><Icon name="upload" size={32} /></div>
                <div className="file-drop-text">{form.file ? form.file.name : "Drag & drop or tap to choose"}</div>
                <div className="file-drop-sub">PDF, DOCX, or XLSX · Max 10 MB</div>
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
              <Icon name="upload" size={18} /> {uploading ? `Uploading… ${uploadProgress}%` : "Submit for Review"}
            </button>
          </div>
        </div>
      )}

      {view === "guidelines" && (
        <div className="section-wrap">
          <div className="section-head"><span className="section-title">Community Guidelines</span></div>
          <div className="guidelines-card">
            {[
              { title: "No PHI — Ever", text: "Documents must contain zero Protected Health Information. No patient names, DOBs, MRNs, or identifiable data of any kind." },
              { title: "Own What You Share", text: "Only upload documents you created or have explicit permission to distribute. Respect institutional and proprietary resources." },
              { title: "Anesthesia Professionals Only", text: "This hub is designed for CRNAs, MDAs, and independent anesthesia practices — keep content clinically relevant." },
              { title: "Be a Good Colleague", text: "Label documents clearly, write an honest description, and credit original authors when appropriate." },
              { title: "No Solicitation", text: "AnesVault is a community resource hub — not a marketplace. Do not use it to advertise products, services, or job postings without permission." },
              { title: "Moderation Queue", text: "Every uploaded document is reviewed before going live. We typically review within 48 hours." },
              { title: "Zero Tolerance", text: "Inappropriate, offensive, or malicious content will be removed immediately and the submission may be reported." },
            ].map(g => (
              <div key={g.title} className="guideline-item">
                <div className="g-icon"><Icon name="check" size={16} /></div>
                <div><div className="g-text g-title">{g.title}</div><div className="g-text">{g.text}</div></div>
              </div>
            ))}
            <div className="moderation-note"><Icon name="shield" size={16} /> All uploads are reviewed by volunteer moderators. Thank you for keeping AnesVault safe.</div>
          </div>
          <div style={{ marginTop: 16, background: S.white, border: `1.5px solid ${S.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: S.navy, marginBottom: 8 }}>Questions or Concerns?</div>
            <div style={{ fontSize: 13, color: S.slate, marginBottom: 12, lineHeight: 1.5 }}>If you have questions about these guidelines or want to report content that violates them, reach out directly.</div>
            <a href="mailto:ADLMedgroup@gmail.com?subject=AnesVault%20Guidelines%20Question" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", background: S.teal, color: "white", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              <Icon name="mail" size={14} /> Contact Us
            </a>
          </div>
        </div>
      )}

      {view === "privacy" && (
        <div className="section-wrap">
          <div className="section-head"><span className="section-title">Privacy Policy</span></div>
          <div style={{ background: S.white, border: `1.5px solid ${S.border}`, borderRadius: 16, padding: 24 }}>
            {[
              { title: "What We Collect", text: "When you join the community, we collect your email address. When you upload a document, we collect the document title, category, description, and optional display name. We do not collect any patient data or PHI." },
              { title: "How We Use Your Information", text: "Your email is used only to send community updates and notifications about new resources. We will never sell, rent, or share your email with third parties." },
              { title: "Document Uploads", text: "Documents uploaded to AnesVault are stored securely on Supabase cloud infrastructure. All uploads are reviewed by moderators before being made public. Do not upload any documents containing PHI or patient-identifiable information." },
              { title: "Cookies & Analytics", text: "AnesVault may use basic analytics to understand how the platform is being used (e.g. page views, download counts). No personally identifiable tracking is used." },
              { title: "Data Retention", text: "You may request deletion of your email from our list at any time by contacting us. Uploaded documents may be removed by contacting us or by admin moderation." },
              { title: "Third-Party Services", text: "AnesVault uses Supabase for database and file storage, and Vercel for hosting. These services have their own privacy policies which govern their data handling." },
              { title: "Children's Privacy", text: "AnesVault is intended for licensed healthcare professionals only. We do not knowingly collect information from anyone under the age of 18." },
              { title: "Changes to This Policy", text: "We may update this privacy policy from time to time. Continued use of AnesVault constitutes acceptance of any updated policy." },
            ].map((item, i) => (
              <div key={i} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: i < 7 ? `1px solid ${S.border}` : "none" }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: S.navy, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: S.slate, lineHeight: 1.6 }}>{item.text}</div>
              </div>
            ))}
            <div style={{ background: S.mist, borderRadius: 10, padding: "12px 16px", fontSize: 12, color: S.slate, lineHeight: 1.5 }}>
              Last updated: July 2026 · Questions? <a href="mailto:ADLMedgroup@gmail.com?subject=AnesVault%20Privacy%20Policy" style={{ color: S.teal, fontWeight: 600 }}>ADLMedgroup@gmail.com</a>
            </div>
          </div>
        </div>
      )}

      {view === "writeoffs" && (
        <WriteOffsView onToast={setToast} />
      )}

      {view === "admin" && (
        <div className="section-wrap">
          <div className="section-head">
            <span className="section-title">Admin Panel</span>
            {adminAuth && <span className="section-badge">{pending.length + pendingWriteoffs.length} pending</span>}
          </div>
          {!adminAuth ? (
            <div className="admin-login">
              <div style={{ marginBottom: 16, color: S.slate }}><Icon name="lock" size={32} /></div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, marginBottom: 8 }}>Moderator Access</div>
              <div style={{ fontSize: 13, color: S.slate, marginBottom: 20 }}>Enter the admin password to review pending uploads.</div>
              <input className="form-input" type="password" placeholder="Password" value={adminPw} onChange={e => setAdminPw(e.target.value)} style={{ marginBottom: 12 }} />
              <button className="submit-btn" onClick={() => { if (adminPw === "AnesVault2026!") setAdminAuth(true); else setToast("❌ Incorrect password"); }}>
                <Icon name="lock" size={16} /> Sign In
              </button>
            </div>
          ) : (
            <>
              {/* PENDING DOCS */}
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: S.teal, marginBottom: 12 }}>
                Pending Documents ({pending.length})
              </div>
              {pending.length === 0 ? (
                <div style={{ background: S.white, border: `1.5px solid ${S.border}`, borderRadius: 12, padding: "16px", marginBottom: 24, fontSize: 13, color: S.slate, textAlign: "center" }}>
                  ✅ No documents pending review
                </div>
              ) : pending.map(doc => (
                <div key={doc.id} className="pending-card">
                  <div className="doc-title">{doc.title}</div>
                  <div style={{ marginTop: 4, marginBottom: 8 }}>
                    <span className="tag tag-cat">{doc.category}</span>{" "}
                    <span className="tag tag-user">↑ {doc.uploader}</span>
                  </div>
                  <div style={{ fontSize: 13, color: S.slate }}>{doc.description}</div>
                  {doc.file_url && <div style={{ fontSize: 12, color: S.teal, marginTop: 6 }}><a href={doc.file_url} target="_blank" rel="noreferrer">Preview file ↗</a></div>}
                  <div className="admin-actions">
                    <button className="approve-btn" onClick={() => handleApprove(doc.id)}><Icon name="check" size={14} /> Approve</button>
                    <button className="reject-btn" onClick={() => handleReject(doc.id)}><Icon name="x" size={14} /> Reject</button>
                  </div>
                </div>
              ))}

              {/* PENDING WRITE-OFFS */}
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: S.gold, marginBottom: 12, marginTop: 8 }}>
                Pending Write-Offs ({pendingWriteoffs.length})
              </div>
              {pendingWriteoffs.length === 0 ? (
                <div style={{ background: S.white, border: `1.5px solid ${S.border}`, borderRadius: 12, padding: "16px", marginBottom: 24, fontSize: 13, color: S.slate, textAlign: "center" }}>
                  ✅ No write-offs pending review
                </div>
              ) : pendingWriteoffs.map(wo => (
                <div key={wo.id} className="pending-card" style={{ borderColor: "#F0D080" }}>
                  <div className="doc-title">{wo.name}</div>
                  <div style={{ marginTop: 4, marginBottom: 8 }}>
                    <span className="tag" style={{ background: "#FFF0D6", color: S.gold, fontSize: 11, padding: "3px 9px", borderRadius: 100, fontWeight: 500 }}>{wo.category}</span>
                  </div>
                  {wo.note && <div style={{ fontSize: 13, color: S.slate }}>{wo.note}</div>}
                  <div className="admin-actions">
                    <button className="approve-btn" onClick={async () => {
                      await sb.updateWriteoff(wo.id, { approved: true });
                      setPendingWriteoffs(prev => prev.filter(w => w.id !== wo.id));
                      setToast("✅ Write-off approved!");
                    }}><Icon name="check" size={14} /> Approve</button>
                    <button className="reject-btn" onClick={async () => {
                      await sb.deleteWriteoff(wo.id);
                      setPendingWriteoffs(prev => prev.filter(w => w.id !== wo.id));
                      setToast("🗑 Write-off rejected.");
                    }}><Icon name="x" size={14} /> Reject</button>
                  </div>
                </div>
              ))}

              {/* APPROVED DOCS */}
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: S.teal, marginBottom: 12, marginTop: 8 }}>
                Published Documents ({docs.length})
              </div>
              {docs.length === 0 ? (
                <div style={{ background: S.white, border: `1.5px solid ${S.border}`, borderRadius: 12, padding: "16px", fontSize: 13, color: S.slate, textAlign: "center" }}>
                  No published documents yet
                </div>
              ) : docs.map(doc => (
                <div key={doc.id} className="pending-card" style={{ borderColor: S.border }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div className="doc-title">{doc.title}</div>
                      <div style={{ marginTop: 4, marginBottom: 6 }}>
                        <span className="tag tag-cat">{doc.category}</span>{" "}
                        <span className="tag tag-user">↑ {doc.uploader}</span>
                      </div>
                      <div style={{ fontSize: 12, color: S.slate }}>{doc.downloads || 0} downloads · {doc.created_at?.slice(0, 10)}</div>
                    </div>
                    <button
                      onClick={async () => {
                        if (window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) {
                          await sb.deleteDoc(doc.id);
                          setDocs(prev => prev.filter(d => d.id !== doc.id));
                          setToast("🗑 Document deleted.");
                        }
                      }}
                      style={{ background: S.danger, color: "white", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, flexShrink: 0, fontFamily: "'Inter', sans-serif" }}
                    >
                      <Icon name="x" size={13} /> Delete
                    </button>
                  </div>
                </div>
              ))}

              {/* PUBLISHED WRITE-OFFS */}
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: S.gold, marginBottom: 12, marginTop: 8 }}>
                Published Write-Offs ({[...new Set([...WRITE_OFFS.flatMap(g => g.items)].map(i => i.name))].length})
              </div>
              <ApprovedWriteoffsList onToast={setToast} />
            </>
          )}
        </div>
      )}

      <footer className="hub-footer">
        <div className="footer-logo">AnesVault</div>
        <div className="footer-tagline">Built by anesthesia, for anesthesia.</div>
        <div className="footer-links">
          <span className="footer-link" onClick={() => setView("guidelines")}>Guidelines</span>
          <span className="footer-link" onClick={() => setView("privacy")}>Privacy Policy</span>
          <a href="mailto:ADLMedgroup@gmail.com?subject=AnesVault%20Inquiry" className="footer-link" style={{ textDecoration: "none" }}>Contact</a>
          <span className="footer-link" onClick={() => setView("admin")} style={{ opacity: 0.4, fontSize: 11 }}>Admin</span>
        </div>
        <div className="hub-socials" style={{ justifyContent: "center" }}>
          <a href="https://www.instagram.com/anes.vault" target="_blank" rel="noreferrer" className="social-btn"><Icon name="instagram" size={14} /> @Anes.Vault</a>
          <a href="https://www.tiktok.com/@anes.vault" target="_blank" rel="noreferrer" className="social-btn"><Icon name="tiktok" size={14} /> @Anes.Vault</a>
        </div>
        <div className="footer-copy">© 2026 AnesVault Community · Not a substitute for clinical judgment</div>
      </footer>

      {/* ── DOCUMENT PREVIEW MODAL ── */}
      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="modal-box" style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setPreviewDoc(null)}><Icon name="x" size={16} /></button>
            <div className="modal-title">{previewDoc.title}</div>
            <div className="modal-sub">
              <span className="tag tag-cat" style={{ marginRight: 6 }}>{previewDoc.category}</span>
              <span className="tag tag-user">↑ {previewDoc.uploader}</span>
            </div>

            {/* Preview area */}
            <div className="preview-area">
              {previewDoc.file_url && isPDF(previewDoc.file_url) ? (
                <iframe
                  className="preview-iframe"
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewDoc.file_url)}&embedded=true`}
                  title="Document Preview"
                />
              ) : previewDoc.file_url ? (
                <div className="preview-placeholder">
                  <div className="preview-placeholder-icon"><Icon name="file" size={48} /></div>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: S.navy }}>Preview not available</div>
                  <div style={{ fontSize: 13, color: S.slate }}>DOCX and XLSX files can be downloaded below</div>
                </div>
              ) : (
                <div className="preview-placeholder">
                  <div className="preview-placeholder-icon"><Icon name="file" size={48} /></div>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: S.navy }}>No file attached</div>
                  <div style={{ fontSize: 13, color: S.slate }}>This document has no file to preview</div>
                </div>
              )}
            </div>

            {/* Download buttons */}
            {previewDoc.file_url && (
              <div className="dl-options">
                <button className="dl-option-btn dl-option-pdf" onClick={async () => {
                  if (!previewDoc?.file_url) return;
                  try {
                    const response = await fetch(previewDoc.file_url);
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = blobUrl;
                    const ext = previewDoc.file_url.split(".").pop().split("?")[0];
                    a.download = `${previewDoc.title}.${ext}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(blobUrl);
                    setToast("📥 Download saved!");
                  } catch { window.open(previewDoc.file_url, "_blank"); }
                }}>
                  <Icon name="download" size={16} /> Download PDF
                </button>
                <button className="dl-option-btn dl-option-jpg" onClick={handleOpenInBrowser}>
                  <Icon name="eye" size={16} /> Open in Browser
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── JOIN MODAL ── */}
      {showJoin && (
        <div className="join-modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="join-modal-box" onClick={e => e.stopPropagation()}>
            <button style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: S.slate }} onClick={() => setShowJoin(false)}><Icon name="x" size={20} /></button>
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

      {toast && <div className="toast"><Icon name="check" size={16} />{toast}</div>}
    </div>
  );
}
