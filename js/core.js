/* =====================================================================
   PENJADWALAN AL WAFA — core.js
   Utilitas, ikon, penyimpanan lokal (SWR), lapisan API (fetch → GAS),
   sesi, komponen UI (toast, modal, menu konteks, pager), router.
   ===================================================================== */
'use strict';
const VERSI = '1.3.0';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function attr(s) { return esc(s); }
function debounce(fn, ms) { let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; }
function uid(n = 12) { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join(''); }
function num(v, d = 0) { const n = Number(String(v).replace(',', '.')); return isNaN(n) ? d : n; }
function fmtAngka(n) { return Number(n || 0).toLocaleString('id-ID'); }
function pct(a, b) { return b ? Math.round(a / b * 1000) / 10 : 0; }
function by(key, dir = 1) { return (a, b) => { const x = typeof key === 'function' ? key(a) : a[key], y = typeof key === 'function' ? key(b) : b[key]; return (x > y ? 1 : x < y ? -1 : 0) * dir; }; }
function groupBy(arr, fn) { const m = new Map(); arr.forEach(x => { const k = fn(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }); return m; }
function inisial(nama) { return String(nama || '?').replace(/\b(Ust|Usth|Ustadz|Ustadzah|Dr|Prof|H|Hj|KH|Drs|Dra|Ir)\b\.?/gi, '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?'; }
function norm(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, ''); }
function cocok(teks, q) { if (!q) return true; const t = norm(teks); return norm(q).split(/\s+/).filter(Boolean).every(w => t.includes(w)); }
function salin(teks) { try { navigator.clipboard.writeText(teks); toast('Disalin ke papan klip.'); } catch (e) { toast('Tidak dapat menyalin.', 'err'); } }

/* ---------------- Tanggal (zona lokal WIB) ---------------- */
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BLN3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
function tgl(s) { if (!s) return null; if (s instanceof Date) return s; const [d, t] = String(s).split('T'); const p = d.split('-').map(Number); if (p.length < 3 || !p[0]) return null; const q = (t || '').split(':').map(Number); return new Date(p[0], p[1] - 1, p[2], q[0] || 0, q[1] || 0); }
function isoTgl(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function isoJam(d) { d = d || new Date(); return isoTgl(d) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function fmtTgl(s) { const d = tgl(s); return d ? d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear() : ''; }
function fmtHariTgl(s) { const d = tgl(s); return d ? HARI[d.getDay()] + ', ' + fmtTgl(d) : ''; }
function fmtJam(s) { const d = tgl(s); return d ? String(d.getHours()).padStart(2, '0') + '.' + String(d.getMinutes()).padStart(2, '0') : ''; }
function fmtTglJam(s) { const d = tgl(s); return d ? HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BLN3[d.getMonth()] + ' · ' + fmtJam(d) : ''; }
function fmtWaktu(s) { if (!s) return '—'; const d = tgl(s); return d ? d.getDate() + ' ' + BLN3[d.getMonth()] + ' ' + d.getFullYear() + ', ' + fmtJam(d) : s; }
function relatif(s) {
  const d = tgl(s); if (!d) return ''; const m = Math.round((Date.now() - d) / 60000);
  if (Math.abs(m) < 1) return 'baru saja'; if (m > 0) { if (m < 60) return m + ' menit lalu'; if (m < 1440) return Math.round(m / 60) + ' jam lalu'; return Math.round(m / 1440) + ' hari lalu'; }
  const f = -m; if (f < 60) return f + ' menit lagi'; if (f < 1440) return Math.round(f / 60) + ' jam lagi'; return Math.round(f / 1440) + ' hari lagi';
}

/* ---------------- Ikon (SVG garis 24×24) ---------------- */
const IC = {
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>',
  report: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/><path d="M8 18v-3M12 18v-6M16 18v-4"/>',
  grid: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  cap: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  calplus: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M12 14v5M9.5 16.5h5"/>',
  listcheck: '<path d="M11 6h10M11 12h10M11 18h10"/><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>',
  printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  filetext: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  usercheck: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
  idcard: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h2M15 12h2M7 16h4"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  files: '<path d="M15 2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"/><path d="M15 2v5h5"/><path d="M4 7v13a2 2 0 0 0 2 2h10"/>',
  archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
  msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  wa: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5z"/><path d="M9 9.5c.5 2 2 3.5 4 4.5l1.2-1.1 1.8.9-.4 1.6c-3 .3-6.6-3-7-6l1.6-.5.8 1.8z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  alarm: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M5 3 2 6M22 6l-3-3"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  collapse: '<path d="M3 6h13M3 12h9M3 18h13M21 9l-3 3 3 3"/>',
  down: '<path d="m6 9 6 6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>', left: '<path d="m15 18-6-6 6-6"/>', up: '<path d="m18 15-6-6-6 6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>', check: '<path d="M20 6 9 17l-5-5"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M3 21v-5h5"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  edit: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  unlock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
  alertc: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  okc: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  hourglass: '<path d="M5 22h14M5 2h14M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>',
  sheet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  swap: '<path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/>',
  grip: '<circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>',
  merge: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h3v4h-3"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  zin: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>', zout: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M8 11h6"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  tag: '<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><path d="M7 7h.01"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  wallet: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
  chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  dots: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  arrowl: '<path d="M19 12H5M12 19l-7-7 7-7"/>', arrowr: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  history: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  wand: '<path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"/>',
  cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  mosque: '<path d="M12 2c2 2 5 3 5 6v1H7V8c0-3 3-4 5-6z"/><path d="M4 22V12h16v10M2 22h20M10 22v-4a2 2 0 0 1 4 0v4"/>',
  moonstar: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/><path d="M17 3l.6 1.4L19 5l-1.4.6L17 7l-.6-1.4L15 5l1.4-.6z"/>'
};
function ic(nama, cls = '') { return '<svg class="ic ' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[nama] || IC.info) + '</svg>'; }
const LOGO_SVG = '<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#1E3A8A"/><path d="M14 22c6-3 12-3 18 1v24c-6-4-12-4-18-1z" fill="#fff"/><path d="M50 22c-6-3-12-3-18 1v24c6-4 12-4 18-1z" fill="#DCE4F7"/><path d="M32 12l4 6h-8z" fill="#F97316"/><circle cx="32" cy="10" r="2.2" fill="#F97316"/></svg>';

/* ---------------- Pustaka luar (dimuat saat dibutuhkan) ---------------- */
const Lib = {
  _p: {},
  /* cdnjs utama, jsDelivr cadangan bila cdnjs tidak terjangkau */
  URL: {
    html2canvas: ['https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'],
    jspdf: ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'],
    xlsx: ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'],
    qrcode: ['https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js', 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'],
    pdfjs: ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js']
  },
  skrip(url) {
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = url; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = () => res(); s.onerror = () => { s.remove(); rej(new Error(url)); };
      document.head.appendChild(s);
    });
  },
  load(nama, cek) {
    if (cek && cek()) return Promise.resolve();
    if (!this._p[nama]) this._p[nama] = (async () => {
      for (const u of [].concat(this.URL[nama])) { try { await this.skrip(u); if (!cek || cek()) return; } catch (e) { /* coba cadangan */ } }
      delete this._p[nama];
      throw new Error('Gagal memuat pustaka ' + nama + '. Periksa koneksi internet.');
    })();
    return this._p[nama];
  },
  xlsx() { return this.load('xlsx', () => window.XLSX); },
  qr() { return this.load('qrcode', () => window.qrcode); },
  pdf() { return Promise.all([this.load('html2canvas', () => window.html2canvas), this.load('jspdf', () => window.jspdf)]); },
  /** pdf.js (render halaman PDF → kanvas) untuk memotong kop dari Google Docs. Worker dari CDN yang sama. */
  async pdfjs() {
    await this.load('pdfjs', () => window.pdfjsLib);
    const lib = window.pdfjsLib;
    if (!lib.GlobalWorkerOptions.workerSrc) { const sc = [...document.scripts].find(x => /pdf(\.min)?\.js(\?|$)/.test(x.src)); lib.GlobalWorkerOptions.workerSrc = (sc ? sc.src : this.URL.pdfjs[0]).replace(/pdf(\.min)?\.js(\?.*)?$/, 'pdf.worker.min.js'); }
    return lib;
  }
};

/* ---------------- Pengukur performa (console: Perf.table()) ---------------- */
const Perf = {
  log: [],
  add(action, t0, res) { this.log.push({ action, total: Math.round(performance.now() - t0), server: res && res.ms, net: res && res.ms !== undefined ? Math.round(performance.now() - t0 - res.ms) : null, ok: !!(res && res.success), at: new Date().toLocaleTimeString() }); if (this.log.length > 300) this.log.shift(); },
  table() { console.table(this.log.slice(-40)); },
  summary() { const m = {}; this.log.forEach(x => { const a = m[x.action] = m[x.action] || { n: 0, total: 0, server: 0 }; a.n++; a.total += x.total; a.server += x.server || 0; }); Object.keys(m).forEach(k => { m[k].rata = Math.round(m[k].total / m[k].n); m[k].rataServer = Math.round(m[k].server / m[k].n); }); console.table(m); }
};
window.Perf = Perf;

/* ---------------- Penyimpanan lokal aman ---------------- */
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

/* ---------------- Sesi ---------------- */
const Sesi = {
  token: null, me: null,
  payload(t) { try { const b = String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(b + '==='.slice((b.length + 3) % 4))))); } catch (e) { return null; } },
  exp() { const p = this.payload(this.token); return p ? p.x : 0; },
  load() { const s = LS.get('pa:sesi', null); if (s && s.token) { this.token = s.token; this.me = s.me; if (this.exp() > Date.now()) return true; } this.token = null; return false; },
  save() { LS.set('pa:sesi', { token: this.token, me: this.me }); },
  set(token, me) { this.token = token; if (me) this.me = me; this.save(); },
  clear() { this.token = null; this.me = null; LS.del('pa:sesi'); },
  admin() { return !!(this.me && this.me.peran === 'ADMIN_UTAMA'); }
};

