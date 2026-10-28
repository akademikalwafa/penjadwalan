/* =====================================================================
   PENJADWALAN AL WAFA — pages-cetak.js
   Cetak Jadwal (Per Kelas, Per Dosen, Seluruh), Surat Tugas, Absensi
   Mahasiswa, Daftar Hadir (mahasiswa/dosen), Kehadiran Dosen, Penerima
   Kitab, Penilaian Tahfidz, Dokumen dari Template.
   Semua tombol Cetak membuka pratinjau terlebih dahulu.
   ===================================================================== */
'use strict';
function belumAdaJadwal(per) {
  return '<div class="card card-b">' + kosong('Belum ada jadwal tersimpan untuk <b>' + esc(Dom.perLabel(per)) + '</b>.' + (App.periode.persiapan ? '<br>Gunakan pilihan semester di kanan atas untuk beralih periode.' : '') + '<br><br><button class="btn btn-primary" data-a="nav" data-to="jadwal/reguler">' + ic('calplus') + 'Buka Generate Jadwal</button>', 'cal') + '</div>';
}
function orientSeg(nilai, act) { return '<div class="seg">' + [['auto', 'Otomatis'], ['portrait', 'Portrait'], ['landscape', 'Landscape']].map(x => '<button data-a="' + (act || 'or') + '" data-v="' + x[0] + '" class="' + (nilai === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>'; }
function jkSeg(nilai, act) { return '<div class="seg">' + [['', 'Semua'], ['L', 'Laki-laki saja'], ['P', 'Perempuan saja']].map(x => '<button data-a="' + (act || 'jk') + '" data-v="' + x[0] + '" class="' + (nilai === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>'; }

/* =====================================================================
   CETAK JADWAL PERKULIAHAN
   ===================================================================== */
defPage('cetak-jadwal', {
  deps: ['Jadwal', 'Realisasi', 'Kurikulum', 'Dosen', 'JamSesi', 'Mahasiswa', 'Pengaturan', 'Aset'], refreshTabel: ['Jadwal', 'Realisasi', 'Dosen'], pakaiPer: true,
  st: { tab: 'kelas', prodi: '', smt: '', pola: '', pilih: {}, q: '', pilihD: {} },
  onParams(p) { this.st.tab = ['kelas', 'dosen', 'seluruh'].includes(p[0]) ? p[0] : 'kelas'; },
  judulMenu() { return 'Cetak Jadwal ' + { kelas: 'Per Kelas', dosen: 'Per Dosen', seluruh: 'Seluruh Jadwal' }[this.st.tab]; },
  render() {
    const s = this.st, per = App.perAktif();
    let h = kepala({ crumb: ['Cetak', 'Cetak Jadwal Perkuliahan', { kelas: 'Per Kelas', dosen: 'Per Dosen', seluruh: 'Seluruh Jadwal' }[s.tab]], judul: 'Cetak Jadwal Perkuliahan', desc: 'Setiap dokumen pas satu lembar A4 dan selalu lewat pratinjau. PDF tersimpan otomatis di folder Drive semester tersebut.', aksi: App.perToggle() + btnRefresh(false) }) +
      '<div class="tabcards">' + [['kelas', 'Per Kelas', '1 lembar per kelas (rombel)', 'building'], ['dosen', 'Per Dosen', '1 lembar per pola jam yang diajar', 'user'], ['seluruh', 'Seluruh Jadwal', '1 lembar landscape per pola', 'grid']].map(x => '<button class="' + (s.tab === x[0] ? 'on' : '') + '" data-a="nav" data-to="cetak-jadwal/' + x[0] + '"><span class="ik">' + ic(x[3]) + '</span><span><b>' + x[1] + '</b><small>' + x[2] + '</small></span></button>').join('') + '</div>';
    if (!Dom.adaJadwal(per)) { this.el.innerHTML = h + belumAdaJadwal(per); return; }
    if (s.tab === 'kelas') h += this.vKelas(per); else if (s.tab === 'dosen') h += this.vDosen(per); else h += this.vSeluruh(per);
    this.el.innerHTML = h;
  },
  rombel(per) {
    const um = Dom.unitMap(per), jg = Dom.jadwalGrid(per), m = new Map();
    jg.forEach((l, id) => { const u = um.get(id); if (!u) return; if (!m.has(u.rombel)) m.set(u.rombel, { key: u.rombel, prodi: u.prodi, angkatan: u.angkatan, kelas: u.kelas, pola: u.pola, smt: u.smt, mk: [] }); m.get(u.rombel).mk.push(u); });
    return [...m.values()].sort(Dom.rombelUrut);
  },
  vKelas(per) {
    const s = this.st, all = this.rombel(per), list = all.filter(r => (!s.prodi || r.prodi === s.prodi) && (!s.smt || String(r.smt) === s.smt) && (!s.pola || r.pola === s.pola));
    const nPilih = list.filter(r => s.pilih[r.key]).length;
    return '<div class="grid2" style="grid-template-columns:minmax(0,1fr)"><div class="card"><div class="card-h"><h3>' + ic('filter') + 'Parameter Cetak</h3><span class="sp"></span><button class="link-btn" data-a="reset">Reset</button></div><div class="card-b"><div class="fgrid">' +
      '<div class="field"><label>Program Studi</label><select class="input" data-ch="prodi"><option value="">Semua Prodi</option>' + opsi(Dom.prodi().map(p => ({ v: p.Kode, l: p.Nama })), s.prodi) + '</select></div>' +
      '<div class="field"><label>Semester</label><select class="input" data-ch="smt"><option value="">Semua Semester</option>' + opsi([...new Set(all.map(r => r.smt))].sort((a, b) => a - b).map(x => ({ v: String(x), l: 'Semester ' + x })), s.smt) + '</select></div>' +
      '<div class="field"><label>Pola Jam</label><select class="input" data-ch="pola">' + opsi([{ v: '', l: 'Semua Pola' }, { v: 'Reguler', l: 'Reguler (termasuk Ma\'had Aly)' }, { v: 'Hybrid', l: 'Hybrid' }], s.pola) + '</select></div></div>' +
      '<div class="row" style="margin-top:12px"><label class="chk"><input type="checkbox" data-ch="semua" ' + (list.length && nPilih === list.length ? 'checked' : '') + '> <b>Pilih Semua Kelas</b></label><span class="faint">' + nPilih + ' dari ' + list.length + ' kelas dipilih</span><span class="sp"></span>' +
      '<button class="btn" data-a="excelKelas" ' + (nPilih ? '' : 'disabled') + '>' + ic('sheet') + 'Simpan Excel</button><button class="btn btn-primary" data-a="cetakKelas" ' + (nPilih ? '' : 'disabled') + '>' + ic('printer') + 'Cetak Semua Kelas Terpilih (PDF Gabungan)</button></div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:36px"></th><th>Program Studi · Semester</th><th>Kelas</th><th>Pola</th><th>SKS</th><th>Mata Kuliah</th><th>Mahasiswa</th><th class="right">Aksi</th></tr></thead><tbody>' +
      (list.map(r => { const mk = [...new Map(r.mk.map(u => [u.id, u])).values()], mhs = Dom.mhsRombel(r.prodi, r.angkatan, r.kelas).length;
        return '<tr><td><input type="checkbox" style="width:17px;height:17px;accent-color:var(--primary)" data-ch="pilih" data-v="' + attr(r.key) + '" ' + (s.pilih[r.key] ? 'checked' : '') + '></td><td><b>' + dotProdi(r.prodi) + ' ' + esc(Dom.prodiNama(r.prodi)) + '</b> · Sem. ' + r.smt + '<div class="t-sub">Angkatan ' + esc(r.angkatan) + '</div></td><td>' + badgeKelas(r.kelas) + '</td><td><span class="badge ' + (r.pola === 'Hybrid' ? 'orange' : 'info') + '">' + esc(r.pola) + '</span></td>' +
          '<td>' + mk.reduce((a, u) => a + u.sks, 0) + ' SKS</td><td>' + mk.length + ' MK</td><td>' + mhs + ' mhs</td><td class="right nowrap"><button class="btn btn-sm" data-a="excel1" data-v="' + attr(r.key) + '">' + ic('sheet', 'ic-sm') + '</button> <button class="btn btn-sm btn-soft" data-a="lihat1" data-v="' + attr(r.key) + '">' + ic('eye', 'ic-sm') + 'Pratinjau &amp; Cetak</button></td></tr>'; }).join('') ||
        '<tr><td colspan="8">' + kosong('Tidak ada kelas pada filter ini.', 'building') + '</td></tr>') + '</tbody></table></div></div></div>';
  },
  vDosen(per) {
    const s = this.st, berj = Dom.dosenBerjadwal(per);
    const list = Dom.dosen().filter(d => berj.has(d.ID) && cocok(d.Nama + ' ' + d.NIDN, s.q));
    const nPilih = list.filter(d => s.pilihD[d.ID]).length;
    return '<div class="card"><div class="card-h"><div class="input-ic" style="flex:1 1 260px">' + ic('search') + '<input class="input" data-in="q" placeholder="Cari nama dosen atau NIDN…" value="' + attr(s.q) + '"></div><label class="chk"><input type="checkbox" data-ch="semuaD" ' + (list.length && nPilih === list.length ? 'checked' : '') + '> Pilih semua (' + list.length + ' dosen berjadwal)</label><span class="sp"></span>' +
      '<button class="btn btn-primary" data-a="cetakDosen" ' + (nPilih ? '' : 'disabled') + '>' + ic('printer') + 'Cetak ' + (nPilih || '') + ' Dosen Terpilih</button></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:36px"></th><th>Dosen</th><th>Pola Jam</th><th>Mata Kuliah</th><th>Total SKS</th><th class="right">Aksi</th></tr></thead><tbody>' +
      (list.map(d => { const mk = [...new Map(berj.get(d.ID).map(u => [u.id, u])).values()], pola = [...new Set(mk.map(u => u.pola))];
        return '<tr><td><input type="checkbox" style="width:17px;height:17px;accent-color:var(--primary)" data-ch="pilihD" data-v="' + attr(d.ID) + '" ' + (s.pilihD[d.ID] ? 'checked' : '') + '></td><td><div class="row" style="flex-wrap:nowrap"><div class="avatar">' + esc(inisial(d.Nama)) + '</div><div><b>' + esc(d.Nama) + '</b><div class="t-sub">NIDN ' + esc(d.NIDN || '-') + '</div></div></div></td><td>' + pola.map(p => '<span class="badge ' + (p === 'Hybrid' ? 'orange' : 'info') + '">' + p + '</span>').join(' ') + (pola.length > 1 ? ' <small class="faint">(2 lembar)</small>' : '') + '</td>' +
          '<td>' + mk.length + ' MK</td><td>' + mk.reduce((a, u) => a + u.sks, 0) + ' SKS</td><td class="right"><button class="btn btn-sm btn-soft" data-a="lihatD" data-v="' + attr(d.ID) + '">' + ic('eye', 'ic-sm') + 'Pratinjau &amp; Cetak</button></td></tr>'; }).join('') || '<tr><td colspan="6">' + kosong('Tidak ada dosen berjadwal pada filter ini.', 'users') + '</td></tr>') + '</tbody></table></div></div>';
  },
  vSeluruh(per) {
    const um = Dom.unitMap(per);
    return '<div class="grid2">' + ['Reguler', 'Hybrid'].map(p => { const j = Dom.jadwal(per, p).filter(x => x.Posisi === 'GRID'), rb = new Set(j.map(x => (um.get(x.RealisasiID) || {}).rombel).filter(Boolean));
      return '<div class="card card-b"><div class="row"><div class="ik" style="width:44px;height:44px;border-radius:12px;background:var(--accent-50);color:var(--accent-h);display:grid;place-items:center">' + ic('grid') + '</div><div><b style="font-size:16px">Seluruh Jadwal — Pola ' + p + '</b><div class="muted">' + (p === 'Hybrid' ? 'Jumat & Sabtu' : 'Senin – Jumat · termasuk Ma\'had Aly') + '</div></div></div>' +
        '<div class="mini-stats" style="margin:14px 0"><div><small>Kelas</small><b>' + rb.size + '</b></div><div><small>Sesi terisi</small><b>' + j.length + '</b></div><div><small>Kertas</small><b>A4 Landscape</b></div></div>' +
        '<div class="row"><button class="btn" data-a="excelAll" data-v="' + p + '" ' + (j.length ? '' : 'disabled') + '>' + ic('sheet') + 'Simpan Excel</button><span class="sp"></span><button class="btn btn-primary" data-a="lihatAll" data-v="' + p + '" ' + (j.length ? '' : 'disabled') + '>' + ic('eye') + 'Pratinjau &amp; Cetak</button></div></div>'; }).join('') + '</div>' +
      '<div class="row" style="margin-top:14px"><span class="sp"></span><button class="btn btn-accent" data-a="lihatAll" data-v="">' + ic('printer') + 'Cetak Kedua Pola (2 lembar)</button></div>';
  },
  bukaKelas(rbs) {
    const per = App.perAktif(), satu = rbs.length === 1;
    Cetak.buka({ judul: 'Pratinjau — Jadwal Per Kelas', sub: (satu ? Dom.rombelLabel(rbs[0].prodi, rbs[0].angkatan, rbs[0].kelas, per, true) : rbs.length + ' kelas') + ' · ' + Dom.perLabel(per), periode: per, folder: 'Jadwal', prefix: 'JDW', jenis: 'JADWAL_KELAS',
      simpan: 'per', namaFile: satu ? undefined : 'Jadwal Per Kelas (' + rbs.length + ' kelas) — ' + Dom.perLabel(per).replace('/', '-'),
      buat: (ctx) => rbs.map(rb => Doc.jadwalKelas(rb, per, { orient: ctx.orient })) });
  },
  async excelKelas(rbs) {
    const per = App.perAktif(), um = Dom.unitMap(per);
    const sheets = rbs.map(rb => { const slots = Dom.slots(rb.pola), hari = Dom.hariPola(rb.pola), sesi = Dom.sesiPola(rb.pola), j = Dom.jadwal(per, rb.pola).filter(x => x.Posisi === 'GRID' && (um.get(x.RealisasiID) || {}).rombel === rb.key);
      const sel = (h, sn) => j.filter(x => x.Hari === h && String(x.Sesi) === String(sn)).map(x => { const u = um.get(x.RealisasiID); return u.kur.NamaMK + '\n' + Dom.dosenTeks(u); }).join('\n');
      const rows = [['JADWAL PERKULIAHAN'], ['Program Studi', Dom.prodiNama(rb.prodi)], ['Kelas', rb.kelas], ['Semester', Dom.semMhs(rb.angkatan, per)], ['Tahun Akademik', Dom.perTA(per)], []];
      rows.push(['HARI'].concat(sesi.map(sn => { const s0 = slots.find(x => x.sesi === sn); return 'Sesi ' + sn + (s0 ? ' (' + s0.mulai + '–' + s0.selesai + ')' : ''); })));
      hari.forEach(h => rows.push([h].concat(sesi.map(sn => slots.some(x => x.hari === h && x.sesi === sn) ? sel(h, sn) : '—'))));
      return { nama: rb.prodi + ' ' + Dom.semMhs(rb.angkatan, per) + ' ' + rb.kelas, rows, lebar: [14].concat(sesi.map(() => 34)) }; });
    await Excel.tulis('Jadwal Per Kelas ' + Dom.perLabel(per).replace('/', '-'), sheets);
  },
  acts: {
    reset() { Object.assign(this.st, { prodi: '', smt: '', pola: '' }); this.render(); },
    lihat1(b) { const rb = this.rombel(App.perAktif()).find(r => r.key === b.dataset.v); if (rb) this.bukaKelas([rb]); },
    excel1(b) { const rb = this.rombel(App.perAktif()).find(r => r.key === b.dataset.v); if (rb) this.excelKelas([rb]); },
    cetakKelas() { const l = this.rombel(App.perAktif()).filter(r => this.st.pilih[r.key]); if (l.length) this.bukaKelas(l); },
    excelKelas() { const l = this.rombel(App.perAktif()).filter(r => this.st.pilih[r.key]); if (l.length) this.excelKelas(l); },
    lihatD(b) { this.bukaDosen([b.dataset.v]); },
    cetakDosen() { const ids = Object.keys(this.st.pilihD).filter(id => this.st.pilihD[id] && Dom.dosenBerjadwal(App.perAktif()).has(id)); if (ids.length) this.bukaDosen(ids); },
    lihatAll(b) {
      const per = App.perAktif(), pola = b.dataset.v ? [b.dataset.v] : ['Reguler', 'Hybrid'].filter(p => Dom.jadwal(per, p).some(x => x.Posisi === 'GRID'));
      Cetak.buka({ judul: 'Pratinjau — Seluruh Jadwal', sub: pola.join(' & ') + ' · ' + Dom.perLabel(per), periode: per, folder: 'Jadwal', prefix: 'JDW', jenis: 'JADWAL_SELURUH', simpan: 'per', orientasi: 'landscape', bisaOrientasi: false,
        buat: (ctx) => pola.map(p => Doc.jadwalSeluruh(p, per, { orient: 'landscape' })) });
    },
    async excelAll(b) {
      const per = App.perAktif(), p = b.dataset.v, um = Dom.unitMap(per), slots = Dom.slots(p), j = Dom.jadwal(per, p).filter(x => x.Posisi === 'GRID');
      const rombel = [...new Map(j.map(x => um.get(x.RealisasiID)).filter(Boolean).map(u => [u.rombel, u])).values()].sort(Dom.rombelUrut);
      const rows = [['Prodi · Smt · Kelas'].concat(slots.map(s => s.hari + ' S' + s.sesi + ' (' + s.mulai + '–' + s.selesai + ')'))];
      rombel.forEach(u => rows.push([u.prodi + ' Smt ' + u.smt + ' ' + u.kelas].concat(slots.map(s => j.filter(x => x.Hari + '|' + x.Sesi === s.key && um.get(x.RealisasiID).rombel === u.rombel).map(x => { const y = um.get(x.RealisasiID); return y.kur.NamaMK + ' — ' + Dom.dosenTeks(y); }).join('\n')))));
      await Excel.tulis('Seluruh Jadwal ' + p + ' ' + Dom.perLabel(per).replace('/', '-'), [{ nama: 'Jadwal ' + p, rows, lebar: [26].concat(slots.map(() => 30)) }]);
    }
  },
  bukaDosen(ids) {
    const per = App.perAktif();
    Cetak.buka({ judul: 'Pratinjau — Jadwal Per Dosen', sub: (ids.length === 1 ? Dom.dosenNama(ids[0]) : ids.length + ' dosen') + ' · ' + Dom.perLabel(per), periode: per, folder: 'Jadwal', prefix: 'JDW', jenis: 'JADWAL_DOSEN', simpan: 'per',
      buat: (ctx) => ids.map(id => Doc.jadwalDosen(id, per, { orient: ctx.orient })) });
  },
  ch: {
    prodi(t) { this.st.prodi = t.value; this.render(); }, smt(t) { this.st.smt = t.value; this.render(); }, pola(t) { this.st.pola = t.value; this.render(); },
    pilih(t) { this.st.pilih[t.dataset.v] = t.checked; this.render(); },
    semua(t) { const s = this.st; this.rombel(App.perAktif()).filter(r => (!s.prodi || r.prodi === s.prodi) && (!s.smt || String(r.smt) === s.smt) && (!s.pola || r.pola === s.pola)).forEach(r => { s.pilih[r.key] = t.checked; }); this.render(); },
    pilihD(t) { this.st.pilihD[t.dataset.v] = t.checked; this.render(); },
    semuaD(t) { const s = this.st, berj = Dom.dosenBerjadwal(App.perAktif()); Dom.dosen().filter(d => berj.has(d.ID) && cocok(d.Nama + ' ' + d.NIDN, s.q)).forEach(d => { s.pilihD[d.ID] = t.checked; }); this.render(); }
  },
  inp: { q: debounce(function (t) { this.st.q = t.value; this.render(); const i = $('[data-in="q"]', this.el); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250) }
});

/* =====================================================================
   CETAK SURAT TUGAS MENGAJAR
   ===================================================================== */
defPage('cetak-st', {
  deps: ['SuratTugas', 'Jadwal', 'Realisasi', 'Dosen', 'Pengaturan', 'Aset', 'Kurikulum'], refreshTabel: ['SuratTugas', 'Jadwal', 'Realisasi', 'Dosen'], pakaiPer: true,
  st: { q: '', f: 'semua', tanggal: '' },
  dosenList(per) {
    const pakaiJadwal = Dom.adaJadwal(per), src = pakaiJadwal ? Dom.dosenBerjadwal(per) : Dom.bebanDosen(per);
    return { pakaiJadwal, list: Dom.dosen().filter(d => src.has(d.ID)).map(d => { const mk = Dom.bebanDosen(per).get(d.ID) || []; return { d, mk, sks: mk.reduce((a, u) => a + u.sks, 0), st: Dom.stDosen(per).get(d.ID) }; }) };
  },
  render() {
    const s = this.st, per = App.perAktif(), { pakaiJadwal, list } = this.dosenList(per);
    if (!s.tanggal) s.tanggal = Dom.set('ST_TANGGAL') || isoTgl();
    const terbit = list.filter(x => x.st), tampil = list.filter(x => (s.f === 'semua' || (s.f === 'sudah' ? x.st : !x.st)) && cocok(x.d.Nama + ' ' + x.d.NIDN, s.q));
    const contoh = (Dom.set('ST_FORMAT', '{nomor}/ST.ADMK/STIS-AL-WAFA/{bulan_romawi}/{tahun}')).replace('{nomor}', String(num(Dom.set('ST_NOMOR_TERAKHIR', '0')) + 1)).replace('{nomor3}', String(num(Dom.set('ST_NOMOR_TERAKHIR', '0')) + 1).padStart(3, '0')).replace('{bulan_romawi}', ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][(tgl(s.tanggal) || new Date()).getMonth()]).replace('{bulan}', String((tgl(s.tanggal) || new Date()).getMonth() + 1).padStart(2, '0')).replace('{tahun}', (tgl(s.tanggal) || new Date()).getFullYear());
    this.el.innerHTML = kepala({ crumb: ['Cetak', 'Cetak Surat Tugas Mengajar'], judul: 'Cetak Surat Tugas Mengajar', badge: ' <span class="badge ok dot">' + esc(Dom.perLabel(per)) + '</span>',
        aksi: App.perToggle() + btnRefresh(false) + (Sesi.admin() ? '<button class="btn" data-a="nav" data-to="blast">' + ic('wa') + 'Blast WA (Fonnte)</button>' : '') + '<button class="btn btn-primary" data-a="semua" ' + (list.length ? '' : 'disabled') + '>' + ic('printer') + 'Cetak Semua (' + list.length + ')</button>' }) +
      (!pakaiJadwal && list.length ? '<div class="alert warn">' + ic('alert') + '<div>Jadwal ' + esc(Dom.perLabel(per)) + ' belum disimpan — daftar memakai dosen pengampu di Realisasi Kurikulum.</div></div>' : '') +
      '<div class="kpis">' + kpi({ lb: 'Dosen Berjadwal', vl: list.length + '<small>dosen aktif</small>', ic: 'cap', ft: list.length ? ic('okc', 'ic-sm') + ' Siap diterbitkan' : '' }) +
      kpi({ lb: 'Surat Tugas Terbit', vl: terbit.length + '<small>dosen</small>', ic: 'okc', cls: 'ok', ft: 'Nomor terkunci server (LockService)', act: 'f', v: 'sudah' }) +
      kpi({ lb: 'Belum Diterbitkan', vl: (list.length - terbit.length) + '<small>dosen</small>', ic: 'clipboard', cls: 'orange', ft: 'Terbit otomatis saat dicetak', act: 'f', v: 'belum' }) +
      kpi({ lb: 'No. Registrasi Terakhir', vl: '<span style="font-size:17px">' + esc(Dom.set('ST_NOMOR_TERAKHIR', '0')) + '</span>', ic: 'tag', ft: 'Berikutnya: <span class="mono">' + esc(contoh) + '</span>' }) + '</div>' +
      '<div class="card card-b" style="margin-bottom:14px"><div class="row"><div class="field" style="flex:1 1 280px"><label>Format nomor surat' + (Sesi.admin() ? ' <button class="link-btn" data-a="nav" data-to="pengaturan/surat">ubah</button>' : '') + '</label><div class="input mono" style="background:var(--surface-2)">' + esc(Dom.set('ST_FORMAT', '{nomor}/ST.ADMK/STIS-AL-WAFA/{bulan_romawi}/{tahun}')) + '</div></div>' +
      '<div class="field" style="width:200px"><label>Tanggal surat</label><input type="date" class="input" data-ch="tanggal" value="' + attr(s.tanggal) + '"></div>' +
      '<div class="alert info" style="flex:1 1 300px;margin:0">' + ic('info') + '<div>Satu nomor per dosen per semester. Cetak ulang (mis. setelah jadwal berubah) memakai nomor yang sama dan mengganti PDF lama.</div></div></div></div>' +
      '<div class="card"><div class="card-h"><div class="input-ic" style="flex:1 1 240px">' + ic('search') + '<input class="input" data-in="q" placeholder="Cari nama dosen atau NIDN…" value="' + attr(s.q) + '"></div>' +
      '<div class="seg">' + [['semua', 'Semua Dosen', list.length], ['sudah', 'Sudah Terbit', terbit.length], ['belum', 'Belum Terbit', list.length - terbit.length]].map(x => '<button data-a="f" data-v="' + x[0] + '" class="' + (s.f === x[0] ? 'on' : '') + '">' + x[1] + ' <small>(' + x[2] + ')</small></button>').join('') + '</div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="num">No</th><th>Nama Dosen</th><th>Mata Kuliah</th><th>Total SKS</th><th>Nomor Surat</th><th>Tanggal Terbit</th><th class="right">Aksi</th></tr></thead><tbody>' +
      (tampil.map((x, i) => '<tr><td class="num">' + (i + 1) + '</td><td><div class="row" style="flex-wrap:nowrap"><div class="avatar">' + esc(inisial(x.d.Nama)) + '</div><div><b>' + esc(x.d.Nama) + '</b><div class="t-sub">NIDN ' + esc(x.d.NIDN || '-') + '</div></div></div></td><td>' + x.mk.length + ' MK</td><td>' + x.sks + ' SKS</td>' +
        '<td>' + (x.st ? '<span class="mono" style="font-size:12.5px">' + esc(x.st.Nomor) + '</span>' + (x.st.FileID ? ' <span class="badge ok sq" title="PDF tersimpan di Drive">' + ic('cloud', 'ic-sm') + '</span>' : '') : '<span class="badge orange">Belum terbit</span>') + '</td><td>' + (x.st ? esc(fmtTgl(x.st.Tanggal)) : '—') + '</td>' +
        '<td class="right nowrap">' + (x.st && x.st.FileID ? '<button class="btn btn-sm btn-icon" data-a="unduh" data-v="' + attr(x.st.FileID) + '" title="Unduh PDF tersimpan">' + ic('download', 'ic-sm') + '</button> ' : '') + '<button class="btn btn-sm btn-soft" data-a="lihat" data-v="' + attr(x.d.ID) + '">' + ic('eye', 'ic-sm') + 'Pratinjau &amp; Cetak</button></td></tr>').join('') ||
        '<tr><td colspan="7">' + kosong(list.length ? 'Tidak ada dosen pada filter ini.' : 'Belum ada dosen berjadwal di ' + esc(Dom.perLabel(per)) + '.', 'filetext') + '</td></tr>') + '</tbody></table></div></div>';
  },
  buka(ids) {
    const per = App.perAktif(), s = this.st, tanggal = s.tanggal;
    Cetak.buka({ judul: 'Pratinjau — Surat Tugas Mengajar', sub: (ids.length === 1 ? Dom.dosenNama(ids[0]) : ids.length + ' dosen') + ' · ' + Dom.perLabel(per) + ' · A4 Portrait', periode: per, folder: 'Surat Tugas', simpan: 'per', bisaOrientasi: false, tata: 'SURAT_TUGAS',
      buat: (ctx) => ids.map(id => { const st = Dom.stDosen(per).get(id); return Doc.suratTugas(id, per, st, st && st.Tanggal !== tanggal ? tanggal : (st ? null : tanggal), ctx); }),
      sebelum: async () => {
        const perlu = ids.filter(id => { const st = Dom.stDosen(per).get(id); return !st || st.Tanggal !== tanggal; });
        if (!perlu.length) return true;
        const baru = perlu.filter(id => !Dom.stDosen(per).get(id)).length;
        if (baru && !(await konfirmasi('Terbitkan ' + baru + ' nomor surat tugas baru untuk ' + esc(Dom.perLabel(per)) + '?\nNomor diambil berurutan dari server dan tidak dapat dibatalkan.', { ok: 'Terbitkan & Cetak', icon: 'tag' }))) return false;
        const r = await api('st.terbit', { periode: per, dosen: perlu, tanggal });
        if (!r.success) return false;
        toast(r.message); return { rebuild: true };
      } });
  },
  acts: {
    f(b) { this.st.f = b.dataset.v; this.render(); },
    lihat(b) { this.buka([b.dataset.v]); },
    semua() { const { list } = this.dosenList(App.perAktif()); if (list.length) this.buka(list.map(x => x.d.ID)); },
    unduh(b) { unduhBerkasServer(b.dataset.v, b); }
  },
  ch: { tanggal(t) { this.st.tanggal = t.value || isoTgl(); this.render(); } },
  inp: { q: debounce(function (t) { this.st.q = t.value; this.render(); const i = $('[data-in="q"]', this.el); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250) }
});

/* =====================================================================
   CETAK ABSENSI MAHASISWA
   ===================================================================== */
defPage('cetak-absensi', {
  deps: ['Jadwal', 'Realisasi', 'Dosen', 'Mahasiswa', 'Kurikulum', 'Aset', 'Pengaturan'], refreshTabel: ['Jadwal', 'Realisasi', 'Mahasiswa'], pakaiPer: true,
  st: { dosen: '', n: 18, or: 'auto', jk: '' },
  render() {
    const s = this.st, per = App.perAktif();
    if (!Dom.adaJadwal(per)) { this.el.innerHTML = kepala({ crumb: ['Cetak', 'Cetak Absensi Mahasiswa'], judul: 'Cetak Absensi Mahasiswa', aksi: App.perToggle() }) + belumAdaJadwal(per); return; }
    const berj = Dom.dosenBerjadwal(per), dosen = Dom.dosen().filter(d => berj.has(d.ID));
    if (!s.dosen || !berj.has(s.dosen)) s.dosen = dosen[0] ? dosen[0].ID : '';
    const d = DB.get('Dosen', 'ID', s.dosen) || {}, mk = [...new Map((berj.get(s.dosen) || []).map(u => [u.id, u])).values()].sort(Dom.rombelUrut);
    this.el.innerHTML = kepala({ crumb: ['Cetak', 'Cetak Absensi Mahasiswa', Dom.perLabel(per)], judul: 'Cetak Absensi Mahasiswa', desc: 'Daftar hadir perkuliahan per dosen pengampu, terpilah per kelas dan pertemuan. Satu lembar A4 per kelas.', aksi: App.perToggle() + btnRefresh(false) }) +
      '<div class="kpis">' + kpi({ lb: 'Dosen Terjadwal', vl: dosen.length + '<small>dosen</small>', ic: 'usercheck' }) + kpi({ lb: 'Total Kelas Ajar', vl: [...berj.values()].reduce((a, l) => a + new Set(l.map(u => u.id)).size, 0) + '<small>rombel·MK</small>', ic: 'users' }) +
      kpi({ lb: 'Format Dokumen', vl: s.n + '<small>pertemuan</small>', ic: 'filetext', ft: 'Pas 1 lembar A4 · + ' + Tata.nilai('ABSENSI').kosong + ' baris susulan' }) + kpi({ lb: 'Data Terkoneksi', vl: fmtAngka(Dom.mhsAktif().length) + '<small>mahasiswa aktif</small>', ic: 'database', cls: 'ok', ft: 'Cuti, mundur & lulus dikecualikan otomatis' }) + '</div>' +
      '<div class="grid2" style="grid-template-columns:minmax(0,1fr)"><div class="card"><div class="card-h"><h3>' + ic('filter') + 'Parameter Cetak Presensi</h3><span class="sp"></span><span class="faint">PRD 5.14</span></div><div class="card-b"><div class="fgrid">' +
      '<div class="field" style="grid-column:span 2"><label>Pilih Dosen Pengampu (' + dosen.length + ' terjadwal)</label><select class="input" data-ch="dosen">' + opsi(dosen.map(x => ({ v: x.ID, l: x.Nama + (x.NIDN ? ' (NIDN: ' + x.NIDN + ')' : '') })), s.dosen) + '</select></div>' +
      '<div class="field"><label>Jumlah Pertemuan</label><input type="number" min="1" max="32" class="input" data-ch="n" value="' + s.n + '"></div></div>' +
      '<div class="row" style="margin-top:12px"><div class="field"><label>Orientasi Kertas</label>' + orientSeg(s.or) + '</div><div class="field"><label>Filter Jenis Kelamin</label>' + jkSeg(s.jk) + '</div></div></div>' +
      (d.ID ? '<div class="card-b" style="border-top:1px solid var(--border);background:var(--surface-2)"><div class="row"><div class="avatar dark" style="width:48px;height:48px">' + esc(inisial(d.Nama)) + '</div><div style="flex:1"><b style="font-size:16px;color:var(--primary)">' + esc(d.Nama) + '</b><div class="muted">NIDN: ' + esc(d.NIDN || '-') + ' · ' + mk.length + ' kelas aktif · ' + mk.reduce((a, u) => a + u.sks, 0) + ' SKS</div></div><button class="btn btn-primary" data-a="semua" ' + (mk.length ? '' : 'disabled') + '>' + ic('printer') + 'Cetak Semua Absensi Kelas Dosen Ini</button></div></div>' : '') +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kode &amp; Mata Kuliah</th><th>Prodi</th><th>Semester &amp; Kelas</th><th>Program</th><th>Hari &amp; Jam</th><th>Mahasiswa</th><th class="right">Aksi</th></tr></thead><tbody>' +
      (mk.map(u => { const n = Dom.mhsRombel(u.prodi, u.angkatan, u.kelas, s.jk).length;
        return '<tr><td><span class="badge info sq mono">' + esc(u.kur.KodeMK) + '</span> <b>' + esc(u.kur.NamaMK) + '</b>' + (u.kur.NamaArab ? ' <span class="arab muted">' + esc(u.kur.NamaArab) + '</span>' : '') + '<div class="t-sub">' + u.sks + ' SKS' + (u.gabung ? ' · gabung (dicetak per kelas asal)' : '') + '</div></td><td>' + esc(Dom.prodiNama(u.prodi)) + '</td><td>Smt ' + u.smt + ' · ' + esc(u.kelas) + '</td><td>' + badgeKelas(u.kelas) + '</td>' +
          '<td style="min-width:150px">' + esc(Dom.hariJam(u.id, per, u.pola) || '—') + '</td><td>' + n + ' mhs' + (s.jk ? ' (' + s.jk + ')' : '') + '</td><td class="right nowrap"><button class="btn btn-sm" data-a="unduh" data-v="' + u.id + '">' + ic('download', 'ic-sm') + 'Unduh</button> <button class="btn btn-sm btn-soft" data-a="lihat" data-v="' + u.id + '">' + ic('eye', 'ic-sm') + 'Cetak Form Absensi</button></td></tr>'; }).join('') ||
        '<tr><td colspan="7">' + kosong('Pilih dosen pengampu yang memiliki jadwal.', 'users') + '</td></tr>') + '</tbody></table></div></div>' +
      '<div class="alert info side">' + ic('shield') + '<div><b>Kaidah cetak:</b> Mata kuliah gabung dicetak per kelas asal. Mahasiswa aktif diurutkan menurut nama, ditambah <b>' + Tata.nilai('ABSENSI').kosong + ' baris kosong bernomor lanjutan</b> untuk susulan/tamu. Format hitam putih. Lebar kolom, tinggi baris, dan kop diatur lewat tombol <b>Tata Letak</b> di pratinjau.</div></div></div>';
  },
  buka(ids, unduh) {
    const per = App.perAktif(), s = this.st, um = Dom.unitMap(per), units = ids.map(id => um.get(id)).filter(Boolean);
    Cetak.buka({ judul: 'Pratinjau — Absensi Mahasiswa', sub: Dom.dosenNama(s.dosen) + ' · ' + units.length + ' kelas · ' + s.n + ' pertemuan', periode: per, folder: 'Absensi Mahasiswa', prefix: 'ABS', jenis: 'ABSENSI', orientasi: s.or, simpan: units.length === 1 ? 'per' : 'gabung', tata: 'ABSENSI',
      namaFile: units.length === 1 ? undefined : 'Absensi ' + Dom.dosenNama(s.dosen) + ' (' + units.length + ' kelas)' + (s.jk ? ' ' + s.jk : '') + ' — ' + Dom.perLabel(per).replace('/', '-'),
      buat: (ctx) => units.map(u => Doc.absensi(u, per, { pertemuan: s.n, jk: s.jk, orient: ctx.orient }, ctx)), dok: { judul: 'Absensi ' + Dom.dosenNama(s.dosen), ringkasan: { dosen: Dom.dosenNama(s.dosen), jumlah: units.length + ' kelas' } } });
    if (unduh) setTimeout(() => { const b = $('#preview [data-pv="unduh"]'); if (b) b.click(); }, 900);
  },
  acts: {
    or(b) { this.st.or = b.dataset.v; this.render(); }, jk(b) { this.st.jk = b.dataset.v; this.render(); },
    lihat(b) { this.buka([b.dataset.v]); }, unduh(b) { this.buka([b.dataset.v], true); },
    semua() { const l = [...new Set((Dom.dosenBerjadwal(App.perAktif()).get(this.st.dosen) || []).map(u => u.id))]; if (l.length) this.buka(l); }
  },
  ch: { dosen(t) { this.st.dosen = t.value; this.render(); }, n(t) { this.st.n = Math.max(1, Math.min(32, num(t.value, 18))); this.render(); } }
});

/* =====================================================================
   CETAK DAFTAR HADIR (kegiatan) — peserta mahasiswa per rombel atau dosen
   ===================================================================== */
defPage('cetak-hadir', {
  deps: ['Mahasiswa', 'Kelas', 'Prodi', 'Dosen', 'Aset', 'Pengaturan'], refreshTabel: ['Mahasiswa', 'Dosen'], pakaiPer: true,
  st: { judul: '', tanggal: '', lokasi: '', program: '', or: 'portrait', prog: '', jk: '', pilih: {}, peserta: 'mhs', dpilih: {}, dq: '', dpola: '' },
  dosenList(per) {
    const s = this.st, berj = Dom.dosenBerjadwal(per);
    return Dom.dosen().filter(d => (!s.dpola || (s.dpola === 'jadwal' ? berj.has(d.ID) : (berj.get(d.ID) || []).some(u => u.pola === s.dpola))) && cocok(d.Nama + ' ' + d.NIDN, s.dq));
  },
  render() {
    const s = this.st, per = App.perAktif(), rombel = Dom.rombelMhs(per), dsnMode = s.peserta === 'dosen';
    if (!s.tanggal) s.tanggal = isoTgl();
    const kls = Dom.kelasTerjadwal().map(k => k.Nama), list = rombel.filter(r => !s.prog || r.kelas === s.prog), nPilih = list.filter(r => s.pilih[r.key]).length;
    const dl = this.dosenList(per), nD = Object.keys(s.dpilih).filter(id => s.dpilih[id]).length, nDl = dl.filter(d => s.dpilih[d.ID]).length;
    const hit = (r) => { const m = Dom.mhsRombel(r.prodi, r.angkatan, r.kelas, s.jk); return { n: m.length, L: m.filter(x => x.JK === 'L').length, P: m.filter(x => x.JK === 'P').length }; };
    const t = Tata.nilai('DAFTAR_HADIR');
    const tombol = dsnMode ? '<button class="btn btn-primary" data-a="cetakDosen" ' + (nD ? '' : 'disabled') + '>' + ic('printer') + 'Cetak Daftar Hadir Dosen (' + nD + ')</button>'
      : '<button class="btn btn-primary" data-a="semua" ' + (nPilih ? '' : 'disabled') + '>' + ic('printer') + 'Cetak Semua Kelas Terpilih (' + nPilih + ')</button>';
    this.el.innerHTML = kepala({ crumb: ['Cetak', 'Cetak Daftar Hadir'], judul: 'Cetak Daftar Hadir', desc: 'Lembar presensi resmi untuk kuliah pakar, seminar, stadium generale, kajian, rapat, dan agenda akademik — untuk mahasiswa per rombel maupun dosen.', aksi: App.perToggle() + btnRefresh(false) + tombol }) +
      '<div class="grid2"><div class="card"><div class="card-h"><h3>' + ic('clipboard') + 'Bagian 1: Data Kegiatan</h3><span class="sp"></span><span class="badge orange">Wajib diisi</span></div><div class="card-b stack">' +
      '<div class="field"><label>Peserta</label><div class="seg">' + [['mhs', 'Mahasiswa (per rombel)'], ['dosen', 'Dosen']].map(x => '<button data-a="peserta" data-v="' + x[0] + '" class="' + (s.peserta === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div></div>' +
      '<div class="field"><label>Judul Kegiatan / Perkuliahan</label><input class="input" data-in="judul" maxlength="120" value="' + attr(s.judul) + '" placeholder="mis. Kegiatan Studi Islam"></div>' +
      '<div class="fgrid c2"><div class="field"><label>Hari &amp; Tanggal *</label><input type="date" class="input" data-ch="tanggal" value="' + attr(s.tanggal) + '"><span class="help">' + esc(fmtHariTgl(s.tanggal)) + '</span></div><div class="field"><label>Lokasi / Ruang</label><input class="input" data-in="lokasi" value="' + attr(s.lokasi) + '" placeholder="mis. Auditorium Utama Lt. 3"></div></div>' +
      '<div class="fgrid c2"><div class="field"><label>Program</label><input class="input" data-in="program" maxlength="80" value="' + attr(s.program) + '" placeholder="' + (dsnMode ? 'mis. Rapat Dosen' : 'mis. Reguler Pagi — kosong = nama kelas') + '"></div><div class="field"><label>Orientasi Kertas</label>' + orientSeg(s.or) + '</div></div></div></div>' +
      (dsnMode
        ? '<div class="card"><div class="card-h"><h3>' + ic('filter') + 'Bagian 2: Pilih Dosen</h3><span class="sp"></span><span class="faint">' + dl.length + ' dosen tampil</span></div><div class="card-b stack">' +
          '<div class="field"><label>Filter dosen</label><div class="row gap-s">' + [['', 'Semua dosen'], ['jadwal', 'Berjadwal semester ini'], ['Reguler', 'Mengajar Reguler'], ['Hybrid', 'Mengajar Hybrid']].map(x => '<button class="chip ' + (s.dpola === x[0] ? 'on' : '') + '" data-a="dpola" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div></div>' +
          '<div class="input-ic">' + ic('search') + '<input class="input" data-in="dq" placeholder="Cari nama dosen atau NIDN…" value="' + attr(s.dq) + '"></div></div></div>'
        : '<div class="card"><div class="card-h"><h3>' + ic('filter') + 'Bagian 2: Filter &amp; Rombel</h3><span class="sp"></span><span class="faint">' + list.length + ' dari ' + rombel.length + ' tampil</span></div><div class="card-b stack">' +
          '<div class="field"><label>Program Kelas</label><div class="row gap-s"><button class="chip ' + (!s.prog ? 'on' : '') + '" data-a="prog" data-v="">Semua <small>(' + rombel.length + ')</small></button>' + kls.map(k => '<button class="chip ' + (s.prog === k ? 'on' : '') + '" data-a="prog" data-v="' + attr(k) + '">' + esc(k) + ' <small>(' + rombel.filter(r => r.kelas === k).length + ')</small></button>').join('') + '</div></div>' +
          '<div class="field"><label>Filter Kelompok Mahasiswa</label>' + jkSeg(s.jk) + '</div></div></div>') + '</div>' +
      '<div class="alert info" style="margin:16px 0 0">' + ic('info') + '<div><b>Kotak tanda tangan berpasangan:</b> setiap kotak setinggi dua baris nama — kotak kiri untuk nomor ganjil (nomor di pojok kiri atas), kotak kanan untuk nomor genap (nomor di pojok kiri bawah). ' +
        (t.kosong ? 'Ditambah ' + t.kosong + ' baris kosong untuk peserta tambahan. ' : '') + 'Lebar kolom, tinggi baris, kop surat, dan catatan diatur lewat tombol <b>Tata Letak</b> di pratinjau.</div></div>' +
      (dsnMode
        ? '<div class="card" style="margin-top:16px"><div class="card-h"><label class="chk"><input type="checkbox" data-ch="semuaD" ' + (dl.length && nDl === dl.length ? 'checked' : '') + '> <b>Pilih semua dosen tampil</b></label><span class="sp"></span><span class="faint">' + nD + ' dipilih</span></div>' +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:36px"></th><th>Nama Dosen</th><th>NIDN</th><th>Mengajar</th></tr></thead><tbody>' +
          (dl.map(d => { const l = Dom.dosenBerjadwal(per).get(d.ID) || [], pola = [...new Set(l.map(u => u.pola))];
            return '<tr><td><input type="checkbox" style="width:17px;height:17px;accent-color:var(--primary)" data-ch="dpilih" data-v="' + attr(d.ID) + '" ' + (s.dpilih[d.ID] ? 'checked' : '') + '></td><td><div class="row" style="flex-wrap:nowrap"><div class="avatar">' + esc(inisial(d.Nama)) + '</div><b>' + esc(d.Nama) + '</b></div></td><td class="mono">' + esc(d.NIDN || '—') + '</td><td>' + (pola.map(p => '<span class="badge ' + (p === 'Hybrid' ? 'orange' : 'info') + '">' + p + '</span>').join(' ') || '<span class="faint">—</span>') + '</td></tr>'; }).join('') ||
            '<tr><td colspan="4">' + kosong('Tidak ada dosen pada filter ini.', 'users') + '</td></tr>') + '</tbody></table></div></div>'
        : '<div class="card" style="margin-top:16px"><div class="card-h"><label class="chk"><input type="checkbox" data-ch="semua" ' + (list.length && nPilih === list.length ? 'checked' : '') + '> <b>Pilih semua rombel terfilter</b></label><span class="sp"></span><span class="faint">' + nPilih + ' dipilih</span></div>' +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:36px"></th><th>Prodi</th><th>Semester &amp; Kelas</th><th>Program</th><th>Mahasiswa</th><th class="right">Aksi</th></tr></thead><tbody>' +
          (list.map(r => { const h = hit(r); return '<tr><td><input type="checkbox" style="width:17px;height:17px;accent-color:var(--primary)" data-ch="pilih" data-v="' + attr(r.key) + '" ' + (s.pilih[r.key] ? 'checked' : '') + '></td><td><b>' + dotProdi(r.prodi) + ' ' + esc(Dom.prodiNama(r.prodi)) + '</b></td><td>Semester ' + r.smt + ' · ' + esc(r.kelas) + '<div class="t-sub">Angkatan ' + esc(r.angkatan) + '</div></td><td>' + badgeKelas(r.kelas) + '</td>' +
            '<td><b>' + h.n + '</b> mahasiswa <span class="faint">(L:' + h.L + ' · P:' + h.P + ')</span></td><td class="right"><button class="btn btn-sm btn-soft" data-a="lihat" data-v="' + attr(r.key) + '">' + ic('eye', 'ic-sm') + 'Cetak Daftar Hadir</button></td></tr>'; }).join('') ||
            '<tr><td colspan="6">' + kosong('Tidak ada rombel mahasiswa aktif pada filter ini.', 'users') + '</td></tr>') + '</tbody></table></div></div>');
  },
  f() { const s = this.st; return { judul: s.judul, tanggal: s.tanggal, lokasi: s.lokasi, program: s.program.trim(), jk: s.jk }; },
  buka(keys) {
    const s = this.st, per = App.perAktif(), rbs = Dom.rombelMhs(per).filter(r => keys.includes(r.key));
    if (!s.tanggal) return toast('Isi Hari & Tanggal kegiatan.', 'err');
    const f = this.f();
    Cetak.buka({ judul: 'Pratinjau — Daftar Hadir', sub: (s.judul || 'Kegiatan') + ' · ' + rbs.length + ' kelas', periode: per, folder: 'Daftar Hadir', prefix: 'DH', jenis: 'DAFTAR_HADIR', orientasi: s.or, simpan: rbs.length === 1 ? 'per' : 'gabung', tata: 'DAFTAR_HADIR',
      namaFile: 'Daftar Hadir ' + (s.judul || 'Kegiatan').slice(0, 60) + ' (' + rbs.length + ' kelas) ' + s.tanggal,
      buat: (ctx) => rbs.map(rb => Doc.daftarHadir(rb, per, Object.assign({}, f, { orient: ctx.orient === 'auto' ? 'portrait' : ctx.orient }), ctx)), dok: { judul: 'Daftar Hadir: ' + (s.judul || 'Kegiatan'), ringkasan: { kegiatan: s.judul, tanggal: s.tanggal, jumlah: rbs.length + ' kelas' } } });
  },
  bukaDosen() {
    const s = this.st, per = App.perAktif(), ids = Dom.dosen().filter(d => s.dpilih[d.ID]).map(d => d.ID);
    if (!ids.length) return;
    if (!s.tanggal) return toast('Isi Hari & Tanggal kegiatan.', 'err');
    const f = Object.assign(this.f(), { peserta: 'dosen', dosenIds: ids, jk: '' });
    Cetak.buka({ judul: 'Pratinjau — Daftar Hadir Dosen', sub: (s.judul || 'Kegiatan') + ' · ' + ids.length + ' dosen', periode: per, folder: 'Daftar Hadir', prefix: 'DH', jenis: 'DAFTAR_HADIR', orientasi: s.or, simpan: 'per', tata: 'DAFTAR_HADIR',
      buat: (ctx) => [Doc.daftarHadir(null, per, Object.assign({}, f, { orient: ctx.orient === 'auto' ? 'portrait' : ctx.orient }), ctx)] });
  },
  acts: {
    or(b) { this.st.or = b.dataset.v; this.render(); }, jk(b) { this.st.jk = b.dataset.v; this.render(); }, prog(b) { this.st.prog = b.dataset.v; this.render(); },
    peserta(b) { this.st.peserta = b.dataset.v; this.render(); }, dpola(b) { this.st.dpola = b.dataset.v; this.render(); },
    lihat(b) { this.buka([b.dataset.v]); }, semua() { const ks = Object.keys(this.st.pilih).filter(k => this.st.pilih[k]); if (ks.length) this.buka(ks); },
    cetakDosen() { this.bukaDosen(); }
  },
  ch: {
    tanggal(t) { this.st.tanggal = t.value; this.render(); }, pilih(t) { this.st.pilih[t.dataset.v] = t.checked; this.render(); },
    semua(t) { Dom.rombelMhs(App.perAktif()).filter(r => !this.st.prog || r.kelas === this.st.prog).forEach(r => { this.st.pilih[r.key] = t.checked; }); this.render(); },
    dpilih(t) { this.st.dpilih[t.dataset.v] = t.checked; this.render(); },
    semuaD(t) { this.dosenList(App.perAktif()).forEach(d => { this.st.dpilih[d.ID] = t.checked; }); this.render(); }
  },
  inp: {
    judul(t) { this.st.judul = t.value; }, lokasi(t) { this.st.lokasi = t.value; }, program(t) { this.st.program = t.value; },
    dq: debounce(function (t) { this.st.dq = t.value; this.render(); const i = $('[data-in="dq"]', this.el); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250)
  }
});

/* =====================================================================
   CETAK KEHADIRAN DOSEN (v1.1) — rekap mingguan per pola jam, format Excel kampus
   ===================================================================== */
defPage('cetak-hadir-dosen', {
  deps: ['Jadwal', 'Realisasi', 'Kurikulum', 'Dosen', 'Kelas', 'Prodi', 'JamSesi', 'Pengaturan', 'Aset'], refreshTabel: ['Jadwal', 'Realisasi', 'Dosen'], pakaiPer: true,
  st: { pola: 'Reguler', kelas: {}, mulai: '', minggu: 1, judul: null, ttd: null, kotor: false },
  f() { const s = this.st; return { pola: s.pola, kelas: Object.keys(s.kelas).filter(k => s.kelas[k]), mulai: s.mulai, minggu: s.minggu }; },
  mulaiBawaan(per) {
    const rg = Dom.rentang(per) || {}, hariIni = isoTgl();
    const dalam = (!rg.mulai || hariIni >= rg.mulai) && (!rg.selesai || hariIni <= rg.selesai);
    return isoTgl(Doc.senin(dalam || !rg.mulai ? hariIni : rg.mulai));
  },
  render() {
    const s = this.st, per = App.perAktif();
    const head = kepala({ crumb: ['Cetak', 'Cetak Kehadiran Dosen'], judul: 'Cetak Kehadiran Dosen', desc: 'Daftar kehadiran mingguan dosen sesuai jadwal tersimpan: mata kuliah, total SKS, dan kotak kehadiran per hari. Satu lembar A4 landscape per pekan.',
      aksi: App.perToggle() + btnRefresh(false) + '<button class="btn" data-a="excel" ' + (Dom.adaJadwal(per) ? '' : 'disabled') + '>' + ic('sheet') + 'Simpan Excel</button><button class="btn btn-primary" data-a="cetak" ' + (Dom.adaJadwal(per) ? '' : 'disabled') + '>' + ic('printer') + 'Pratinjau &amp; Cetak</button>' });
    if (!Dom.adaJadwal(per)) { this.el.innerHTML = head + belumAdaJadwal(per); return; }
    if (!s.mulai) s.mulai = this.mulaiBawaan(per);
    const t = Tata.nilai('HADIR_DOSEN');
    if (s.judul === null) s.judul = t.judul || 'Daftar Kehadiran Dosen Tetap';
    if (!s.ttd) s.ttd = (Array.isArray(t.ttd) && t.ttd.length ? t.ttd : Tata.ttdHadirBawaan()).map(x => ({ jabatan: x.jabatan || '', nama: x.nama || '' }));
    const kelasPola = Dom.kelasTerjadwal().filter(k => s.pola === 'Semua' || k.Pola === s.pola);
    Object.keys(s.kelas).forEach(k => { if (!kelasPola.some(x => x.Nama === k)) delete s.kelas[k]; });
    const data = Doc.hadirData(per, this.f()), senin = Doc.senin(s.mulai), sabtu = new Date(senin.getTime() + 5 * 864e5), akhir = new Date(senin.getTime() + ((s.minggu - 1) * 7 + 5) * 864e5);
    const hari = s.pola === 'Hybrid' ? Dom.hariPola('Hybrid') : Doc.HADIR_HARI;
    const totSks = data.reduce((a, d) => a + d.total, 0), nKls = Object.values(s.kelas).filter(Boolean).length;
    this.el.innerHTML = head +
      '<div class="kpis">' + kpi({ lb: 'Dosen Tercantum', vl: data.length + '<small>dosen</small>', ic: 'usercheck' }) + kpi({ lb: 'Total SKS / Pekan', vl: totSks + '<small>SKS</small>', ic: 'clock' }) +
      kpi({ lb: 'Jumlah Lembar', vl: s.minggu + '<small>pekan · A4 landscape</small>', ic: 'filetext' }) + kpi({ lb: 'Rentang', vl: '<span style="font-size:15px">' + esc(fmtTgl(senin)) + '</span>', ic: 'cal', ft: 's.d. ' + esc(fmtHariTgl(akhir)) }) + '</div>' +
      '<div class="grid2"><div class="card"><div class="card-h"><h3>' + ic('filter') + 'Parameter</h3></div><div class="card-b stack">' +
      '<div class="field"><label>Pola jam</label><div class="seg">' + [['Reguler', 'Reguler (+ Ma\'had Aly)'], ['Hybrid', 'Hybrid'], ['Semua', 'Semua']].map(x => '<button data-a="pola" data-v="' + x[0] + '" class="' + (s.pola === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>' +
        '<span class="help">' + (s.pola === 'Reguler' ? 'Kelas Reguler, Ma\'had Aly Ikhwan & Akhwat (Senin – Sabtu).' : s.pola === 'Hybrid' ? 'Kelas Hybrid (Jumat & Sabtu).' : 'Seluruh kelas terjadwal.') + '</span></div>' +
      '<div class="field"><label>Kelas <small class="faint">(kosong = semua kelas pola ini)</small></label><div class="row gap-s">' + kelasPola.map(k => '<button class="chip ' + (s.kelas[k.Nama] ? 'on' : '') + '" data-a="kelas" data-v="' + attr(k.Nama) + '">' + esc(k.Nama) + '</button>').join('') + '</div></div>' +
      '<div class="fgrid c2"><div class="field"><label>Pekan mulai (Senin)</label><input type="date" class="input" data-ch="mulai" value="' + attr(s.mulai) + '"><span class="help">' + esc(fmtHariTgl(senin) + ' – ' + fmtHariTgl(sabtu)) + '</span></div>' +
      '<div class="field"><label>Jumlah pekan</label><input type="number" min="1" max="20" class="input" data-ch="minggu" value="' + s.minggu + '"><span class="help">1 lembar per pekan (maks. 20)</span></div></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('edit') + 'Judul &amp; Penanda Tangan</h3><span class="sp"></span>' + (s.kotor ? '<button class="btn btn-sm btn-primary" data-a="simpanBawaan">' + ic('save', 'ic-sm') + 'Jadikan bawaan</button>' : '<span class="faint">tersimpan</span>') + '</div><div class="card-b stack">' +
      '<div class="field"><label>Judul dokumen</label><input class="input" data-in="judul" maxlength="120" value="' + attr(s.judul) + '"><span class="help">Dicetak: “' + esc(s.judul) + ' Semester ' + esc(Dom.perObj(per).smt) + ' Tahun Akademik ' + esc(Dom.perObj(per).ta) + '”</span></div>' +
      s.ttd.map((x, i) => '<div class="row" style="flex-wrap:nowrap;gap:8px"><input class="input" data-in="ttdJ" data-i="' + i + '" value="' + attr(x.jabatan) + '" placeholder="Jabatan"><input class="input" data-in="ttdN" data-i="' + i + '" value="' + attr(x.nama) + '" placeholder="Nama (kosong = titik-titik)"><button class="btn btn-icon btn-ghost" data-a="hapusTtd" data-i="' + i + '" title="Hapus">' + ic('trash', 'ic-sm') + '</button></div>').join('') +
      (s.ttd.length < 4 ? '<div><button class="btn btn-sm" data-a="tambahTtd">' + ic('plus', 'ic-sm') + 'Tambah penanda tangan</button></div>' : '') + '</div></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-h"><h3>' + ic('users') + 'Ringkasan Kehadiran per Pekan</h3><span class="sp"></span><span class="faint">' + data.length + ' dosen' + (nKls ? ' · ' + nKls + ' kelas dipilih' : '') + '</span></div>' +
      '<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th class="num">No</th><th>Nama</th><th>Prodi</th><th>SKS</th><th>Mata Kuliah</th>' + hari.map(h => '<th class="center">' + h + '</th>').join('') + '</tr></thead><tbody>' +
      (data.map((d, i) => '<tr><td class="num">' + (i + 1) + '</td><td><b>' + esc(d.nama) + '</b></td><td>' + esc(d.prodi.join(', ')) + '</td><td><b>' + d.total + '</b></td><td class="t-sub" style="max-width:320px">' + esc(d.mk.join(', ')) + '</td>' +
        hari.map(h => '<td class="center">' + (d.hari[h] ? '<span class="badge info sq">' + d.hari[h] + '</span>' : '<span class="faint">·</span>') + '</td>').join('') + '</tr>').join('') ||
        '<tr><td colspan="' + (5 + hari.length) + '">' + kosong('Tidak ada dosen berjadwal pada pilihan ini.', 'users') + '</td></tr>') + '</tbody></table></div></div>';
  },
  ubahTata() { return { judul: this.st.judul, ttd: this.st.ttd.map(x => ({ jabatan: x.jabatan, nama: x.nama })) }; },
  buka() {
    const s = this.st, per = App.perAktif(), f = this.f();
    Cetak.buka({ judul: 'Pratinjau — Kehadiran Dosen', sub: (s.pola === 'Semua' ? 'Semua kelas' : 'Pola ' + s.pola) + ' · ' + s.minggu + ' pekan · ' + Dom.perLabel(per), periode: per, folder: 'Kehadiran Dosen', prefix: 'HDS', jenis: 'HADIR_DOSEN',
      orientasi: 'landscape', bisaOrientasi: false, simpan: 'per', tata: 'HADIR_DOSEN', tataUbah: this.ubahTata(),
      buat: (ctx) => [Doc.hadirDosen(per, f, ctx)] });
  },
  async excel() {
    const s = this.st, per = App.perAktif(), p = Dom.perObj(per), t = Tata.nilai('HADIR_DOSEN', this.ubahTata()), f = this.f(), data = Doc.hadirData(per, f);
    const hari = s.pola === 'Hybrid' ? Dom.hariPola('Hybrid') : Doc.HADIR_HARI.filter(h => h !== 'Sabtu' || num(t.selSabtu, 4) > 0 || data.some(d => d.hari.Sabtu));
    const sel = {}; hari.forEach(h => { sel[h] = Math.max(1, h === 'Sabtu' && s.pola !== 'Hybrid' ? num(t.selSabtu, 4) : num(t.sel, 6), ...data.map(d => d.hari[h] || 0)); });
    const nSel = hari.reduce((a, h) => a + sel[h], 0), lebarKol = 5 + nSel + 2;
    const sheets = Array.from({ length: Math.max(1, Math.min(20, s.minggu)) }, (_, m) => {
      const s0 = new Date(Doc.senin(s.mulai).getTime() + m * 7 * 864e5), tg = (h) => new Date(s0.getTime() + Doc.HADIR_HARI.indexOf(h) * 864e5);
      const rows = [[Doc.kampus()], [s.judul + ' Semester ' + p.smt + ' Tahun Akademik ' + p.ta], [fmtHariTgl(tg(hari[0])) + ' - ' + fmtHariTgl(tg(hari[hari.length - 1]))], []];
      const hd = ['No', 'Nama', 'Prodi', 'Sks', 'Mata kuliah']; hari.forEach(h => { hd.push(h); for (let i = 1; i < sel[h]; i++) hd.push(''); }); hd.push('Total', 'ket'); rows.push(hd);
      data.forEach((d, i) => { const r = [i + 1, d.nama, d.prodi.join(','), d.total, d.mk.join(', ')]; hari.forEach(h => { for (let k = 0; k < sel[h]; k++) r.push(t.centang && k < (d.hari[h] || 0) ? '✓' : ''); }); r.push(d.total, ''); rows.push(r); });
      rows.push([]); rows.push(s.ttd.map(x => x.jabatan)); rows.push([]); rows.push([]); rows.push(s.ttd.map(x => x.nama || '……………………'));
      const merge = [0, 1, 2].map(r => ({ s: { r, c: 0 }, e: { r, c: lebarKol - 1 } })); let c = 5; hari.forEach(h => { if (sel[h] > 1) merge.push({ s: { r: 4, c }, e: { r: 4, c: c + sel[h] - 1 } }); c += sel[h]; });
      return { nama: 'Pekan ' + (m + 1) + ' ' + isoTgl(s0).slice(5), rows, merge, lebar: [4, 34, 14, 5, 40].concat(Array.from({ length: nSel }, () => 3)).concat([6, 6]) };
    });
    await Excel.tulis('Kehadiran Dosen ' + (s.pola === 'Semua' ? 'Semua' : s.pola) + ' ' + Dom.perLabel(per).replace('/', '-'), sheets);
  },
  acts: {
    pola(b) { this.st.pola = b.dataset.v; this.render(); },
    kelas(b) { const k = b.dataset.v; this.st.kelas[k] = !this.st.kelas[k]; this.render(); },
    tambahTtd() { this.st.ttd.push({ jabatan: '', nama: '' }); this.st.kotor = true; this.render(); },
    hapusTtd(b) { this.st.ttd.splice(+b.dataset.i, 1); this.st.kotor = true; this.render(); },
    async simpanBawaan(b) {
      const nilai = Object.assign({}, (Dom.setJson('TATA_CETAK', {}) || {}).HADIR_DOSEN || {}, this.ubahTata());
      const r = await denganSibuk(b, 'Menyimpan…', () => api('cetak.tata', { jenis: 'HADIR_DOSEN', nilai }));
      if (r.success) { this.st.kotor = false; toast(r.message); this.render(); }
    },
    cetak() { this.buka(); },
    excel(b) { denganSibuk(b, 'Menyusun…', () => this.excel()); }
  },
  ch: {
    mulai(t) { this.st.mulai = t.value ? isoTgl(Doc.senin(t.value)) : ''; this.render(); },
    minggu(t) { this.st.minggu = Math.max(1, Math.min(20, Math.round(num(t.value, 1)))); this.render(); }
  },
  inp: {
    judul(t) { this.st.judul = t.value; this.st.kotor = true; if (!$('[data-a="simpanBawaan"]', this.el)) this.tandaiKotor(); },
    ttdJ(t) { this.st.ttd[+t.dataset.i].jabatan = t.value; this.st.kotor = true; if (!$('[data-a="simpanBawaan"]', this.el)) this.tandaiKotor(); },
    ttdN(t) { this.st.ttd[+t.dataset.i].nama = t.value; this.st.kotor = true; if (!$('[data-a="simpanBawaan"]', this.el)) this.tandaiKotor(); }
  },
  tandaiKotor() { const sp = $$('.card-h .faint', this.el).find(x => x.textContent === 'tersimpan'); if (sp) sp.outerHTML = '<button class="btn btn-sm btn-primary" data-a="simpanBawaan">' + ic('save', 'ic-sm') + 'Jadikan bawaan</button>'; }
});

/* =====================================================================
   CETAK ABSENSI PENERIMA KITAB
   ===================================================================== */
defPage('cetak-kitab', {
  deps: ['Mahasiswa', 'Kitab', 'Aset', 'Pengaturan'], refreshTabel: ['Mahasiswa', 'Kitab'], pakaiPer: true,
  st: { rb: '', tanggal: '', lokasi: '', or: 'auto', kitab: [] },
  render() {
    const s = this.st, per = App.perAktif(), rombel = Dom.rombelMhs(per);
    if (!s.tanggal) s.tanggal = isoTgl();
    if (!s.rb || !rombel.find(r => r.key === s.rb)) s.rb = rombel[0] ? rombel[0].key : '';
    const rb = rombel.find(r => r.key === s.rb), kitabDb = DB.rows('Kitab').map(k => k.Nama);
    this.el.innerHTML = kepala({ crumb: ['Cetak', 'Cetak Absensi Penerima Kitab'], judul: 'Cetak Absensi Penerima Kitab', desc: 'Lembar serah terima beberapa kitab sekaligus untuk satu kelas. Nama kitab berhuruf Arab ditulis kanan ke kiri.', aksi: App.perToggle() + btnRefresh(false) }) +
      '<div class="grid2"><div class="card"><div class="card-h"><h3>' + ic('bookmark') + 'Isian Penyerahan</h3></div><div class="card-b stack">' +
      '<div class="field"><label>Pilih Kelas (Prodi · Semester · Kelas)</label><select class="input" data-ch="rb">' + opsi(rombel.map(r => ({ v: r.key, l: Dom.rombelLabel(r.prodi, r.angkatan, r.kelas, per, true) + ' — ' + r.n + ' mhs' })), s.rb) + '</select></div>' +
      '<div class="fgrid c2"><div class="field"><label>Tanggal Penyerahan</label><input type="date" class="input" data-ch="tanggal" value="' + attr(s.tanggal) + '"><span class="help">' + esc(fmtHariTgl(s.tanggal)) + '</span></div><div class="field"><label>Lokasi / Ruang</label><input class="input" data-in="lokasi" value="' + attr(s.lokasi) + '" placeholder="mis. Perpustakaan Lt. 2"></div></div>' +
      '<div class="field"><label>Orientasi</label>' + orientSeg(s.or) + '<span class="help">Otomatis memilih landscape bila kitab 4 atau lebih.</span></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('book') + 'Pilih Kitab</h3><span class="sp"></span><span class="badge">' + s.kitab.length + ' kitab dipilih</span></div><div class="card-b stack">' +
      '<div class="row" style="flex-wrap:nowrap"><input class="input" id="kt-in" list="kt-list" placeholder="Ketik atau pilih nama kitab…" dir="auto"><datalist id="kt-list">' + kitabDb.map(k => '<option value="' + attr(k) + '">').join('') + '</datalist><button class="btn btn-primary" data-a="tambah">' + ic('plus') + 'Tambah</button></div>' +
      '<div class="row gap-s">' + (s.kitab.map((k, i) => '<span class="chip on" style="height:auto;padding:5px 10px"><span class="' + (Dom.adaArab(k) ? 'arab' : '') + '" style="font-size:' + (Dom.adaArab(k) ? '15px' : '13px') + '">' + esc(k) + '</span><button class="x" data-a="hapus" data-i="' + i + '" title="Hapus">' + ic('x', 'ic-sm') + '</button></span>').join('') || '<span class="faint">Belum ada kitab dipilih. Kitab baru yang diketik akan ditambahkan ke daftar kitab.</span>') + '</div>' +
      '<div class="lbl">Daftar kitab tersimpan:</div><div class="row gap-s">' + kitabDb.slice(0, 30).map(k => '<button class="chip" data-a="pilihK" data-v="' + attr(k) + '"><span class="' + (Dom.adaArab(k) ? 'arab' : '') + '">' + esc(k) + '</span></button>').join('') + '</div></div></div></div>' +
      '<div class="card card-b" style="margin-top:16px"><div class="row">' + (rb ? '<div><b>' + esc(Dom.rombelLabel(rb.prodi, rb.angkatan, rb.kelas, per, true)) + '</b><div class="muted">' + rb.n + ' mahasiswa aktif (L ' + rb.L + ' · P ' + rb.P + ') · ' + s.kitab.length + ' kolom tanda tangan</div></div>' : '<span class="faint">Belum ada kelas dengan mahasiswa aktif.</span>') +
      '<span class="sp"></span><button class="btn btn-accent" data-a="cetak" ' + (rb && s.kitab.length ? '' : 'disabled') + '>' + ic('printer') + 'Pratinjau &amp; Cetak</button></div></div>';
  },
  async tambahKitab(nama) {
    nama = String(nama || '').trim(); if (!nama) return;
    if (!this.st.kitab.includes(nama)) this.st.kitab.push(nama);
    this.render();
    if (!DB.rows('Kitab').some(k => k.Nama === nama)) { const r = await api('kitab.tambah', { nama }, { silent: true }); if (r.success) toast(r.message); }
  },
  acts: {
    or(b) { this.st.or = b.dataset.v; this.render(); },
    tambah() { this.tambahKitab($('#kt-in', this.el).value); },
    pilihK(b) { this.tambahKitab(b.dataset.v); },
    hapus(b) { this.st.kitab.splice(+b.dataset.i, 1); this.render(); },
    cetak() {
      const s = this.st, per = App.perAktif(), rb = Dom.rombelMhs(per).find(r => r.key === s.rb); if (!rb) return;
      Cetak.buka({ judul: 'Pratinjau — Absensi Penerima Kitab', sub: Dom.rombelLabel(rb.prodi, rb.angkatan, rb.kelas, per, true) + ' · ' + s.kitab.length + ' kitab', periode: per, folder: 'Penerima Kitab', prefix: 'KTB', jenis: 'PENERIMA_KITAB', orientasi: s.or, simpan: 'per', tata: 'PENERIMA_KITAB',
        buat: (ctx) => [Doc.kitab(rb, per, { tanggal: s.tanggal, lokasi: s.lokasi, kitab: s.kitab, orient: ctx.orient }, ctx)] });
    }
  },
  ch: { rb(t) { this.st.rb = t.value; this.render(); }, tanggal(t) { this.st.tanggal = t.value; this.render(); } },
  inp: { lokasi(t) { this.st.lokasi = t.value; } },
  init() { this.el.addEventListener('keydown', e => { if (e.target.id === 'kt-in' && e.key === 'Enter') { e.preventDefault(); this.tambahKitab(e.target.value); } }); }
});

/* =====================================================================
   CETAK PENILAIAN TAHFIDZ (v1.2) — satu lembar per prodi · angkatan,
   filter jenis kelamin & tahun angkatan (boleh beberapa sekaligus)
   ===================================================================== */
const TAHFIDZ_PUTRI = /\b(ustadzah|ustazah|ustdzh|ustzh|ummi|ummu|ibu|hajjah|nyai)\b/i;
defPage('cetak-tahfidz', {
  deps: ['Mahasiswa', 'Kelas', 'Prodi', 'Dosen', 'Realisasi', 'Kurikulum', 'Angkatan', 'Aset', 'Pengaturan'], refreshTabel: ['Mahasiswa', 'Realisasi', 'Dosen'], pakaiPer: true,
  st: { jk: '', ang: null, prodi: null, kelas: null, ujian: 'UTS', pilih: {}, dosen: {}, isi: null, kotor: false },
  /** Nilai isian lembar (judul MK, komponen, PJ) — dari bawaan tersimpan sampai diubah di layar. */
  isi() {
    if (!this.st.isi) {
      const t = Tata.nilai('NILAI_TAHFIDZ');
      this.st.isi = { judulMK: t.judulMK || 'Tahfidz Al Quran', labelTotal: t.labelTotal || 'مجموع', komponen: Tata.komponenTahfidz(t).map(k => ({ label: k.label, bobot: num(k.bobot, 0) })), pj: Object.assign({ jabatan: 'PJ Alquran', nama: 'Dr. Yaser Sharaf, MA' }, t.pj || {}) };
    }
    return this.st.isi;
  },
  ubahTata() { const x = this.isi(); return { judulMK: x.judulMK, labelTotal: x.labelTotal, komponen: x.komponen.map(k => ({ label: k.label, bobot: num(k.bobot, 0) })), pj: { jabatan: x.pj.jabatan, nama: x.pj.nama } }; },
  angPilih() { const a = Dom.angkatanAktif(); return this.st.ang ? a.filter(th => this.st.ang[th]) : a; },
  prodiPilih() { const p = Dom.prodi(); return this.st.prodi ? p.filter(x => this.st.prodi[x.Kode]) : p; },
  kelasOk(k) { return this.st.kelas ? !!this.st.kelas[k] : Dom.kelasPola(k) !== 'Tidak dijadwalkan'; },
  /** Calon dosen pengampu dari MK Tahfidz di Realisasi (urut terbanyak), lalu tebakan sesuai jenis kelamin peserta. */
  dosenAuto(per, prodi, th, kelasSet) {
    const n = new Map();
    Dom.units(per).forEach(u => { if (!u.tahfidz || u.prodi !== prodi || String(u.angkatan) !== String(th) || !kelasSet.has(u.kelas)) return; u.dosen.forEach(id => n.set(id, (n.get(id) || 0) + 1)); });
    const list = [...n.keys()].sort((a, b) => n.get(b) - n.get(a)), nm = (id) => Dom.dosenNama(id);
    if (!list.length) return { ids: [], teks: '' };
    if (this.st.jk === 'P') { const f = list.filter(id => TAHFIDZ_PUTRI.test(nm(id))); return { ids: list, teks: nm(f[0] || list[0]) }; }
    if (this.st.jk === 'L') { const m = list.filter(id => !TAHFIDZ_PUTRI.test(nm(id))); return { ids: list, teks: nm(m[0] || list[0]) }; }
    return { ids: list, teks: list.map(nm).join(' / ') };
  },
  lembar(per) {
    const s = this.st, ang = this.angPilih(), out = [];
    this.prodiPilih().forEach(p => ang.forEach(th => {
      const mhs = Dom.mhsAktif().filter(m => m.Cocok === 'YA' && m.Prodi === p.Kode && m.Angkatan === String(th) && this.kelasOk(m.Kelas) && (!s.jk || m.JK === s.jk)).sort((a, b) => norm(a.Nama).localeCompare(norm(b.Nama)));
      if (!mhs.length) return;
      const key = p.Kode + '|' + th, kelasSet = new Set(mhs.map(m => m.Kelas)), auto = this.dosenAuto(per, p.Kode, th, kelasSet), pilih = s.dosen[key];
      out.push({ key, prodi: p.Kode, angkatan: String(th), smt: Dom.semMhs(th, per), mhs, kelas: [...kelasSet], auto, dosenId: pilih || '', dosen: pilih ? Dom.dosenNama(pilih) : auto.teks });
    }));
    return out;
  },
  render() {
    const s = this.st, per = App.perAktif(), x = this.isi(), list = this.lembar(per), terpilih = list.filter(l => s.pilih[l.key] !== false);
    const aktif = Dom.angkatanAktif(), angSel = new Set(this.angPilih()), prSel = new Set(this.prodiPilih().map(p => p.Kode));
    const kelasMhs = [...new Set(Dom.mhsAktif().map(m => m.Kelas).filter(Boolean))].sort((a, b) => num(Dom.kelasObj(a).Urutan, 99) - num(Dom.kelasObj(b).Urutan, 99));
    const total = x.komponen.reduce((a, k) => a + num(k.bobot, 0), 0), dsn = Dom.dosen();
    this.el.innerHTML = kepala({ crumb: ['Cetak', 'Cetak Penilaian Tahfidz'], judul: 'Cetak Penilaian Tahfidz', desc: 'Lembar nilai ujian Tahfidz Al-Qur\'an satu lembar A4 per program studi · angkatan (semester). Saring menurut jenis kelamin dan tahun angkatan yang ingin dicetak.',
        aksi: App.perToggle() + btnRefresh(false) + '<button class="btn" data-a="excel" ' + (terpilih.length ? '' : 'disabled') + '>' + ic('sheet') + 'Simpan Excel</button><button class="btn btn-primary" data-a="cetak" ' + (terpilih.length ? '' : 'disabled') + '>' + ic('printer') + 'Cetak ' + terpilih.length + ' Lembar Terpilih</button>' }) +
      '<div class="kpis">' + kpi({ lb: 'Lembar Nilai', vl: terpilih.length + '<small>dari ' + list.length + ' lembar</small>', ic: 'filetext', ft: '1 lembar = 1 prodi · 1 angkatan' }) + kpi({ lb: 'Peserta', vl: terpilih.reduce((a, l) => a + l.mhs.length, 0) + '<small>' + (s.jk === 'L' ? 'mahasiswa' : s.jk === 'P' ? 'mahasiswi' : 'mahasiswa/i') + '</small>', ic: 'users' }) +
        kpi({ lb: 'Ujian', vl: s.ujian + '<small>' + esc(Dom.perLabel(per)) + '</small>', ic: 'clipboard' }) + kpi({ lb: 'Bobot Total', vl: (Math.round(total * 100) / 100) + '<small>' + x.komponen.length + ' komponen</small>', ic: 'award', cls: Math.abs(total - 100) < 0.001 ? 'ok' : 'orange', ft: Math.abs(total - 100) < 0.001 ? 'Sesuai 100' : 'Periksa: jumlah bobot bukan 100' }) + '</div>' +
      '<div class="grid2"><div class="card"><div class="card-h"><h3>' + ic('filter') + 'Filter Peserta</h3><span class="sp"></span><button class="link-btn" data-a="resetF">Reset</button></div><div class="card-b stack">' +
        '<div class="field"><label>Jenis kelamin</label>' + jkSeg(s.jk) + '</div>' +
        '<div class="field"><label>Tahun angkatan <span class="faint">(pilih satu atau beberapa)</span></label><div class="row gap-s">' + aktif.map(th => '<button class="chip ' + (angSel.has(th) ? 'on' : '') + '" data-a="ang" data-v="' + th + '">' + (angSel.has(th) ? ic('check', 'ic-sm') : '') + 'Angkatan ' + th + ' <small>(Smt ' + Dom.semMhs(th, per) + ')</small></button>').join('') + '</div></div>' +
        '<div class="field"><label>Program studi</label><div class="row gap-s">' + Dom.prodi().map(p => '<button class="chip ' + (prSel.has(p.Kode) ? 'on' : '') + '" data-a="prodiT" data-v="' + attr(p.Kode) + '">' + dotProdi(p.Kode) + ' ' + esc(p.Kode) + '</button>').join('') + '</div></div>' +
        '<div class="field"><label>Program kelas <span class="faint">(bawaan: semua kelas terjadwal)</span></label><div class="row gap-s">' + kelasMhs.map(k => '<button class="chip ' + (this.kelasOk(k) ? 'on' : '') + '" data-a="kelasT" data-v="' + attr(k) + '">' + esc(k) + '</button>').join('') + '</div></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('edit') + 'Isi Lembar Nilai</h3><span class="sp"></span>' + (s.kotor ? '<button class="btn btn-sm btn-primary" data-a="simpanBawaan">' + ic('save', 'ic-sm') + 'Jadikan bawaan</button>' : '<span class="faint" id="nt-status">tersimpan</span>') + '</div><div class="card-b stack">' +
        '<div class="fgrid c2"><div class="field"><label>Jenis ujian</label><div class="seg">' + [['UTS', 'UTS (Tengah Semester)'], ['UAS', 'UAS (Akhir Semester)']].map(u => '<button data-a="ujian" data-v="' + u[0] + '" class="' + (s.ujian === u[0] ? 'on' : '') + '">' + u[1] + '</button>').join('') + '</div></div>' +
        '<div class="field"><label>Nama mata kuliah</label><input class="input" data-in="isi" data-f="judulMK" maxlength="80" value="' + attr(x.judulMK) + '"></div></div>' +
        '<div class="field"><label>Komponen nilai &amp; bobot</label><div class="nt-komp">' + x.komponen.map((k, i) => '<div class="row" style="flex-wrap:nowrap;gap:8px"><input class="input nt-lbl" dir="auto" data-in="komp" data-f="label" data-i="' + i + '" value="' + attr(k.label) + '" maxlength="40" placeholder="Nama komponen"><input class="input" type="number" min="0" max="100" step="0.5" style="width:96px" data-in="komp" data-f="bobot" data-i="' + i + '" value="' + attr(k.bobot) + '"><button class="btn btn-icon btn-ghost" data-a="hapusKomp" data-i="' + i + '" title="Hapus" ' + (x.komponen.length > 1 ? '' : 'disabled') + '>' + ic('trash', 'ic-sm') + '</button></div>').join('') +
          '<div class="row" style="flex-wrap:nowrap;gap:8px"><input class="input nt-lbl" dir="auto" data-in="isi" data-f="labelTotal" value="' + attr(x.labelTotal) + '" maxlength="30" title="Judul kolom jumlah"><div class="input mono" style="width:96px;background:var(--surface-2)" id="nt-total">' + (Math.round(total * 100) / 100) + '</div><span style="width:36px"></span></div></div>' +
          (x.komponen.length < 6 ? '<div style="margin-top:6px"><button class="btn btn-sm" data-a="tambahKomp">' + ic('plus', 'ic-sm') + 'Tambah komponen</button></div>' : '') + '</div>' +
        '<div class="fgrid c2"><div class="field"><label>Jabatan penanda tangan kanan</label><input class="input" data-in="pj" data-f="jabatan" maxlength="60" value="' + attr(x.pj.jabatan) + '"></div><div class="field"><label>Nama penanda tangan kanan</label><input class="input" data-in="pj" data-f="nama" maxlength="80" value="' + attr(x.pj.nama) + '"></div></div></div></div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-h"><label class="chk"><input type="checkbox" data-ch="semua" ' + (list.length && terpilih.length === list.length ? 'checked' : '') + '> <b>Pilih semua lembar</b></label><span class="sp"></span><span class="faint">' + terpilih.length + ' dari ' + list.length + ' lembar dipilih</span></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:36px"></th><th>Program Studi</th><th>Angkatan · Semester</th><th>Kelas</th><th>Peserta</th><th>Dosen Pengampu</th><th class="right">Aksi</th></tr></thead><tbody>' +
        (list.map(l => { const L = l.mhs.filter(m => m.JK === 'L').length, P = l.mhs.filter(m => m.JK === 'P').length;
          return '<tr><td><input type="checkbox" style="width:17px;height:17px;accent-color:var(--primary)" data-ch="pilih" data-v="' + attr(l.key) + '" ' + (s.pilih[l.key] !== false ? 'checked' : '') + '></td><td><b>' + dotProdi(l.prodi) + ' ' + esc(Dom.prodiNama(l.prodi)) + '</b></td><td>Angkatan ' + esc(l.angkatan) + ' · <b>Semester ' + l.smt + '</b></td><td>' + l.kelas.map(badgeKelas).join(' ') + '</td>' +
            '<td><b>' + l.mhs.length + '</b> <span class="faint">(L:' + L + ' · P:' + P + ')</span></td>' +
            '<td style="min-width:230px"><select class="input sm" data-ch="dosen" data-v="' + attr(l.key) + '"><option value="">' + esc(l.auto.teks ? 'Otomatis: ' + l.auto.teks : '— pilih dosen —') + '</option>' + opsi(dsn.map(d => ({ v: d.ID, l: d.Nama })), l.dosenId) + '</select>' + (!l.auto.ids.length ? '<div class="t-sub">MK Tahfidz belum ada di Realisasi ' + esc(Dom.perLabel(per)) + '</div>' : '') + '</td>' +
            '<td class="right"><button class="btn btn-sm btn-soft" data-a="lihat" data-v="' + attr(l.key) + '">' + ic('eye', 'ic-sm') + 'Pratinjau &amp; Cetak</button></td></tr>'; }).join('') ||
          '<tr><td colspan="7">' + kosong('Tidak ada mahasiswa aktif pada filter ini. Pilih jenis kelamin, angkatan, atau prodi lain.', 'users') + '</td></tr>') + '</tbody></table></div></div>' +
      '<div class="alert info side" style="margin-top:16px">' + ic('info') + '<div>Lembar memuat judul ujian, tahun akademik, prodi &amp; semester, nama mata kuliah, dosen pengampu, tabel nilai per komponen (huruf Arab didukung) beserta bobotnya, dan tanda tangan Dosen Pengampu &amp; ' + esc(x.pj.jabatan || 'PJ Alquran') + '. Dosen pengampu diambil otomatis dari MK Tahfidz di Realisasi Kurikulum (disesuaikan jenis kelamin peserta) dan dapat diganti per lembar. Lebar kolom, tinggi baris, baris kosong, dan kop diatur lewat tombol <b>Tata Letak</b> di pratinjau.</div></div>';
  },
  buka(keys) {
    const s = this.st, per = App.perAktif(), l = this.lembar(per).filter(x => keys.includes(x.key));
    if (!l.length) return;
    const jkT = s.jk === 'L' ? ' Laki-laki' : s.jk === 'P' ? ' Perempuan' : '';
    Cetak.buka({ judul: 'Pratinjau — Penilaian Tahfidz ' + s.ujian, sub: l.length + ' lembar' + jkT + ' · ' + Dom.perLabel(per), periode: per, folder: 'Penilaian Tahfidz', prefix: 'NTH', jenis: 'NILAI_TAHFIDZ', orientasi: 'portrait',
      simpan: l.length === 1 ? 'per' : 'gabung', tata: 'NILAI_TAHFIDZ', tataUbah: this.ubahTata(),
      namaFile: 'Nilai ' + s.ujian + ' Tahfidz' + jkT + ' (' + l.length + ' lembar) — ' + Dom.perLabel(per).replace('/', '-'),
      dok: { judul: 'Nilai ' + s.ujian + ' Tahfidz' + jkT + ' — ' + l.length + ' lembar', ringkasan: { jumlah: l.length + ' lembar', peserta: l.reduce((a, x) => a + x.mhs.length, 0) + ' mahasiswa' + jkT } },
      buat: (ctx) => l.map(x => Doc.nilaiTahfidz(x, per, { ujian: s.ujian, jk: s.jk, orient: ctx.orient }, ctx)) });
  },
  async excel(btn) {
    const s = this.st, per = App.perAktif(), p = Dom.perObj(per), l = this.lembar(per).filter(x => s.pilih[x.key] !== false), x = this.isi();
    if (!l.length) return;
    const komp = x.komponen.filter(k => String(k.label || '').trim()), nK = komp.length + 1, tot = komp.reduce((a, k) => a + num(k.bobot, 0), 0), kol = (n) => XLSX.utils.encode_col(n);
    await denganSibuk(btn, 'Menyusun…', async () => {
      await Lib.xlsx();
      const sheets = l.map(lb => {
        const rows = [['NILAI ' + (s.ujian === 'UAS' ? 'UJIAN AKHIR SEMESTER' : 'UJIAN TENGAH SEMESTER') + ' ' + p.smt.toUpperCase()], ['TAHUN AKADEMIK ' + p.ta], ['PRODI ' + Dom.prodiNama(lb.prodi).toUpperCase() + ' SEMESTER ' + lb.smt], ['MATA KULIAH ' + String(x.judulMK || '').toUpperCase()], [],
          ['DOSEN PENGAMPU : ' + (lb.dosen || '')], ['No', 'Nama Mahasiswa', s.ujian].concat(Array.from({ length: nK - 1 }, () => '')), ['', ''].concat(komp.map(k => k.label)).concat([x.labelTotal]), ['', ''].concat(komp.map(k => num(k.bobot, 0))).concat([tot])];
        const r0 = rows.length;
        lb.mhs.forEach((m, i) => { const r = r0 + i + 1; rows.push([i + 1, m.Nama].concat(komp.map(() => '')).concat([{ t: 'n', f: 'IF(COUNT(' + kol(2) + r + ':' + kol(1 + komp.length) + r + ')=0,"",SUM(' + kol(2) + r + ':' + kol(1 + komp.length) + r + '))' }])); });
        rows.push([], ['Dosen Pengampu,', '', x.pj.jabatan + ','], [], [], [lb.dosen || '', '', x.pj.nama || '']);
        const merge = [0, 1, 2, 3, 5].map(r => ({ s: { r, c: 0 }, e: { r, c: 1 + nK } })).concat([{ s: { r: 6, c: 0 }, e: { r: 8, c: 0 } }, { s: { r: 6, c: 1 }, e: { r: 8, c: 1 } }, { s: { r: 6, c: 2 }, e: { r: 6, c: 1 + nK } }]);
        return { nama: lb.prodi + ' Smt ' + lb.smt + ' ' + lb.angkatan, rows, merge, lebar: [5, 38].concat(Array.from({ length: nK }, () => 14)) };
      });
      await Excel.tulis('Nilai ' + s.ujian + ' Tahfidz' + (s.jk === 'L' ? ' Laki-laki' : s.jk === 'P' ? ' Perempuan' : '') + ' — ' + Dom.perLabel(per).replace('/', '-'), sheets);
    });
  },
  tandaiKotor() { this.st.kotor = true; const sp = $('#nt-status', this.el); if (sp) sp.outerHTML = '<button class="btn btn-sm btn-primary" data-a="simpanBawaan">' + ic('save', 'ic-sm') + 'Jadikan bawaan</button>'; },
  acts: {
    jk(b) { this.st.jk = b.dataset.v; this.render(); },
    ang(b) { const s = this.st, th = b.dataset.v; if (!s.ang) { s.ang = {}; Dom.angkatanAktif().forEach(a => { s.ang[a] = true; }); } s.ang[th] = !s.ang[th]; this.render(); },
    prodiT(b) { const s = this.st, k = b.dataset.v; if (!s.prodi) { s.prodi = {}; Dom.prodi().forEach(p => { s.prodi[p.Kode] = true; }); } s.prodi[k] = !s.prodi[k]; this.render(); },
    kelasT(b) { const s = this.st, k = b.dataset.v; if (!s.kelas) { s.kelas = {}; Dom.mhsAktif().forEach(m => { if (m.Kelas) s.kelas[m.Kelas] = Dom.kelasPola(m.Kelas) !== 'Tidak dijadwalkan'; }); } s.kelas[k] = !s.kelas[k]; this.render(); },
    resetF() { Object.assign(this.st, { jk: '', ang: null, prodi: null, kelas: null, pilih: {} }); this.render(); },
    ujian(b) { this.st.ujian = b.dataset.v; this.render(); },
    tambahKomp() { this.isi().komponen.push({ label: '', bobot: 0 }); this.st.kotor = true; this.render(); },
    hapusKomp(b) { const k = this.isi().komponen; if (k.length > 1) k.splice(+b.dataset.i, 1); this.st.kotor = true; this.render(); },
    async simpanBawaan(b) {
      const nilai = Object.assign({}, (Dom.setJson('TATA_CETAK', {}) || {}).NILAI_TAHFIDZ || {}, this.ubahTata());
      const r = await denganSibuk(b, 'Menyimpan…', () => api('cetak.tata', { jenis: 'NILAI_TAHFIDZ', nilai }));
      if (r.success) { this.st.kotor = false; toast(r.message); this.render(); }
    },
    lihat(b) { this.buka([b.dataset.v]); },
    cetak() { const per = App.perAktif(); this.buka(this.lembar(per).filter(l => this.st.pilih[l.key] !== false).map(l => l.key)); },
    excel(b) { this.excel(b); }
  },
  ch: {
    pilih(t) { this.st.pilih[t.dataset.v] = t.checked; this.render(); },
    semua(t) { this.lembar(App.perAktif()).forEach(l => { this.st.pilih[l.key] = t.checked; }); this.render(); },
    dosen(t) { if (t.value) this.st.dosen[t.dataset.v] = t.value; else delete this.st.dosen[t.dataset.v]; this.render(); }
  },
  inp: {
    isi(t) { this.isi()[t.dataset.f] = t.value; this.tandaiKotor(); },
    pj(t) { this.isi().pj[t.dataset.f] = t.value; this.tandaiKotor(); },
    komp(t) {
      const k = this.isi().komponen[+t.dataset.i]; if (!k) return;
      k[t.dataset.f] = t.dataset.f === 'bobot' ? num(t.value, 0) : t.value; this.tandaiKotor();
      const el = $('#nt-total', this.el); if (el) el.textContent = Math.round(this.isi().komponen.reduce((a, x) => a + num(x.bobot, 0), 0) * 100) / 100;
    }
  }
});

/* =====================================================================
   DOKUMEN DARI TEMPLATE (gas-doc-engine)
   ===================================================================== */
defPage('template', {
  deps: ['DE_Template'], refreshTabel: ['DE_Template'], pakaiPer: true,
  st: { antrean: null },
  judulMenu() { return 'Dokumen dari Template'; },
  skema(t) { try { return JSON.parse(t.Bidang || '{}'); } catch (e) { return {}; } },
  render() {
    const per = App.perAktif(), tpl = DB.rows('DE_Template'), admin = Sesi.admin(), q = this.st.antrean;
    this.el.innerHTML = kepala({ crumb: ['Cetak', 'Dokumen dari Template'], judul: 'Dokumen dari Template', badge: ' <span class="badge info sq">' + ic('qr', 'ic-sm') + 'QR verifikasi otomatis</span>',
        desc: 'Desain dokumen sendiri di Google Docs, Sheets, atau Slides dengan placeholder <span class="mono">{{...}}</span>. Sistem memindai placeholder, membangun form isian, lalu menerbitkan dokumen ber-QR yang bisa dicek di halaman verifikasi.',
        aksi: App.perToggle() + btnRefresh(false) + '<button class="btn" data-a="panduan">' + ic('info') + 'Panduan Placeholder</button>' + (admin ? '<button class="btn btn-primary" data-a="daftar">' + ic('plus') + 'Daftarkan Template</button>' : '') }) +
      '<div class="grid3">' + (tpl.map(t => { const sk = this.skema(t), nonaktif = t.Aktif !== 'YA';
        return '<div class="card card-b" style="display:flex;flex-direction:column;gap:10px' + (nonaktif ? ';opacity:.6' : '') + '"><div class="row"><span class="badge ' + { docs: 'info', sheets: 'ok', slides: 'orange' }[t.Engine] + ' sq">' + esc({ docs: 'Google Docs', sheets: 'Google Sheets', slides: 'Google Slides' }[t.Engine] || t.Engine) + '</span><span class="badge sq">→ ' + esc(String(t.Keluaran || 'pdf').toUpperCase()) + '</span><span class="sp"></span><span class="faint">v' + esc(t.Versi) + '</span></div>' +
          '<b style="font-size:16px">' + esc(t.Nama) + '</b><div class="muted" style="font-size:12.5px">' + (sk.bidang || []).length + ' kolom isian · sumber: ' + esc({ manual: 'isi manual', dosen: 'dosen berjadwal', rombel: 'rombel mahasiswa', sheet: 'spreadsheet' }[t.Sumber] || t.Sumber) + (sk.sistem && sk.sistem.length ? ' · otomatis: ' + esc(sk.sistem.slice(0, 5).join(', ')) : '') + '</div>' +
          (sk.hilang && sk.hilang.length ? '<div class="alert warn" style="margin:0;padding:8px 10px;font-size:12px">' + ic('alert', 'ic-sm') + '<div>Kolom tidak lagi ada di template: ' + esc(sk.hilang.join(', ')) + '</div></div>' : '') +
          '<div class="row" style="margin-top:auto">' + (admin ? '<button class="btn btn-sm btn-ghost" data-a="atur" data-v="' + t.ID + '">' + ic('gear', 'ic-sm') + 'Atur</button><button class="btn btn-sm btn-ghost" data-a="pindai" data-v="' + t.ID + '" title="Pindai ulang setelah template diubah">' + ic('refresh', 'ic-sm') + '</button>' : '') + '<span class="sp"></span>' +
          (t.Sumber !== 'manual' ? '<button class="btn btn-sm" data-a="massal" data-v="' + t.ID + '" ' + (nonaktif ? 'disabled' : '') + '>' + ic('layers', 'ic-sm') + 'Massal</button>' : '') + '<button class="btn btn-sm btn-primary" data-a="isi" data-v="' + t.ID + '" ' + (nonaktif ? 'disabled' : '') + '>' + ic('edit', 'ic-sm') + 'Isi &amp; Buat</button></div></div>'; }).join('') ||
        '<div class="card card-b" style="grid-column:1/-1">' + kosong('Belum ada template. ' + (admin ? 'Tekan <b>Daftarkan Template</b> dan tempel URL Google Docs/Sheets/Slides yang berisi placeholder {{...}}.' : 'Admin Utama dapat mendaftarkan template.'), 'files') + '</div>') + '</div>' +
      '<div class="card" style="margin-top:16px"><div class="card-h"><h3>' + ic('history') + 'Antrean Generate Massal</h3><span class="sp"></span><button class="btn btn-sm" data-a="muatAntrean">' + ic('refresh', 'ic-sm') + 'Muat status</button>' + (q && q.hitung.MENUNGGU ? '<button class="btn btn-sm btn-primary" data-a="proses">' + ic('zap', 'ic-sm') + 'Proses sekarang</button>' : '') + '</div>' +
      (q ? '<div class="card-b"><div class="row"><span class="badge warn">Menunggu ' + (q.hitung.MENUNGGU || 0) + '</span><span class="badge ok">Selesai ' + (q.hitung.SELESAI || 0) + '</span><span class="badge err">Gagal ' + (q.hitung.GAGAL || 0) + '</span><span class="faint">Diproses otomatis ±25 dokumen per menit walau halaman ditutup.</span></div></div>' +
        '<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Dokumen</th><th>Status</th><th>Keterangan</th><th class="right">Unduh</th></tr></thead><tbody>' + (q.terbaru.map(j => '<tr><td>' + esc(j.judul || j.JobID) + '</td><td><span class="badge ' + { SELESAI: 'ok', GAGAL: 'err', MENUNGGU: 'warn' }[j.Status] + '">' + esc(j.Status) + '</span></td><td class="t-sub">' + esc(j.Galat || '') + '</td><td class="right">' + (j.BerkasID ? '<button class="btn btn-xs" data-a="unduh" data-v="' + j.BerkasID + '">' + ic('download', 'ic-sm') + '</button>' : '') + '</td></tr>').join('') || '<tr><td colspan="4" class="faint">Antrean kosong.</td></tr>') + '</tbody></table></div>'
        : '<div class="card-b faint">Tekan Muat status untuk melihat antrean.</div>') + '</div>';
  },
  acts: {
    panduan() {
      Modal.buka({ title: 'Panduan Placeholder Template', icon: 'info', size: 'lg', body: '<div class="stack" style="font-size:13.5px">' +
        '<div><b>Penulisan:</b> <span class="mono">{{ KUNCI }}</span>, <span class="mono">{{KUNCI|pengubah}}</span>. Huruf besar/kecil tidak berpengaruh. Gaya huruf (tebal, ukuran) mengikuti penanda di template.</div>' +
        '<div><b>Otomatis dari sistem:</b> <span class="mono">{{TANGGAL}} {{TAHUN}} {{BULAN_ROMAWI}} {{TA}} {{SEMESTER_AKADEMIK}} {{INSTITUSI_NAMA}} {{INSTITUSI_ALAMAT}} {{NAMA_PEJABAT}} {{JABATAN}} {{KODE_VERIFIKASI}} {{URL_VERIFIKASI}}</span></div>' +
        '<div><b>Gambar:</b> <span class="mono">{{QR}}</span> (QR verifikasi), <span class="mono">{{TTD}}</span>, <span class="mono">{{STEMPEL}}</span>, <span class="mono">{{LOGO}}</span> — tulis sendiri di satu baris/kotak.</div>' +
        '<div><b>Pengubah:</b> <span class="mono">kapital · judul · kecil · rupiah · terbilang · tanggal:dd/MM/yyyy · bawaan:teks</span></div>' +
        '<div><b>Blok baris berulang (tabel):</b> taruh <span class="mono">{{#MK}}</span> di satu baris tabel dan kolom <span class="mono">{{MK.NAMA}} {{MK.SKS}} {{MK.SMT}} {{MK.PRODI}} {{MK.KELAS}}</span>; baris digandakan per item.</div>' +
        '<div><b>Bersyarat:</b> <span class="mono">{{?TEMBUSAN}} … {{/TEMBUSAN}}</span> dihapus bila kosong.</div>' +
        '<div><b>Sumber data massal:</b><br>• <i>Dosen berjadwal</i>: NAMA_DOSEN, NIDN, NO_WA, JUMLAH_MK, TOTAL_SKS, NOMOR_SURAT, blok MK<br>• <i>Rombel mahasiswa</i>: PRODI, KELAS, ANGKATAN, SEMESTER, JUMLAH_MHS, L, P, blok MHS (NO, NIM, NAMA, JK)<br>• <i>Spreadsheet</i>: judul kolom baris pertama = kunci placeholder.</div></div>', foot: '<button class="btn btn-primary" data-close>Mengerti</button>' });
    },
    daftar() { this.formDaftar(); },
    async pindai(b) { const t = DB.get('DE_Template', 'ID', b.dataset.v); const r = await denganSibuk(b, '', () => api('de.pindai', { id: t.ID, url: t.FileID, nama: t.Nama, keluaran: t.Keluaran, sumber: t.Sumber })); if (r.success) { DB.apply({ tables: { DE_Template: r.data.template } }); toast(r.message); } },
    atur(b) { this.formAtur(DB.get('DE_Template', 'ID', b.dataset.v)); },
    isi(b) { this.formIsi(DB.get('DE_Template', 'ID', b.dataset.v)); },
    async massal(b) {
      const t = DB.get('DE_Template', 'ID', b.dataset.v), per = App.perAktif();
      let url = '';
      if (t.Sumber === 'sheet') { url = prompt('Tempel URL spreadsheet sumber (baris pertama = judul kolom):'); if (!url) return; }
      if (!(await konfirmasi('Buat dokumen massal <b>' + esc(t.Nama) + '</b> dari sumber <b>' + esc(t.Sumber) + '</b> untuk ' + esc(Dom.perLabel(per)) + '?', { ok: 'Masukkan ke antrean', icon: 'layers' }))) return;
      const r = await denganSibuk(b, '', () => api('de.massal', { templateId: t.ID, periode: per, sumber: t.Sumber, sheetUrl: url }));
      if (r.success) { toast(r.message); this.acts.muatAntrean.call(this); }
    },
    async muatAntrean(b) { const r = await denganSibuk(b, '', () => api('de.status', {})); if (r.success) { this.st.antrean = r.data; this.render(); } },
    async proses(b) { const r = await denganSibuk(b, 'Memproses…', () => api('de.proses', {})); if (r.success) { toast(r.message); this.acts.muatAntrean.call(this); } },
    unduh(b) { unduhBerkasServer(b.dataset.v, b); }
  },
  formDaftar() {
    Modal.buka({ title: 'Daftarkan Template Dokumen', icon: 'files', body: '<div class="stack"><div class="field"><label>Nama template *</label><input class="input" id="tp-n" placeholder="mis. SK Mengajar, Sertifikat Kegiatan"></div>' +
      '<div class="field"><label>URL Google Docs / Sheets / Slides *</label><input class="input" id="tp-u" placeholder="https://docs.google.com/document/d/…/edit"><span class="help">Berkas disalin ke folder "Template Dokumen" — master asli tidak diubah.</span></div>' +
      '<div class="fgrid c2"><div class="field"><label>Keluaran</label><select class="input" id="tp-k">' + opsi([{ v: 'pdf', l: 'PDF' }, { v: 'docx', l: 'Word (DOCX) — Docs' }, { v: 'xlsx', l: 'Excel (XLSX) — Sheets' }, { v: 'png', l: 'Gambar (PNG) — Slides' }], 'pdf') + '</select></div>' +
      '<div class="field"><label>Sumber data</label><select class="input" id="tp-s">' + opsi([{ v: 'manual', l: 'Isi manual (form)' }, { v: 'dosen', l: 'Dosen berjadwal (massal)' }, { v: 'rombel', l: 'Rombel mahasiswa (massal)' }, { v: 'sheet', l: 'Spreadsheet lain (massal)' }], 'manual') + '</select></div></div></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('search') + 'Pindai &amp; Simpan</button>',
      acts: { ok: async (b, e, m) => {
        const d = { nama: $('#tp-n').value.trim(), url: $('#tp-u').value.trim(), keluaran: $('#tp-k').value, sumber: $('#tp-s').value };
        if (!d.nama || !d.url) return toast('Nama dan URL wajib diisi.', 'err');
        const r = await denganSibuk(b, 'Memindai…', () => api('de.pindai', d));
        if (r.success) { DB.apply({ tables: { DE_Template: r.data.template } }); m.close(); toast(r.message); this.formAtur(DB.get('DE_Template', 'ID', r.data.id)); }
      } } });
  },
  formAtur(t) {
    if (!t) return; const sk = this.skema(t), b = sk.bidang || [];
    Modal.buka({ title: 'Atur Kolom — ' + esc(t.Nama), icon: 'gear', size: 'lg', body: '<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Kunci</th><th>Label</th><th>Tipe</th><th>Wajib</th><th>Bantuan</th></tr></thead><tbody>' +
      (b.map((x, i) => '<tr><td class="mono">' + esc(x.kunci) + '</td><td><input class="input sm" data-i="' + i + '" data-f="label" value="' + attr(x.label) + '"></td><td><select class="input sm" data-i="' + i + '" data-f="tipe">' + opsi(['teks', 'area', 'naskah', 'tanggal', 'angka', 'pilihan', 'gambar', 'daftar'], x.tipe) + '</select></td><td class="center"><input type="checkbox" data-i="' + i + '" data-f="wajib" ' + (x.wajib ? 'checked' : '') + '></td><td><input class="input sm" data-i="' + i + '" data-f="bantu" value="' + attr(x.bantu || '') + '"></td></tr>').join('') || '<tr><td colspan="5" class="faint">Template hanya berisi placeholder sistem.</td></tr>') + '</tbody></table></div>' +
      '<label class="chk" style="margin-top:12px"><input type="checkbox" id="tp-aktif" ' + (t.Aktif === 'YA' ? 'checked' : '') + '> Template aktif</label>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('save') + 'Simpan</button>',
      acts: { ok: async (bt, e, m) => {
        $$('[data-i]', m.el).forEach(el => { const x = b[+el.dataset.i]; x[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value; });
        const r = await denganSibuk(bt, 'Menyimpan…', () => api('de.simpan', { id: t.ID, bidang: b, aktif: $('#tp-aktif', m.el).checked }));
        if (r.success) { DB.apply({ tables: { DE_Template: r.data.template } }); m.close(); toast(r.message); }
      } } });
  },
  formIsi(t) {
    const sk = this.skema(t), b = (sk.bidang || []).filter(x => x.tipe !== 'daftar' && x.tipe !== 'gambar');
    const input = (x) => { const id = 'de_' + x.kunci; if (x.tipe === 'area' || x.tipe === 'naskah') return '<textarea class="input" id="' + id + '" rows="' + (x.tipe === 'naskah' ? 6 : 3) + '"></textarea>'; if (x.tipe === 'pilihan') return '<select class="input" id="' + id + '">' + opsi(x.opsi || [], '') + '</select>'; return '<input class="input" id="' + id + '" type="' + ({ tanggal: 'date', angka: 'number' }[x.tipe] || 'text') + '">'; };
    Modal.buka({ title: esc(t.Nama), sub: 'Isi kolom lalu buat dokumen · ' + esc(Dom.perLabel(App.perAktif())), icon: 'edit', size: 'lg',
      body: (b.length ? '<div class="fgrid c2">' + b.map(x => '<div class="field"' + (x.tipe === 'naskah' || x.tipe === 'area' ? ' style="grid-column:1/-1"' : '') + '><label>' + esc(x.label) + (x.wajib ? ' *' : '') + '</label>' + input(x) + (x.bantu ? '<span class="help">' + esc(x.bantu) + '</span>' : '') + '</div>').join('') + '</div>' : '<p class="muted">Template ini hanya memakai data sistem — langsung buat dokumen.</p>') +
        ((sk.bidang || []).some(x => x.tipe === 'daftar') ? '<div class="alert info" style="margin-top:12px">' + ic('info') + '<div>Blok tabel berulang diisi otomatis pada generate massal (sumber dosen/rombel).</div></div>' : ''),
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('zap') + 'Buat Dokumen</button>',
      acts: { ok: async (bt, e, m) => {
        const isian = {}; b.forEach(x => { const el = $('#de_' + x.kunci, m.el); if (el) isian[x.kunci] = x.tipe === 'angka' && el.value !== '' ? Number(el.value) : el.value.trim(); });
        const kurang = b.filter(x => x.wajib && !String(isian[x.kunci] || '').trim()); if (kurang.length) return toast('Wajib diisi: ' + kurang.map(x => x.label).join(', '), 'err');
        const r = await denganSibuk(bt, 'Membuat dokumen…', () => api('de.generate', { templateId: t.ID, isian, periode: App.perAktif() }));
        if (!r.success) return;
        m.close();
        if (r.data.berkas64) unduhBlob(b64keBlob(r.data.berkas64, r.data.mime), r.data.nama);
        toast(r.message + '\nKode verifikasi: ' + r.data.kode);
      } } });
  }
});
