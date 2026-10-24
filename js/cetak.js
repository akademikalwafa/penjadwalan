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
    this.st = { o, orient: o.orientasi || 'auto', zoom: 0, docs: [], kode: o.simpan === 'per' ? null : this.kode(o.prefix || 'DOK') };
    const pv = $('#preview');
    pv.innerHTML = '<div class="pv-bar"><button class="btn btn-ghost btn-icon" data-pv="tutup" title="Tutup">' + ic('arrowl') + '</button><div style="min-width:0;flex:1 1 220px"><h3>' + esc(o.judul || 'Pratinjau Cetak') + '</h3><div class="sub" id="pv-sub">' + esc(o.sub || '') + '</div></div>' +
      (o.bisaOrientasi !== false ? '<div class="seg" id="pv-or">' + ['auto', 'portrait', 'landscape'].map(v => '<button data-pv="or" data-v="' + v + '" class="' + (this.st.orient === v ? 'on' : '') + '">' + { auto: 'Otomatis', portrait: 'Portrait', landscape: 'Landscape' }[v] + '</button>').join('') + '</div>' : '') +
      '<div class="row gap-s"><button class="btn btn-sm btn-icon" data-pv="zout" title="Perkecil">' + ic('minus', 'ic-sm') + '</button><span class="mono" id="pv-zoom" style="min-width:46px;text-align:center">100%</span><button class="btn btn-sm btn-icon" data-pv="zin" title="Perbesar">' + ic('plus', 'ic-sm') + '</button><button class="btn btn-sm" data-pv="fit">Pas</button></div>' +
      '<span class="muted" id="pv-hal"></span>' +
      '<button class="btn btn-soft" data-pv="unduh">' + ic('download') + 'Unduh PDF</button><button class="btn btn-accent" data-pv="cetak">' + ic('printer') + 'Cetak</button><button class="btn" data-pv="tutup">Tutup</button></div>' +
      '<div class="pv-body" id="pv-body"><div class="pv-pages" id="pv-pages"><div class="splash-in" style="color:#fff;padding:60px"><div class="spin"></div>Menyusun dokumen…</div></div></div>' +
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
    try { docs = await st.o.buat({ orient: st.orient, kode: st.kode }); }
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
   PEMBUAT DOKUMEN
   ===================================================================== */
