/* =====================================================================
   PENJADWALAN AL WAFA — pages-lain.js
   Arsip (semester, angkatan, dokumen tercetak), Blast WA (Fonnte + CRM),
   Pengaturan (periode, prodi & kelas, jam sesi, surat tugas & aset,
   WhatsApp, sumber data, akun, impor & migrasi, sistem).
   Rahasia (token Fonnte, ID spreadsheet Rekap, kunci VP) hanya dikirim
   ke server lewat 'rahasia.simpan' dan tidak pernah dibaca balik —
   browser hanya menerima versi tersamar (meta.samar).
   ===================================================================== */
'use strict';
const JENIS_DOK = { SURAT_TUGAS: 'Surat Tugas', JADWAL_KELAS: 'Jadwal Kelas', JADWAL_DOSEN: 'Jadwal Dosen', JADWAL_SELURUH: 'Seluruh Jadwal', UJIAN: 'Jadwal Ujian', UTS: 'Jadwal UTS', UAS: 'Jadwal UAS', ABSENSI: 'Absensi Mahasiswa', DAFTAR_HADIR: 'Daftar Hadir', PENERIMA_KITAB: 'Penerima Kitab', KALENDER: 'Kalender Akademik', HADIR_DOSEN: 'Kehadiran Dosen', PDDIKTI: 'PDDIKTI', NILAI_TAHFIDZ: 'Nilai Tahfidz', TEMPLATE: 'Dokumen Template', DOKUMEN: 'Dokumen' };
function ukuranTeks(b) { b = num(b); if (!b) return '—'; return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
function badgeStatusWA(s) {
  const m = { Antri: ['info', 'Antri'], Terkirim: ['ok', 'Terkirim'], Gagal: ['err', 'Gagal'], Batal: ['', 'Batal'], Berjalan: ['info', 'Berjalan'], Selesai: ['ok', 'Selesai'], Dihentikan: ['warn', 'Dihentikan'] }[s] || ['', s || '—'];
  return '<span class="badge ' + m[0] + '">' + esc(m[1]) + '</span>';
}
function waFormat(teks) {
  return esc(teks).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/(^|\s)_([^_\n]+)_/g, '$1<i>$2</i>').replace(/~([^~\n]+)~/g, '<s>$1</s>');
}
function isiVar(tpl, v) { return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => v[k] === undefined || v[k] === null ? m : String(v[k])); }
function sisipDiKursor(ta, teks) {
  if (!ta) return;
  const a = ta.selectionStart || 0, b = ta.selectionEnd || 0;
  ta.value = ta.value.slice(0, a) + teks + ta.value.slice(b);
  ta.focus(); ta.setSelectionRange(a + teks.length, a + teks.length);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}
/** Daftar periode yang dikenal (berjalan, disusun, tanggal periode, arsip). */
function daftarPeriode() {
  const s = new Set([App.periode.berjalan.key, App.periode.disusun.key]);
  Object.keys(Dom.setJson('PERIODE_TANGGAL', {})).forEach(k => s.add(k));
  DB.rows('Arsip').forEach(a => { if (a.Jenis === 'SEMESTER') s.add(a.Label); });
  return [...s].filter(k => /^\d{4}\/\d{4} (Ganjil|Genap)$/.test(k)).sort((a, b) => b.localeCompare(a));
}
/** Buat PDF di latar (tanpa membuka pratinjau) — tampilan identik dengan pratinjau cetak. */
async function pdfLatar(docs, o) {
  if (Cetak.st) throw new Error('Tutup pratinjau cetak terlebih dahulu.');
  const stage = $('#print-stage'), hasil = [];
  try {
    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      if (o.progres) o.progres(i, docs.length, d);
      stage.innerHTML = d.halaman.join('');
      await Cetak.isiQr(stage); await Cetak.tungguGambar(stage);
      const pages = $$('.a4', stage); pages.forEach(pg => Cetak.fit(pg));
      const blob = await Cetak.pdfDari(pages);
      const r = await api('pdf.simpan', { periode: o.periode, sub: o.folder, nama: d.nama, berkas64: await blobKeDataUrl(blob), dok: d.dok, stId: d.stId }, { silent: true });
      hasil.push({ d, r });
      if (!r.success) toast(d.judul + ': ' + r.message, 'err');
    }
  } finally { stage.innerHTML = ''; }
  return hasil;
}
function modalProgres(judul) {
  const m = Modal.buka({ title: judul, icon: 'hourglass', size: 'sm', dismiss: false, fokus: false, body: '<div class="stack"><div class="progress-lg"><i id="mp-bar" style="width:0%"></i></div><div id="mp-teks" class="muted">Menyiapkan…</div></div>' });
  const x = m.box.querySelector('.modal-h [data-close]'); if (x) x.remove();
  return { set(i, n, teks) { const b = $('#mp-bar', m.box), t = $('#mp-teks', m.box); if (b) b.style.width = Math.round(i / Math.max(1, n) * 100) + '%'; if (t) t.textContent = teks; }, close() { m.close(); } };
}
function sandiSekali(judul, username, sandi) {
  Modal.buka({ title: judul, icon: 'key', size: 'sm', dismiss: false,
    body: '<div class="alert warn">' + ic('alert') + '<div>Password ini <b>hanya ditampilkan sekali</b> dan tidak tersimpan di mana pun selain hash di server. Salin lalu berikan langsung kepada pengguna. Pengguna wajib menggantinya saat pertama masuk.</div></div>' +
      '<div class="field" style="margin-top:12px"><label>Username</label><div class="input mono" style="background:var(--surface-2)">' + esc(username) + '</div></div>' +
      '<div class="field" style="margin-top:10px"><label>Password sementara</label><div class="row" style="flex-wrap:nowrap"><div class="input mono" style="background:var(--surface-2);font-size:17px;letter-spacing:.04em" id="ss-pw">' + esc(sandi) + '</div><button class="btn btn-icon" data-a="salin" title="Salin">' + ic('copy') + '</button></div></div>',
    foot: '<button class="btn btn-primary" data-close>Sudah saya salin</button>',
    acts: { salin: () => salin(sandi) } });
}

/* =====================================================================
   ARSIP — semester lampau, angkatan purna, dokumen tercetak
   ===================================================================== */
