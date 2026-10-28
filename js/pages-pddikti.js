/* =====================================================================
   PENJADWALAN AL WAFA — pages-pddikti.js (v1.1)
   Pelaporan PDDIKTI: daftar mata kuliah per prodi dari jadwal final.
   - Semua program kelas (Reguler, Hybrid, Ma'had Aly) digabung = reguler.
   - Dosen pengampu hanya dosen ber-NIDN (kosong bila dosen MK tidak ber-NIDN).
   - DRAF → FINAL; MK final tercentang di tab "Kurikulum PDDIKTI".
   Menu mandiri: tidak mengubah Kurikulum, Realisasi, maupun Jadwal.
   ===================================================================== */
'use strict';
const Pddikti = {
  nidnOk(d) { return !!d && String(d.NIDN || '').replace(/\D/g, '').length >= 8; },
  dosenNidn() { return Dom.memo('pdk_dsn', () => Dom.dosen().filter(d => this.nidnOk(d))); },
  kunci(o) { return o.Prodi + '|' + o.Angkatan + '|' + String(o.KodeKur || '').toUpperCase(); },
  tersimpan(per) { const p = Dom.perObj(per); return DB.rows('Pddikti').filter(o => o.TA === p.ta && o.Semester === p.smt); },
  /** Baris turunan jadwal tersimpan: prodi × angkatan × kode MK (kelas digabung). */
  dariJadwal(per) {
    const jg = Dom.jadwalGrid(per), m = new Map();
    const urutK = (u) => (Dom.kelasPola(u.kelas) === 'Reguler' && !/ma.?had/i.test(u.kelas) ? 0 : 1) * 100 + num(Dom.kelasObj(u.kelas).Urutan, 99);
    Dom.units(per).filter(u => jg.has(u.id)).sort((a, b) => urutK(a) - urutK(b)).forEach(u => {
      const kode = String(u.kur.KodeMK || '').toUpperCase(), k = u.prodi + '|' + u.angkatan + '|' + kode;
      if (!m.has(k)) m.set(k, { key: k, Prodi: u.prodi, Angkatan: String(u.angkatan), SmtMhs: u.smt, KodeKur: kode, NamaMK: u.kur.NamaMK, SKS: num(u.kur.SKS, u.sks), kur: [], kelas: [], cand: [] });
      const x = m.get(k);
      if (!x.kur.includes(u.kur.ID)) x.kur.push(u.kur.ID);
      if (!x.kelas.includes(u.kelas)) x.kelas.push(u.kelas);
      x.SKS = Math.max(x.SKS, num(u.kur.SKS, 0));
      u.dosen.forEach(id => { if (!x.cand.includes(id) && this.nidnOk(DB.get('Dosen', 'ID', id))) x.cand.push(id); });
    });
    return m;
  },
  /** Gabungan: tersimpan (prioritas) + turunan jadwal + ubahan layar. */
  baris(per, ubah) {
    const v = this.dariJadwal(per), out = new Map();
    v.forEach((x, k) => out.set(k, { key: k, ID: '', Prodi: x.Prodi, Angkatan: x.Angkatan, SmtMhs: x.SmtMhs, KodeKur: x.KodeKur, KurikulumIDs: x.kur.join(','), KodePddikti: x.KodeKur, NamaMK: x.NamaMK, SKS: x.SKS, Dosen1: x.cand[0] || '', Dosen2: x.cand[1] || '', Urutan: 0, Status: '', kelas: x.kelas, virt: true, hilang: false }));
    this.tersimpan(per).forEach(o => {
      const k = this.kunci(o), j = out.get(k);
      out.set(k, { key: k, ID: o.ID, Prodi: o.Prodi, Angkatan: String(o.Angkatan), SmtMhs: num(o.SmtMhs, j ? j.SmtMhs : 0), KodeKur: String(o.KodeKur).toUpperCase(), KurikulumIDs: o.KurikulumIDs, KodePddikti: o.KodePddikti, NamaMK: o.NamaMK, SKS: num(o.SKS, 0), Dosen1: o.Dosen1 || '', Dosen2: o.Dosen2 || '',
        Urutan: num(o.Urutan, 0), Status: o.Status || 'DRAF', FinalPada: o.FinalPada, FinalOleh: o.FinalOleh, kelas: j ? j.kelas : [], virt: false, hilang: !j, saran: j ? { Dosen1: j.Dosen1, Dosen2: j.Dosen2 } : null });
    });
    Object.keys(ubah || {}).forEach(k => { const r = out.get(k); if (r && r.Status !== 'FINAL') Object.assign(r, ubah[k]); });
    const pr = (kode) => num((DB.get('Prodi', 'Kode', kode) || {}).Urutan, 99);
    return [...out.values()].sort((a, b) => pr(a.Prodi) - pr(b.Prodi) || num(b.SmtMhs) - num(a.SmtMhs) || num(a.Urutan) - num(b.Urutan) || String(a.KodePddikti || a.KodeKur).localeCompare(String(b.KodePddikti || b.KodeKur)));
  },
  lengkap(r) { return !!(r.Dosen1 && r.KodePddikti && num(r.SKS, 0) >= 1); },
  /** SKS per dosen NIDN: setiap kemunculan (Dosen 1 & Dosen 2) dihitung. */
  rekap(rows) {
    const m = new Map();
    rows.forEach(r => [r.Dosen1, r.Dosen2].filter(Boolean).forEach(id => { if (!m.has(id)) m.set(id, { id, tot: 0, prodi: {}, mk: 0 }); const x = m.get(id); x.tot += num(r.SKS, 0); x.prodi[r.Prodi] = (x.prodi[r.Prodi] || 0) + num(r.SKS, 0); x.mk++; }));
    return [...m.values()].map(x => Object.assign(x, { nama: Dom.dosenNama(x.id), nidn: (DB.get('Dosen', 'ID', x.id) || {}).NIDN || '' })).sort((a, b) => norm(a.nama).localeCompare(norm(b.nama)));
  },
  perSebelum(per) { const p = Dom.perObj(per), y = parseInt(p.ta, 10); return p.smt === 'Genap' ? p.ta + ' Ganjil' : (y - 1) + '/' + y + ' Genap'; }
};

