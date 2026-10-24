/* =====================================================================
   PENJADWALAN AL WAFA — pages-data.js
   Agenda Kegiatan Akademik, Ringkasan, Dosen, Mahasiswa, Kurikulum,
   Kalender Akademik.
   ===================================================================== */
'use strict';
/* ---------- komponen bersama ---------- */
function kepala(o) {
  const cr = (o.crumb || []).map((c, i, a) => i === a.length - 1 ? '<b>' + esc(c) + '</b>' : esc(c) + ic('right')).join(' ');
  return (cr ? '<div class="crumb">' + cr + '</div>' : '') + '<div class="ph"><div class="ph-t"><h1>' + o.judul + (o.badge || '') + '</h1>' + (o.desc ? '<p class="desc">' + o.desc + '</p>' : '') + '</div><div class="ph-a">' + (o.aksi || '') + '</div></div>';
}
function btnRefresh(label) { return '<button class="btn" data-a="refresh" title="Muat ulang dari spreadsheet">' + ic('refresh') + (label === false ? '' : 'Refresh') + '</button>'; }
function kpi(o) {
  return '<div class="kpi ' + (o.cls || '') + (o.act ? ' click' : '') + '"' + (o.act ? ' data-a="' + o.act + '"' + (o.v !== undefined ? ' data-v="' + attr(o.v) + '"' : '') : '') + '><div class="lb">' + o.lb + '</div><div class="ik">' + ic(o.ic || 'info') + '</div><div class="vl">' + o.vl + '</div>' +
    (o.ft ? '<div class="ft">' + o.ft + '</div>' : '') + (o.bar !== undefined ? '<div class="bar ' + (o.barCls || '') + '"><i style="width:' + Math.max(0, Math.min(100, o.bar)) + '%"></i></div>' : '') + '</div>';
}
function badgeKelas(nama) { const w = Dom.kelasWarna(nama); return '<span class="kls" style="background:color-mix(in srgb,' + w + ' 14%,transparent);color:' + w + '">' + esc(nama) + '</span>'; }
function dotProdi(kode) { return '<span class="dotc" style="background:' + attr(Dom.prodiWarna(kode)) + '"></span>'; }
function waTampil(v) { const s = String(v || '').replace(/[^0-9]/g, ''); if (!s) return ''; const n = s.startsWith('0') ? '62' + s.slice(1) : s; return '+' + n.slice(0, 2) + ' ' + n.slice(2, 5) + '-' + n.slice(5, 9) + '-' + n.slice(9); }
function waValid(v) { return /^08\d{8,12}$/.test(hp08(v)); }
function hp08(v) { let s = String(v || '').trim().replace(/[^0-9+]/g, '').replace(/^\+/, ''); if (!s) return ''; if (s.startsWith('62')) s = '0' + s.slice(2); else if (s.startsWith('8')) s = '0' + s; return s; }
DB.patch = function (n, key, id, patch) {
  const t = this.raw[n]; if (!t) return;
  const ki = t.h.indexOf(key), row = t.r.find(r => String(r[ki]) === String(id)); if (!row) return;
  Object.keys(patch).forEach(k => { const i = t.h.indexOf(k); if (i >= 0) row[i] = patch[k]; });
  this.set(n, t); App.onData([n]);
};
async function tanganiKonflik(r, ulang) {
  if (r.code !== 'CONFLICT') return r;
  const j = await konfirmasi(r.message, { title: 'Data sudah diubah pengguna lain', icon: 'alert', ok: 'Simpan tetap (timpa)', batal: 'Batal', extra: '<button class="btn" data-a="alt">Muat ulang data terbaru</button>' });
  if (j === true) return ulang();
  if (j === 'alt') { await App.boot(true); toast('Data terbaru dimuat. Periksa lagi lalu simpan.', 'info'); }
  return r;
}

/* =====================================================================
   AGENDA KEGIATAN AKADEMIK (khusus Admin Utama)
   ===================================================================== */
