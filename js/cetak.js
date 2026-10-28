/* =====================================================================
   PENJADWALAN AL WAFA — cetak.js
   Mesin pratinjau & cetak: satu dokumen = satu lembar A4 (huruf mengecil
   otomatis), pratinjau wajib, Cetak (browser), Unduh PDF (dari tampilan
   pratinjau → identik), simpan otomatis ke Drive, QR verifikasi.
   Berisi juga pembuat semua dokumen cetak (Doc.*).
   ===================================================================== */
'use strict';
const Cetak = {
  st: null,
  kode(prefix) { return (prefix || 'DOK') + '-' + uid(10); },
  logo() { const l = DB.raw.Aset && DB.raw.Aset.logo; return l ? '<img src="' + l + '" alt="Logo">' : LOGO_SVG; },
  qr(kode) { return '<img class="qr" data-qr="' + attr(Dom.urlVerif(kode)) + '" alt="QR verifikasi">'; },
  halaman(isi, land, kelas, o) { o = o || {}; return '<div class="a4 ' + (land ? 'land ' : '') + (kelas || '') + '" data-fs="' + (o.fs || 11) + '" data-min="' + (o.min || 6) + '"><div class="a4-in">' + isi + '</div>' + (o.luar || '') + (o.draf ? '<div class="draf-mark">DRAF</div>' : '') + '</div>'; },
  async isiQr(root) {
    const imgs = $$('img[data-qr]', root).filter(i => !i.getAttribute('src'));
    if (!imgs.length) return;
    try { await Lib.qr(); } catch (e) { return; }
    const cache = {};
    imgs.forEach(img => {
      const t = img.dataset.qr;
      if (!cache[t]) { const q = qrcode(0, 'M'); q.addData(t); q.make(); cache[t] = q.createDataURL(4, 2); }
      img.src = cache[t];
    });
  },
  async tungguGambar(root) {
    try { await document.fonts.ready; } catch (e) {}
    await Promise.all($$('img', root).map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));
  },
  /** Kecilkan huruf sampai isi pas satu lembar (pencarian biner). */
  fit(pg) {
    const inn = pg.querySelector('.a4-in'), base = num(pg.dataset.fs, 11), min = num(pg.dataset.min, 6);
    const vOk = () => inn.scrollHeight <= inn.clientHeight + 1, hOk = () => inn.scrollWidth <= inn.clientWidth + 2;
    inn.style.setProperty('--fs', base + 'px');
    if (vOk() && hOk()) return { fs: base, ok: true };
    /* bila di huruf terkecil pun lebar tetap meluap, luapan itu bukan soal ukuran huruf → abaikan lebar */
    inn.style.setProperty('--fs', min + 'px');
    const pakaiH = hOk(), muat = () => vOk() && (!pakaiH || hOk());
    let lo = min, hi = base;
    for (let i = 0; i < 9; i++) { const mid = (lo + hi) / 2; inn.style.setProperty('--fs', mid + 'px'); if (muat()) lo = mid; else hi = mid; }
    inn.style.setProperty('--fs', lo + 'px');
    return { fs: Math.round(lo * 10) / 10, ok: muat() };
  },


  /* ---------------- pratinjau ---------------- */
  async buka(o) {
    this.st = { o, orient: o.orientasi || 'auto', zoom: 0, docs: [], kode: o.simpan === 'per' ? null : this.kode(o.prefix || 'DOK'), tata: o.tata ? Tata.nilai(o.tata, o.tataUbah) : null };
    const pv = $('#preview');
    pv.innerHTML = '<div class="pv-bar"><button class="btn btn-ghost btn-icon" data-pv="tutup" title="Tutup">' + ic('arrowl') + '</button><div style="min-width:0;flex:1 1 220px"><h3>' + esc(o.judul || 'Pratinjau Cetak') + '</h3><div class="sub" id="pv-sub">' + esc(o.sub || '') + '</div></div>' +
      (o.bisaOrientasi !== false ? '<div class="seg" id="pv-or">' + ['auto', 'portrait', 'landscape'].map(v => '<button data-pv="or" data-v="' + v + '" class="' + (this.st.orient === v ? 'on' : '') + '">' + { auto: 'Otomatis', portrait: 'Portrait', landscape: 'Landscape' }[v] + '</button>').join('') + '</div>' : '') +
      '<div class="row gap-s"><button class="btn btn-sm btn-icon" data-pv="zout" title="Perkecil">' + ic('minus', 'ic-sm') + '</button><span class="mono" id="pv-zoom" style="min-width:46px;text-align:center">100%</span><button class="btn btn-sm btn-icon" data-pv="zin" title="Perbesar">' + ic('plus', 'ic-sm') + '</button><button class="btn btn-sm" data-pv="fit">Pas</button></div>' +
      '<span class="muted" id="pv-hal"></span>' +
      (o.tata ? '<button class="btn" data-pv="tata" id="pv-tata-btn">' + ic('layers') + 'Tata Letak</button>' : '') +
      '<button class="btn btn-soft" data-pv="unduh">' + ic('download') + 'Unduh PDF</button><button class="btn btn-accent" data-pv="cetak">' + ic('printer') + 'Cetak</button><button class="btn" data-pv="tutup">Tutup</button></div>' +
      '<div class="pv-main"><div class="pv-body" id="pv-body"><div class="pv-pages" id="pv-pages"><div class="splash-in" style="color:#fff;padding:60px"><div class="spin"></div>Menyusun dokumen…</div></div></div>' +
      (o.tata ? '<aside class="pv-tata hidden" id="pv-tata"></aside>' : '') + '</div>' +
      '<div class="pv-foot" id="pv-foot"></div>';
    pv.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    pv.onclick = (e) => { const b = e.target.closest('[data-pv]'); if (!b) return; this.aksi(b.dataset.pv, b); };
    await this.render();
  },
  tutup() { const pv = $('#preview'); pv.classList.add('hidden'); pv.innerHTML = ''; document.body.style.overflow = ''; if (this.st && this.st.o.onTutup) this.st.o.onTutup(); this.st = null; },
  async render() {
    const st = this.st; if (!st) return;
    let docs;
    try { docs = await st.o.buat({ orient: st.orient, kode: st.kode, tata: st.tata }); }
    catch (e) { console.error(e); toast('Gagal menyusun dokumen: ' + e.message, 'err'); return; }
    st.docs = docs || [];
    const stage = $('#print-stage');
    stage.innerHTML = st.docs.map((d, i) => d.halaman.map(h => h.replace('class="a4 ', 'data-doc="' + i + '" class="a4 ')).join('')).join('');
    await this.isiQr(stage);
    await this.tungguGambar(stage);
    const info = $$('.a4', stage).map(pg => this.fit(pg));
    const pages = $('#pv-pages');
    if (!pages) return;
    pages.innerHTML = $$('.a4', stage).map(pg => '<div class="pv-page-wrap">' + pg.outerHTML + '</div>').join('') || '<div class="empty" style="color:#fff">' + ic('info') + '<div>Tidak ada dokumen untuk dicetak.</div></div>';
    $('#pv-hal').textContent = info.length + ' lembar A4';
    const minFs = info.length ? Math.min.apply(null, info.map(x => x.fs)) : 0, semuaOk = info.every(x => x.ok);
    $('#pv-foot').innerHTML = '<span class="badge ' + (semuaOk ? 'ok' : 'warn') + '">' + ic(semuaOk ? 'okc' : 'alert', 'ic-sm') + (semuaOk ? 'Setiap dokumen muat 1 lembar A4' : 'Ada lembar yang isinya terlalu padat — huruf sudah di batas bawah') + '</span>' +
      '<span>Huruf terkecil ±' + (minFs * 0.75).toFixed(1) + ' pt</span><span>Margin 10 mm</span><span id="pv-drive" class="sp"></span>' +
      '<span class="faint">PDF disimpan otomatis ke Drive: ' + esc(Dom.perLabel(st.o.periode)) + ' / ' + esc(st.o.folder || 'Jadwal') + '</span>';
    if (!st.zoom) this.zoomPas(); else this.terapZoom();
  },
  zoomPas() {
    const body = $('#pv-body'), pg = $('#pv-pages .a4'); if (!body || !pg) return;
    this.st.zoom = Math.max(0.3, Math.min(1.25, (body.clientWidth - 40) / pg.offsetWidth));
    this.terapZoom();
  },
  terapZoom() { const p = $('#pv-pages'); if (!p) return; p.style.zoom = this.st.zoom; $('#pv-zoom').textContent = Math.round(this.st.zoom * 100) + '%'; },
  async aksi(a, btn) {
    const st = this.st; if (!st) return;
    if (a === 'tutup') return this.tutup();
    if (a === 'tata') { const p = $('#pv-tata'); if (!p) return; const buka = p.classList.contains('hidden'); p.classList.toggle('hidden', !buka); btn.classList.toggle('btn-primary', buka); if (buka) Tata.panel(); setTimeout(() => this.zoomPas(), 30); return; }
    if (a === 'tataSimpan') { const r = await denganSibuk(btn, 'Menyimpan…', () => api('cetak.tata', { jenis: st.o.tata, nilai: st.tata })); if (r.success) toast(r.message); return; }
    if (a === 'tataReset') { if (!(await konfirmasi('Kembalikan tata letak ' + esc(Tata.SPEC[st.o.tata].judul) + ' ke bawaan aplikasi untuk semua pengguna?', { ok: 'Kembalikan' }))) return; const r = await denganSibuk(btn, '', () => api('cetak.tata', { jenis: st.o.tata, nilai: null })); if (r.success) { st.tata = Tata.nilai(st.o.tata); Tata.panel(); toast(r.message); await this.render(); } return; }
    if (a === 'zin') { st.zoom = Math.min(2, st.zoom + 0.1); return this.terapZoom(); }
    if (a === 'zout') { st.zoom = Math.max(0.25, st.zoom - 0.1); return this.terapZoom(); }
    if (a === 'fit') return this.zoomPas();
    if (a === 'or') { st.orient = btn.dataset.v; $$('#pv-or button').forEach(b => b.classList.toggle('on', b === btn)); return this.render(); }
    if (a === 'cetak' || a === 'unduh') {
      if (!st.docs.length) return;
      if (st.o.sebelum) {
        const r = await denganSibuk(btn, 'Menyiapkan…', () => st.o.sebelum(st.docs));
        if (r === false) return;
        if (r && r.rebuild) await this.render();
      }
      if (a === 'cetak') { window.print(); this.simpanLatar(false); }
      else await denganSibuk(btn, 'Membuat PDF…', () => this.simpanLatar(true));
    }
  },
  /** Buat PDF dari halaman pratinjau (html2canvas + jsPDF). */
  async pdfDari(pages) {
    await Lib.pdf();
    const { jsPDF } = window.jspdf;
    let doc = null;
    for (const pg of pages) {
      const land = pg.classList.contains('land');
      const canvas = await html2canvas(pg, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false,
        onclone: (d) => { const s = d.getElementById('print-stage'); if (s) { s.style.left = '0px'; s.style.top = '0px'; s.style.position = 'absolute'; } } });
      const img = canvas.toDataURL('image/jpeg', 0.9);
      if (!doc) doc = new jsPDF({ orientation: land ? 'landscape' : 'portrait', unit: 'mm', format: 'a4', compress: true });
      else doc.addPage('a4', land ? 'landscape' : 'portrait');
      doc.addImage(img, 'JPEG', 0, 0, land ? 297 : 210, land ? 210 : 297, undefined, 'FAST');
    }
    return doc ? doc.output('blob') : null;
  },
  async simpanLatar(unduh) {
    const st = this.st; if (!st) return;
    const o = st.o, stage = $('#print-stage'), drv = () => $('#pv-drive');
    const tulis = (t) => { const el = drv(); if (el) el.innerHTML = t; };
    try {
      tulis('<span class="spin spin-sm"></span> Membuat PDF…');
      const semua = $$('.a4', stage);
      let gabung = null;
      if (unduh || o.simpan !== 'per') gabung = await this.pdfDari(semua);
      if (unduh && gabung) unduhBlob(gabung, (o.namaFile || 'Dokumen') + '.pdf');
      if (o.tanpaDrive) { tulis(''); return; }
      const hasil = [];
      if (o.simpan === 'per') {
        for (let i = 0; i < st.docs.length; i++) {
          const d = st.docs[i];
          tulis('<span class="spin spin-sm"></span> Menyimpan ke Drive ' + (i + 1) + '/' + st.docs.length + '…');
          const blob = st.docs.length === 1 && gabung ? gabung : await this.pdfDari(semua.filter(p => p.dataset.doc === String(i)));
          const r = await api('pdf.simpan', { periode: o.periode, sub: o.folder, nama: d.nama, berkas64: await blobKeDataUrl(blob), dok: d.dok, stId: d.stId }, { silent: true });
          hasil.push(r); if (o.setelahSimpan) o.setelahSimpan(d, r);
        }
      } else {
        tulis('<span class="spin spin-sm"></span> Menyimpan ke Drive…');
        const d0 = st.docs[0] || {};
        const dok = Object.assign({ kode: st.kode, jenis: o.jenis || 'DOKUMEN', judul: o.namaFile }, o.dok || {}, d0.dokGabung || {});
        dok.kode = st.kode;
        const r = await api('pdf.simpan', { periode: o.periode, sub: o.folder, nama: o.namaFile, berkas64: await blobKeDataUrl(gabung), dok }, { silent: true });
        hasil.push(r); if (o.setelahSimpan) o.setelahSimpan(d0, r);
      }
      const ok = hasil.filter(r => r.success).length;
      if (ok === hasil.length) { tulis(ic('cloud', 'ic-sm') + ' Tersimpan di Drive'); toast('Tersimpan di Drive: ' + (hasil.length === 1 ? hasil[0].data.folder + ' / ' + hasil[0].data.nama : hasil.length + ' berkas di ' + Dom.perLabel(o.periode) + ' / ' + o.folder)); }
      else { tulis(ic('alert', 'ic-sm') + ' ' + (hasil.length - ok) + ' berkas gagal disimpan'); toast('Sebagian PDF gagal disimpan ke Drive: ' + (hasil.find(r => !r.success) || {}).message, 'err'); }
    } catch (e) { console.error(e); tulis(''); toast('Gagal membuat/menyimpan PDF: ' + e.message, 'err'); }
  }
};