defPage('pddikti', {
  deps: ['Pddikti', 'Jadwal', 'Realisasi', 'Kurikulum', 'Dosen', 'Prodi', 'Kelas', 'Angkatan', 'Pengaturan', 'Aset'], refreshTabel: ['Pddikti', 'Jadwal', 'Realisasi', 'Kurikulum', 'Dosen'], pakaiPer: true,
  st: { tab: 'susun', prodi: '', status: '', q: '', ubah: {}, angK: '' },
  onParams(p) { this.st.tab = ['susun', 'kurikulum', 'dosen'].includes(p[0]) ? p[0] : 'susun'; },
  judulMenu() { return 'Pelaporan PDDIKTI · ' + { susun: 'Penyusunan', kurikulum: 'Kurikulum PDDIKTI', dosen: 'Rekap SKS Dosen' }[this.st.tab]; },
  isDirty() { return Object.keys(this.st.ubah).length > 0; },
  dirtyInfo() { return { judul: Object.keys(this.st.ubah).length + ' baris PDDIKTI belum disimpan', sub: 'Disimpan sebagai DRAF ' + Dom.perLabel(App.perAktif()) + '.' }; },
  buang() { this.st.ubah = {}; this.render(); },
  render() {
    const s = this.st, per = App.perAktif();
    const head = kepala({ crumb: ['Pelaporan', 'Pelaporan PDDIKTI', { susun: 'Penyusunan', kurikulum: 'Kurikulum PDDIKTI', dosen: 'Rekap SKS Dosen' }[s.tab]], judul: 'Pelaporan PDDIKTI',
      badge: ' <span class="badge info sq">' + esc(Dom.perLabel(per)) + '</span>',
      desc: 'Daftar mata kuliah per program studi untuk pelaporan PDDIKTI, diambil dari jadwal final. Semua program kelas digabung sebagai kelas reguler; dosen pengampu hanya dosen ber-NIDN.',
      aksi: App.perToggle() + btnRefresh(false) + '<button class="btn" data-a="excel">' + ic('sheet') + 'Simpan Excel</button><button class="btn btn-accent" data-a="cetak">' + ic('printer') + 'Pratinjau &amp; Cetak</button>' }) +
      '<div class="tabcards">' + [['susun', 'Penyusunan', 'Kode, nama, SKS & dosen NIDN', 'edit'], ['kurikulum', 'Kurikulum PDDIKTI', 'MK terlapor per angkatan', 'book'], ['dosen', 'Rekap SKS Dosen', 'Beban SKS per NIDN', 'users']].map(x => '<button class="' + (s.tab === x[0] ? 'on' : '') + '" data-a="nav" data-to="pddikti/' + x[0] + '"><span class="ik">' + ic(x[3]) + '</span><span><b>' + x[1] + '</b><small>' + x[2] + '</small></span></button>').join('') + '</div>';
    this.el.innerHTML = head + (s.tab === 'kurikulum' ? this.vKurikulum(per) : s.tab === 'dosen' ? this.vDosen(per) : this.vSusun(per));
  },

  /* ---------------- Penyusunan ---------------- */
  vSusun(per) {
    const s = this.st, rows = Pddikti.baris(per, s.ubah), adaJ = Dom.adaJadwal(per);
    if (!rows.length) return adaJ ? '<div class="card card-b">' + kosong('Belum ada mata kuliah terjadwal pada periode ini.', 'book') + '</div>' : belumAdaJadwal(per);
    const nFinal = rows.filter(r => r.Status === 'FINAL').length, nDraf = rows.filter(r => r.Status === 'DRAF').length, nBaru = rows.filter(r => !r.Status).length, nKurang = rows.filter(r => r.Status !== 'FINAL' && !Pddikti.lengkap(r)).length;
    const lolos = (r) => (!s.prodi || r.Prodi === s.prodi) && (!s.status || (s.status === 'final' ? r.Status === 'FINAL' : s.status === 'draf' ? r.Status === 'DRAF' : s.status === 'baru' ? !r.Status : r.Status !== 'FINAL' && !Pddikti.lengkap(r))) && cocok(r.KodeKur + ' ' + r.KodePddikti + ' ' + r.NamaMK + ' ' + Dom.dosenNama(r.Dosen1) + ' ' + Dom.dosenNama(r.Dosen2), s.q);
    const tampil = rows.filter(lolos), prodi = Dom.prodiSemua().filter(p => rows.some(r => r.Prodi === p.Kode));
    const dsn = Pddikti.dosenNidn(), opsD = (v, ph) => '<option value="">' + ph + '</option>' + dsn.map(d => '<option value="' + attr(d.ID) + '"' + (d.ID === v ? ' selected' : '') + '>' + esc(d.Nama) + ' · ' + esc(d.NIDN) + '</option>').join('');
    const nonNidn = (Dom.dosen().length - dsn.length);
    const kartu = (p) => {
      const r0 = tampil.filter(r => r.Prodi === p.Kode); if (!r0.length) return '';
      const semua = rows.filter(r => r.Prodi === p.Kode), fin = semua.filter(r => r.Status === 'FINAL').length, sks = semua.reduce((a, r) => a + num(r.SKS, 0), 0);
      const bisaFinal = semua.some(r => r.Status === 'DRAF') && semua.filter(r => r.Status !== 'FINAL').every(r => r.Status === 'DRAF' && Pddikti.lengkap(r) && !s.ubah[r.key]);
      const ada2 = true, w = p.Warna || '#1E3A8A';
      let smtLalu = null;
      const body = r0.map((r, i) => {
        const fin = r.Status === 'FINAL', kotor = !!s.ubah[r.key], dis = fin ? ' disabled' : '';
        const grup = r.SmtMhs !== smtLalu ? (smtLalu = r.SmtMhs, '<tr class="pk-grp"><td colspan="7"><b>SEMESTER ' + r.SmtMhs + '</b> <span class="faint">· Angkatan ' + esc(r.Angkatan) + ' · ' + semua.filter(x => x.SmtMhs === r.SmtMhs).reduce((a, x) => a + num(x.SKS, 0), 0) + ' SKS</span></td></tr>') : '';
        const st = fin ? '<span class="badge ok">' + ic('okc', 'ic-sm') + 'FINAL</span>' : r.Status === 'DRAF' ? (Pddikti.lengkap(r) ? '<span class="badge info">DRAF</span>' : '<span class="badge warn">DRAF · belum lengkap</span>') : '<span class="badge orange">Belum disimpan</span>';
        return grup + '<tr class="' + (kotor ? 'kotor' : '') + (r.hilang ? ' pk-hilang' : '') + '"><td class="num">' + (i + 1) + '</td>' +
          '<td><input class="input sm mono" style="width:118px" data-in="f" data-f="KodePddikti" data-k="' + attr(r.key) + '" value="' + attr(r.KodePddikti) + '" maxlength="30"' + dis + '><div class="t-sub mono">kur: ' + esc(r.KodeKur) + '</div></td>' +
          '<td style="min-width:220px"><input class="input sm" data-in="f" data-f="NamaMK" data-k="' + attr(r.key) + '" value="' + attr(r.NamaMK) + '" maxlength="160"' + dis + '><div class="t-sub">' + (r.kelas.length ? r.kelas.map(badgeKelas).join(' ') : '<span class="badge err">' + ic('alert', 'ic-sm') + 'tidak ada di jadwal</span>') + '</div></td>' +
          '<td><input class="input sm" type="number" min="0" max="12" style="width:64px" data-in="f" data-f="SKS" data-k="' + attr(r.key) + '" value="' + attr(r.SKS) + '"' + dis + '></td>' +
          '<td style="min-width:210px"><div class="pk-dsn"><select class="input sm' + (r.Dosen1 ? '' : ' kosong') + '" data-ch="d" data-f="Dosen1" data-k="' + attr(r.key) + '"' + dis + ' title="Dosen pengampu 1 (wajib, ber-NIDN)">' + opsD(r.Dosen1, '— dosen 1 (wajib) —') + '</select>' +
            (ada2 ? '<select class="input sm" data-ch="d" data-f="Dosen2" data-k="' + attr(r.key) + '"' + dis + ' title="Dosen pengampu 2 (opsional)">' + opsD(r.Dosen2, '— dosen 2 (opsional) —') + '</select>' : '') + '</div></td>' +
          '<td class="nowrap">' + st + (fin && r.FinalPada ? '<div class="t-sub">' + esc(fmtTgl(r.FinalPada)) + '</div>' : '') + '</td>' +
          '<td class="right">' + (r.hilang && !fin ? '<button class="btn btn-sm btn-icon btn-ghost" data-a="hapusBaris" data-k="' + attr(r.key) + '" title="Hapus baris yang tidak ada di jadwal">' + ic('trash', 'ic-sm') + '</button>' : '') + '</td></tr>';
      }).join('');
      return '<div class="card pk-card" style="--c:' + attr(w) + ';margin-bottom:16px"><div class="card-h"><span class="badge sq" style="background:' + attr(w) + ';color:#fff">' + esc(p.Kode) + '</span><h3>' + esc(p.Nama) + '</h3><span class="badge">' + semua.length + ' MK · ' + sks + ' SKS</span>' +
        '<span class="badge ' + (fin === semua.length ? 'ok' : '') + '">' + fin + '/' + semua.length + ' final</span><span class="sp"></span>' +
        (fin && Sesi.admin() ? '<button class="btn btn-sm btn-ghost" data-a="buka" data-v="' + attr(p.Kode) + '">' + ic('unlock', 'ic-sm') + 'Buka kembali</button>' : '') +
        '<button class="btn btn-sm btn-primary" data-a="final" data-v="' + attr(p.Kode) + '" ' + (bisaFinal ? '' : 'disabled title="Simpan draf & lengkapi kode, SKS, dan dosen NIDN terlebih dahulu"') + '>' + ic('okc', 'ic-sm') + 'Finalkan ' + esc(p.Kode) + '</button></div>' +
        '<div class="tbl-wrap"><table class="tbl compact pk-tbl"><thead><tr><th class="num">No</th><th>Kode PDDIKTI</th><th>Mata Kuliah</th><th>SKS</th><th>Dosen Pengampu (NIDN)</th><th>Status</th><th></th></tr></thead><tbody>' + body + '</tbody></table></div></div>';
    };
    const rek = Pddikti.rekap(rows).slice(0, 60);
    return '<div class="kpis">' + kpi({ lb: 'Mata Kuliah', vl: rows.length + '<small>MK · ' + prodi.length + ' prodi</small>', ic: 'book' }) + kpi({ lb: 'Final', vl: nFinal + '<small>MK</small>', ic: 'okc', cls: 'ok', act: 'stF', v: 'final' }) +
      kpi({ lb: 'Draf', vl: nDraf + '<small>MK</small>', ic: 'edit', act: 'stF', v: 'draf', ft: nBaru ? nBaru + ' baris belum disimpan' : '' }) + kpi({ lb: 'Belum Lengkap', vl: nKurang + '<small>MK</small>', ic: 'alert', cls: nKurang ? 'orange' : '', act: 'stF', v: 'kurang', ft: 'kode / SKS / dosen NIDN' }) + '</div>' +
      (nBaru ? '<div class="alert warn">' + ic('info') + '<div style="flex:1"><b>' + nBaru + ' mata kuliah dari jadwal belum disimpan.</b> Periksa kode, nama, SKS, dan dosen ber-NIDN, lalu simpan sebagai draf. Draf yang lengkap dapat difinalkan per prodi.</div><button class="btn btn-primary" data-a="simpanDraf">' + ic('save') + 'Simpan Draf</button></div>' : '') +
      (nonNidn > 0 ? '<div class="alert info">' + ic('idcard') + '<div>' + nonNidn + ' dosen belum memiliki NIDN sehingga tidak muncul di pilihan dosen pengampu. Lengkapi NIDN di menu <a href="#/dosen">Dosen</a> bila perlu.</div></div>' : '') +
      '<div class="card card-b" style="margin-bottom:14px"><div class="row"><div class="row gap-s"><button class="chip ' + (!s.prodi ? 'on' : '') + '" data-a="prodiF" data-v="">Semua prodi</button>' + prodi.map(p => '<button class="chip ' + (s.prodi === p.Kode ? 'on' : '') + '" data-a="prodiF" data-v="' + attr(p.Kode) + '">' + dotProdi(p.Kode) + ' ' + esc(p.Kode) + '</button>').join('') + '</div><span class="sp"></span>' +
        '<div class="seg">' + [['', 'Semua'], ['baru', 'Belum disimpan'], ['kurang', 'Belum lengkap'], ['draf', 'Draf'], ['final', 'Final']].map(x => '<button data-a="stF" data-v="' + x[0] + '" class="' + (s.status === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div>' +
        '<div class="input-ic" style="width:min(240px,100%)">' + ic('search') + '<input class="input" data-in="q" placeholder="Cari MK, kode, dosen…" value="' + attr(s.q) + '"></div></div></div>' +
      '<div class="pk-lay"><div style="min-width:0">' + (prodi.map(kartu).join('') || '<div class="card card-b">' + kosong('Tidak ada mata kuliah pada filter ini.', 'filter') + '</div>') + '</div>' +
      '<aside class="card pk-rek"><div class="card-h"><h3>' + ic('users') + 'SKS per Dosen NIDN</h3></div><div id="pk-rek">' + this.rekapMini(rek) + '</div></aside></div>';
  },
  rekapMini(rek) {
    return rek.length ? '<div class="pk-rek-l">' + rek.map(x => '<div class="row" style="flex-wrap:nowrap"><div style="flex:1;min-width:0"><b class="ell">' + esc(x.nama) + '</b><div class="t-sub mono">' + esc(x.nidn) + ' · ' + x.mk + ' MK</div></div><span class="badge ' + (x.tot > 16 ? 'warn' : 'info') + ' sq">' + x.tot + ' SKS</span></div>').join('') + '</div>' : '<div class="card-b faint">Belum ada dosen ber-NIDN yang ditetapkan.</div>';
  },
  segarRekap() { const el = $('#pk-rek', this.el); if (el) el.innerHTML = this.rekapMini(Pddikti.rekap(Pddikti.baris(App.perAktif(), this.st.ubah))); App.savebar(this); },
  ubahF(key, f, v) {
    const per = App.perAktif(), dasar = Pddikti.baris(per, {}).find(r => r.key === key); if (!dasar || dasar.Status === 'FINAL') return;
    const u = Object.assign({}, this.st.ubah[key] || {}); u[f] = f === 'SKS' ? (v === '' ? '' : num(v, 0)) : v;
    Object.keys(u).forEach(k => { if (String(u[k]) === String(dasar[k] === undefined ? '' : dasar[k])) delete u[k]; });
    if (Object.keys(u).length) this.st.ubah[key] = u; else delete this.st.ubah[key];
    const tr = $('[data-k="' + CSS.escape(key) + '"]', this.el); const row = tr && tr.closest('tr'); if (row) row.classList.toggle('kotor', !!this.st.ubah[key]);
  },
  async simpan(btn, semuaBaru) {
    const per = App.perAktif(), rows = Pddikti.baris(per, this.st.ubah);
    const kirim = rows.filter(r => r.Status !== 'FINAL' && (this.st.ubah[r.key] || !r.Status || semuaBaru)).map(r => ({ ID: r.ID, Prodi: r.Prodi, Angkatan: r.Angkatan, SmtMhs: r.SmtMhs, KodeKur: r.KodeKur, KurikulumIDs: r.KurikulumIDs, KodePddikti: r.KodePddikti, NamaMK: r.NamaMK, SKS: r.SKS, Dosen1: r.Dosen1, Dosen2: r.Dosen2, Urutan: r.Urutan }));
    if (!kirim.length) { toast('Tidak ada perubahan untuk disimpan.', 'info'); return true; }
    const go = (pk) => api('pddikti.simpan', { periode: per, baris: kirim, base: pk ? undefined : { Pddikti: DB.ver.Pddikti } }, { silent: true });
    let r = await denganSibuk(btn, 'Menyimpan…', () => go(false));
    if (r.code === 'CONFLICT') r = await tanganiKonflik(r, () => go(true));
    if (!r.success) { if (r.code !== 'CONFLICT') { if (r.data && r.data.galat) Modal.buka({ title: 'Belum bisa disimpan', icon: 'alert', body: '<ul style="margin:0;padding-left:18px">' + r.data.galat.slice(0, 40).map(g => '<li>' + esc(g) + '</li>').join('') + '</ul>', foot: '<button class="btn btn-primary" data-close>Tutup</button>' }); else toast(r.message, 'err'); } return false; }
    this.st.ubah = {}; toast(r.message); this.render(); return true;
  },
  async finalkan(btn, prodi, buka) {
    const per = App.perAktif(), nm = Dom.prodiNama(prodi);
    if (!(await konfirmasi(buka ? 'Buka kembali data FINAL <b>' + esc(nm) + '</b> ' + esc(Dom.perLabel(per)) + ' menjadi DRAF?' : 'Finalkan daftar mata kuliah PDDIKTI <b>' + esc(nm) + '</b> ' + esc(Dom.perLabel(per)) + '?\n\nMK final terkunci dan tercentang di Kurikulum PDDIKTI. Hanya Admin Utama yang dapat membukanya kembali.', { ok: buka ? 'Buka kembali' : 'Finalkan', icon: buka ? 'unlock' : 'okc' }))) return;
    const r = await denganSibuk(btn, '', () => api('pddikti.final', { periode: per, prodi: [prodi], buka: !!buka }, { silent: true }));
    if (!r.success) { if (r.data && r.data.galat) Modal.buka({ title: 'Belum bisa difinalkan', icon: 'alert', body: '<ul style="margin:0;padding-left:18px">' + r.data.galat.slice(0, 40).map(g => '<li>' + esc(g) + '</li>').join('') + '</ul>', foot: '<button class="btn btn-primary" data-close>Tutup</button>' }); else toast(r.message, 'err'); return; }
    toast(r.message); this.render();
  },

  /* ---------------- Kurikulum PDDIKTI (centang MK final per angkatan) ---------------- */
  vKurikulum(per) {
    const s = this.st, aktif = Dom.angkatanAktif(), pdk = DB.rows('Pddikti');
    if (!aktif.length) return '<div class="card card-b">' + kosong('Belum ada angkatan aktif.', 'cap') + '</div>';
    if (!s.angK || !aktif.includes(s.angK)) s.angK = aktif[0];
    const finalMap = new Map(), drafMap = new Map();
    pdk.forEach(o => { const k = o.Prodi + '|' + o.Angkatan + '|' + String(o.KodeKur).toUpperCase(); (o.Status === 'FINAL' ? finalMap : drafMap).set(k, o); });
    const kurAng = (th) => { const m = new Map(); DB.rows('Kurikulum').filter(k => k.Angkatan === th).forEach(k => { const key = k.Prodi + '|' + th + '|' + String(k.KodeMK).toUpperCase(); if (!m.has(key)) m.set(key, k); }); return m; };
    const kartuAng = aktif.map(th => {
      const m = kurAng(th), n = m.size, f = [...m.keys()].filter(k => finalMap.has(k)).length, pc = n ? Math.round(f / n * 100) : 0;
      return '<button class="card angk-card pk-ang' + (s.angK === th ? ' on' : '') + '" data-a="angK" data-v="' + th + '"><div class="row"><span class="badge info">SEMESTER ' + Dom.semMhs(th, per) + '</span><span class="sp"></span><span class="badge ' + (pc === 100 ? 'ok' : '') + '">' + pc + '%</span></div><div class="yr">' + th + '</div>' +
        '<div class="muted">' + f + ' dari ' + n + ' MK terlapor</div><div class="pk-bar"><i style="width:' + pc + '%"></i></div></button>';
    }).join('');
    const th = s.angK, m = kurAng(th), prodi = Dom.prodi().filter(p => [...m.values()].some(k => k.Prodi === p.Kode));
    const kartuP = prodi.map(p => {
      const mk = [...m.values()].filter(k => k.Prodi === p.Kode).sort((a, b) => num(a.Semester) - num(b.Semester) || String(a.KodeMK).localeCompare(b.KodeMK));
      const smt = [...new Set(mk.map(k => num(k.Semester)))];
      const fin = mk.filter(k => finalMap.has(p.Kode + '|' + th + '|' + String(k.KodeMK).toUpperCase())), sksF = fin.reduce((a, k) => a + num((finalMap.get(p.Kode + '|' + th + '|' + String(k.KodeMK).toUpperCase()) || {}).SKS, 0), 0);
      return '<div class="card prodi-card" style="--c:' + attr(p.Warna) + '"><div class="row"><span class="badge sq" style="background:' + attr(p.Warna) + ';color:#fff">' + esc(p.Kode) + '</span><b style="font-size:15px">' + esc(p.Nama) + '</b><span class="sp"></span><span class="badge ok">' + fin.length + '/' + mk.length + ' MK · ' + sksF + ' SKS</span></div>' +
        smt.map(x => '<div class="pk-smt"><div class="lbl">Semester ' + x + '</div>' + mk.filter(k => num(k.Semester) === x).map(k => {
          const key = p.Kode + '|' + th + '|' + String(k.KodeMK).toUpperCase(), f = finalMap.get(key), d = drafMap.get(key);
          return '<div class="pk-mk ' + (f ? 'ok' : d ? 'df' : '') + '"><span class="ck">' + (f ? ic('check', 'ic-sm') : d ? '◐' : '') + '</span><span class="mono">' + esc(f ? f.KodePddikti || k.KodeMK : k.KodeMK) + '</span><span class="nm">' + esc(f ? f.NamaMK : k.NamaMK) + '</span><span class="faint nowrap">' + esc(f ? f.SKS : k.SKS) + ' SKS' + (f ? ' · ' + esc(f.Semester + ' ' + f.TA) : d ? ' · draf' : '') + '</span></div>';
        }).join('') + '</div>').join('') + '</div>';
    }).join('');
    return '<div class="grid3" style="margin-bottom:16px">' + kartuAng + '</div>' +
      '<div class="row" style="margin:0 2px 12px"><h3 style="font-size:17px">Kurikulum PDDIKTI — Angkatan ' + esc(th) + '</h3><span class="sp"></span><div class="legend"><span><i style="background:#16A34A;border-radius:50%"></i>Final (terlapor)</span><span><i style="background:#F59E0B;border-radius:50%"></i>Draf</span><span><i style="background:var(--border-2);border-radius:50%"></i>Belum</span></div></div>' +
      '<div class="grid2">' + (kartuP || '<div class="card card-b">' + kosong('Belum ada kurikulum untuk angkatan ini.', 'book') + '</div>') + '</div>';
  },

  /* ---------------- Rekap SKS Dosen ---------------- */
  vDosen(per) {
    const rows = Pddikti.baris(per, this.st.ubah), rek = Pddikti.rekap(rows), prodi = Dom.prodiSemua().filter(p => rows.some(r => r.Prodi === p.Kode));
    const lalu = Pddikti.perSebelum(per), pl = Dom.perObj(lalu), lm = new Map();
    DB.rows('Pddikti').filter(o => o.TA === pl.ta && o.Semester === pl.smt && o.Status === 'FINAL').forEach(o => [o.Dosen1, o.Dosen2].filter(Boolean).forEach(id => lm.set(id, (lm.get(id) || 0) + num(o.SKS, 0))));
    const ids = new Set(rek.map(x => x.id)); lm.forEach((v, id) => { if (!ids.has(id)) rek.push({ id, nama: Dom.dosenNama(id), nidn: (DB.get('Dosen', 'ID', id) || {}).NIDN || '', tot: 0, prodi: {}, mk: 0 }); });
    rek.sort((a, b) => norm(a.nama).localeCompare(norm(b.nama)));
    const tot = rek.reduce((a, x) => a + x.tot, 0);
    return '<div class="kpis">' + kpi({ lb: 'Dosen NIDN Bertugas', vl: rek.filter(x => x.tot).length + '<small>dosen</small>', ic: 'usercheck' }) + kpi({ lb: 'Total SKS Penugasan', vl: tot + '<small>SKS · ' + esc(Dom.perLabel(per)) + '</small>', ic: 'clock' }) +
      kpi({ lb: 'Rata-rata', vl: (rek.filter(x => x.tot).length ? (tot / rek.filter(x => x.tot).length).toFixed(1) : 0) + '<small>SKS / dosen</small>', ic: 'chart' }) + kpi({ lb: 'Semester Lalu (final)', vl: [...lm.values()].reduce((a, b) => a + b, 0) + '<small>SKS · ' + esc(Dom.perLabel(lalu)) + '</small>', ic: 'history' }) + '</div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('users') + 'Rekap SKS Dosen ber-NIDN</h3><span class="sp"></span><span class="faint">SKS dihitung per penugasan (Dosen 1 &amp; Dosen 2), termasuk draf yang sedang disusun</span></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="num">No</th><th>Nama Dosen</th><th>NIDN</th>' + prodi.map(p => '<th class="center">' + dotProdi(p.Kode) + ' ' + esc(p.Kode) + '</th>').join('') + '<th class="center">Jumlah SKS</th><th class="center">SKS ' + esc(Dom.perLabel(lalu)) + '</th><th class="center">Total</th></tr></thead><tbody>' +
      (rek.map((x, i) => '<tr><td class="num">' + (i + 1) + '</td><td><b>' + esc(x.nama) + '</b><div class="t-sub">' + x.mk + ' penugasan MK</div></td><td class="mono">' + esc(x.nidn) + '</td>' + prodi.map(p => '<td class="center">' + (x.prodi[p.Kode] || '<span class="faint">·</span>') + '</td>').join('') +
        '<td class="center"><b>' + x.tot + '</b></td><td class="center">' + (lm.get(x.id) || 0) + '</td><td class="center"><span class="badge info sq">' + (x.tot + (lm.get(x.id) || 0)) + '</span></td></tr>').join('') || '<tr><td colspan="' + (6 + prodi.length) + '">' + kosong('Belum ada dosen ber-NIDN yang ditetapkan pada periode ini.', 'users') + '</td></tr>') + '</tbody></table></div></div>';
  },

  bukaCetak() {
    const per = App.perAktif(), rows = Pddikti.baris(per, this.st.ubah).filter(r => !this.st.prodi || r.Prodi === this.st.prodi);
    if (!rows.length) return toast('Belum ada mata kuliah untuk dicetak.', 'warn');
    if (this.isDirty()) toast('Catatan: pratinjau memuat perubahan yang belum disimpan.', 'warn');
    Cetak.buka({ judul: 'Pratinjau — Daftar MK PDDIKTI', sub: (this.st.prodi ? Dom.prodiNama(this.st.prodi) : 'Semua prodi') + ' · ' + Dom.perLabel(per), periode: per, folder: 'PDDIKTI', prefix: 'PDK', jenis: 'PDDIKTI', tata: 'PDDIKTI',
      namaFile: 'Daftar MK PDDIKTI ' + (this.st.prodi || 'Semua Prodi') + ' — ' + Dom.perLabel(per).replace('/', '-'), orientasi: 'portrait',
      buat: (ctx) => [Doc.pddikti(per, rows, ctx)] });
  },
  acts: {
    prodiF(b) { this.st.prodi = b.dataset.v; this.render(); },
    stF(b) { this.st.status = this.st.status === b.dataset.v && b.closest('.kpi') ? '' : b.dataset.v; this.render(); },
    angK(b) { this.st.angK = b.dataset.v; this.render(); },
    simpanDraf(b) { this.simpan(b, false); },
    final(b) { this.finalkan(b, b.dataset.v, false); },
    buka(b) { this.finalkan(b, b.dataset.v, true); },
    hapusBaris: async function (b) {
      const per = App.perAktif(), r = Pddikti.baris(per, {}).find(x => x.key === b.dataset.k); if (!r || !r.ID) return;
      if (!(await konfirmasi('Hapus <b>' + esc(r.NamaMK) + '</b> dari daftar PDDIKTI ' + esc(Dom.perLabel(per)) + '? Mata kuliah ini tidak ada lagi di jadwal.', { danger: true, ok: 'Hapus' }))) return;
      const res = await denganSibuk(b, '', () => api('pddikti.simpan', { periode: per, baris: [{ ID: r.ID, Prodi: r.Prodi, Angkatan: r.Angkatan, KodeKur: r.KodeKur, _hapus: true }] }));
      if (res.success) toast(res.message);
    },
    cetak() { this.bukaCetak(); },
    async excel(b) {
      const per = App.perAktif();
      if (!Pddikti.tersimpan(per).length) return toast('Simpan draf PDDIKTI terlebih dahulu — Excel disusun dari data tersimpan.', 'warn');
      if (this.isDirty()) toast('Perubahan yang belum disimpan tidak ikut di Excel.', 'warn');
      const r = await denganSibuk(b, 'Menyusun Excel…', () => api('pddikti.excel', { periode: per }));
      if (r.success) unduhBlob(b64keBlob(r.data.berkas64, r.data.mime), r.data.nama);
    }
  },
  ch: { d(t) { this.ubahF(t.dataset.k, t.dataset.f, t.value); this.segarRekap(); } },
  inp: {
    f(t) { this.ubahF(t.dataset.k, t.dataset.f, t.value); clearTimeout(this._rt); this._rt = setTimeout(() => this.segarRekap(), 300); },
    q: debounce(function (t) { this.st.q = t.value; this.render(); const i = $('[data-in="q"]', this.el); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250)
  }
});