defPage('agenda', {
  admin: true, deps: ['Agenda'], refreshTabel: ['Agenda'],
  st: { filter: 'semua', q: '', hal: 1 },
  status(a) {
    if (a.Selesai === 'YA') return 'done';
    const b = tgl(a.Batas); if (!b) return '';
    const sisa = b - Date.now();
    if (sisa < 0) return 'late';
    if (sisa <= 3 * 86400000) return 'near';
    return '';
  },
  hitungMendesak() { return DB.rows('Agenda').filter(a => ['near', 'late'].includes(this.status(a))).length; },
  render() {
    const rows = DB.rows('Agenda').slice(), st = this.st, s = a => this.status(a);
    const n = { belum: rows.filter(a => a.Selesai !== 'YA').length, near: rows.filter(a => s(a) === 'near').length, late: rows.filter(a => s(a) === 'late').length, done: rows.filter(a => a.Selesai === 'YA').length };
    let list = rows.filter(a => st.filter === 'semua' || (st.filter === 'belum' && a.Selesai !== 'YA') || s(a) === st.filter).filter(a => cocok(a.Judul + ' ' + a.Catatan, st.q));
    list.sort((a, b) => (a.Selesai === 'YA') - (b.Selesai === 'YA') || String(a.Batas).localeCompare(String(b.Batas)));
    const per = 15, tot = list.length; st.hal = Math.min(st.hal, Math.max(1, Math.ceil(tot / per)));
    const lbl = { near: '<span class="badge warn">Mendekati batas</span>', late: '<span class="badge err">Terlambat</span>', done: '<span class="badge ok">Selesai</span>', '': '<span class="badge">Berjalan</span>' };
    this.el.innerHTML = kepala({ crumb: ['Agenda Kegiatan Akademik'], judul: 'Agenda Kegiatan Akademik', badge: ' <span class="badge info sq">' + ic('shield', 'ic-sm') + 'Khusus Admin Utama</span>',
        desc: 'Catatan pribadi pekerjaan beserta waktu mulai dan batas akhirnya. Tidak terhubung ke menu lain dan tidak terlihat oleh Pengguna.',
        aksi: '<button class="btn" data-a="lihat">' + ic('bell') + 'Lihat Pengingat</button>' + btnRefresh() + '<button class="btn btn-primary" data-a="tambah">' + ic('plus') + 'Tambah Agenda</button>' }) +
      '<div class="kpis">' + kpi({ lb: 'Belum Selesai', vl: n.belum, ic: 'hourglass', ft: 'Menunggu diselesaikan', act: 'f', v: 'belum' }) + kpi({ lb: 'Mendekati Batas (H-3)', vl: n.near, ic: 'clock', cls: 'warn', ft: 'Segera tangani', act: 'f', v: 'near' }) +
      kpi({ lb: 'Terlambat', vl: n.late, ic: 'alert', cls: 'err', ft: 'Melewati batas akhir', act: 'f', v: 'late' }) + kpi({ lb: 'Selesai', vl: n.done, ic: 'okc', cls: 'ok', ft: 'Diselesaikan', act: 'f', v: 'done' }) + '</div>' +
      '<div class="card"><div class="card-h"><div class="seg">' + [['semua', 'Semua', rows.length], ['belum', 'Belum Selesai', n.belum], ['near', 'Mendekati Batas', n.near], ['late', 'Terlambat', n.late], ['done', 'Selesai', n.done]].map(x => '<button data-a="f" data-v="' + x[0] + '" class="' + (st.filter === x[0] ? 'on' : '') + '">' + x[1] + ' <small>(' + x[2] + ')</small></button>').join('') + '</div><span class="sp"></span>' +
      '<div class="input-ic" style="width:min(280px,100%)">' + ic('search') + '<input class="input" data-in="q" placeholder="Cari agenda…" value="' + attr(st.q) + '"></div></div>' +
      '<div id="ag-list">' + (list.slice((st.hal - 1) * per, st.hal * per).map(a => {
        const k = s(a);
        return '<div class="ag-item ' + k + '"><button class="ag-check ' + (a.Selesai === 'YA' ? 'on' : '') + '" data-a="cek" data-id="' + attr(a.ID) + '" title="' + (a.Selesai === 'YA' ? 'Batalkan tanda selesai' : 'Tandai selesai') + '">' + ic('check', 'ic-sm') + '</button>' +
          '<div style="flex:1;min-width:0"><div class="ttl">' + esc(a.Judul) + '</div>' + (a.Catatan ? '<div class="muted" style="font-size:13px;margin-top:2px;white-space:pre-line">' + esc(a.Catatan) + '</div>' : '') +
          '<div class="meta">' + (a.Mulai ? '<span>' + ic('cal', 'ic-sm') + ' Mulai ' + esc(fmtTglJam(a.Mulai)) + '</span>' : '') + '<span>' + ic('alarm', 'ic-sm') + ' Batas ' + esc(fmtTglJam(a.Batas)) + (a.Selesai !== 'YA' ? ' · <b>' + esc(relatif(a.Batas)) + '</b>' : '') + '</span>' +
          (a.Selesai === 'YA' && a.WaktuSelesai ? '<span>' + ic('okc', 'ic-sm') + ' Selesai ' + esc(fmtTglJam(a.WaktuSelesai)) + '</span>' : '') + '</div></div>' +
          '<div class="row gap-s">' + lbl[k] + '<button class="btn btn-ghost btn-sm btn-icon" data-a="ubah" data-id="' + attr(a.ID) + '" title="Ubah">' + ic('edit', 'ic-sm') + '</button><button class="btn btn-ghost btn-sm btn-icon" data-a="hapus" data-id="' + attr(a.ID) + '" title="Hapus">' + ic('trash', 'ic-sm') + '</button></div></div>';
      }).join('') || kosong(rows.length ? 'Tidak ada agenda pada filter ini.' : 'Belum ada agenda. Tambahkan pekerjaan beserta batas akhirnya.', 'alarm')) + '</div>' +
      (tot > per ? pagerHtml(tot, st.hal, per, 'agenda') : '') + '</div>';
  },
  acts: {
    f(b) { this.st.filter = b.dataset.v; this.st.hal = 1; this.render(); },
    pg(b) { this.st.hal = +b.dataset.p; this.render(); },
    lihat() { this.popup(true); },
    tambah() { this.form(); },
    ubah(b) { this.form(DB.get('Agenda', 'ID', b.dataset.id)); },
    cek(b) { this.ceklis(b.dataset.id); },
    async hapus(b) {
      const a = DB.get('Agenda', 'ID', b.dataset.id);
      if (!(await konfirmasi('Hapus agenda <b>' + esc(a.Judul) + '</b>?', { danger: true, ok: 'Hapus' }))) return;
      await api('agenda.hapus', { id: a.ID });
    }
  },
  inp: { q: debounce(function (t) { this.st.q = t.value; this.st.hal = 1; this.render(); const i = $('[data-in="q"]', this.el); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250) },
  async ceklis(id) {
    const a = DB.get('Agenda', 'ID', id); if (!a) return;
    const baru = a.Selesai === 'YA' ? 'TIDAK' : 'YA', lama = { Selesai: a.Selesai, WaktuSelesai: a.WaktuSelesai };
    DB.patch('Agenda', 'ID', id, { Selesai: baru, WaktuSelesai: baru === 'YA' ? isoJam() : '' });
    const r = await api('agenda.simpan', { agenda: { ID: id, Selesai: baru } }, { silent: true });
    if (!r.success) { DB.patch('Agenda', 'ID', id, lama); toast(r.message, 'err'); } else toast(r.message);
  },
  form(a) {
    a = a || {};
    const now = new Date(), b = new Date(now.getTime() + 3 * 86400000);
    Modal.buka({ title: a.ID ? 'Ubah Agenda' : 'Tambah Agenda', icon: 'alarm',
      body: '<div class="stack"><div class="field"><label>Judul kegiatan *</label><input class="input" id="ag-j" value="' + attr(a.Judul || '') + '" maxlength="200"></div>' +
        '<div class="field"><label>Catatan (opsional)</label><textarea class="input" id="ag-c" rows="3">' + esc(a.Catatan || '') + '</textarea></div>' +
        '<div class="fgrid c2"><div class="field"><label>Waktu mulai</label><input class="input" type="datetime-local" id="ag-m" value="' + attr(a.Mulai || isoJam(now)) + '"></div>' +
        '<div class="field"><label>Batas akhir *</label><input class="input" type="datetime-local" id="ag-b" value="' + attr(a.Batas || isoTgl(b) + 'T16:00') + '"></div></div></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('save') + 'Simpan</button>',
      acts: { ok: async (btn, e, m) => {
        const d = { ID: a.ID, Judul: $('#ag-j').value.trim(), Catatan: $('#ag-c').value.trim(), Mulai: $('#ag-m').value, Batas: $('#ag-b').value };
        if (!d.Judul) return toast('Judul kegiatan wajib diisi.', 'err');
        if (!d.Batas) return toast('Batas akhir wajib diisi.', 'err');
        if (d.Mulai && d.Batas < d.Mulai) return toast('Batas akhir tidak boleh sebelum waktu mulai.', 'err');
        const r = await denganSibuk(btn, 'Menyimpan…', () => api('agenda.simpan', { agenda: d }));
        if (r.success) { m.close(); toast(r.message); }
      } } });
  },
  /** Pop-up pengingat: saat membuka aplikasi & Refresh; "Ingatkan nanti" = sembunyi sampai besok. */
  popup(paksa) {
    if (!Sesi.admin()) return;
    const list = DB.rows('Agenda').filter(a => ['near', 'late'].includes(this.status(a))).sort(by('Batas'));
    if (!paksa) { if (!list.length) return; if (LS.get('pa:tunda', '') === isoTgl()) return; if ($('.modal-back .rem-pop')) return; }
    const late = list.filter(a => this.status(a) === 'late'), near = list.filter(a => this.status(a) === 'near');
    const item = (a) => { const k = this.status(a), sisa = Math.ceil((tgl(a.Batas) - Date.now()) / 86400000);
      return '<div class="rem-item ' + k + '"><button class="ag-check" data-a="cek" data-id="' + attr(a.ID) + '" title="Tandai selesai">' + ic('check', 'ic-sm') + '</button><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:15px">' + esc(a.Judul) + '</div>' +
        '<div class="muted" style="font-size:12.5px;margin-top:3px">' + (k === 'late' ? '<span style="color:var(--err)">' + ic('alarm', 'ic-sm') + ' Terlewat ' + esc(relatif(a.Batas)) + '</span>' : ic('cal', 'ic-sm') + ' ' + esc(fmtTglJam(a.Batas))) + '</div></div>' + (k === 'near' ? '<span class="badge orange sq">H-' + Math.max(0, sisa) + '</span>' : '') + '</div>'; };
    const body = '<div class="rem-pop">' + (list.length ? '<div class="alert info" style="margin:-4px 0 14px"><div>' + (late.length ? '<b style="color:var(--err)">● ' + late.length + ' agenda terlambat</b>' : '') + (late.length && near.length ? ' · ' : '') + (near.length ? '<b style="color:var(--warn)">' + near.length + ' mendekati batas akhir</b>' : '') + '</div><span class="sp"></span><span class="muted">Prioritas Hari Ini</span></div>' +
      (late.length ? '<div class="lbl" style="color:var(--err);margin-bottom:8px">' + ic('alertc', 'ic-sm') + ' TERLAMBAT</div>' + late.map(item).join('') : '') +
      (near.length ? '<div class="lbl" style="color:var(--warn);margin:12px 0 8px">' + ic('hourglass', 'ic-sm') + ' MENDEKATI BATAS (H-3)</div>' + near.map(item).join('') : '') : kosong('Tidak ada agenda yang mendekati batas atau terlambat. ', 'okc')) + '</div>';
    Modal.buka({ title: 'Pengingat Agenda', sub: list.length ? 'Selesaikan segera (' + list.length + ' agenda mendesak)' : 'Semua aman', icon: 'bell', navy: true, body,
      foot: '<button class="link-btn" data-a="buka" style="margin-right:auto">Buka Agenda Lengkap →</button><button class="btn" data-a="nanti">Ingatkan nanti</button><button class="btn btn-primary" data-close>Tutup</button>',
      acts: {
        cek: async (b) => { b.classList.add('on'); await this.ceklis(b.dataset.id); b.closest('.rem-item').style.opacity = '.45'; },
        nanti: (b, e, m) => { LS.set('pa:tunda', isoTgl()); m.close(); toast('Pengingat disembunyikan sampai besok.', 'info'); },
        buka: (b, e, m) => { m.close(); App.nav('agenda'); }
      } });
  }
});

/* =====================================================================
   RINGKASAN
   ===================================================================== */
defPage('ringkasan', {
  deps: ['Mahasiswa', 'Realisasi', 'Jadwal', 'Dosen', 'Kurikulum', 'Prodi', 'Kelas', 'Angkatan'], refreshTabel: ['Realisasi', 'Jadwal', 'Dosen', 'Kurikulum', 'Mahasiswa'], pakaiPer: true,
  st: { mode: 'kelas', q: '', prodi: '', tanpa: false, hal: 1, buka: {} },
  render() {
    const perKey = App.perAktif(), st = this.st, p = Dom.perObj(perKey);
    const mhs = Dom.mhsAktif(), khusus = mhs.filter(m => m.Kelas === 'Khusus'), aktif = mhs.filter(m => m.Kelas !== 'Khusus');
    const L = aktif.filter(m => m.JK === 'L').length, P = aktif.filter(m => m.JK === 'P').length;
    const dosen = Dom.dosen(), berj = Dom.dosenBerjadwal(perKey), pakaiJadwal = Dom.adaJadwal(perKey);
    const nBerj = pakaiJadwal ? berj.size : Dom.bebanDosen(perKey).size;
    const rombel = Dom.rombelMhs(perKey), perPola = {};
    rombel.forEach(r => { perPola[r.kelas] = (perPola[r.kelas] || 0) + 1; });
    const meta = DB.meta('Mahasiswa');
    let h = kepala({ judul: 'Ringkasan', badge: ' <span class="badge sq">Eksekutif &amp; Akademik</span>', aksi: App.perToggle() + btnRefresh() }) +
      (meta.gagal ? '<div class="alert warn">' + ic('alert') + '<div>' + esc(meta.gagal) + '</div></div>' : '') +
      '<div class="kpis">' +
      kpi({ lb: 'Tahun Akademik', vl: esc(p.ta), ic: 'cal', ft: '<span class="badge ok dot">' + esc(p.smt) + ' · ' + (perKey === App.periode.berjalan.key ? 'Berjalan' : 'Disusun') + '</span>' + (App.periode.persiapan && perKey === App.periode.berjalan.key ? ' <span class="badge orange">Disusun: ' + esc(App.periode.disusun.smt + ' ' + App.periode.disusun.ta) + '</span>' : '') }) +
      kpi({ lb: 'Dosen Berjadwal', vl: nBerj + '<small>/ ' + dosen.length + '</small>', ic: 'idcard', bar: pct(nBerj, dosen.length), ft: '<button class="link-btn" data-a="tanpa">' + (dosen.length - nBerj) + ' dosen tanpa ' + (pakaiJadwal ? 'jadwal' : 'mata kuliah') + ' →</button>' }) +
      kpi({ lb: 'Mahasiswa Aktif', vl: fmtAngka(aktif.length), ic: 'users', ft: '<span class="badge info">L ' + L + '</span> <span class="badge err">P ' + P + '</span> <span class="faint">· Rekap Mahasiswa</span>' }) +
      kpi({ lb: 'Total Kelas', vl: rombel.length, ic: 'building', ft: Object.keys(perPola).map(k => esc(k) + ' ' + perPola[k]).join(' · ') || '—' }) +
      kpi({ lb: 'Kelas Khusus', vl: khusus.length + '<small>mahasiswa</small>', ic: 'pin', cls: 'orange', ft: 'Belum kuliah di kampus · tidak masuk jadwal' }) + '</div>';
    /* grafik per prodi */
    const kelasL = Dom.kelas().map(k => k.Nama);
    const warnaK = (k) => Dom.kelasWarna(k);
    const prodiBars = Dom.prodi().map(pr => {
      const ms = mhs.filter(m => m.Prodi === pr.Kode); if (!ms.length) return '';
      const seg = st.mode === 'kelas' ? kelasL.map(k => ({ n: ms.filter(m => m.Kelas === k).length, c: warnaK(k), t: k })) : [{ n: ms.filter(m => m.JK === 'L').length, c: '#1E40AF', t: 'Laki-laki' }, { n: ms.filter(m => m.JK === 'P').length, c: '#DC2626', t: 'Perempuan' }];
      return '<div class="hbar-row"><div class="top"><b>' + dotProdi(pr.Kode) + ' ' + esc(pr.Nama) + ' ' + (pr.NamaArab ? '<span class="arab faint" style="font-size:12px">(' + esc(pr.NamaArab) + ')</span>' : '') + '</b><small>' + ms.length + ' Mahasiswa</small></div><div class="stack-bar">' +
        seg.filter(s => s.n).map(s => '<i style="flex:' + s.n + ';background:' + s.c + '" title="' + attr(s.t + ': ' + s.n) + '"></i>').join('') + '</div></div>';
    }).join('');
    const leg = st.mode === 'kelas' ? kelasL.map(k => '<span><i style="background:' + warnaK(k) + '"></i>' + esc(k) + '</span>').join('') : '<span><i style="background:#1E40AF"></i>Laki-laki</span><span><i style="background:#DC2626"></i>Perempuan</span>';
    const ang = Dom.angkatanAktif(), maxA = Math.max(1, ...ang.map(a => Math.max(aktif.filter(m => m.Angkatan === a && m.JK === 'L').length, aktif.filter(m => m.Angkatan === a && m.JK === 'P').length)));
    const vbars = ang.map(a => { const l = aktif.filter(m => m.Angkatan === a && m.JK === 'L').length, pp = aktif.filter(m => m.Angkatan === a && m.JK === 'P').length;
      return '<div class="grp"><span class="tot">' + (l + pp) + '</span><div class="bars"><i style="height:' + (l / maxA * 100) + '%;background:#1E40AF" title="L ' + l + '"></i><i style="height:' + (pp / maxA * 100) + '%;background:#DC2626" title="P ' + pp + '"></i></div></div>'; }).join('');
    h += '<div class="grid2" style="margin-bottom:16px"><div class="card"><div class="card-h"><h3>' + ic('layers') + 'Mahasiswa Aktif per Program Studi</h3><span class="sp"></span><div class="seg"><button data-a="mode" data-v="kelas" class="' + (st.mode === 'kelas' ? 'on' : '') + '">Kelas</button><button data-a="mode" data-v="lp" class="' + (st.mode === 'lp' ? 'on' : '') + '">L/P</button></div></div>' +
      '<div class="card-b"><div class="hbar">' + (prodiBars || kosong('Belum ada data mahasiswa. ' + (meta.belumDiatur ? 'Hubungkan Rekap Mahasiswa di Pengaturan.' : ''), 'users')) + '</div><div class="legend" style="margin-top:16px;padding:10px 12px;background:var(--surface-2);border-radius:10px">' + leg + '</div></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + ic('chart') + 'Mahasiswa Aktif per Angkatan</h3><span class="sp"></span><div class="legend"><span><i style="background:#1E40AF"></i>Laki-laki</span><span><i style="background:#DC2626"></i>Perempuan</span></div></div>' +
      '<div class="card-b"><div class="vchart">' + vbars + '</div><div class="vchart-x">' + ang.map(a => '<div><b>' + a + '</b><small>Smt ' + Dom.semMhs(a, perKey) + '</small></div>').join('') + '</div>' +
      '<div class="muted" style="font-size:12.5px;margin-top:12px">Rasio keseluruhan: <b>' + pct(L, L + P) + '% L</b> / <b>' + pct(P, L + P) + '% P</b> · ' + esc(Dom.perLabel(perKey)) + '</div></div></div></div>';
    /* progres pengampu per angkatan */
    const units = Dom.units(perKey);
    h += '<div class="card" style="margin-bottom:16px"><div class="card-h"><h3>' + ic('listcheck') + 'Progres Pengampu per Angkatan Aktif</h3><span class="sp"></span><span class="badge">Total terbuka: ' + units.length + ' MK</span><div class="sub">Klik "Belum diampu" untuk membuka Realisasi Kurikulum yang sudah terfilter pada angkatan itu.</div></div><div class="card-b stack" style="gap:10px">' +
      ang.map(a => {
        const u = units.filter(x => x.angkatan === a), sudah = u.filter(x => x.dosen.length).length, belum = u.length - sudah, pr = pct(sudah, u.length), smt = Dom.semMhs(a, perKey);
        const buka = st.buka[a];
        const det = buka ? '<div class="prog-detail">' + Dom.prodi().map(pr2 => Dom.kelasProdi(pr2.Kode).map(k => { const x = u.filter(y => y.prodi === pr2.Kode && y.kelas === k.Nama); if (!x.length) return ''; const s2 = x.filter(y => y.dosen.length).length;
          return '<div>' + dotProdi(pr2.Kode) + '<span style="width:260px">' + esc(pr2.Nama) + ' · ' + esc(k.Nama) + '</span><div class="bar ' + (s2 === x.length ? 'ok' : '') + '"><i style="width:' + pct(s2, x.length) + '%"></i></div><span>' + s2 + '/' + x.length + ' diampu</span>' + (s2 < x.length ? '<button class="link-btn" data-a="belum" data-v="' + a + '">' + (x.length - s2) + ' belum →</button>' : '') + '</div>'; }).join('')).join('') + '</div>' : '';
        return '<div><div class="prog-row"><div class="yr">\'' + String(a).slice(2) + '</div><div style="min-width:150px"><b>Angkatan ' + a + '</b><div class="muted" style="font-size:12px">Semester ' + smt + ' (Tingkat ' + Dom.tingkat(smt) + ')</div></div>' +
          '<span class="badge">MK dibuka ' + u.length + '</span><span class="badge ok">Sudah diampu ' + sudah + ' (' + pr + '%)</span>' + (belum ? '<button class="badge warn" style="border:0;cursor:pointer" data-a="belum" data-v="' + a + '">Belum diampu ' + belum + ' (' + pct(belum, u.length) + '%)</button>' : '<span class="badge">Belum diampu 0</span>') +
          '<div class="bar ' + (pr === 100 ? 'ok' : '') + '"><i style="width:' + pr + '%"></i></div><button class="btn btn-ghost btn-sm btn-icon" data-a="rinci" data-v="' + a + '" title="Rinci per prodi & kelas">' + ic(buka ? 'up' : 'down', 'ic-sm') + '</button></div>' + det + '</div>';
      }).join('') + '</div></div>';
    /* tabel beban dosen */
    const beban = Dom.bebanDosen(perKey);
    let list = dosen.map(d => ({ d, mk: (beban.get(d.ID) || []).slice().sort(Dom.rombelUrut) }))
      .filter(x => st.tanpa ? true : x.mk.length)
      .filter(x => !st.prodi || x.mk.some(u => u.prodi === st.prodi))
      .filter(x => !st.q || cocok(x.d.Nama + ' ' + x.d.NIDN + ' ' + x.mk.map(u => u.kur.NamaMK + ' ' + u.kur.KodeMK).join(' '), st.q));
    list.sort((a, b) => b.mk.length - a.mk.length || norm(a.d.Nama).localeCompare(norm(b.d.Nama)));
    const per = 10, tot = list.length; st.hal = Math.min(st.hal, Math.max(1, Math.ceil(tot / per)));
    h += '<div class="card"><div class="card-h"><h3>' + ic('clipboard') + 'Beban Mengajar Dosen</h3><div class="sub">Pemantauan beban SKS dosen pengampu pada ' + esc(Dom.perLabel(perKey)) + '.</div><span class="sp" style="flex-basis:100%;height:0"></span>' +
      '<div class="input-ic" style="flex:1 1 220px">' + ic('search') + '<input class="input" data-in="q" placeholder="Cari dosen atau mata kuliah…" value="' + attr(st.q) + '"></div>' +
      '<select class="input" style="width:auto" data-ch="prodi"><option value="">Semua Prodi</option>' + opsi(Dom.prodi().map(x => ({ v: x.Kode, l: x.Nama })), st.prodi) + '</select>' +
      '<label class="chk"><input type="checkbox" data-ch="tanpa" ' + (st.tanpa ? 'checked' : '') + '> Tampilkan dosen tanpa mata kuliah</label></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="num">No</th><th>Dosen (Nama &amp; NIDN)</th><th>Mata Kuliah yang Diampu</th><th class="right">Jumlah SKS</th></tr></thead><tbody>' +
      (list.slice((st.hal - 1) * per, st.hal * per).map((x, i) => '<tr><td class="num">' + ((st.hal - 1) * per + i + 1) + '</td><td style="min-width:220px"><b>' + esc(x.d.Nama) + '</b><div class="t-sub">NIDN ' + esc(x.d.NIDN || '-') + '</div>' + (x.d.Keterangan ? '<span class="badge dot" style="margin-top:4px">' + esc(x.d.Keterangan) + '</span>' : '') + '</td>' +
        '<td style="min-width:340px">' + (x.mk.length ? '<ol style="margin:0;padding-left:18px;display:grid;gap:5px">' + x.mk.map(u => '<li><b>' + esc(u.kur.NamaMK) + '</b> <span class="muted">— ' + esc(Dom.prodiNama(u.prodi)) + ' · Semester ' + u.smt + '</span> ' + badgeKelas(u.kelas) + '</li>').join('') + '</ol>' : '<span class="faint">Belum mengampu mata kuliah</span>') + '</td>' +
        '<td class="right"><span class="badge info" style="font-size:14px;height:30px;padding:0 12px">' + x.mk.reduce((a, u) => a + u.sks, 0) + ' SKS</span></td></tr>').join('') || '<tr><td colspan="4">' + kosong('Tidak ada data dosen pada filter ini.', 'users') + '</td></tr>') +
      '</tbody></table></div>' + (tot > per ? pagerHtml(tot, st.hal, per, 'dosen') : '') + '</div>';
    this.el.innerHTML = h;
  },
  acts: {
    mode(b) { this.st.mode = b.dataset.v; this.render(); },
    tanpa() { this.st.tanpa = true; this.render(); const t = $('.tbl', this.el); t && t.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
    rinci(b) { this.st.buka[b.dataset.v] = !this.st.buka[b.dataset.v]; this.render(); },
    belum(b) { App.nav('realisasi', { angkatan: b.dataset.v, status: 'belum', periodeDari: App.perAktif() }); },
    pg(b) { this.st.hal = +b.dataset.p; this.render(); }
  },
  ch: { prodi(t) { this.st.prodi = t.value; this.st.hal = 1; this.render(); }, tanpa(t) { this.st.tanpa = t.checked; this.st.hal = 1; this.render(); } },
  inp: { q: debounce(function (t) { this.st.q = t.value; this.st.hal = 1; this.render(); const i = $('[data-in="q"]', this.el); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250) }
});

/* =====================================================================
   DOSEN
   ===================================================================== */
defPage('dosen', {
  deps: ['Dosen', 'Jadwal', 'Realisasi', 'JamSesi'], refreshTabel: ['Dosen', 'Jadwal'],
  st: { q: '', pola: '', isi: 'semua', hal: 1, ubah: {}, baru: [], hapus: {} },
  onParams(p, args) { if (args && args.q !== undefined) { this.st.q = args.q; this.st.hal = 1; } },
  isDirty() { const s = this.st; return Object.keys(s.ubah).length + s.baru.length + Object.keys(s.hapus).length > 0; },
  dirtyInfo() { const s = this.st, n = Object.keys(s.ubah).length + s.baru.length + Object.keys(s.hapus).length; return { judul: n + ' perubahan data dosen belum disimpan', sub: 'Tekan Simpan Perubahan agar tersimpan di server.' }; },
  buang() { this.st.ubah = {}; this.st.baru = []; this.st.hapus = {}; this.render(); App.savebar(this); },
  daftar() {
    const s = this.st, out = Dom.dosen().filter(d => !s.hapus[d.ID]).map(d => Object.assign({}, d, s.ubah[d.ID] || {}, { _kotor: !!s.ubah[d.ID] }));
    return out.concat(s.baru.map(b => Object.assign({ _kotor: true, _baru: true }, b)));
  },
  sediaDari(d, pola) { try { return new Set(Array.isArray(d['Sedia' + pola]) ? d['Sedia' + pola] : JSON.parse(d['Sedia' + pola] || '[]')); } catch (e) { return new Set(); } },
  render() {
    const s = this.st, all = this.daftar(), per = App.periode.disusun.key, berj = Dom.dosenBerjadwal(per), adaJ = Dom.adaJadwal(per), beban = Dom.bebanDosen(per);
    const terisi = d => this.sediaDari(d, 'Reguler').size + this.sediaDari(d, 'Hybrid').size > 0;
    const nIsi = all.filter(terisi).length;
    const punya = d => adaJ ? berj.has(d.ID) : beban.has(d.ID);
    let list = all.filter(d => cocok(d.Nama + ' ' + d.NIDN + ' ' + d.WA, s.q))
      .filter(d => !s.pola || this.sediaDari(d, s.pola).size > 0)
      .filter(d => s.isi === 'semua' || (s.isi === 'sudah' ? terisi(d) : !terisi(d)));
    const pp = 10, tot = list.length; s.hal = Math.min(s.hal, Math.max(1, Math.ceil(tot / pp)));
    const nKotor = Object.keys(s.ubah).length + s.baru.length + Object.keys(s.hapus).length;
    const hariRingkas = (set, pola) => Dom.hariPola(pola).map(h => { const on = [...set].some(k => k.startsWith(h + '|')); return '<span class="dpill ' + (on ? 'on' : '') + '">' + h.slice(0, 3) + '</span>'; }).join(' ');
    this.el.innerHTML = kepala({ crumb: ['Data', 'Dosen'], judul: 'Dosen', badge: ' <span class="badge info sq">' + esc(Dom.perLabel(per)) + '</span>', desc: 'Kelola data dosen pengampu dan ketersediaan sesi mengajar per pola jam.',
        aksi: '<button class="btn" data-a="template">' + ic('download') + 'Unduh Template</button><button class="btn" data-a="unggah">' + ic('sheet') + 'Unggah Excel</button>' + btnRefresh(false) +
          '<button class="btn btn-soft" data-a="tambah">' + ic('plus') + 'Tambah Dosen</button><button class="btn btn-primary" data-a="simpan" ' + (nKotor ? '' : 'disabled') + '>' + ic('save') + 'Simpan Perubahan' + (nKotor ? ' <span class="cnt">' + nKotor + '</span>' : '') + '</button>' }) +
      '<div class="kpis">' + kpi({ lb: 'Total Dosen', vl: all.length + '<small>dosen</small>', ic: 'users', ft: 'Terdaftar dalam sistem' }) +
      kpi({ lb: 'Ketersediaan Terisi', vl: nIsi + '<small>' + pct(nIsi, all.length) + '%</small>', ic: 'okc', cls: 'ok', bar: pct(nIsi, all.length), barCls: 'ok' }) +
      kpi({ lb: 'Belum Mengisi', vl: (all.length - nIsi) + '<small>dosen</small>', ic: 'alert', cls: 'warn', ft: 'Perlu tindak lanjut', act: 'isi', v: 'belum' }) +
      kpi({ lb: 'Punya Jadwal', vl: all.filter(punya).length + '<small>dari ' + all.length + '</small>', ic: 'cal', ft: adaJ ? 'Aktif mengajar ' + esc(Dom.perLabel(per)) : 'Mengampu MK (jadwal belum disimpan)' }) + '</div>' +
      '<div class="card"><div class="card-h"><div class="input-ic" style="flex:1 1 240px">' + ic('search') + '<input class="input" data-in="q" placeholder="Cari nama dosen atau NIDN…" value="' + attr(s.q) + '"></div>' +
      '<select class="input" style="width:auto" data-ch="pola"><option value="">Pola: Semua</option>' + opsi(['Reguler', 'Hybrid'].map(v => ({ v, l: 'Pola: ' + v })), s.pola) + '</select><span class="sp"></span>' +
      '<div class="seg">' + [['semua', 'Semua', all.length], ['sudah', 'Sudah diisi', nIsi], ['belum', 'Belum diisi', all.length - nIsi]].map(x => '<button data-a="isi" data-v="' + x[0] + '" class="' + (s.isi === x[0] ? 'on' : '') + '">' + x[1] + ' <small>(' + x[2] + ')</small></button>').join('') + '</div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="num">No</th><th>Dosen &amp; NIDN</th><th>Nomor WhatsApp</th><th>Ketersediaan Mengajar</th><th>Status Jadwal</th><th class="right">Aksi</th></tr></thead><tbody>' +
      (list.slice((s.hal - 1) * pp, s.hal * pp).map((d, i) => {
        const r = this.sediaDari(d, 'Reguler'), hy = this.sediaDari(d, 'Hybrid'), ok = waValid(d.WA), key = d.ID || d._tmp;
        return '<tr class="' + (d._kotor ? 'kotor' : '') + '"><td class="num">' + String((s.hal - 1) * pp + i + 1).padStart(2, '0') + '</td>' +
          '<td style="min-width:240px"><div class="row" style="flex-wrap:nowrap"><div class="avatar">' + esc(inisial(d.Nama)) + '</div><div><b>' + esc(d.Nama) + '</b>' + (d._baru ? ' <span class="badge orange">Baru</span>' : '') + '<div class="t-sub">NIDN: ' + esc(d.NIDN || '-') + (d.Keterangan ? ' · ' + esc(d.Keterangan) : '') + '</div></div></div></td>' +
          '<td class="nowrap">' + (d.WA ? (ok ? '<span class="mono">' + esc(waTampil(d.WA)) + '</span> <span style="color:#16A34A">' + ic('okc', 'ic-sm') + '</span>' + (d.StatusWA ? '<div class="t-sub">' + esc(d.StatusWA) + '</div>' : '') : '<span class="mono" style="color:var(--err)">' + esc(d.WA) + '</span> <span class="badge err sq">Format salah</span>') : '<span class="faint">—</span>') + '</td>' +
          '<td style="min-width:250px;cursor:pointer" data-a="sedia" data-id="' + attr(key) + '" title="Klik untuk mengatur ketersediaan">' + (r.size + hy.size ? '<div class="row gap-s" style="flex-wrap:nowrap"><small class="faint" style="width:52px">Reguler:</small>' + (r.size ? hariRingkas(r, 'Reguler') + ' <small>' + r.size + ' sesi</small>' : '<i class="faint" style="font-size:12px">Tidak bersedia reguler</i>') + '</div>' +
            '<div class="row gap-s" style="flex-wrap:nowrap;margin-top:4px"><small class="faint" style="width:52px">Hybrid:</small>' + (hy.size ? hariRingkas(hy, 'Hybrid') + ' <small>' + hy.size + ' sesi</small>' : '<i class="faint" style="font-size:12px">Tidak bersedia hybrid</i>') + '</div>' :
            '<span class="badge warn">' + ic('clock', 'ic-sm') + 'Belum diisi</span>') + '</td>' +
          '<td>' + (d._baru ? '<span class="faint">—</span>' : punya(d) ? '<span class="badge ok dot">Punya jadwal</span>' : '<span class="badge dot">Tanpa jadwal</span>') + '</td>' +
          '<td class="right nowrap"><button class="btn btn-sm ' + (r.size + hy.size ? 'btn-soft' : 'btn-accent') + '" data-a="sedia" data-id="' + attr(key) + '">' + ic('clock', 'ic-sm') + (r.size + hy.size ? 'Atur Sesi' : 'Isi Sekarang') + '</button> ' +
          '<button class="btn btn-ghost btn-sm btn-icon" data-a="ubah" data-id="' + attr(key) + '" title="Ubah">' + ic('edit', 'ic-sm') + '</button><button class="btn btn-ghost btn-sm btn-icon" data-a="hapus" data-id="' + attr(key) + '" title="Hapus">' + ic('trash', 'ic-sm') + '</button></td></tr>';
      }).join('') || '<tr><td colspan="6">' + kosong(all.length ? 'Tidak ada dosen pada filter ini.' : 'Belum ada data dosen. Unggah Excel atau tambah dosen.', 'users') + '</td></tr>') +
      '</tbody></table></div>' + (tot > pp ? pagerHtml(tot, s.hal, pp, 'dosen') : '') + '</div>';
    App.savebar(this);
  },
  cari(key) { return this.daftar().find(d => (d.ID || d._tmp) === key); },
  stage(key, patch) {
    const s = this.st, b = s.baru.find(x => x._tmp === key);
    if (b) Object.assign(b, patch);
    else s.ubah[key] = Object.assign({}, s.ubah[key] || {}, patch);
    this.render();
  },
  acts: {
    isi(b) { this.st.isi = b.dataset.v; this.st.hal = 1; this.render(); },
    pg(b) { this.st.hal = +b.dataset.p; this.render(); },
    tambah() { this.form(null); },
    ubah(b) { this.form(this.cari(b.dataset.id)); },
    sedia(b) { this.modalSedia(this.cari(b.dataset.id)); },
    async hapus(b) {
      const d = this.cari(b.dataset.id); if (!d) return;
      if (!(await konfirmasi('Hapus dosen <b>' + esc(d.Nama) + '</b>? Perubahan baru berlaku setelah Simpan Perubahan.', { danger: true, ok: 'Hapus' }))) return;
      if (d._baru) this.st.baru = this.st.baru.filter(x => x._tmp !== d._tmp); else { this.st.hapus[d.ID] = true; delete this.st.ubah[d.ID]; }
      this.render();
    },
    simpan(b) { this.simpan(b); },
    template() { Excel.tulis('Template Dosen — PENJADWALAN AL WAFA', [{ nama: 'Dosen', rows: [['Nama', 'NIDN', 'Nomor WA'], ['Ust. Dr. Contoh Nama, Lc., M.A.', '2100000001', '081234567890']], lebar: [40, 16, 18] }]); },
    async unggah() { this.unggah(); }
  },
  ch: { pola(t) { this.st.pola = t.value; this.st.hal = 1; this.render(); } },
  inp: { q: debounce(function (t) { this.st.q = t.value; this.st.hal = 1; this.render(); const i = $('[data-in="q"]', this.el); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250) },
  async simpan(btn) {
    const s = this.st;
    const ubah = Object.keys(s.ubah).map(id => { const d = Object.assign({}, DB.get('Dosen', 'ID', id), s.ubah[id]); return { ID: id, Nama: d.Nama, NIDN: d.NIDN, WA: d.WA, Keterangan: d.Keterangan, SediaReguler: [...this.sediaDari(d, 'Reguler')], SediaHybrid: [...this.sediaDari(d, 'Hybrid')] }; })
      .concat(s.baru.map(d => ({ Nama: d.Nama, NIDN: d.NIDN, WA: d.WA, Keterangan: d.Keterangan, SediaReguler: [...this.sediaDari(d, 'Reguler')], SediaHybrid: [...this.sediaDari(d, 'Hybrid')] })));
    const r = await denganSibuk(btn, 'Menyimpan…', () => api('dosen.simpan', { ubah, hapus: Object.keys(s.hapus) }));
    if (!r.success) return false;
    s.ubah = {}; s.baru = []; s.hapus = {};
    toast(r.message); this.render(); return true;
  },
  form(d) {
    const baru = !d; d = d || {};
    Modal.buka({ title: baru ? 'Tambah Dosen' : 'Ubah Data Dosen', icon: 'user',
      body: '<div class="stack"><div class="field"><label>Nama dosen (lengkap dengan gelar) *</label><input class="input" id="ds-n" value="' + attr(d.Nama || '') + '"></div>' +
        '<div class="fgrid c2"><div class="field"><label>NIDN</label><input class="input" id="ds-i" value="' + attr(d.NIDN || '') + '" inputmode="numeric"></div>' +
        '<div class="field"><label>Nomor WhatsApp</label><input class="input" id="ds-w" value="' + attr(d.WA || '') + '" inputmode="tel" placeholder="0812xxxxxxxx"><span class="help" id="ds-wh">Dirapikan otomatis ke format 62… untuk Blast WA.</span></div></div>' +
        '<div class="field"><label>Keterangan (opsional)</label><input class="input" id="ds-k" value="' + attr(d.Keterangan || '') + '" placeholder="mis. Dosen Tetap Prodi HES"></div></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('check') + (baru ? 'Tambahkan' : 'Terapkan') + '</button>',
      onInput: (e) => { if (e.target.id === 'ds-w') { const v = e.target.value, ok = !v || waValid(v); $('#ds-wh').textContent = !v ? 'Dirapikan otomatis ke format 62… untuk Blast WA.' : ok ? 'Akan dikirim ke ' + waTampil(hp08(v)) : 'Format belum benar (contoh 0812 3456 7890).'; $('#ds-wh').style.color = ok ? '' : 'var(--err)'; } },
      acts: { ok: (b, e, m) => {
        const nama = $('#ds-n').value.trim(), wa = $('#ds-w').value.trim(), nidn = $('#ds-i').value.trim().replace(/\s/g, '');
        if (!nama) return toast('Nama dosen wajib diisi.', 'err');
        if (wa && !waValid(wa)) return toast('Format nomor WA tidak valid.', 'err');
        const dup = this.daftar().find(x => x !== d && (x.ID || x._tmp) !== (d.ID || d._tmp) && ((nidn && x.NIDN === nidn) || norm(x.Nama) === norm(nama)));
        if (dup) return toast('Data ganda: ' + dup.Nama + (nidn && dup.NIDN === nidn ? ' (NIDN sama)' : ''), 'err');
        const patch = { Nama: nama, NIDN: nidn, WA: hp08(wa), Keterangan: $('#ds-k').value.trim() };
        if (baru) this.st.baru.push(Object.assign({ _tmp: 'BARU-' + uid(6), SediaReguler: '[]', SediaHybrid: '[]' }, patch)); else this.stage(d.ID || d._tmp, patch);
        m.close(); this.render(); toast('Diterapkan. Tekan Simpan Perubahan untuk menyimpan.', 'info');
      } } });
  },
  modalSedia(d) {
    if (!d) return;
    const key = d.ID || d._tmp, sel = { Reguler: this.sediaDari(d, 'Reguler'), Hybrid: this.sediaDari(d, 'Hybrid') };
    const slR = Dom.slots('Reguler'), slH = Dom.slots('Hybrid'), hariR = Dom.hariPola('Reguler'), sesiR = Dom.sesiPola('Reguler');
    const cell = (pola, k, label) => '<div class="avail-cell ' + (sel[pola].has(k) ? 'on' : '') + '" data-a="tg" data-p="' + pola + '" data-k="' + attr(k) + '">' + ic(sel[pola].has(k) ? 'check' : 'x') + '<span>' + (label || (sel[pola].has(k) ? 'Bisa' : 'Sibuk')) + '</span></div>';
    const isi = () => '<div class="row" style="margin-bottom:14px;padding:10px 12px;background:var(--surface-2);border-radius:12px"><span class="lbl">OPSI CEPAT:</span><button class="btn btn-sm" data-a="cepat" data-v="pagi">Semua Pagi (Sesi 1–2)</button><button class="btn btn-sm" data-a="cepat" data-v="siang">Semua Siang (Sesi 3–4)</button><button class="btn btn-sm" data-a="cepat" data-v="hybrid">Semua Hybrid</button><button class="btn btn-sm btn-ghost" data-a="cepat" data-v="reset" style="color:var(--err)">Reset Semua</button></div>' +
      '<div class="row" style="margin-bottom:8px"><b>' + dotProdi('') + ' A. Pola Reguler · ' + esc(hariR[0] + '–' + hariR[hariR.length - 1]) + '</b><span class="muted">(Kelas Reguler &amp; Ma\'had Aly)</span><span class="sp"></span><b style="color:var(--primary)" id="ns-r">' + sel.Reguler.size + ' sesi dipilih</b></div>' +
      '<div class="tbl-wrap" style="margin-bottom:18px"><div class="avail-grid" style="grid-template-columns:110px repeat(' + hariR.length + ',minmax(72px,1fr));min-width:520px"><div class="lbl">WAKTU &amp; SESI</div>' + hariR.map(h => '<div class="lbl center">' + h.toUpperCase() + '</div>').join('') +
      sesiR.map(sn => { const s0 = slR.find(x => x.sesi === sn); return '<div><b>Sesi ' + sn + '</b><div class="t-sub">' + (s0 ? s0.mulai + '–' + s0.selesai : '') + '</div></div>' + hariR.map(h => slR.find(x => x.hari === h && x.sesi === sn) ? cell('Reguler', h + '|' + sn) : '<div></div>').join(''); }).join('') + '</div></div>' +
      '<div class="row" style="margin-bottom:8px"><b>B. Pola Hybrid · ' + esc(Dom.hariPola('Hybrid').join(' & ')) + '</b><span class="muted">(Kelas Hybrid)</span><span class="sp"></span><b style="color:var(--accent-h)" id="ns-h">' + sel.Hybrid.size + ' sesi dipilih</b></div>' +
      '<div class="grid2">' + Dom.hariPola('Hybrid').map(h => '<div class="card card-b" style="background:var(--surface-2)"><div class="row" style="margin-bottom:8px"><b>' + h + '</b><span class="sp"></span><small class="muted">' + slH.filter(x => x.hari === h).length + ' sesi</small></div><div class="avail-grid" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">' +
        slH.filter(x => x.hari === h).map(s => cell('Hybrid', s.key, 'Sesi ' + s.sesi + ' · ' + s.mulai + '–' + s.selesai)).join('') + '</div></div>').join('') + '</div>';
    const m = Modal.buka({ title: esc(d.Nama), sub: 'NIDN ' + esc(d.NIDN || '-') + ' · Ketersediaan untuk ' + esc(Dom.perLabel(App.periode.disusun.key)), icon: 'cal', size: 'lg', body: '<div id="sd-body">' + isi() + '</div>',
      foot: '<span class="muted" id="sd-tot" style="margin-right:auto">Reguler ' + sel.Reguler.size + ' sesi · Hybrid ' + sel.Hybrid.size + ' sesi</span><button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('okc') + 'Simpan Ketersediaan</button>',
      acts: {
        tg: (b) => { const set = sel[b.dataset.p], k = b.dataset.k; set.has(k) ? set.delete(k) : set.add(k); ulang(); },
        cepat: (b) => { const v = b.dataset.v;
          if (v === 'reset') { sel.Reguler.clear(); sel.Hybrid.clear(); }
          else if (v === 'hybrid') slH.forEach(s => sel.Hybrid.add(s.key));
          else slR.forEach(s => { if ((v === 'pagi' && s.sesi <= 2) || (v === 'siang' && s.sesi >= 3)) sel.Reguler.add(s.key); });
          ulang(); },
        ok: (b, e, mm) => { this.stage(key, { SediaReguler: JSON.stringify([...sel.Reguler]), SediaHybrid: JSON.stringify([...sel.Hybrid]) }); mm.close(); toast('Ketersediaan diterapkan. Tekan Simpan Perubahan untuk menyimpan.', 'info'); }
      } });
    function ulang() { $('#sd-body', m.el).innerHTML = isi(); $('#sd-tot', m.el).textContent = 'Reguler ' + sel.Reguler.size + ' sesi · Hybrid ' + sel.Hybrid.size + ' sesi · ' + (sel.Reguler.size + sel.Hybrid.size) + ' total'; }
  },
  async unggah() {
    const f = await pilihBerkas('.xlsx,.xls,.csv'); if (!f) return;
    let rows;
    try { rows = Excel.peta(await Excel.baca(f), { Nama: ['nama', 'nama dosen', 'nama lengkap'], NIDN: ['nidn', 'nidn nip', 'nip', 'nidn nidk'], WA: ['nomor wa', 'no wa', 'wa', 'whatsapp', 'nomor whatsapp', 'no hp', 'hp', 'nomor hp'], Keterangan: ['keterangan', 'status'] }); }
    catch (e) { return toast(e.message, 'err'); }
    if (!rows.length) return toast('Tidak ada baris data di berkas. Pastikan baris pertama berisi judul kolom Nama, NIDN, Nomor WA.', 'err');
    const cekL = rows.map(r => { const al = []; if (!r.Nama) al.push('nama kosong'); if (r.WA && !waValid(r.WA)) al.push('format WA salah'); if (r.NIDN && !/^[0-9A-Za-z.-]{4,20}$/.test(r.NIDN.replace(/\s/g, ''))) al.push('format NIDN salah'); return al; });
    Modal.buka({ title: 'Unggah Excel Dosen', sub: esc(f.name) + ' · ' + rows.length + ' baris', icon: 'sheet', size: 'lg',
      body: '<div class="alert info">' + ic('info') + '<div>Kolom dibaca: Nama, NIDN, Nomor WA. Ketersediaan diisi di aplikasi. <b>Data ganda dan format salah akan ditolak</b> dengan pesan jelas.</div></div>' +
        '<div class="tbl-wrap" style="max-height:46vh"><table class="tbl compact"><thead><tr><th>Baris</th><th>Nama</th><th>NIDN</th><th>Nomor WA</th><th>Periksa</th></tr></thead><tbody>' +
        rows.map((r, i) => '<tr class="' + (cekL[i].length ? 'err' : '') + '"><td class="num">' + r._baris + '</td><td>' + esc(r.Nama) + '</td><td>' + esc(r.NIDN) + '</td><td class="mono">' + esc(r.WA) + '</td><td>' + (cekL[i].length ? '<span class="badge err">' + esc(cekL[i].join(', ')) + '</span>' : '<span class="badge ok">OK</span>') + '</td></tr>').join('') + '</tbody></table></div>' +
        '<label class="chk" style="margin-top:12px"><input type="checkbox" id="up-perbarui"> Perbarui NIDN/WA dosen yang sudah terdaftar (bukan ditolak sebagai ganda)</label>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('upload') + 'Unggah ' + rows.length + ' baris</button>',
      acts: { ok: async (b, e, m) => {
        const r = await denganSibuk(b, 'Mengunggah…', () => api('dosen.import', { rows, mode: $('#up-perbarui').checked ? 'perbarui' : 'tambah' }));
        if (!r.success) return;
        m.close();
        const d = r.data;
        Modal.buka({ title: 'Hasil unggah', icon: 'okc', body: '<div class="kpis" style="grid-template-columns:repeat(3,1fr)">' + kpi({ lb: 'Ditambahkan', vl: d.ditambah, ic: 'plus', cls: 'ok' }) + kpi({ lb: 'Diperbarui', vl: d.diperbarui, ic: 'edit' }) + kpi({ lb: 'Ditolak', vl: d.ditolak.length, ic: 'x', cls: d.ditolak.length ? 'err' : '' }) + '</div>' +
          (d.ditolak.length ? '<div class="tbl-wrap" style="max-height:40vh"><table class="tbl compact"><thead><tr><th>Baris</th><th>Nama</th><th>Alasan ditolak</th></tr></thead><tbody>' + d.ditolak.map(x => '<tr><td class="num">' + x.baris + '</td><td>' + esc(x.nama || '') + '</td><td>' + esc(x.alasan) + '</td></tr>').join('') + '</tbody></table></div>' : ''),
          foot: '<button class="btn btn-primary" data-close>Selesai</button>' });
      } } });
  }
});

/* =====================================================================
   MAHASISWA (hanya lihat — dari Rekap Mahasiswa)
   ===================================================================== */
defPage('mahasiswa', {
  deps: ['Mahasiswa', 'Prodi', 'Kelas', 'Angkatan'], refreshTabel: ['Mahasiswa'],
  st: { nim: '', nama: '', prodi: '', kelas: '', angkatan: '', status: 'Aktif', jk: '', hal: 1, tutupAnomali: false },
  render() {
    const s = this.st, meta = DB.meta('Mahasiswa'), semua = Dom.mhs(), per = App.periode.berjalan.key;
    const aktif = semua.filter(m => m.Status === 'Aktif'), akt = aktif.filter(m => m.Kelas !== 'Khusus'), khusus = aktif.filter(m => m.Kelas === 'Khusus');
    let list = semua.filter(m => (!s.nim || String(m.NIM).includes(s.nim)) && cocok(m.Nama, s.nama) && (!s.prodi || m.Prodi === s.prodi) && (!s.kelas || m.Kelas === s.kelas) && (!s.angkatan || m.Angkatan === s.angkatan) && (!s.status || m.Status === s.status) && (!s.jk || m.JK === s.jk));
    list.sort((a, b) => String(b.Angkatan).localeCompare(String(a.Angkatan)) || String(a.NIM).localeCompare(String(b.NIM)));
    const pp = 20, tot = list.length; s.hal = Math.min(s.hal, Math.max(1, Math.ceil(tot / pp)));
    const stBadge = (st) => st === 'Aktif' ? '<span class="badge ok">Aktif</span>' : st === 'Cuti' ? '<span class="badge warn">Cuti</span>' : '<span class="badge err">' + esc(st) + '</span>';
    const rekapUrl = Dom.set('REKAP_URL');
    let h = kepala({ crumb: ['Data', 'Mahasiswa'], judul: 'Mahasiswa', desc: 'Data mahasiswa dibaca langsung dari aplikasi <b>Rekap Mahasiswa</b> (hanya lihat). Pembaruan data dilakukan pada aplikasi sumber.',
        aksi: (rekapUrl ? '<a class="btn" href="' + attr(rekapUrl) + '" target="_blank" rel="noopener">Buka Rekap Mahasiswa ' + ic('ext', 'ic-sm') + '</a>' : '<button class="btn" disabled title="Alamat diatur di Pengaturan">Buka Rekap Mahasiswa</button>') + btnRefresh() }) +
      '<div class="alert info side">' + ic('lock') + '<div style="flex:1"><b style="color:var(--primary)">SINKRONISASI OTOMATIS · MODE HANYA LIHAT</b><div>Penambahan, mutasi status, dan pengeditan data mahasiswa dilakukan di aplikasi Rekap Mahasiswa, lalu tekan tombol <b>Refresh</b> untuk menyinkronkan.</div></div>' +
      '<div style="text-align:right;font-size:12.5px"><span class="badge ok dot">' + esc(meta.sumber || 'Rekap Mahasiswa') + '</span><div class="faint" style="margin-top:4px">' + ic('history', 'ic-sm') + ' Sinkron terakhir: ' + esc(fmtWaktu(meta.waktu)) + '</div></div></div>' +
      (meta.gagal ? '<div class="alert ' + (meta.belumDiatur ? 'info' : 'warn') + '">' + ic('alert') + '<div>' + esc(meta.gagal) + (meta.belumDiatur && Sesi.admin() ? ' <button class="link-btn" data-a="nav" data-to="pengaturan/sumber">Atur sekarang →</button>' : '') + '</div></div>' : '') +
      '<div class="kpis">' + kpi({ lb: 'Total Aktif', vl: fmtAngka(akt.length), ic: 'users', ft: '<span class="badge info">L ' + akt.filter(m => m.JK === 'L').length + '</span> <span class="badge err">P ' + akt.filter(m => m.JK === 'P').length + '</span>' + (meta.jumlahAnomali ? ' <span class="faint">· termasuk ' + meta.jumlahAnomali + ' belum cocok</span>' : '') }) +
      Dom.prodi().map(p => { const x = akt.filter(m => m.Prodi === p.Kode); return '<div class="kpi" style="border-top:3px solid ' + attr(p.Warna) + '"><div class="lb" style="padding-right:8px">' + esc(p.Nama) + '</div><div class="vl">' + x.length + '<small>mahasiswa</small></div><div class="ft">' + Dom.kelasProdi(p.Kode).map(k => esc(k.Nama) + ': <b>' + x.filter(m => m.Kelas === k.Nama).length + '</b>').join(' · ') + '</div><div class="ft">L ' + x.filter(m => m.JK === 'L').length + ' · P ' + x.filter(m => m.JK === 'P').length + '</div></div>'; }).join('') +
      kpi({ lb: 'Kelas Khusus', vl: khusus.length + '<small>mahasiswa</small>', ic: 'pin', cls: 'orange', ft: 'Belum kuliah di kampus · tidak masuk jadwal' }) + '</div>';
    if (meta.anomali && meta.anomali.length && !s.tutupAnomali) {
      h += '<div class="alert warn" style="display:block"><div class="row">' + ic('alert') + '<b>Perhatian: ' + meta.jumlahAnomali + ' baris data di Rekap Mahasiswa memiliki penulisan prodi/kelas yang tidak cocok dengan istilah baku</b><span class="badge orange">Anomali terdeteksi</span><span class="sp"></span><button class="icon-btn" data-a="tutupAnom" title="Tutup">' + ic('x') + '</button></div>' +
        '<div class="stack" style="gap:6px;margin:10px 0">' + meta.anomali.slice(0, 8).map(a => '<div style="background:var(--surface);border-radius:8px;padding:7px 12px;font-size:13px"><b class="mono">' + esc(a.nim) + '</b> · <b>' + esc(a.nama) + '</b> · ' + esc(a.masalah) + '</div>').join('') + (meta.anomali.length > 8 ? '<div class="faint">…dan ' + (meta.anomali.length - 8) + ' baris lainnya</div>' : '') + '</div>' +
        (rekapUrl ? '<a href="' + attr(rekapUrl) + '" target="_blank" rel="noopener"><b>Perbaiki di Rekap Mahasiswa</b> ' + ic('ext', 'ic-sm') + '</a> ' : '') + '<span class="faint">Data ini sementara dikecualikan dari jadwal dan dokumen cetak hingga penulisannya dibetulkan.</span></div>';
    }
    const ang = [...new Set(semua.map(m => m.Angkatan))].filter(Boolean).sort().reverse();
    h += '<div class="card" style="margin-bottom:16px"><div class="card-b"><div class="fgrid">' +
      '<div class="field"><label>Cari NIM</label><input class="input" data-in="nim" value="' + attr(s.nim) + '" placeholder="mis. 2627001"></div>' +
      '<div class="field"><label>Cari Nama Lengkap</label><input class="input" data-in="nama" value="' + attr(s.nama) + '" placeholder="mis. Abdullah"></div>' +
      '<div class="field"><label>Program Studi</label><select class="input" data-ch="prodi"><option value="">Semua Prodi</option>' + opsi(Dom.prodi().map(p => ({ v: p.Kode, l: p.Nama })), s.prodi) + '</select></div>' +
      '<div class="field"><label>Kelas</label><select class="input" data-ch="kelas"><option value="">Semua Kelas</option>' + opsi(Dom.kelas().map(k => k.Nama), s.kelas) + '</select></div>' +
      '<div class="field"><label>Angkatan</label><select class="input" data-ch="angkatan"><option value="">Semua Angkatan</option>' + opsi(ang, s.angkatan) + '</select></div>' +
      '<div class="field"><label>Status</label><select class="input" data-ch="status">' + opsi([{ v: 'Aktif', l: 'Aktif' }, { v: 'Cuti', l: 'Cuti' }, { v: 'Mengundurkan Diri', l: 'Mengundurkan Diri' }, { v: '', l: 'Semua status' }], s.status) + '</select></div>' +
      '<div class="field"><label>Jenis Kelamin</label><select class="input" data-ch="jk">' + opsi([{ v: '', l: 'Semua' }, { v: 'L', l: 'Laki-laki' }, { v: 'P', l: 'Perempuan' }], s.jk) + '</select></div></div>' +
      '<div class="row" style="margin-top:12px"><span class="badge info">Menampilkan ' + fmtAngka(tot) + ' dari ' + fmtAngka(semua.length) + ' data mahasiswa</span><span class="sp"></span><button class="btn btn-ghost btn-sm" data-a="reset">' + ic('refresh', 'ic-sm') + 'Reset Filter</button></div></div></div>' +
      '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th class="num">No</th><th>NIM</th><th>Nama Lengkap</th><th>Program Studi</th><th>Kelas</th><th>Angkatan</th><th>Semester</th><th>Jenis Kelamin</th><th>Status</th></tr></thead><tbody>' +
      (list.slice((s.hal - 1) * pp, s.hal * pp).map((m, i) => '<tr class="' + (m.Cocok !== 'YA' ? 'warn' : '') + '"><td class="num">' + ((s.hal - 1) * pp + i + 1) + '</td><td class="mono" style="color:var(--primary)">' + esc(m.NIM) + '</td><td><b>' + esc(m.Nama) + '</b></td>' +
        '<td class="nowrap">' + (m.Prodi ? dotProdi(m.Prodi) + ' ' + esc(Dom.prodiNama(m.Prodi)) : '<span class="badge warn">' + esc(m.ProdiAsli || '?') + '</span>') + '</td><td>' + (m.Kelas ? badgeKelas(m.Kelas) : '<span class="badge warn">' + esc(m.KelasAsli || '?') + '</span>') + '</td>' +
        '<td>' + esc(m.Angkatan) + '</td><td class="nowrap">' + (m.Angkatan ? 'Semester ' + Dom.semMhs(m.Angkatan, per) : '—') + '</td><td><span class="badge ' + (m.JK === 'L' ? 'info' : 'err') + '">' + esc(m.JK || '?') + '</span></td><td>' + stBadge(m.Status) + '</td></tr>').join('') ||
        '<tr><td colspan="9">' + kosong(semua.length ? 'Tidak ada mahasiswa pada filter ini.' : 'Belum ada data dari Rekap Mahasiswa.', 'cap') + '</td></tr>') +
      '</tbody></table></div>' + (tot > pp ? pagerHtml(tot, s.hal, pp, 'mahasiswa') : '') + '</div>';
    this.el.innerHTML = h;
  },
  acts: { pg(b) { this.st.hal = +b.dataset.p; this.render(); }, tutupAnom() { this.st.tutupAnomali = true; this.render(); }, reset() { Object.assign(this.st, { nim: '', nama: '', prodi: '', kelas: '', angkatan: '', status: 'Aktif', jk: '', hal: 1 }); this.render(); } },
  ch: ['prodi', 'kelas', 'angkatan', 'status', 'jk'].reduce((o, k) => { o[k] = function (t) { this.st[k] = t.value; this.st.hal = 1; this.render(); }; return o; }, {}),
  inp: ['nim', 'nama'].reduce((o, k) => { o[k] = debounce(function (t) { this.st[k] = t.value.trim(); this.st.hal = 1; this.render(); const i = $('[data-in="' + k + '"]', this.el); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); return o; }, {})
});

/* =====================================================================
   KURIKULUM — 3 langkah (Angkatan → Program Studi → Matriks MK)
   ===================================================================== */
const SINONIM_KUR = { Prodi: ['prodi', 'program studi', 'kode prodi'], Kelas: ['kelas', 'program', 'program kelas'], Semester: ['semester', 'smt'], KodeMK: ['kode mk', 'kode', 'kode matakuliah', 'kode mata kuliah', 'kodemk'], NamaMK: ['nama mk', 'nama mata kuliah', 'mata kuliah', 'matakuliah', 'nama matakuliah'], NamaArab: ['nama arab', 'arab', 'kitab', 'nama kitab'], SKS: ['sks', 'bobot sks'], Tahfidz: ['tahfidz', 'mk tahfidz'] };
defPage('kurikulum', {
  deps: ['Kurikulum', 'Realisasi', 'Angkatan', 'Prodi', 'Kelas', 'Mahasiswa'], refreshTabel: ['Kurikulum', 'Realisasi', 'Angkatan'],
  st: { ang: '', prodi: '', smt: 'semua', status: 'semua', q: '', centang: {}, qProdi: '', tutupInfo: false },
  onParams(p) { this.st.ang = p[0] || ''; this.st.prodi = p[1] || ''; },
  isDirty() { return Object.keys(this.st.centang).length > 0; },
  dirtyInfo() { return { judul: Object.keys(this.st.centang).length + ' perubahan centang belum disimpan', sub: 'Penyimpanan memperbarui daftar Realisasi Kurikulum ' + Dom.perLabel(App.periode.disusun.key) + '.' }; },
  buang() { this.st.centang = {}; this.render(); },
  dipilih(k) { const d = App.periode.disusun.key; return k.ID in this.st.centang ? this.st.centang[k.ID] : (k.Dicentang === 'YA' && (k.DibukaPada === d || k.Permanen === 'YA')); },
  siapArsip(th) {
    const mk = DB.rows('Kurikulum').filter(k => k.Angkatan === th);
    if (!mk.length || mk.some(k => k.Permanen !== 'YA')) return false;
    const tgl = Dom.setJson('PERIODE_TANGGAL', {}); let akhir = '';
    mk.forEach(k => { const p = tgl[k.DibukaPada]; const s = p && p.selesai ? p.selesai : '9999'; if (s > akhir) akhir = s; });
    return akhir < isoTgl();
  },
  stepper(n) { return '<div class="stepper">' + ['Angkatan', 'Program Studi', 'Matriks MK'].map((t, i) => (i ? '<span class="ln"></span>' : '') + '<span class="st ' + (i + 1 < n ? 'done' : i + 1 === n ? 'on' : '') + '"><i>' + (i + 1 < n ? '✓' : i + 1) + '</i>' + t + '</span>').join('') + '</div>'; },
  render() { if (this.st.ang && this.st.prodi) this.langkah3(); else if (this.st.ang) this.langkah2(); else this.langkah1(); App.savebar(this); },
  langkah1() {
    const per = App.periode, d = per.disusun, rg = Dom.rentang(d.key), kur = DB.rows('Kurikulum'), arsip = Dom.angkatanArsip();
    const aktif = Dom.angkatanAktif(), siap = aktif.filter(th => this.siapArsip(th));
    const kartu = aktif.map(th => {
      const mk = kur.filter(k => k.Angkatan === th), smt = Dom.semMhs(th, d.key), dibuka = mk.filter(k => k.Dicentang === 'YA' && k.DibukaPada === d.key);
      const sks = [...new Map(dibuka.map(k => [k.Prodi + k.KodeMK, +k.SKS || 0])).values()].reduce((a, b) => a + b, 0);
      const nMk = new Set(mk.map(k => k.Prodi + '|' + k.KodeMK)).size, nPr = new Set(mk.map(k => k.Prodi)).size, sp = siap.includes(th);
      return '<div class="card angk-card' + (sp ? ' siap' : '') + '">' + (sp ? '<span class="badge orange" style="align-self:flex-end;margin:-8px -6px -6px 0">' + ic('archive', 'ic-sm') + 'Siap diarsipkan</span>' : '') +
        '<div class="row"><span class="badge info">SEMESTER ' + smt + ' (' + esc(d.smt.toUpperCase()) + ')</span><span class="sp"></span><span class="badge ok dot">Aktif</span></div><div class="yr">' + th + '</div><div class="muted">Tahun Masuk ' + th + ' · Tingkat ' + Dom.tingkat(smt) + '</div>' +
        '<div class="info"><div><span>Mata Kuliah</span><b>' + nMk + ' MK <span class="faint" style="font-weight:500">· ' + nPr + ' Prodi</span></b></div><div><span>Status Kurikulum</span><span class="badge ok">Terbuka ' + sks + ' SKS</span></div></div>' +
        '<div class="row mt">' + (sp ? '<button class="btn" style="flex:1" data-a="arsipkan" data-v="' + th + '">' + ic('archive') + 'Arsipkan</button>' : '') + '<button class="btn btn-primary" style="flex:2" data-a="ke2" data-v="' + th + '">Kelola Kurikulum ' + ic('arrowr', 'ic-sm') + '</button></div></div>';
    }).join('');
    this.el.innerHTML = kepala({ crumb: ['Data', 'Kurikulum', 'Pilih Angkatan'], judul: 'Kurikulum', badge: ' <span class="badge info sq">T.A. ' + esc(d.ta) + '</span>', desc: 'Pilih tahun angkatan untuk membuka struktur program studi dan pengelolaan matriks mata kuliah semester yang sedang disusun.',
        aksi: this.stepper(1) + '<button class="btn" data-a="nav" data-to="arsip/angkatan">Arsip Angkatan Lampau ' + ic('arrowr', 'ic-sm') + '</button>' + btnRefresh() }) +
      '<div class="card card-b" style="border-left:4px solid var(--primary);margin-bottom:16px"><div class="row"><div style="flex:1;min-width:260px"><div class="row gap-s"><b style="color:var(--err);font-size:12px;letter-spacing:.06em">SEMESTER YANG SEDANG DISUSUN</b>' + (per.persiapan ? '<span class="badge orange dot">Persiapan Semester Baru</span>' : '') + '</div>' +
      '<div class="row" style="margin:6px 0"><h2 style="font-size:22px">T.A. ' + esc(d.ta) + '</h2><span class="badge navy sq">' + esc(d.smt.toUpperCase()) + '</span>' + (rg ? '<span class="badge sq">' + ic('cal', 'ic-sm') + ' ' + esc(fmtTgl(rg.mulai) + ' – ' + fmtTgl(rg.selesai)) + '</span>' : '') + '</div>' +
      '<div class="muted">Mata kuliah yang dicentang pada angkatan aktif otomatis masuk ke Realisasi Kurikulum ' + esc(Dom.perLabel(d.key)) + '.</div></div>' +
      (Sesi.admin() ? '<div style="text-align:right"><button class="btn" data-a="nav" data-to="pengaturan/periode">' + ic('cal') + 'Ubah Periode</button><div class="faint" style="font-size:11.5px;margin-top:6px">Khusus Admin Utama</div></div>' : '') + '</div></div>' +
      (siap.length ? '<div class="alert warn">' + ic('info') + '<div><b>Pemberitahuan Sistem:</b> Angkatan ' + siap.join(', ') + ' telah menuntaskan seluruh mata kuliahnya &amp; siap diarsipkan. Pengarsipan menyembunyikan mahasiswanya dari aplikasi ini tanpa mengubah Rekap Mahasiswa.</div></div>' : '') +
      '<div class="row" style="margin:6px 0 12px"><h3 style="font-size:17px">Daftar Angkatan Aktif</h3><span class="badge">' + aktif.length + ' Angkatan Aktif</span><span class="sp"></span><span class="muted" style="font-size:12.5px">Angkatan berstatus aktif sampai diarsipkan secara manual. Semester dihitung otomatis untuk ' + esc(Dom.perLabel(d.key)) + '.</span></div>' +
      '<div class="grid3">' + kartu +
      '<div class="card angk-card add"><div class="plus-c">' + ic('plus', 'ic-lg') + '</div><h3 style="font-size:17px">Tambah Angkatan / Kurikulum Baru</h3><p class="muted">Daftarkan tahun angkatan baru, lalu impor struktur mata kuliah kurikulum dari Excel (.xlsx).</p><button class="btn" data-a="tambahAng">' + ic('plus') + 'Input Angkatan Baru</button></div>' +
      '<div class="card angk-card add" style="border-style:solid"><div class="plus-c" style="background:var(--surface-3);color:var(--text-2)">' + ic('archive', 'ic-lg') + '</div><h3 style="font-size:17px">Arsip Angkatan Lampau</h3><p class="muted">' + arsip.size + ' angkatan diarsipkan. Kurikulumnya hanya lihat dan dapat dikembalikan.</p><button class="btn" data-a="nav" data-to="arsip/angkatan">Buka Arsip ' + ic('arrowr', 'ic-sm') + '</button></div></div>';
  },
  langkah2() {
    const th = this.st.ang, d = App.periode.disusun, smt = Dom.semMhs(th, d.key), kur = DB.rows('Kurikulum').filter(k => k.Angkatan === th), arsip = Dom.angkatanArsip().has(th);
    const units = Dom.units(d.key).filter(u => u.angkatan === th), nMhs = Dom.mhsAktif().filter(m => m.Angkatan === th).length;
    const prodi = Dom.prodi().filter(p => cocok(p.Nama + ' ' + p.Kode, this.st.qProdi));
    this.el.innerHTML = '<div class="card card-b" style="margin-bottom:16px"><div class="row"><div style="flex:1"><div class="crumb">Data ' + ic('right') + ' Kurikulum ' + ic('right') + ' Angkatan ' + th + ' ' + ic('right') + ' <b>Pilih Program Studi</b></div><div class="muted" style="font-size:13px"><span class="dotc" style="background:var(--accent)"></span> Penyiapan Plotting Kurikulum &amp; Matriks SKS</div></div>' +
      this.stepper(2) + '<button class="btn" data-a="ke1">' + ic('arrowl', 'ic-sm') + 'Ganti Angkatan</button>' + btnRefresh(false) + '</div></div>' +
      '<div class="hero"><span class="tag">ANGKATAN ' + (arsip ? 'DIARSIPKAN (HANYA LIHAT)' : 'AKTIF') + ' · ' + (App.periode.persiapan ? 'PERSIAPAN ' : '') + esc(d.smt.toUpperCase() + ' ' + d.ta) + '</span><h2>Angkatan ' + th + ' (Semester ' + smt + ' · ' + esc(d.smt + ' ' + d.ta) + ')</h2>' +
      '<div class="meta"><span>' + ic('cal', 'ic-sm') + ' Tahun Masuk ' + th + '</span><span>' + ic('layers', 'ic-sm') + ' ' + new Set(kur.map(k => k.Prodi)).size + ' Program Studi Terbuka</span><span>' + ic('users', 'ic-sm') + ' ' + nMhs + ' Mahasiswa Aktif</span></div>' +
      '<div style="position:absolute;right:24px;top:24px;z-index:1"><button class="btn" data-a="ke1">' + ic('history', 'ic-sm') + 'Kembali ke Angkatan</button></div></div>' +
      '<div class="card card-b" style="margin-bottom:16px"><div class="row"><div style="flex:1;min-width:240px"><b style="font-size:16px">Pilih Program Studi</b> <span class="badge">' + Dom.prodi().length + ' Prodi Aktif</span><div class="muted" style="font-size:13px">Pilih salah satu program studi untuk membuka matriks sebaran mata kuliah, penetapan kelas, dan centang kurikulum aktif.</div></div>' +
      '<div class="input-ic" style="width:min(280px,100%)">' + ic('search') + '<input class="input" data-in="qprodi" placeholder="Cari nama program studi…" value="' + attr(this.st.qProdi) + '"></div><span class="badge ok">' + ic('okc', 'ic-sm') + 'Semua Jenjang S1</span></div></div>' +
      '<div class="grid2">' + prodi.map(p => {
        const mk = kur.filter(k => k.Prodi === p.Kode), kelas = Dom.kelasProdi(p.Kode), dibuka = mk.filter(k => this.dipilih(k) && (k.DibukaPada === d.key || k.ID in this.st.centang));
        const sks = [...new Map(dibuka.map(k => [k.KodeMK, +k.SKS || 0])).values()].reduce((a, b) => a + b, 0), nMk = new Set(mk.map(k => k.KodeMK)).size;
        const dsn = new Set(units.filter(u => u.prodi === p.Kode).flatMap(u => u.dosen)).size;
        const terakhir = mk.reduce((a, k) => (k.DiubahPada > (a.DiubahPada || '') ? k : a), {});
        return '<div class="card prodi-card" style="--c:' + attr(p.Warna) + '"><div class="row"><span class="badge sq" style="background:color-mix(in srgb,' + p.Warna + ' 14%,transparent);color:' + p.Warna + '">' + esc(p.Kode) + '</span><span class="badge sq">Jenjang ' + esc(p.Jenjang || 'S1') + '</span><span class="sp"></span>' + (p.NamaArab ? '<span class="arab muted">' + esc(p.NamaArab) + '</span>' : '') + '</div>' +
          '<h3>' + esc(p.Nama) + '</h3><div><span class="badge sq">' + ic('building', 'ic-sm') + kelas.length + ' Kelas: ' + esc(kelas.map(k => k.Nama).join(', ')) + '</span></div>' + (p.Deskripsi ? '<p class="muted">' + esc(p.Deskripsi) + '</p>' : '') +
          '<div class="mini-stats"><div><small>Beban SKS</small><b>' + sks + ' SKS</b><small>dibuka semester ini</small></div><div><small>Mata Kuliah</small><b>' + nMk + ' MK</b><small>di kurikulum</small></div><div><small>Dosen Ditetapkan</small><b style="color:var(--primary)">' + dsn + ' Dosen</b><small>sudah diplot</small></div></div>' +
          '<div class="row" style="margin-top:auto"><span class="muted" style="font-size:12.5px">' + ic('clock', 'ic-sm') + ' ' + (terakhir.DiubahPada ? 'Diperbarui ' + esc(relatif(terakhir.DiubahPada)) + ' · ' + esc(terakhir.DiubahOleh || '') : 'Belum ada mata kuliah') + '</span><span class="sp"></span><button class="btn btn-primary" data-a="ke3" data-v="' + attr(p.Kode) + '">Pilih &amp; Kelola Mata Kuliah ' + ic('arrowr', 'ic-sm') + '</button></div></div>';
      }).join('') + '</div>' +
      '<div class="alert info" style="margin-top:16px">' + ic('info') + '<div><b>Catatan Tata Kelola Kurikulum:</b> Program studi dan kelas diatur pada menu Pengaturan oleh Admin Utama. Kelas Khusus tidak dijadwalkan. Pilihan mata kuliah yang disimpan pada Langkah 3 (Matriks MK) diteruskan ke Realisasi Kurikulum ' + esc(Dom.perLabel(d.key)) + '.</div></div>';
  },
  langkah3() {
    const s = this.st, th = s.ang, kode = s.prodi, d = App.periode.disusun, smtNow = Dom.semMhs(th, d.key), arsip = Dom.angkatanArsip().has(th);
    const p = DB.get('Prodi', 'Kode', kode) || { Nama: kode }, kelas = Dom.kelasProdi(kode), semua = DB.rows('Kurikulum').filter(k => k.Angkatan === th && k.Prodi === kode);
    const lolos = k => (s.smt === 'semua' || String(k.Semester) === String(s.smt)) && (s.status === 'semua' || (s.status === 'sudah' ? k.Permanen === 'YA' : k.Permanen !== 'YA')) && cocok(k.KodeMK + ' ' + k.NamaMK + ' ' + k.NamaArab, s.q);
    const nKotor = Object.keys(s.centang).length, totalSks = [...new Map(semua.map(k => [k.KodeMK, +k.SKS || 0])).values()].reduce((a, b) => a + b, 0);
    const terpilih = semua.filter(k => this.dipilih(k)), sksPilih = [...new Map(terpilih.map(k => [k.KodeMK, +k.SKS || 0])).values()].reduce((a, b) => a + b, 0);
    const terakhir = semua.reduce((a, k) => (k.DiubahPada > (a.DiubahPada || '') ? k : a), {});
    const status = (k) => {
      if (k.Permanen === 'YA') return '<span class="badge navy">' + ic('lock', 'ic-sm') + 'Terjadwal · permanen' + (k.DibukaPada && k.DibukaPada !== d.key ? ' (' + esc(Dom.perLabel(k.DibukaPada)) + ')' : '') + '</span>';
      if (this.dipilih(k)) return '<span class="badge ok">Sudah dipilih</span>' + (k.ID in s.centang ? ' <span class="badge orange">Belum disimpan</span>' : '');
      if (k.Dicentang === 'YA' && k.DibukaPada) return '<span class="badge info">Dibuka di ' + esc(Dom.perLabel(k.DibukaPada)) + '</span>';
      return '<span class="badge">Tidak dibuka</span>' + (k.ID in s.centang ? ' <span class="badge orange">Belum disimpan</span>' : '');
    };
    const box = (kl) => {
      const mk = semua.filter(k => k.Kelas === kl.Nama).sort((a, b) => num(a.Semester) - num(b.Semester) || String(a.KodeMK).localeCompare(b.KodeMK)), tampil = mk.filter(lolos);
      const sks = [...mk.filter(k => this.dipilih(k))].reduce((a, k) => a + (+k.SKS || 0), 0), w = kl.Warna || '#1E3A8A';
      return '<div class="card box-kelas"><div class="bh"><div class="lt" style="background:' + attr(w) + '">' + esc(kl.Kode || kl.Nama[0]) + '</div><div style="flex:1;min-width:0"><div class="row gap-s"><b style="font-size:15.5px">Kelas ' + esc(kl.Nama) + '</b><span class="badge">' + mk.length + ' MK</span><span class="badge ok">' + sks + ' SKS Terpilih</span></div><div class="t-sub">Pola ' + esc(kl.Pola) + (kl.Pola === 'Hybrid' ? ' · Jumat sore & Sabtu' : ' · Senin–Jumat') + '</div></div>' +
        (arsip ? '' : '<button class="link-btn" data-a="semuaBox" data-v="' + attr(kl.Nama) + '">Pilih Semua MK</button>') + '</div>' +
        '<div class="tbl-wrap" style="max-height:520px"><table class="tbl compact"><thead><tr><th class="num">No</th><th>Smt</th><th>Kode MK</th><th>Nama Mata Kuliah</th><th>SKS</th><th class="center">Pilih</th><th>Status</th></tr></thead><tbody>' +
        (tampil.map((k, i) => { const perm = k.Permanen === 'YA', on = this.dipilih(k);
          return '<tr class="' + (k.ID in s.centang ? 'kotor' : '') + '"><td class="num">' + (i + 1) + '</td><td><b>' + esc(k.Semester) + '</b></td><td class="mono">' + esc(k.KodeMK) + '</td><td style="min-width:200px"><b>' + esc(k.NamaMK) + '</b>' + (k.Tahfidz === 'YA' ? ' <span class="badge orange sq">Tahfidz</span>' : '') + (k.NamaArab ? '<div class="arab muted" style="font-size:13px">' + esc(k.NamaArab) + '</div>' : '') + '</td>' +
            '<td class="center"><b>' + esc(k.SKS) + '</b></td><td class="center"><input type="checkbox" class="chk-in" style="width:18px;height:18px;accent-color:var(--primary)" data-ch="cek" data-id="' + attr(k.ID) + '" ' + (on ? 'checked' : '') + ' ' + (perm || arsip ? 'disabled' : '') + ' title="' + (perm ? 'Sudah permanen — tidak dapat dibatalkan' : '') + '"></td><td class="nowrap">' + status(k) + '</td></tr>'; }).join('') ||
          '<tr><td colspan="7">' + kosong(mk.length ? 'Tidak ada MK pada filter ini.' : 'Belum ada mata kuliah. Gunakan Import dari Excel.', 'book') + '</td></tr>') + '</tbody></table></div>' +
        '<div class="bf"><span>Menampilkan ' + tampil.length + ' dari ' + mk.length + ' mata kuliah</span>' + (arsip ? '' : '<button class="link-btn" data-a="resetBox" data-v="' + attr(kl.Nama) + '">Reset pilihan</button>') + '</div></div>';
    };
    const smtList = [...new Set(semua.map(k => +k.Semester))].sort((a, b) => a - b);
    const smtChips = (smtList.length ? smtList : [1, 2, 3, 4, 5, 6, 7, 8]).filter(x => x <= 14);
    this.el.innerHTML = '<div class="card card-b" style="margin-bottom:14px"><div class="row"><div style="flex:1;min-width:260px"><div class="crumb">Data ' + ic('right') + ' <a href="#/kurikulum">Kurikulum</a> ' + ic('right') + ' <a href="#/kurikulum/' + th + '">Angkatan ' + th + '</a> ' + ic('right') + ' ' + esc(p.Nama) + ' ' + ic('right') + ' <b>Matriks Mata Kuliah</b></div>' +
      '<h1 style="font-size:24px;font-weight:800">Matriks Mata Kuliah <span class="muted" style="font-weight:600">— Angkatan ' + th + ' (Semester ' + smtNow + ')</span></h1><div class="row gap-s" style="margin-top:6px"><span class="badge sq" style="background:color-mix(in srgb,' + p.Warna + ' 14%,transparent);color:' + p.Warna + '">' + esc(p.Nama) + '</span><span class="badge ok">' + ic('okc', 'ic-sm') + (arsip ? 'Angkatan diarsipkan — hanya lihat' : 'Kurikulum Aktif') + '</span><span class="badge info">' + esc(Dom.perLabel(d.key)) + '</span></div></div>' + this.stepper(3) + '</div></div>' +
      '<div class="card card-b" style="margin-bottom:14px"><div class="row">' + (nKotor ? '<span class="badge orange">' + ic('alert', 'ic-sm') + nKotor + ' perubahan belum disimpan</span>' : '<span class="badge ok">' + ic('okc', 'ic-sm') + 'Semua tersimpan</span>') + '<span class="muted" style="font-size:12.5px">Terakhir diperbarui: ' + esc(terakhir.DiubahPada ? fmtWaktu(terakhir.DiubahPada) + ' · ' + (terakhir.DiubahOleh || '') : '—') + '</span><span class="sp"></span>' +
      (arsip ? '' : '<button class="btn" data-a="import">' + ic('upload') + 'Import dari Excel</button>') + '<button class="btn" data-a="export">' + ic('download') + 'Export ke Excel</button>' + btnRefresh(false) + (arsip ? '' : '<button class="btn btn-primary" data-a="simpan" ' + (nKotor ? '' : 'disabled') + '>' + ic('save') + 'Simpan Perubahan</button>') + '</div></div>' +
      (s.tutupInfo ? '' : '<div class="alert info">' + ic('info') + '<div style="flex:1"><b>Petunjuk Penyusunan Matriks:</b> Centang mata kuliah yang dibuka untuk semester yang sedang disusun, lalu klik <b>Simpan Perubahan</b> agar muncul di Realisasi Kurikulum. Klik ganda nomor semester untuk mencentang sekaligus semua mata kuliah semester itu. Mata kuliah yang telah berstatus <span class="badge navy">' + ic('lock', 'ic-sm') + 'permanen</span> terkunci otomatis.</div><button class="icon-btn" data-a="tutupInfo">' + ic('x') + '</button></div>') +
      '<div class="card card-b" style="margin-bottom:14px"><div class="row"><span class="lbl">SEMESTER:</span><div class="semchips"><button data-a="smt" data-v="semua" class="' + (s.smt === 'semua' ? 'on' : '') + '">Semua</button>' + smtChips.map(x => '<button data-a="smt" data-dbl="smtAll" data-v="' + x + '" class="' + (String(s.smt) === String(x) ? 'on' : '') + (x === smtNow ? ' cur' : '') + '" title="Klik ganda: centang semua MK semester ' + x + '">' + x + '</button>').join('') + '</div><span class="sp"></span>' +
      '<div class="seg">' + [['semua', 'Semua', semua.length], ['belum', 'Belum Terjadwal', semua.filter(k => k.Permanen !== 'YA').length], ['sudah', 'Sudah Terjadwal', semua.filter(k => k.Permanen === 'YA').length]].map(x => '<button data-a="status" data-v="' + x[0] + '" class="' + (s.status === x[0] ? 'on' : '') + '">' + x[1] + ' <small>(' + x[2] + ')</small></button>').join('') + '</div>' +
      '<div class="input-ic" style="width:min(260px,100%)">' + ic('search') + '<input class="input" data-in="q" placeholder="Cari mata kuliah atau kode…" value="' + attr(s.q) + '"></div></div></div>' +
      '<div class="row" style="margin:0 2px 12px"><b style="color:var(--primary)">' + ic('chart', 'ic-sm') + ' ' + sksPilih + ' / ' + totalSks + ' SKS Terpilih</b><span class="muted">· ' + kelas.length + ' Kelas Aktif (' + esc(kelas.map(k => k.Nama).join(', ')) + ')</span><span class="sp"></span><div class="legend"><span><i style="background:var(--primary);border-radius:50%"></i>Terkunci</span><span><i style="background:#16A34A;border-radius:50%"></i>Dipilih</span><span><i style="background:var(--border-2);border-radius:50%"></i>Tidak dibuka</span></div></div>' +
      '<div class="grid2">' + kelas.map(box).join('') + '</div>';
  },
  acts: {
    ke1() { App.nav('kurikulum'); }, ke2(b) { App.nav('kurikulum/' + b.dataset.v); }, ke3(b) { App.nav('kurikulum/' + this.st.ang + '/' + b.dataset.v); },
    smt(b) { this.st.smt = b.dataset.v; this.render(); }, status(b) { this.st.status = b.dataset.v; this.render(); }, tutupInfo() { this.st.tutupInfo = true; this.render(); },
    semuaBox(b) { const d = App.periode.disusun.key; DB.rows('Kurikulum').filter(k => k.Angkatan === this.st.ang && k.Prodi === this.st.prodi && k.Kelas === b.dataset.v && k.Permanen !== 'YA').forEach(k => this.setCek(k, true)); this.render(); },
    resetBox(b) { DB.rows('Kurikulum').filter(k => k.Angkatan === this.st.ang && k.Prodi === this.st.prodi && k.Kelas === b.dataset.v).forEach(k => delete this.st.centang[k.ID]); this.render(); },
    simpan(b) { this.simpan(b); },
    async export() {
      const th = this.st.ang, kode = this.st.prodi, rows = [['Prodi', 'Kelas', 'Semester', 'Kode MK', 'Nama MK', 'Nama Arab', 'SKS', 'Tahfidz', 'Dipilih', 'Status']];
      DB.rows('Kurikulum').filter(k => k.Angkatan === th && k.Prodi === kode).sort((a, b) => String(a.Kelas).localeCompare(b.Kelas) || num(a.Semester) - num(b.Semester)).forEach(k => rows.push([Dom.prodiNama(k.Prodi), k.Kelas, +k.Semester, k.KodeMK, k.NamaMK, k.NamaArab, +k.SKS, k.Tahfidz, this.dipilih(k) ? 'YA' : 'TIDAK', k.Permanen === 'YA' ? 'Permanen' : '']));
      await Excel.tulis('Kurikulum ' + kode + ' Angkatan ' + th, [{ nama: 'Kurikulum ' + kode + ' ' + th, rows, lebar: [26, 18, 9, 12, 42, 34, 6, 8, 8, 10] }]);
    },
    import() { this.importExcel(this.st.ang, this.st.prodi); },
    tambahAng() { this.tambahAngkatan(); },
    async arsipkan(b) {
      const th = b.dataset.v, mk = DB.rows('Kurikulum').filter(k => k.Angkatan === th).length, mhs = Dom.mhsAktif().filter(m => m.Angkatan === th).length;
      if (!(await konfirmasi('Arsipkan <b>Angkatan ' + th + '</b>?\n\n• ' + mk + ' mata kuliah menjadi hanya lihat\n• ' + mhs + ' mahasiswa disembunyikan dari semua menu aplikasi ini\n• Data di Rekap Mahasiswa tidak berubah\n\nAngkatan dapat dikembalikan dari menu Arsip.', { title: 'Arsipkan angkatan', icon: 'archive', ok: 'Arsipkan' }))) return;
      const r = await denganSibuk(b, 'Mengarsipkan…', () => api('angkatan.arsip', { tahun: th }));
      if (r.success) toast(r.message);
    }
  },
  dbl: { smtAll(b) { const v = b.dataset.v; DB.rows('Kurikulum').filter(k => k.Angkatan === this.st.ang && k.Prodi === this.st.prodi && String(k.Semester) === v && k.Permanen !== 'YA').forEach(k => this.setCek(k, true)); this.st.smt = v; this.render(); toast('Semua mata kuliah semester ' + v + ' dicentang. Tekan Simpan Perubahan.', 'info'); } },
  ch: { cek(t) { const k = DB.get('Kurikulum', 'ID', t.dataset.id); if (k) { this.setCek(k, t.checked); this.render(); } } },
  inp: {
    q: debounce(function (t) { this.st.q = t.value; this.render(); const i = $('[data-in="q"]', this.el); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250),
    qprodi: debounce(function (t) { this.st.qProdi = t.value; this.render(); const i = $('[data-in="qprodi"]', this.el); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250)
  },
  setCek(k, on) {
    if (k.Permanen === 'YA') return;
    const asli = k.Dicentang === 'YA' && k.DibukaPada === App.periode.disusun.key;
    if (on === asli) delete this.st.centang[k.ID]; else this.st.centang[k.ID] = on;
  },
  async simpan(btn, paksa) {
    const perubahan = Object.keys(this.st.centang).map(id => ({ id, centang: this.st.centang[id] }));
    if (!perubahan.length) return true;
    const kirim = (pk) => api('kurikulum.simpan', { perubahan, base: { Kurikulum: DB.ver.Kurikulum }, paksa: !!pk }, { silent: true });
    let r = await denganSibuk(btn, 'Menyimpan…', () => kirim(paksa));
    if (r.code === 'CONFLICT') r = await tanganiKonflik(r, () => kirim(true));
    if (!r.success) { if (r.code !== 'CONFLICT') toast(r.message, 'err'); return false; }
    this.st.centang = {}; toast(r.message); this.render(); return true;
  },
  tambahAngkatan() {
    let rows = null;
    const tahunDepan = Math.max(...Dom.angkatanSemua().map(a => +a.Tahun), new Date().getFullYear() - 1) + 1;
    const m = Modal.buka({ title: 'Tambah Angkatan / Kurikulum Baru', icon: 'plus',
      body: '<div class="stack"><div class="field"><label>Tahun angkatan *</label><input class="input" id="ta-th" inputmode="numeric" maxlength="4" value="' + tahunDepan + '"></div>' +
        '<div class="field"><label>Struktur kurikulum (opsional)</label><div class="row"><button class="btn" data-a="pilih">' + ic('upload') + 'Pilih berkas Excel…</button><button class="link-btn" data-a="tpl">Unduh template</button></div><span class="help" id="ta-info">Kolom: Prodi, Kelas (kosong = semua kelas prodi), Semester, Kode MK, Nama MK, Nama Arab, SKS, Tahfidz.</span></div></div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('check') + 'Tambahkan</button>',
      acts: {
        tpl: () => this.unduhTemplate(),
        pilih: async () => { const f = await pilihBerkas('.xlsx,.xls,.csv'); if (!f) return; try { rows = Excel.peta(await Excel.baca(f), SINONIM_KUR); $('#ta-info', m.el).innerHTML = '<b>' + esc(f.name) + '</b> · ' + rows.length + ' baris siap diimpor.'; } catch (e) { toast(e.message, 'err'); } },
        ok: async (b, e, mm) => {
          const th = $('#ta-th', mm.el).value.trim(); if (!/^\d{4}$/.test(th)) return toast('Tahun angkatan harus 4 angka.', 'err');
          const r = await denganSibuk(b, 'Menyimpan…', () => api('angkatan.tambah', { tahun: th, rows: rows || [] }));
          if (r.success) { mm.close(); toast(r.message); if (r.data && r.data.ditolak && r.data.ditolak.length) this.hasilImport(r.data); }
        }
      } });
  },
  unduhTemplate() {
    Excel.tulis('Template Kurikulum — PENJADWALAN AL WAFA', [{ nama: 'Kurikulum', rows: [['Prodi', 'Kelas', 'Semester', 'Kode MK', 'Nama MK', 'Nama Arab', 'SKS', 'Tahfidz'],
      ['Hukum Ekonomi Syariah', '', 1, 'HES101', 'Ushul Fiqih I', 'أصول الفقه', 2, ''], ['Hukum Ekonomi Syariah', "Ma'had Aly Ikhwan", 1, 'MAL101', 'Fiqih Muamalah (Bidayatul Mujtahid)', 'بداية المجتهد', 3, ''], ['Hukum Ekonomi Syariah', '', 1, 'WAF101', 'Tahfidz & Tahsin Al-Qur\'an Juz 1', '', 2, 'YA']], lebar: [26, 20, 9, 11, 40, 30, 6, 8] }]);
  },
  importExcel(th, kode) {
    pilihBerkas('.xlsx,.xls,.csv').then(async f => {
      if (!f) return;
      let rows; try { rows = Excel.peta(await Excel.baca(f), SINONIM_KUR); } catch (e) { return toast(e.message, 'err'); }
      if (!rows.length) return toast('Tidak ada baris data. Pastikan baris pertama berisi judul kolom.', 'err');
      Modal.buka({ title: 'Import Kurikulum dari Excel', sub: esc(f.name) + ' · ' + rows.length + ' baris · Angkatan ' + th + ' · ' + esc(Dom.prodiNama(kode)), icon: 'sheet', size: 'lg',
        body: '<div class="alert info">' + ic('info') + '<div>Kolom Kelas kosong = mata kuliah dibuat untuk semua kelas prodi ini (' + esc(Dom.kelasProdi(kode).map(k => k.Nama).join(', ')) + '). Data ganda & format salah ditolak.</div></div>' +
          '<div class="tbl-wrap" style="max-height:44vh"><table class="tbl compact"><thead><tr><th>Baris</th><th>Kelas</th><th>Smt</th><th>Kode</th><th>Nama MK</th><th>SKS</th><th>Tahfidz</th></tr></thead><tbody>' +
          rows.map(r => '<tr><td class="num">' + r._baris + '</td><td>' + esc(r.Kelas || 'Semua kelas') + '</td><td>' + esc(r.Semester) + '</td><td class="mono">' + esc(r.KodeMK) + '</td><td>' + esc(r.NamaMK) + (r.NamaArab ? ' <span class="arab muted">' + esc(r.NamaArab) + '</span>' : '') + '</td><td>' + esc(r.SKS) + '</td><td>' + esc(r.Tahfidz) + '</td></tr>').join('') + '</tbody></table></div>' +
          '<label class="chk" style="margin-top:12px"><input type="checkbox" id="ik-perb"> Perbarui nama/SKS mata kuliah yang sudah ada (MK permanen tetap dijaga)</label>',
        foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('upload') + 'Import</button>',
        acts: { ok: async (b, e, m) => {
          const r = await denganSibuk(b, 'Mengimpor…', () => api('kurikulum.import', { angkatan: th, prodi: kode, rows: rows.map(x => Object.assign({ Prodi: x.Prodi || kode }, x)), mode: $('#ik-perb').checked ? 'perbarui' : 'tambah' }));
          if (r.success) { m.close(); this.hasilImport(r.data); }
        } } });
    });
  },
  hasilImport(d) {
    Modal.buka({ title: 'Hasil import kurikulum', icon: 'okc', body: '<div class="kpis" style="grid-template-columns:repeat(3,1fr)">' + kpi({ lb: 'Ditambahkan', vl: d.ditambah, ic: 'plus', cls: 'ok' }) + kpi({ lb: 'Diperbarui', vl: d.diperbarui, ic: 'edit' }) + kpi({ lb: 'Ditolak', vl: d.ditolak.length, ic: 'x', cls: d.ditolak.length ? 'err' : '' }) + '</div>' +
      (d.ditolak.length ? '<div class="tbl-wrap" style="max-height:40vh"><table class="tbl compact"><thead><tr><th>Baris</th><th>Alasan ditolak</th></tr></thead><tbody>' + d.ditolak.map(x => '<tr><td class="num">' + x.baris + '</td><td>' + esc(x.alasan) + '</td></tr>').join('') + '</tbody></table></div>' : ''),
      foot: '<button class="btn btn-primary" data-close>Selesai</button>' });
  }
});

/* =====================================================================
   KALENDER AKADEMIK (editor sekaligus pratinjau)
   ===================================================================== */
const WARNA_KAL = ['#2563EB', '#7C3AED', '#059669', '#BAE6FD', '#F59E0B', '#B45309', '#FACC15', '#DC2626', '#1E3A8A', '#DB2777', '#0D9488', '#64748B'];
defPage('kalender', {
  deps: ['Kalender', 'KalenderTeks', 'Pengaturan', 'Prodi', 'Aset'], refreshTabel: ['Kalender', 'KalenderTeks'],
  st: { per: '', keg: null, teks: null, kotor: false },
  isDirty() { return this.st.kotor; },
  dirtyInfo() { return { judul: 'Perubahan kalender ' + Dom.perLabel(this.st.per) + ' belum disimpan', sub: 'Kegiatan & teks kotak informasi.' }; },
  buang() { this.st.keg = null; this.st.teks = null; this.st.kotor = false; this.render(); },
  muat() {
    const s = this.st, p = Dom.perObj(s.per);
    if (!s.keg) s.keg = DB.rows('Kalender').filter(k => k.TA === p.ta && k.Semester === p.smt).sort(by(k => num(k.Urutan))).map(k => Object.assign({}, k));
    if (!s.teks) { const t = DB.rows('KalenderTeks').find(k => k.TA === p.ta && k.Semester === p.smt); let data = {}; try { data = t ? JSON.parse(t.Data || '{}') : {}; } catch (e) {} s.teks = Object.assign(Doc.teksKalenderBawaan(s.per), data); if (t && t.LabelSemester) s.teks.label = t.LabelSemester; }
  },
  pilihanPeriode() {
    const set = new Set([App.periode.berjalan.key, App.periode.disusun.key]);
    DB.rows('Kalender').forEach(k => set.add(k.TA + ' ' + k.Semester));
    const y = parseInt(App.periode.berjalan.ta, 10); [y - 1, y, y + 1].forEach(t => ['Ganjil', 'Genap'].forEach(s => set.add(t + '/' + (t + 1) + ' ' + s)));
    return [...set].sort();
  },
  render() {
    const s = this.st; if (!s.per) s.per = App.periode.disusun.key;
    this.muat();
    const p = Dom.perObj(s.per), doc = Doc.kalender(s.per, s.keg, s.teks, { edit: true, kode: 'KAL-PRATINJAU' });
    this.el.innerHTML = kepala({ crumb: ['Data', 'Kalender Akademik', 'T.A. ' + p.ta], judul: 'Kalender Akademik', badge: ' <span class="badge info sq">' + esc(Dom.perLabel(s.per)) + '</span> <span class="badge orange sq">' + ic('edit', 'ic-sm') + 'Mode Editor &amp; Pratinjau Cetak</span>',
        desc: 'Klik teks pada lembar untuk mengubahnya langsung. Klik batang atau nama kegiatan untuk mengubah kegiatan. Tampilan ini sama dengan hasil cetak.',
        aksi: '<button class="btn" data-a="salin">' + ic('copy') + 'Salin dari Semester Sebelumnya</button>' + btnRefresh(false) + '<button class="btn btn-soft" data-a="tambah">' + ic('plus') + 'Tambah Kegiatan</button><button class="btn btn-primary" data-a="simpan" ' + (s.kotor ? '' : 'disabled') + '>' + ic('save') + 'Simpan</button><button class="btn btn-accent" data-a="cetak">' + ic('printer') + 'Cetak (A4 Landscape)</button>' }) +
      '<div class="card card-b" style="margin-bottom:14px"><div class="kal-tools"><div class="field" style="min-width:240px"><label>Periode</label><select class="input" data-ch="per">' + opsi(this.pilihanPeriode().map(k => ({ v: k, l: Dom.perLabel(k) + (k === App.periode.berjalan.key ? ' (Berjalan)' : k === App.periode.disusun.key && App.periode.persiapan ? ' (Disusun)' : '') })), s.per) + '</select></div>' +
      '<div class="field" style="min-width:240px"><label>Label semester</label><input class="input" data-in="label" value="' + attr(s.teks.label) + '"></div>' +
      '<div class="field"><label>Rentang</label><div class="badge sq" style="height:38px">' + Doc.bulanKalender(s.per).length + ' bulan · ' + s.keg.length + ' kegiatan</div></div><span class="sp"></span>' +
      '<div class="field"><label>Kegiatan</label><div class="row gap-s" style="max-width:640px">' + s.keg.map((k, i) => '<button class="chip" data-a="ubah" data-i="' + i + '"><span class="dotc" style="background:' + attr(k.Warna) + '"></span>' + esc(k.Nama) + '</button>').join('') + (s.keg.length ? '' : '<span class="faint">Belum ada kegiatan — tekan Tambah Kegiatan</span>') + '</div></div></div></div>' +
      '<div class="kal-stage kal-edit" id="kal-stage"><div class="pv-pages" id="kal-pages">' + doc.halaman[0] + '</div></div>';
    const stage = $('#kal-stage', this.el), pages = $('#kal-pages', this.el), pg = $('.a4', pages);
    Cetak.isiQr(pages);
    requestAnimationFrame(() => { Cetak.fit(pg); const z = Math.min(1, (stage.clientWidth - 40) / pg.offsetWidth); pages.style.zoom = z; });
    $$('[contenteditable]', pages).forEach(el => el.addEventListener('input', () => this.catatTeks(el)));
    $$('.bar', pages).forEach(el => { el.style.pointerEvents = 'auto'; el.style.cursor = 'pointer'; el.addEventListener('click', () => { const i = s.keg.findIndex(k => k.Nama === el.title); if (i >= 0) this.formKeg(i); }); });
    $$('.rk b', pages).forEach(el => { el.style.cursor = 'pointer'; el.addEventListener('click', () => { const i = s.keg.findIndex(k => k.Nama === el.textContent); if (i >= 0) this.formKeg(i); }); });
    App.savebar(this);
  },
  catatTeks(el) {
    const t = this.st.teks, k = el.dataset.k, v = el.innerText.replace(/\n+$/, '').trim();
    const parts = k.split('.');
    if (parts[0] === 'info') { t.info = t.info || []; t.info[+parts[1]] = t.info[+parts[1]] || {}; t.info[+parts[1]][parts[2]] = /^Teks (tautan|tombol) \(opsional\)$/.test(v) ? '' : v; }
    else if (parts[0] === 'catatan') { t.catatan = (t.catatan || []).slice(); if (v && v !== '+ Tambah poin…') t.catatan[+parts[1]] = v; else t.catatan.splice(+parts[1], 1); }
    else t[k] = v;
    if (k === 'label') { const inp = $('[data-in="label"]', this.el); if (inp) inp.value = v; }
    this.tandai();
  },
  tandai() { if (!this.st.kotor) { this.st.kotor = true; const b = $('[data-a="simpan"]', this.el); if (b) b.disabled = false; } App.savebar(this); },
  acts: {
    tambah() { this.formKeg(-1); }, ubah(b) { this.formKeg(+b.dataset.i); }, simpan(b) { this.simpan(b); },
    async salin() {
      const s = this.st, p = Dom.perObj(s.per), y = parseInt(p.ta, 10), kandidat = [(y - 1) + '/' + y + ' ' + p.smt, p.smt === 'Genap' ? p.ta + ' Ganjil' : (y - 1) + '/' + y + ' Genap'];
      const src = kandidat.find(k => DB.rows('Kalender').some(x => x.TA + ' ' + x.Semester === k) || DB.rows('KalenderTeks').some(x => x.TA + ' ' + x.Semester === k));
      if (!src) return toast('Belum ada kalender semester sebelumnya untuk disalin.', 'warn');
      if (!(await konfirmasi('Salin kegiatan &amp; teks dari <b>' + esc(Dom.perLabel(src)) + '</b> ke ' + esc(Dom.perLabel(s.per)) + '?' + (src.split(' ')[1] === p.smt ? '\nTanggal kegiatan digeser +1 tahun.' : '\nTanggal kegiatan perlu disesuaikan.'), { ok: 'Salin' }))) return;
      const ps = Dom.perObj(src), geser = ps.smt === p.smt ? 1 : 0, gs = (d) => { if (!d || !geser) return d; const t = tgl(d); t.setFullYear(t.getFullYear() + geser); return isoTgl(t); };
      s.keg = DB.rows('Kalender').filter(k => k.TA === ps.ta && k.Semester === ps.smt).sort(by(k => num(k.Urutan))).map(k => Object.assign({}, k, { ID: '', TA: p.ta, Semester: p.smt, Mulai: gs(k.Mulai), Selesai: gs(k.Selesai) }));
      const t = DB.rows('KalenderTeks').find(k => k.TA === ps.ta && k.Semester === ps.smt);
      if (t) { try { s.teks = Object.assign(Doc.teksKalenderBawaan(s.per), JSON.parse(t.Data || '{}')); } catch (e) {} if (t.LabelSemester && ps.smt === p.smt) s.teks.label = t.LabelSemester; }
      s.kotor = true; this.render(); toast('Disalin. Periksa tanggal lalu tekan Simpan.', 'info');
    },
    cetak() {
      const s = this.st; this.muat();
      if (s.kotor) toast('Catatan: perubahan belum disimpan, tetapi dicetak sesuai tampilan saat ini.', 'info');
      Cetak.buka({ judul: 'Pratinjau — Kalender Akademik', sub: Dom.perLabel(s.per) + ' · A4 Landscape', periode: s.per, folder: 'Kalender Akademik', prefix: 'KAL', jenis: 'KALENDER', bisaOrientasi: false,
        namaFile: 'Kalender Akademik ' + Dom.perLabel(s.per).replace('/', '-'), buat: (ctx) => [Doc.kalender(s.per, s.keg, s.teks, { kode: ctx.kode })],
        dok: { jenis: 'KALENDER', judul: 'Kalender Akademik ' + Dom.perLabel(s.per), ringkasan: { semester: Dom.perObj(s.per).smt, jumlah: s.keg.length + ' kegiatan' } } });
    }
  },
  ch: { async per(t) {
    if (this.st.kotor && !(await konfirmasi('Perubahan kalender ' + esc(Dom.perLabel(this.st.per)) + ' belum disimpan. Buang dan pindah periode?', { danger: true, ok: 'Buang & pindah' }))) { t.value = this.st.per; return; }
    Object.assign(this.st, { per: t.value, keg: null, teks: null, kotor: false }); this.render();
  } },
  inp: { label: debounce(function (t) { this.st.teks.label = t.value; this.tandai(); const el = $('[data-k="label"]', this.el); if (el && document.activeElement !== el) el.textContent = t.value; }, 200) },
  formKeg(i) {
    const s = this.st, k = i >= 0 ? s.keg[i] : { Nama: '', Mulai: '', Selesai: '', Warna: WARNA_KAL[s.keg.length % WARNA_KAL.length], Ikon: 'cal', SubKegiatan: '', Tampil: 'YA' };
    const b = Doc.bulanKalender(s.per)[0], awal = isoTgl(new Date(b[0], b[1], 1));
    let warna = k.Warna, ikon = k.Ikon || 'cal';
    const m = Modal.buka({ title: i >= 0 ? 'Ubah Kegiatan' : 'Tambah Kegiatan', icon: 'cal', size: 'lg',
      body: '<div class="stack"><div class="field"><label>Nama kegiatan *</label><input class="input" id="kg-n" value="' + attr(k.Nama) + '" placeholder="mis. Pekan Ujian Tengah Semester (UTS)"></div>' +
        '<div class="fgrid c2"><div class="field"><label>Tanggal mulai *</label><input class="input" type="date" id="kg-m" value="' + attr(k.Mulai || awal) + '"></div><div class="field"><label>Tanggal selesai</label><input class="input" type="date" id="kg-s" value="' + attr(k.Selesai || k.Mulai || awal) + '"></div></div>' +
        '<div class="field"><label>Warna batang</label><div class="row gap-s" id="kg-w">' + WARNA_KAL.map(w => '<button class="swatch ' + (w === warna ? 'on' : '') + '" data-a="w" data-v="' + w + '" style="background:' + w + '"></button>').join('') + '<input type="color" id="kg-wc" value="' + attr(warna) + '" style="width:38px;height:30px;border:0;background:none"></div></div>' +
        '<div class="field"><label>Ikon</label><div class="iconpick" id="kg-i">' + Doc.KAL_IKON.map(n => '<button data-a="i" data-v="' + n + '" class="' + (n === ikon ? 'on' : '') + '">' + ic(n) + '</button>').join('') + '</div></div>' +
        '<div class="field"><label>Sub-kegiatan (satu baris satu sub-kegiatan)</label><textarea class="input" id="kg-sub" rows="3" placeholder="Ujian Tahfidz&#10;Ujian Mata Kuliah">' + esc(k.SubKegiatan || '') + '</textarea></div>' +
        '<label class="chk"><span class="switch"><input type="checkbox" id="kg-t" ' + (k.Tampil !== 'TIDAK' ? 'checked' : '') + '><i></i></span> Tampilkan di Rangkaian Kegiatan</label></div>',
      foot: (i >= 0 ? '<button class="btn btn-danger" data-a="hapus" style="margin-right:auto">' + ic('trash') + 'Hapus</button>' : '') + '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('check') + 'Terapkan</button>',
      acts: {
        w: (bt) => { warna = bt.dataset.v; $$('#kg-w .swatch', m.el).forEach(x => x.classList.toggle('on', x === bt)); $('#kg-wc', m.el).value = warna; },
        i: (bt) => { ikon = bt.dataset.v; $$('#kg-i button', m.el).forEach(x => x.classList.toggle('on', x === bt)); },
        hapus: async (bt, e, mm) => { if (!(await konfirmasi('Hapus kegiatan <b>' + esc(k.Nama) + '</b>?', { danger: true, ok: 'Hapus' }))) return; s.keg.splice(i, 1); mm.close(); this.tandai(); this.render(); },
        ok: (bt, e, mm) => {
          const v = { Nama: $('#kg-n', mm.el).value.trim(), Mulai: $('#kg-m', mm.el).value, Selesai: $('#kg-s', mm.el).value || $('#kg-m', mm.el).value, Warna: $('#kg-wc', mm.el).value || warna, Ikon: ikon, SubKegiatan: $('#kg-sub', mm.el).value.trim(), Tampil: $('#kg-t', mm.el).checked ? 'YA' : 'TIDAK' };
          if (!v.Nama) return toast('Nama kegiatan wajib diisi.', 'err');
          if (!v.Mulai) return toast('Tanggal mulai wajib diisi.', 'err');
          if (v.Selesai < v.Mulai) return toast('Tanggal selesai lebih awal dari tanggal mulai.', 'err');
          if (i >= 0) Object.assign(s.keg[i], v); else s.keg.push(v);
          s.keg.sort(by('Mulai')); mm.close(); this.tandai(); this.render();
        }
      } });
    $('#kg-wc', m.el).addEventListener('input', e => { warna = e.target.value; $$('#kg-w .swatch', m.el).forEach(x => x.classList.remove('on')); });
  },
  async simpan(btn) {
    const s = this.st, p = Dom.perObj(s.per);
    const teks = Object.assign({}, s.teks); delete teks.label;
    const r = await denganSibuk(btn, 'Menyimpan…', () => api('kalender.simpan', { ta: p.ta, smt: p.smt, kegiatan: s.keg, teks: { LabelSemester: s.teks.label, Data: teks } }));
    if (!r.success) return false;
    s.kotor = false; s.keg = null; s.teks = null; toast(r.message); this.render(); return true;
  }
});