const Doc = {
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
  suratTugas(dosenId, perKey, st, tanggalPilih) {
    const d = DB.get('Dosen', 'ID', dosenId) || {}, p = Dom.perObj(perKey);
    const mk = (Dom.bebanDosen(perKey).get(dosenId) || []).slice().sort((a, b) => Dom.rombelUrut(a, b) || String(a.kur.KodeMK).localeCompare(b.kur.KodeMK));
    const totalSks = mk.reduce((a, u) => a + u.sks, 0), kode = st ? st.KodeVerif : 'BELUM-TERBIT';
    const tanggal = (st && !tanggalPilih ? st.Tanggal : tanggalPilih) || Dom.set('ST_TANGGAL') || isoTgl();
    const ganti = (t) => String(t || '').replace(/\{nomor_sk\}/g, Dom.set('ST_NOMOR_SK', '……')).replace(/\{semester\}/g, p.smt).replace(/\{tahun_akademik\}/g, p.ta).replace(/\{nama_dosen\}/g, d.Nama || '');
    const ketentuan = Dom.set('ST_KETENTUAN', '').split('\n').map(x => x.trim()).filter(Boolean);
    const aset = DB.raw.Aset || {};
    const html = '<div class="kopst"><div class="lg">' + Cetak.logo() + '</div><div class="tx"><h2>' + esc(this.kampus()) + '</h2>' + (Dom.set('KAMPUS_NAMA_ARAB') ? '<span class="ar arab">' + esc(Dom.set('KAMPUS_NAMA_ARAB')) + '</span>' : '') +
        (Dom.set('KAMPUS_SK') ? '<small>' + esc(Dom.set('KAMPUS_SK')) + '</small>' : '') + '<small>' + esc(this.alamat()) + '</small><small>' + esc(this.kontak()) + '</small></div><div style="width:5.4em"></div></div>' +
      '<h1>SURAT TUGAS MENGAJAR</h1><div class="no">Nomor: ' + esc(st ? st.Nomor : '(diterbitkan otomatis saat dicetak)') + '</div>' +
      '<p>' + esc(ganti(Dom.set('ST_PEMBUKA'))) + '</p>' +
      '<table class="idt"><tr><td>Nama Dosen</td><td>:</td><td><b>' + esc(d.Nama || '') + '</b></td></tr><tr><td>NIDN</td><td>:</td><td>' + esc(d.NIDN || '-') + '</td></tr></table>' +
      '<p style="margin-bottom:.4em">Untuk mengampu mata kuliah pada Semester ' + esc(p.smt) + ' Tahun Akademik ' + esc(p.ta) + ' sebagai berikut:</p>' +
      '<table class="mk"><thead><tr><th style="width:5%">NO</th><th>MATA KULIAH</th><th style="width:6%">SKS</th><th style="width:6%">SMT</th><th style="width:19%">PRODI</th><th style="width:14%">PROGRAM</th><th style="width:19%">JADWAL</th></tr></thead><tbody>' +
      mk.map((u, i) => { const jw = Dom.hariJam(u.id, perKey, u.pola); return '<tr><td class="c">' + (i + 1) + '</td><td>' + esc(u.kur.NamaMK) + (u.kur.NamaArab ? '<span class="ar arab">' + esc(u.kur.NamaArab) + '</span>' : '') + '</td><td class="c">' + u.sks + '</td><td class="c">' + u.smt + '</td><td>' + esc(Dom.prodiNama(u.prodi)) + '</td><td>' + esc(u.kelas) + '</td><td class="jw">' + (jw ? jw.split('; ').map(esc).join('<br>') : '<span style="color:#94A3B8">—</span>') + '</td></tr>'; }).join('') +
      '<tr class="tot"><td colspan="2" style="text-align:right">TOTAL BEBAN MENGAJAR</td><td class="c">' + totalSks + '</td><td colspan="4">' + mk.length + ' mata kuliah</td></tr></tbody></table>' +
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

  /* ---------- Absensi Mahasiswa (hitam putih) ---------- */
  absensi(u, perKey, o, ctx) {
    const n = Math.max(1, Math.min(32, num(o.pertemuan, 18))), mhs = Dom.mhsRombel(u.prodi, u.angkatan, u.kelas, o.jk || '');
    const rows = mhs.length + 4, kode = (ctx && ctx.kode) || Cetak.kode('ABS');
    const land = o.orient === 'landscape' || (o.orient === 'auto' && n > 14 && rows <= 34);
    const jkTeks = o.jk === 'L' ? ' (Laki-laki)' : o.jk === 'P' ? ' (Perempuan)' : '';
    const th = Array.from({ length: n }, (_, i) => '<th>' + (i + 1) + '</th>').join(''), blank = Array.from({ length: n }, () => '<td></td>').join('');
    const html = '<div class="ttl"><h1>DAFTAR HADIR MAHASISWA/I</h1><h2>' + esc(this.kampus().toUpperCase()) + '</h2><h3>' + esc(Dom.prodiNama(u.prodi).toUpperCase() + ' - ' + u.kelas.toUpperCase()) + jkTeks + '</h3></div>' +
      '<div class="inf"><div><span>Mata Kuliah</span><span>:</span><b>' + esc(u.kur.KodeMK + ' — ' + u.kur.NamaMK + ' (' + u.sks + ' SKS)') + '</b></div><div><span>Semester</span><span>:</span><span>' + u.smt + ' · ' + esc(Dom.perLabel(perKey)) + '</span></div>' +
      '<div><span>Nama Dosen</span><span>:</span><span>' + esc(Dom.dosenTeks(u)) + '</span></div><div><span>Hari / Jam</span><span>:</span><span>' + esc(Dom.hariJam(u.id, perKey, u.pola) || '-') + '</span></div></div>' +
      '<div class="grow"><table class="t"><colgroup><col style="width:2.6em"><col style="width:' + (land ? '25%' : '30%') + '"><col style="width:2.8em">' + Array.from({ length: n }, () => '<col>').join('') + '</colgroup><thead>' +
      '<tr><th rowspan="2">No</th><th rowspan="2">Nama Mahasiswa</th><th rowspan="2">KET</th><th colspan="' + n + '">Tanggal Kuliah</th></tr><tr>' + Array.from({ length: n }, () => '<th style="height:2.3em"></th>').join('') + '</tr>' +
      '<tr><th colspan="3" style="text-align:right">Pekan ke:</th>' + th + '</tr></thead><tbody>' +
      mhs.map((m, i) => '<tr><td class="c">' + (i + 1) + '</td><td class="nm">' + esc(m.Nama) + '</td><td class="c">' + esc(m.JK) + '</td>' + blank + '</tr>').join('') +
      Array.from({ length: 4 }, (_, i) => '<tr class="kos"><td class="c">' + (mhs.length + i + 1) + '</td><td></td><td></td>' + blank + '</tr>').join('') + '</tbody></table></div>' +
      '<div class="ft">' + this.vbox(kode, 'Keterangan: H Hadir · S Sakit · I Izin · A Alpa') + '<div class="ttd">Dosen Pengampu,<div class="sp"></div><b>' + esc(Dom.dosenTeks(u, ' / ')) + '</b></div></div>';
    return { judul: u.kur.NamaMK + ' · ' + u.kelas, nama: 'Absensi ' + u.kur.KodeMK + ' ' + u.prodi + ' Smt ' + u.smt + ' ' + u.kelas + jkTeks, halaman: [Cetak.halaman(html, land, 'bw', { fs: 10.5, min: 5.5 })],
      dok: { kode, jenis: 'ABSENSI', judul: 'Absensi ' + u.kur.NamaMK + ' — ' + Dom.rombelLabel(u.prodi, u.angkatan, u.kelas, perKey), ringkasan: { dosen: Dom.dosenTeks(u), prodi: Dom.prodiNama(u.prodi), kelas: u.kelas, semester: u.smt, jumlah: mhs.length } } };
  },

  /* ---------- Daftar Hadir Kegiatan (hitam putih, zig-zag) ---------- */
  daftarHadir(rb, perKey, f, ctx) {
    const mhs = Dom.mhsRombel(rb.prodi, rb.angkatan, rb.kelas, f.jk || ''), kode = (ctx && ctx.kode) || Cetak.kode('DH');
    const land = f.orient === 'landscape';
    const smt = Dom.semMhs(rb.angkatan, perKey), total = mhs.length + 4;
    const baris = Array.from({ length: total }, (_, i) => { const m = mhs[i], no = i + 1, kiri = no % 2 === 1;
      return '<tr' + (m ? '' : ' class="kos"') + '><td class="c">' + no + '</td><td class="nm">' + (m ? esc(m.Nama) : '') + '</td><td><div class="sig-zz ' + (kiri ? 'l' : 'r') + '"><span>' + no + '. ……………………</span></div></td></tr>'; }).join('');
    const jkTeks = f.jk === 'L' ? 'Laki-laki' : f.jk === 'P' ? 'Perempuan' : 'Semua';
    const html = '<div class="kop"><div class="lg">' + Cetak.logo() + '</div><div class="tx"><b>' + esc(this.kampus().toUpperCase()) + '</b><small>' + esc(this.alamat()) + '</small><small>' + esc(this.kontak()) + '</small></div></div>' +
      '<div class="ttl"><h1 style="font-size:1.3em">LEMBAR DAFTAR HADIR MAHASISWA &amp; KEGIATAN AKADEMIK</h1><h2>' + esc(this.kampus().toUpperCase()) + '</h2>' + (f.judul ? '<div class="keg">“' + esc(f.judul) + '”</div>' : '') + '</div>' +
      '<div class="inf"><div><span>Hari / Tanggal</span><span>:</span><b>' + esc(fmtHariTgl(f.tanggal) || '……………') + '</b></div><div><span>Program</span><span>:</span><span>' + esc(rb.kelas) + (f.jk ? ' · ' + jkTeks : '') + '</span></div>' +
      '<div><span>Prodi / Kelas / Smt</span><span>:</span><span>' + esc(Dom.prodiNama(rb.prodi) + ' / ' + rb.kelas + ' / ' + smt) + '</span></div><div><span>Lokasi / Ruang</span><span>:</span><span>' + esc(f.lokasi || '……………') + '</span></div>' +
      '<div><span>Jumlah Peserta</span><span>:</span><span>' + mhs.length + ' mahasiswa</span></div><div><span>Periode</span><span>:</span><span>' + esc(Dom.perLabel(perKey)) + '</span></div></div>' +
      '<div class="grow"><table class="t"><colgroup><col style="width:3em"><col style="width:52%"><col></colgroup><thead><tr><th>NO</th><th>NAMA LENGKAP</th><th>TANDA TANGAN</th></tr></thead><tbody>' + baris + '</tbody></table></div>' +
      '<div class="cat"><h4>CATATAN PELAKSANAAN ACARA</h4><div>Total Mahasiswa Hadir : …………… Orang</div><div>Waktu Sesi Dimulai : …………… WIB</div><div>Total Mahasiswa Absen/Izin : …………… Orang</div><div>Waktu Sesi Berakhir : …………… WIB</div></div>' +
      '<div class="ft">' + this.vbox(kode, 'Lembar presensi resmi') + '<div class="ttd">' + esc(Dom.set('ST_TEMPAT', 'Bogor')) + ', ' + esc(fmtTgl(f.tanggal) || '……………') + '<br>Panitia / Penanggung Jawab,<div class="sp"></div>(……………………………)</div></div>';
    return { judul: Dom.rombelLabel(rb.prodi, rb.angkatan, rb.kelas, perKey), nama: 'Daftar Hadir ' + rb.prodi + ' Smt ' + smt + ' ' + rb.kelas + ' — ' + (f.judul || 'Kegiatan').slice(0, 50),
      halaman: [Cetak.halaman(html, land, 'bw', { fs: 10.5, min: 5.5 })], dok: { kode, jenis: 'DAFTAR_HADIR', judul: 'Daftar Hadir: ' + (f.judul || 'Kegiatan') + ' — ' + Dom.rombelLabel(rb.prodi, rb.angkatan, rb.kelas, perKey), ringkasan: { kegiatan: f.judul, tanggal: f.tanggal, prodi: Dom.prodiNama(rb.prodi), kelas: rb.kelas, semester: smt, jumlah: mhs.length } } };
  },

  /* ---------- Absensi Penerima Kitab (kepala biru tua, Arab RTL) ---------- */
  kitab(rb, perKey, f, ctx) {
    const mhs = Dom.mhsRombel(rb.prodi, rb.angkatan, rb.kelas, ''), kitab = f.kitab || [], kode = (ctx && ctx.kode) || Cetak.kode('KTB');
    const land = f.orient === 'landscape' || (f.orient === 'auto' && kitab.length >= 4), smt = Dom.semMhs(rb.angkatan, perKey);
    const blank = kitab.map(() => '<td></td>').join('');
    const html = '<div class="kop"><div class="lg">' + Cetak.logo() + '</div><div class="tx"><b>' + esc(this.kampus().toUpperCase()) + '</b><small>' + esc(this.alamat()) + '</small></div></div>' +
      '<div class="ttl"><h1>LEMBAR KONTROL &amp; TANDA TANGAN PENERIMAAN KITAB</h1><h2>' + esc(this.kampus().toUpperCase()) + '</h2><h3>' + esc((Dom.prodiNama(rb.prodi) + ' - KELAS ' + rb.kelas + ' - SEMESTER ' + smt).toUpperCase()) + '</h3></div>' +
      '<div class="inf"><div><small>TANGGAL PENYERAHAN</small>' + esc(fmtHariTgl(f.tanggal) || '……………') + '</div><div><small>LOKASI / RUANG</small>' + esc(f.lokasi || '……………') + '</div><div><small>JUMLAH MAHASISWA</small>' + mhs.length + ' mahasiswa</div></div>' +
      '<div class="grow"><table class="t"><colgroup><col style="width:3em"><col style="width:' + (kitab.length > 5 ? 24 : 32) + '%">' + kitab.map(() => '<col>').join('') + '</colgroup><thead><tr><th>No</th><th>Nama Mahasiswa</th>' +
      kitab.map(k => '<th class="' + (Dom.adaArab(k) ? 'arab' : '') + '"' + (Dom.adaArab(k) ? ' dir="rtl"' : '') + '>' + esc(k) + '</th>').join('') + '</tr></thead><tbody>' +
      mhs.map((m, i) => '<tr><td class="c">' + (i + 1) + '</td><td>' + esc(m.Nama) + '</td>' + blank + '</tr>').join('') +
      Array.from({ length: 4 }, (_, i) => '<tr class="kos"><td class="c">' + (mhs.length + i + 1) + '</td><td></td>' + blank + '</tr>').join('') + '</tbody></table></div>' +
      '<div class="ft" style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:.8em;font-size:.9em">' + this.vbox(kode, 'Lembar serah terima kitab') + '<div style="text-align:center;width:15em">' + esc(Dom.set('ST_TEMPAT', 'Bogor')) + ', ' + esc(fmtTgl(f.tanggal) || '……………') + '<br>Petugas Penyerahan,<div style="height:4em"></div>(……………………………)</div></div>';
    return { judul: Dom.rombelLabel(rb.prodi, rb.angkatan, rb.kelas, perKey), nama: 'Penerima Kitab ' + rb.prodi + ' Smt ' + smt + ' ' + rb.kelas + ' — ' + (f.tanggal || ''),
      halaman: [Cetak.halaman(html, land, 'kb', { fs: 10.5, min: 5.5 })], dok: { kode, jenis: 'PENERIMA_KITAB', judul: 'Penerimaan Kitab — ' + Dom.rombelLabel(rb.prodi, rb.angkatan, rb.kelas, perKey), ringkasan: { prodi: Dom.prodiNama(rb.prodi), kelas: rb.kelas, semester: smt, tanggal: f.tanggal, jumlah: kitab.length + ' kitab' } } };
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