/* ---------------- Data lokal (SWR) ---------------- */
/** Objek periode dari server ({berjalan, disusun, persiapan}) — bukan kunci periode berupa teks. */
function adaPeriode(d) { return !!(d && d.periode && typeof d.periode === 'object' && d.periode.berjalan && d.periode.disusun); }
const DB = {
  raw: {}, ver: {}, _obj: {}, _idx: {},
  set(n, t, v) { this.raw[n] = t; if (v !== undefined) this.ver[n] = v; delete this._obj[n]; Object.keys(this._idx).forEach(k => { if (k.indexOf(n + '|') === 0) delete this._idx[k]; }); },
  rows(n) {
    if (!this._obj[n]) { const t = this.raw[n]; this._obj[n] = t && t.r ? t.r.map(r => { const o = {}; for (let i = 0; i < t.h.length; i++) o[t.h[i]] = r[i] === undefined || r[i] === null ? '' : r[i]; return o; }) : []; }
    return this._obj[n];
  },
  idx(n, key) { const k = n + '|' + key; if (!this._idx[k]) { const m = new Map(); this.rows(n).forEach(o => m.set(String(o[key]), o)); this._idx[k] = m; } return this._idx[k]; },
  get(n, key, id) { return this.idx(n, key).get(String(id)); },
  meta(n) { return (this.raw[n] && this.raw[n].meta) || {}; },
  ada(n) { return !!this.raw[n]; },
  apply(d) {
    const ch = [];
    if (!d) return ch;
    if (d.tables) Object.keys(d.tables).forEach(n => { this.set(n, d.tables[n], d.ver ? d.ver[n] : undefined); ch.push(n); });
    if (d.ver) Object.keys(d.ver).forEach(n => { if (!d.tables || !d.tables[n]) this.ver[n] = d.ver[n]; });
    if (adaPeriode(d)) { const lama = JSON.stringify(App.periode); App.periode = d.periode; if (lama !== JSON.stringify(d.periode)) ch.push('_periode'); }
    if (ch.length) { this.simpanLokal(); App.onData(ch); }
    return ch;
  },
  kunci() { return 'pa:data:' + (Sesi.me ? Sesi.me.username : '-'); },
  simpanLokal: debounce(function () {
    const isi = { v: VERSI, raw: DB.raw, ver: DB.ver, periode: App.periode, at: Date.now() };
    if (!LS.set(DB.kunci(), isi)) {                          /* kuota penuh → tanpa tabel besar */
      const r2 = Object.assign({}, DB.raw), v2 = Object.assign({}, DB.ver);
      ['Mahasiswa', 'Kurikulum'].forEach(n => { delete r2[n]; delete v2[n]; });
      if (!LS.set(DB.kunci(), { v: VERSI, raw: r2, ver: v2, periode: App.periode, at: Date.now() })) {   /* masih penuh (gambar kop/logo besar) → tanpa Aset */
        delete r2.Aset; delete v2.Aset; LS.set(DB.kunci(), { v: VERSI, raw: r2, ver: v2, periode: App.periode, at: Date.now() });
      }
    }
  }, 600),
  muatLokal() {
    const s = LS.get(this.kunci(), null);
    if (!s || s.v !== VERSI || !s.raw) return false;
    this.raw = s.raw; this.ver = s.ver || {}; this._obj = {}; this._idx = {}; App.periode = s.periode || App.periode; if (typeof Dom !== 'undefined') Dom.reset();
    return true;
  },
  bersih() { this.raw = {}; this.ver = {}; this._obj = {}; this._idx = {}; }
};