/* =====================================================================
   TATA LETAK CETAK (v1.1) — lebar kolom, tinggi baris, kop per jenis dokumen.
   Nilai bawaan aplikasi ← disimpan bersama (Pengaturan TATA_CETAK) ← ubahan sesi pratinjau.
   ===================================================================== */
const Tata = {
  SPEC: {
    DAFTAR_HADIR: { judul: 'Daftar Hadir', kolom: [['no', 'No', 7], ['nama', 'Nama Lengkap', 43], ['ttd', 'Tanda Tangan', 50]],
      opsi: [['kop', 'Tampilkan kop surat', 'cek', false], ['isi', 'Baris mengisi penuh halaman', 'cek', true], ['baris', 'Tinggi baris minimum', 'angka', 1.9, 1.2, 4, 0.1, '× huruf'], ['kapital', 'Nama huruf kapital', 'cek', true], ['kosong', 'Baris kosong tambahan', 'angka', 4, 0, 10, 1, 'baris'], ['catatan', 'Catatan pelaksanaan acara', 'cek', true], ['kaki', 'QR verifikasi & penanggung jawab', 'cek', true]] },
    ABSENSI: { judul: 'Absensi Mahasiswa', kolom: [['no', 'No', 4], ['nama', 'Nama Mahasiswa', 28], ['ket', 'Ket (L/P)', 4], ['pertemuan', 'Semua kolom pertemuan', 64]],
      opsi: [['kop', 'Tampilkan kop surat', 'cek', false], ['baris', 'Tinggi baris', 'angka', 1.75, 1.2, 4, 0.05, '× huruf'], ['kosong', 'Baris kosong tambahan', 'angka', 4, 0, 10, 1, 'baris']] },
    PENERIMA_KITAB: { judul: 'Penerima Kitab', kolom: [['no', 'No', 5], ['nama', 'Nama Mahasiswa', 30], ['kitab', 'Semua kolom kitab', 65]],
      opsi: [['kop', 'Tampilkan kop surat', 'cek', true], ['baris', 'Tinggi baris', 'angka', 1.95, 1.2, 4, 0.05, '× huruf'], ['kosong', 'Baris kosong tambahan', 'angka', 4, 0, 10, 1, 'baris']] },
    HADIR_DOSEN: { judul: 'Kehadiran Dosen', kolom: [['no', 'No', 3], ['nama', 'Nama', 17], ['prodi', 'Prodi', 7], ['sks', 'Sks', 3.6], ['mk', 'Mata Kuliah', 20], ['hari', 'Kolom hari (Senin–Sabtu)', 42], ['total', 'Total', 3.7], ['ket', 'Ket', 3.7]],
      opsi: [['kop', 'Tampilkan kop surat', 'cek', false], ['centang', 'Centang otomatis sesuai jadwal', 'cek', true], ['baris', 'Tinggi baris', 'angka', 2.3, 1.4, 5, 0.1, '× huruf'], ['sel', 'Kotak per hari (Senin–Jumat)', 'angka', 6, 2, 12, 1, 'kotak'], ['selSabtu', 'Kotak hari Sabtu', 'angka', 4, 0, 12, 1, 'kotak'], ['kosong', 'Baris kosong tambahan', 'angka', 1, 0, 10, 1, 'baris']] },
    SURAT_TUGAS: { judul: 'Surat Tugas', kolom: [['no', 'No', 5], ['mk', 'Mata Kuliah', 31], ['sks', 'SKS', 6], ['smt', 'Smt', 6], ['prodi', 'Prodi', 19], ['program', 'Program', 14], ['jadwal', 'Jadwal', 19]],
      opsi: [['kop', 'Tampilkan kop surat', 'cek', true], ['jadwal', 'Tampilkan kolom jadwal', 'cek', true]] },
    PDDIKTI: { judul: 'Daftar MK PDDIKTI', kolom: [['no', 'No', 5], ['kode', 'Kode', 13], ['mk', 'Mata Kuliah', 36], ['sks', 'SKS PDDIKTI', 9], ['dosen', 'Dosen Pengampu', 37]],
      opsi: [['kop', 'Tampilkan kop surat', 'cek', true], ['baris', 'Tinggi baris', 'angka', 1.7, 1.2, 4, 0.05, '× huruf'], ['rekap', 'Halaman rekap SKS dosen', 'cek', true]] }
  },
  bawaan(jenis) {
    const sp = this.SPEC[jenis], v = { kolom: {} };
    sp.kolom.forEach(k => { v.kolom[k[0]] = k[2]; });
    sp.opsi.forEach(o => { v[o[0]] = o[3]; });
    return v;
  },
  nilai(jenis, ubah) {
    const v = this.bawaan(jenis), sim = (Dom.setJson('TATA_CETAK', {}) || {})[jenis] || {};
    [sim, ubah || {}].forEach(src => { Object.keys(src).forEach(k => { if (k === 'kolom' && src.kolom && typeof src.kolom === 'object') Object.keys(src.kolom).forEach(c => { if (c in v.kolom && num(src.kolom[c], 0) > 0) v.kolom[c] = num(src.kolom[c]); }); else if (src[k] !== null && src[k] !== undefined) v[k] = src[k]; }); });
    return v;
  },
  ttdHadirBawaan() { return [{ jabatan: 'Kaprodi Ekonomi Syariah', nama: '' }, { jabatan: 'Kaprodi Hukum Ekonomi Syariah', nama: '' }, { jabatan: 'Puket 2 (Administrasi & Kepegawaian)', nama: '' }]; },
  /** Lebar kolom dalam persen (bobot dinormalkan ke 100%). */
  persen(t, kunci) { const tot = Object.values(t.kolom).reduce((a, b) => a + num(b, 0), 0) || 1; return (num(t.kolom[kunci], 0) / tot * 100); },
  panel() {
    const st = Cetak.st, el = $('#pv-tata'); if (!st || !el || !st.o.tata) return;
    const sp = this.SPEC[st.o.tata], t = st.tata;
    el.innerHTML = '<div class="pv-tata-h"><b>' + ic('layers', 'ic-sm') + ' Tata Letak — ' + esc(sp.judul) + '</b><button class="icon-btn" data-pv="tata" title="Tutup">' + ic('x') + '</button></div>' +
      '<div class="pv-tata-b"><div class="lbl">Lebar kolom</div>' + sp.kolom.map(k => '<div class="tt-row"><label>' + esc(k[1]) + '</label><input type="range" min="1" max="80" step="0.5" value="' + attr(t.kolom[k[0]]) + '" data-tt="kolom" data-k="' + k[0] + '"><span class="mono" id="tt-p-' + k[0] + '">' + this.persen(t, k[0]).toFixed(0) + '%</span></div>').join('') +
      '<div class="help" style="margin:2px 0 12px">Geser untuk mengatur proporsi; total otomatis 100% lebar kertas.</div><div class="lbl">Pilihan</div>' +
      sp.opsi.map(o => o[2] === 'cek' ? '<label class="tt-cek"><input type="checkbox" data-tt="opsi" data-k="' + o[0] + '" ' + (t[o[0]] ? 'checked' : '') + '> ' + esc(o[1]) + '</label>'
        : '<div class="tt-row"><label>' + esc(o[1]) + '</label><input type="range" min="' + o[4] + '" max="' + o[5] + '" step="' + o[6] + '" value="' + attr(t[o[0]]) + '" data-tt="opsi" data-k="' + o[0] + '"><span class="mono" id="tt-o-' + o[0] + '">' + esc(t[o[0]]) + ' ' + esc(o[7] || '') + '</span></div>').join('') +
      '<div class="alert info" style="margin:12px 0 0;font-size:12.5px">' + ic('info') + '<div>Perubahan langsung tampil di pratinjau. Tekan <b>Jadikan bawaan</b> agar dipakai untuk semua cetakan berikutnya (semua pengguna).</div></div></div>' +
      '<div class="pv-tata-f"><button class="btn btn-sm" data-pv="tataReset">' + ic('refresh', 'ic-sm') + 'Bawaan aplikasi</button><button class="btn btn-sm btn-primary" data-pv="tataSimpan">' + ic('save', 'ic-sm') + 'Jadikan bawaan</button></div>';
    el.oninput = el.onchange = (e) => {
      const i = e.target.closest('[data-tt]'); if (!i || !Cetak.st) return;
      const sp2 = this.SPEC[Cetak.st.o.tata], t2 = Cetak.st.tata, k = i.dataset.k;
      if (i.dataset.tt === 'kolom') { t2.kolom[k] = num(i.value, 1); sp2.kolom.forEach(c => { const x = $('#tt-p-' + c[0]); if (x) x.textContent = this.persen(t2, c[0]).toFixed(0) + '%'; }); }
      else { const o = sp2.opsi.find(x => x[0] === k); t2[k] = o[2] === 'cek' ? i.checked : num(i.value, o[3]); const x = $('#tt-o-' + k); if (x) x.textContent = t2[k] + ' ' + (o[7] || ''); }
      clearTimeout(this._t); this._t = setTimeout(() => Cetak.render(), e.type === 'change' ? 0 : 260);
    };
  }
};

