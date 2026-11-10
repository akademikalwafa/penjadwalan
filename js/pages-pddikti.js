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
  /** (v1.4) Nilai bawaan PDDIKTI satu MK: aturan MK PDDIKTI (bila ada) → kurikulum. */
  bawaan(x) {
    const at = typeof aturanPddikti === 'function' ? aturanPddikti(x.Prodi, x.KodeKur) : null;
    return { KodePddikti: (at && at.KodePddikti) || x.KodeKur, NamaMK: (at && at.NamaMK) || x.NamaMK, SKS: at && at.SKS !== '' && at.SKS !== undefined ? num(at.SKS, x.SKS) : x.SKS, aturan: !!(at && (at.KodePddikti || at.NamaMK || at.SKS !== '')) };
  },
  /** Gabungan: tersimpan (prioritas) + turunan jadwal + ubahan layar. */
  baris(per, ubah) {
    const v = this.dariJadwal(per), out = new Map();
    v.forEach((x, k) => { const d = this.bawaan(x); out.set(k, { key: k, ID: '', Prodi: x.Prodi, Angkatan: x.Angkatan, SmtMhs: x.SmtMhs, KodeKur: x.KodeKur, KurikulumIDs: x.kur.join(','), KodePddikti: d.KodePddikti, NamaMK: d.NamaMK, SKS: d.SKS, Dosen1: x.cand[0] || '', Dosen2: x.cand[1] || '', Urutan: 0, Status: '', kelas: x.kelas, virt: true, hilang: false, aturan: d.aturan, sksJadwal: x.SKS }); });
    this.tersimpan(per).forEach(o => {
      const k = this.kunci(o), j = out.get(k);
      out.set(k, { key: k, ID: o.ID, Prodi: o.Prodi, Angkatan: String(o.Angkatan), SmtMhs: num(o.SmtMhs, j ? j.SmtMhs : 0), KodeKur: String(o.KodeKur).toUpperCase(), KurikulumIDs: o.KurikulumIDs, KodePddikti: o.KodePddikti, NamaMK: o.NamaMK, SKS: num(o.SKS, 0), Dosen1: o.Dosen1 || '', Dosen2: o.Dosen2 || '',
        Urutan: num(o.Urutan, 0), Status: o.Status || 'DRAF', FinalPada: o.FinalPada, FinalOleh: o.FinalOleh, kelas: j ? j.kelas : [], virt: false, hilang: !j, saran: j ? { Dosen1: j.Dosen1, Dosen2: j.Dosen2 } : null, aturan: j ? j.aturan : false, sksJadwal: j ? j.sksJadwal : null });
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
  deps: ['Pddikti', 'PddiktiMK', 'Jadwal', 'Realisasi', 'Kurikulum', 'Dosen', 'Prodi', 'Kelas', 'Angkatan', 'Pengaturan', 'Aset'], refreshTabel: ['Pddikti', 'PddiktiMK', 'Jadwal', 'Realisasi', 'Kurikulum', 'Dosen'], pakaiPer: true,
  st: { tab: 'susun', prodi: '', status: '', q: '', ubah: {}, angK: '', ingat: true, ubahA: {}, prodiA: '', qA: '', hanyaA: false },
  onParams(p) { this.st.tab = ['susun', 'kurikulum', 'dosen', 'aturan'].includes(p[0]) ? p[0] : 'susun'; },
  judulMenu() { return 'Pelaporan PDDIKTI · ' + { susun: 'Penyusunan', kurikulum: 'Kurikulum PDDIKTI', dosen: 'Rekap SKS Dosen', aturan: 'Aturan MK PDDIKTI' }[this.st.tab]; },
  isDirty() { return Object.keys(this.st.ubah).length > 0 || Object.keys(this.st.ubahA).length > 0; },
  dirtyInfo() { const a = Object.keys(this.st.ubah).length, b = Object.keys(this.st.ubahA).length; return { judul: [a ? a + ' baris PDDIKTI' : '', b ? b + ' aturan MK' : ''].filter(Boolean).join(' · ') + ' belum disimpan', sub: a ? 'Disimpan sebagai DRAF ' + Dom.perLabel(App.perAktif()) + '.' : 'Aturan berlaku untuk semua semester berikutnya.' }; },
  buang() { this.st.ubah = {}; this.st.ubahA = {}; this.render(); },
  render() {
    const s = this.st, per = App.perAktif();
    const head = kepala({ crumb: ['Pelaporan', 'Pelaporan PDDIKTI', { susun: 'Penyusunan', kurikulum: 'Kurikulum PDDIKTI', dosen: 'Rekap SKS Dosen', aturan: 'Aturan MK PDDIKTI' }[s.tab]], judul: 'Pelaporan PDDIKTI',
      badge: ' <span class="badge info sq">' + esc(Dom.perLabel(per)) + '</span>',
      desc: 'Daftar mata kuliah per program studi untuk pelaporan PDDIKTI, diambil dari jadwal final. Semua program kelas digabung sebagai kelas reguler; dosen pengampu hanya dosen ber-NIDN.',
      aksi: App.perToggle() + btnRefresh(false) + '<button class="btn" data-a="excel">' + ic('sheet') + 'Simpan Excel</button><button class="btn btn-accent" data-a="cetak">' + ic('printer') + 'Pratinjau &amp; Cetak</button>' }) +
      '<div class="tabcards">' + [['susun', 'Penyusunan', 'Kode, nama, SKS & dosen NIDN', 'edit'], ['kurikulum', 'Kurikulum PDDIKTI', 'MK terlapor per angkatan', 'book'], ['dosen', 'Rekap SKS Dosen', 'Beban SKS per NIDN', 'users'], ['aturan', 'Aturan MK PDDIKTI', 'Kode, nama & SKS laporan tetap', 'swap']].map(x => '<button class="' + (s.tab === x[0] ? 'on' : '') + '" data-a="nav" data-to="pddikti/' + x[0] + '"><span class="ik">' + ic(x[3]) + '</span><span><b>' + x[1] + '</b><small>' + x[2] + '</small></span></button>').join('') + '</div>';
    this.el.innerHTML = head + (s.tab === 'kurikulum' ? this.vKurikulum(per) : s.tab === 'dosen' ? this.vDosen(per) : s.tab === 'aturan' ? this.vAturan(per) : this.vSusun(per));
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
          '<td><input class="input sm mono" style="width:118px" data-in="f" data-f="KodePddikti" data-k="' + attr(r.key) + '" value="' + attr(r.KodePddikti) + '" maxlength="30"' + dis + '><div class="t-sub mono">kur: ' + esc(r.KodeKur) + (r.aturan ? ' <span class="badge info sq" title="Kode/nama/SKS terisi dari Aturan MK PDDIKTI">aturan</span>' : '') + '</div></td>' +
          '<td style="min-width:220px"><input class="input sm" data-in="f" data-f="NamaMK" data-k="' + attr(r.key) + '" value="' + attr(r.NamaMK) + '" maxlength="160"' + dis + '><div class="t-sub">' + (r.kelas.length ? r.kelas.map(badgeKelas).join(' ') : '<span class="badge err">' + ic('alert', 'ic-sm') + 'tidak ada di jadwal</span>') + '</div></td>' +
          '<td><input class="input sm" type="number" min="0" max="12" style="width:64px" data-in="f" data-f="SKS" data-k="' + attr(r.key) + '" value="' + attr(r.SKS) + '"' + dis + '>' + (r.sksJadwal != null && num(r.SKS, 0) !== num(r.sksJadwal, 0) ? '<div class="t-sub" title="SKS di jadwal kuliah">jadwal ' + r.sksJadwal + '</div>' : '') + '</td>' +
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
      '<div class="row" style="margin:0 2px 10px"><label class="chk"><input type="checkbox" data-ch="ingat" ' + (s.ingat ? 'checked' : '') + '> Ingat perubahan kode / nama / SKS sebagai <a href="#/pddikti/aturan">Aturan MK PDDIKTI</a> (terisi otomatis di semester berikutnya)</label></div>' +
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
    if (Object.keys(this.st.ubahA).length && !(await this.simpanAturan(btn))) return false;
    if (!Object.keys(this.st.ubah).length && this.st.tab === 'aturan') return true;
    const per = App.perAktif(), rows = Pddikti.baris(per, this.st.ubah);
    const kirim = rows.filter(r => r.Status !== 'FINAL' && (this.st.ubah[r.key] || !r.Status || semuaBaru)).map(r => ({ ID: r.ID, Prodi: r.Prodi, Angkatan: r.Angkatan, SmtMhs: r.SmtMhs, KodeKur: r.KodeKur, KurikulumIDs: r.KurikulumIDs, KodePddikti: r.KodePddikti, NamaMK: r.NamaMK, SKS: r.SKS, Dosen1: r.Dosen1, Dosen2: r.Dosen2, Urutan: r.Urutan }));
    if (!kirim.length) { toast('Tidak ada perubahan untuk disimpan.', 'info'); return true; }
    /* (v1.4) ingat kode/nama/SKS yang diubah sebagai aturan MK PDDIKTI (berlaku semester berikutnya) */
    const v = Pddikti.dariJadwal(per), aturan = !this.st.ingat ? [] : Object.keys(this.st.ubah).filter(k => ['KodePddikti', 'NamaMK', 'SKS'].some(f => f in this.st.ubah[k]) && v.has(k)).map(k => {
      const r = rows.find(x => x.key === k), x = v.get(k); if (!r || r.Status === 'FINAL') return null;
      return { Prodi: r.Prodi, KodeKur: r.KodeKur, KodePddikti: r.KodePddikti !== x.KodeKur ? r.KodePddikti : '', NamaMK: r.NamaMK !== x.NamaMK ? r.NamaMK : '', SKS: num(r.SKS, 0) !== num(x.SKS, 0) ? String(r.SKS) : '' };
    }).filter(Boolean);
    const go = (pk) => api('pddikti.simpan', { periode: per, baris: kirim, aturan, base: pk ? undefined : { Pddikti: DB.ver.Pddikti } }, { silent: true });
    let r = await denganSibuk(btn, 'Menyimpan…', () => go(false));
    if (r.code === 'CONFLICT') r = await tanganiKonflik(r, () => go(true));
    if (!r.success) { if (r.code !== 'CONFLICT') { if (r.data && r.data.galat) Modal.buka({ title: 'Belum bisa disimpan', icon: 'alert', body: '<ul style="margin:0;padding-left:18px">' + r.data.galat.slice(0, 40).map(g => '<li>' + esc(g) + '</li>').join('') + '</ul>', foot: '<button class="btn btn-primary" data-close>Tutup</button>' }); else toast(r.message, 'err'); } return false; }
    this.st.ubah = {}; toast(r.message); this.render(); return true;
  },
  /* ---------------- (v1.4) Aturan MK PDDIKTI: kode/nama/SKS laporan per prodi · kode MK ---------------- */
  /** Daftar MK unik per prodi·kode dari kurikulum angkatan aktif + aturan yang tersimpan. */
  daftarAturan() {
    const aktif = new Set(Dom.angkatanAktif()), m = new Map();
    DB.rows('Kurikulum').forEach(k => {
      if (!aktif.has(k.Angkatan)) return;
      const kode = String(k.KodeMK || '').toUpperCase(), key = k.Prodi + '|' + kode;
      if (!m.has(key)) m.set(key, { key, Prodi: k.Prodi, KodeKur: kode, nama: new Map(), sks: new Map(), smt: num(k.Semester, 0) });
      const x = m.get(key); x.nama.set(k.NamaMK, (x.nama.get(k.NamaMK) || 0) + 1);
      const s0 = x.sks.get(k.Kelas); x.sks.set(k.Kelas, s0 === undefined ? num(k.SKS, 0) : Math.max(s0, num(k.SKS, 0)));
      x.smt = Math.min(x.smt || 99, num(k.Semester, 99));
    });
    return [...m.values()].map(x => {
      const nama = [...x.nama.entries()].sort((a, b) => b[1] - a[1])[0][0], at = aturanPddikti(x.Prodi, x.KodeKur) || null, ub = this.st.ubahA[x.key];
      const nilai = (f) => ub && f in ub ? ub[f] : (at ? String(at[f] === undefined ? '' : at[f]) : '');
      return Object.assign(x, { namaKur: nama, sksMaks: Math.max(...x.sks.values()), at, KodePddikti: nilai('KodePddikti'), NamaMK: nilai('NamaMK'), SKS: nilai('SKS') });
    }).sort((a, b) => num((DB.get('Prodi', 'Kode', a.Prodi) || {}).Urutan, 99) - num((DB.get('Prodi', 'Kode', b.Prodi) || {}).Urutan, 99) || a.smt - b.smt || a.KodeKur.localeCompare(b.KodeKur));
  },
  vAturan(per) {
    const s = this.st, semua = this.daftarAturan(), prodi = Dom.prodiSemua().filter(p => semua.some(x => x.Prodi === p.Kode));
    const list = semua.filter(x => (!s.prodiA || x.Prodi === s.prodiA) && (!s.hanyaA || x.at || s.ubahA[x.key]) && cocok(x.KodeKur + ' ' + x.namaKur + ' ' + x.NamaMK + ' ' + x.KodePddikti, s.qA));
    const nAt = semua.filter(x => x.at).length, nU = Object.keys(s.ubahA).length, draf = Pddikti.tersimpan(per).filter(o => o.Status !== 'FINAL');
    return '<div class="kpis">' + kpi({ lb: 'Mata Kuliah Kurikulum', vl: semua.length + '<small>kode MK · ' + prodi.length + ' prodi</small>', ic: 'book' }) + kpi({ lb: 'Punya Aturan PDDIKTI', vl: nAt + '<small>MK</small>', ic: 'report', cls: nAt ? 'ok' : '' }) +
        kpi({ lb: 'Beda SKS Jadwal vs PDDIKTI', vl: semua.filter(x => x.at && x.at.SKS !== '' && num(x.at.SKS) !== x.sksMaks).length + '<small>MK</small>', ic: 'swap' }) + kpi({ lb: 'Belum Disimpan', vl: nU + '<small>perubahan</small>', ic: 'edit', cls: nU ? 'orange' : '' }) + '</div>' +
      '<div class="alert info">' + ic('info') + '<div style="flex:1"><b>Aturan MK PDDIKTI</b> menyimpan kode, nama, dan SKS yang <b>dilaporkan ke PDDIKTI</b> bila berbeda dari jadwal kuliah (mis. Bahasa Inggris ES & HES Smt 1: 2 SKS di jadwal, 4 SKS di PDDIKTI). Berlaku untuk semua kelas &amp; angkatan prodi itu dan terisi otomatis di Penyusunan setiap semester. Kosongkan kolom agar mengikuti kurikulum. Perubahan di tab Penyusunan juga diingat di sini.</div></div>' +
      '<div class="card card-b" style="margin-bottom:14px"><div class="row"><div class="row gap-s"><button class="chip ' + (!s.prodiA ? 'on' : '') + '" data-a="prodiA" data-v="">Semua prodi</button>' + prodi.map(p => '<button class="chip ' + (s.prodiA === p.Kode ? 'on' : '') + '" data-a="prodiA" data-v="' + attr(p.Kode) + '">' + dotProdi(p.Kode) + ' ' + esc(p.Kode) + '</button>').join('') + '</div>' +
        '<label class="chk"><input type="checkbox" data-ch="hanyaA" ' + (s.hanyaA ? 'checked' : '') + '> Hanya yang punya aturan</label><span class="sp"></span>' +
        '<div class="input-ic" style="width:min(240px,100%)">' + ic('search') + '<input class="input" data-in="qA" placeholder="Cari kode / nama MK…" value="' + attr(s.qA) + '"></div>' +
        '<button class="btn" data-a="aturanTpl">' + ic('download') + 'Ekspor Excel</button><button class="btn" data-a="aturanImpor">' + ic('upload') + 'Impor Excel</button>' +
        '<button class="btn" data-a="aturanTerapkan" ' + (draf.length ? '' : 'disabled title="Belum ada draf PDDIKTI di periode ini"') + '>' + ic('refresh') + 'Terapkan ke Draf ' + esc(Dom.perLabel(per)) + '</button>' +
        '<button class="btn btn-primary" data-a="aturanSimpan" ' + (nU ? '' : 'disabled') + '>' + ic('save') + 'Simpan Aturan</button></div></div>' +
      '<div class="card"><div class="tbl-wrap" style="max-height:72vh"><table class="tbl compact pk-at"><thead><tr><th>Prodi</th><th>Smt</th><th>Kode MK</th><th>Nama MK (kurikulum)</th><th>SKS jadwal</th><th>Kode PDDIKTI</th><th>Nama MK PDDIKTI</th><th>SKS PDDIKTI</th></tr></thead><tbody>' +
        (list.map(x => { const kotor = !!s.ubahA[x.key], beda = x.SKS !== '' && num(x.SKS) !== x.sksMaks;
          return '<tr class="' + (kotor ? 'kotor' : '') + '" data-row="' + attr(x.key) + '"><td>' + dotProdi(x.Prodi) + ' <b>' + esc(x.Prodi) + '</b></td><td>' + (x.smt < 99 ? x.smt : '') + '</td><td class="mono">' + esc(x.KodeKur) + '</td><td style="min-width:200px">' + esc(x.namaKur) + (x.nama.size > 1 ? ' <span class="badge sq" title="' + attr([...x.nama.keys()].join(' · ')) + '">' + x.nama.size + ' variasi</span>' : '') + '</td>' +
            '<td class="nowrap" title="' + attr([...x.sks.entries()].map(([k, v]) => k + ': ' + v + ' SKS').join(' · ')) + '">' + (new Set(x.sks.values()).size === 1 ? '<b>' + x.sksMaks + '</b> <span class="t-sub" style="display:inline">semua kelas</span>' : [...x.sks.entries()].map(([k, v]) => '<span class="t-sub" style="display:inline">' + esc(Dom.kelasKode(k)) + '</span> <b>' + v + '</b>').join(' · ')) + '</td>' +
            '<td><input class="input sm mono" style="width:120px" maxlength="30" data-in="at" data-f="KodePddikti" data-k="' + attr(x.key) + '" placeholder="' + attr(x.KodeKur) + '" value="' + attr(x.KodePddikti) + '"></td>' +
            '<td style="min-width:220px"><input class="input sm" maxlength="160" data-in="at" data-f="NamaMK" data-k="' + attr(x.key) + '" placeholder="' + attr(x.namaKur) + '" value="' + attr(x.NamaMK) + '"></td>' +
            '<td><input class="input sm' + (beda ? ' pk-beda' : '') + '" type="number" min="0" max="12" style="width:70px" data-in="at" data-f="SKS" data-k="' + attr(x.key) + '" placeholder="' + x.sksMaks + '" value="' + attr(x.SKS) + '"></td></tr>'; }).join('') ||
          '<tr><td colspan="8">' + kosong('Tidak ada mata kuliah pada filter ini.', 'book') + '</td></tr>') + '</tbody></table></div><div class="card-b faint" style="font-size:12.5px">Menampilkan ' + list.length + ' dari ' + semua.length + ' mata kuliah. Kolom abu-abu (placeholder) = nilai kurikulum yang dipakai bila dikosongkan.</div></div>';
  },
  ubahAt(key, f, v) {
    const x = this.daftarAturan().find(y => y.key === key); if (!x) return;
    const asli = x.at ? String(x.at[f] === undefined ? '' : x.at[f]) : '', u = Object.assign({}, this.st.ubahA[key] || {});
    if (String(v) === asli) delete u[f]; else u[f] = String(v);
    if (Object.keys(u).length) this.st.ubahA[key] = u; else delete this.st.ubahA[key];
    const tr = $('tr[data-row="' + CSS.escape(key) + '"]', this.el); if (tr) tr.classList.toggle('kotor', !!this.st.ubahA[key]);
    const b = $('[data-a="aturanSimpan"]', this.el); if (b) b.disabled = !Object.keys(this.st.ubahA).length;
    App.savebar(this);
  },
  async simpanAturan(btn) {
    const semua = this.daftarAturan(), kirim = Object.keys(this.st.ubahA).map(k => { const x = semua.find(y => y.key === k); return x ? { Prodi: x.Prodi, KodeKur: x.KodeKur, KodePddikti: x.KodePddikti, NamaMK: x.NamaMK, SKS: x.SKS } : null; }).filter(Boolean);
    if (!kirim.length) { this.st.ubahA = {}; return true; }
    const r = await denganSibuk(btn, 'Menyimpan…', () => api('pddiktiMK.simpan', { aturan: kirim }, { silent: true }));
    if (!r.success) { if (r.data && r.data.galat) Modal.buka({ title: 'Aturan belum bisa disimpan', icon: 'alert', body: '<ul style="margin:0;padding-left:18px">' + r.data.galat.slice(0, 40).map(g => '<li>' + esc(g) + '</li>').join('') + '</ul>', foot: '<button class="btn btn-primary" data-close>Tutup</button>' }); else toast(r.message, 'err'); return false; }
    this.st.ubahA = {}; toast(r.message); this.render(); return true;
  },
  /** Perbarui draf periode aktif (belum final) agar kode/nama/SKS mengikuti aturan & kurikulum terbaru. */
  async terapkanAturan(btn) {
    const per = App.perAktif(), v = Pddikti.dariJadwal(per), ubah = [];
    Pddikti.tersimpan(per).forEach(o => {
      if (o.Status === 'FINAL') return;
      const k = Pddikti.kunci(o), x = v.get(k); if (!x) return;
      const d = Pddikti.bawaan(x), beda = d.KodePddikti !== o.KodePddikti || d.NamaMK !== o.NamaMK || num(d.SKS, 0) !== num(o.SKS, 0);
      if (beda) ubah.push({ ID: o.ID, Prodi: o.Prodi, Angkatan: o.Angkatan, SmtMhs: o.SmtMhs, KodeKur: o.KodeKur, KurikulumIDs: o.KurikulumIDs, KodePddikti: d.KodePddikti, NamaMK: d.NamaMK, SKS: d.SKS, Dosen1: o.Dosen1, Dosen2: o.Dosen2, Urutan: o.Urutan });
    });
    if (!ubah.length) return toast('Semua draf ' + Dom.perLabel(per) + ' sudah sesuai aturan.', 'info');
    if (!(await konfirmasi('Perbarui kode/nama/SKS pada <b>' + ubah.length + '</b> baris draf PDDIKTI ' + esc(Dom.perLabel(per)) + ' sesuai aturan & kurikulum terbaru? Baris FINAL tidak diubah; dosen tetap.', { ok: 'Terapkan', icon: 'refresh' }))) return;
    const r = await denganSibuk(btn, 'Menerapkan…', () => api('pddikti.simpan', { periode: per, baris: ubah }));
    if (r.success) { toast(r.message); this.render(); }
  },
  async eksporAturan() {
    const rows = [['Prodi', 'Kode MK', 'Nama MK (kurikulum)', 'SKS jadwal (maks)', 'Kode PDDIKTI', 'Nama MK PDDIKTI', 'SKS PDDIKTI']];
    this.daftarAturan().forEach(x => rows.push([x.Prodi, x.KodeKur, x.namaKur, x.sksMaks, x.at ? x.at.KodePddikti : '', x.at ? x.at.NamaMK : '', x.at ? x.at.SKS : '']));
    await Excel.tulis('Aturan MK PDDIKTI — PENJADWALAN AL WAFA', [{ nama: 'Aturan MK PDDIKTI', rows, lebar: [10, 12, 40, 10, 14, 40, 12] }]);
  },
  imporAturan() {
    pilihBerkas('.xlsx,.xls,.csv').then(async f => {
      if (!f) return;
      let rows; try { rows = Excel.peta(await Excel.baca(f), { Prodi: ['prodi', 'program studi', 'kode prodi'], KodeKur: ['kode mk', 'kode', 'kode mata kuliah', 'kodemk'], KodePddikti: ['kode pddikti', 'kode mk pddikti', 'kode feeder'], NamaMK: ['nama mk pddikti', 'nama pddikti', 'mata kuliah pddikti'], SKS: ['sks pddikti', 'sks feeder', 'sks laporan'] }); } catch (e) { return toast(e.message, 'err'); }
      const pr = Dom.prodiSemua(), kodeP = (x) => { const n = norm(x); const p = pr.find(q => norm(q.Kode) === n || norm(q.Nama) === n); return p ? p.Kode : ''; };
      const aturan = rows.filter(r => r.KodeKur && (r.KodePddikti || r.NamaMK || r.SKS)).map(r => ({ Prodi: kodeP(r.Prodi), KodeKur: r.KodeKur, KodePddikti: r.KodePddikti || '', NamaMK: r.NamaMK || '', SKS: r.SKS || '' }));
      if (!aturan.length) return toast('Tidak ada baris aturan. Kolom yang dibaca: Prodi, Kode MK, Kode PDDIKTI, Nama MK PDDIKTI, SKS PDDIKTI.', 'warn');
      if (!(await konfirmasi('Simpan <b>' + aturan.length + '</b> aturan MK PDDIKTI dari ' + esc(f.name) + '?', { ok: 'Simpan', icon: 'upload' }))) return;
      const r = await api('pddiktiMK.simpan', { aturan }, { silent: true });
      if (r.success) { toast(r.message); this.render(); } else if (r.data && r.data.galat) Modal.buka({ title: 'Sebagian aturan ditolak', icon: 'alert', body: '<ul style="margin:0;padding-left:18px">' + r.data.galat.slice(0, 40).map(g => '<li>' + esc(g) + '</li>').join('') + '</ul>', foot: '<button class="btn btn-primary" data-close>Tutup</button>' }); else toast(r.message, 'err');
    });
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
    prodiA(b) { this.st.prodiA = b.dataset.v; this.render(); },
    aturanSimpan(b) { this.simpanAturan(b); },
    aturanTpl() { this.eksporAturan(); },
    aturanImpor() { this.imporAturan(); },
    aturanTerapkan(b) { this.terapkanAturan(b); },
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
  ch: { d(t) { this.ubahF(t.dataset.k, t.dataset.f, t.value); this.segarRekap(); }, hanyaA(t) { this.st.hanyaA = t.checked; this.render(); }, ingat(t) { this.st.ingat = t.checked; } },
  inp: {
    at(t) { this.ubahAt(t.dataset.k, t.dataset.f, t.value.trim()); },
    qA: debounce(function (t) { this.st.qA = t.value; this.render(); const i = $('[data-in="qA"]', this.el); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250),
    f(t) { this.ubahF(t.dataset.k, t.dataset.f, t.value); clearTimeout(this._rt); this._rt = setTimeout(() => this.segarRekap(), 300); },
    q: debounce(function (t) { this.st.q = t.value; this.render(); const i = $('[data-in="q"]', this.el); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250)
  }
});