/* ---------------- API (fetch → GAS, POST text/plain) ---------------- */
const Net = {
  inflight: {}, epoch: 0, online: true,
  BACA: /^(boot|refresh|data\.periode|dokumen\.daftar|de\.daftar|de\.status|wa\.blastStatus|wa\.riwayat|crm\.daftar|sistem\.status|log\.daftar|wa\.siapkan|realisasi\.salinLalu|jadwal\.generate|ujian\.generate|rekap\.tes|wa\.device|wa\.grup|berkas\.unduh|ping|mahasiswa\.refresh|migrasi\.pindai|kop\.dariDoc|pddikti\.excel)$/,
  url() { return (window.APP_CONFIG && window.APP_CONFIG.GAS_URL) || ''; },
  siap() { const u = this.url(); return /^https:\/\//.test(u) && !/GANTI|XXXX/.test(u); }
};
async function api(action, data, opt) {
  data = data || {}; opt = opt || {};
  if (!Net.siap()) { const r = { success: false, message: 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js dengan URL /exec Web App.', code: 'CONFIG' }; if (!opt.silent) toast(r.message, 'err'); return r; }
  const baca = Net.BACA.test(action);
  let key = '';
  if (baca) { key = Net.epoch + '|' + action + '|' + JSON.stringify(data); if (Net.inflight[key]) return Net.inflight[key]; }
  else Net.epoch++;
  const run = (async () => {
    const rid = baca ? undefined : (opt.rid || uid(16));
    const body = JSON.stringify({ action, token: Sesi.token, data, rid });
    const t0 = performance.now();
    let res = null;
    for (let i = 0; i < 2 && !res; i++) {
      try {
        const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), opt.timeout || 330000);
        const r = await fetch(Net.url(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, redirect: 'follow', signal: ctl.signal });
        clearTimeout(to);
        const txt = await r.text();
        try { res = JSON.parse(txt); } catch (e) { res = { success: false, message: /<html/i.test(txt) ? 'Server mengembalikan halaman HTML. Pastikan Web App di-deploy dengan akses "Anyone" (Siapa saja).' : 'Respons server tidak valid.', code: 'BAD' }; }
        Net.online = true;
      } catch (e) {
        if (i === 0) { await sleep(900); continue; }
        Net.online = false;
        res = { success: false, message: e.name === 'AbortError' ? 'Permintaan terlalu lama. Coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.', code: 'NET' };
      }
    }
    Perf.add(action, t0, res);
    if (res.tk) Sesi.set(res.tk);
    if (!res.success && res.code === 'AUTH') { App.sesiHabis(res.message); return res; }
    if (res.success && res.data && !opt.noApply && (res.data.tables || adaPeriode(res.data))) DB.apply(res.data);
    if (!res.success && !opt.silent) toast(res.message, res.code === 'NET' ? 'warn' : 'err');
    return res;
  })();
  if (baca) { Net.inflight[key] = run; run.finally(() => { delete Net.inflight[key]; }); }
  return run;
}
/** Penggabung otomatis: beberapa aksi baca pada tik yang sama → satu eksekusi 'batch'. */
const Batcher = {
  q: null,
  add(action, data) {
    return new Promise(res => {
      if (!this.q) { this.q = []; setTimeout(() => this.flush(), 0); }
      this.q.push({ action, data: data || {}, res });
    });
  },
  async flush() {
    const q = this.q; this.q = null;
    if (q.length === 1) { q[0].res(await api(q[0].action, q[0].data)); return; }
    for (let i = 0; i < q.length; i += 10) {
      const part = q.slice(i, i + 10);
      const r = await api('batch', { calls: part.map(x => ({ action: x.action, data: x.data })) }, { silent: true });
      part.forEach((x, j) => {
        const h = r.success ? r.data[j] : r;
        if (h && h.success && h.data && (h.data.tables || adaPeriode(h.data))) DB.apply(h.data);
        x.res(h);
      });
    }
  }
};
function apiQ(action, data) { return Batcher.add(action, data); }
function warmUpServer(scope) {
  try {
    const k = 'pa:warm:' + scope, last = Number(sessionStorage.getItem(k) || 0);
    if (Date.now() - last < 240000 || !Net.siap()) return;
    sessionStorage.setItem(k, String(Date.now()));
    fetch(Net.url() + '?w=' + scope, { mode: 'no-cors' }).catch(() => {});
  } catch (e) {}
}

/* ---------------- UI: toast, modal, konfirmasi, menu konteks ---------------- */
function toast(msg, type = 'ok', ms) {
  if (!msg) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = ic({ ok: 'okc', err: 'alertc', warn: 'alert', info: 'info' }[type] || 'info') + '<div>' + esc(msg) + '</div><button class="x" aria-label="Tutup">' + ic('x', 'ic-sm') + '</button>';
  el.querySelector('.x').onclick = () => el.remove();
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), ms || (type === 'err' ? 7000 : 3800));
}
const Modal = {
  tumpuk: [],
  buka(o) {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = '<div class="modal ' + (o.size || '') + '" role="dialog" aria-modal="true">' +
      (o.title ? '<div class="modal-h' + (o.navy ? ' navy' : '') + '">' + (o.icon ? '<div class="ik">' + ic(o.icon) + '</div>' : '') +
        '<div style="min-width:0"><h3>' + o.title + '</h3>' + (o.sub ? '<div class="sub">' + o.sub + '</div>' : '') + '</div>' +
        '<button class="icon-btn x" data-close aria-label="Tutup">' + ic('x') + '</button></div>' : '') +
      '<div class="modal-b">' + (o.body || '') + '</div>' + (o.foot ? '<div class="modal-f">' + o.foot + '</div>' : '') + '</div>';
    const m = { el: back, box: back.firstChild, close: (v) => { if (!back.isConnected) return; back.remove(); Modal.tumpuk = Modal.tumpuk.filter(x => x !== m); if (o.onClose) o.onClose(v); } };
    back.addEventListener('mousedown', e => { if (e.target === back && o.dismiss !== false) m.close(); });
    back.addEventListener('click', e => {
      const c = e.target.closest('[data-close]'); if (c) { m.close(); return; }
      const a = e.target.closest('[data-a]'); if (a && o.acts && o.acts[a.dataset.a]) o.acts[a.dataset.a](a, e, m);
    });
    if (o.onChange) back.addEventListener('change', e => o.onChange(e, m));
    if (o.onInput) back.addEventListener('input', e => o.onInput(e, m));
    $('#modals').appendChild(back);
    Modal.tumpuk.push(m);
    if (o.onOpen) o.onOpen(m.box, m);
    const f = back.querySelector('[autofocus]') || back.querySelector('input:not([type=checkbox]):not([type=hidden]), select, textarea');
    if (f && o.fokus !== false) setTimeout(() => f.focus(), 30);
    return m;
  },
  tutupAtas() { const m = this.tumpuk[this.tumpuk.length - 1]; if (m) m.close(); return !!m; }
};
function konfirmasi(pesan, o) {
  o = o || {};
  return new Promise(res => {
    let jawab = false;
    const m = Modal.buka({ title: o.title || 'Konfirmasi', icon: o.icon || (o.danger ? 'alert' : 'info'), size: 'sm', body: '<div style="white-space:pre-line">' + pesan + '</div>',
      foot: (o.extra || '') + '<button class="btn" data-close>' + (o.batal || 'Batal') + '</button><button class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '" data-a="ok" autofocus>' + (o.ok || 'Ya, lanjutkan') + '</button>',
      acts: { ok: (b, e, mm) => { jawab = true; mm.close(); }, alt: (b, e, mm) => { jawab = 'alt'; mm.close(); } }, onClose: () => res(jawab) });
    return m;
  });
}
function pilihanTiga(pesan, o) {
  return new Promise(res => {
    let jawab = 'batal';
    Modal.buka({ title: o.title, icon: 'alert', size: 'sm', body: '<div style="white-space:pre-line">' + pesan + '</div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-danger" data-a="buang">' + (o.buang || 'Buang perubahan') + '</button><button class="btn btn-primary" data-a="simpan">' + (o.simpan || 'Simpan dulu') + '</button>',
      acts: { buang: (b, e, m) => { jawab = 'buang'; m.close(); }, simpan: (b, e, m) => { jawab = 'simpan'; m.close(); } }, onClose: () => res(jawab) });
  });
}
const Ctx = {
  el: null,
  buka(x, y, items) {
    const el = $('#ctxmenu');
    el.innerHTML = items.map((it, i) => it.sep ? '<hr>' : it.head ? '<div class="mh">' + esc(it.head) + '</div>' :
      '<button data-i="' + i + '" class="' + (it.on ? 'on' : '') + '"' + (it.dis ? ' disabled style="opacity:.45"' : '') + '>' + (it.icon ? ic(it.icon, 'ic-sm') : '<span style="width:15px"></span>') + '<span>' + esc(it.label) + '</span>' + (it.note ? '<small>' + esc(it.note) + '</small>' : '') + '</button>').join('');
    el.classList.remove('hidden');
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = Math.max(8, Math.min(x, innerWidth - w - 8)) + 'px';
    el.style.top = Math.max(8, Math.min(y, innerHeight - h - 8)) + 'px';
    el.onclick = (e) => { const b = e.target.closest('button[data-i]'); if (!b) return; const it = items[+b.dataset.i]; this.tutup(); if (it && it.fn && !it.dis) it.fn(); };
    this.el = el;
  },
  tutup() { $('#ctxmenu').classList.add('hidden'); }
};
document.addEventListener('mousedown', e => { if (!e.target.closest('#ctxmenu')) Ctx.tutup(); });
document.addEventListener('scroll', () => Ctx.tutup(), true);