/* =====================================================================
   PEMBUAT DOKUMEN
   ===================================================================== */
const Doc = {
  /* ---------- Kop surat (v1.1): bawaan tersusun atau gambar ---------- */
  kopBawaan() {
    return [{ teks: this.kampus().toUpperCase(), ukuran: 16, tebal: true, warna: '#1E3A8A' }, { teks: Dom.set('KAMPUS_NAMA_ARAB'), ukuran: 14, arab: true, warna: '#1F2937' }, { teks: Dom.set('KAMPUS_SK'), ukuran: 8, warna: '#374151' },
      { teks: this.alamat(), ukuran: 8.5, warna: '#374151' }, { teks: this.kontak(), ukuran: 8.5, warna: '#374151' }].filter(b => String(b.teks || '').trim());
  },
  kopBaris(src) {
    const js = src !== undefined ? src : Dom.setJson('KOP_BARIS', null);
    if (Array.isArray(js) && js.some(b => b && String(b.teks || '').trim())) return js.filter(b => b && String(b.teks || '').trim());
    return this.kopBawaan();
  },
  kopCfg() { return { mode: Dom.set('KOP_MODE', 'bawaan'), baris: this.kopBaris(), garis: Dom.set('KOP_GARIS', 'ganda'), logo: Dom.set('KOP_LOGO', 'kiri'), rata: Dom.set('KOP_RATA', 'tengah'), mm: num(Dom.set('KOP_LOGO_MM', '22'), 22), tinggi: num(Dom.set('KOP_TINGGI', '30'), 30) }; },
  kop(tata, opsi) { if (tata && tata.kop === false) return ''; return this.kopDari(this.kopCfg(), opsi); },
  /** c: {mode, baris, garis, logo, rata, mm, tinggi} — dipakai juga oleh pratinjau di Pengaturan. */
  kopDari(c, opsi) {
    opsi = opsi || {};
    const aset = (DB.raw.Aset || {});
    if (c.mode === 'gambar' && aset.kop) return '<div class="kopx gb"><img src="' + aset.kop + '" alt="Kop surat" style="max-height:' + num(c.tinggi, 30) + 'mm"></div>';
    const pos = c.logo || 'kiri', rata = c.rata || 'tengah', mm = Math.max(10, Math.min(40, num(c.mm, 22)));
    const lg = (img) => '<div class="lg" style="width:' + mm + 'mm;height:' + mm + 'mm">' + img + '</div>', kosong = '<div style="width:' + mm + 'mm;flex:none"></div>';
    const logo2 = aset.logo2 ? '<img src="' + aset.logo2 + '" alt="Logo">' : Cetak.logo();
    const kiri = pos === 'kiri' || pos === 'keduanya' ? lg(Cetak.logo()) : (pos === 'kanan' && rata === 'tengah' ? kosong : '');
    const kanan = pos === 'kanan' ? lg(Cetak.logo()) : pos === 'keduanya' ? lg(logo2) : (pos === 'kiri' && rata === 'tengah' ? kosong : '');
    const baris = (c.baris || []).filter(b => b && String(b.teks || '').trim()).map(b => '<div class="' + (b.arab ? 'arab' : '') + '"' + (b.arab ? ' dir="rtl"' : '') + ' style="font-size:' + Math.max(5, Math.min(40, num(b.ukuran, 10))) + 'pt;font-weight:' + (b.tebal ? 800 : 400) + ';' + (b.miring ? 'font-style:italic;' : '') + 'color:' + attr(/^#[0-9a-f]{6}$/i.test(b.warna) ? b.warna : '#111827') + '">' + esc(b.teks) + '</div>').join('');
    return '<div class="kopx g-' + attr(c.garis || 'ganda') + ' r-' + attr(rata) + (opsi.cls ? ' ' + opsi.cls : '') + '">' + kiri + '<div class="tx">' + baris + '</div>' + kanan + '</div>';
  },
  /** Nilai tata letak untuk dokumen (dari pratinjau, atau tersimpan bila dicetak di latar). */
  tata(jenis, ctx) { return (ctx && ctx.tata) || Tata.nilai(jenis); },
  colW(t, k, n) { return (Tata.persen(t, k) / (n || 1)).toFixed(3) + '%'; },

  kampus() { return Dom.set('KAMPUS_NAMA', 'Sekolah Tinggi Ilmu Syariah Al Wafa'); },
  alamat() { return Dom.set('KAMPUS_ALAMAT', ''); },
  kontak() { return [Dom.set('KAMPUS_TELP') ? 'Telp. ' + Dom.set('KAMPUS_TELP') : '', Dom.set('KAMPUS_WEB') ? 'Website: ' + Dom.set('KAMPUS_WEB') : '', Dom.set('KAMPUS_EMAIL') ? 'Email: ' + Dom.set('KAMPUS_EMAIL') : ''].filter(Boolean).join(' · '); },
  vbox(kode, ket) { return '<div class="vbox">' + Cetak.qr(kode) + '<div><b>Verifikasi dokumen</b>' + esc(ket || 'Pindai QR untuk memeriksa keaslian') + '<br><span class="mono">' + esc(kode) + '</span></div></div>'; },
  dicetak() { const d = new Date(); return 'Dicetak: ' + d.getDate() + ' ' + BLN3[d.getMonth()] + ' ' + d.getFullYear() + ', ' + fmtJam(d) + ' WIB'; },
  mkSel(u, mode) {
    if (!u) return '';
    const ar = u.kur.NamaArab ? '<span class="ar arab">' + esc(u.kur.NamaArab) + '</span>' : '';
    const ds = mode === 'dosen' ? esc(Dom.prodiNama(u.prodi)) + ' · ' + esc(u.kelas) + ' · Smt ' + u.smt : esc(Dom.dosenTeks(u));
    return '<span class="mk">' + esc(u.kur.NamaMK) + (u.gabung ? ' ⧉' : '') + '</span>' + ar + '<span class="ds">' + ds + '</span>';
  },
  /** Peta isi sel: kunci rombel#hari|sesi → [unit] dari entri {RealisasiID, Hari, Sesi}. */
  petaIsi(entri, um, kunciFn) { const m = new Map(); entri.forEach(j => { const u = um.get(j.RealisasiID); if (!u) return; const k = kunciFn(u) + '#' + j.Hari + '|' + j.Sesi; if (!m.has(k)) m.set(k, []); if (!m.get(k).includes(u)) m.get(k).push(u); }); return m; },
  bandJadwal(kode) { return '<div class="band"><div><b>' + esc(this.kampus().toUpperCase()) + '</b><small>' + esc(this.alamat()) + '</small></div><div class="fm">FORMULIR: AKAD-JADWAL<br>' + esc(kode) + '</div></div>'; },
  headJadwal(judul, sub) { return '<div class="head"><div class="lg">' + Cetak.logo() + '</div><div><h1>' + esc(judul) + '</h1><div class="sub">' + esc(sub || '') + '</div></div><div class="dt">' + this.dicetak() + '</div></div>'; },
  infoBox(items) { return '<div class="info" style="--ic:' + items.length + '">' + items.map(x => '<div><small>' + esc(x[0]) + '</small><b>' + esc(x[1]) + '</b></div>').join('') + '</div>'; },
  footJadwal(kode) { return '<div class="foot"><div class="quote">“' + esc(Dom.set('JADWAL_KUTIPAN', 'Ilmu adalah cahaya, jadwal adalah kuncinya.')) + '”</div>' + this.vbox(kode, 'Jadwal resmi ' + this.kampus()) + '</div>'; },

  /** Tabel jadwal satu rombel/dosen untuk satu pola. isiFn(hari, sesi) → html sel. */
  tabelPola(pola, isiFn, ujian) {
    const slots = ujian ? Dom.ujianSlots(pola) : Dom.slots(pola);
    if (pola === 'Hybrid') {
      const hari = [...new Set(slots.map(s => s.hari))];
      return '<table class="g"><thead><tr><th style="width:20%">SESI / JAM</th>' + hari.map(h => '<th>' + h.toUpperCase() + '</th>').join('') + '</tr></thead><tbody>' +
        slots.map(s => '<tr><td class="hr">' + s.hari.toUpperCase() + ' · SESI ' + s.sesi + '<br><small style="font-weight:600">' + s.mulai + '–' + s.selesai + '</small></td>' +
          hari.map(h => h !== s.hari ? '<td class="na"></td>' : (() => { const v = isiFn(h, s.sesi); return v ? '<td>' + v + '</td>' : '<td class="kosong">—</td>'; })()).join('') + '</tr>').join('') + '</tbody></table>';
    }
    const hari = [...new Set(slots.map(s => s.hari))], sesi = [...new Set(slots.map(s => s.sesi))].sort((a, b) => a - b);
    const jam = (sn) => { const s = slots.find(x => x.sesi === sn); return s ? s.mulai + ' – ' + s.selesai : ''; };
    return '<table class="g"><thead><tr><th style="width:11%">HARI</th>' + sesi.map(sn => '<th>SESI ' + sn + '<small>' + jam(sn) + '</small></th>').join('') + '</tr></thead><tbody>' +
      hari.map(h => '<tr><td class="hr">' + h.toUpperCase() + '</td>' + sesi.map(sn => { const v = isiFn(h, sn); return v ? '<td>' + v + '</td>' : '<td class="kosong">—</td>'; }).join('') + '</tr>').join('') + '</tbody></table>';
  },

  /* ---------- Jadwal Per Kelas ---------- */
  jadwalKelas(rb, perKey, ctx, sumber) {
    const um = Dom.unitMap(perKey), entri = (sumber || Dom.jadwal(perKey, rb.pola).filter(j => j.Posisi === 'GRID'));
    const peta = this.petaIsi(entri, um, u => u.rombel), kode = ctx.kode || Cetak.kode('JDW');
    const land = ctx.orient === 'landscape' || (ctx.orient === 'auto' && rb.pola !== 'Hybrid');
    const isi = (h, s) => (peta.get(rb.key + '#' + h + '|' + s) || []).map(u => this.mkSel(u)).join('<hr style="border:0;border-top:1px dashed #F6C898;margin:.25em 0">');
    const smt = Dom.semMhs(rb.angkatan, perKey);
    const html = this.bandJadwal(kode) + this.headJadwal('JADWAL PERKULIAHAN', 'Program Sarjana (S1) · ' + Dom.prodiNama(rb.prodi)) +
      this.infoBox([['PROGRAM STUDI', Dom.prodiNama(rb.prodi)], ['KELAS', rb.kelas], ['SEMESTER', 'SEMESTER ' + smt], ['TAHUN AKADEMIK', Dom.perTA(perKey)]]) +
      '<div class="grow">' + this.tabelPola(rb.pola, isi) + '</div>' + this.footJadwal(kode);
    return { judul: Dom.rombelLabel(rb.prodi, rb.angkatan, rb.kelas, perKey), nama: 'Jadwal ' + rb.prodi + ' Smt ' + smt + ' ' + rb.kelas + ' — ' + Dom.perLabel(perKey).replace('/', '-'),
      halaman: [Cetak.halaman(html, land, 'jd', { fs: 11, min: 6 })], dok: { kode, jenis: 'JADWAL_KELAS', judul: 'Jadwal Perkuliahan ' + Dom.rombelLabel(rb.prodi, rb.angkatan, rb.kelas, perKey, true), ringkasan: { rombel: rb.key, rombel_label: Dom.rombelLabel(rb.prodi, rb.angkatan, rb.kelas, perKey, true), prodi: Dom.prodiNama(rb.prodi), kelas: rb.kelas, semester: smt } } };
  },
  /* ---------- Jadwal Per Dosen (satu halaman per pola) ---------- */
  jadwalDosen(dosenId, perKey, ctx) {
    const d = DB.get('Dosen', 'ID', dosenId) || {}, um = Dom.unitMap(perKey), kode = ctx.kode || Cetak.kode('JDW');
    const entri = Dom.jadwal(perKey).filter(j => j.Posisi === 'GRID' && (um.get(j.RealisasiID) || { dosen: [] }).dosen.includes(dosenId));
    const pola = ['Reguler', 'Hybrid'].filter(p => entri.some(j => j.Pola === p));
    const halaman = pola.map(p => {
      const peta = this.petaIsi(entri.filter(j => j.Pola === p), um, () => 'D');
      const isi = (h, s) => (peta.get('D#' + h + '|' + s) || []).map(u => this.mkSel(u, 'dosen')).join('<hr style="border:0;border-top:1px dashed #F6C898;margin:.25em 0">');
      const land = ctx.orient === 'landscape' || (ctx.orient === 'auto' && p !== 'Hybrid');
      const html = this.bandJadwal(kode) + this.headJadwal('JADWAL PERKULIAHAN', 'Jadwal Mengajar Dosen · Pola ' + p) +
        this.infoBox([['NAMA DOSEN', d.Nama || ''], ['NIDN', d.NIDN || '-'], ['POLA JAM', p === 'Hybrid' ? 'HYBRID (JUMAT & SABTU)' : 'REGULER (SENIN – JUMAT)'], ['TAHUN AKADEMIK', Dom.perTA(perKey)]]) +
        '<div class="grow">' + this.tabelPola(p, isi) + '</div>' + this.footJadwal(kode);
      return Cetak.halaman(html, land, 'jd', { fs: 11, min: 6 });
    });
    return { judul: d.Nama, nama: 'Jadwal Dosen ' + (d.Nama || '') + ' — ' + Dom.perLabel(perKey).replace('/', '-'), halaman, dok: { kode, jenis: 'JADWAL_DOSEN', judul: 'Jadwal Mengajar ' + (d.Nama || ''), ringkasan: { dosen: d.Nama } } };
  },
  /* ---------- Seluruh Jadwal / Jadwal Ujian (satu lembar landscape per pola) ---------- */
  jadwalSeluruh(pola, perKey, ctx, opsi) {
    opsi = opsi || {};
    const ujian = !!opsi.ujian, um = Dom.unitMap(perKey), kode = ctx.kode || Cetak.kode(ujian ? 'UJN' : 'JDW');
    const entri = opsi.entri || (ujian ? DB.rows('Ujian').filter(j => j.TA + ' ' + j.Semester === perKey && j.Jenis === opsi.jenis && j.Pola === pola) : Dom.jadwal(perKey, pola).filter(j => j.Posisi === 'GRID'));
    const peta = this.petaIsi(entri, um, u => u.rombel);
    const rombel = [...new Map(entri.map(j => um.get(j.RealisasiID)).filter(Boolean).map(u => [u.rombel, { key: u.rombel, prodi: u.prodi, angkatan: u.angkatan, kelas: u.kelas }])).values()].sort(Dom.rombelUrut);
    const slots = ujian ? Dom.ujianSlots(pola) : Dom.slots(pola), hari = [...new Set(slots.map(s => s.hari))];
    const judul = ujian ? 'JADWAL ' + (opsi.jenis === 'UAS' ? 'UJIAN AKHIR SEMESTER (UAS)' : 'UJIAN TENGAH SEMESTER (UTS)') : 'JADWAL PERKULIAHAN';
    const head = '<thead><tr><th rowspan="2" style="width:12%">PRODI · SMT · KELAS</th>' + hari.map(h => '<th colspan="' + slots.filter(s => s.hari === h).length + '">' + h.toUpperCase() + '</th>').join('') + '</tr><tr>' +
      slots.map(s => '<th>S' + s.sesi + '<small>' + s.mulai + '–' + s.selesai + '</small></th>').join('') + '</tr></thead>';
    const body = rombel.map(rb => '<tr><td class="rh">' + esc(rb.prodi) + ' · Smt ' + Dom.semMhs(rb.angkatan, perKey) + '<br>' + esc(rb.kelas) + '</td>' + slots.map(s => {
      const l = peta.get(rb.key + '#' + s.hari + '|' + s.sesi) || [];
      return l.length ? '<td>' + l.map(u => '<span class="mk">' + esc(u.kur.NamaMK) + '</span><span class="ds">' + esc(Dom.dosenTeks(u)) + '</span>').join('<hr style="border:0;border-top:1px dashed #F6C898;margin:.2em 0">') + '</td>' : '<td class="kosong"></td>';
    }).join('') + '</tr>').join('');
    const html = this.bandJadwal(kode) + this.headJadwal(judul, 'Seluruh Jadwal · Pola ' + pola + (pola === 'Hybrid' ? ' (Jumat & Sabtu)' : ' (Senin – Jumat)')) +
      this.infoBox([['POLA JAM', pola.toUpperCase()], ['JUMLAH KELAS', rombel.length + ' kelas'], ['TAHUN AKADEMIK', Dom.perTA(perKey)]]) +
      '<div class="grow"><table class="g">' + head + '<tbody>' + (body || '<tr><td colspan="' + (slots.length + 1) + '" class="kosong">Belum ada jadwal tersimpan untuk pola ini.</td></tr>') + '</tbody></table></div>' + this.footJadwal(kode);
    return { judul: (ujian ? opsi.jenis + ' ' : 'Seluruh Jadwal ') + pola, nama: (ujian ? 'Jadwal ' + opsi.jenis : 'Seluruh Jadwal') + ' ' + pola + ' — ' + Dom.perLabel(perKey).replace('/', '-'),
      halaman: [Cetak.halaman(html, ctx.orient !== 'portrait', 'jd all', { fs: 10, min: 5.2 })], dok: { kode, jenis: ujian ? 'UJIAN' : 'JADWAL_SELURUH', judul: (ujian ? 'Jadwal ' + opsi.jenis + ' ' : 'Seluruh Jadwal ') + pola, ringkasan: { pola, jumlah: rombel.length, jenis_ujian: opsi.jenis || '' } } };
  },

  /* ---------- Surat Tugas Mengajar ---------- */
  suratTugas(dosenId, perKey, st, tanggalPilih, ctx) {
    const t = this.tata('SURAT_TUGAS', ctx), d = DB.get('Dosen', 'ID', dosenId) || {}, p = Dom.perObj(perKey);
    const mk = (Dom.bebanDosen(perKey).get(dosenId) || []).slice().sort((a, b) => Dom.rombelUrut(a, b) || String(a.kur.KodeMK).localeCompare(b.kur.KodeMK));
    const totalSks = mk.reduce((a, u) => a + u.sks, 0), kode = st ? st.KodeVerif : 'BELUM-TERBIT';
    const tanggal = (st && !tanggalPilih ? st.Tanggal : tanggalPilih) || Dom.set('ST_TANGGAL') || isoTgl();
    const ganti = (x) => String(x || '').replace(/\{nomor_sk\}/g, Dom.set('ST_NOMOR_SK', '……')).replace(/\{semester\}/g, p.smt).replace(/\{tahun_akademik\}/g, p.ta).replace(/\{nama_dosen\}/g, d.Nama || '');
    const ketentuan = Dom.set('ST_KETENTUAN', '').split('\n').map(x => x.trim()).filter(Boolean);
    const aset = DB.raw.Aset || {};
    const kol = [['no', 'NO'], ['mk', 'MATA KULIAH'], ['sks', 'SKS'], ['smt', 'SMT'], ['prodi', 'PRODI'], ['program', 'PROGRAM']].concat(t.jadwal ? [['jadwal', 'JADWAL']] : []);
    const w = this.lebar(t, kol.map(k => k[0]));
    const html = this.kop(t) +
      '<h1>SURAT TUGAS MENGAJAR</h1><div class="no">Nomor: ' + esc(st ? st.Nomor : '(diterbitkan otomatis saat dicetak)') + '</div>' +
      '<p>' + esc(ganti(Dom.set('ST_PEMBUKA'))) + '</p>' +
      '<table class="idt"><tr><td>Nama Dosen</td><td>:</td><td><b>' + esc(d.Nama || '') + '</b></td></tr><tr><td>NIDN</td><td>:</td><td>' + esc(d.NIDN || '-') + '</td></tr></table>' +
      '<p style="margin-bottom:.4em">Untuk mengampu mata kuliah pada Semester ' + esc(p.smt) + ' Tahun Akademik ' + esc(p.ta) + ' sebagai berikut:</p>' +
      '<table class="mk"><colgroup>' + kol.map(k => '<col style="width:' + w(k[0]) + '">').join('') + '</colgroup><thead><tr>' + kol.map(k => '<th>' + k[1] + '</th>').join('') + '</tr></thead><tbody>' +
      mk.map((u, i) => { const jw = t.jadwal ? Dom.hariJam(u.id, perKey, u.pola) : ''; return '<tr><td class="c">' + (i + 1) + '</td><td>' + esc(u.kur.NamaMK) + (u.kur.NamaArab ? '<span class="ar arab">' + esc(u.kur.NamaArab) + '</span>' : '') + '</td><td class="c">' + u.sks + '</td><td class="c">' + u.smt + '</td><td>' + esc(Dom.prodiNama(u.prodi)) + '</td><td>' + esc(u.kelas) + '</td>' +
        (t.jadwal ? '<td class="jw">' + (jw ? jw.split('; ').map(esc).join('<br>') : '<span style="color:#94A3B8">—</span>') + '</td>' : '') + '</tr>'; }).join('') +
      '<tr class="tot"><td colspan="2" style="text-align:right">TOTAL BEBAN MENGAJAR</td><td class="c">' + totalSks + '</td><td colspan="' + (kol.length - 3) + '">' + mk.length + ' mata kuliah</td></tr></tbody></table>' +
      (ketentuan.length ? '<div style="margin-top:.9em"><b>Ketentuan:</b><ol>' + ketentuan.map(k => '<li>' + esc(ganti(k)) + '</li>').join('') + '</ol></div>' : '') +
      '<p style="margin-top:.7em">Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh amanah dan tanggung jawab.</p>' +
      '<div class="ttd">' + this.vbox(kode, st ? 'Surat tugas sah & terdaftar' : 'Kode terbit saat dicetak') +
      '<div class="kanan">' + esc(Dom.set('ST_TEMPAT', 'Bogor')) + ', ' + esc(fmtTgl(tanggal)) + '<br>' + esc(Dom.set('ST_JABATAN', 'Ketua')) +
      '<div class="ruang">' + (aset.stempel ? '<img class="stp" src="' + aset.stempel + '" alt="">' : '') + (aset.ttd ? '<img class="sig" src="' + aset.ttd + '" alt="">' : '') + '</div>' +
      '<div class="nm">' + esc(Dom.set('ST_PENANDATANGAN', '……………………………')) + '</div>' + (Dom.set('ST_NIDN_TTD') ? '<div>NIDN. ' + esc(Dom.set('ST_NIDN_TTD')) + '</div>' : '') + '</div></div>';
    return { judul: d.Nama, nama: 'Surat Tugas ' + (st ? st.NomorUrut + ' ' : '') + (d.Nama || '') + ' — ' + Dom.perLabel(perKey).replace('/', '-'), dosenId, stId: st ? st.ID : null,
      halaman: [Cetak.halaman(html, false, 'st', { fs: 11.5, min: 7, draf: !st, luar: '<div class="ornA"></div><div class="ornB"></div><div class="ornC"></div><div class="ornD"></div>' })],
      dok: { kode, jenis: 'SURAT_TUGAS', judul: 'Surat Tugas Mengajar — ' + (d.Nama || ''), nomor: st ? st.Nomor : '', ringkasan: { dosen: d.Nama, nidn: d.NIDN, jumlah: mk.length + ' MK / ' + totalSks + ' SKS' } } };
  },

  /** Lebar kolom (%) hanya di antara kolom yang tampil → fungsi kunci → '..%'. */
  lebar(t, kunci) {
    const tot = kunci.reduce((a, k) => a + num(t.kolom[k], 0), 0) || 1;
    return (k, n) => (num(t.kolom[k], 0) / tot * 100 / (n || 1)).toFixed(3) + '%';
  },
  kosongkan(n) { return Math.max(0, Math.min(10, Math.round(num(n, 0)))); },

  /* ---------- Absensi Mahasiswa (hitam putih) ---------- */
  absensi(u, perKey, o, ctx) {
    const t = this.tata('ABSENSI', ctx), n = Math.max(1, Math.min(32, num(o.pertemuan, 18))), mhs = Dom.mhsRombel(u.prodi, u.angkatan, u.kelas, o.jk || '');
    const nKos = this.kosongkan(t.kosong), rows = mhs.length + nKos, kode = (ctx && ctx.kode) || Cetak.kode('ABS');
    const land = o.orient === 'landscape' || (o.orient === 'auto' && n > 14 && rows <= 34);
    const jkTeks = o.jk === 'L' ? ' (Laki-laki)' : o.jk === 'P' ? ' (Perempuan)' : '';
    const w = this.lebar(t, ['no', 'nama', 'ket', 'pertemuan']);
    const th = Array.from({ length: n }, (_, i) => '<th>' + (i + 1) + '</th>').join(''), blank = Array.from({ length: n }, () => '<td></td>').join('');
    const html = this.kop(t) + '<div class="ttl"><h1>DAFTAR HADIR MAHASISWA/I</h1><h2>' + esc(this.kampus().toUpperCase()) + '</h2><h3>' + esc(Dom.prodiNama(u.prodi).toUpperCase() + ' - ' + u.kelas.toUpperCase()) + jkTeks + '</h3></div>' +
      '<div class="inf"><div><span>Mata Kuliah</span><span>:</span><b>' + esc(u.kur.KodeMK + ' — ' + u.kur.NamaMK + ' (' + u.sks + ' SKS)') + '</b></div><div><span>Semester</span><span>:</span><span>' + u.smt + ' · ' + esc(Dom.perLabel(perKey)) + '</span></div>' +
      '<div><span>Nama Dosen</span><span>:</span><span>' + esc(Dom.dosenTeks(u)) + '</span></div><div><span>Hari / Jam</span><span>:</span><span>' + esc(Dom.hariJam(u.id, perKey, u.pola) || '-') + '</span></div></div>' +
      '<div class="grow"><table class="t" style="--rh:' + num(t.baris, 1.75) + 'em"><colgroup><col style="width:' + w('no') + '"><col style="width:' + w('nama') + '"><col style="width:' + w('ket') + '">' + Array.from({ length: n }, () => '<col style="width:' + w('pertemuan', n) + '">').join('') + '</colgroup><thead>' +
      '<tr><th rowspan="2">No</th><th rowspan="2">Nama Mahasiswa</th><th rowspan="2">KET</th><th colspan="' + n + '">Tanggal Kuliah</th></tr><tr>' + Array.from({ length: n }, () => '<th style="height:2.3em"></th>').join('') + '</tr>' +
      '<tr><th colspan="3" style="text-align:right">Pekan ke:</th>' + th + '</tr></thead><tbody>' +
      mhs.map((m, i) => '<tr><td class="c">' + (i + 1) + '</td><td class="nm">' + esc(m.Nama) + '</td><td class="c">' + esc(m.JK) + '</td>' + blank + '</tr>').join('') +
      Array.from({ length: nKos }, (_, i) => '<tr class="kos"><td class="c">' + (mhs.length + i + 1) + '</td><td></td><td></td>' + blank + '</tr>').join('') + '</tbody></table></div>' +
      '<div class="ft">' + this.vbox(kode, 'Keterangan: H Hadir · S Sakit · I Izin · A Alpa') + '<div class="ttd">Dosen Pengampu,<div class="sp"></div><b>' + esc(Dom.dosenTeks(u, ' / ')) + '</b></div></div>';
    return { judul: u.kur.NamaMK + ' · ' + u.kelas, nama: 'Absensi ' + u.kur.KodeMK + ' ' + u.prodi + ' Smt ' + u.smt + ' ' + u.kelas + jkTeks, halaman: [Cetak.halaman(html, land, 'bw', { fs: 10.5, min: 5.5 })],
      dok: { kode, jenis: 'ABSENSI', judul: 'Absensi ' + u.kur.NamaMK + ' — ' + Dom.rombelLabel(u.prodi, u.angkatan, u.kelas, perKey), ringkasan: { dosen: Dom.dosenTeks(u), prodi: Dom.prodiNama(u.prodi), kelas: u.kelas, semester: u.smt, jumlah: mhs.length } } };
  },

  /* ---------- Daftar Hadir Mahasiswa / Dosen & Kegiatan (kotak tanda tangan berpasangan) ----------
     Kotak kiri memuat nomor ganjil di pojok kiri atas, kotak kanan nomor genap di pojok kiri bawah;
     tiap kotak setinggi dua baris nama. */
  daftarHadir(rb, perKey, f, ctx) {
    const t = this.tata('DAFTAR_HADIR', ctx), dosenMode = f.peserta === 'dosen', kode = (ctx && ctx.kode) || Cetak.kode('DH');
    const peserta = dosenMode ? (f.dosenIds || []).map(id => DB.get('Dosen', 'ID', id)).filter(Boolean).map(d => ({ Nama: d.Nama }))
      : Dom.mhsRombel(rb.prodi, rb.angkatan, rb.kelas, f.jk || '');
    const land = f.orient === 'landscape', smt = dosenMode ? '' : Dom.semMhs(rb.angkatan, perKey);
    let total = peserta.length + this.kosongkan(t.kosong); if (total % 2) total++;
    if (!total) total = 2;
    const nm = (s) => esc(t.kapital ? String(s || '').toLocaleUpperCase('id-ID') : s);
    const baris = Array.from({ length: total }, (_, i) => { const m = peserta[i], no = i + 1;
      const sig = no % 2 === 1 ? '<td rowspan="2" class="sg l">' + no + '</td><td rowspan="2" class="sg r">' + (no + 1) + '</td>' : '';
      return '<tr' + (m ? '' : ' class="kos"') + '><td class="c">' + no + '</td><td class="nm">' + (m ? nm(m.Nama) : '') + '</td>' + sig + '</tr>'; }).join('');
    const jkTeks = f.jk === 'L' ? ' (Laki-laki)' : f.jk === 'P' ? ' (Perempuan)' : '';
    const w = this.lebar(t, ['no', 'nama', 'ttd']), wLbl = (Tata.persen(t, 'no') + Tata.persen(t, 'nama')).toFixed(3) + '%';
    const info = [['Hari / Tanggal', fmtHariTgl(f.tanggal) || '……………………'], ['Program', f.program || (dosenMode ? '……………………' : rb.kelas)]]
      .concat(dosenMode ? (f.unit ? [['Unit / Bagian', f.unit]] : []) : [['Prodi / Kelas / Semester', Dom.prodiNama(rb.prodi) + ' / Kelas ' + rb.kelas + ' / Semester ' + smt]])
      .concat([['Lokasi / Ruang', f.lokasi || '-'], ['Jumlah Peserta', peserta.length + (dosenMode ? ' dosen' : ' mahasiswa') + jkTeks]]);
    const html = this.kop(t) +
      '<div class="ttl"><h1>LEMBAR DAFTAR HADIR ' + (dosenMode ? 'DOSEN' : 'MAHASISWA') + ' &amp; KEGIATAN AKADEMIK</h1><h2>' + esc(this.kampus().toUpperCase()) + '</h2>' + (f.judul ? '<div class="keg">' + esc(f.judul) + '</div>' : '') + '</div>' +
      '<table class="inf"><colgroup><col style="width:' + wLbl + '"><col></colgroup>' + info.map(x => '<tr><td class="l">' + esc(x[0]) + '</td><td>: ' + esc(x[1]) + '</td></tr>').join('') + '</table>' +
      '<div class="grow"><table class="t" style="--rh:' + num(t.baris, 1.9) + 'em' + (t.isi ? ';height:100%' : '') + '"><colgroup><col style="width:' + w('no') + '"><col style="width:' + w('nama') + '"><col style="width:' + w('ttd', 2) + '"><col style="width:' + w('ttd', 2) + '"></colgroup>' +
      '<thead><tr><th>NO</th><th>NAMA LENGKAP</th><th colspan="2">TANDA TANGAN</th></tr></thead><tbody>' + baris + '</tbody></table></div>' +
      (t.catatan ? '<div class="cat"><h4>CATATAN PELAKSANAAN ACARA</h4><div>Total ' + (dosenMode ? 'Dosen' : 'Mahasiswa') + ' Hadir : …………… Orang</div><div>Waktu Sesi Dimulai : …………… WIB</div><div>Total ' + (dosenMode ? 'Dosen' : 'Mahasiswa') + ' Absen/Izin : …………… Orang</div><div>Waktu Sesi Berakhir : …………… WIB</div></div>' : '') +
      (t.kaki ? '<div class="ft">' + this.vbox(kode, 'Lembar presensi resmi') + '<div class="ttd">' + esc(Dom.set('ST_TEMPAT', 'Bogor')) + ', ' + esc(fmtTgl(f.tanggal) || '……………') + '<br>Panitia / Penanggung Jawab,<div class="sp"></div>(……………………………)</div></div>' : '');
    const label = dosenMode ? 'Dosen' + (f.unit ? ' ' + f.unit : '') : Dom.rombelLabel(rb.prodi, rb.angkatan, rb.kelas, perKey);
    return { judul: label, nama: 'Daftar Hadir ' + (dosenMode ? 'Dosen' : rb.prodi + ' Smt ' + smt + ' ' + rb.kelas) + ' — ' + (f.judul || 'Kegiatan').slice(0, 50),
      halaman: [Cetak.halaman(html, land, 'dh', { fs: 11, min: 5.5 })], dok: { kode, jenis: 'DAFTAR_HADIR', judul: 'Daftar Hadir: ' + (f.judul || 'Kegiatan') + ' — ' + label,
        ringkasan: dosenMode ? { kegiatan: f.judul, tanggal: f.tanggal, peserta: 'Dosen', jumlah: peserta.length } : { kegiatan: f.judul, tanggal: f.tanggal, prodi: Dom.prodiNama(rb.prodi), kelas: rb.kelas, semester: smt, jumlah: peserta.length } } };
  },

  /* ---------- Absensi Penerima Kitab (kepala biru tua, Arab RTL) ---------- */
  kitab(rb, perKey, f, ctx) {
    const t = this.tata('PENERIMA_KITAB', ctx), mhs = Dom.mhsRombel(rb.prodi, rb.angkatan, rb.kelas, ''), kitab = f.kitab || [], kode = (ctx && ctx.kode) || Cetak.kode('KTB');
    const land = f.orient === 'landscape' || (f.orient === 'auto' && kitab.length >= 4), smt = Dom.semMhs(rb.angkatan, perKey), nKos = this.kosongkan(t.kosong);
    const w = this.lebar(t, ['no', 'nama', 'kitab']), nk = Math.max(1, kitab.length);
    const blank = kitab.map(() => '<td></td>').join('');
    const html = this.kop(t) +
      '<div class="ttl"><h1>LEMBAR KONTROL &amp; TANDA TANGAN PENERIMAAN KITAB</h1><h2>' + esc(this.kampus().toUpperCase()) + '</h2><h3>' + esc((Dom.prodiNama(rb.prodi) + ' - KELAS ' + rb.kelas + ' - SEMESTER ' + smt).toUpperCase()) + '</h3></div>' +
      '<div class="inf"><div><small>TANGGAL PENYERAHAN</small>' + esc(fmtHariTgl(f.tanggal) || '……………') + '</div><div><small>LOKASI / RUANG</small>' + esc(f.lokasi || '……………') + '</div><div><small>JUMLAH MAHASISWA</small>' + mhs.length + ' mahasiswa</div></div>' +
      '<div class="grow"><table class="t" style="--rh:' + num(t.baris, 1.95) + 'em"><colgroup><col style="width:' + w('no') + '"><col style="width:' + (kitab.length ? w('nama') : (Tata.persen(t, 'nama') + Tata.persen(t, 'kitab')).toFixed(3) + '%') + '">' + kitab.map(() => '<col style="width:' + w('kitab', nk) + '">').join('') + '</colgroup><thead><tr><th>No</th><th>Nama Mahasiswa</th>' +
      kitab.map(k => '<th class="' + (Dom.adaArab(k) ? 'arab' : '') + '"' + (Dom.adaArab(k) ? ' dir="rtl"' : '') + '>' + esc(k) + '</th>').join('') + '</tr></thead><tbody>' +
      mhs.map((m, i) => '<tr><td class="c">' + (i + 1) + '</td><td>' + esc(m.Nama) + '</td>' + blank + '</tr>').join('') +
      Array.from({ length: nKos }, (_, i) => '<tr class="kos"><td class="c">' + (mhs.length + i + 1) + '</td><td></td>' + blank + '</tr>').join('') + '</tbody></table></div>' +
      '<div class="ft" style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:.8em;font-size:.9em">' + this.vbox(kode, 'Lembar serah terima kitab') + '<div style="text-align:center;width:15em">' + esc(Dom.set('ST_TEMPAT', 'Bogor')) + ', ' + esc(fmtTgl(f.tanggal) || '……………') + '<br>Petugas Penyerahan,<div style="height:4em"></div>(……………………………)</div></div>';
    return { judul: Dom.rombelLabel(rb.prodi, rb.angkatan, rb.kelas, perKey), nama: 'Penerima Kitab ' + rb.prodi + ' Smt ' + smt + ' ' + rb.kelas + ' — ' + (f.tanggal || ''),
      halaman: [Cetak.halaman(html, land, 'kb', { fs: 10.5, min: 5.5 })], dok: { kode, jenis: 'PENERIMA_KITAB', judul: 'Penerimaan Kitab — ' + Dom.rombelLabel(rb.prodi, rb.angkatan, rb.kelas, perKey), ringkasan: { prodi: Dom.prodiNama(rb.prodi), kelas: rb.kelas, semester: smt, tanggal: f.tanggal, jumlah: kitab.length + ' kitab' } } };
  },

  /* ---------- Kehadiran Dosen (mingguan, mengikuti format rekap Excel) ---------- */
  HADIR_HARI: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  hadirPolaOk(pola, u) { return pola === 'Semua' || u.pola === pola; },
  /** Rekap per dosen dari jadwal tersimpan: SKS per hari (per slot; kelas gabungan dihitung sekali). */
  hadirData(perKey, f) {
    const um = Dom.unitMap(perKey), kelasSet = f.kelas && f.kelas.length ? new Set(f.kelas) : null, peta = new Map();
    Dom.jadwal(perKey).forEach(j => {
      if (j.Posisi !== 'GRID') return;
      const u = um.get(j.RealisasiID); if (!u || !this.hadirPolaOk(f.pola || 'Reguler', u) || (kelasSet && !kelasSet.has(u.kelas))) return;
      const b = Math.max(1, num(j.Bagian, 1)), sksBag = u.bagian > 1 ? (b < u.bagian || u.sks % 2 === 0 ? 2 : u.sks % 2) : u.sks;
      u.dosen.forEach(ds => {
        if (!peta.has(ds)) peta.set(ds, { id: ds, prodi: new Set(), mk: new Map(), slot: new Map() });
        const x = peta.get(ds); x.prodi.add(u.prodi); x.mk.set(norm(u.kur.NamaMK), u.kur.NamaMK);
        const k = u.pola + '|' + j.Hari + '|' + j.Sesi; x.slot.set(k, Math.max(x.slot.get(k) || 0, sksBag));
      });
    });
    const urutP = (a, b) => num((DB.get('Prodi', 'Kode', a) || {}).Urutan, 99) - num((DB.get('Prodi', 'Kode', b) || {}).Urutan, 99);
    return Dom.dosen().filter(d => peta.has(d.ID)).map(d => {
      const x = peta.get(d.ID), hari = {};
      x.slot.forEach((s, k) => { const h = k.split('|')[1]; hari[h] = (hari[h] || 0) + s; });
      return { id: d.ID, nama: d.Nama, prodi: [...x.prodi].sort(urutP), mk: [...x.mk.values()], hari, total: Object.values(hari).reduce((a, b) => a + b, 0) };
    });
  },
  hadirDosen(perKey, f, ctx) {
    const t = this.tata('HADIR_DOSEN', ctx), p = Dom.perObj(perKey), kode = (ctx && ctx.kode) || Cetak.kode('HDS'), pola = f.pola || 'Reguler';
    const data = this.hadirData(perKey, f);
    const hariPola = pola === 'Hybrid' ? Dom.hariPola('Hybrid') : this.HADIR_HARI.filter(h => h !== 'Sabtu' || num(t.selSabtu, 4) > 0 || data.some(d => d.hari.Sabtu));
    const hari = this.HADIR_HARI.filter(h => hariPola.includes(h));
    const sel = {}; hari.forEach(h => { const dasar = h === 'Sabtu' && pola !== 'Hybrid' ? num(t.selSabtu, 4) : num(t.sel, 6); sel[h] = Math.max(1, dasar, ...data.map(d => d.hari[h] || 0)); });
    const nSel = hari.reduce((a, h) => a + sel[h], 0);
    const w = this.lebar(t, ['no', 'nama', 'prodi', 'sks', 'mk', 'hari', 'total', 'ket']);
    const ttd = (Array.isArray(t.ttd) && t.ttd.length ? t.ttd : Tata.ttdHadirBawaan()).filter(x => x && (x.jabatan || x.nama));
    const judul = String(t.judul || 'Daftar Kehadiran Dosen Tetap');
    const mulai = Doc.senin(f.mulai || isoTgl()), nMg = Math.max(1, Math.min(20, num(f.minggu, 1)));
    const head = '<thead><tr><th>No</th><th>Nama</th><th>Prodi</th><th>Sks</th><th>Mata kuliah</th>' + hari.map(h => '<th colspan="' + sel[h] + '" class="hr">' + h + '</th>').join('') + '<th>Total</th><th>ket</th></tr></thead>';
    const col = '<colgroup><col style="width:' + w('no') + '"><col style="width:' + w('nama') + '"><col style="width:' + w('prodi') + '"><col style="width:' + w('sks') + '"><col style="width:' + w('mk') + '">' +
      hari.map(h => Array.from({ length: sel[h] }, () => '<col style="width:' + w('hari', nSel) + '">').join('')).join('') + '<col style="width:' + w('total') + '"><col style="width:' + w('ket') + '"></colgroup>';
    const sel0 = (d) => hari.map(h => { const n = d ? (d.hari[h] || 0) : 0; return Array.from({ length: sel[h] }, (_, i) => '<td class="ck' + (i === 0 ? ' d0' : '') + '">' + (t.centang && i < n ? '✓' : '') + '</td>').join(''); }).join('');
    const nKos = this.kosongkan(t.kosong);
    const body = data.map((d, i) => '<tr><td class="c">' + (i + 1) + '</td><td class="nm">' + esc(d.nama) + '</td><td class="c pr">' + esc(d.prodi.join(',')) + '</td><td class="c">' + d.total + '</td><td class="mk">' + esc(d.mk.join(', ')) + '</td>' + sel0(d) + '<td class="c">' + d.total + '</td><td></td></tr>').join('') +
      Array.from({ length: nKos }, (_, i) => '<tr class="kos"><td class="c">' + (data.length + i + 1) + '</td><td></td><td></td><td></td><td></td>' + sel0(null) + '<td></td><td></td></tr>').join('');
    const kosongData = !data.length ? '<tr><td colspan="' + (7 + nSel) + '" class="c" style="padding:2em;color:#64748B">Belum ada jadwal tersimpan untuk pilihan ini.</td></tr>' : '';
    const halaman = Array.from({ length: nMg }, (_, m) => {
      const s0 = new Date(mulai.getTime() + m * 7 * 864e5), tglH = (h) => new Date(s0.getTime() + (this.HADIR_HARI.indexOf(h)) * 864e5);
      const rentang = fmtHariTgl(tglH(hari[0] || 'Senin')) + ' - ' + fmtHariTgl(tglH(hari[hari.length - 1] || 'Sabtu'));
      const html = (t.kop ? this.kop(t) : '') + '<div class="hd-h">' + (t.kop ? '' : '<div class="lg">' + Cetak.logo() + '</div>') + '<div class="tx">' + (t.kop ? '' : '<b>' + esc(this.kampus()) + '</b>') +
        '<b>' + esc(judul) + ' Semester ' + esc(p.smt) + ' Tahun Akademik ' + esc(p.ta) + (pola === 'Hybrid' ? ' (Kelas Hybrid)' : '') + '</b><b>' + esc(rentang) + '</b></div></div>' +
        '<table class="t" style="--rh:' + num(t.baris, 2.3) + 'em">' + col + head + '<tbody>' + (kosongData || body) + '</tbody></table>' +
        (ttd.length ? '<div class="hd-ttd" style="--n:' + ttd.length + '">' + ttd.map(x => '<div><b>' + esc(x.jabatan || '') + '</b><div class="sp"></div><b>' + esc(x.nama || '……………………………') + '</b></div>').join('') + '</div>' : '') +
        '<div class="hd-f">' + this.vbox(kode, 'Rekap kehadiran dosen · pekan ' + (m + 1)) + '</div>';
      return Cetak.halaman(html, true, 'hd', { fs: 10, min: 5 });
    });
    const nmPola = pola === 'Semua' ? 'Semua Kelas' : pola;
    return { judul: judul + ' · ' + nmPola, nama: 'Kehadiran Dosen ' + nmPola + ' — ' + Dom.perLabel(perKey).replace('/', '-') + ' — ' + isoTgl(mulai), halaman,
      dok: { kode, jenis: 'HADIR_DOSEN', judul: judul + ' — ' + nmPola + ' ' + Dom.perLabel(perKey), ringkasan: { pola: nmPola, jumlah: data.length + ' dosen', minggu: nMg + ' pekan mulai ' + fmtTgl(mulai) } } };
  },
  senin(s) { const d = tgl(s) || new Date(); const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const g = (x.getDay() + 6) % 7; x.setDate(x.getDate() - g); return x; },

  /* ---------- Daftar Mata Kuliah untuk PDDIKTI (per prodi, warna prodi) ---------- */
  campur(hex, rasio) {
    const h = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); if (!h) return '#EEF2FC';
    const n = parseInt(h[1], 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v + (255 - v) * rasio));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  },
  gelap(hex, rasio) { const h = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); if (!h) return '#172F6E'; const n = parseInt(h[1], 16); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * (1 - rasio)).toString(16).padStart(2, '0')).join(''); },
  /** baris: [{Prodi, SmtMhs, KodePddikti, NamaMK, SKS, Dosen1, Dosen2, Status}] (sudah terurut). */
  pddikti(perKey, baris, ctx) {
    const t = this.tata('PDDIKTI', ctx), p = Dom.perObj(perKey), kode = (ctx && ctx.kode) || Cetak.kode('PDK');
    const nmD = (id) => (DB.get('Dosen', 'ID', id) || {}).Nama || '';
    const prodi = Dom.prodiSemua().filter(x => baris.some(b => b.Prodi === x.Kode));
    const halaman = prodi.map(pr => {
      const rows = baris.filter(b => b.Prodi === pr.Kode), smts = [...new Set(rows.map(b => num(b.SmtMhs)))].sort((a, b) => b - a);
      const ada2 = rows.some(b => b.Dosen2), w = this.lebar(t, ['no', 'kode', 'mk', 'sks', 'dosen']), wr = pr.Warna || '#1E3A8A';
      const gaya = '--pc:' + wr + ';--pc2:' + this.campur(wr, .78) + ';--pc3:' + this.campur(wr, .9) + ';--pcd:' + this.gelap(wr, .25);
      const semuaFinal = rows.length && rows.every(b => b.Status === 'FINAL'), sksProdi = rows.reduce((a, b) => a + num(b.SKS, 0), 0);
      const blok = smts.map(s => {
        const r = rows.filter(b => num(b.SmtMhs) === s), tot = r.reduce((a, b) => a + num(b.SKS, 0), 0);
        return '<div class="pk-b"><h3>SEMESTER ' + s + '</h3><table class="t" style="--rh:' + num(t.baris, 1.7) + 'em"><colgroup><col style="width:' + w('no') + '"><col style="width:' + w('kode') + '"><col style="width:' + w('mk') + '"><col style="width:' + w('sks') + '"><col style="width:' + w('dosen', ada2 ? 2 : 1) + '">' + (ada2 ? '<col style="width:' + w('dosen', 2) + '">' : '') + '</colgroup>' +
          '<thead><tr><th>NO</th><th>KODE</th><th>MATA KULIAH</th><th>SKS PDDIKTI</th><th' + (ada2 ? '' : '') + '>DOSEN PENGAMPU' + (ada2 ? ' 1' : '') + '</th>' + (ada2 ? '<th>DOSEN PENGAMPU 2</th>' : '') + '</tr></thead><tbody>' +
          r.map((b, i) => '<tr' + (i % 2 ? ' class="z"' : '') + '><td class="c">' + (i + 1) + '</td><td class="c mono">' + esc(b.KodePddikti || '') + '</td><td>' + esc(b.NamaMK || '') + '</td><td class="c">' + esc(b.SKS) + '</td><td class="c">' + (b.Dosen1 ? esc(nmD(b.Dosen1)) : '') + '</td>' + (ada2 ? '<td class="c">' + (b.Dosen2 ? esc(nmD(b.Dosen2)) : '') + '</td>' : '') + '</tr>').join('') +
          '<tr class="tot"><td colspan="3" style="text-align:right">JUMLAH SKS SEMESTER ' + s + '</td><td class="c">' + tot + '</td><td colspan="' + (ada2 ? 2 : 1) + '">' + r.length + ' mata kuliah</td></tr></tbody></table></div>';
      }).join('');
      const html = this.kop(t) + '<div class="pk-h" style="' + gaya + '"><div><h1>DAFTAR MATA KULIAH UNTUK PDDIKTI</h1><div class="sub">' + esc((pr.Jenjang || 'S1') + ' ' + pr.Nama) + ' · Semester ' + esc(p.smt) + ' Tahun Akademik ' + esc(p.ta) + '</div></div>' +
        '<div class="pk-s"><b>' + sksProdi + '</b><small>TOTAL SKS</small></div><div class="pk-s"><b>' + rows.length + '</b><small>MATA KULIAH</small></div><div class="pk-st ' + (semuaFinal ? 'ok' : '') + '">' + (semuaFinal ? '✓ FINAL' : 'DRAF') + '</div></div>' +
        '<div class="grow pk-g" style="' + gaya + '">' + (blok || '<div style="padding:2em;text-align:center;color:#64748B">Belum ada mata kuliah.</div>') + '</div>' +
        '<div class="pk-f">' + this.vbox(kode, 'Data pelaporan PDDIKTI ' + this.kampus()) + '<div class="faint">' + this.dicetak() + '</div></div>';
      return Cetak.halaman(html, ctx.orient === 'landscape', 'pk', { fs: 10.5, min: 5, draf: !semuaFinal });
    });
    if (t.rekap) {
      const rek = new Map();
      baris.forEach(b => [b.Dosen1, b.Dosen2].filter(Boolean).forEach(id => { if (!rek.has(id)) rek.set(id, {}); const x = rek.get(id); x[b.Prodi] = (x[b.Prodi] || 0) + num(b.SKS, 0); }));
      const dl = [...rek.keys()].map(id => DB.get('Dosen', 'ID', id) || { ID: id, Nama: id }).sort((a, b) => norm(a.Nama).localeCompare(norm(b.Nama)));
      const tot = (x) => Object.values(x).reduce((a, b) => a + b, 0);
      const html = this.kop(t) + '<div class="pk-h" style="--pc:#1E3A8A;--pc2:#DCE4F7;--pc3:#EEF2FC;--pcd:#172F6E"><div><h1>REKAP SKS DOSEN BER-NIDN</h1><div class="sub">Pelaporan PDDIKTI · Semester ' + esc(p.smt) + ' Tahun Akademik ' + esc(p.ta) + ' · seluruh prodi</div></div><div class="pk-s"><b>' + dl.length + '</b><small>DOSEN</small></div></div>' +
        '<div class="grow pk-g" style="--pc:#1E3A8A;--pc2:#DCE4F7;--pc3:#EEF2FC;--pcd:#172F6E"><table class="t rk" style="--rh:' + num(t.baris, 1.7) + 'em"><colgroup><col style="width:6%"><col><col style="width:14%">' + prodi.map(() => '<col style="width:' + (36 / Math.max(1, prodi.length)).toFixed(2) + '%">').join('') + '<col style="width:10%"></colgroup>' +
        '<thead><tr><th>NO</th><th>NAMA DOSEN</th><th>NIDN</th>' + prodi.map(x => '<th style="background:' + attr(x.Warna || '#1E3A8A') + '">' + esc(x.Kode) + '</th>').join('') + '<th>JUMLAH SKS</th></tr></thead><tbody>' +
        dl.map((d, i) => { const x = rek.get(d.ID); return '<tr' + (i % 2 ? ' class="z"' : '') + '><td class="c">' + (i + 1) + '</td><td>' + esc(d.Nama) + '</td><td class="c mono">' + esc(d.NIDN || '') + '</td>' + prodi.map(pr => '<td class="c">' + (x[pr.Kode] || '') + '</td>').join('') + '<td class="c"><b>' + tot(x) + '</b></td></tr>'; }).join('') +
        '<tr class="tot"><td colspan="3" style="text-align:right">JUMLAH</td>' + prodi.map(pr => '<td class="c">' + dl.reduce((a, d) => a + (rek.get(d.ID)[pr.Kode] || 0), 0) + '</td>').join('') + '<td class="c">' + dl.reduce((a, d) => a + tot(rek.get(d.ID)), 0) + '</td></tr></tbody></table></div>' +
        '<div class="pk-f">' + this.vbox(kode, 'SKS dihitung per penugasan (Dosen 1 & Dosen 2)') + '<div class="faint">' + this.dicetak() + '</div></div>';
      halaman.push(Cetak.halaman(html, false, 'pk', { fs: 10.5, min: 5 }));
    }
    return { judul: 'PDDIKTI ' + Dom.perLabel(perKey), nama: 'Daftar MK PDDIKTI — ' + Dom.perLabel(perKey).replace('/', '-'), halaman,
      dok: { kode, jenis: 'PDDIKTI', judul: 'Daftar Mata Kuliah PDDIKTI ' + Dom.perLabel(perKey), ringkasan: { prodi: prodi.map(x => x.Kode).join(', '), jumlah: baris.length + ' MK' } } };
  },

  /* ---------- Kalender Akademik (A4 landscape, editor = pratinjau) ---------- */
  KAL_IKON: ['clipboard', 'book', 'cap', 'filetext', 'sun', 'award', 'users', 'flag', 'star', 'cal', 'wallet', 'bookmark', 'mosque', 'moonstar', 'zap', 'okc'],
  bulanKalender(perKey) {
    const p = Dom.perObj(perKey), y = parseInt(p.ta, 10);
    return p.smt === 'Ganjil' ? [[y, 8], [y, 9], [y, 10], [y, 11], [y + 1, 0]] : [[y + 1, 0], [y + 1, 1], [y + 1, 2], [y + 1, 3], [y + 1, 4], [y + 1, 5]];
  },
  teksKalenderBawaan(perKey) {
    const p = Dom.perObj(perKey);
    return { label: p.smt === 'Ganjil' ? 'SEMESTER 1 - 3 - 5 - 7' : 'SEMESTER 2 - 4 - 6 - 8',
      info: [{ judul: 'Surat Keterangan Aktif Kuliah', teks: 'Pengajuan surat aktif kuliah untuk keperluan beasiswa, BPJS, dan kedinasan diproses 1×24 jam secara mandiri.', link: '', linkTeks: 'Buka Portal Pengajuan Surat', tombol: '' },
        { judul: 'SIAKAD Al Wafa Online', teks: 'Pengisian Kartu Rencana Studi (KRS), Kartu Hasil Studi (KHS), dan proses perkuliahan.', link: '', linkTeks: '', tombol: 'Akses SIAKAD' }],
      biaya: 'Batas akhir pelunasan biaya her-registrasi semester mengikuti pengumuman Bagian Keuangan. Keterlambatan berimplikasi pada penonaktifan kartu ujian.',
      catatan: ['Kehadiran minimal 75% sebagai syarat mengikuti ujian akhir semester.', 'Izin sakit wajib disertai surat keterangan dokter dan diserahkan ke Bagian Akademik.', 'Ujian susulan hanya untuk alasan yang dibenarkan dan atas persetujuan Wakil Ketua I.'],
      motto: Dom.set('MOTTO', 'Ilmu | Akhlak | Prestasi | Untuk Umat'), mottoArab: 'العلم والأخلاق والإنجاز للأمة' };
  },
  kalender(perKey, keg, teks, opt) {
    opt = opt || {};
    const ed = opt.edit, ce = (k, v, tag, cls) => '<' + (tag || 'span') + (cls ? ' class="' + cls + '"' : '') + (ed ? ' contenteditable="true" data-k="' + k + '"' : '') + '>' + esc(v || '') + '</' + (tag || 'span') + '>';
    const p = Dom.perObj(perKey), t = Object.assign(this.teksKalenderBawaan(perKey), teks || {}), kode = opt.kode || Cetak.kode('KAL');
    const bulan = this.bulanKalender(perKey);
    const ikon = (n) => '<svg viewBox="0 0 24 24">' + (IC[n] || IC.cal) + '</svg>';
    const list = (keg || []).filter(k => k.Mulai).slice().sort(by('Mulai'));
    const rows = bulan.map(([y, m]) => {
      const nHari = new Date(y, m + 1, 0).getDate(), awal = isoTgl(new Date(y, m, 1)), akhir = isoTgl(new Date(y, m, nHari));
      const seg = [];
      list.forEach(k => { const s = k.Mulai, e = k.Selesai || k.Mulai; if (e < awal || s > akhir) return; seg.push({ k, d0: s < awal ? 1 : tgl(s).getDate(), d1: e > akhir ? nHari : tgl(e).getDate(), dari: s < awal, lanjut: e > akhir }); });
      const lajur = [];
      seg.forEach(sg => { let l = 0; while ((lajur[l] || []).some(x => !(sg.d1 < x.d0 || sg.d0 > x.d1))) l++; (lajur[l] = lajur[l] || []).push(sg); sg.l = l; });
      const tinggi = Math.max(1, lajur.length) * 2.3 + .4;
      const sel = Array.from({ length: 31 }, (_, i) => { const d = new Date(y, m, i + 1); return '<div class="dc' + (i >= nHari ? ' x' : d.getDay() === 0 ? ' lb' : '') + '"></div>'; }).join('');
      const bars = seg.map(sg => { const w = sg.d1 - sg.d0 + 1, rg = sg.d0 === sg.d1 ? String(sg.d0) : sg.d0 + '–' + sg.d1;
        return '<div class="bar' + (sg.lanjut ? ' lanjut' : '') + (sg.dari ? ' dari' : '') + '" title="' + attr(sg.k.Nama) + '" style="background:' + attr(sg.k.Warna || '#1E3A8A') + ';left:calc(' + ((sg.d0 - 1) / 31 * 100) + '% + 1px);width:calc(' + (w / 31 * 100) + '% - 2px);top:' + ((sg.l * 2.3 + .2) / 0.9).toFixed(2) + 'em">' + ikon(sg.k.Ikon) + (w >= 3 ? '<span>' + esc(sg.k.Nama) + '</span>' : '') + (w >= 7 ? '<span class="rg">' + rg + '</span>' : '') + '</div>'; }).join('');
      return '<div class="rw" style="min-height:' + tinggi + 'em"><div class="bl">' + BULAN[m].toUpperCase() + '</div><div class="jh">' + nHari + ' hr</div>' + sel + '<div class="bars">' + bars + '</div></div>';
    }).join('');
    const ket = [...new Map(list.map(k => [k.Warna + k.Nama, k])).values()].slice(0, 14);
    const rangkaian = list.filter(k => k.Tampil !== 'TIDAK');
    const rg = (k) => { const a = tgl(k.Mulai), b = tgl(k.Selesai || k.Mulai); if (!a) return ''; if (k.Mulai === (k.Selesai || k.Mulai)) return a.getDate() + ' ' + BULAN[a.getMonth()] + ' ' + a.getFullYear(); return a.getDate() + (a.getMonth() !== b.getMonth() ? ' ' + BULAN[a.getMonth()] : '') + ' – ' + b.getDate() + ' ' + BULAN[b.getMonth()] + ' ' + b.getFullYear(); };
    const prodi = Dom.prodi().map(x => '<span>' + esc((x.Jenjang || 'S1') + ' ' + x.Nama) + '</span>').join('');
    const info = (t.info || []).slice(0, 2).map((b, i) => '<div class="ib">' + ce('info.' + i + '.judul', b.judul, 'b') + ce('info.' + i + '.teks', b.teks, 'p') +
      (b.linkTeks || ed ? '<span class="lnk">' + ce('info.' + i + '.linkTeks', b.linkTeks || (ed ? 'Teks tautan (opsional)' : '')) + '</span>' + (b.link && !ed ? ' <span class="mono" style="font-size:.85em;color:#64748B">' + esc(b.link) + '</span>' : '') : '') +
      (b.tombol || ed ? ce('info.' + i + '.tombol', b.tombol || (ed ? 'Teks tombol (opsional)' : ''), 'span', 'tb') : '') + '</div>').join('');
    const html = '<div class="kh"><div class="l"><div class="lg">' + Cetak.logo() + '</div><div><b>' + esc(this.kampus().toUpperCase()) + '</b><small>' + esc(this.alamat()) + '</small></div></div>' +
      '<div class="c"><span class="tg">DOKUMEN RESMI AKADEMIK</span><h1>KALENDER AKADEMIK T.A ' + esc(p.ta) + '</h1><div class="smt">' + ce('label', t.label) + '</div></div>' +
      '<div class="r"><div class="ps"><small>PROGRAM STUDI</small><div class="bdg">' + prodi + '</div></div><svg class="ilu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">' + IC.cal + '<path d="M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2"/></svg></div></div>' +
      '<div class="sec">' + ikon('grid') + 'GAMBARAN KEGIATAN · ' + esc(p.smt.toUpperCase() + ' ' + p.ta) + '</div><div class="gk"><div class="hd"><div>BULAN / TGL</div><div></div>' + Array.from({ length: 31 }, (_, i) => '<div>' + (i + 1) + '</div>').join('') + '</div>' + rows + '</div>' +
      '<div class="ket"><b>KETERANGAN:</b>' + (ket.map(k => '<span><i style="background:' + attr(k.Warna) + '"></i>' + esc(k.Nama) + '</span>').join('') || '<span class="faint">Belum ada kegiatan</span>') + '</div>' +
      '<div class="tri"><div class="pn"><h4>' + ikon('listcheck') + 'RANGKAIAN KEGIATAN</h4>' + (rangkaian.map(k => '<div class="rk"><i style="background:' + attr(k.Warna) + '"></i><div><b>' + esc(k.Nama) + '</b><span class="tg">' + esc(rg(k)) + '</span>' +
        (k.SubKegiatan ? '<ul>' + String(k.SubKegiatan).split('\n').filter(Boolean).map(s => '<li>' + esc(s) + '</li>').join('') + '</ul>' : '') + '</div></div>').join('') || '<span class="faint">Belum ada kegiatan.</span>') + '</div>' +
      '<div class="pn"><h4>' + ikon('info') + 'INFO KEGIATAN</h4>' + info + '<h4 style="margin-top:.5em">' + ikon('wallet') + 'INFORMASI BIAYA</h4>' + ce('biaya', t.biaya, 'div', 'cp') + '</div>' +
      '<div class="pn"><h4>' + ikon('alertc') + 'CATATAN PENTING</h4><ul class="cpl">' + (t.catatan || []).map((c, i) => ce('catatan.' + i, c, 'li')).join('') + (ed ? '<li class="faint" contenteditable="true" data-k="catatan.' + (t.catatan || []).length + '">+ Tambah poin…</li>' : '') + '</ul></div></div>' +
      '<div class="kf"><div>' + this.vbox(kode, 'Kalender resmi ' + this.kampus()) + '</div><div class="m"><span class="ar arab">' + ce('mottoArab', t.mottoArab) + '</span><b>' + ce('motto', t.motto) + '</b></div><div class="k">' + esc(this.kampus()) + '<br>' + esc(this.alamat()) + '</div></div>';
    return { judul: 'Kalender Akademik ' + p.smt + ' ' + p.ta, nama: 'Kalender Akademik ' + p.smt + ' ' + p.ta.replace('/', '-'), html, halaman: [Cetak.halaman(html, true, 'kl', { fs: 11, min: 6 })],
      dok: { kode, jenis: 'KALENDER', judul: 'Kalender Akademik ' + p.smt + ' ' + p.ta, ringkasan: { semester: p.smt, jumlah: list.length + ' kegiatan' } } };
  }
};
