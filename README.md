# PENJADWALAN AL WAFA — Tampilan Web

Frontend statis (HTML/CSS/JS murni, tanpa build) untuk aplikasi penjadwalan kuliah & ujian
**Sekolah Tinggi Ilmu Syariah Al Wafa**. Backend: Google Apps Script (REST API JSON).

- `index.html` — aplikasi (login, 19 menu, pratinjau & cetak A4)
- `verifikasi.html` — halaman publik pemeriksa keaslian dokumen ber-QR
- `js/config.js` — **satu-satunya** yang diubah: `GAS_URL` = URL `/exec` Web App
- `vercel.json` — header keamanan (CSP, HSTS, anti-iframe) & cache untuk Vercel

Tidak ada token, password, atau ID rahasia di repository ini. Semua rahasia tersimpan di
Script Properties proyek Apps Script.

Menayangkan: Vercel (Framework *Other*, tanpa build command) atau GitHub Pages (branch `main`, folder root).
Panduan lengkap: `PANDUAN-DEPLOY.md` di paket serah terima.