defPage('arsip', {
  deps: ['Arsip', 'Angkatan', 'Pengaturan'], refreshTabel: ['Arsip', 'Angkatan'],
  st: { tab: 'semester', q: '', ta: '', dokPer: null, jenis: '', dq: '', dok: null, dokKey: '', hal: 1 },
  onParams(p, args) { this.st.tab = ['semester', 'angkatan', 'dokumen'].includes(p[0]) ? p[0] : 'semester'; if (args && args.periode) { this.st.dokPer = args.periode; this.st.dok = null; } },
  judulMenu() { return 'Arsip ' + { semester: 'Semester', angkatan: 'Angkatan', dokumen: 'Dokumen Tercetak' }[this.st.tab]; },
  semester() { return DB.rows('Arsip').filter(a => a.Jenis === 'SEMESTER').slice().sort((a, b) => String(b.Label).localeCompare(String(a.Label))); },
  render() {
    const s = this.st, sem = this.semester(), angk = Dom.angkatanSemua().filter(a => a.Status === 'Diarsipkan');
    const tots = sem.reduce((a, x) => a + num(x.Ukuran), 0);
    const tab = [['semester', 'Arsip Semester Lampau', sem.length, 'archive'], ['angkatan', 'Arsip Angkatan (Purna)', angk.length, 'cap'], ['dokumen', 'Dokumen Tercetak', s.dok ? s.dok.r.length : '', 'qr']];
    let h = kepala({ crumb: ['Lainnya', 'Arsip'], judul: 'Pusat Arsip Akademik', badge: ' <span class="badge orange">' + ic('shield', 'ic-sm') + 'Terverifikasi SHA-256</span>',
      desc: 'Penyimpanan otomatis berkas semester lampau, kurikulum angkatan yang telah purna studi, dan registri seluruh dokumen resmi yang dicetak (ber-QR verifikasi).',
      aksi: btnRefresh(false) + '<button class="btn btn-primary" data-a="arsipkan">' + ic('archive') + 'Arsipkan Semester…</button>' }) +
      '<div class="kpis">' + kpi({ lb: 'Arsip Semester', vl: sem.length + '<small>semester</small>', ic: 'archive', ft: sem.length ? esc(Dom.perLabel(sem[sem.length - 1].Label)) + ' s.d. ' + esc(Dom.perLabel(sem[0].Label)) : 'Belum ada arsip', act: 'tabk', v: 'semester' }) +
      kpi({ lb: 'Angkatan Purna Studi', vl: angk.length + '<small>angkatan</small>', ic: 'cap', cls: 'orange', ft: angk.length ? 'Angkatan ' + angk.map(a => a.Tahun).join(', ') : 'Belum ada angkatan diarsipkan', act: 'tabk', v: 'angkatan' }) +
      kpi({ lb: 'Ukuran Arsip Semester', vl: '<span style="font-size:24px">' + ukuranTeks(tots) + '</span>', ic: 'cloud', ft: 'Folder Drive: PENJADWALAN AL WAFA / Arsip' }) +
      kpi({ lb: 'Arsip Otomatis', vl: '<span style="font-size:20px">' + ic('okc') + ' Aktif</span>', ic: 'clock', cls: 'ok', ft: 'Pemicu harian: Ganjil → November · Genap → Juli' }) + '</div>' +
      '<div class="tabs">' + tab.map(x => '<button class="' + (s.tab === x[0] ? 'on' : '') + '" data-a="nav" data-to="arsip/' + x[0] + '">' + ic(x[3], 'ic-sm') + x[1] + (x[2] !== '' ? ' <span class="badge ' + (s.tab === x[0] ? 'navy' : '') + '">' + x[2] + '</span>' : '') + '</button>').join('') + '</div>';
    if (s.tab === 'semester') h += this.vSemester(sem);
    else if (s.tab === 'angkatan') h += this.vAngkatan(angk);
    else h += this.vDokumen();
    this.el.innerHTML = h;
  },
  vSemester(sem) {
    const s = this.st, ta = [...new Set(sem.map(a => Dom.perObj(a.Label).ta))];
    const list = sem.filter(a => (!s.ta || Dom.perObj(a.Label).ta === s.ta) && cocok(a.Label + ' ' + a.Keterangan + ' ' + a.Oleh + ' ' + a.Hash, s.q));
    return '<div class="card card-b" style="margin-bottom:14px"><div class="row"><div class="field" style="width:200px"><label>Tahun akademik</label><select class="input" data-ch="ta"><option value="">Semua tahun</option>' + opsi(ta, s.ta) + '</select></div>' +
      '<div class="field" style="flex:1 1 260px"><label>Cari</label><div class="input-ic">' + ic('search') + '<input class="input" data-in="q" placeholder="Cari semester, keterangan, hash…" value="' + attr(s.q) + '"></div></div></div></div>' +
      (list.map(a => { const p = Dom.perObj(a.Label);
        return '<div class="card" style="margin-bottom:12px"><div class="card-b"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div class="avatar dark" style="width:44px;height:44px;border-radius:12px;flex:none">' + ic('folder') + '</div>' +
          '<div style="flex:1;min-width:0"><div class="row gap-s"><b style="font-size:16px">T.A. ' + esc(p.ta) + ' — ' + esc(p.smt) + '</b><span class="badge info">' + ic('lock', 'ic-sm') + 'Terkunci</span>' + (/Sistem/.test(a.Oleh) ? '<span class="badge ok">Diarsipkan otomatis</span>' : '') + '</div>' +
          '<div class="muted" style="font-size:13px;margin-top:3px">Diarsipkan ' + esc(fmtWaktu(a.Tanggal)) + ' oleh ' + esc(a.Oleh) + ' · ' + esc(a.Keterangan || '') + ' · ' + ukuranTeks(a.Ukuran) + '</div>' +
          '<div class="faint mono" style="font-size:11.5px;margin-top:2px">ID ' + esc(a.ID) + ' · Hash ' + esc(String(a.Hash || '').slice(0, 8)) + '…' + esc(String(a.Hash || '').slice(-4)) + '</div></div>' +
          '<div class="row gap-s" style="flex:none"><button class="btn btn-sm" data-a="rincian" data-v="' + attr(a.ID) + '">' + ic('eye', 'ic-sm') + 'Rincian</button><button class="btn btn-sm btn-primary" data-a="unduh" data-v="' + attr(a.FileID) + '" ' + (a.FileID ? '' : 'disabled') + '>' + ic('download', 'ic-sm') + 'Unduh PDF</button></div></div></div></div>'; }).join('') ||
        '<div class="card">' + kosong(sem.length ? 'Tidak ada arsip pada filter ini.' : 'Belum ada arsip semester. Arsip dibuat otomatis oleh pemicu harian, atau tekan <b>Arsipkan Semester…</b>.', 'archive') + '</div>');
  },
  vAngkatan(angk) {
    return '<div class="alert info">' + ic('info') + '<div>Angkatan diarsipkan dari menu <b>Kurikulum → Langkah 1</b> setelah semua mata kuliahnya permanen dan semester terakhirnya berakhir. Mahasiswa angkatan yang diarsipkan disembunyikan dari aplikasi; spreadsheet Rekap Mahasiswa tidak berubah.</div><button class="btn btn-sm" data-a="nav" data-to="kurikulum">' + ic('book', 'ic-sm') + 'Buka Kurikulum</button></div>' +
      '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Angkatan</th><th>Diarsipkan</th><th>Oleh</th><th>Kurikulum</th><th>PDF Kurikulum Permanen</th><th class="right">Aksi</th></tr></thead><tbody>' +
      (angk.map(a => { const mk = DB.rows('Kurikulum').filter(k => String(k.Angkatan) === String(a.Tahun) && k.Dicentang === 'YA');
        return '<tr><td><b style="font-size:16px">' + esc(a.Tahun) + '</b><div class="t-sub">Angkatan purna studi</div></td><td>' + esc(fmtWaktu(a.TanggalArsip)) + '</td><td>' + esc(a.DiarsipkanOleh || '—') + '</td><td>' + mk.length + ' MK · ' + mk.reduce((x, k) => x + num(k.SKS), 0) + ' SKS</td>' +
          '<td>' + (a.FileID ? '<button class="btn btn-sm btn-soft" data-a="unduh" data-v="' + attr(a.FileID) + '">' + ic('download', 'ic-sm') + 'Unduh PDF</button>' : '<span class="faint">—</span>') + '</td>' +
          '<td class="right"><button class="btn btn-sm" data-a="kembalikan" data-v="' + attr(a.Tahun) + '">' + ic('refresh', 'ic-sm') + 'Aktifkan Kembali</button></td></tr>'; }).join('') ||
        '<tr><td colspan="6">' + kosong('Belum ada angkatan yang diarsipkan.', 'cap') + '</td></tr>') + '</tbody></table></div></div>';
  },
  vDokumen() {
    const s = this.st, per = s.dokPer === undefined || s.dokPer === null ? App.perAktif() : s.dokPer;
    const key = per + '|' + s.jenis;
    if (s.dokKey !== key) { s.dokKey = key; s.dok = null; this.muatDok(per, s.jenis, key); }
    const t = s.dok, rows = t ? t.r.map(r => { const o = {}; t.h.forEach((k, i) => { o[k] = r[i]; }); return o; }) : [];
    const list = rows.filter(o => cocok(o.Kode + ' ' + o.Judul + ' ' + o.Nomor + ' ' + o.Oleh, s.dq)), PER = 20, hal = Math.min(s.hal, Math.max(1, Math.ceil(list.length / PER)));
    const jenisAda = [...new Set(Object.keys(JENIS_DOK))];
    return '<div class="card"><div class="card-h"><div class="field" style="width:210px"><label>Periode</label><select class="input" data-ch="dokPer"><option value="__semua"' + (per === '' ? ' selected' : '') + '>Semua periode</option>' + opsi(daftarPeriode().map(k => ({ v: k, l: Dom.perLabel(k) })), per) + '</select></div>' +
      '<div class="field" style="width:200px"><label>Jenis dokumen</label><select class="input" data-ch="jenis"><option value="">Semua jenis</option>' + opsi(jenisAda.map(k => ({ v: k, l: JENIS_DOK[k] })), s.jenis) + '</select></div>' +
      '<div class="field" style="flex:1 1 240px"><label>Cari</label><div class="input-ic">' + ic('search') + '<input class="input" data-in="dq" placeholder="Kode verifikasi, judul, nomor surat…" value="' + attr(s.dq) + '"></div></div>' +
      '<a class="btn" href="verifikasi.html" target="_blank" rel="noopener" style="align-self:flex-end">' + ic('qr') + 'Halaman Verifikasi</a></div>' +
      (!t ? '<div class="empty"><div class="spin"></div><div>Memuat registri dokumen…</div></div>' :
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kode Verifikasi</th><th>Jenis</th><th>Judul · Nomor</th><th>Periode</th><th>Dicetak</th><th>Status</th><th class="right">Aksi</th></tr></thead><tbody>' +
        (list.slice((hal - 1) * PER, hal * PER).map(o => '<tr class="' + (o.Status === 'DITARIK' ? 'dim' : '') + '"><td><span class="mono" style="font-size:12.5px">' + esc(o.Kode) + '</span> <button class="link-btn" data-a="salinKode" data-v="' + attr(o.Kode) + '" title="Salin tautan verifikasi">' + ic('copy', 'ic-sm') + '</button></td>' +
          '<td><span class="badge info">' + esc(JENIS_DOK[o.Jenis] || o.Jenis) + '</span></td><td><b>' + esc(o.Judul) + '</b>' + (o.Nomor ? '<div class="t-sub mono">' + esc(o.Nomor) + '</div>' : '') + '</td><td class="nowrap">' + esc(Dom.perLabel(o.Periode)) + '</td>' +
          '<td class="nowrap">' + esc(fmtWaktu(o.Dibuat)) + '<div class="t-sub">' + esc(o.Oleh) + '</div></td><td>' + (o.Status === 'DITARIK' ? '<span class="badge err">Ditarik</span>' : '<span class="badge ok">' + ic('okc', 'ic-sm') + 'Sah</span>') + '</td>' +
          '<td class="right nowrap">' + (o.FileID ? '<button class="btn btn-sm btn-icon" data-a="unduh" data-v="' + attr(o.FileID) + '" title="Unduh PDF">' + ic('download', 'ic-sm') + '</button> ' : '') + '<a class="btn btn-sm btn-icon" href="' + attr(Dom.urlVerif(o.Kode)) + '" target="_blank" rel="noopener" title="Buka halaman verifikasi">' + ic('ext', 'ic-sm') + '</a>' +
          (Sesi.admin() && o.Status !== 'DITARIK' ? ' <button class="btn btn-sm btn-icon" data-a="tarik" data-v="' + attr(o.Kode) + '" title="Tarik dokumen (tidak berlaku)">' + ic('x', 'ic-sm') + '</button>' : '') + '</td></tr>').join('') ||
          '<tr><td colspan="7">' + kosong('Belum ada dokumen tercetak pada filter ini.', 'qr') + '</td></tr>') + '</tbody></table></div>' + (list.length > PER ? pagerHtml(list.length, hal, PER, 'dokumen') : '')) + '</div>';
  },
  async muatDok(per, jenis, key) {
    const r = await api('dokumen.daftar', { periode: per, jenis }, { silent: true });
    if (this.st.dokKey !== key) return;
    this.st.dok = r.success ? r.data : { h: [], r: [] };
    if (!r.success) toast(r.message, 'err');
    if (App.cur === this && this.st.tab === 'dokumen') this.render();
  },
  acts: {
    tabk(b) { App.nav('arsip/' + b.dataset.v); },
    unduh(b) { unduhBerkasServer(b.dataset.v, b); },
    pg(b) { this.st.hal = +b.dataset.p; this.render(); },
    salinKode(b) { salin(Dom.urlVerif(b.dataset.v)); },
    rincian(b) {
      const a = DB.rows('Arsip').find(x => x.ID === b.dataset.v); if (!a) return;
      const isi = [['listcheck', 'Realisasi Kurikulum', 'Mata kuliah, pengampu, aturan SKS, gabung kelas'], ['calplus', 'Jadwal Reguler & Hybrid', 'Matriks jadwal per pola jam'], ['clipboard', 'Jadwal Ujian UTS & UAS', 'Bila sudah disusun'], ['cal', 'Kalender Akademik', 'Kegiatan & sub-kegiatan'], ['qr', 'Registri Dokumen Cetak', 'Kode verifikasi, nomor surat, waktu cetak']];
      Modal.buka({ title: 'Arsip ' + esc(Dom.perLabel(a.Label)), sub: esc(a.Keterangan || ''), icon: 'archive',
        body: '<div class="mini-stats" style="margin-bottom:14px"><div><small>Diarsipkan</small><b style="font-size:14px">' + esc(fmtWaktu(a.Tanggal)) + '</b></div><div><small>Ukuran</small><b style="font-size:14px">' + ukuranTeks(a.Ukuran) + '</b></div><div><small>Oleh</small><b style="font-size:14px">' + esc(a.Oleh) + '</b></div></div>' +
          '<div class="lbl" style="margin-bottom:6px">Isi berkas PDF arsip</div>' + isi.map(x => '<div class="row" style="flex-wrap:nowrap;padding:8px 0;border-bottom:1px solid var(--border)">' + ic(x[0]) + '<div><b>' + x[1] + '</b><div class="t-sub muted">' + x[2] + '</div></div></div>').join('') +
          '<div class="field" style="margin-top:14px"><label>Sidik berkas (SHA-256, 16 karakter awal)</label><div class="input mono" style="background:var(--surface-2)">' + esc(a.Hash || '—') + '</div></div>',
        foot: '<button class="btn" data-a="dok">' + ic('qr') + 'Dokumen tercetak periode ini</button><button class="btn btn-primary" data-a="unduh" ' + (a.FileID ? '' : 'disabled') + '>' + ic('download') + 'Unduh PDF</button>',
        acts: { unduh: (bb) => unduhBerkasServer(a.FileID, bb), dok: (bb, e, m) => { m.close(); App.nav('arsip/dokumen', { periode: a.Label }); } } });
    },
    arsipkan() {
      const per = daftarPeriode(), awal = App.periode.berjalan.key;
      Modal.buka({ title: 'Arsipkan semester', icon: 'archive', size: 'sm',
        body: '<div class="field"><label>Periode</label><select class="input" id="ars-per">' + opsi(per.map(k => ({ v: k, l: Dom.perLabel(k) + (k === awal ? ' (berjalan)' : k === App.periode.disusun.key ? ' (disusun)' : '') })), awal) + '</select></div>' +
          '<div class="alert info" style="margin-top:12px">' + ic('info') + '<div>Satu PDF berisi realisasi kurikulum, jadwal kuliah, jadwal ujian, kalender akademik, dan daftar dokumen tercetak disimpan di folder <b>Arsip</b>. Arsip lama untuk periode yang sama diganti dengan versi terbaru.</div></div>',
        foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('archive') + 'Buat Arsip</button>',
        acts: { ok: async (bb, e, m) => { const p = $('#ars-per').value; const r = await denganSibuk(bb, 'Menyusun arsip…', () => api('arsip.semester', { periode: p }, { timeout: 360000 })); if (r.success) { toast(r.message); m.close(); } } } });
    },
    async kembalikan(b) {
      const th = b.dataset.v;
      if (!(await konfirmasi('Aktifkan kembali angkatan ' + esc(th) + '?\nMahasiswanya akan tampil lagi di menu Mahasiswa, Ringkasan, dan dokumen cetak.', { ok: 'Aktifkan Kembali', icon: 'refresh' }))) return;
      const r = await denganSibuk(b, '', () => api('angkatan.kembalikan', { tahun: th }));
      if (r.success) toast(r.message);
    },
    tarik(b) {
      const kode = b.dataset.v;
      Modal.buka({ title: 'Tarik dokumen ' + esc(kode), icon: 'alert', size: 'sm',
        body: '<p>Dokumen yang ditarik tetap tercatat, tetapi halaman verifikasi menampilkan status <b>DITARIK / TIDAK BERLAKU</b>. Tindakan ini tidak dapat dibatalkan dari aplikasi.</p><div class="field" style="margin-top:12px"><label>Alasan penarikan</label><textarea class="input" id="tk-alasan" placeholder="mis. Salah nama dosen, diganti nomor 195/ST…"></textarea></div>',
        foot: '<button class="btn" data-close>Batal</button><button class="btn btn-danger" data-a="ok">Tarik Dokumen</button>',
        acts: { ok: async (bb, e, m) => { const r = await denganSibuk(bb, 'Memproses…', () => api('de.tarik', { kode, alasan: $('#tk-alasan').value })); if (r.success) { toast(r.message); m.close(); this.st.dokKey = ''; this.render(); } } } });
    }
  },
  ch: {
    ta(t) { this.st.ta = t.value; this.render(); },
    dokPer(t) { this.st.dokPer = t.value === '__semua' ? '' : t.value; this.st.hal = 1; this.render(); },
    jenis(t) { this.st.jenis = t.value; this.st.hal = 1; this.render(); }
  },
  inp: {
    q: debounce(function (t) { this.st.q = t.value; this.render(); const i = $('[data-in="q"]', this.el); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250),
    dq: debounce(function (t) { this.st.dq = t.value; this.st.hal = 1; this.render(); const i = $('[data-in="dq"]', this.el); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250)
  },
  onShow() { if (this.st.tab === 'dokumen') { this.st.dokKey = ''; this.render(); } }
});

/* =====================================================================
   BLAST WA — Surat Tugas ke dosen, Jadwal ke grup kelas, riwayat, CRM
   ===================================================================== */
const VAR_WA = {
  SURAT_TUGAS: [['nama_dosen', 'Nama dosen'], ['nidn', 'NIDN'], ['nomor_surat', 'Nomor surat'], ['total_sks', 'Total SKS'], ['jumlah_mk', 'Jumlah MK'], ['semester', 'Semester'], ['tahun_akademik', 'Tahun akademik'], ['kampus', 'Nama kampus']],
  JADWAL_KELAS: [['prodi', 'Program studi'], ['kelas', 'Kelas'], ['semester_mhs', 'Semester mahasiswa'], ['angkatan', 'Angkatan'], ['semester', 'Semester'], ['tahun_akademik', 'Tahun akademik'], ['kampus', 'Nama kampus']]
};
const TPL_WA = { SURAT_TUGAS: 'WA_TPL_ST', JADWAL_KELAS: 'WA_TPL_JADWAL' };
const SINONIM_CRM = { Nama: ['nama', 'nama lengkap', 'nama kontak'], WA: ['wa', 'whatsapp', 'no wa', 'nomor wa', 'no hp', 'hp', 'nomor hp', 'telepon', 'no telepon', 'nomor whatsapp'], Email: ['email', 'e mail', 'surel', 'alamat email'], Segmen: ['segmen', 'kategori', 'kelompok'], Tag: ['tag', 'label', 'tags'] };
function jedaRata() { const j = String(Dom.set('WA_JEDA', '5-8')).split('-').map(Number); const a = j[0] || 5, b = j[1] || a; return (a + b) / 2; }

defPage('blast', {
  admin: true, deps: ['BlastWA', 'SuratTugas', 'Jadwal', 'Realisasi', 'Dosen', 'GrupWA', 'Pengaturan', 'Kurikulum', 'Mahasiswa'], refreshTabel: ['BlastWA', 'SuratTugas', 'Dosen', 'GrupWA', 'Jadwal', 'Realisasi'], pakaiPer: true,
  st: { tab: 'st', q: '', f: 'semua', hal: 1, pilih: {}, pilihJ: {}, siap: null, siapKey: '', tpl: {}, aktif: null, status: null, auto: true, dev: null, riw: null, rf: { jenis: '', dari: '', sampai: '' }, rhal: 1, crm: null, inter: null, cq: '', cseg: '', cpilih: {}, chal: 1 },
  init() { const b = LS.get('pa:blast', null); if (b) this.st.aktif = b; },
  onParams(p) { const t = ['st', 'jadwal', 'riwayat', 'kontak'].includes(p[0]) ? p[0] : 'st'; if (t !== this.st.tab) { this.st.hal = 1; this.st.q = ''; this.st.f = 'semua'; } this.st.tab = t; },
  judulMenu() { return 'Blast WA · ' + { st: 'Surat Tugas', jadwal: 'Jadwal Kelas', riwayat: 'Riwayat', kontak: 'Kontak CRM' }[this.st.tab]; },
  jenis() { return this.st.tab === 'jadwal' ? 'JADWAL_KELAS' : 'SURAT_TUGAS'; },
  tpl(jenis) { const s = this.st; return s.tpl[jenis] !== undefined ? s.tpl[jenis] : Dom.set(TPL_WA[jenis]); },
  prasyarat(jenis) {
    const meta = DB.meta('Pengaturan'), m = [];
    if (!(meta.FONNTE_TOKEN && meta.FONNTE_TOKEN.ada)) m.push('Token Fonnte belum diisi.');
    if (Dom.set('NOTIF_WA_AKTIF', 'TIDAK') !== 'YA') m.push('Saklar utama WhatsApp masih NONAKTIF.');
    if (Dom.set(jenis === 'JADWAL_KELAS' ? 'WA_KIRIM_JADWAL' : 'WA_KIRIM_ST', 'YA') !== 'YA') m.push('Jenis kiriman "' + (jenis === 'JADWAL_KELAS' ? 'Jadwal ke Grup Kelas' : 'Surat Tugas ke Dosen') + '" sedang dinonaktifkan.');
    return m;
  },
  async muatSiap(paksa) {
    const s = this.st, per = App.perAktif();
    if (s._muat || (!paksa && s.siapKey === per && s.siap)) return;
    s._muat = true;
    try {
      const r = await api('wa.siapkan', { periode: per }, { silent: true });
      if (r.success) { s.siap = r.data; s.siapKey = per; } else { s.siapKey = per; s.siap = s.siap || { st: {}, jadwal: {}, terakhir: {} }; toast(r.message, 'err'); }
    } finally { s._muat = false; }
    if (App.cur === this) this.render();
  },
  /* ---------- daftar tujuan ---------- */
  targetST(per) {
    const siap = this.st.siap || {}, ada = Dom.adaJadwal(per), src = ada ? Dom.dosenBerjadwal(per) : Dom.bebanDosen(per), beban = Dom.bebanDosen(per), stm = Dom.stDosen(per), p = Dom.perObj(per), kampus = Dom.set('KAMPUS_NAMA', 'Sekolah Tinggi Ilmu Syariah Al Wafa');
    return Dom.dosen().filter(d => src.has(d.ID)).map(d => {
      const mk = beban.get(d.ID) || [], st = stm.get(d.ID), ref = per + '#' + d.ID, sks = mk.reduce((a, u) => a + u.sks, 0);
      const fileId = (st && st.FileID) || (siap.st && siap.st[d.ID] ? siap.st[d.ID].fileId : '');
      return { key: d.ID, ref, nama: d.Nama, sub: 'NIDN ' + (d.NIDN || '-'), wa: hp08(d.WA), waOk: waValid(d.WA), statusWA: d.StatusWA, mk, sks, st, fileId, pola: [...new Set(mk.map(u => u.pola))],
        last: (siap.terakhir || {})['SURAT_TUGAS|' + ref], nomorPdf: st ? st.Nomor : '',
        namaFile: 'Surat Tugas ' + (st ? st.NomorUrut + ' ' : '') + d.Nama + ' - ' + p.smt + ' ' + p.ta.replace('/', '-') + '.pdf',
        vars: { nama_dosen: d.Nama, nidn: d.NIDN || '-', nomor_surat: st ? st.Nomor : '(terbit saat dikirim)', total_sks: sks, jumlah_mk: mk.length, semester: p.smt, tahun_akademik: p.ta, kampus } };
    });
  },
  targetJadwal(per) {
    const siap = this.st.siap || {}, p = Dom.perObj(per), grup = DB.rows('GrupWA'), kampus = Dom.set('KAMPUS_NAMA', 'Sekolah Tinggi Ilmu Syariah Al Wafa');
    const rbs = Pages['cetak-jadwal'] ? Pages['cetak-jadwal'].rombel(per) : [];
    return rbs.map(rb => {
      const g = grup.find(x => x.Prodi === rb.prodi && String(x.Angkatan) === String(rb.angkatan) && x.Kelas === rb.kelas && x.IdGrup), ref = per + '#' + rb.key, smt = Dom.semMhs(rb.angkatan, per);
      const mk = [...new Map(rb.mk.map(u => [u.id, u])).values()], id = g ? (String(g.IdGrup).includes('@') ? g.IdGrup : g.IdGrup + '@g.us') : '';
      return { key: rb.key, rb, ref, nama: Dom.rombelLabel(rb.prodi, rb.angkatan, rb.kelas, per, true), sub: 'Angkatan ' + rb.angkatan, wa: id, waOk: !!id, grup: g, mk, sks: mk.reduce((a, u) => a + u.sks, 0), pola: [rb.pola],
        fileId: siap.jadwal && siap.jadwal[rb.key] ? siap.jadwal[rb.key].fileId : '', last: (siap.terakhir || {})['JADWAL_KELAS|' + ref],
        namaFile: 'Jadwal ' + rb.prodi + ' Smt ' + smt + ' ' + rb.kelas + ' - ' + p.smt + ' ' + p.ta.replace('/', '-') + '.pdf',
        vars: { prodi: Dom.prodiNama(rb.prodi), kelas: rb.kelas, semester_mhs: smt, angkatan: rb.angkatan, semester: p.smt, tahun_akademik: p.ta, kampus } };
    });
  },
  targets(per, jenis) { return jenis === 'JADWAL_KELAS' ? this.targetJadwal(per) : this.targetST(per); },
  pilihan(jenis) { return jenis === 'JADWAL_KELAS' ? this.st.pilihJ : this.st.pilih; },
  saring(list) {
    const s = this.st;
    return list.filter(x => (s.f === 'semua' || (s.f === 'sudah' ? x.last && x.last.status === 'Terkirim' : s.f === 'gagal' ? x.last && x.last.status === 'Gagal' : !(x.last && x.last.status === 'Terkirim'))) && cocok(x.nama + ' ' + x.sub + ' ' + x.wa, s.q));
  },

  /* ---------- render ---------- */
  render() {
    const s = this.st, per = App.perAktif();
    if (s.siapKey !== per && !s._muat) this.muatSiap();
    let h = kepala({ crumb: ['Lainnya', 'Blast WA'], judul: 'Blast WhatsApp', badge: ' <span class="badge info">Fonnte API</span>',
      desc: 'Kirim massal Surat Tugas Mengajar ke dosen dan Jadwal Perkuliahan ke grup WA kelas, lengkap dengan lampiran PDF resmi ber-QR. Pengiriman berjalan bertahap di server dengan jeda acak dan berlanjut otomatis walau halaman ditutup.',
      aksi: (s.tab === 'st' || s.tab === 'jadwal' ? App.perToggle() : '') + btnRefresh(false) + '<button class="btn" data-a="perangkat">' + ic('phone') + 'Cek Perangkat</button><button class="btn" data-a="tes">' + ic('send') + 'Tes Kirim</button>' });
    h += '<div class="tabs">' + [['st', 'Kirim Surat Tugas', 'filetext'], ['jadwal', 'Kirim Jadwal ke Grup', 'users'], ['riwayat', 'Riwayat & Log', 'history'], ['kontak', 'Kontak CRM', 'idcard']].map(x => '<button class="' + (s.tab === x[0] ? 'on' : '') + '" data-a="nav" data-to="blast/' + x[0] + '">' + ic(x[2], 'ic-sm') + x[1] + '</button>').join('') + '</div>';
    if (s.tab === 'riwayat') h += this.vRiwayat(); else if (s.tab === 'kontak') h += this.vKontak(); else h += this.vKirim(per);
    this.el.innerHTML = h;
    if (s.aktif && (!s.status || s.status.Status === 'Berjalan')) this.pantau();
  },
  vKirim(per) {
    const s = this.st, jenis = this.jenis(), pil = this.pilihan(jenis), st = jenis === 'SURAT_TUGAS';
    const ls = this.targetST(per), lj = this.targetJadwal(per), list = st ? ls : lj;
    const ter = Object.entries((s.siap || {}).terakhir || {}).filter(([k]) => k.split('|').slice(1).join('|').startsWith(per + '#'));
    const nOk = ter.filter(([, v]) => v.status === 'Terkirim').length, nGagal = ter.filter(([, v]) => v.status === 'Gagal').length;
    const tampil = this.saring(list), PER = 10, hal = Math.min(s.hal, Math.max(1, Math.ceil(tampil.length / PER)));
    const dipilih = list.filter(x => pil[x.key] && x.waOk), bisaPilih = tampil.filter(x => x.waOk);
    const cnt = { semua: list.length, belum: list.filter(x => !(x.last && x.last.status === 'Terkirim')).length, sudah: list.filter(x => x.last && x.last.status === 'Terkirim').length, gagal: list.filter(x => x.last && x.last.status === 'Gagal').length };
    const pr = this.prasyarat(jenis);
    let h = '<div class="kpis">' +
      kpi({ lb: 'Dosen Berjadwal', vl: ls.length + '<small>dosen</small>', ic: 'cap', ft: ic('okc', 'ic-sm') + ' ' + ls.filter(x => x.st).length + ' surat terbit · ' + ls.filter(x => x.fileId).length + ' PDF siap' }) +
      kpi({ lb: 'Rombel Kelas', vl: lj.length + '<small>rombel</small>', ic: 'users', ft: ic('link', 'ic-sm') + ' ' + lj.filter(x => x.waOk).length + ' terpetakan ke grup WA' }) +
      kpi({ lb: 'Terkirim Periode Ini', vl: nOk + '<small>pesan</small>', ic: 'msg', cls: 'ok', ft: (nOk + nGagal ? pct(nOk, nOk + nGagal) + '% tingkat keberhasilan' : 'Belum ada pengiriman') }) +
      kpi({ lb: 'Gagal / Perlu Ulang', vl: nGagal + '<small>nomor</small>', ic: 'alert', cls: nGagal ? 'err' : '', ft: nGagal ? '<button class="btn btn-sm btn-danger" data-a="ulangSemua" style="margin-top:4px">' + ic('refresh', 'ic-sm') + 'Kirim Ulang ' + nGagal + ' Gagal</button>' : 'Tidak ada yang gagal' }) + '</div>';
    h += '<div class="bl-split"><div class="stack" style="min-width:0">' +
      '<div class="card"><div class="card-h"><label class="chk"><input type="checkbox" data-ch="semua" ' + (bisaPilih.length && bisaPilih.every(x => pil[x.key]) ? 'checked' : '') + '> <b>Pilih semua</b></label><span class="badge info mono">Terpilih: ' + dipilih.length + ' / ' + list.filter(x => x.waOk).length + '</span><span class="sp"></span>' +
      '<button class="btn btn-ok" data-a="kirim" ' + (dipilih.length ? '' : 'disabled') + '>' + ic('send') + 'Kirim Blast ke Terpilih (' + dipilih.length + ')</button></div>' +
      '<div class="card-h"><div class="input-ic" style="flex:1 1 220px">' + ic('search') + '<input class="input" data-in="q" placeholder="' + (st ? 'Cari nama dosen / NIDN…' : 'Cari prodi, kelas, grup…') + '" value="' + attr(s.q) + '"></div>' +
      '<div class="seg">' + [['semua', 'Semua'], ['belum', 'Belum'], ['sudah', 'Sudah'], ['gagal', 'Gagal']].map(x => '<button data-a="f" data-v="' + x[0] + '" class="' + (s.f === x[0] ? 'on' : '') + '">' + x[1] + ' <small>(' + cnt[x[0]] + ')</small></button>').join('') + '</div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:34px"></th><th class="num">No</th><th>' + (st ? 'Dosen &amp; NIDN' : 'Kelas (Rombel)') + '</th><th>' + (st ? 'Nomor WhatsApp' : 'Grup WhatsApp') + '</th><th>Beban</th><th>PDF &amp; Pengiriman</th><th class="right"></th></tr></thead><tbody>' +
      (tampil.slice((hal - 1) * PER, hal * PER).map((x, i) => '<tr class="' + (!x.waOk ? 'dim' : '') + '"><td><input type="checkbox" style="width:17px;height:17px;accent-color:var(--primary)" data-ch="pilih" data-v="' + attr(x.key) + '" ' + (pil[x.key] && x.waOk ? 'checked' : '') + (x.waOk ? '' : ' disabled') + '></td><td class="num">' + String((hal - 1) * PER + i + 1).padStart(2, '0') + '</td>' +
        '<td style="min-width:200px">' + (st ? '<div class="row" style="flex-wrap:nowrap"><div class="avatar">' + esc(inisial(x.nama)) + '</div><div><b>' + esc(x.nama) + '</b><div class="t-sub mono">' + esc(x.sub) + '</div></div></div>' : '<b>' + dotProdi(x.rb.prodi) + ' ' + esc(x.nama) + '</b><div class="t-sub">' + esc(x.sub) + '</div>') + '</td>' +
        '<td>' + (st ? (x.wa ? '<span class="mono" style="font-size:12.5px">' + esc(waTampil(x.wa)) + '</span><div class="t-sub">' + (x.waOk ? (x.statusWA === 'Terdaftar' ? '<span style="color:var(--ok)">Terverifikasi WA</span>' : x.statusWA === 'Tidak Terdaftar' ? '<span style="color:var(--err)">Tidak terdaftar WA</span>' : 'Belum dicek') : '<span style="color:var(--err)">Format tidak valid</span>') + '</div>' : '<span class="badge err">Belum ada nomor</span>')
          : (x.grup ? '<b style="font-size:13px">' + esc(x.grup.NamaGrup || 'Grup WA') + '</b><div class="t-sub mono">' + esc(x.wa) + '</div>' : '<span class="badge warn">Belum dipetakan</span> <button class="link-btn" data-a="nav" data-to="pengaturan/wa">atur</button>')) + '</td>' +
        '<td class="nowrap">' + x.mk.length + ' MK<div class="t-sub">' + x.sks + ' SKS · ' + esc(x.pola.join(', ')) + '</div></td>' +
        '<td class="nowrap">' + (x.fileId ? '<span class="badge ok">' + ic('filetext', 'ic-sm') + 'PDF siap' + (x.nomorPdf ? ' · ' + esc(String(x.nomorPdf).split('/')[0]) : '') + '</span>' : s.siap ? '<span class="badge orange" title="Dibuat otomatis saat dikirim">PDF belum dibuat</span>' : '<span class="spin spin-sm"></span>') +
          '<div class="t-sub" style="margin-top:4px"' + (x.last ? ' title="' + attr(x.last.ket || '') + '"' : '') + '>' + (x.last ? badgeStatusWA(x.last.status) + ' ' + esc(relatif(x.last.waktu)) : 'Belum pernah dikirim') + '</div></td>' +
        '<td class="right"><button class="btn btn-sm btn-icon" data-a="lihat" data-v="' + attr(x.key) + '" title="Pratinjau dokumen">' + ic('eye', 'ic-sm') + '</button></td></tr>').join('') ||
        '<tr><td colspan="7">' + kosong(list.length ? 'Tidak ada data pada filter ini.' : (st ? 'Belum ada dosen berjadwal di ' : 'Belum ada jadwal kelas tersimpan di ') + esc(Dom.perLabel(per)) + '.', st ? 'filetext' : 'users') + '</td></tr>') + '</tbody></table></div>' +
      (tampil.length > PER ? pagerHtml(tampil.length, hal, PER, st ? 'dosen' : 'kelas') : '') + '</div>' +
      '<div class="alert info side">' + ic('shield') + '<div><b>Protokol keamanan pengiriman massal:</b> jeda acak ' + esc(Dom.set('WA_JEDA', '5-8')) + ' detik per nomor dan ' + esc(Dom.set('WA_BATCH', '10')) + ' pesan per putaran agar nomor tidak diblokir. Token Fonnte hanya tersimpan di Script Properties server. Lampiran PDF disalin ke folder Drive <span class="mono">Kiriman WA</span> (satu-satunya folder bertautan publik).</div></div></div>' +
      '<div class="stack" style="min-width:0">' + (pr.length ? '<div class="alert warn">' + ic('alert') + '<div><b>Belum siap mengirim</b><ul style="margin:4px 0 6px 18px">' + pr.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul><button class="btn btn-sm" data-a="nav" data-to="pengaturan/wa">' + ic('gear', 'ic-sm') + 'Buka Pengaturan WhatsApp</button></div></div>' : '') +
      (s.dev ? '<div class="alert ' + (s.dev.status === 'connect' ? 'ok' : 'warn') + '">' + ic('phone') + '<div><b>' + (s.dev.status === 'connect' ? 'Perangkat tersambung' : 'Perangkat belum tersambung') + '</b> · ' + esc(s.dev.nomor || '-') + '<div class="t-sub">Paket ' + esc(s.dev.paket || '-') + ' · Kuota ' + esc(s.dev.kuota || '-') + (s.dev.kedaluwarsa ? ' · s.d. ' + esc(s.dev.kedaluwarsa) : '') + '</div></div></div>' : '') +
      this.vTemplate(jenis, list, pil) + (s.aktif ? this.vPanel() : this.vEksekusi(jenis, list, pil)) + '</div></div>';
    return h;
  },
  contoh(list, pil) { return list.find(x => pil[x.key] && x.waOk) || list.find(x => x.waOk) || list[0] || null; },
  vTemplate(jenis, list, pil) {
    const t = this.tpl(jenis), c = this.contoh(list, pil), tersimpan = t === Dom.set(TPL_WA[jenis]);
    return '<div class="card"><div class="card-h"><h3>' + ic('edit') + 'Template Pesan</h3><span class="sp"></span><span class="badge ' + (tersimpan ? 'ok' : 'orange') + '">' + (tersimpan ? 'Tersimpan' : 'Diubah (sementara)') + '</span></div><div class="card-b">' +
      '<div class="lbl">Variabel otomatis — klik untuk menyisipkan</div><div class="row gap-s" style="margin:6px 0 10px">' + VAR_WA[jenis].map(v => '<button class="var-chip" data-a="var" data-v="{' + v[0] + '}" title="' + attr(v[1]) + '">{' + v[0] + '}</button>').join('') + '</div>' +
      '<textarea class="input mono" id="bl-tpl" data-in="tpl" rows="9" style="font-size:12.5px">' + esc(t) + '</textarea>' +
      '<div class="row" style="margin-top:8px"><span class="help">*tebal* · _miring_ · ~coret~</span><span class="sp"></span>' + (tersimpan ? '' : '<button class="link-btn" data-a="tplReset">Kembalikan</button>') + '<button class="btn btn-sm" data-a="tplSimpan" ' + (tersimpan ? 'disabled' : '') + '>' + ic('save', 'ic-sm') + 'Jadikan bawaan</button></div></div>' +
      '<div class="card-h" style="border-top:1px solid var(--border)"><h3>' + ic('phone') + 'Simulasi Tampilan WhatsApp</h3><span class="sp"></span><small class="muted">' + (c ? 'Pratinjau: ' + esc(c.nama) : '') + '</small></div><div class="card-b" id="bl-prev">' + this.vPrev(jenis, c) + '</div></div>';
  },
  vPrev(jenis, c) {
    const t = this.tpl(jenis), isi = c ? isiVar(t, c.vars) : t, jam = fmtJam(new Date());
    return '<div class="wa-phone"><div class="row" style="background:#075E54;color:#fff;border-radius:10px;padding:8px 12px;margin:-4px -4px 12px;flex-wrap:nowrap"><div class="avatar" style="background:#fff;color:#075E54">AW</div><div style="min-width:0"><b style="font-size:13.5px">BAAK ' + esc(Dom.set('KAMPUS_NAMA', 'STIS Al Wafa')) + '</b><div style="font-size:11px;opacity:.8">Akun WhatsApp resmi</div></div></div>' +
      '<div class="wa-bubble">' + (c ? '<div class="wa-file">' + ic('filetext') + '<div style="min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.namaFile) + '</b><small>1 halaman · PDF</small></div></div>' : '') + waFormat(isi) +
      '<div style="text-align:right;font-size:10.5px;color:#667;margin-top:6px">' + jam + ' ✓✓</div></div></div>';
  },
  vEksekusi(jenis, list, pil) {
    const d = list.filter(x => pil[x.key] && x.waOk), tanpaPdf = d.filter(x => !x.fileId).length, detik = Math.round(d.length * (jedaRata() + 1.5));
    return '<div class="card"><div class="card-h"><h3>' + ic('zap') + 'Panel Eksekusi Blast</h3><span class="sp"></span><span class="badge info mono">Jeda ' + esc(Dom.set('WA_JEDA', '5-8')) + ' dtk</span></div><div class="card-b">' +
      '<div class="stack" style="gap:8px;font-size:13.5px"><div class="row"><span class="muted">Penerima terpilih</span><span class="sp"></span><b>' + d.length + ' ' + (jenis === 'JADWAL_KELAS' ? 'grup' : 'dosen') + '</b></div>' +
      '<div class="row"><span class="muted">PDF yang perlu dibuat</span><span class="sp"></span><b>' + tanpaPdf + '</b></div>' +
      '<div class="row"><span class="muted">Estimasi waktu kirim</span><span class="sp"></span><b>± ' + (detik < 90 ? detik + ' detik' : Math.ceil(detik / 60) + ' menit') + '</b></div>' +
      '<div class="row"><span class="muted">Konsumsi kuota Fonnte</span><span class="sp"></span><b>' + d.length + ' pesan</b></div></div>' +
      '<button class="btn btn-primary" style="width:100%;margin-top:14px;height:44px" data-a="kirim" ' + (d.length ? '' : 'disabled') + '>' + ic('send') + 'Mulai Pengiriman (' + d.length + ' Penerima)</button>' +
      '<p class="help" style="text-align:center;margin-top:8px">Pengiriman berlanjut di server walau tab ditutup.</p></div></div>';
  },
  vPanel() {
    const s = this.st, b = s.status && s.status.BlastID === s.aktif ? s.status : null;
    if (!b) return '<div class="card" id="bl-panel"><div class="empty"><div class="spin"></div><div>Memuat status pengiriman…</div></div></div>';
    const c = b.hitung || {}, jalan = b.Status === 'Berjalan';
    return '<div class="card" id="bl-panel"><div class="card-h"><h3>' + ic(jalan ? 'activity' : 'okc') + (jalan ? 'Pengiriman Berjalan' : 'Pengiriman ' + esc(b.Status)) + '</h3><span class="sp"></span>' + badgeStatusWA(b.Status) + '<div class="sub">' + esc(b.Judul) + ' · ' + esc(Dom.perLabel(b.Periode)) + ' · dibuat ' + esc(fmtWaktu(b.Tanggal)) + '</div></div><div class="card-b">' +
      '<div class="row" style="margin-bottom:6px"><b style="font-size:22px">' + (b.persen || 0) + '%</b><span class="muted">' + ((c.Terkirim || 0) + (c.Gagal || 0) + (c.Batal || 0)) + ' dari ' + esc(b.Total) + ' diproses</span>' + (jalan ? '<span class="sp"></span><span class="spin spin-sm"></span>' : '') + '</div>' +
      '<div class="progress-lg"><i style="width:' + (b.persen || 0) + '%"></i></div>' +
      '<div class="mini-stats" style="margin:12px 0;grid-template-columns:repeat(4,minmax(0,1fr))"><div><small>Terkirim</small><b style="color:var(--ok)">' + (c.Terkirim || 0) + '</b></div><div><small>Gagal</small><b style="color:var(--err)">' + (c.Gagal || 0) + '</b></div><div><small>Antri</small><b>' + (c.Antri || 0) + '</b></div><div><small>Batal</small><b>' + (c.Batal || 0) + '</b></div></div>' +
      (jalan ? '<div class="row"><label class="row gap-s" style="cursor:pointer"><span class="switch"><input type="checkbox" data-ch="auto" ' + (s.auto ? 'checked' : '') + '><i></i></span><span style="font-size:13px">Lanjut otomatis dari browser</span></label><span class="sp"></span><button class="btn btn-sm" data-a="batch">' + ic('send', 'ic-sm') + 'Kirim batch berikutnya</button></div>' +
        '<p class="help" style="margin-top:6px">Saat tab tertutup, pemicu server tiap menit tetap melanjutkan ' + esc(Dom.set('WA_BATCH', '10')) + ' pesan per putaran.</p>' : '') +
      '<div style="max-height:300px;overflow:auto;margin-top:10px;border:1px solid var(--border);border-radius:10px">' + (b.rincian || []).map(r => '<div class="row" style="flex-wrap:nowrap;padding:8px 10px;border-bottom:1px solid var(--border);font-size:13px"><div style="flex:1;min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(r.Tujuan) + '</b><span class="t-sub mono">' + esc(/@g\.us$/.test(r.Nomor) ? 'Grup WA' : waTampil(r.Nomor)) + '</span>' + (r.Status === 'Gagal' || /ulang/i.test(r.Keterangan) ? '<div class="t-sub" style="color:var(--err)">' + esc(r.Keterangan) + '</div>' : '') + '</div>' + badgeStatusWA(r.Status) + '</div>').join('') + '</div>' +
      '<div class="row" style="margin-top:12px">' + (jalan ? '<button class="btn btn-danger btn-sm" data-a="stop">' + ic('x', 'ic-sm') + 'Hentikan</button>' : '<button class="btn btn-sm" data-a="tutupPanel">Tutup panel</button>') + '<span class="sp"></span>' + (c.Gagal ? '<button class="btn btn-sm btn-soft" data-a="ulang">' + ic('refresh', 'ic-sm') + 'Kirim Ulang ' + c.Gagal + ' Gagal</button>' : '') + '</div></div></div>';
  },
  renderPanel() { const el = $('#bl-panel', this.el); if (el) el.outerHTML = this.vPanel(); },
  async pantau() {
    const s = this.st; if (this._pantau || !s.aktif) return;
    this._pantau = true;
    try {
      let berhenti = false;
      while (!berhenti && s.aktif && this.el && App.cur === this && Sesi.token) {
        const id = s.aktif, b = s.status && s.status.BlastID === id ? s.status : null;
        if (b && b.Status !== 'Berjalan') break;
        let r;
        if (s.auto && b && document.visibilityState === 'visible') r = await api('wa.blastProses', { blastId: id }, { silent: true, timeout: 120000 });
        else { if (b) await sleep(8000); r = await api('wa.blastStatus', { blastId: id }, { silent: true }); }
        if (s.aktif !== id) break;
        if (r.success && r.data.blast) { s.status = r.data.blast; this.renderPanel(); }
        else if (r.success && !r.data.blast) { s.aktif = null; LS.del('pa:blast'); if (App.cur === this) this.render(); break; }
        else await sleep(6000);
        const info = r.success && r.data.proses ? r.data.proses.info || '' : '';
        if (/ditahan/i.test(info)) { s.auto = false; toast(info, 'warn'); this.renderPanel(); }
        else if (/lain sedang berjalan/i.test(info)) await sleep(9000);
        if (!r.success && r.code === 'AUTH') berhenti = true;
      }
    } finally { this._pantau = false; }
    if (s.status && s.status.BlastID === s.aktif && s.status.Status !== 'Berjalan' && App.cur === this) { await this.muatSiap(true); }
  },
  onShow() { if (this.st.tab === 'st' || this.st.tab === 'jadwal') this.muatSiap(true); if (this.st.aktif) this.pantau(); },

  /* ---------- kirim ---------- */
  async buatPdf(jenis, list, per) {
    let docs;
    if (jenis === 'SURAT_TUGAS') {
      const pst = Pages['cetak-st'] && Pages['cetak-st'].st, tanggal = (pst && pst.tanggal) || Dom.set('ST_TANGGAL') || isoTgl();
      const perlu = list.filter(x => !x.st).map(x => x.key);
      if (perlu.length) { const r = await api('st.terbit', { periode: per, dosen: perlu, tanggal }); if (!r.success) return false; toast(r.message); }
      docs = list.map(x => Doc.suratTugas(x.key, per, Dom.stDosen(per).get(x.key), null));
    } else docs = list.map(x => Doc.jadwalKelas(x.rb, per, { orient: 'auto' }));
    const mp = modalProgres('Membuat PDF lampiran');
    try {
      const hasil = await pdfLatar(docs, { periode: per, folder: jenis === 'SURAT_TUGAS' ? 'Surat Tugas' : 'Jadwal', progres: (i, n, d) => mp.set(i, n, 'Membuat & menyimpan ' + (i + 1) + ' dari ' + n + ': ' + d.judul) });
      mp.set(1, 1, 'Selesai.');
      const gagal = hasil.filter(x => !x.r.success).length;
      if (gagal) toast(gagal + ' PDF gagal disimpan — tujuan tersebut dilewati.', 'warn');
      return true;
    } catch (e) { toast('Gagal membuat PDF: ' + e.message, 'err'); return false; }
    finally { mp.close(); }
  },
  async kirim(btn) {
    const s = this.st, per = App.perAktif(), jenis = this.jenis(), pil = this.pilihan(jenis);
    const pr = this.prasyarat(jenis);
    if (pr.length) { konfirmasi(pr.join('\n') + '\n\nLengkapi di Pengaturan → WhatsApp (Fonnte).', { title: 'Belum siap mengirim', icon: 'alert', ok: 'Buka Pengaturan' }).then(j => { if (j) App.nav('pengaturan/wa'); }); return; }
    let list = this.targets(per, jenis).filter(x => pil[x.key] && x.waOk);
    if (!list.length) { toast('Pilih minimal satu tujuan dengan nomor/grup WA valid.', 'warn'); return; }
    const tanpaPdf = list.filter(x => !x.fileId);
    if (tanpaPdf.length) {
      const j = await konfirmasi(tanpaPdf.length + ' ' + (jenis === 'SURAT_TUGAS' ? 'surat tugas' : 'jadwal kelas') + ' belum memiliki PDF tersimpan.\nBuat PDF otomatis sekarang? Tampilannya sama persis dengan pratinjau cetak.' + (jenis === 'SURAT_TUGAS' && tanpaPdf.some(x => !x.st) ? '\n\nNomor surat tugas baru diterbitkan untuk ' + tanpaPdf.filter(x => !x.st).length + ' dosen yang belum punya.' : ''),
        { title: 'PDF lampiran belum ada', icon: 'filetext', ok: 'Buat PDF & lanjutkan', extra: '<button class="btn" data-a="alt">Lihat pratinjau dulu</button>' });
      if (j === 'alt') { this.bukaPratinjau(jenis, tanpaPdf, per); return; }
      if (!j) return;
      const ok = await this.buatPdf(jenis, tanpaPdf, per);
      if (!ok) return;
      s.siapKey = ''; await this.muatSiap(true);
      list = this.targets(per, jenis).filter(x => pil[x.key] && x.waOk);
    }
    const siap = list.filter(x => x.fileId), lewat = list.length - siap.length;
    if (!siap.length) { toast('Tidak ada tujuan dengan PDF siap.', 'err'); return; }
    const tpl = this.tpl(jenis);
    if (!(await konfirmasi('Kirim ' + siap.length + ' pesan WhatsApp' + (jenis === 'SURAT_TUGAS' ? ' berisi Surat Tugas Mengajar' : ' berisi Jadwal Perkuliahan ke grup kelas') + ' untuk ' + esc(Dom.perLabel(per)) + '?' + (lewat ? '\n' + lewat + ' tujuan dilewati karena PDF gagal dibuat.' : '') + '\n\nEstimasi ± ' + Math.max(1, Math.ceil(siap.length * (jedaRata() + 1.5) / 60)) + ' menit. Pesan yang sudah terkirim tidak dapat ditarik.', { title: 'Mulai pengiriman', icon: 'send', ok: 'Kirim Sekarang' }))) return;
    const target = siap.map(x => ({ ref: x.ref, nama: x.nama, nomor: x.wa, fileId: x.fileId, namaFile: x.namaFile, vars: Object.assign({}, x.vars, jenis === 'SURAT_TUGAS' ? { nomor_surat: (Dom.stDosen(per).get(x.key) || {}).Nomor || x.vars.nomor_surat } : {}) }));
    const r = await denganSibuk(btn, 'Memasukkan antrean…', () => api('wa.blastBuat', { jenis, periode: per, judul: (jenis === 'SURAT_TUGAS' ? 'Surat Tugas ' : 'Jadwal Kelas ') + Dom.perLabel(per) + ' (' + target.length + ')', template: tpl, target }));
    if (!r.success) return;
    toast(r.message);
    if (r.data.dilewati && r.data.dilewati.length) Modal.buka({ title: r.data.dilewati.length + ' tujuan dilewati', icon: 'alert', size: 'sm', body: '<ul style="margin-left:18px">' + r.data.dilewati.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>', foot: '<button class="btn btn-primary" data-close>Mengerti</button>' });
    if (jenis === 'SURAT_TUGAS') s.pilih = {}; else s.pilihJ = {};
    this.mulaiPantau(r.data.blastId);
  },
  mulaiPantau(id) { const s = this.st; s.aktif = id; s.status = null; s.auto = true; LS.set('pa:blast', id); this.render(); this.pantau(); },
  bukaPratinjau(jenis, list, per) {
    if (jenis === 'SURAT_TUGAS') { const p = Pages['cetak-st']; if (!p.st.tanggal) p.st.tanggal = Dom.set('ST_TANGGAL') || isoTgl(); p.buka(list.map(x => x.key)); }
    else Pages['cetak-jadwal'].bukaKelas(list.map(x => x.rb));
    if (Cetak.st) Cetak.st.o.onTutup = () => { this.st.siapKey = ''; this.muatSiap(true); };
  },

  /* ---------- riwayat ---------- */
  vRiwayat() {
    const s = this.st, bl = DB.rows('BlastWA').slice().sort((a, b) => String(b.Tanggal).localeCompare(String(a.Tanggal))).slice(0, 60);
    if (!s.riw && !s._riw) this.muatRiw();
    const rows = s.riw ? s.riw.r.map(r => { const o = {}; s.riw.h.forEach((k, i) => { o[k] = r[i]; }); return o; }) : [], PER = 25, hal = Math.min(s.rhal, Math.max(1, Math.ceil(rows.length / PER)));
    return '<div class="card" style="margin-bottom:16px"><div class="card-h"><h3>' + ic('send') + 'Daftar Blast</h3><span class="sp"></span><span class="muted">' + bl.length + ' blast terakhir</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Dibuat</th><th>Judul</th><th>Periode</th><th>Total</th><th>Terkirim</th><th>Gagal</th><th>Status</th><th class="right"></th></tr></thead><tbody>' +
      (bl.map(b => '<tr><td class="nowrap">' + esc(fmtWaktu(b.Tanggal)) + '<div class="t-sub">' + esc(b.DibuatOleh) + '</div></td><td><b>' + esc(b.Judul) + '</b><div class="t-sub">' + (b.Jenis === 'JADWAL_KELAS' ? 'Jadwal ke grup kelas' : 'Surat tugas ke dosen') + '</div></td><td class="nowrap">' + esc(Dom.perLabel(b.Periode)) + '</td><td>' + esc(b.Total) + '</td><td style="color:var(--ok);font-weight:700">' + esc(b.Terkirim) + '</td><td style="color:' + (num(b.Gagal) ? 'var(--err)' : 'inherit') + ';font-weight:700">' + esc(b.Gagal) + '</td><td>' + badgeStatusWA(b.Status) + '</td>' +
        '<td class="right"><button class="btn btn-sm btn-soft" data-a="pantauB" data-v="' + attr(b.BlastID) + '" data-j="' + attr(b.Jenis) + '">' + ic('eye', 'ic-sm') + 'Rincian</button></td></tr>').join('') || '<tr><td colspan="8">' + kosong('Belum ada blast.', 'send') + '</td></tr>') + '</tbody></table></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('history') + 'Log Pengiriman Pesan</h3><span class="sp"></span>' +
      '<select class="input sm" style="width:auto" data-ch="rjenis"><option value="">Semua jenis</option>' + opsi([{ v: 'SURAT_TUGAS', l: 'Surat Tugas' }, { v: 'JADWAL_KELAS', l: 'Jadwal Kelas' }], s.rf.jenis) + '</select>' +
      '<input type="date" class="input sm" style="width:auto" data-ch="rdari" value="' + attr(s.rf.dari) + '" title="Dari tanggal"><input type="date" class="input sm" style="width:auto" data-ch="rsampai" value="' + attr(s.rf.sampai) + '" title="Sampai tanggal">' +
      '<button class="btn btn-sm" data-a="xlsRiw" ' + (rows.length ? '' : 'disabled') + '>' + ic('sheet', 'ic-sm') + 'Excel</button></div>' +
      (!s.riw ? '<div class="empty"><div class="spin"></div><div>Memuat log…</div></div>' :
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Tujuan</th><th>Nomor</th><th>Status</th><th>Keterangan</th><th>Pesan</th></tr></thead><tbody>' +
        (rows.slice((hal - 1) * PER, hal * PER).map(o => '<tr><td class="nowrap">' + esc(fmtWaktu(o.DikirimPada || o.Waktu)) + '<div class="t-sub">' + (o.Jenis === 'JADWAL_KELAS' ? 'Jadwal' : 'Surat Tugas') + '</div></td><td><b>' + esc(o.Tujuan) + '</b></td><td class="mono nowrap" style="font-size:12px">' + esc(/@g\.us$/.test(o.Nomor) ? 'Grup WA' : waTampil(o.Nomor)) + '</td><td>' + badgeStatusWA(o.Status) + (num(o.Percobaan) > 1 ? '<div class="t-sub">' + esc(o.Percobaan) + '× coba</div>' : '') + '</td>' +
          '<td style="font-size:12.5px;max-width:220px">' + esc(o.Keterangan) + '</td><td style="font-size:12px;max-width:260px" class="muted" title="' + attr(o.Pesan) + '">' + esc(String(o.Pesan).slice(0, 90)) + (String(o.Pesan).length > 90 ? '…' : '') + '</td></tr>').join('') ||
          '<tr><td colspan="6">' + kosong('Tidak ada log pada filter ini.', 'history') + '</td></tr>') + '</tbody></table></div>' + (rows.length > PER ? pagerHtml(rows.length, hal, PER, 'pesan').replace(/data-a="pg"/g, 'data-a="rpg"') : '')) + '</div>';
  },
  async muatRiw() {
    const s = this.st; s._riw = true;
    const r = await api('wa.riwayat', s.rf, { silent: true });
    s._riw = false; s.riw = r.success ? r.data : { h: [], r: [] }; s.rhal = 1;
    if (!r.success) toast(r.message, 'err');
    if (App.cur === this && s.tab === 'riwayat') this.render();
  },

  /* ---------- kontak CRM ---------- */
  crmRows() { const t = this.st.crm; return t ? t.r.map(r => { const o = {}; t.h.forEach((k, i) => { o[k] = r[i] === undefined ? '' : r[i]; }); return o; }) : []; },
  async muatCrm(sync) {
    const s = this.st; s._crm = true;
    const r = await api('crm.daftar', { sync: !!sync }, { silent: true });
    s._crm = false;
    if (r.success) { s.crm = r.data.kontak; s.inter = r.data.interaksi; s.crmSinkron = r.data.sinkron; } else { s.crm = { h: [], r: [] }; toast(r.message, 'err'); }
    if (App.cur === this && s.tab === 'kontak') this.render();
  },
  vKontak() {
    const s = this.st;
    if (!s.crm) { if (!s._crm) this.muatCrm(); return '<div class="card"><div class="empty"><div class="spin"></div><div>Memuat kontak CRM…</div></div></div>'; }
    const all = this.crmRows(), seg = [...new Set(all.map(k => k.Segmen).filter(Boolean))];
    const list = all.filter(k => (!s.cseg || k.Segmen === s.cseg) && cocok(k.Nama + ' ' + k.WA + ' ' + k.Email + ' ' + k.Tag, s.cq)).sort(by(k => norm(k.Nama)));
    const PER = 20, hal = Math.min(s.chal, Math.max(1, Math.ceil(list.length / PER))), nPil = Object.keys(s.cpilih).filter(k => s.cpilih[k]).length;
    return '<div class="kpis">' + kpi({ lb: 'Total Kontak', vl: all.length, ic: 'idcard', ft: 'Sinkron ' + (s.crmSinkron ? relatif(new Date(+s.crmSinkron)) : '—') }) +
      kpi({ lb: 'Dosen', vl: all.filter(k => k.Sumber === 'dosen').length, ic: 'cap', ft: 'Dari menu Dosen' }) +
      kpi({ lb: 'Grup Kelas', vl: all.filter(k => k.Sumber === 'grup').length, ic: 'users', ft: 'Dari pemetaan grup WA' }) +
      kpi({ lb: 'Opt-out', vl: all.filter(k => k.OptOut === 'YA').length, ic: 'alert', cls: 'warn', ft: 'Tidak dikirimi blast' }) + '</div>' +
      '<div class="card"><div class="card-h"><div class="input-ic" style="flex:1 1 220px">' + ic('search') + '<input class="input" data-in="cq" placeholder="Cari nama, nomor, email, tag…" value="' + attr(s.cq) + '"></div>' +
      '<select class="input" style="width:auto" data-ch="cseg"><option value="">Semua segmen</option>' + opsi(seg, s.cseg) + '</select><span class="sp"></span>' +
      '<button class="btn" data-a="crmSync">' + ic('refresh') + 'Sinkron</button><button class="btn" data-a="crmImpor">' + ic('upload') + 'Impor Excel</button><button class="btn" data-a="crmEkspor">' + ic('download') + 'Ekspor</button><button class="btn btn-primary" data-a="crmTambah">' + ic('plus') + 'Tambah Kontak</button></div>' +
      (nPil ? '<div class="card-h" style="background:var(--primary-50)"><b>' + nPil + ' kontak dipilih</b><span class="sp"></span><button class="btn btn-sm" data-a="crmBulk" data-v="tag">' + ic('tag', 'ic-sm') + 'Tambah tag</button><button class="btn btn-sm" data-a="crmBulk" data-v="untag">Hapus tag</button><button class="btn btn-sm" data-a="crmCek">' + ic('phone', 'ic-sm') + 'Cek nomor WA</button><button class="btn btn-sm" data-a="crmBulk" data-v="optout">Opt-out</button><button class="btn btn-sm" data-a="crmBulk" data-v="optin">Opt-in</button><button class="btn btn-sm btn-danger" data-a="crmBulk" data-v="hapus" title="Hanya kontak manual">' + ic('trash', 'ic-sm') + '</button><button class="link-btn" data-a="crmBatal">Batal</button></div>' : '') +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:34px"><input type="checkbox" style="width:16px;height:16px" data-ch="csemua" ' + (list.length && list.every(k => s.cpilih[k.KontakID]) ? 'checked' : '') + '></th><th>Nama</th><th>WhatsApp</th><th>Email</th><th>Tag</th><th>Pesan</th><th>Status</th><th class="right"></th></tr></thead><tbody>' +
      (list.slice((hal - 1) * PER, hal * PER).map(k => { const grup = /@g\.us$/.test(k.WA) || k.Sumber === 'grup';
        return '<tr class="' + (k.OptOut === 'YA' ? 'dim' : '') + '"><td><input type="checkbox" style="width:16px;height:16px;accent-color:var(--primary)" data-ch="cpilih" data-v="' + attr(k.KontakID) + '" ' + (s.cpilih[k.KontakID] ? 'checked' : '') + '></td><td><b>' + esc(k.Nama) + '</b><div class="t-sub">' + esc(k.Segmen || '-') + ' · ' + esc({ dosen: 'Menu Dosen', grup: 'Grup WA', manual: 'Manual' }[k.Sumber] || k.Sumber) + '</div></td>' +
          '<td class="mono nowrap" style="font-size:12.5px">' + esc(grup ? (k.WA || '—') : waTampil(k.WA)) + (k.StatusWA ? '<div class="t-sub" style="color:' + (k.StatusWA === 'Terdaftar' ? 'var(--ok)' : 'var(--err)') + '">' + esc(k.StatusWA) + '</div>' : '') + '</td><td style="font-size:13px">' + esc(k.Email || '—') + '</td>' +
          '<td>' + String(k.Tag || '').split(',').map(x => x.trim()).filter(Boolean).map(t => '<span class="badge" style="margin:1px">' + esc(t) + '</span>').join('') + '</td><td class="nowrap">' + esc(k.JumlahPesan || '0') + '<div class="t-sub">' + esc(k.TerakhirDihubungi ? relatif(k.TerakhirDihubungi) : '—') + '</div></td>' +
          '<td>' + (k.OptOut === 'YA' ? '<span class="badge warn">Opt-out</span>' : '<span class="badge ok">Aktif</span>') + '</td><td class="right"><button class="btn btn-sm btn-icon" data-a="crmDetail" data-v="' + attr(k.KontakID) + '" title="Detail & interaksi">' + ic('edit', 'ic-sm') + '</button></td></tr>'; }).join('') ||
        '<tr><td colspan="8">' + kosong(all.length ? 'Tidak ada kontak pada filter ini.' : 'Belum ada kontak. Tekan Sinkron untuk menarik data dosen & grup kelas.', 'idcard') + '</td></tr>') + '</tbody></table></div>' +
      (list.length > PER ? pagerHtml(list.length, hal, PER, 'kontak').replace(/data-a="pg"/g, 'data-a="cpg"') : '') + '</div>';
  },
  crmSetel(r) { if (r.success && r.data && r.data.kontak) { this.st.crm = r.data.kontak; } if (r.success && r.data && r.data.interaksi) this.st.inter = r.data.interaksi; if (App.cur === this) this.render(); },

  acts: {
    f(b) { this.st.f = b.dataset.v; this.st.hal = 1; this.render(); },
    pg(b) { this.st.hal = +b.dataset.p; this.render(); },
    rpg(b) { this.st.rhal = +b.dataset.p; this.render(); },
    cpg(b) { this.st.chal = +b.dataset.p; this.render(); },
    kirim(b) { this.kirim(b); },
    lihat(b) { const per = App.perAktif(), jenis = this.jenis(), x = this.targets(per, jenis).find(t => t.key === b.dataset.v); if (x) this.bukaPratinjau(jenis, [x], per); },
    var(b) { sisipDiKursor($('#bl-tpl', this.el), b.dataset.v); },
    tplReset() { delete this.st.tpl[this.jenis()]; this.render(); },
    async tplSimpan(b) {
      const jenis = this.jenis(), k = TPL_WA[jenis], v = this.tpl(jenis);
      const r = await denganSibuk(b, '', () => api('pengaturan.simpan', { nilai: { [k]: v } }));
      if (r.success) { delete this.st.tpl[jenis]; toast('Template disimpan sebagai bawaan.'); this.render(); }
    },
    async perangkat(b) { const r = await denganSibuk(b, 'Memeriksa…', () => api('wa.device', {})); if (r.success) { this.st.dev = r.data; toast(r.message, r.data.status === 'connect' ? 'ok' : 'warn'); this.render(); } },
    tes() {
      Modal.buka({ title: 'Tes kirim WhatsApp', icon: 'send', size: 'sm', body: '<div class="field"><label>Nomor tujuan</label><input class="input" id="ts-no" inputmode="tel" placeholder="08xxxxxxxxxx"><span class="help">Pesan singkat tanpa lampiran dikirim untuk memastikan token & perangkat siap.</span></div>',
        foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('send') + 'Kirim Tes</button>',
        acts: { ok: async (bb, e, m) => { const r = await denganSibuk(bb, 'Mengirim…', () => api('wa.test', { nomor: $('#ts-no').value })); if (r.success) { toast(r.message); m.close(); } } } });
    },
    async batch(b) {
      const s = this.st; if (!s.aktif) return;
      const r = await denganSibuk(b, 'Mengirim…', () => api('wa.blastProses', { blastId: s.aktif }, { timeout: 120000 }));
      if (r.success) { if (r.data.blast) s.status = r.data.blast; toast(r.message, r.data.proses && r.data.proses.info ? 'warn' : 'ok'); this.renderPanel(); }
    },
    async stop(b) {
      const s = this.st;
      if (!(await konfirmasi('Hentikan pengiriman? Pesan yang belum terkirim dibatalkan (yang sudah terkirim tidak terpengaruh).', { danger: true, ok: 'Hentikan' }))) return;
      const r = await denganSibuk(b, '', () => api('wa.blastStop', { blastId: s.aktif }));
      if (r.success) { s.status = r.data.blast; toast(r.message); this.renderPanel(); this.muatSiap(true); }
    },
    async ulang(b) {
      const s = this.st;
      const r = await denganSibuk(b, '', () => api('wa.ulangGagal', { blastId: s.aktif }));
      if (r.success) { s.status = r.data.blast; toast(r.message); this.renderPanel(); this.pantau(); }
    },
    async ulangSemua(b) {
      const per = App.perAktif(), bl = DB.rows('BlastWA').filter(x => x.Periode === per && num(x.Gagal) > 0);
      if (!bl.length) { toast('Tidak ada blast dengan pesan gagal di periode ini.', 'info'); return; }
      if (!(await konfirmasi('Kirim ulang semua pesan gagal pada ' + bl.length + ' blast di ' + esc(Dom.perLabel(per)) + '?', { ok: 'Kirim Ulang', icon: 'refresh' }))) return;
      let akhir = null;
      await denganSibuk(b, 'Memproses…', async () => { for (const x of bl) { const r = await api('wa.ulangGagal', { blastId: x.BlastID }, { silent: true }); if (r.success) akhir = x.BlastID; } });
      if (akhir) { toast('Pesan gagal dimasukkan kembali ke antrean.'); this.mulaiPantau(akhir); }
    },
    tutupPanel() { const s = this.st; s.aktif = null; s.status = null; LS.del('pa:blast'); this.render(); },
    pantauB(b) { const s = this.st; s.aktif = b.dataset.v; s.status = null; LS.set('pa:blast', s.aktif); App.nav(b.dataset.j === 'JADWAL_KELAS' ? 'blast/jadwal' : 'blast/st'); },
    async xlsRiw() {
      const s = this.st, t = s.riw; if (!t) return;
      const kol = ['Waktu', 'Jenis', 'Tujuan', 'Nomor', 'Status', 'Percobaan', 'Keterangan', 'DikirimPada', 'Pesan'];
      await Excel.tulis('Log Blast WA ' + isoTgl(), [{ nama: 'Log Pengiriman', rows: [kol].concat(t.r.map(r => kol.map(k => String(r[t.h.indexOf(k)] === undefined ? '' : r[t.h.indexOf(k)])))), lebar: [18, 14, 34, 18, 11, 9, 40, 18, 60] }]);
    },
    crmSync(b) { denganSibuk(b, 'Sinkron…', () => api('crm.sync', {})).then(r => { if (r.success) { toast(r.message); this.muatCrm(); } }); },
    crmBatal() { this.st.cpilih = {}; this.render(); },
    async crmBulk(b) {
      const s = this.st, ids = Object.keys(s.cpilih).filter(k => s.cpilih[k]), aksi = b.dataset.v;
      let nilai = '';
      if (aksi === 'tag' || aksi === 'untag') { nilai = prompt(aksi === 'tag' ? 'Tag yang ditambahkan:' : 'Tag yang dihapus:', ''); if (!nilai) return; }
      if (aksi === 'hapus' && !(await konfirmasi('Hapus kontak manual terpilih? Kontak dari menu Dosen/grup tidak ikut terhapus.', { danger: true, ok: 'Hapus' }))) return;
      const r = await denganSibuk(b, '', () => api('crm.bulk', { ids, aksi, nilai }));
      if (r.success) { toast(r.message); s.cpilih = {}; this.crmSetel(r); }
    },
    async crmCek(b) {
      const s = this.st, all = this.crmRows(), nomor = all.filter(k => s.cpilih[k.KontakID] && k.WA && !/@g\.us$/.test(k.WA)).map(k => k.WA);
      if (!nomor.length) { toast('Pilih kontak bernomor WA (bukan grup).', 'warn'); return; }
      if (nomor.length > 50) toast('Maksimal 50 nomor per pengecekan — 50 nomor pertama diperiksa.', 'info');
      const r = await denganSibuk(b, 'Memeriksa…', () => api('wa.validate', { nomor: nomor.slice(0, 50) }));
      if (r.success) { toast(r.message); this.muatCrm(true); }
    },
    async crmEkspor() {
      const kol = ['Nama', 'WA', 'Email', 'Segmen', 'Sumber', 'Tag', 'StatusWA', 'OptOut', 'JumlahPesan', 'TerakhirDihubungi', 'Catatan'];
      await Excel.tulis('Kontak CRM ' + isoTgl(), [{ nama: 'Kontak', rows: [kol].concat(this.crmRows().map(k => kol.map(c => String(k[c] || '')))), lebar: [30, 18, 26, 14, 10, 20, 14, 8, 10, 18, 30] }]);
    },
    async crmImpor() {
      const f = await pilihBerkas('.xlsx,.xls,.csv'); if (!f) return;
      let rows; try { rows = Excel.peta(await Excel.baca(f), SINONIM_CRM); } catch (e) { toast(e.message, 'err'); return; }
      if (!rows.length) { toast('Tidak ada baris yang terbaca. Pastikan ada kolom Nama dan WA.', 'err'); return; }
      if (!(await konfirmasi('Impor ' + rows.length + ' kontak dari ' + esc(f.name) + '?\nNomor yang sudah ada dilewati.', { ok: 'Impor', icon: 'upload' }))) return;
      const r = await api('crm.import', { rows: rows.map(o => ({ Nama: o.Nama, WA: o.WA, Email: o.Email, Segmen: o.Segmen, Tag: o.Tag })) });
      if (r.success) { toast(r.message); this.crmSetel(r); if (r.data.ditolak.length) Modal.buka({ title: r.data.ditolak.length + ' baris ditolak', icon: 'alert', size: 'sm', body: '<ul style="margin-left:18px">' + r.data.ditolak.slice(0, 60).map(x => '<li>Baris ' + x.baris + ': ' + esc(x.alasan) + '</li>').join('') + '</ul>', foot: '<button class="btn btn-primary" data-close>Tutup</button>' }); }
    },
    crmTambah() {
      Modal.buka({ title: 'Tambah kontak', icon: 'idcard', size: 'sm',
        body: '<div class="stack" style="gap:12px"><div class="field"><label>Nama</label><input class="input" id="ck-nama"></div><div class="field"><label>Nomor WhatsApp</label><input class="input" id="ck-wa" inputmode="tel" placeholder="08xxxxxxxxxx"></div><div class="field"><label>Email (opsional)</label><input class="input" id="ck-email" type="email"></div><div class="field"><label>Segmen</label><input class="input" id="ck-seg" value="Manual" list="ck-segl"><datalist id="ck-segl"><option>Manual</option><option>Pimpinan</option><option>Tendik</option><option>Mitra</option></datalist></div><div class="field"><label>Tag (pisahkan koma)</label><input class="input" id="ck-tag"></div></div>',
        foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('save') + 'Simpan</button>',
        acts: { ok: async (bb, e, m) => { const k = { _baru: true, Nama: $('#ck-nama').value.trim(), WA: $('#ck-wa').value, Email: $('#ck-email').value.trim(), Segmen: $('#ck-seg').value.trim(), Tag: $('#ck-tag').value.trim() }; if (!waValid(k.WA)) { toast('Nomor WA tidak valid (contoh 081234567890).', 'err'); return; } const r = await denganSibuk(bb, '', () => api('crm.simpan', { kontak: k })); if (r.success) { toast(r.message); m.close(); this.crmSetel(r); } } } });
    },
    crmDetail(b) {
      const s = this.st, k = this.crmRows().find(x => x.KontakID === b.dataset.v); if (!k) return;
      const it = s.inter ? s.inter.r.map(r => { const o = {}; s.inter.h.forEach((h, i) => { o[h] = r[i]; }); return o; }).filter(o => o.KontakID === k.KontakID).reverse() : [];
      Modal.buka({ title: esc(k.Nama), sub: esc((k.Segmen || '') + ' · ' + (/@g\.us$/.test(k.WA) ? k.WA : waTampil(k.WA))), icon: 'idcard',
        body: '<div class="fgrid c2"><div class="field"><label>Email</label><input class="input" id="cd-email" value="' + attr(k.Email) + '"></div><div class="field"><label>Tag</label><input class="input" id="cd-tag" value="' + attr(k.Tag) + '"></div></div>' +
          '<div class="field" style="margin-top:12px"><label>Catatan</label><textarea class="input" id="cd-cat">' + esc(k.Catatan) + '</textarea></div>' +
          '<label class="row gap-s" style="margin-top:12px;cursor:pointer"><span class="switch"><input type="checkbox" id="cd-opt" ' + (k.OptOut === 'YA' ? 'checked' : '') + '><i></i></span><span>Opt-out (jangan kirimi blast)</span></label>' +
          '<div class="lbl" style="margin:18px 0 6px">Riwayat interaksi</div>' + (it.length ? it.slice(0, 20).map(o => '<div style="padding:8px 0;border-bottom:1px solid var(--border)"><div class="row gap-s"><span class="badge info">' + esc(o.Kanal) + '</span><small class="muted">' + esc(fmtWaktu(o.Tanggal)) + ' · ' + esc(o.Oleh) + '</small></div><div style="margin-top:4px;font-size:13.5px">' + esc(o.Ringkasan) + '</div></div>').join('') : '<p class="faint">Belum ada catatan interaksi.</p>') +
          '<div class="row" style="margin-top:10px;flex-wrap:nowrap"><select class="input" id="cd-kanal" style="width:130px">' + opsi(['WhatsApp', 'Telepon', 'Tatap muka', 'Email', 'Catatan'], 'Catatan') + '</select><input class="input" id="cd-ring" placeholder="Ringkasan interaksi…"><button class="btn" data-a="tambahInt">' + ic('plus') + '</button></div>',
        foot: '<button class="btn" data-close>Tutup</button><button class="btn btn-primary" data-a="ok">' + ic('save') + 'Simpan</button>',
        acts: {
          ok: async (bb, e, m) => { const r = await denganSibuk(bb, '', () => api('crm.simpan', { kontak: { KontakID: k.KontakID, Email: $('#cd-email').value.trim(), Tag: $('#cd-tag').value.trim(), Catatan: $('#cd-cat').value, OptOut: $('#cd-opt').checked ? 'YA' : 'TIDAK' } })); if (r.success) { toast(r.message); m.close(); this.crmSetel(r); } },
          tambahInt: async (bb, e, m) => { const r = await denganSibuk(bb, '', () => api('crm.interaksi', { kontakId: k.KontakID, kanal: $('#cd-kanal').value, ringkasan: $('#cd-ring').value })); if (r.success) { toast(r.message); s.inter = r.data.interaksi; m.close(); this.acts.crmDetail.call(this, b); } }
        } });
    }
  },
  ch: {
    semua(t) { const per = App.perAktif(), jenis = this.jenis(), pil = this.pilihan(jenis); this.saring(this.targets(per, jenis)).filter(x => x.waOk).forEach(x => { pil[x.key] = t.checked; }); this.render(); },
    pilih(t) { this.pilihan(this.jenis())[t.dataset.v] = t.checked; this.render(); },
    auto(t) { this.st.auto = t.checked; if (t.checked) this.pantau(); },
    rjenis(t) { this.st.rf.jenis = t.value; this.muatRiw(); },
    rdari(t) { this.st.rf.dari = t.value; this.muatRiw(); },
    rsampai(t) { this.st.rf.sampai = t.value; this.muatRiw(); },
    cseg(t) { this.st.cseg = t.value; this.st.chal = 1; this.render(); },
    cpilih(t) { this.st.cpilih[t.dataset.v] = t.checked; this.render(); },
    csemua(t) { const s = this.st; this.crmRows().filter(k => (!s.cseg || k.Segmen === s.cseg) && cocok(k.Nama + ' ' + k.WA + ' ' + k.Email + ' ' + k.Tag, s.cq)).forEach(k => { s.cpilih[k.KontakID] = t.checked; }); this.render(); }
  },
  inp: {
    q: debounce(function (t) { this.st.q = t.value; this.st.hal = 1; this.render(); const i = $('[data-in="q"]', this.el); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250),
    cq: debounce(function (t) { this.st.cq = t.value; this.st.chal = 1; this.render(); const i = $('[data-in="cq"]', this.el); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250),
    tpl(t) {
      const s = this.st, jenis = this.jenis(); s.tpl[jenis] = t.value;
      const per = App.perAktif(), list = this.targets(per, jenis), pv = $('#bl-prev', this.el);
      if (pv) pv.innerHTML = this.vPrev(jenis, this.contoh(list, this.pilihan(jenis)));
    }
  }
});

/* =====================================================================
   PENGATURAN (khusus Admin Utama)
   ===================================================================== */
const TAB_SET = [['periode', 'Periode & Semester', 'cal'], ['prodi', 'Prodi & Kelas', 'building'], ['jam', 'Jam Sesi', 'clock'], ['surat', 'Surat Tugas & Identitas', 'filetext'], ['kop', 'Kop Surat & Tata Cetak', 'image'], ['wa', 'WhatsApp (Fonnte)', 'wa'], ['sumber', 'Sumber Data & Verifikasi', 'database'], ['akun', 'Kelola Akun', 'users'], ['migrasi', 'Impor & Cadangan', 'upload'], ['sistem', 'Sistem & Log', 'activity']];
const HARI_JAM = ['Senin-Jumat', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const SHEET_MIGRASI = [['Dosen', 'Nama, NIDN, WA, Keterangan'], ['Kitab', 'Nama kitab'], ['Kurikulum', 'Angkatan, Prodi, Kelas, Semester, Kode MK, Nama MK, Nama Arab, SKS, Tahfidz'], ['GrupWA', 'Prodi, Angkatan, Kelas, ID Grup, Nama Grup'], ['Kalender', 'T.A., Semester, Kegiatan, Mulai, Selesai'], ['Agenda', 'Judul, Catatan, Mulai, Batas']];
function jamKeInput(v) { return String(v || '').replace('.', ':'); }
function jamDariInput(v) { return String(v || '').replace(':', '.'); }
function nomorContoh(fmt, n, tanggal) {
  const d = tgl(tanggal) || new Date(), r = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return String(fmt || '').replace(/\{nomor3\}/g, String(n).padStart(3, '0')).replace(/\{nomor\}/g, String(n)).replace(/\{bulan_romawi\}/g, r[d.getMonth()]).replace(/\{bulan\}/g, String(d.getMonth() + 1).padStart(2, '0')).replace(/\{tahun\}/g, d.getFullYear());
}
function perBerikut(p) { const y = parseInt(p.ta, 10); return p.smt === 'Ganjil' ? { ta: p.ta, smt: 'Genap' } : { ta: (y + 1) + '/' + (y + 2), smt: 'Ganjil' }; }

defPage('pengaturan', {
  admin: true, deps: ['Pengaturan', 'Prodi', 'Kelas', 'JamSesi', 'Users', 'GrupWA', 'Aset', 'Angkatan'], refreshTabel: ['Pengaturan', 'Prodi', 'Kelas', 'JamSesi', 'Users', 'GrupWA'],
  st: { tab: 'periode', nilai: {}, prodi: {}, kelas: {}, jam: null, grup: null, gprodi: '', waGrup: null, dev: null, status: null, log: null, lq: '', lhal: 1, rekap: null, mig: { url: '', pilih: ['Dosen', 'Kitab', 'Kurikulum', 'GrupWA', 'Kalender', 'Agenda'], timpa: false, hasil: null, kunci: '' } },
  onParams(p) { this.st.tab = TAB_SET.some(t => t[0] === p[0]) ? p[0] : 'periode'; },
  judulMenu() { const t = TAB_SET.find(x => x[0] === this.st.tab); return 'Pengaturan · ' + (t ? t[1] : ''); },
  asli(k) { const r = DB.get('Pengaturan', 'Kunci', k); return r ? String(r.Nilai) : ''; },
  v(k, d) { const n = this.st.nilai, x = Object.prototype.hasOwnProperty.call(n, k) ? n[k] : this.asli(k); return x === '' && d !== undefined ? d : x; },
  setNilai(k, val) { val = String(val); if (val === this.asli(k)) delete this.st.nilai[k]; else this.st.nilai[k] = val; App.savebar(this); },
  isDirty() { const s = this.st; return !!(Object.keys(s.nilai).length || Object.keys(s.prodi).length || Object.keys(s.kelas).length || s.jam || s.grup); },
  dirtyInfo() {
    const s = this.st, p = [];
    if (Object.keys(s.nilai).length) p.push(Object.keys(s.nilai).length + ' nilai pengaturan');
    if (Object.keys(s.prodi).length) p.push(Object.keys(s.prodi).length + ' prodi');
    if (Object.keys(s.kelas).length) p.push(Object.keys(s.kelas).length + ' kelas');
    if (s.jam) p.push('jam sesi'); if (s.grup) p.push('pemetaan grup WA');
    return { judul: 'Pengaturan belum disimpan', sub: p.join(' · ') };
  },
  buang() { const s = this.st; s.nilai = {}; s.prodi = {}; s.kelas = {}; s.jam = null; s.grup = null; this.render(); },
  async simpan(btn) {
    const s = this.st;
    const ok = await denganSibuk(btn, 'Menyimpan…', async () => {
      const urut = [];
      if (Object.keys(s.prodi).length) urut.push(['prodi.simpan', () => ({ prodi: Object.values(s.prodi) }), () => { s.prodi = {}; }]);
      if (Object.keys(s.kelas).length) urut.push(['kelas.simpan', () => ({ kelas: Object.values(s.kelas) }), () => { s.kelas = {}; }]);
      if (s.jam) urut.push(['jamsesi.simpan', () => ({ sesi: s.jam }), () => { s.jam = null; }]);
      if (s.grup) urut.push(['grupwa.simpan', () => ({ pemetaan: Object.values(s.grup) }), () => { s.grup = null; }]);
      if (Object.keys(s.nilai).length) urut.push(['pengaturan.simpan', () => ({ nilai: s.nilai }), () => { s.nilai = {}; }]);
      for (const [a, data, bersih] of urut) {
        let r = await api(a, data(), { silent: true });
        if (!r.success && a === 'pengaturan.simpan' && /lebih kecil dari nomor/.test(r.message) && await konfirmasi(esc(r.message) + '\n\nTetap simpan?', { danger: true, ok: 'Tetap simpan' })) r = await api(a, Object.assign(data(), { paksa: true }), { silent: true });
        if (!r.success) { toast(r.message, 'err'); return false; }
        bersih();
      }
      return true;
    });
    if (ok) toast('Pengaturan tersimpan dan langsung berlaku di semua menu.');
    this.render(); App.savebar(this);
    return ok;
  },
  render() {
    const s = this.st;
    let h = kepala({ crumb: ['Lainnya', 'Pengaturan'], judul: 'Pengaturan &amp; Konfigurasi Sistem', badge: ' <span class="badge orange">' + ic('shield', 'ic-sm') + 'Khusus Admin Utama</span>',
      desc: 'Parameter periode akademik, program studi & kelas, jam sesi, format surat tugas, integrasi WhatsApp & Rekap Mahasiswa, serta akun pengguna. Rahasia (token, ID spreadsheet) disimpan di Script Properties server dan hanya tampil tersamar.',
      aksi: btnRefresh(false) + (this.isDirty() ? '<button class="btn btn-primary" data-a="simpanSemua">' + ic('save') + 'Simpan Semua Perubahan</button>' : '') }) +
      '<div class="tabs">' + TAB_SET.map(t => '<button class="' + (s.tab === t[0] ? 'on' : '') + '" data-a="nav" data-to="pengaturan/' + t[0] + '">' + ic(t[2], 'ic-sm') + t[1] + '</button>').join('') + '</div>';
    h += this['v_' + s.tab]();
    this.el.innerHTML = h;
    if (s.tab === 'kop') requestAnimationFrame(() => this.kopZoom());
  },
  inputSet(k, o) { o = o || {}; return '<input class="input' + (o.mono ? ' mono' : '') + '" data-in="set" data-k="' + k + '" value="' + attr(this.v(k)) + '"' + (o.ph ? ' placeholder="' + attr(o.ph) + '"' : '') + (o.type ? ' type="' + o.type + '"' : '') + (o.dir ? ' dir="' + o.dir + '"' : '') + '>'; },
  switchSet(k, label, sub, dis) { return '<label class="row" style="flex-wrap:nowrap;cursor:pointer;padding:10px 0;border-bottom:1px solid var(--border)"><div style="flex:1;min-width:0"><b style="font-size:14px">' + label + '</b>' + (sub ? '<div class="t-sub muted">' + sub + '</div>' : '') + '</div><span class="switch"><input type="checkbox" data-ch="ya" data-k="' + k + '" ' + (this.v(k) === 'YA' ? 'checked' : '') + (dis ? ' disabled' : '') + '><i></i></span></label>'; },
  rahasiaRow(k, label, help) {
    const m = (DB.meta('Pengaturan') || {})[k] || {};
    return '<div class="field" style="margin-bottom:12px"><label>' + label + ' <span class="badge sq ' + (m.ada ? 'ok' : 'warn') + '">' + (m.ada ? 'Tersimpan' : 'Belum diisi') + '</span></label><div class="row" style="flex-wrap:nowrap"><div class="input mono" style="background:var(--surface-2);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">' + (m.ada ? esc(m.samar) : '<span class="faint">—</span>') + '</div>' +
      '<button class="btn" data-a="rahasia" data-k="' + k + '">' + ic('key', 'ic-sm') + (m.ada ? 'Ganti' : 'Isi') + '</button>' + (m.ada ? '<button class="btn btn-icon" data-a="rahasiaHapus" data-k="' + k + '" title="Hapus">' + ic('trash', 'ic-sm') + '</button>' : '') + '</div>' + (help ? '<span class="help">' + help + '</span>' : '') + '</div>';
  },

  /* ---------- 1. Periode ---------- */
  v_periode() {
    const yr = parseInt(App.periode.berjalan.ta, 10) || new Date().getFullYear(), tas = []; for (let y = yr - 3; y <= yr + 2; y++) tas.push(y + '/' + (y + 1));
    const tglObj = (() => { try { return JSON.parse(this.v('PERIODE_TANGGAL', '{}')); } catch (e) { return {}; } })(), hariReg = this.v('REGULER_HARI', 'Senin,Selasa,Rabu,Kamis,Jumat').split(',').map(x => x.trim());
    const kartu = (jenis, judul, sub, kTa, kSmt) => {
      const ta = this.v(kTa), smt = this.v(kSmt), key = ta + ' ' + smt, r = tglObj[key] || {};
      return '<div class="card"><div class="card-h"><div><small class="lbl" style="letter-spacing:.06em;text-transform:uppercase">' + sub + '</small><h3>' + judul + '</h3></div><span class="sp"></span>' +
        (jenis === 'disusun' ? '<label class="row gap-s" style="cursor:pointer"><small class="muted">Mode penyusunan</small><span class="switch"><input type="checkbox" data-ch="ya" data-k="MODE_PERSIAPAN" ' + (this.v('MODE_PERSIAPAN') === 'YA' ? 'checked' : '') + '><i></i></span></label>' : '<span class="badge ok dot">Aktif berjalan</span>') + '</div>' +
        '<div class="card-b' + (jenis === 'disusun' && this.v('MODE_PERSIAPAN') !== 'YA' ? '" style="opacity:.55' : '') + '"><div class="fgrid c2"><div class="field"><label>Tahun akademik</label><select class="input" data-ch="setr" data-k="' + kTa + '">' + opsi(tas.includes(ta) ? tas : tas.concat([ta]), ta) + '</select></div>' +
        '<div class="field"><label>Semester</label><select class="input" data-ch="setr" data-k="' + kSmt + '">' + opsi([{ v: 'Ganjil', l: 'Ganjil (Gasal)' }, { v: 'Genap', l: 'Genap' }], smt) + '</select></div>' +
        '<div class="field"><label>Tanggal mulai perkuliahan</label><input type="date" class="input" data-ch="tglPer" data-key="' + attr(key) + '" data-f="mulai" value="' + attr(r.mulai || '') + '"></div>' +
        '<div class="field"><label>Tanggal selesai (UAS)</label><input type="date" class="input" data-ch="tglPer" data-key="' + attr(key) + '" data-f="selesai" value="' + attr(r.selesai || '') + '"></div></div>' +
        '<div class="alert info" style="margin:12px 0 0">' + ic('info') + '<div>' + (jenis === 'berjalan' ? 'Dipakai sebagai periode aktif di Ringkasan, Cetak Dokumen, dan Blast WhatsApp.' : 'Semester yang sedang disusun dipakai menu Kurikulum, Realisasi, Generate Jadwal & Ujian. Kepala halaman menampilkan dua periode selama mode penyusunan aktif.') + '</div></div></div></div>';
    };
    const sama = this.v('MODE_PERSIAPAN') === 'YA' && this.v('TA_BERJALAN') + this.v('SMT_BERJALAN') === this.v('TA_DISUSUN') + this.v('SMT_DISUSUN');
    return (sama ? '<div class="alert warn">' + ic('alert') + '<div>Semester berjalan dan semester yang disusun sama. Matikan mode penyusunan atau pilih semester berikutnya.</div></div>' : '') +
      '<div class="grid2">' + kartu('berjalan', 'Semester Berjalan', 'Operasional utama', 'TA_BERJALAN', 'SMT_BERJALAN') + kartu('disusun', 'Semester yang Sedang Disusun', 'Persiapan mendatang', 'TA_DISUSUN', 'SMT_DISUSUN') + '</div>' +
      '<div class="grid2" style="margin-top:16px"><div class="card card-b"><b>Hari kuliah pola Reguler</b><p class="muted" style="font-size:13px;margin:4px 0 10px">Hari yang dipakai generator jadwal & ujian Reguler (termasuk Ma\'had Aly).</p><div class="row gap-s">' +
      ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(hh => '<button class="chip ' + (hariReg.includes(hh) ? 'on' : '') + '" data-a="hariReg" data-v="' + hh + '">' + hh + '</button>').join('') + '</div></div>' +
      '<div class="card card-b"><b>Pergantian semester</b><p class="muted" style="font-size:13px;margin:4px 0 10px">Jadikan semester yang disusun sebagai semester berjalan, lalu siapkan semester berikutnya. Data semester lama tetap tersimpan dan dapat diarsipkan.</p><button class="btn btn-soft" data-a="majukan">' + ic('arrowr') + 'Majukan Semester</button></div></div>';
  },

  /* ---------- 2. Prodi & Kelas ---------- */
  prodiList() { const s = this.st, m = new Map(DB.rows('Prodi').map(p => [p.Kode, Object.assign({}, p)])); Object.values(s.prodi).forEach(p => m.set(p.Kode, Object.assign({}, m.get(p.Kode) || {}, p))); return [...m.values()].sort(by(p => num(p.Urutan, 99))); },
  kelasList() { const s = this.st, m = new Map(DB.rows('Kelas').map(k => [k.Nama, Object.assign({}, k)])); Object.values(s.kelas).forEach(k => m.set(k.Nama, Object.assign({}, m.get(k.Nama) || {}, k))); return [...m.values()].sort(by(k => num(k.Urutan, 99))); },
  v_prodi() {
    const s = this.st, pr = this.prodiList(), kl = this.kelasList();
    return '<div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr))"><div class="card"><div class="card-h"><h3>' + ic('building') + 'Program Studi</h3><span class="badge">' + pr.length + ' prodi</span><span class="sp"></span><button class="btn btn-sm btn-soft" data-a="prodiEdit" data-v="">' + ic('plus', 'ic-sm') + 'Tambah Prodi</button></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kode</th><th>Nama Program Studi</th><th>Jenjang</th><th>Urutan</th><th>Status</th><th class="right"></th></tr></thead><tbody>' +
      pr.map(p => '<tr class="' + (s.prodi[p.Kode] ? 'kotor' : '') + '"><td><span class="badge sq" style="background:' + attr(p.Warna || '#1E3A8A') + ';color:#fff">' + esc(p.Kode) + '</span></td><td><b>' + esc(p.Nama) + '</b>' + (p.NamaArab ? '<div class="arab" style="font-size:14px;color:var(--text-2)">' + esc(p.NamaArab) + '</div>' : '') + '</td><td>' + esc(p.Jenjang || 'S1') + '</td><td>' + esc(p.Urutan) + '</td>' +
        '<td>' + (p.Aktif === 'TIDAK' ? '<span class="badge">Nonaktif</span>' : '<span class="badge ok">Aktif</span>') + '</td><td class="right"><button class="btn btn-sm btn-icon" data-a="prodiEdit" data-v="' + attr(p.Kode) + '">' + ic('edit', 'ic-sm') + '</button></td></tr>').join('') + '</tbody></table></div>' +
      '<div class="card-b"><span class="help">Nama prodi ditulis lengkap tanpa singkatan (dipakai di kop & dokumen). Kode prodi tidak dapat diubah setelah dipakai.</span></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('layers') + 'Program Kelas</h3><span class="badge">' + kl.length + ' kelas</span><span class="sp"></span><button class="btn btn-sm btn-soft" data-a="kelasEdit" data-v="">' + ic('plus', 'ic-sm') + 'Tambah Kelas</button></div><div class="card-b stack" style="gap:10px">' +
      kl.map(k => '<div class="row" style="flex-wrap:nowrap;padding:10px 12px;border:1px solid var(--border);border-radius:12px;border-left:4px solid ' + attr(k.Warna || '#1E3A8A') + (s.kelas[k.Nama] ? ';box-shadow:inset 3px 0 0 var(--accent)' : '') + '"><div style="flex:1;min-width:0"><div class="row gap-s"><b>' + esc(k.Nama) + '</b><span class="badge ' + (k.Pola === 'Hybrid' ? 'orange' : k.Pola === 'Reguler' ? 'info' : 'err') + '">' + (k.Pola === 'Tidak dijadwalkan' ? 'Tidak dijadwalkan' : 'Pola ' + esc(k.Pola)) + '</span><span class="faint mono" style="font-size:11.5px">' + esc(k.Kode) + '</span></div>' +
        '<div class="t-sub muted">Prodi: ' + esc(String(k.Prodi || '').split(',').map(x => x.trim()).filter(Boolean).join(', ') || '—') + '</div></div>' + (k.Aktif === 'TIDAK' ? '<span class="badge">Nonaktif</span>' : '<span class="badge ok">Aktif</span>') + '<button class="btn btn-sm btn-icon" data-a="kelasEdit" data-v="' + attr(k.Nama) + '">' + ic('edit', 'ic-sm') + '</button></div>').join('') +
      '<span class="help">Pola jam menentukan batasan slot, bentrok dosen, dan tampilan jadwal. Kelas "Tidak dijadwalkan" (mis. Khusus/Konversi) hanya dibaca di menu Mahasiswa & Ringkasan.</span></div></div></div>';
  },

  /* ---------- 3. Jam sesi ---------- */
  jamKerja() { return this.st.jam || DB.rows('JamSesi').map(j => ({ Pola: j.Pola, Hari: j.Hari, Sesi: String(j.Sesi), Mulai: j.Mulai, Selesai: j.Selesai, Label: j.Label || '' })); },
  v_jam() {
    const jam = this.jamKerja(), uj = (() => { try { const x = JSON.parse(this.v('UJIAN_SESI', '[]')); return Array.isArray(x) ? x : []; } catch (e) { return []; } })();
    const tbl = (pola) => {
      const rows = jam.map((j, i) => Object.assign({ _i: i }, j)).filter(j => j.Pola === pola).sort((a, b) => HARI_JAM.indexOf(a.Hari) - HARI_JAM.indexOf(b.Hari) || num(a.Sesi) - num(b.Sesi));
      return '<div class="card"><div class="card-h"><h3>' + ic(pola === 'Hybrid' ? 'moonstar' : 'sun') + 'Pola ' + pola + '</h3><span class="badge ' + (pola === 'Hybrid' ? 'orange' : 'info') + '">' + rows.length + ' baris sesi</span><span class="sp"></span><button class="btn btn-sm btn-soft" data-a="jamTambah" data-v="' + pola + '">' + ic('plus', 'ic-sm') + 'Tambah Sesi</button></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Hari</th><th style="width:70px">Sesi</th><th>Mulai</th><th>Selesai</th><th>Durasi</th><th>Label</th><th></th></tr></thead><tbody>' +
        (rows.map(j => { const dur = Dom.menit(j.Selesai) - Dom.menit(j.Mulai);
          return '<tr><td><select class="input sm" data-ch="jam" data-i="' + j._i + '" data-f="Hari">' + opsi(HARI_JAM.map(x => ({ v: x, l: x === 'Senin-Jumat' ? 'Setiap hari pola' : x })), j.Hari) + '</select></td><td><input class="input sm" type="number" min="1" max="12" data-ch="jam" data-i="' + j._i + '" data-f="Sesi" value="' + attr(j.Sesi) + '"></td>' +
            '<td><input class="input sm" type="time" data-ch="jam" data-i="' + j._i + '" data-f="Mulai" value="' + attr(jamKeInput(j.Mulai)) + '"></td><td><input class="input sm" type="time" data-ch="jam" data-i="' + j._i + '" data-f="Selesai" value="' + attr(jamKeInput(j.Selesai)) + '"></td>' +
            '<td><span class="badge ' + (dur > 0 ? 'info' : 'err') + '">' + (dur > 0 ? dur + ' mnt' : 'tidak valid') + '</span></td><td><input class="input sm" data-ch="jam" data-i="' + j._i + '" data-f="Label" value="' + attr(j.Label) + '" placeholder="opsional"></td>' +
            '<td><button class="btn btn-sm btn-icon" data-a="jamHapus" data-v="' + j._i + '" title="Hapus">' + ic('trash', 'ic-sm') + '</button></td></tr>'; }).join('') || '<tr><td colspan="7">' + kosong('Belum ada sesi.', 'clock') + '</td></tr>') + '</tbody></table></div></div>';
    };
    return '<div class="alert info">' + ic('info') + '<div>Baris "Setiap hari pola" berlaku untuk semua hari kuliah pola tersebut. Bila satu hari punya jam berbeda (mis. Jumat), buat baris khusus hari itu untuk <b>semua</b> sesinya — baris khusus menggantikan jam umum pada hari tersebut. Perubahan langsung berlaku di generator, cetak, dan deteksi bentrok.</div></div>' +
      '<div class="stack">' + tbl('Reguler') + tbl('Hybrid') +
      '<div class="card"><div class="card-h"><h3>' + ic('clipboard') + 'Sesi Ujian Pola Reguler</h3><span class="sp"></span><button class="btn btn-sm btn-soft" data-a="ujTambah">' + ic('plus', 'ic-sm') + 'Tambah Sesi Ujian</button><div class="sub">Ujian Hybrid & IAT mengikuti jam kuliahnya; ujian Reguler/Ma\'had memakai sesi di bawah (90 menit).</div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:70px">Sesi</th><th>Mulai</th><th>Selesai</th><th>Durasi</th><th></th></tr></thead><tbody>' +
      uj.map((u, i) => '<tr><td><b>' + esc(u.sesi) + '</b></td><td><input class="input sm" type="time" data-ch="uj" data-i="' + i + '" data-f="mulai" value="' + attr(jamKeInput(u.mulai)) + '"></td><td><input class="input sm" type="time" data-ch="uj" data-i="' + i + '" data-f="selesai" value="' + attr(jamKeInput(u.selesai)) + '"></td><td><span class="badge info">' + (Dom.menit(u.selesai) - Dom.menit(u.mulai)) + ' mnt</span></td><td><button class="btn btn-sm btn-icon" data-a="ujHapus" data-v="' + i + '">' + ic('trash', 'ic-sm') + '</button></td></tr>').join('') + '</tbody></table></div></div></div>';
  },

  /* ---------- 4. Surat tugas & kop ---------- */
  /* ---------- Kop Surat & Tata Cetak (v1.1) ---------- */
  kopBarisKerja() {
    const raw = this.v('KOP_BARIS', '');
    let js = null; try { js = raw ? JSON.parse(raw) : null; } catch (e) { js = null; }
    return Array.isArray(js) && js.length ? js.map(b => Object.assign({ teks: '', ukuran: 10, tebal: false, miring: false, arab: false, warna: '#111827' }, b)) : Doc.kopBawaan().map(b => Object.assign({ tebal: false, miring: false, arab: false }, b));
  },
  kopCfgKerja() { return { mode: this.v('KOP_MODE', 'bawaan'), baris: this.kopBarisKerja(), garis: this.v('KOP_GARIS', 'ganda'), logo: this.v('KOP_LOGO', 'kiri'), rata: this.v('KOP_RATA', 'tengah'), mm: num(this.v('KOP_LOGO_MM', '22'), 22), tinggi: num(this.v('KOP_TINGGI', '30'), 30) }; },
  kopPratinjau() { return '<div class="kop-kertas"><div class="kop-in">' + Doc.kopDari(this.kopCfgKerja()) + '<div class="kop-isi"><div></div><div></div><div style="width:70%"></div><div></div><div style="width:55%"></div></div></div></div>'; },
  kopSegarkan() { const el = $('#kop-pv', this.el); if (el) { el.innerHTML = this.kopPratinjau(); this.kopZoom(); } },
  kopZoom() { const w = $('#kop-pv', this.el); const k = w && w.querySelector('.kop-kertas'); if (!k) return; k.style.zoom = ''; const cs = getComputedStyle(w), z = Math.min(1, (w.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2) / k.offsetWidth); k.style.zoom = z > 0 ? z : 1; },
  v_kop() {
    const aset = DB.raw.Aset || {}, mode = this.v('KOP_MODE', 'bawaan'), baris = this.kopBarisKerja(), pos = this.v('KOP_LOGO', 'kiri'), tata = Dom.setJson('TATA_CETAK', {}) || {};
    const kustom = !!this.v('KOP_BARIS', '');
    const seg = (k, list, nilai) => '<div class="seg">' + list.map(x => '<button data-a="kopSet" data-k="' + k + '" data-v="' + x[0] + '" class="' + (nilai === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>';
    const editor = '<div class="kop-baris">' + baris.map((b, i) => '<div class="kb-row">' +
        '<input class="input" data-in="kopTeks" data-i="' + i + '" value="' + attr(b.teks) + '" placeholder="Teks baris ' + (i + 1) + '"' + (b.arab ? ' dir="rtl" style="font-family:var(--arab);font-size:16px"' : '') + '>' +
        '<div class="kb-tools"><input class="input sm" type="number" min="5" max="40" step="0.5" data-ch="kopUk" data-i="' + i + '" value="' + attr(b.ukuran) + '" title="Ukuran huruf (pt)" style="width:68px">' +
        '<button class="btn btn-sm btn-icon' + (b.tebal ? ' btn-primary' : '') + '" data-a="kopTgl" data-f="tebal" data-i="' + i + '" title="Tebal"><b>B</b></button>' +
        '<button class="btn btn-sm btn-icon' + (b.miring ? ' btn-primary' : '') + '" data-a="kopTgl" data-f="miring" data-i="' + i + '" title="Miring"><i style="font-family:Georgia,serif">I</i></button>' +
        '<button class="btn btn-sm' + (b.arab ? ' btn-primary' : '') + '" data-a="kopTgl" data-f="arab" data-i="' + i + '" title="Huruf Arab (kanan ke kiri)">ع</button>' +
        '<input type="color" class="kb-warna" data-ch="kopWarna" data-i="' + i + '" value="' + attr(/^#[0-9a-f]{6}$/i.test(b.warna) ? b.warna : '#111827') + '" title="Warna">' +
        '<button class="btn btn-sm btn-icon btn-ghost" data-a="kopGeser" data-d="-1" data-i="' + i + '" title="Naik" ' + (i ? '' : 'disabled') + '>' + ic('up', 'ic-sm') + '</button>' +
        '<button class="btn btn-sm btn-icon btn-ghost" data-a="kopGeser" data-d="1" data-i="' + i + '" title="Turun" ' + (i < baris.length - 1 ? '' : 'disabled') + '>' + ic('down', 'ic-sm') + '</button>' +
        '<button class="btn btn-sm btn-icon btn-ghost" data-a="kopHapusBaris" data-i="' + i + '" title="Hapus baris">' + ic('trash', 'ic-sm') + '</button></div></div>').join('') + '</div>' +
      '<div class="row" style="margin-top:8px"><button class="btn btn-sm" data-a="kopTambahBaris" ' + (baris.length >= 8 ? 'disabled' : '') + '>' + ic('plus', 'ic-sm') + 'Tambah baris</button>' + (kustom ? '<button class="link-btn" data-a="kopResetBaris">Kembalikan dari Identitas Kampus</button>' : '<span class="faint" style="font-size:12px">Teks diambil dari Identitas Kampus (tab Surat Tugas &amp; Identitas) sampai Anda mengubahnya di sini.</span>') + '</div>';
    const logoKartu = (j, nama, kunci) => '<div class="kop-aset"><div class="kop-aset-g">' + (aset[kunci] ? '<img src="' + aset[kunci] + '" alt="' + nama + '">' : '<span class="faint">' + (kunci === 'logo2' ? 'Memakai logo utama' : 'Logo bawaan aplikasi') + '</span>') + '</div><b>' + nama + '</b><div class="row gap-s" style="justify-content:center"><button class="btn btn-sm" data-a="aset" data-v="' + j + '">' + ic('upload', 'ic-sm') + (aset[kunci] ? 'Ganti' : 'Unggah') + '</button>' + (aset[kunci] ? '<button class="btn btn-sm btn-icon" data-a="asetHapus" data-v="' + j + '" title="Hapus">' + ic('trash', 'ic-sm') + '</button>' : '') + '</div></div>';
    const jenis = Object.keys(Tata.SPEC);
    return '<div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr))"><div class="stack" style="min-width:0">' +
      '<div class="card"><div class="card-h"><h3>' + ic('image') + 'Sumber Kop Surat</h3><span class="sp"></span>' + seg('KOP_MODE', [['bawaan', 'Disusun di aplikasi'], ['gambar', 'Gambar / Google Docs']], mode) + '</div><div class="card-b">' +
        (mode === 'gambar' ? (aset.kop ? '<div class="kop-gb-pv"><img src="' + aset.kop + '" alt="Kop"></div>' : '<div class="alert warn" style="margin:0 0 12px">' + ic('alert') + '<div>Belum ada gambar kop. Unggah gambar atau ambil dari Google Docs — sampai itu, dokumen memakai kop yang disusun di aplikasi.</div></div>') +
          '<div class="row" style="margin-top:12px"><button class="btn" data-a="kopUnggah">' + ic('upload') + 'Unggah Gambar Kop</button><button class="btn btn-primary" data-a="kopDoc">' + ic('filetext') + 'Ambil dari Google Docs</button>' + (aset.kop ? '<button class="btn btn-icon btn-ghost" data-a="asetHapus" data-v="KOP" title="Hapus gambar kop">' + ic('trash', 'ic-sm') + '</button>' : '') + '</div>' +
          '<div class="tt-row" style="margin-top:14px;max-width:420px"><label>Tinggi kop pada kertas</label><input type="range" min="10" max="90" step="1" data-ch="kopTinggi" value="' + attr(this.v('KOP_TINGGI', '30')) + '"><span class="mono">' + esc(this.v('KOP_TINGGI', '30')) + ' mm</span></div>' +
          '<span class="help">Google Docs: buat dokumen berisi kop resmi di bagian atas halaman pertama, bagikan ke akun pemilik aplikasi (minimal Pelihat), tempel tautannya, lalu atur batas potong. Hasilnya disimpan sebagai gambar di folder Aset.</span>'
        : '<div class="fgrid c2"><div class="field"><label>Posisi logo</label><select class="input" data-ch="setr" data-k="KOP_LOGO">' + opsi([{ v: 'kiri', l: 'Kiri' }, { v: 'kanan', l: 'Kanan' }, { v: 'keduanya', l: 'Kiri & kanan' }, { v: 'tanpa', l: 'Tanpa logo' }], pos) + '</select></div>' +
          '<div class="field"><label>Perataan teks</label><select class="input" data-ch="setr" data-k="KOP_RATA">' + opsi([{ v: 'tengah', l: 'Tengah' }, { v: 'kiri', l: 'Rata kiri' }], this.v('KOP_RATA', 'tengah')) + '</select></div>' +
          '<div class="field"><label>Garis bawah kop</label><select class="input" data-ch="setr" data-k="KOP_GARIS">' + opsi([{ v: 'ganda', l: 'Ganda' }, { v: 'tebal-tipis', l: 'Tebal + tipis' }, { v: 'tunggal', l: 'Tunggal' }, { v: 'tanpa', l: 'Tanpa garis' }], this.v('KOP_GARIS', 'ganda')) + '</select></div>' +
          '<div class="field"><label>Ukuran logo: <b>' + esc(this.v('KOP_LOGO_MM', '22')) + ' mm</b></label><input type="range" min="10" max="40" step="1" data-ch="kopMm" value="' + attr(this.v('KOP_LOGO_MM', '22')) + '" style="width:100%;accent-color:var(--primary)"></div></div>' +
          '<div class="lbl" style="margin:14px 0 6px">Baris teks kop</div>' + editor +
          (pos !== 'tanpa' ? '<div class="grid2" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px">' + logoKartu('LOGO', 'Logo utama', 'logo') + (pos === 'keduanya' ? logoKartu('LOGO2', 'Logo kanan', 'logo2') : '') + '</div>' : '')) +
      '</div></div></div>' +
      '<div class="stack" style="min-width:0"><div class="card"><div class="card-h"><h3>' + ic('eye') + 'Pratinjau Kop (A4)</h3><span class="sp"></span>' + (this.isDirty() ? '<span class="badge orange">Belum disimpan</span>' : '<span class="badge ok">Tersimpan</span>') + '</div><div class="card-b"><div id="kop-pv" class="kop-pv">' + this.kopPratinjau() + '</div></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('layers') + 'Kop &amp; Tata Letak per Dokumen</h3></div><div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Dokumen</th><th class="center">Pakai kop</th><th>Tata letak</th><th class="right"></th></tr></thead><tbody>' +
        jenis.map(j => { const t = Tata.nilai(j), sim = tata[j]; return '<tr><td><b>' + esc(Tata.SPEC[j].judul) + '</b></td><td class="center"><label class="switch"><input type="checkbox" data-ch="kopDok" data-v="' + j + '" ' + (t.kop ? 'checked' : '') + '><i></i></label></td>' +
          '<td>' + (sim && Object.keys(sim).length ? '<span class="badge info">Disesuaikan</span>' : '<span class="badge">Bawaan aplikasi</span>') + '</td><td class="right">' + (sim && Object.keys(sim).length ? '<button class="btn btn-sm btn-ghost" data-a="tataReset" data-v="' + j + '">' + ic('refresh', 'ic-sm') + 'Reset</button>' : '') + '</td></tr>'; }).join('') +
        '</tbody></table></div><div class="card-b"><span class="help">Lebar kolom, tinggi baris, dan baris kosong diatur langsung dari tombol <b>Tata Letak</b> di layar pratinjau cetak, lalu <b>Jadikan bawaan</b>.</span></div></div></div></div>';
  },
  kopBarisSimpan(list) { this.setNilai('KOP_BARIS', JSON.stringify(list.map(b => ({ teks: String(b.teks || '').slice(0, 150), ukuran: Math.max(5, Math.min(40, num(b.ukuran, 10))), tebal: !!b.tebal, miring: !!b.miring, arab: !!b.arab, warna: /^#[0-9a-f]{6}$/i.test(b.warna) ? b.warna : '#111827' })))); },
  /** Gambar → dataURL ≤ ~900 KB (PNG bila muat, selain itu JPEG). */
  async kopKeDataUrl(canvas) {
    let w = canvas.width, h = canvas.height;
    const maxW = 2200; if (w > maxW) { const c2 = document.createElement('canvas'); c2.width = maxW; c2.height = Math.round(h * maxW / w); c2.getContext('2d').drawImage(canvas, 0, 0, c2.width, c2.height); canvas = c2; w = c2.width; h = c2.height; }
    let url = canvas.toDataURL('image/png');
    if (url.length * 0.75 > 900 * 1024) { const c3 = document.createElement('canvas'); c3.width = w; c3.height = h; const g = c3.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(canvas, 0, 0); for (const q of [0.92, 0.85, 0.75]) { url = c3.toDataURL('image/jpeg', q); if (url.length * 0.75 <= 900 * 1024) break; } }
    return url;
  },
  async kopSimpanGambar(dataUrl, tinggiMm, btn) {
    const r = await denganSibuk(btn, 'Menyimpan…', () => api('aset.unggah', { jenis: 'KOP', berkas64: dataUrl }));
    if (!r.success) return false;
    if (tinggiMm) { const r2 = await api('pengaturan.simpan', { nilai: { KOP_TINGGI: String(Math.max(10, Math.min(90, Math.round(tinggiMm)))) } }, { silent: true }); if (!r2.success) toast(r2.message, 'warn'); delete this.st.nilai.KOP_TINGGI; }
    delete this.st.nilai.KOP_MODE;
    toast('Kop surat tersimpan dan dipakai pada dokumen yang menampilkan kop.');
    this.render(); return true;
  },
  /** Potong kop dari halaman pertama PDF/gambar (hasil kop.dariDoc). */
  async kopPotong(data) {
    let kanvas, wMm = 210, hMm = 297;
    try {
      if (/pdf/.test(data.mime)) {
        const lib = await Lib.pdfjs(), bin = atob(data.berkas64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        const pdf = await lib.getDocument({ data: u8, isEvalSupported: false }).promise, pg = await pdf.getPage(1), v1 = pg.getViewport({ scale: 1 });
        wMm = v1.width / 72 * 25.4; hMm = v1.height / 72 * 25.4;
        const vp = pg.getViewport({ scale: 2000 / v1.width }); kanvas = document.createElement('canvas'); kanvas.width = Math.round(vp.width); kanvas.height = Math.round(vp.height);
        const g = kanvas.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, kanvas.width, kanvas.height);
        await pg.render({ canvasContext: g, viewport: vp }).promise;
      } else {
        const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'data:' + data.mime + ';base64,' + data.berkas64; });
        kanvas = document.createElement('canvas'); kanvas.width = img.naturalWidth; kanvas.height = img.naturalHeight; kanvas.getContext('2d').drawImage(img, 0, 0); wMm = 0;
      }
    } catch (e) { console.error(e); toast('Dokumen tidak bisa ditampilkan: ' + e.message, 'err'); return; }
    const W = kanvas.width, H = kanvas.height, px = kanvas.getContext('2d').getImageData(0, 0, W, H).data;
    const gelap = (x, y) => { const i = (y * W + x) * 4; return px[i] + px[i + 1] + px[i + 2] < 600; };
    /* bagian gelap tersambung terpanjang pada satu baris piksel (garis kop ≈ panjang, teks ≈ terputus-putus) */
    const baris = (y) => { let best = 0, run = 0, celah = 0; for (let x = 0; x < W; x++) { if (gelap(x, y)) { run += 1 + celah; celah = 0; if (run > best) best = run; } else if (run && celah < 3) celah++; else { run = 0; celah = 0; } } return best / W; };
    const isi = (y) => { for (let x = 0; x < W; x += 3) if (gelap(x, y)) return true; return false; };
    /* deteksi otomatis: isi pertama dari atas → garis horizontal panjang pertama (garis kop) */
    let atas = 0; while (atas < H * 0.6 && !isi(atas)) atas++;
    let bawah = -1;
    for (let y = atas; y < Math.min(H, atas + H * 0.45); y++) { if (baris(y) > 0.4) { let z = y; while (z < H - 7 && [1, 2, 3, 4, 5, 6].some(d => baris(z + d) > 0.4)) z++; bawah = z; break; } }
    if (bawah < 0) { let y = atas, kosong = 0; while (y < H * 0.5) { if (!isi(y)) { kosong++; if (kosong > H * 0.025) break; } else kosong = 0; y++; } bawah = y - kosong; }
    let kiri = W, kanan = 0; for (let y = atas; y <= bawah; y += 2) for (let x = 0; x < W; x += 2) if (gelap(x, y)) { if (x < kiri) kiri = x; if (x > kanan) kanan = x; }
    if (kanan <= kiri) { kiri = 0; kanan = W - 1; }
    const pad = Math.round(W * 0.006), st = { t: Math.max(0, atas - pad) / H * 100, b: Math.min(H, bawah + pad * 2) / H * 100, l: Math.max(0, kiri - pad) / W * 100, r: Math.min(W, kanan + pad) / W * 100 };
    const src = kanvas.toDataURL('image/jpeg', 0.8);
    const potong = () => { const c = document.createElement('canvas'), x = Math.round(st.l / 100 * W), y = Math.round(st.t / 100 * H); c.width = Math.max(1, Math.round((st.r - st.l) / 100 * W)); c.height = Math.max(1, Math.round((st.b - st.t) / 100 * H)); c.getContext('2d').drawImage(kanvas, x, y, c.width, c.height, 0, 0, c.width, c.height); return c; };
    const ukur = () => { if (!wMm) return null; const w = (st.r - st.l) / 100 * wMm, h = (st.b - st.t) / 100 * hMm; return { w, h: h * Math.min(1, 190 / w) }; };
    const geser = (k, l, mn, mx) => '<div class="tt-row"><label>' + l + '</label><input type="range" min="' + mn + '" max="' + mx + '" step="0.1" value="' + st[k].toFixed(1) + '" data-kp="' + k + '"><span class="mono" id="kp-' + k + '">' + st[k].toFixed(1) + '%</span></div>';
    const m = Modal.buka({ title: 'Potong Kop dari Dokumen', sub: esc(data.nama || ''), icon: 'crop', size: 'lg',
      body: '<div class="kp-wrap"><div class="kp-hal" id="kp-hal"><div class="kp-in"><img src="' + src + '" alt="Halaman 1"><div class="kp-kotak" id="kp-kotak"></div></div></div><div class="kp-sisi">' +
        '<div class="lbl">Batas potong</div>' + geser('t', 'Atas', 0, 60) + geser('b', 'Bawah', 1, 80) + geser('l', 'Kiri', 0, 40) + geser('r', 'Kanan', 60, 100) +
        '<div class="lbl" style="margin-top:10px">Hasil</div><div class="kp-hasil" id="kp-hasil"></div><div class="help" id="kp-ukur"></div>' +
        '<div class="alert info" style="margin:10px 0 0;font-size:12.5px">' + ic('info') + '<div>Batas dideteksi otomatis sampai garis kop. Geser bila perlu, lalu simpan.</div></div></div></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('save') + 'Simpan sebagai Kop</button>',
      acts: { ok: async (b, e, mm) => { const c = potong(), u = ukur(); const url = await this.kopKeDataUrl(c); if (await this.kopSimpanGambar(url, u ? u.h : 0, b)) mm.close(); } } });
    const segar = () => {
      const k = $('#kp-kotak', m.el); if (k) Object.assign(k.style, { top: st.t + '%', height: (st.b - st.t) + '%', left: st.l + '%', width: (st.r - st.l) + '%' });
      const h = $('#kp-hasil', m.el); if (h) { h.innerHTML = ''; const c = potong(); c.style.width = '100%'; c.style.height = 'auto'; h.appendChild(c); }
      const u = ukur(), uk = $('#kp-ukur', m.el); if (uk) uk.textContent = u ? 'Ukuran di kertas ± ' + Math.min(190, u.w).toFixed(0) + ' × ' + u.h.toFixed(0) + ' mm' : '';
    };
    m.el.addEventListener('input', (e) => { const i = e.target.closest('[data-kp]'); if (!i) return; const k = i.dataset.kp; st[k] = num(i.value); if (st.b <= st.t + 1) st.b = st.t + 1; if (st.r <= st.l + 1) st.r = st.l + 1; $('#kp-' + k, m.el).textContent = st[k].toFixed(1) + '%'; clearTimeout(this._kp); this._kp = setTimeout(segar, 60); });
    segar();
  },

  v_surat() {
    const aset = DB.raw.Aset || {}, n = num(this.v('ST_NOMOR_TERAKHIR', '0')) + 1, maks = DB.rows('SuratTugas').reduce((a, x) => Math.max(a, num(x.NomorUrut)), 0);
    const f = (k, label, o) => { o = o || {}; return '<div class="field' + (o.full ? '" style="grid-column:1/-1' : '') + '"><label>' + label + '</label>' + (o.ta ? '<textarea class="input" data-in="set" data-k="' + k + '" rows="' + (o.rows || 3) + '">' + esc(this.v(k)) + '</textarea>' : this.inputSet(k, o)) + (o.help ? '<span class="help">' + o.help + '</span>' : '') + '</div>'; };
    const asetKartu = (j, nama, kunci) => '<div style="text-align:center"><div style="height:110px;border:1px dashed var(--border-2);border-radius:12px;display:grid;place-items:center;background:repeating-conic-gradient(var(--surface-3) 0 25%, var(--surface) 0 50%) 0 0/16px 16px;overflow:hidden">' + (aset[kunci] ? '<img src="' + aset[kunci] + '" alt="' + nama + '" style="max-height:100px;max-width:90%">' : '<span class="faint">' + ic('upload') + '</span>') + '</div>' +
      '<b style="display:block;margin:6px 0 4px;font-size:13px">' + nama + '</b><div class="row gap-s" style="justify-content:center"><button class="btn btn-sm" data-a="aset" data-v="' + j + '">' + ic('upload', 'ic-sm') + (aset[kunci] ? 'Ganti' : 'Unggah') + '</button>' + (aset[kunci] ? '<button class="btn btn-sm btn-icon" data-a="asetHapus" data-v="' + j + '" title="Hapus">' + ic('trash', 'ic-sm') + '</button>' : '') + '</div></div>';
    return '<div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr))"><div class="card"><div class="card-h"><h3>' + ic('tag') + 'Nomor &amp; Penandatangan Surat Tugas</h3><span class="sp"></span><span class="badge ok">LockService</span></div><div class="card-b"><div class="fgrid c2">' +
      f('ST_FORMAT', 'Format nomor surat', { full: true, mono: true, help: 'Variabel: {nomor}, {nomor3} (3 digit), {bulan_romawi}, {bulan}, {tahun}. Nomor berikutnya: <b class="mono" id="st-contoh">' + esc(nomorContoh(this.v('ST_FORMAT'), n, this.v('ST_TANGGAL'))) + '</b>' }) +
      f('ST_NOMOR_TERAKHIR', 'Nomor urut terakhir', { type: 'number', help: 'Nomor terbit tertinggi di aplikasi: ' + maks + '. Mengecilkan nomor dapat menimbulkan nomor ganda.' }) + f('ST_NOMOR_SK', 'Nomor SK Ketua (penetapan pengampu)', { ph: 'mis. 012/SK/STIS-AW/VIII/2026' }) +
      f('ST_TEMPAT', 'Tempat surat') + f('ST_TANGGAL', 'Tanggal surat bawaan', { type: 'date', help: 'Kosong = tanggal saat dicetak.' }) +
      f('ST_JABATAN', 'Jabatan penandatangan', { full: true }) + f('ST_PENANDATANGAN', 'Nama penandatangan') + f('ST_NIDN_TTD', 'NIDN penandatangan (opsional)') +
      f('ST_PEMBUKA', 'Paragraf pembuka', { full: true, ta: true, rows: 4, help: 'Variabel: {nomor_sk}, {semester}, {tahun_akademik}.' }) + f('ST_KETENTUAN', 'Ketentuan (satu baris = satu butir)', { full: true, ta: true, rows: 5 }) +
      '</div></div></div><div class="stack" style="min-width:0"><div class="card"><div class="card-h"><h3>' + ic('award') + 'Logo, Tanda Tangan &amp; Stempel</h3><span class="sp"></span><small class="muted">PNG transparan · maks 800 KB</small></div><div class="card-b"><div class="grid3" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">' +
      asetKartu('LOGO', 'Logo kampus', 'logo') + asetKartu('TTD', 'Tanda tangan', 'ttd') + asetKartu('STEMPEL', 'Stempel', 'stempel') + '</div>' +
      '<div class="alert info" style="margin:14px 0 0">' + ic('lock') + '<div>Gambar disimpan di folder Drive <b>Aset</b> (privat) dan disisipkan saat dokumen dicetak. Tanda tangan & stempel hanya muncul di Surat Tugas.</div></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('mosque') + 'Identitas Kampus (Kop Dokumen)</h3></div><div class="card-b"><div class="fgrid c2">' +
      f('KAMPUS_NAMA', 'Nama kampus', { full: true }) + f('KAMPUS_NAMA_ARAB', 'Nama kampus (Arab)', { full: true, dir: 'rtl' }) + f('KAMPUS_SK', 'Baris SK/akreditasi (opsional)', { full: true }) + f('KAMPUS_ALAMAT', 'Alamat', { full: true, ta: true, rows: 2 }) +
      f('KAMPUS_TELP', 'Telepon') + f('KAMPUS_WEB', 'Website') + f('KAMPUS_EMAIL', 'Email') + f('MOTTO', 'Motto (kaki kalender)') + f('JADWAL_KUTIPAN', 'Kutipan kaki jadwal', { full: true }) + '</div></div></div></div></div>';
  },

  /* ---------- 5. WhatsApp ---------- */
  grupKerja() {
    const s = this.st;
    if (s.grup) return s.grup;
    const m = {}; DB.rows('GrupWA').forEach(g => { m[g.Prodi + '|' + g.Angkatan + '|' + g.Kelas] = { Prodi: g.Prodi, Angkatan: String(g.Angkatan), Kelas: g.Kelas, Semester: g.Semester || '', IdGrup: g.IdGrup, NamaGrup: g.NamaGrup || '' }; });
    return m;
  },
  v_wa() {
    const s = this.st, meta = DB.meta('Pengaturan') || {}, adaToken = !!(meta.FONNTE_TOKEN && meta.FONNTE_TOKEN.ada), gk = this.grupKerja(), per = App.periode.berjalan.key;
    const prodi = Dom.prodi(), gp = s.gprodi || (prodi[0] || {}).Kode || '';
    const baris = []; Dom.angkatanAktif().forEach(th => Dom.kelasProdi(gp).forEach(k => { const smt = Dom.semMhs(th, per); if (smt >= 1 && smt <= 8) baris.push({ key: gp + '|' + th + '|' + k.Nama, prodi: gp, th, kelas: k.Nama, smt }); }));
    const opsiGrup = (cur) => { const l = (s.waGrup || []).slice(); if (cur && cur.IdGrup && !l.some(g => g.id === cur.IdGrup)) l.unshift({ id: cur.IdGrup, nama: cur.NamaGrup || cur.IdGrup }); return '<option value="">— belum dipetakan —</option>' + l.map(g => '<option value="' + attr(g.id) + '"' + (cur && cur.IdGrup === g.id ? ' selected' : '') + '>' + esc(g.nama) + '</option>').join(''); };
    const tpl = (k, judul, vars) => '<div class="field"><label>' + judul + '</label><div class="row gap-s" style="margin-bottom:6px">' + vars.map(v => '<button class="var-chip" data-a="varSet" data-k="' + k + '" data-v="{' + v[0] + '}" title="' + attr(v[1]) + '">{' + v[0] + '}</button>').join('') + '</div><textarea class="input mono" style="font-size:12.5px" rows="8" id="tpl-' + k + '" data-in="set" data-k="' + k + '">' + esc(this.v(k)) + '</textarea></div>';
    return '<div class="grid2"><div class="card"><div class="card-h"><h3>' + ic('wa') + 'Koneksi Fonnte</h3><span class="sp"></span>' + (s.dev ? '<span class="badge ' + (s.dev.status === 'connect' ? 'ok' : 'warn') + '">' + (s.dev.status === 'connect' ? 'Tersambung' : 'Belum tersambung') + '</span>' : '') + '</div><div class="card-b">' +
      this.rahasiaRow('FONNTE_TOKEN', 'API Token (Script Properties)', 'Salin dari dashboard Fonnte → Device → Token. Token tidak pernah dikirim balik ke browser.') +
      (s.dev ? '<div class="mini-stats" style="margin-bottom:12px"><div><small>Perangkat</small><b style="font-size:14px">' + esc(s.dev.nomor || '-') + '</b></div><div><small>Paket</small><b style="font-size:14px">' + esc(s.dev.paket || '-') + '</b></div><div><small>Kuota</small><b style="font-size:14px">' + esc(s.dev.kuota || '-') + '</b></div></div>' : '') +
      '<div class="row"><button class="btn" data-a="waDev" ' + (adaToken ? '' : 'disabled') + '>' + ic('phone') + 'Cek Perangkat</button><div class="row gap-s" style="flex:1 1 240px;flex-wrap:nowrap"><input class="input" id="wa-tes" inputmode="tel" placeholder="Nomor tes 08…"><button class="btn btn-primary" data-a="waTes" ' + (adaToken ? '' : 'disabled') + '>' + ic('send') + 'Tes</button></div></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('zap') + 'Saklar &amp; Batasan Pengiriman</h3></div><div class="card-b" style="padding-top:4px">' +
      this.switchSet('NOTIF_WA_AKTIF', 'Saklar utama WhatsApp', adaToken ? 'Matikan untuk menahan semua antrean pengiriman.' : 'Isi token Fonnte terlebih dahulu.', !adaToken && this.v('NOTIF_WA_AKTIF') !== 'YA') +
      this.switchSet('WA_KIRIM_ST', 'Kiriman Surat Tugas ke dosen', 'Japri ke nomor WA dosen dengan lampiran PDF.') + this.switchSet('WA_KIRIM_JADWAL', 'Kiriman Jadwal ke grup kelas', 'Ke grup WA per prodi · angkatan · kelas.') +
      '<div class="fgrid c2" style="margin-top:12px"><div class="field"><label>Jeda antarpesan (detik)</label>' + this.inputSet('WA_JEDA', { ph: '5-8' }) + '<span class="help">Boleh acak, mis. 5-8.</span></div><div class="field"><label>Pesan per putaran</label><div class="seg">' + ['10', '20', '50'].map(x => '<button data-a="batchWa" data-v="' + x + '" class="' + (this.v('WA_BATCH', '10') === x ? 'on' : '') + '">' + x + '</button>').join('') + '</div><span class="help">Pemicu server berjalan tiap menit.</span></div></div></div></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-h"><h3>' + ic('msg') + 'Template Pesan Bawaan</h3><div class="sub">*tebal* · _miring_ · variabel diganti otomatis per penerima.</div></div><div class="card-b"><div class="grid2">' + tpl('WA_TPL_ST', 'Surat Tugas ke dosen', VAR_WA.SURAT_TUGAS) + tpl('WA_TPL_JADWAL', 'Jadwal ke grup kelas', VAR_WA.JADWAL_KELAS) + '</div></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-h"><h3>' + ic('users') + 'Pemetaan Grup WA Kelas</h3><span class="sp"></span><div class="seg">' + prodi.map(p => '<button data-a="gprodi" data-v="' + attr(p.Kode) + '" class="' + (gp === p.Kode ? 'on' : '') + '">' + esc(p.Kode) + '</button>').join('') + '</div>' +
      '<button class="btn btn-sm" data-a="waGrup" ' + (adaToken ? '' : 'disabled') + '>' + ic('refresh', 'ic-sm') + 'Ambil daftar grup' + (s.waGrup ? ' (' + s.waGrup.length + ')' : '') + '</button>' +
      '<div class="sub">Satu grup per prodi · angkatan · kelas. Akun WA Fonnte harus menjadi anggota grup. ' + (s.waGrup ? '' : 'Tekan "Ambil daftar grup" untuk memilih dari grup yang diikuti perangkat, atau tempel ID grup (…@g.us).') + '</div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Angkatan · Semester</th><th>Kelas</th><th>Grup WhatsApp</th><th>ID Grup</th></tr></thead><tbody>' +
      (baris.map(b => { const g = gk[b.key]; return '<tr class="' + (s.grup && JSON.stringify(g || null) !== JSON.stringify((() => { const x = DB.rows('GrupWA').find(y => y.Prodi + '|' + y.Angkatan + '|' + y.Kelas === b.key); return x ? { Prodi: x.Prodi, Angkatan: String(x.Angkatan), Kelas: x.Kelas, Semester: x.Semester || '', IdGrup: x.IdGrup, NamaGrup: x.NamaGrup || '' } : null; })()) ? 'kotor' : '') + '"><td><b>' + esc(b.th) + '</b> · Smt ' + b.smt + '</td><td>' + badgeKelas(b.kelas) + '</td>' +
        '<td>' + (s.waGrup ? '<select class="input sm" data-ch="grupPilih" data-key="' + attr(b.key) + '">' + opsiGrup(g) + '</select>' : esc(g ? g.NamaGrup || '(tanpa nama)' : '—')) + '</td><td><input class="input sm mono" data-ch="grupId" data-key="' + attr(b.key) + '" value="' + attr(g ? g.IdGrup : '') + '" placeholder="1203630…@g.us"></td></tr>'; }).join('') ||
        '<tr><td colspan="4">' + kosong('Tidak ada kelas terjadwal untuk prodi ini.', 'users') + '</td></tr>') + '</tbody></table></div></div>';
  },

  /* ---------- 6. Sumber data & verifikasi ---------- */
  v_sumber() {
    const s = this.st, r = s.rekap, st = s.status, contoh = Dom.urlVerif('ST-CONTOH1234');
    if (!st && !s._st) this.muatStatus();
    const fol = st ? st.folder : {};
    return '<div class="grid2"><div class="card"><div class="card-h"><h3>' + ic('cap') + 'Rekap Mahasiswa (hanya baca)</h3><span class="sp"></span><span class="badge info">Read-only</span></div><div class="card-b">' +
      this.rahasiaRow('REKAP_SS_ID', 'ID Spreadsheet Rekap Mahasiswa', 'Tempel URL atau ID spreadsheet. Akun pemilik Apps Script cukup punya akses <b>lihat</b>; aplikasi tidak pernah menulis ke Rekap.') +
      '<div class="fgrid c2"><div class="field"><label>Nama sheet data mahasiswa</label>' + this.inputSet('REKAP_SHEET', { ph: 'Mahasiswa' }) + '</div><div class="field"><label>Alamat aplikasi Rekap (tombol "Buka Rekap")</label>' + this.inputSet('REKAP_URL', { ph: 'https://…' }) + '</div></div>' +
      '<div class="row" style="margin-top:12px"><button class="btn btn-primary" data-a="rekapTes">' + ic('refresh') + 'Tes Koneksi &amp; Sinkronkan</button><span class="help">Kolom dibaca berdasar nama judul (NIM, Nama, Jenis Kelamin, Prodi, Kelas, Angkatan, Status).</span></div>' +
      (r ? '<div class="alert ' + (r.sheetDipakai ? 'ok' : 'warn') + '" style="margin:14px 0 0">' + ic(r.sheetDipakai ? 'okc' : 'alert') + '<div><b>' + esc(r.nama) + '</b> · ' + (r.sheetDipakai ? esc(r.baris) + ' baris di sheet "' + esc(r.sheetDipakai) + '" · ' + esc(r.aktif) + ' mahasiswa aktif · ' + esc(r.anomali) + ' anomali' : 'sheet tidak ditemukan. Sheet yang ada: ' + esc((r.sheet || []).join(', '))) + '</div></div>' +
        (r.kolom ? '<div class="tbl-wrap" style="margin-top:10px"><table class="tbl"><thead><tr><th>Kolom aplikasi</th><th>Judul kolom di Rekap</th></tr></thead><tbody>' + r.kolom.map(k => '<tr><td><b>' + esc(k.kolom) + '</b></td><td>' + (k.ditemukan ? '<span class="badge ok">' + esc(k.ditemukan) + '</span>' : '<span class="badge err">tidak ditemukan</span>') + '</td></tr>').join('') + '</tbody></table></div>' : '') : '') + '</div></div>' +
      '<div class="stack" style="min-width:0"><div class="card"><div class="card-h"><h3>' + ic('qr') + 'Verifikasi Dokumen (QR)</h3></div><div class="card-b"><div class="fgrid c2">' +
      '<div class="field" style="grid-column:1/-1"><label>Alamat tampilan web (APP_URL)</label>' + this.inputSet('APP_URL', { ph: 'https://penjadwalan-alwafa.vercel.app/' }) + '<span class="help">Terisi otomatis saat login pertama.</span></div>' +
      '<div class="field" style="grid-column:1/-1"><label>Alamat halaman verifikasi (opsional)</label>' + this.inputSet('VERIF_URL', { ph: 'kosong = APP_URL/verifikasi.html' }) + '<span class="help">Contoh tautan QR: <span class="mono">' + esc(contoh) + '</span></span></div></div>' +
      '<div class="lbl" style="margin:12px 0 8px">Verifikasi Pusat (opsional, lintas aplikasi kampus)</div>' + this.rahasiaRow('VP_URL', 'URL Verifikasi Pusat (/exec)') + this.rahasiaRow('VP_KUNCI', 'Kunci Verifikasi Pusat') + '</div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('folder') + 'Google Drive</h3><span class="sp"></span>' + (st ? '<span class="badge ok">Tersedia</span>' : '<span class="spin spin-sm"></span>') + '</div><div class="card-b"><div class="fgrid c2">' +
      [['root', 'Folder utama', 'folder'], ['database', 'Spreadsheet database', 'sheet'], ['arsip', 'Arsip', 'archive'], ['aset', 'Aset (logo, TTD)', 'award'], ['kiriman', 'Kiriman WA (bertautan)', 'wa'], ['template', 'Template Dokumen', 'files']].map(x => '<a class="btn" style="justify-content:flex-start" ' + (fol[x[0]] ? 'href="' + attr(fol[x[0]]) + '" target="_blank" rel="noopener"' : 'aria-disabled="true"') + '>' + ic(x[2]) + x[1] + '</a>').join('') +
      '</div><span class="help" style="display:block;margin-top:8px">PDF tiap semester tersimpan di subfolder "' + esc(App.periode.berjalan.ta.replace('/', '-') + ' ' + App.periode.berjalan.smt) + '/…" (Jadwal, Ujian, Surat Tugas, Absensi, dll).</span></div></div></div></div>';
  },
  async muatStatus() {
    const s = this.st; s._st = true;
    const r = await api('sistem.status', {}, { silent: true });
    s._st = false; if (r.success) s.status = r.data; else s.status = { folder: {}, pemicu: [], gagal: r.message };
    if (App.cur === this && (s.tab === 'sumber' || s.tab === 'sistem')) this.render();
  },

  /* ---------- 7. Akun ---------- */
  v_akun() {
    const u = DB.rows('Users').slice().sort(by(x => (x.Peran === 'ADMIN_UTAMA' ? '0' : '1') + x.Username)), me = (Sesi.me || {}).username;
    return '<div class="card"><div class="card-h"><h3>' + ic('users') + 'Pengguna &amp; Hak Akses</h3><span class="badge">' + u.length + ' / 5 akun</span><span class="sp"></span><button class="btn btn-primary" data-a="akunBaru" ' + (u.length >= 5 ? 'disabled title="Maksimal 5 akun"' : '') + '>' + ic('plus') + 'Tambah Akun Pengguna</button></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pengguna</th><th>Nama</th><th>Peran</th><th>Status</th><th>Login Terakhir</th><th class="right">Aksi</th></tr></thead><tbody>' +
      u.map(x => { const adm = x.Peran === 'ADMIN_UTAMA';
        return '<tr class="' + (x.Aktif === 'TIDAK' ? 'dim' : '') + '"><td><div class="row" style="flex-wrap:nowrap"><div class="avatar ' + (adm ? 'dark' : '') + '">' + esc(inisial(x.Nama)) + '</div><div><b class="mono">' + esc(x.Username) + '</b>' + (x.Username === me ? ' <small class="faint">(Anda)</small>' : '') + '</div></div></td><td>' + esc(x.Nama) + '</td>' +
          '<td>' + (adm ? '<span class="badge orange">' + ic('shield', 'ic-sm') + 'Admin Utama</span>' : '<span class="badge info">Pengguna</span>') + '</td><td>' + (x.Aktif === 'TIDAK' ? '<span class="badge">Nonaktif</span>' : '<span class="badge ok">Aktif</span>') + (x.WajibGanti === 'YA' ? ' <span class="badge warn" title="Wajib ganti password saat masuk">Password sementara</span>' : '') + '</td>' +
          '<td>' + (x.LoginTerakhir ? esc(relatif(x.LoginTerakhir)) + '<div class="t-sub">' + esc(fmtWaktu(x.LoginTerakhir)) + '</div>' : '<span class="faint">Belum pernah</span>') + '</td>' +
          '<td class="right nowrap"><button class="btn btn-sm btn-icon" data-a="akunEdit" data-v="' + attr(x.Username) + '" title="Ubah">' + ic('edit', 'ic-sm') + '</button> ' + (x.Username === me ? '<button class="btn btn-sm" data-a="gantiSaya">' + ic('key', 'ic-sm') + 'Ganti password</button>' : adm ? '' : '<button class="btn btn-sm" data-a="akunReset" data-v="' + attr(x.Username) + '">' + ic('key', 'ic-sm') + 'Reset password</button>') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="card-b"><div class="alert info" style="margin:0">' + ic('shield') + '<div><b>Admin Utama</b> memiliki akses penuh termasuk Pengaturan, Agenda, dan Blast WA. <b>Pengguna</b> dapat mengelola data akademik, jadwal, dan cetak dokumen. Password disimpan sebagai hash bergaram di Script Properties — admin pun tidak dapat melihatnya; yang bisa dilakukan hanya reset ke password sementara.</div></div></div></div>';
  },

  /* ---------- 8. Impor & cadangan ---------- */
  v_migrasi() {
    const s = this.st, m = s.mig, h = m.hasil;
    return '<div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr))"><div class="card"><div class="card-h"><h3>' + ic('database') + 'Migrasi dari Aplikasi Lama</h3><span class="sp"></span><span class="badge info">Aman diulang</span></div><div class="card-b">' +
      '<div class="field"><label>URL / ID spreadsheet aplikasi lama</label><input class="input mono" data-in="migUrl" value="' + attr(m.url) + '" placeholder="https://docs.google.com/spreadsheets/d/…/edit"><span class="help">Sumber hanya dibaca. Kolom dikenali dari judulnya (dengan sinonim), data yang sudah ada tidak digandakan.</span></div>' +
      '<div class="lbl" style="margin:12px 0 6px">Data yang diimpor</div>' + SHEET_MIGRASI.map(x => '<label class="chk" style="display:flex;padding:6px 0"><input type="checkbox" data-ch="migPilih" data-v="' + x[0] + '" ' + (m.pilih.includes(x[0]) ? 'checked' : '') + '> <span><b>' + x[0] + '</b> <small class="muted">— ' + x[1] + '</small></span></label>').join('') +
      '<label class="chk" style="display:flex;padding:8px 0;margin-top:4px;border-top:1px solid var(--border)"><input type="checkbox" data-ch="migTimpa" ' + (m.timpa ? 'checked' : '') + '> <span>Timpa nilai yang sudah ada (SKS, semester, tahfidz) dengan data sumber</span></label>' +
      '<div class="row" style="margin-top:12px"><button class="btn" data-a="migPindai">' + ic('search') + 'Pindai (uji coba)</button><span class="sp"></span><button class="btn btn-primary" data-a="migJalan" ' + (h && h.dryRun && m.kunci === this.kunciMig() ? '' : 'disabled title="Pindai dulu"') + '>' + ic('upload') + 'Jalankan Impor</button></div>' +
      (h ? '<div class="alert ' + (h.dryRun ? 'info' : 'ok') + '" style="margin:14px 0 8px">' + ic(h.dryRun ? 'info' : 'okc') + '<div><b>' + (h.dryRun ? 'Hasil pindai' : 'Impor selesai') + '</b> · ' + esc(h.sumber.nama) + (h.dryRun ? ' — belum ada data yang ditulis.' : '') + '</div></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Baris sumber</th><th>' + (h.dryRun ? 'Akan ditambah' : 'Ditambah') + '</th><th>' + (h.dryRun ? 'Akan diperbarui' : 'Diperbarui') + '</th><th>Dilewati</th></tr></thead><tbody>' +
        Object.keys(h.laporan).map(k => { const x = h.laporan[k]; return '<tr><td><b>' + esc(k) + '</b>' + (x.catatan ? '<div class="t-sub">' + esc(x.catatan) + '</div>' : '') + '</td><td>' + x.sumber + '</td><td style="color:var(--ok);font-weight:700">' + x.ditambah + '</td><td style="color:var(--info);font-weight:700">' + x.diperbarui + '</td><td>' + x.dilewati + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        (h.peringatan && h.peringatan.length ? '<details style="margin-top:10px"><summary class="link-btn">' + h.peringatan.length + ' catatan baris dilewati</summary><ul style="margin:8px 0 0 18px;font-size:12.5px" class="muted">' + h.peringatan.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul></details>' : '') : '') + '</div></div>' +
      '<div class="stack" style="min-width:0"><div class="card"><div class="card-h"><h3>' + ic('download') + 'Cadangan Data</h3></div><div class="card-b"><p class="muted" style="font-size:13.5px;margin-bottom:12px">Unduh salinan seluruh tabel aplikasi (Excel, satu sheet per tabel) sebagai cadangan sebelum pergantian semester atau upgrade. Data mahasiswa tidak ikut karena sumbernya Rekap Mahasiswa. Password & token tidak pernah ikut.</p>' +
      '<button class="btn btn-primary" data-a="cadangan">' + ic('sheet') + 'Unduh Cadangan Excel</button></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('info') + 'Langkah Migrasi Aman</h3></div><div class="card-b"><ol style="margin-left:18px;line-height:1.9;font-size:13.5px"><li>Unduh cadangan aplikasi ini.</li><li>Tempel URL spreadsheet lama, pilih data, tekan <b>Pindai</b>.</li><li>Periksa jumlah tambah/perbarui &amp; catatan baris yang dilewati.</li><li>Tekan <b>Jalankan Impor</b>. Ulangi kapan saja untuk sinkron data baru (delta) tanpa duplikat.</li><li>Cek menu Dosen, Kurikulum, Kalender. Istilah prodi/kelas harus sama dengan Pengaturan.</li></ol></div></div></div></div>';
  },
  kunciMig() { const m = this.st.mig; return m.url + '|' + m.pilih.slice().sort().join(',') + '|' + m.timpa; },

  /* ---------- 9. Sistem & log ---------- */
  v_sistem() {
    const s = this.st, st = s.status;
    if (!st && !s._st) this.muatStatus();
    if (!s.log && !s._log) this.muatLog();
    const perf = {}; Perf.log.forEach(x => { const a = perf[x.action] = perf[x.action] || { n: 0, t: 0, sv: 0 }; a.n++; a.t += x.total; a.sv += x.server || 0; });
    const rows = s.log ? s.log.r.map(r => { const o = {}; s.log.h.forEach((k, i) => { o[k] = r[i]; }); return o; }).filter(o => cocok(o.Pengguna + ' ' + o.Aksi + ' ' + o.Ringkasan, s.lq)) : [], PER = 25, hal = Math.min(s.lhal, Math.max(1, Math.ceil(rows.length / PER)));
    const pem = st ? st.pemicu || [] : [];
    return '<div class="kpis">' + kpi({ lb: 'Versi Aplikasi', vl: '<span style="font-size:22px">' + esc(st ? st.versi : VERSI) + '</span>', ic: 'layers', ft: 'Skema database ' + esc(st ? st.skema || '-' : '…') }) +
      kpi({ lb: 'Pemicu Server', vl: '<span style="font-size:20px">' + (st ? (pem.includes('pemicuMenit') ? ic('okc') + ' Aktif' : ic('alert') + ' Tidak ada') : '…') + '</span>', ic: 'clock', cls: st && !pem.includes('pemicuMenit') ? 'err' : 'ok', ft: st ? (pem.join(', ') || 'Jalankan pasangPemicu() di editor') : '' }) +
      kpi({ lb: 'Pemanasan Cache', vl: '<span style="font-size:20px">' + (st ? (st.keepWarm === 'off' ? 'Mati' : 'Aktif') : '…') + '</span>', ic: 'zap', ft: st && st.warm ? 'Terakhir ' + esc(relatif(st.warm.at || st.warm.waktu || '')) + (st.warm.ms ? ' · ' + st.warm.ms + ' ms' : '') : 'Tiap ±5 menit' }) +
      kpi({ lb: 'Script Properties', vl: (st ? st.ukuranProps : '…') + '<small>KB / 500 KB</small>', ic: 'key', bar: st ? st.ukuranProps / 5 : 0, ft: 'Antrean WA: ' + (st ? (st.antreanWA ? 'ada' : 'kosong') : '…') + ' · Dokumen: ' + (st ? (st.antreanDokumen ? 'ada' : 'kosong') : '…') }) + '</div>' +
      '<div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))"><div class="card"><div class="card-h"><h3>' + ic('activity') + 'Performa di Browser Ini</h3><span class="sp"></span><button class="btn btn-sm" data-a="muatSemua">' + ic('refresh', 'ic-sm') + 'Muat Ulang Semua Data</button><button class="btn btn-sm" data-a="bersihLokal">' + ic('trash', 'ic-sm') + 'Bersihkan Cache Lokal</button></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Aksi API</th><th>Panggilan</th><th>Rata-rata total</th><th>Rata-rata server</th></tr></thead><tbody>' +
      (Object.keys(perf).sort((a, b) => perf[b].n - perf[a].n).slice(0, 12).map(k => { const a = perf[k]; return '<tr><td class="mono" style="font-size:12.5px">' + esc(k) + '</td><td>' + a.n + '</td><td>' + Math.round(a.t / a.n) + ' ms</td><td>' + Math.round(a.sv / a.n) + ' ms</td></tr>'; }).join('') || '<tr><td colspan="4">' + kosong('Belum ada panggilan.', 'activity') + '</td></tr>') + '</tbody></table></div>' +
      '<div class="card-b"><span class="help">Data disimpan di browser (stale-while-revalidate) sehingga pindah menu instan; server hanya mengirim tabel yang berubah. Ketik <span class="mono">Perf.table()</span> di konsol untuk rincian.</span></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('history') + 'Log Aktivitas</h3><span class="sp"></span><div class="input-ic" style="width:220px">' + ic('search') + '<input class="input sm" data-in="lq" placeholder="Cari pengguna/aksi…" value="' + attr(s.lq) + '"></div><button class="btn btn-sm btn-icon" data-a="muatLog" title="Muat ulang">' + ic('refresh', 'ic-sm') + '</button></div>' +
      (!s.log ? '<div class="empty"><div class="spin"></div><div>Memuat log…</div></div>' : '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Ringkasan</th></tr></thead><tbody>' +
        (rows.slice((hal - 1) * PER, hal * PER).map(o => '<tr><td class="nowrap" style="font-size:12.5px">' + esc(fmtWaktu(o.Waktu)) + '</td><td class="mono" style="font-size:12.5px">' + esc(o.Pengguna) + '</td><td><span class="badge info">' + esc(o.Aksi) + '</span></td><td style="font-size:13px">' + esc(o.Ringkasan) + '</td></tr>').join('') || '<tr><td colspan="4">' + kosong('Belum ada log.', 'history') + '</td></tr>') + '</tbody></table></div>' +
        (rows.length > PER ? pagerHtml(rows.length, hal, PER, 'log').replace(/data-a="pg"/g, 'data-a="lpg"') : '')) + '</div></div>';
  },
  async muatLog() {
    const s = this.st; s._log = true;
    const r = await api('log.daftar', { n: 300 }, { silent: true });
    s._log = false; s.log = r.success ? r.data : { h: [], r: [] };
    if (App.cur === this && s.tab === 'sistem') this.render();
  },

  acts: {
    simpanSemua(b) { this.simpan(b); },
    majukan() {
      const b = { ta: this.v('TA_BERJALAN'), smt: this.v('SMT_BERJALAN') }, d = { ta: this.v('TA_DISUSUN'), smt: this.v('SMT_DISUSUN') };
      const baru = this.v('MODE_PERSIAPAN') === 'YA' && (d.ta + d.smt !== b.ta + b.smt) ? d : perBerikut(b), lanjut = perBerikut(baru);
      konfirmasi('Semester berjalan menjadi <b>' + esc(baru.smt + ' ' + baru.ta) + '</b> dan semester yang disusun menjadi <b>' + esc(lanjut.smt + ' ' + lanjut.ta) + '</b> (mode penyusunan dimatikan).\n\nPerubahan ini baru berlaku setelah Anda menekan Simpan.', { title: 'Majukan semester', icon: 'arrowr', ok: 'Terapkan' }).then(j => {
        if (!j) return;
        this.setNilai('TA_BERJALAN', baru.ta); this.setNilai('SMT_BERJALAN', baru.smt); this.setNilai('TA_DISUSUN', lanjut.ta); this.setNilai('SMT_DISUSUN', lanjut.smt); this.setNilai('MODE_PERSIAPAN', 'TIDAK');
        this.render(); App.savebar(this);
      });
    },
    hariReg(b) {
      const urut = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], set = new Set(this.v('REGULER_HARI', 'Senin,Selasa,Rabu,Kamis,Jumat').split(',').map(x => x.trim()).filter(Boolean));
      if (set.has(b.dataset.v)) set.delete(b.dataset.v); else set.add(b.dataset.v);
      if (!set.size) { toast('Minimal satu hari kuliah.', 'warn'); return; }
      this.setNilai('REGULER_HARI', urut.filter(x => set.has(x)).join(',')); this.render(); App.savebar(this);
    },
    prodiEdit(b) {
      const kode = b.dataset.v, p = kode ? this.prodiList().find(x => x.Kode === kode) : { Kode: '', Nama: '', NamaArab: '', Jenjang: 'S1', Deskripsi: '', Warna: '#1E3A8A', Urutan: String(this.prodiList().length + 1), Aktif: 'YA' };
      const baru = !kode, lama = !!DB.get('Prodi', 'Kode', kode);
      Modal.buka({ title: baru ? 'Tambah program studi' : 'Ubah program studi', icon: 'building',
        body: '<div class="fgrid c2"><div class="field"><label>Kode</label><input class="input mono" id="pd-kode" value="' + attr(p.Kode) + '" ' + (lama ? 'disabled' : '') + ' maxlength="10" placeholder="mis. HES"></div><div class="field"><label>Jenjang</label><select class="input" id="pd-jenjang">' + opsi(['S1', 'S2', 'D3', 'D4'], p.Jenjang || 'S1') + '</select></div>' +
          '<div class="field" style="grid-column:1/-1"><label>Nama program studi (tanpa singkatan)</label><input class="input" id="pd-nama" value="' + attr(p.Nama) + '"></div><div class="field" style="grid-column:1/-1"><label>Nama Arab</label><input class="input arab" dir="rtl" id="pd-arab" value="' + attr(p.NamaArab) + '"></div>' +
          '<div class="field" style="grid-column:1/-1"><label>Deskripsi singkat</label><textarea class="input" id="pd-desk" rows="2">' + esc(p.Deskripsi) + '</textarea></div><div class="field"><label>Warna</label><input class="input" type="color" id="pd-warna" value="' + attr(p.Warna || '#1E3A8A') + '" style="padding:3px;height:38px"></div><div class="field"><label>Urutan</label><input class="input" type="number" id="pd-urut" value="' + attr(p.Urutan) + '"></div></div>' +
          '<label class="row gap-s" style="margin-top:12px;cursor:pointer"><span class="switch"><input type="checkbox" id="pd-aktif" ' + (p.Aktif !== 'TIDAK' ? 'checked' : '') + '><i></i></span><span>Prodi aktif</span></label>',
        foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('check') + 'Terapkan</button>',
        acts: { ok: (bb, e, m) => {
          const k = ($('#pd-kode').value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), nama = $('#pd-nama').value.trim();
          if (!k || !nama) { toast('Kode dan nama prodi wajib diisi.', 'err'); return; }
          if (!lama && this.prodiList().some(x => x.Kode === k) && k !== kode) { toast('Kode ' + k + ' sudah dipakai.', 'err'); return; }
          this.st.prodi[k] = { Kode: k, Nama: nama, NamaArab: $('#pd-arab').value.trim(), Jenjang: $('#pd-jenjang').value, Deskripsi: $('#pd-desk').value.trim(), Warna: $('#pd-warna').value, Urutan: $('#pd-urut').value, Aktif: $('#pd-aktif').checked ? 'YA' : 'TIDAK', _baru: !lama };
          m.close(); this.render(); App.savebar(this);
        } } });
    },
    kelasEdit(b) {
      const nama = b.dataset.v, k = nama ? this.kelasList().find(x => x.Nama === nama) : { Nama: '', Kode: '', Pola: 'Reguler', Prodi: '', Warna: '#2563EB', Urutan: String(this.kelasList().length + 1), Aktif: 'YA' };
      const lama = !!DB.get('Kelas', 'Nama', nama), pr = String(k.Prodi || '').split(',').map(x => x.trim());
      Modal.buka({ title: nama ? 'Ubah program kelas' : 'Tambah program kelas', icon: 'layers',
        body: '<div class="fgrid c2"><div class="field"><label>Nama kelas</label><input class="input" id="kl-nama" value="' + attr(k.Nama) + '" ' + (lama ? 'disabled' : '') + ' placeholder="mis. Ma\'had Aly Ikhwan"></div><div class="field"><label>Kode singkat</label><input class="input mono" id="kl-kode" value="' + attr(k.Kode) + '" maxlength="6"></div>' +
          '<div class="field" style="grid-column:1/-1"><label>Pola jam</label><div class="seg" id="kl-pola">' + ['Reguler', 'Hybrid', 'Tidak dijadwalkan'].map(x => '<button type="button" data-v="' + x + '" class="' + (k.Pola === x ? 'on' : '') + '">' + x + '</button>').join('') + '</div></div>' +
          '<div class="field" style="grid-column:1/-1"><label>Dibuka oleh prodi</label><div class="row gap-s">' + this.prodiList().map(p => '<label class="chk"><input type="checkbox" class="kl-pr" value="' + attr(p.Kode) + '" ' + (pr.includes(p.Kode) ? 'checked' : '') + '> ' + esc(p.Kode) + '</label>').join('') + '</div></div>' +
          '<div class="field"><label>Warna</label><input class="input" type="color" id="kl-warna" value="' + attr(k.Warna || '#2563EB') + '" style="padding:3px;height:38px"></div><div class="field"><label>Urutan</label><input class="input" type="number" id="kl-urut" value="' + attr(k.Urutan) + '"></div></div>' +
          '<label class="row gap-s" style="margin-top:12px;cursor:pointer"><span class="switch"><input type="checkbox" id="kl-aktif" ' + (k.Aktif !== 'TIDAK' ? 'checked' : '') + '><i></i></span><span>Kelas aktif</span></label>',
        foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('check') + 'Terapkan</button>',
        onOpen: (box) => { $('#kl-pola', box).onclick = (e) => { const t = e.target.closest('button'); if (!t) return; $$('#kl-pola button', box).forEach(x => x.classList.toggle('on', x === t)); }; },
        acts: { ok: (bb, e, m) => {
          const n = $('#kl-nama').value.trim(), pola = ($('#kl-pola .on') || {}).dataset ? $('#kl-pola .on').dataset.v : 'Reguler', prodi = $$('.kl-pr', m.box).filter(x => x.checked).map(x => x.value);
          if (!n) { toast('Nama kelas wajib diisi.', 'err'); return; }
          if (!prodi.length) { toast('Pilih minimal satu prodi.', 'err'); return; }
          if (!lama && this.kelasList().some(x => x.Nama === n) && n !== nama) { toast('Kelas ' + n + ' sudah ada.', 'err'); return; }
          this.st.kelas[n] = { Nama: n, Kode: ($('#kl-kode').value || n.slice(0, 2)).toUpperCase(), Pola: pola, Prodi: prodi.join(','), Warna: $('#kl-warna').value, Urutan: $('#kl-urut').value, Aktif: $('#kl-aktif').checked ? 'YA' : 'TIDAK', _baru: !lama };
          m.close(); this.render(); App.savebar(this);
        } } });
    },
    jamTambah(b) {
      const jam = this.jamKerja().slice(), pola = b.dataset.v, ada = jam.filter(j => j.Pola === pola), umum = ada.filter(j => j.Hari === (pola === 'Hybrid' ? 'Sabtu' : 'Senin-Jumat'));
      const akhir = umum.sort((x, y) => num(x.Sesi) - num(y.Sesi)).pop();
      jam.push({ Pola: pola, Hari: akhir ? akhir.Hari : (pola === 'Hybrid' ? 'Sabtu' : 'Senin-Jumat'), Sesi: String(akhir ? num(akhir.Sesi) + 1 : 1), Mulai: akhir ? akhir.Selesai : '08.00', Selesai: akhir ? (() => { const m = Dom.menit(akhir.Selesai) + 100; return String(Math.floor(m / 60)).padStart(2, '0') + '.' + String(m % 60).padStart(2, '0'); })() : '09.40', Label: '' });
      this.st.jam = jam; this.render(); App.savebar(this);
    },
    jamHapus(b) { const jam = this.jamKerja().slice(); jam.splice(+b.dataset.v, 1); this.st.jam = jam; this.render(); App.savebar(this); },
    ujTambah() { let uj = []; try { uj = JSON.parse(this.v('UJIAN_SESI', '[]')); } catch (e) {} const a = uj[uj.length - 1]; const m0 = a ? Dom.menit(a.selesai) + 20 : 480; const f = (m) => String(Math.floor(m / 60)).padStart(2, '0') + '.' + String(m % 60).padStart(2, '0'); uj.push({ sesi: uj.length + 1, mulai: f(m0), selesai: f(m0 + 90) }); this.setNilai('UJIAN_SESI', JSON.stringify(uj)); this.render(); App.savebar(this); },
    ujHapus(b) { let uj = []; try { uj = JSON.parse(this.v('UJIAN_SESI', '[]')); } catch (e) {} uj.splice(+b.dataset.v, 1); uj.forEach((u, i) => { u.sesi = i + 1; }); this.setNilai('UJIAN_SESI', JSON.stringify(uj)); this.render(); App.savebar(this); },
    kopSet(b) { this.setNilai(b.dataset.k, b.dataset.v); this.render(); App.savebar(this); },
    kopTgl(b) { const l = this.kopBarisKerja(), x = l[+b.dataset.i]; if (!x) return; x[b.dataset.f] = !x[b.dataset.f]; this.kopBarisSimpan(l); this.render(); },
    kopGeser(b) { const l = this.kopBarisKerja(), i = +b.dataset.i, j = i + num(b.dataset.d); if (!l[i] || !l[j]) return; [l[i], l[j]] = [l[j], l[i]]; this.kopBarisSimpan(l); this.render(); },
    kopHapusBaris(b) { const l = this.kopBarisKerja(); l.splice(+b.dataset.i, 1); this.kopBarisSimpan(l.length ? l : [{ teks: Doc.kampus().toUpperCase(), ukuran: 16, tebal: true, warna: '#1E3A8A' }]); this.render(); },
    kopTambahBaris() { const l = this.kopBarisKerja(); l.push({ teks: '', ukuran: 10, tebal: false, miring: false, arab: false, warna: '#374151' }); this.kopBarisSimpan(l); this.render(); },
    kopResetBaris() { this.setNilai('KOP_BARIS', ''); this.render(); },
    async kopUnggah(b) {
      const f = await pilihBerkas('image/png,image/jpeg,image/webp'); if (!f) return;
      try {
        const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
        const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0);
        await this.kopSimpanGambar(await this.kopKeDataUrl(c), 0, b);
      } catch (e) { toast('Gambar tidak bisa dibaca.', 'err'); }
    },
    kopDoc() {
      Modal.buka({ title: 'Ambil Kop dari Google Docs', icon: 'filetext', body: '<div class="stack"><div class="field"><label>Tautan Google Docs / PDF / gambar di Drive</label><input class="input" id="kd-url" placeholder="https://docs.google.com/document/d/…/edit" autocomplete="off"><span class="help">Dokumen harus dapat dibuka oleh akun pemilik aplikasi. Halaman pertama dipakai sebagai sumber kop.</span></div></div>',
        foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('download') + 'Muat Dokumen</button>',
        acts: { ok: async (bb, e, m) => { const url = $('#kd-url', m.el).value.trim(); if (!url) return toast('Tempel tautan dokumen.', 'warn'); const r = await denganSibuk(bb, 'Memuat…', () => api('kop.dariDoc', { url })); if (r.success) { m.close(); toast(r.message, 'info'); this.kopPotong(r.data); } } } });
    },
    async tataReset(b) {
      const j = b.dataset.v; if (!(await konfirmasi('Kembalikan tata letak <b>' + esc(Tata.SPEC[j].judul) + '</b> ke bawaan aplikasi?', { ok: 'Kembalikan' }))) return;
      const r = await denganSibuk(b, '', () => api('cetak.tata', { jenis: j, nilai: null })); if (r.success) toast(r.message);
    },
    async aset(b) {
      const f = await pilihBerkas('image/png,image/jpeg,image/webp'); if (!f) return;
      let data; try { data = await kecilkanGambar(f, /^LOGO/.test(b.dataset.v) ? 600 : 900); } catch (e) { toast('Gambar tidak bisa dibaca.', 'err'); return; }
      if (data.length * 0.75 > 800 * 1024) { try { data = await kecilkanGambar(f, 500); } catch (e) {} }
      const r = await denganSibuk(b, '', () => api('aset.unggah', { jenis: b.dataset.v, berkas64: data }));
      if (r.success) toast(r.message);
    },
    async asetHapus(b) { if (!(await konfirmasi('Hapus gambar ini? Dokumen yang dicetak berikutnya tidak memuat gambar tersebut.', { danger: true, ok: 'Hapus' }))) return; const r = await denganSibuk(b, '', () => api('aset.unggah', { jenis: b.dataset.v, hapus: true })); if (r.success) toast(r.message); },
    rahasia(b) {
      const k = b.dataset.k, label = { FONNTE_TOKEN: 'Token Fonnte', REKAP_SS_ID: 'ID / URL Spreadsheet Rekap Mahasiswa', VP_URL: 'URL Verifikasi Pusat', VP_KUNCI: 'Kunci Verifikasi Pusat' }[k] || k;
      Modal.buka({ title: 'Simpan ' + label, icon: 'key', size: 'sm',
        body: '<div class="field"><label>' + label + '</label><input class="input mono" id="rh-nilai" type="' + (k === 'REKAP_SS_ID' || k === 'VP_URL' ? 'text' : 'password') + '" autocomplete="off" spellcheck="false"></div>' +
          '<div class="alert info" style="margin-top:12px">' + ic('lock') + '<div>Nilai dikirim sekali ke server lewat koneksi HTTPS dan disimpan di <b>Script Properties</b>. Nilai lengkap tidak pernah ditampilkan lagi — hanya versi tersamar.</div></div>',
        foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('save') + 'Simpan</button>',
        acts: { ok: async (bb, e, m) => { const v = $('#rh-nilai').value.trim(); if (!v) { toast('Nilai kosong.', 'warn'); return; } const r = await denganSibuk(bb, '', () => api('rahasia.simpan', { kunci: k, nilai: v })); $('#rh-nilai').value = ''; if (r.success) { toast(r.message); m.close(); if (k === 'REKAP_SS_ID') api('mahasiswa.refresh', {}, { silent: true }); this.render(); } } } });
    },
    async rahasiaHapus(b) { const k = b.dataset.k; if (!(await konfirmasi('Hapus nilai ' + esc(k) + ' dari Script Properties?' + (k === 'FONNTE_TOKEN' ? '\nPengiriman WhatsApp akan berhenti.' : ''), { danger: true, ok: 'Hapus' }))) return; const r = await denganSibuk(b, '', () => api('rahasia.simpan', { kunci: k, nilai: '__HAPUS__' })); if (r.success) { toast(r.message); this.render(); } },
    async waDev(b) { const r = await denganSibuk(b, 'Memeriksa…', () => api('wa.device', {})); if (r.success) { this.st.dev = r.data; if (Pages.blast) Pages.blast.st.dev = r.data; toast(r.message, r.data.status === 'connect' ? 'ok' : 'warn'); this.render(); } },
    async waTes(b) { const no = $('#wa-tes', this.el).value; if (!waValid(no)) { toast('Nomor tidak valid (contoh 081234567890).', 'err'); return; } const r = await denganSibuk(b, '', () => api('wa.test', { nomor: no })); if (r.success) toast(r.message); },
    async waGrup(b) { const r = await denganSibuk(b, 'Mengambil…', () => api('wa.grup', {}, { timeout: 90000 })); if (r.success) { this.st.waGrup = r.data.grup; toast(r.message); this.render(); } },
    gprodi(b) { this.st.gprodi = b.dataset.v; this.render(); },
    batchWa(b) { this.setNilai('WA_BATCH', b.dataset.v); this.render(); App.savebar(this); },
    varSet(b) { sisipDiKursor($('#tpl-' + b.dataset.k, this.el), b.dataset.v); },
    async rekapTes(b) { const r = await denganSibuk(b, 'Menghubungkan…', () => api('rekap.tes', {}, { timeout: 120000 })); if (r.success) { this.st.rekap = r.data.info; toast(r.message, r.data.info.sheetDipakai ? 'ok' : 'warn'); this.render(); } },
    akunBaru() {
      Modal.buka({ title: 'Tambah akun pengguna', icon: 'user', size: 'sm',
        body: '<div class="stack" style="gap:12px"><div class="field"><label>Username</label><input class="input mono" id="ak-user" autocomplete="off" placeholder="mis. baak.akademik"><span class="help">3–30 karakter: huruf kecil, angka, titik, garis bawah, strip.</span></div><div class="field"><label>Nama lengkap / unit</label><input class="input" id="ak-nama"></div>' +
          '<div class="alert info" style="margin:0">' + ic('key') + '<div>Password sementara dibuat acak oleh server dan ditampilkan sekali. Pengguna wajib menggantinya saat pertama masuk.</div></div></div>',
        foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('plus') + 'Buat Akun</button>',
        acts: { ok: async (bb, e, m) => { const r = await denganSibuk(bb, '', () => api('akun.simpan', { akun: { _baru: true, Username: $('#ak-user').value.trim().toLowerCase(), Nama: $('#ak-nama').value.trim() } })); if (r.success) { m.close(); toast(r.message); if (r.data.sandiAwal) sandiSekali('Akun dibuat', r.data.username, r.data.sandiAwal); } } } });
    },
    akunEdit(b) {
      const u = DB.get('Users', 'Username', b.dataset.v); if (!u) return;
      const adm = u.Peran === 'ADMIN_UTAMA';
      Modal.buka({ title: 'Ubah akun ' + esc(u.Username), icon: 'user', size: 'sm',
        body: '<div class="field"><label>Nama lengkap / unit</label><input class="input" id="ae-nama" value="' + attr(u.Nama) + '"></div>' + (adm ? '<p class="help" style="margin-top:10px">Akun Admin Utama tidak dapat dinonaktifkan.</p>' : '<label class="row gap-s" style="margin-top:12px;cursor:pointer"><span class="switch"><input type="checkbox" id="ae-aktif" ' + (u.Aktif !== 'TIDAK' ? 'checked' : '') + '><i></i></span><span>Akun aktif (nonaktif = sesi langsung dicabut)</span></label>'),
        foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('save') + 'Simpan</button>',
        acts: { ok: async (bb, e, m) => { const r = await denganSibuk(bb, '', () => api('akun.simpan', { akun: { Username: u.Username, Nama: $('#ae-nama').value.trim(), Aktif: adm ? 'YA' : ($('#ae-aktif').checked ? 'YA' : 'TIDAK') } })); if (r.success) { m.close(); toast(r.message); } } } });
    },
    async akunReset(b) {
      const un = b.dataset.v;
      if (!(await konfirmasi('Reset password akun <b>' + esc(un) + '</b>?\nSesi aktifnya langsung dicabut dan password sementara baru ditampilkan sekali.', { danger: true, ok: 'Reset Password', icon: 'key' }))) return;
      const r = await denganSibuk(b, '', () => api('akun.reset', { username: un }));
      if (r.success) sandiSekali('Password direset', r.data.username, r.data.sandiAwal);
    },
    gantiSaya() { App.gantiSandi(false); },
    async migPindai(b) {
      const m = this.st.mig;
      if (!m.url.trim()) { toast('Tempel URL spreadsheet aplikasi lama.', 'warn'); return; }
      if (!m.pilih.length) { toast('Pilih minimal satu data.', 'warn'); return; }
      const r = await denganSibuk(b, 'Memindai…', () => api('migrasi.pindai', { sumber: m.url.trim(), sheets: m.pilih, timpa: m.timpa }, { timeout: 300000 }));
      if (r.success) { m.hasil = r.data; m.kunci = this.kunciMig(); toast(r.message); this.render(); }
    },
    async migJalan(b) {
      const m = this.st.mig, tot = Object.values((m.hasil || {}).laporan || {}).reduce((a, x) => a + x.ditambah + x.diperbarui, 0);
      if (!(await konfirmasi('Jalankan impor dari <b>' + esc(m.hasil.sumber.nama) + '</b>?\n' + tot + ' baris akan ditambah/diperbarui. Data sumber tidak diubah.\n\nDisarankan mengunduh cadangan terlebih dahulu.', { ok: 'Jalankan Impor', icon: 'upload' }))) return;
      const r = await denganSibuk(b, 'Mengimpor…', () => api('migrasi.jalankan', { sumber: m.url.trim(), sheets: m.pilih, timpa: m.timpa }, { timeout: 330000 }));
      if (r.success) { m.hasil = r.data; m.kunci = ''; toast(r.message); this.render(); }
    },
    async cadangan(b) {
      await denganSibuk(b, 'Menyusun…', async () => {
        const sheets = Object.keys(DB.raw).filter(n => n !== 'Mahasiswa' && n !== 'Aset' && DB.raw[n] && DB.raw[n].h).sort().map(n => ({ nama: n, rows: [DB.raw[n].h].concat(DB.raw[n].r.map(r => r.map(x => x === null || x === undefined ? '' : String(x)))) }));
        await Excel.tulis('Cadangan PENJADWALAN AL WAFA ' + isoTgl(), sheets);
      });
      toast('Cadangan diunduh.');
    },
    async muatSemua(b) {
      const tabel = Object.keys(DB.raw).filter(n => n !== 'Mahasiswa' && n !== 'Aset');
      await denganSibuk(b, '', async () => { await api('refresh', { tabel }); await api('mahasiswa.refresh', {}, { silent: true }); });
      toast('Semua data dimuat ulang dari spreadsheet.');
    },
    async bersihLokal() {
      if (!(await konfirmasi('Hapus cache data di browser ini lalu muat ulang aplikasi?\nData di server tidak terpengaruh.', { ok: 'Bersihkan & Muat Ulang' }))) return;
      LS.del(DB.kunci()); location.reload();
    },
    muatLog() { this.st.log = null; this.render(); },
    lpg(b) { this.st.lhal = +b.dataset.p; this.render(); }
  },
  ch: {
    setr(t) { this.setNilai(t.dataset.k, t.value); this.render(); App.savebar(this); },
    kopUk(t) { const l = this.kopBarisKerja(), x = l[+t.dataset.i]; if (!x) return; x.ukuran = Math.max(5, Math.min(40, num(t.value, 10))); this.kopBarisSimpan(l); this.kopSegarkan(); },
    kopWarna(t) { const l = this.kopBarisKerja(), x = l[+t.dataset.i]; if (!x) return; x.warna = t.value; this.kopBarisSimpan(l); this.kopSegarkan(); },
    kopTinggi(t) { this.setNilai('KOP_TINGGI', String(Math.round(num(t.value, 30)))); this.render(); },
    kopMm(t) { this.setNilai('KOP_LOGO_MM', String(Math.round(num(t.value, 22)))); this.render(); },
    async kopDok(t) {
      const j = t.dataset.v, nilai = Object.assign({}, (Dom.setJson('TATA_CETAK', {}) || {})[j] || {}, { kop: t.checked });
      const r = await api('cetak.tata', { jenis: j, nilai }); if (r.success) toast((t.checked ? 'Kop ditampilkan pada ' : 'Kop disembunyikan pada ') + Tata.SPEC[j].judul + '.'); else t.checked = !t.checked;
    },
    ya(t) { this.setNilai(t.dataset.k, t.checked ? 'YA' : 'TIDAK'); this.render(); App.savebar(this); },
    tglPer(t) {
      let o = {}; try { o = JSON.parse(this.v('PERIODE_TANGGAL', '{}')); } catch (e) {}
      const k = t.dataset.key; o[k] = Object.assign({}, o[k] || {}, { [t.dataset.f]: t.value });
      if (o[k].mulai && o[k].selesai && o[k].selesai <= o[k].mulai) toast('Tanggal selesai harus setelah tanggal mulai.', 'warn');
      this.setNilai('PERIODE_TANGGAL', JSON.stringify(o));
    },
    jam(t) {
      const jam = this.jamKerja().map(j => Object.assign({}, j)), j = jam[+t.dataset.i], f = t.dataset.f; if (!j) return;
      j[f] = f === 'Mulai' || f === 'Selesai' ? jamDariInput(t.value) : f === 'Sesi' ? String(Math.max(1, parseInt(t.value, 10) || 1)) : t.value;
      this.st.jam = jam; this.render(); App.savebar(this);
    },
    uj(t) { let uj = []; try { uj = JSON.parse(this.v('UJIAN_SESI', '[]')); } catch (e) {} const u = uj[+t.dataset.i]; if (!u) return; u[t.dataset.f] = jamDariInput(t.value); this.setNilai('UJIAN_SESI', JSON.stringify(uj)); this.render(); App.savebar(this); },
    grupPilih(t) {
      const g = Object.assign({}, this.grupKerja()), key = t.dataset.key, [pr, th, kl] = key.split('|'), w = (this.st.waGrup || []).find(x => x.id === t.value);
      if (!t.value) delete g[key]; else g[key] = { Prodi: pr, Angkatan: th, Kelas: kl, Semester: '', IdGrup: t.value, NamaGrup: w ? w.nama : (g[key] || {}).NamaGrup || '' };
      this.st.grup = g; this.render(); App.savebar(this);
    },
    grupId(t) {
      const g = Object.assign({}, this.grupKerja()), key = t.dataset.key, [pr, th, kl] = key.split('|'), v = t.value.trim();
      if (v && !/@g\.us$/.test(v) && !/^\d{10,30}(-\d+)?$/.test(v)) { toast('ID grup tidak valid (contoh 120363012345678901@g.us).', 'err'); return; }
      if (!v) delete g[key]; else g[key] = { Prodi: pr, Angkatan: th, Kelas: kl, Semester: '', IdGrup: v, NamaGrup: ((this.st.waGrup || []).find(x => x.id === v) || {}).nama || (g[key] || {}).NamaGrup || '' };
      this.st.grup = g; this.render(); App.savebar(this);
    },
    migPilih(t) { const m = this.st.mig; m.pilih = m.pilih.filter(x => x !== t.dataset.v); if (t.checked) m.pilih.push(t.dataset.v); this.render(); },
    migTimpa(t) { this.st.mig.timpa = t.checked; this.render(); }
  },
  inp: {
    kopTeks(t) { const l = this.kopBarisKerja(), x = l[+t.dataset.i]; if (!x) return; x.teks = t.value; this.kopBarisSimpan(l); this.kopSegarkan(); },
    set(t) {
      this.setNilai(t.dataset.k, t.value);
      if (t.dataset.k === 'ST_FORMAT' || t.dataset.k === 'ST_NOMOR_TERAKHIR') { const c = $('#st-contoh', this.el); if (c) c.textContent = nomorContoh(this.v('ST_FORMAT'), num(this.v('ST_NOMOR_TERAKHIR', '0')) + 1, this.v('ST_TANGGAL')); }
      const btn = $('[data-a="simpanSemua"]', this.el); if (!btn && this.isDirty()) { const pa = $('.ph-a', this.el); if (pa) pa.insertAdjacentHTML('beforeend', '<button class="btn btn-primary" data-a="simpanSemua">' + ic('save') + 'Simpan Semua Perubahan</button>'); }
    },
    migUrl(t) { this.st.mig.url = t.value; const b = $('[data-a="migJalan"]', this.el); if (b) b.disabled = !(this.st.mig.hasil && this.st.mig.hasil.dryRun && this.st.mig.kunci === this.kunciMig()); },
    lq: debounce(function (t) { this.st.lq = t.value; this.st.lhal = 1; this.render(); const i = $('[data-in="lq"]', this.el); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250)
  }
});