/* Tombol sibuk */
function sibuk(btn, on, teks) {
  if (!btn) return;
  if (on) { btn.dataset.html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin spin-sm"></span>' + (teks ? ' ' + esc(teks) : ''); }
  else { btn.disabled = false; if (btn.dataset.html) btn.innerHTML = btn.dataset.html; }
}
async function denganSibuk(btn, teks, fn) { sibuk(btn, true, teks); try { return await fn(); } finally { sibuk(btn, false); } }

/* Pager */
function pagerHtml(total, hal, per, label) {
  const n = Math.max(1, Math.ceil(total / per)); hal = Math.min(Math.max(1, hal), n);
  const a = total ? (hal - 1) * per + 1 : 0, b = Math.min(total, hal * per);
  let btn = '', set = new Set([1, n, hal, hal - 1, hal + 1, hal - 2, hal + 2].filter(x => x >= 1 && x <= n)), arr = [...set].sort((x, y) => x - y), prev = 0;
  arr.forEach(p => { if (p - prev > 1) btn += '<button disabled>…</button>'; btn += '<button data-a="pg" data-p="' + p + '" class="' + (p === hal ? 'on' : '') + '">' + p + '</button>'; prev = p; });
  return '<div class="pager"><span>Menampilkan <b>' + a + '–' + b + '</b> dari <b>' + fmtAngka(total) + '</b> ' + (label || 'data') + '</span><div class="pg"><button data-a="pg" data-p="' + (hal - 1) + '" ' + (hal <= 1 ? 'disabled' : '') + ' aria-label="Sebelumnya">‹</button>' + btn + '<button data-a="pg" data-p="' + (hal + 1) + '" ' + (hal >= n ? 'disabled' : '') + ' aria-label="Berikutnya">›</button></div></div>';
}
function opsi(list, nilai, fmt) { return list.map(x => { const v = typeof x === 'object' ? x.v : x, l = typeof x === 'object' ? x.l : (fmt ? fmt(x) : x); return '<option value="' + attr(v) + '"' + (String(v) === String(nilai) ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join(''); }
function kosong(teks, ikon) { return '<div class="empty">' + ic(ikon || 'info') + '<div>' + teks + '</div></div>'; }
function unduhBlob(blob, nama) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
function b64keBlob(b64, mime) { const bin = atob(b64), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], { type: mime || 'application/octet-stream' }); }
function blobKeDataUrl(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); }); }
function bacaBerkas(file, mode) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Berkas tidak bisa dibaca.')); mode === 'buffer' ? r.readAsArrayBuffer(file) : r.readAsDataURL(file); }); }
function pilihBerkas(accept) { return new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept || ''; i.onchange = () => res(i.files[0] || null); i.click(); }); }
async function unduhBerkasServer(fileId, btn) {
  const r = await denganSibuk(btn, '', () => api('berkas.unduh', { fileId }));
  if (r.success) unduhBlob(b64keBlob(r.data.berkas64, r.data.mime), r.data.nama);
}
/** Kecilkan gambar sebelum diunggah (logo/ttd/stempel). */
async function kecilkanGambar(file, maks) {
  const url = await bacaBerkas(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const s = Math.min(1, (maks || 600) / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

/* ---------------- Excel (SheetJS) ---------------- */
const Excel = {
  async baca(file) {
    await Lib.xlsx();
    const buf = await bacaBerkas(file, 'buffer');
    const wb = XLSX.read(buf, { type: 'array', cellDates: false, raw: false });
    const sh = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sh, { header: 1, defval: '', raw: false, blankrows: false });
  },
  async tulis(nama, sheets) {
    await Lib.xlsx();
    const wb = XLSX.utils.book_new();
    sheets.forEach(s => {
      const ws = XLSX.utils.aoa_to_sheet(s.rows);
      if (s.lebar) ws['!cols'] = s.lebar.map(w => ({ wch: w }));
      if (s.merge) ws['!merges'] = s.merge;
      XLSX.utils.book_append_sheet(wb, ws, String(s.nama).slice(0, 31).replace(/[\\/?*[\]:]/g, '-'));
    });
    XLSX.writeFile(wb, nama.endsWith('.xlsx') ? nama : nama + '.xlsx');
  },
  /** Petakan baris Excel → objek berdasar sinonim judul kolom. */
  peta(rows, sinonim) {
    if (!rows.length) return [];
    let hi = 0;
    for (let i = 0; i < Math.min(5, rows.length); i++) { const h = rows[i].map(x => norm(x).replace(/[^a-z0-9]+/g, ' ').trim()); if (Object.values(sinonim).some(list => list.some(s => h.includes(s)))) { hi = i; break; } }
    const h = rows[hi].map(x => norm(x).replace(/[^a-z0-9]+/g, ' ').trim()), idx = {};
    Object.keys(sinonim).forEach(k => { for (const s of sinonim[k]) { const j = h.indexOf(s); if (j >= 0) { idx[k] = j; break; } } });
    return rows.slice(hi + 1).map((r, i) => { const o = { _baris: hi + i + 2 }; Object.keys(idx).forEach(k => { o[k] = String(r[idx[k]] === undefined ? '' : r[idx[k]]).trim(); }); return o; }).filter(o => Object.keys(o).some(k => k !== '_baris' && o[k]));
  }
};
