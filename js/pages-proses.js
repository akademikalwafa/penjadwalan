/* =====================================================================
   PENJADWALAN AL WAFA — pages-proses.js
   Realisasi Kurikulum, Generate Jadwal (Reguler/Hybrid, drag & drop,
   klik kanan, tekan lama di layar sentuh), Generate Ujian.
   ===================================================================== */
'use strict';
/* =====================================================================
   REALISASI KURIKULUM
   ===================================================================== */
defPage('realisasi', {
  deps: ['Realisasi', 'Kurikulum', 'Dosen', 'Jadwal', 'Kelas', 'Prodi'], refreshTabel: ['Realisasi', 'Kurikulum', 'Dosen'],
  st: { prodi: '', angkatan: '', kelas: '', status: '', q: '', hal: 1, per: 20, ubah: {} },
  onParams(p, a) { if (a) { Object.assign(this.st, { prodi: '', kelas: '', angkatan: a.angkatan || '', status: a.status || '', q: a.q || '', hal: 1 }); if (a.periodeDari && a.periodeDari !== App.periode.disusun.key) setTimeout(() => toast('Realisasi Kurikulum menampilkan semester yang sedang disusun (' + Dom.perLabel(App.periode.disusun.key) + ').', 'info'), 300); } },
  isDirty() { return Object.keys(this.st.ubah).length > 0; },
  dirtyInfo() { return { judul: Object.keys(this.st.ubah).length + ' penetapan pengampu belum disimpan', sub: 'Perubahan akan memengaruhi validitas jadwal otomatis.' }; },
  buang() { this.st.ubah = {}; this.render(); },
  nilai(u) { const x = this.st.ubah[u.id] || {}; return { Dosen1: 'Dosen1' in x ? x.Dosen1 : u.r.Dosen1, Dosen2: 'Dosen2' in x ? x.Dosen2 : u.r.Dosen2, AturanSKS: 'AturanSKS' in x ? x.AturanSKS : u.r.AturanSKS, Gabung: 'Gabung' in x ? x.Gabung : u.r.Gabung }; },
  ubah(id, patch) {
    const u = Dom.unitMap(App.periode.disusun.key).get(id); if (!u) return;
    const asli = { Dosen1: u.r.Dosen1, Dosen2: u.r.Dosen2, AturanSKS: u.r.AturanSKS, Gabung: u.r.Gabung };
    const x = Object.assign({}, this.st.ubah[id] || {}, patch);
    Object.keys(x).forEach(k => { if (String(x[k] || '') === String(asli[k] || '')) delete x[k]; });
    if (Object.keys(x).length) this.st.ubah[id] = x; else delete this.st.ubah[id];
  },
  kandidatGabung(u) {
    const um = Dom.units(App.periode.disusun.key), nm = norm(u.kur.NamaMK);
    return um.filter(x => x.id !== u.id && x.pola === u.pola && x.rombel !== u.rombel && x.sks >= 2 && (x.kur.KodeMK === u.kur.KodeMK || norm(x.kur.NamaMK) === nm));
  },
  render() {
    const s = this.st, d = App.periode.disusun, units = Dom.units(d.key), jg = Dom.jadwalGrid(d.key);
    const val = u => this.nilai(u);
    const terjadwal = u => jg.has(u.id), perm = u => u.kur.Permanen === 'YA';
    const isi = units.filter(u => val(u).Dosen1).length;
    let list = units.filter(u => (!s.prodi || u.prodi === s.prodi) && (!s.angkatan || u.angkatan === s.angkatan) && (!s.kelas || u.kelas === s.kelas))
      .filter(u => !s.status || (s.status === 'sudah' && val(u).Dosen1) || (s.status === 'belum' && !val(u).Dosen1) || (s.status === 'belumjadwal' && !terjadwal(u)) || (s.status === 'kunci' && perm(u)) || (s.status === 'gabung' && val(u).Gabung))
      .filter(u => !s.q || cocok(u.kur.KodeMK + ' ' + u.kur.NamaMK + ' ' + u.kur.NamaArab + ' ' + Dom.dosenNama(val(u).Dosen1) + ' ' + Dom.dosenNama(val(u).Dosen2), s.q));
    list.sort((a, b) => Dom.rombelUrut(a, b) || num(a.kur.Semester) - num(b.kur.Semester) || String(a.kur.KodeMK).localeCompare(b.kur.KodeMK));
    const tot = list.length; s.hal = Math.min(s.hal, Math.max(1, Math.ceil(tot / s.per)));
    const nKotor = Object.keys(s.ubah).length, ang = [...new Set(units.map(u => u.angkatan))].sort().reverse();
    const optDosen = (pola, cur, kecuali) => { const daftar = Dom.dosenPola(pola), ada = daftar.some(x => x.ID === cur);
      return '<option value="">-- Pilih Dosen Pengampu --</option>' + (cur && !ada ? '<option value="' + attr(cur) + '" selected>⚠ ' + esc(Dom.dosenNama(cur) || cur) + ' (tidak tersedia di pola ' + pola + ')</option>' : '') +
        daftar.filter(x => x.ID !== kecuali).map(x => '<option value="' + attr(x.ID) + '"' + (x.ID === cur ? ' selected' : '') + '>' + esc(x.Nama) + '</option>').join(''); };
    const hint = (id, pola) => { const dd = DB.get('Dosen', 'ID', id); if (!dd) return ''; const n = Dom.sedia(dd, pola).size; return n ? '<div class="t-sub" style="color:var(--ok)">' + ic('okc', 'ic-sm') + ' Tersedia ' + n + ' sesi di pola ' + pola + '</div>' : '<div class="t-sub" style="color:var(--err)">' + ic('alert', 'ic-sm') + ' Belum mengisi ketersediaan ' + pola + '</div>'; };
    const rows = list.slice((s.hal - 1) * s.per, s.hal * s.per).map((u, i) => {
      const v = val(u), kotor = !!s.ubah[u.id], kand = v.Gabung || u.sks >= 2 ? this.kandidatGabung(u) : [];
      const grupAng = v.Gabung ? units.filter(x => (x.id === u.id ? v.Gabung : this.nilai(x).Gabung) === v.Gabung && x.id !== u.id) : [];
      const dosenCell = u.tahfidz ? '<div class="stack" style="gap:6px"><div class="row gap-s" style="flex-wrap:nowrap"><small class="faint" style="width:48px">Dosen 1</small><select class="input sm" data-ch="d1" data-id="' + u.id + '">' + optDosen(u.pola, v.Dosen1, v.Dosen2) + '</select></div><div class="row gap-s" style="flex-wrap:nowrap"><small class="faint" style="width:48px">Dosen 2</small><select class="input sm" data-ch="d2" data-id="' + u.id + '">' + optDosen(u.pola, v.Dosen2, v.Dosen1) + '</select></div>' + (v.Dosen1 && v.Dosen2 ? '<div class="t-sub" style="color:var(--ok)">' + ic('users', 'ic-sm') + ' 2 pengampu halaqah siap</div>' : '') + '</div>'
        : '<select class="input sm ' + (v.Dosen1 ? '' : 'err') + '" data-ch="d1" data-id="' + u.id + '">' + optDosen(u.pola, v.Dosen1) + '</select>' + (v.Dosen1 ? hint(v.Dosen1, u.pola) : '<div class="t-sub" style="color:var(--warn)">' + ic('alertc', 'ic-sm') + ' Wajib diisi sebelum Generate Jadwal</div>');
      const atur = (u.sks > 2 ? '<div class="row gap-s" style="flex-wrap:nowrap"><small class="faint">SKS:</small><select class="input sm" data-ch="aturan" data-id="' + u.id + '"><option value="BERTURUT"' + (v.AturanSKS !== 'BEDA' ? ' selected' : '') + '>Berturut-turut (1 hari / ' + u.sks + ' SKS)</option><option value="BEDA"' + (v.AturanSKS === 'BEDA' ? ' selected' : '') + '>Beda hari (' + (u.sks - u.sks % 2 || 2) + ' SKS + ' + (u.sks % 2 || 2) + ' SKS)</option></select></div>' : '<div class="t-sub">' + u.sks + ' SKS (' + u.bagian + '× pertemuan)</div>') +
        (u.sks >= 2 ? '<div style="margin-top:6px"><label class="chk" style="font-size:12.5px"><input type="checkbox" data-ch="gab" data-id="' + u.id + '" ' + (v.Gabung ? 'checked' : '') + (kand.length || v.Gabung ? '' : ' disabled title="Tidak ada kelas lain dengan MK yang sama di pola ini"') + '> Gabung kelas</label>' +
          (v.Gabung ? '<div class="t-sub">' + ic('merge', 'ic-sm') + ' dengan ' + esc(grupAng.map(x => x.prodi + '-' + x.smt + ' ' + x.kelas).join(', ') || '—') + '</div>' : '') + '</div>' : '');
      const stt = perm(u) ? '<span class="badge navy">' + ic('lock', 'ic-sm') + 'Terkunci</span>' : v.Gabung ? '<span class="badge orange">' + ic('merge', 'ic-sm') + 'Kelas Gabungan</span>' : v.Dosen1 ? '<span class="badge ok dot">Lengkap</span>' : '<span class="badge warn dot">Belum Ada Dosen</span>';
      return '<tr class="' + (kotor ? 'kotor' : '') + (v.Dosen1 ? '' : ' warn') + '"><td class="num">' + String((s.hal - 1) * s.per + i + 1).padStart(2, '0') + '</td><td class="nowrap">' + dotProdi(u.prodi) + ' ' + esc(u.prodi) + '</td><td>' + badgeKelas(u.kelas) + '</td><td>' + esc(u.angkatan) + '</td><td class="center"><b>' + u.smt + '</b></td>' +
        '<td class="mono">' + esc(u.kur.KodeMK) + '</td><td style="min-width:210px"><b>' + esc(u.kur.NamaMK) + '</b>' + (u.tahfidz ? ' <span class="badge orange sq">Tahfidz (2 Dosen)</span>' : '') + (u.kur.NamaArab ? '<div class="arab muted" style="font-size:13px">' + esc(u.kur.NamaArab) + '</div>' : '') + '<div class="t-sub">Pola ' + esc(u.pola) + (terjadwal(u) ? ' · ' + esc(Dom.hariJam(u.id, d.key, u.pola)) : ' · <span style="color:var(--warn)">belum terjadwal</span>') + '</div></td>' +
        '<td class="center"><b>' + u.sks + '</b></td><td style="min-width:260px">' + dosenCell + '</td><td style="min-width:230px">' + atur + '</td><td>' + stt + (kotor ? '<div style="margin-top:4px"><span class="badge orange">Belum disimpan</span></div>' : '') + '</td></tr>';
    }).join('');
    this.el.innerHTML = kepala({ crumb: ['Proses', 'Realisasi Kurikulum', 'T.A. ' + d.ta + ' (' + d.smt + ')'], judul: 'Realisasi Kurikulum', badge: ' <span class="badge orange dot">Semester ' + esc(d.smt + ' ' + d.ta) + (App.periode.persiapan ? ' (Persiapan)' : '') + '</span>',
        desc: 'Penetapan dosen pengampu, pengaturan distribusi SKS (berturut-turut atau beda hari), serta opsi gabung kelas sebelum pembuatan jadwal otomatis dijalankan.',
        aksi: '<button class="btn" data-a="salin">' + ic('copy') + 'Salin Pengampu Semester Lalu</button>' + btnRefresh(false) + '<button class="btn btn-primary" data-a="simpan" ' + (nKotor ? '' : 'disabled') + '>' + ic('save') + 'Simpan Realisasi Kurikulum' + (nKotor ? ' <span class="cnt">' + nKotor + '</span>' : '') + '</button>' }) +
      '<div class="alert info">' + ic('swap') + '<div style="flex:1">Pergantian dosen pada <b>Realisasi Kurikulum</b> otomatis tersinkronisasi dua arah dengan modul <i>Generate Jadwal</i>, dan pilihan dosen hanya menampilkan dosen yang ketersediaannya cocok dengan pola jam kelas.</div><span class="badge ok">Live Validated</span></div>' +
      '<div class="kpis">' + kpi({ lb: 'Total Mata Kuliah', vl: units.length, ic: 'book', ft: 'kurikulum dibuka ' + esc(Dom.perLabel(d.key)) }) +
      kpi({ lb: 'Sudah Isi Dosen', vl: isi + '<small>' + pct(isi, units.length) + '%</small>', ic: 'usercheck', cls: 'ok', bar: pct(isi, units.length), barCls: 'ok', act: 'fs', v: 'sudah' }) +
      kpi({ lb: 'Belum Isi Dosen', vl: (units.length - isi) + '<small>' + pct(units.length - isi, units.length) + '%</small>', ic: 'alert', cls: 'warn', bar: pct(units.length - isi, units.length), barCls: 'warn', act: 'fs', v: 'belum', ft: 'Memerlukan penetapan' }) +
      kpi({ lb: 'Belum Terjadwal', vl: units.filter(u => !terjadwal(u)).length, ic: 'lock', act: 'fs', v: 'belumjadwal', ft: units.filter(perm).length + ' MK terkunci (permanen)' }) + '</div>' +
      '<div class="card" style="margin-bottom:0"><div class="card-b"><div class="fgrid">' +
      '<div class="field"><label>Program Studi</label><select class="input" data-ch="prodi"><option value="">Semua Prodi (' + Dom.prodi().length + ')</option>' + opsi(Dom.prodi().map(p => ({ v: p.Kode, l: p.Nama })), s.prodi) + '</select></div>' +
      '<div class="field"><label>Angkatan</label><select class="input" data-ch="angkatan"><option value="">Semua Angkatan</option>' + opsi(ang.map(a => ({ v: a, l: a + ' (Smt ' + Dom.semMhs(a, d.key) + ')' })), s.angkatan) + '</select></div>' +
      '<div class="field"><label>Jenis Kelas</label><select class="input" data-ch="kelas"><option value="">Semua Kelas</option>' + opsi(Dom.kelasTerjadwal().map(k => k.Nama), s.kelas) + '</select></div>' +
      '<div class="field"><label>Status Pengisian</label><select class="input" data-ch="status">' + opsi([{ v: '', l: 'Semua Status' }, { v: 'sudah', l: 'Sudah Isi Dosen' }, { v: 'belum', l: 'Belum Isi Dosen' }, { v: 'belumjadwal', l: 'Belum Terjadwal' }, { v: 'kunci', l: 'Terkunci (permanen)' }, { v: 'gabung', l: 'Kelas Gabungan' }], s.status) + '</select></div>' +
      '<div class="field" style="grid-column:span 2"><label>Pencarian Mata Kuliah / Dosen</label><div class="input-ic">' + ic('search') + '<input class="input" data-in="q" value="' + attr(s.q) + '" placeholder="Ketik kode MK, nama mata kuliah, atau nama dosen…"></div></div></div>' +
      (s.prodi || s.angkatan || s.kelas || s.status || s.q ? '<div class="row" style="margin-top:10px"><span class="faint">Filter aktif:</span>' + [['prodi', s.prodi && Dom.prodiNama(s.prodi)], ['angkatan', s.angkatan && 'Angkatan ' + s.angkatan], ['kelas', s.kelas], ['status', s.status && { sudah: 'Sudah isi dosen', belum: 'Belum isi dosen', belumjadwal: 'Belum terjadwal', kunci: 'Terkunci', gabung: 'Gabungan' }[s.status]], ['q', s.q && '“' + s.q + '”']].filter(x => x[1]).map(x => '<span class="chip">' + esc(x[1]) + '<button class="x" data-a="hapusF" data-v="' + x[0] + '">' + ic('x', 'ic-sm') + '</button></span>').join('') + '<span class="sp"></span><button class="btn btn-ghost btn-sm" data-a="resetF">' + ic('refresh', 'ic-sm') + 'Reset Filter</button></div>' : '') + '</div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="num">No</th><th>Prodi</th><th>Kelas</th><th>Angkatan</th><th>Smt</th><th>Kode MK</th><th>Nama Mata Kuliah</th><th>SKS</th><th>Dosen Pengampu</th><th>Pengaturan</th><th>Status</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="11">' + kosong(units.length ? 'Tidak ada mata kuliah pada filter ini.' : 'Belum ada mata kuliah dibuka untuk ' + esc(Dom.perLabel(d.key)) + '. Centang mata kuliah di menu Kurikulum lalu Simpan.', 'book') + '</td></tr>') + '</tbody></table></div>' +
      '<div class="pager" style="border-top:1px solid var(--border)"><span>Menampilkan <b>' + Math.min(tot, s.per) + '</b> dari <b>' + tot + '</b> mata kuliah</span><span class="faint">Baris per halaman:</span><select class="input sm" style="width:auto" data-ch="per">' + opsi([10, 20, 50, 100], s.per) + '</select>' + (tot > s.per ? pagerHtml(tot, s.hal, s.per, '').replace('<div class="pager">', '<div style="margin-left:auto;display:flex;gap:8px;align-items:center">').replace(/<span>Menampilkan.*?<\/span>/, '') : '') + '</div></div>';
    App.savebar(this);
  },
  acts: {
    pg(b) { this.st.hal = +b.dataset.p; this.render(); },
    fs(b) { this.st.status = b.dataset.v; this.st.hal = 1; this.render(); },
    hapusF(b) { this.st[b.dataset.v] = ''; this.st.hal = 1; this.render(); },
    resetF() { Object.assign(this.st, { prodi: '', angkatan: '', kelas: '', status: '', q: '', hal: 1 }); this.render(); },
    simpan(b) { this.simpan(b); },
    async salin(b) {
      const r = await denganSibuk(b, 'Mencari…', () => api('realisasi.salinLalu', {}));
      if (!r.success) return;
      if (!r.data.usul.length) return toast(r.message, 'info');
      r.data.usul.forEach(x => this.ubah(x.ID, { Dosen1: x.Dosen1, Dosen2: x.Dosen2 || undefined }));
      this.render(); toast(r.message + ' Periksa lalu tekan Simpan.', 'info');
    }
  },
  ch: {
    prodi(t) { this.st.prodi = t.value; this.st.hal = 1; this.render(); }, angkatan(t) { this.st.angkatan = t.value; this.st.hal = 1; this.render(); },
    kelas(t) { this.st.kelas = t.value; this.st.hal = 1; this.render(); }, status(t) { this.st.status = t.value; this.st.hal = 1; this.render(); },
    per(t) { this.st.per = +t.value; this.st.hal = 1; this.render(); },
    d1(t) { this.setDosen(t.dataset.id, 'Dosen1', t.value); }, d2(t) { this.setDosen(t.dataset.id, 'Dosen2', t.value); },
    aturan(t) { this.ubah(t.dataset.id, { AturanSKS: t.value }); this.render(); },
    gab(t) { this.setGabung(t.dataset.id, t.checked, t); }
  },
  inp: { q: debounce(function (t) { this.st.q = t.value; this.st.hal = 1; this.render(); const i = $('[data-in="q"]', this.el); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250) },
  anggotaGrup(g) { if (!g) return []; return Dom.units(App.periode.disusun.key).filter(x => this.nilai(x).Gabung === g); },
  setDosen(id, kol, nilai) {
    const u = Dom.unitMap(App.periode.disusun.key).get(id), v = this.nilai(u), p = {}; p[kol] = nilai;
    this.ubah(id, p);
    if (v.Gabung) this.anggotaGrup(v.Gabung).forEach(x => { if (x.id !== id) this.ubah(x.id, p); });
    this.render();
  },
  async setGabung(id, on, el) {
    const um = Dom.unitMap(App.periode.disusun.key), u = um.get(id), v = this.nilai(u);
    if (!on) {
      const g = v.Gabung, sisa = this.anggotaGrup(g).filter(x => x.id !== id);
      this.ubah(id, { Gabung: '' });
      if (sisa.length === 1) this.ubah(sisa[0].id, { Gabung: '' });
      return this.render();
    }
    const kand = this.kandidatGabung(u);
    if (!kand.length) { el.checked = false; return toast('Tidak ada kelas lain dengan mata kuliah yang sama di pola ' + u.pola + '.', 'warn'); }
    const pilih = await new Promise(res => {
      let hasil = null;
      Modal.buka({ title: 'Gabung kelas', sub: esc(u.kur.NamaMK) + ' · ' + esc(Dom.rombelLabel(u.prodi, u.angkatan, u.kelas, App.periode.disusun.key)), icon: 'merge',
        body: '<p class="muted" style="margin-bottom:10px">Pilih kelas yang digabung. Mata kuliah gabung diajar bersama pada jam yang sama oleh dosen yang sama dan tidak dianggap bentrok.</p><div class="stack" style="gap:8px">' +
          kand.map(x => '<label class="chk card card-b" style="padding:10px 12px"><input type="checkbox" value="' + x.id + '" ' + (this.nilai(x).Gabung && this.nilai(x).Gabung === v.Gabung ? 'checked' : '') + '><div><b>' + esc(Dom.rombelLabel(x.prodi, x.angkatan, x.kelas, App.periode.disusun.key, true)) + '</b><div class="t-sub">' + esc(x.kur.KodeMK + ' · ' + x.kur.NamaMK) + ' · ' + esc(Dom.dosenTeks({ dosen: [this.nilai(x).Dosen1, this.nilai(x).Dosen2].filter(Boolean) }) || 'belum ada dosen') + '</div></div></label>').join('') + '</div>',
        foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('merge') + 'Gabungkan</button>',
        acts: { ok: (b, e, m) => { hasil = $$('input[type=checkbox]:checked', m.el).map(i => i.value); m.close(); } }, onClose: () => res(hasil) });
    });
    if (!pilih || !pilih.length) { el.checked = !!v.Gabung; return; }
    const g = v.Gabung || pilih.map(x => this.nilai(um.get(x)).Gabung).find(Boolean) || 'G' + id;
    this.ubah(id, { Gabung: g });
    pilih.forEach(x => this.ubah(x, { Gabung: g, Dosen1: v.Dosen1, Dosen2: v.Dosen2 }));
    this.render();
  },
  async simpan(btn) {
    const ubah = Object.keys(this.st.ubah).map(id => Object.assign({ ID: id }, this.st.ubah[id]));
    if (!ubah.length) return true;
    const kirim = (pk) => api('realisasi.simpan', { ubah, base: { Realisasi: DB.ver.Realisasi }, paksa: !!pk }, { silent: true });
    let r = await denganSibuk(btn, 'Menyimpan…', () => kirim(false));
    if (r.code === 'CONFLICT') r = await tanganiKonflik(r, () => kirim(true));
    if (!r.success) { if (r.code !== 'CONFLICT') toast(r.message, 'err'); return false; }
    this.st.ubah = {}; toast(r.message); this.render(); return true;
  }
});

/* =====================================================================
   MESIN GRID JADWAL (dipakai Generate Jadwal & Generate Ujian)
   ===================================================================== */
const Seret = {
  pasang(root, cfg) {
    root.addEventListener('pointerdown', (e) => {
      const card = e.target.closest('.sgc[data-k]');
      if (!card || !root.contains(card) || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const item = cfg.item(card.dataset.k); if (!item) return;
      const sentuh = e.pointerType !== 'mouse';
      const st = { x0: e.clientX, y0: e.clientY, mulai: false, siap: !sentuh, ghost: null, target: null };
      if (sentuh) st.timer = setTimeout(() => { st.siap = true; if (navigator.vibrate) navigator.vibrate(12); card.style.outline = '2px solid var(--accent)'; }, 380);
      const cegahGulir = (ev) => { if (st.siap) ev.preventDefault(); };
      const bersih = () => {
        clearTimeout(st.timer);
        document.removeEventListener('pointermove', gerak); document.removeEventListener('pointerup', angkat); document.removeEventListener('pointercancel', bersih);
        document.removeEventListener('touchmove', cegahGulir);
        if (st.ghost) st.ghost.remove(); card.classList.remove('dragging'); card.style.outline = '';
        $$('.drop-ok,.drop-bad', root).forEach(x => x.classList.remove('drop-ok', 'drop-bad'));
      };
      const sasaran = (x, y) => { const el = document.elementFromPoint(x, y); if (!el) return null; const td = el.closest('td.cell[data-rb]'); if (td && root.contains(td)) return { td, rb: td.dataset.rb, slot: td.dataset.s }; const tr = el.closest('[data-luar]'); if (tr && root.contains(tr)) return { td: tr, luar: true }; return null; };
      const gerak = (ev) => {
        const jauh = Math.hypot(ev.clientX - st.x0, ev.clientY - st.y0) > 6;
        if (!st.mulai) {
          if (!st.siap) { if (jauh) bersih(); return; }
          if (!jauh) return;
          if (item.kunci) { toast('Kartu ini terkunci. Buka kunci lewat klik kanan / tekan lama.', 'info'); bersih(); return; }
          st.mulai = true; card.classList.add('dragging');
          st.ghost = card.cloneNode(true); st.ghost.classList.remove('dragging'); st.ghost.classList.add('sg-ghost'); document.body.appendChild(st.ghost);
        }
        ev.preventDefault();
        st.ghost.style.left = (ev.clientX - 70) + 'px'; st.ghost.style.top = (ev.clientY - 30) + 'px';
        const t = sasaran(ev.clientX, ev.clientY);
        if (st.target && (!t || t.td !== st.target.td)) st.target.td.classList.remove('drop-ok', 'drop-bad');
        st.target = t;
        if (t) t.td.classList.add(cfg.bolehJatuh(item, t) ? 'drop-ok' : 'drop-bad');
        const wrap = $('.sg-wrap', root);
        if (wrap) { const r = wrap.getBoundingClientRect(); if (ev.clientX > r.right - 40) wrap.scrollLeft += 18; else if (ev.clientX < r.left + 200) wrap.scrollLeft -= 18; if (ev.clientY > r.bottom - 30) wrap.scrollTop += 14; else if (ev.clientY < r.top + 60) wrap.scrollTop -= 14; }
      };
      const angkat = (ev) => {
        const t = st.target, mulai = st.mulai, siap = st.siap;
        bersih();
        if (mulai) { if (t && cfg.bolehJatuh(item, t)) cfg.jatuh(item, t); else if (t) toast(cfg.alasanTolak ? cfg.alasanTolak(item, t) : 'Tidak dapat dipindah ke sel itu.', 'warn'); }
        else if (sentuh && siap) cfg.menu(item, ev.clientX, ev.clientY);
      };
      document.addEventListener('pointermove', gerak, { passive: false }); document.addEventListener('pointerup', angkat); document.addEventListener('pointercancel', bersih);
      document.addEventListener('touchmove', cegahGulir, { passive: false });
    });
    root.addEventListener('contextmenu', e => { const card = e.target.closest('.sgc[data-k]'); if (card && root.contains(card)) { e.preventDefault(); const it = cfg.item(card.dataset.k); if (it) cfg.menu(it, e.clientX, e.clientY); } });
  }
};
const GridJ = {
  /** cfg: {slots, rombel:[{key,label,sub,warna}], isi:Map(rb#slot → [item]), kartu(item), filterHari, mhs(rb)} */
  tabel(cfg) {
    const slots = cfg.filterHari ? cfg.slots.filter(s => s.hari === cfg.filterHari) : cfg.slots, hari = [...new Set(slots.map(s => s.hari))];
    const akhirHari = new Set(); hari.forEach(h => { const l = slots.filter(s => s.hari === h); akhirHari.add(l[l.length - 1].key); });
    let h = '<table class="sg ' + (cfg.kelas || '') + '"><thead><tr><th class="rh" rowspan="2">KELAS / ROMBEL</th>' + hari.map(x => '<th colspan="' + slots.filter(s => s.hari === x).length + '">' + x + '</th>').join('') + '</tr><tr>' +
      slots.map(s => '<th>S' + s.sesi + '<small>' + s.mulai + '–' + s.selesai + '</small></th>').join('') + '</tr></thead><tbody>';
    cfg.rombel.forEach(rb => {
      h += '<tr><td class="rh"><div class="rb" style="--c:' + attr(rb.warna) + '"><b>' + esc(rb.label) + '</b><small>' + esc(rb.sub || '') + '</small></div></td>' +
        slots.map(s => { const l = cfg.isi.get(rb.key + '#' + s.key) || []; return '<td class="cell' + (akhirHari.has(s.key) ? ' day-end' : '') + '" data-rb="' + attr(rb.key) + '" data-s="' + attr(s.key) + '">' + (l.length ? l.map(cfg.kartu).join('') : '<div class="sg-empty">Kosong</div>') + '</td>'; }).join('') + '</tr>';
    });
    if (!cfg.rombel.length) h += '<tr><td colspan="' + (slots.length + 1) + '">' + kosong('Belum ada mata kuliah untuk pola ini. Isi Realisasi Kurikulum terlebih dahulu.', 'calplus') + '</td></tr>';
    return h + '</tbody></table>';
  }
};

/* =====================================================================
   GENERATE JADWAL — Kelas Reguler & Kelas Hybrid
   ===================================================================== */
defPage('jadwal', {
  deps: ['Jadwal', 'Realisasi', 'Kurikulum', 'Dosen', 'JamSesi', 'Kelas', 'Prodi', 'Mahasiswa'], refreshTabel: ['Jadwal', 'Realisasi', 'Kurikulum', 'Dosen'],
  st: { pola: 'Reguler', kerja: {}, hari: '', prodi: '', smt: '', warna: true, hlgb: true },
  onParams(p) { this.st.pola = p[0] === 'hybrid' ? 'Hybrid' : 'Reguler'; },
  judulMenu() { return 'Generate Jadwal — Kelas ' + this.st.pola; },
  w() { const p = this.st.pola; if (!this.st.kerja[p]) this.st.kerja[p] = { map: null, kotor: false, alasan: {}, gen: null }; return this.st.kerja[p]; },
  isDirty() { return ['Reguler', 'Hybrid'].some(p => this.st.kerja[p] && this.st.kerja[p].kotor); },
  dirtyInfo() { const p = ['Reguler', 'Hybrid'].filter(x => this.st.kerja[x] && this.st.kerja[x].kotor); return { judul: 'Jadwal ' + p.join(' & ') + ' belum disimpan', sub: 'Simpan agar jadwal berlaku & mata kuliah menjadi permanen.' }; },
  buang() { ['Reguler', 'Hybrid'].forEach(p => { if (this.st.kerja[p]) { this.st.kerja[p].map = null; this.st.kerja[p].kotor = false; } }); this.render(); },
  /** Salinan kerja: kunci uid#bagian → {uid, b, hari, sesi, posisi, kunci} */
  siapkan() {
    const w = this.w(), per = App.periode.disusun.key, pola = this.st.pola, units = Dom.units(per).filter(u => u.pola === pola);
    if (w.map && w.kotor) {
      const valid = new Set(); units.forEach(u => { for (let b = 1; b <= u.bagian; b++) { const k = u.id + '#' + b; valid.add(k); if (!w.map.has(k)) w.map.set(k, { k, uid: u.id, b, posisi: 'LUAR', kunci: false }); } });
      [...w.map.keys()].forEach(k => { if (!valid.has(k)) w.map.delete(k); });
      return w;
    }
    const simpan = new Map(); Dom.jadwal(per, pola).forEach(j => simpan.set(j.RealisasiID + '#' + j.Bagian, j));
    w.map = new Map();
    units.forEach(u => { for (let b = 1; b <= u.bagian; b++) { const k = u.id + '#' + b, j = simpan.get(k); w.map.set(k, j && j.Posisi === 'GRID' ? { k, uid: u.id, b, hari: j.Hari, sesi: j.Sesi, posisi: 'GRID', kunci: j.Kunci === 'YA' } : { k, uid: u.id, b, posisi: 'LUAR', kunci: false }); } });
    w.tersimpan = simpan.size > 0;
    return w;
  },
  entriLain() {
    const per = App.periode.disusun.key, lain = this.st.pola === 'Reguler' ? 'Hybrid' : 'Reguler', wl = this.st.kerja[lain];
    if (wl && wl.map && wl.kotor) return [...wl.map.values()].filter(x => x.posisi === 'GRID').map(x => ({ uid: x.uid, hari: x.hari, sesi: x.sesi, pola: lain, RealisasiID: x.uid, Hari: x.hari, Sesi: x.sesi }));
    return Dom.jadwal(per, lain).filter(j => j.Posisi === 'GRID').map(j => ({ uid: j.RealisasiID, hari: j.Hari, sesi: j.Sesi, pola: lain, RealisasiID: j.RealisasiID, Hari: j.Hari, Sesi: j.Sesi }));
  },
  render() {
    const s = this.st, pola = s.pola, per = App.periode.disusun.key, w = this.siapkan(), um = Dom.unitMap(per), slots = Dom.slots(pola);
    const items = [...w.map.values()], grid = items.filter(x => x.posisi === 'GRID'), luar = items.filter(x => x.posisi !== 'GRID');
    const cek = Dom.periksa(grid.map(x => ({ uid: x.uid, hari: x.hari, sesi: x.sesi, pola })).concat(this.entriLain()), per, pola);
    this._cek = cek;
    const romAll = Dom.rombelJadwal(per, pola);
    const rombel = romAll.filter(r => (!s.prodi || r.prodi === s.prodi) && (!s.smt || String(r.smt) === s.smt)).map(r => ({ key: r.key, label: r.prodi + ' · Smt ' + r.smt + ' (' + r.kelas + ')', sub: Dom.prodiNama(r.prodi) + ' · ' + Dom.mhsRombel(r.prodi, r.angkatan, r.kelas).length + ' mhs', warna: Dom.prodiWarna(r.prodi) }));
    const isi = new Map(); grid.forEach(x => { const u = um.get(x.uid); if (!u) return; const k = u.rombel + '#' + x.hari + '|' + x.sesi; if (!isi.has(k)) isi.set(k, []); isi.get(k).push(x); });
    const nMasalah = [...cek.masalah.keys()].length, dosenAktif = new Set(grid.flatMap(x => (um.get(x.uid) || { dosen: [] }).dosen));
    const pctPlot = pct(grid.length, items.length);
    const legDosen = [...dosenAktif].slice(0, 8).map(id => '<span><i style="background:' + Dom.warnaDosen(id) + ';border-radius:50%"></i>' + esc(Dom.namaPendek(Dom.dosenNama(id))) + '</span>').join('') + (dosenAktif.size > 8 ? '<span class="faint">+' + (dosenAktif.size - 8) + ' dosen lainnya</span>' : '');
    const sesiTeks = Dom.sesiPola(pola).length + ' Sesi ' + pola + (slots.length ? ': ' + slots[0].mulai + ' – ' + slots[slots.length - 1].selesai + ' WIB' : '');
    this.el.innerHTML = kepala({ crumb: ['Proses', 'Generate Jadwal', 'Kelas ' + pola, 'T.A. ' + App.periode.disusun.ta + ' (' + App.periode.disusun.smt + ')'], judul: 'Generate Jadwal — Kelas ' + pola,
        badge: ' <span class="badge ' + (w.kotor ? 'orange' : w.tersimpan ? 'ok' : '') + ' dot">' + (w.kotor ? 'Draft · ' + pctPlot + '% terplot · belum disimpan' : w.tersimpan ? 'Tersimpan · ' + pctPlot + '% terplot' : 'Belum digenerate') + '</span> <span class="badge info sq">' + esc(Dom.perLabel(per)) + '</span>',
        desc: pola === 'Hybrid' ? 'Pola perkuliahan akhir pekan: Jumat sore–malam & Sabtu untuk kelas Hybrid.' : 'Kelas Reguler, Ma\'had Aly Ikhwan, dan Ma\'had Aly Akhwat · Senin–Jumat.',
        aksi: '<button class="btn btn-primary" data-a="generate">' + ic('zap') + 'Generate Jadwal</button>' + btnRefresh() + '<button class="btn btn-ok" data-a="simpan" ' + (w.kotor ? '' : 'disabled') + '>' + ic('save') + 'Simpan</button><button class="btn" data-a="excel">' + ic('sheet') + 'Simpan Excel</button><button class="btn btn-accent" data-a="cetak">' + ic('printer') + 'Cetak (A4)</button>' }) +
      '<div class="kpis">' + kpi({ lb: 'Total Sesi Terplot', vl: grid.length + '<small>/ ' + items.length + ' sesi</small>', ic: 'calplus', bar: pctPlot, ft: pctPlot + '% terplot' }) +
      kpi({ lb: 'Konflik / Bentrok Dosen', vl: cek.bentrok + '<small>bentrok</small>', ic: cek.bentrok ? 'alert' : 'shield', cls: cek.bentrok ? 'err' : 'ok', ft: cek.bentrok ? 'Perbaiki kartu bertanda merah' : (nMasalah ? nMasalah + ' catatan ketersediaan' : 'Tervalidasi: tidak ada tumpang tindih') }) +
      kpi({ lb: 'Sesi di Luar Grid', vl: luar.length + '<small>sesi</small>', ic: 'clipboard', cls: luar.length ? 'warn' : '', ft: luar.length ? 'Perlu aksi — tersedia di baki bawah' : 'Semua mata kuliah masuk grid' }) +
      kpi({ lb: 'Dosen Mengajar Aktif', vl: dosenAktif.size + '<small>dosen</small>', ic: 'users', ft: romAll.length + ' kelas/rombel pola ' + pola }) + '</div>' +
      '<div class="card card-b" style="margin-bottom:14px"><div class="row"><div class="seg"><button data-a="hari" data-v="" class="' + (!s.hari ? 'on' : '') + '">Semua Hari</button>' + Dom.hariPola(pola).map(h => '<button data-a="hari" data-v="' + h + '" class="' + (s.hari === h ? 'on' : '') + '">' + h + '</button>').join('') + '</div><span class="sp"></span>' +
      '<select class="input" style="width:auto" data-ch="prodi"><option value="">Semua Prodi</option>' + opsi(Dom.prodi().map(p => ({ v: p.Kode, l: p.Nama })), s.prodi) + '</select>' +
      '<select class="input" style="width:auto" data-ch="smt"><option value="">Semua Semester</option>' + opsi([...new Set(romAll.map(r => r.smt))].sort((a, b) => a - b).map(x => ({ v: String(x), l: 'Semester ' + x })), s.smt) + '</select></div>' +
      '<div class="row" style="margin-top:10px"><label class="chk"><input type="checkbox" data-ch="warna" ' + (s.warna ? 'checked' : '') + '> Kode Warna Dosen</label><label class="chk"><input type="checkbox" data-ch="hlgb" ' + (s.hlgb ? 'checked' : '') + '> Highlight Gabungan</label><span class="sp"></span>' +
      '<div class="legend">' + legDosen + '<span>' + ic('lock', 'ic-sm') + ' Slot terkunci</span><span><i style="background:var(--accent)"></i>Kelas gabungan</span><span>' + ic('users', 'ic-sm') + ' 2 dosen (tahfidz)</span></div></div></div>' +
      '<div class="card" id="jg-root"><div class="card-h"><h3>' + ic('grid') + 'Matriks Penjadwalan Mingguan (' + esc(sesiTeks) + ')</h3><span class="sp"></span><span class="muted" style="font-size:12.5px">' + ic('grip', 'ic-sm') + ' Seret kartu untuk memindah sesi · klik kanan untuk opsi · layar sentuh: tekan lama lalu geser</span></div>' +
      '<div class="sg-wrap">' + GridJ.tabel({ slots, rombel, isi, filterHari: s.hari, kelas: (s.warna ? 'warna ' : '') + (s.hlgb ? 'hl-gb' : ''), kartu: (x) => this.kartu(x, um, cek) }) + '</div>' +
      '<div class="card-h" style="border-top:1px solid var(--border);background:var(--warn-bg)"><h3>' + ic('alert') + 'Mata Kuliah di Luar Grid</h3><span class="badge ' + (luar.length ? 'warn' : 'ok') + '">' + luar.length + ' sesi</span><div class="sub">Dikelompokkan per prodi, semester, dan kelas. Seret kartu ke sel kosong di baris kelasnya, atau tarik kartu dari grid ke sini.</div></div>' +
      '<div class="tray" data-luar="1">' + this.baki(luar, um) + '</div></div>' +
      '<div class="alert info" style="margin-top:14px">' + ic('info') + '<div>Kartu yang dikunci (' + ic('lock', 'ic-sm') + ') tidak akan bergeser saat Generate Jadwal dijalankan ulang. Setelah disimpan, mata kuliah di grid menjadi <b>permanen</b> di Kurikulum.</div></div>';
    if (!this._seret) { this._seret = true; Seret.pasang(this.el, { item: (k) => this.w().map.get(k), bolehJatuh: (it, t) => this.boleh(it, t), alasanTolak: (it, t) => this.alasan(it, t), jatuh: (it, t) => this.jatuh(it, t), menu: (it, x, y) => this.menu(it, x, y) }); }
    App.savebar(this);
  },
  kartu(x, um, cek) {
    const u = um.get(x.uid); if (!u) return '';
    const m = cek.masalah.get(x.uid + '#' + x.hari + '|' + x.sesi) || [], bentrok = m.some(t => /^Bentrok/.test(t));
    const sksBag = u.bagian > 1 ? (x.b < u.bagian || u.sks % 2 === 0 ? 2 : u.sks % 2) : u.sks;
    const anggota = u.gabung ? Dom.units(App.periode.disusun.key).filter(y => y.gabung === u.gabung && y.id !== u.id) : [];
    return '<div class="sgc' + (u.gabung ? ' gab' : '') + (bentrok ? ' konflik' : m.length ? ' warn' : '') + '" data-k="' + attr(x.k) + '" style="--dc:' + Dom.warnaDosen(u.dosen[0]) + '" title="' + attr(u.kur.KodeMK + ' · ' + u.kur.NamaMK + '\n' + (Dom.dosenTeks(u) || 'Belum ada dosen') + (m.length ? '\n⚠ ' + m.join('\n⚠ ') : '')) + '">' +
      (x.kunci ? '<span class="lock">' + ic('lock', 'ic-sm') + '</span>' : '') + '<div class="top"><span class="sks">' + sksBag + ' SKS</span>' + (u.bagian > 1 ? '<span class="sks" style="background:var(--surface-3);color:var(--text-2)">' + x.b + '/' + u.bagian + '</span>' : '') +
      (u.gabung ? '<span class="flag gb" title="Gabung dengan ' + attr(anggota.map(y => y.prodi + ' ' + y.kelas).join(', ')) + '">Gabung</span>' : '') + (u.tahfidz ? '<span class="flag th">Tahfidz</span>' : '') + '</div>' +
      '<div class="mk">' + esc(u.kur.NamaMK) + '</div><div class="ds">' + (u.dosen.length ? esc(u.dosen.map(d => Dom.namaPendek(Dom.dosenNama(d))).join(' & ')) : '<span style="color:var(--err)">Belum ada dosen</span>') + '</div>' +
      (m.length ? '<div class="why">⚠ ' + esc(m[0]) + '</div>' : '') + (x.posisi !== 'GRID' && this.w().alasan[x.k] ? '<div class="why">' + esc(this.w().alasan[x.k]) + '</div>' : '') + '</div>';
  },
  baki(luar, um) {
    if (!luar.length) return '<div class="faint" style="grid-column:1/-1;padding:6px 2px">' + ic('okc', 'ic-sm') + ' Tidak ada mata kuliah di luar grid.</div>';
    const g = groupBy(luar.filter(x => um.get(x.uid)), x => um.get(x.uid).rombel), per = App.periode.disusun.key, cek = this._cek || { masalah: new Map() };
    return [...g.entries()].sort((a, b) => Dom.rombelUrut(um.get(a[1][0].uid), um.get(b[1][0].uid))).map(([rb, l]) => { const u = um.get(l[0].uid);
      return '<div class="tray-grp">' + esc(Dom.rombelLabel(u.prodi, u.angkatan, u.kelas, per, true)) + '</div>' + l.map(x => { const uu = um.get(x.uid); const hint = this.saranSlot(uu);
        return this.kartu(x, um, cek).replace('</div></div>', '</div>' + (hint ? '<div class="t-sub" style="color:var(--accent-h)">' + ic('pin', 'ic-sm') + ' Perlu slot: ' + esc(hint) + '</div>' : '') + '</div>'); }).join(''); }).join('');
  },
  saranSlot(u) { const d = DB.get('Dosen', 'ID', u.dosen[0]); if (!d) return ''; const set = Dom.sedia(d, u.pola); return [...set].slice(0, 3).map(k => k.replace('|', ' S')).join(', ') + (set.size > 3 ? '…' : ''); },
  boleh(it, t) {
    if (t.luar) return it.posisi === 'GRID';
    const u = Dom.unitMap(App.periode.disusun.key).get(it.uid); if (!u || u.rombel !== t.rb) return false;
    const lain = [...this.w().map.values()].filter(x => x.posisi === 'GRID' && x.k !== it.k && x.hari + '|' + x.sesi === t.slot && Dom.unitMap(App.periode.disusun.key).get(x.uid).rombel === t.rb);
    return !lain.some(x => x.kunci);
  },
  alasan(it, t) { if (t.luar) return 'Kartu sudah di luar grid.'; const u = Dom.unitMap(App.periode.disusun.key).get(it.uid); if (u && u.rombel !== t.rb) return 'Kartu hanya dapat dipindah di baris kelasnya sendiri (' + u.prodi + ' ' + u.kelas + ').'; return 'Sel itu berisi kartu terkunci.'; },
  /** Pindah (dengan tukar bila sel terisi); anggota gabung ikut pindah. */
  jatuh(it, t) {
    const w = this.w(), um = Dom.unitMap(App.periode.disusun.key), u = um.get(it.uid);
    const pindah = (x, hari, sesi, posisi) => { const lama = { hari: x.hari, sesi: x.sesi, posisi: x.posisi }; x.hari = hari; x.sesi = sesi; x.posisi = posisi; return lama; };
    const anggota = u.gabung ? [...w.map.values()].filter(x => x.k !== it.k && x.b === it.b && (um.get(x.uid) || {}).gabung === u.gabung) : [];
    if (t.luar) { [it].concat(anggota).forEach(x => pindah(x, '', '', 'LUAR')); }
    else {
      const [hari, sesi] = t.slot.split('|');
      for (const x of [it].concat(anggota)) {
        const ux = um.get(x.uid);
        const occ = [...w.map.values()].filter(y => y.posisi === 'GRID' && y.k !== x.k && y.hari === hari && String(y.sesi) === sesi && (um.get(y.uid) || {}).rombel === ux.rombel);
        if (occ.some(y => y.kunci)) { toast('Kelas ' + ux.prodi + ' ' + ux.kelas + ' memiliki kartu terkunci di slot itu.', 'warn'); return; }
        const lama = pindah(x, hari, sesi, 'GRID');
        occ.forEach(y => { if (lama.posisi === 'GRID') pindah(y, lama.hari, lama.sesi, 'GRID'); else pindah(y, '', '', 'LUAR'); });
      }
    }
    w.kotor = true; delete w.alasan[it.k]; this.render();
  },
  menu(it, x, y) {
    const per = App.periode.disusun.key, u = Dom.unitMap(per).get(it.uid); if (!u) return;
    const items = [{ head: u.kur.KodeMK + ' · ' + u.kur.NamaMK }, { label: u.tahfidz ? 'Ganti dosen (2 dosen tahfidz)…' : 'Ganti dosen…', icon: 'user', fn: () => this.gantiDosen(u) },
      { label: u.gabung ? 'Atur gabung kelas…' : 'Gabung dengan kelas lain…', icon: 'merge', fn: () => this.gabung(u, it), dis: u.sks < 2 },
      u.gabung ? { label: 'Lepas gabung', icon: 'x', fn: () => this.lepasGabung(u) } : null,
      { sep: true }, { label: it.kunci ? 'Buka kunci posisi' : 'Kunci posisi', icon: it.kunci ? 'unlock' : 'lock', fn: () => { it.kunci = !it.kunci; if (it.posisi !== 'GRID') it.kunci = false; this.w().kotor = true; this.render(); }, dis: it.posisi !== 'GRID' },
      { label: 'Pindahkan ke luar grid', icon: 'arrowl', fn: () => { if (it.kunci) return toast('Buka kunci terlebih dahulu.', 'info'); this.jatuh(it, { luar: true }); }, dis: it.posisi !== 'GRID' },
      { label: 'Lihat di Realisasi Kurikulum', icon: 'ext', fn: () => App.nav('realisasi', { q: u.kur.KodeMK }) }].filter(Boolean);
    Ctx.buka(x, y, items);
  },
  async simpanRealisasi(ubah, pesan) {
    const r = await api('realisasi.simpan', { ubah });
    if (r.success) toast(pesan || 'Tersimpan & tersinkron ke Realisasi Kurikulum.');
    return r;
  },
  gantiDosen(u) {
    const opt = (cur, kec) => '<option value="">— pilih —</option>' + Dom.dosenPola(u.pola).filter(d => d.ID !== kec).map(d => { const n = Dom.sedia(d, u.pola).size; return '<option value="' + attr(d.ID) + '"' + (d.ID === cur ? ' selected' : '') + '>' + esc(d.Nama) + ' · ' + n + ' sesi</option>'; }).join('');
    Modal.buka({ title: 'Ganti dosen pengampu', sub: esc(u.kur.NamaMK) + ' · ' + esc(Dom.rombelLabel(u.prodi, u.angkatan, u.kelas, App.periode.disusun.key)), icon: 'user',
      body: '<div class="alert info">' + ic('swap') + '<div>Perubahan langsung tersimpan dan tersinkron dua arah ke Realisasi Kurikulum' + (u.gabung ? ' (berlaku untuk semua kelas gabungan)' : '') + '.</div></div><div class="stack"><div class="field"><label>' + (u.tahfidz ? 'Dosen 1' : 'Dosen pengampu') + '</label><select class="input" id="gd-1">' + opt(u.r.Dosen1, '') + '</select></div>' +
        (u.tahfidz ? '<div class="field"><label>Dosen 2 (tahfidz)</label><select class="input" id="gd-2">' + opt(u.r.Dosen2, '') + '</select></div>' : '') + '</div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('save') + 'Simpan</button>',
      acts: { ok: async (b, e, m) => {
        const d1 = $('#gd-1', m.el).value, d2 = u.tahfidz ? $('#gd-2', m.el).value : '';
        if (d2 && d2 === d1) return toast('Dosen 1 dan Dosen 2 tidak boleh sama.', 'err');
        const ids = u.gabung ? Dom.units(App.periode.disusun.key).filter(x => x.gabung === u.gabung).map(x => x.id) : [u.id];
        const r = await denganSibuk(b, 'Menyimpan…', () => this.simpanRealisasi(ids.map(id => Object.assign({ ID: id, Dosen1: d1 }, u.tahfidz ? { Dosen2: d2 } : {}))));
        if (r.success) m.close();
      } } });
  },
  gabung(u, it) {
    const kand = Pages.realisasi.kandidatGabung(u);
    if (!kand.length) return toast('Tidak ada kelas lain dengan mata kuliah yang sama di pola ini.', 'warn');
    Modal.buka({ title: 'Gabung kelas', sub: esc(u.kur.NamaMK), icon: 'merge',
      body: '<p class="muted" style="margin-bottom:10px">Kelas terpilih akan diajar bersama di slot yang sama oleh dosen ' + esc(Dom.dosenTeks(u) || '—') + '.</p><div class="stack" style="gap:8px">' + kand.map(x => '<label class="chk card card-b" style="padding:10px 12px"><input type="checkbox" value="' + x.id + '" ' + (u.gabung && x.gabung === u.gabung ? 'checked' : '') + '><div><b>' + esc(Dom.rombelLabel(x.prodi, x.angkatan, x.kelas, App.periode.disusun.key, true)) + '</b><div class="t-sub">' + esc(x.kur.KodeMK) + ' · ' + esc(Dom.dosenTeks(x) || 'belum ada dosen') + '</div></div></label>').join('') + '</div>',
      foot: '<button class="btn" data-close>Batal</button><button class="btn btn-primary" data-a="ok">' + ic('merge') + 'Simpan Gabung</button>',
      acts: { ok: async (b, e, m) => {
        const pilih = $$('input:checked', m.el).map(i => i.value); if (!pilih.length) return toast('Pilih minimal satu kelas.', 'warn');
        const g = u.gabung || 'G' + u.id;
        const r = await denganSibuk(b, 'Menyimpan…', () => this.simpanRealisasi([{ ID: u.id, Gabung: g }].concat(pilih.map(id => ({ ID: id, Gabung: g, Dosen1: u.r.Dosen1, Dosen2: u.r.Dosen2 }))), 'Kelas digabung & tersinkron ke Realisasi Kurikulum.'));
        if (!r.success) return;
        m.close();
        if (it.posisi === 'GRID') this.jatuh(it, { rb: u.rombel, slot: it.hari + '|' + it.sesi });
      } } });
  },
  async lepasGabung(u) {
    const ang = Dom.units(App.periode.disusun.key).filter(x => x.gabung === u.gabung);
    const ubah = ang.length <= 2 ? ang.map(x => ({ ID: x.id, Gabung: '' })) : [{ ID: u.id, Gabung: '' }];
    await this.simpanRealisasi(ubah, 'Gabung kelas dilepas.');
  },
  acts: {
    hari(b) { this.st.hari = b.dataset.v; this.render(); },
    async generate(b) {
      const w = this.w(), pola = this.st.pola, per = App.periode.disusun.key;
      const units = Dom.units(per).filter(u => u.pola === pola), tanpa = units.filter(u => !u.dosen.length).length;
      if (!units.length) return toast('Belum ada mata kuliah pola ' + pola + '. Isi Kurikulum & Realisasi terlebih dahulu.', 'warn');
      const adaManual = [...w.map.values()].some(x => x.posisi === 'GRID');
      if (adaManual && !(await konfirmasi('Generate ulang akan menyusun kembali semua kartu yang <b>tidak terkunci</b>. Kartu terkunci tetap di tempatnya.' + (tanpa ? '\n\n' + tanpa + ' mata kuliah belum memiliki dosen dan akan ditaruh di luar grid.' : ''), { ok: 'Generate ulang', icon: 'zap' }))) return;
      const kunci = [...w.map.values()].filter(x => x.kunci && x.posisi === 'GRID').map(x => ({ RealisasiID: x.uid, Bagian: x.b, Hari: x.hari, Sesi: x.sesi }));
      const r = await denganSibuk(b, 'Menyusun…', () => api('jadwal.generate', { pola, kunci, lain: this.entriLain().map(e => ({ RealisasiID: e.uid, Hari: e.hari, Sesi: e.sesi })) }));
      if (!r.success) return;
      w.map.forEach(x => { if (!x.kunci) { x.posisi = 'LUAR'; x.hari = ''; x.sesi = ''; } });
      w.alasan = {};
      r.data.tempat.forEach(t => { const x = w.map.get(t.RealisasiID + '#' + t.Bagian); if (x) { x.hari = t.Hari; x.sesi = String(t.Sesi); x.posisi = 'GRID'; x.kunci = t.Kunci === 'YA' || x.kunci; } });
      r.data.luar.forEach(l => { w.alasan[l.RealisasiID + '#' + l.Bagian] = l.Alasan; });
      w.kotor = true; this.render();
      toast(r.message + ' (' + r.data.iterasi + ' percobaan, ' + r.data.ms + ' ms). Periksa lalu tekan Simpan.', r.data.luar.length ? 'warn' : 'ok');
    },
    simpan(b) { this.simpan(b); },
    async excel() {
      const s = this.st, pola = s.pola, per = App.periode.disusun.key, um = Dom.unitMap(per), slots = Dom.slots(pola), w = this.siapkan(), items = [...w.map.values()];
      const rombel = Dom.rombelJadwal(per, pola), grid = [['Prodi · Smt · Kelas'].concat(slots.map(x => x.hari + ' S' + x.sesi + ' (' + x.mulai + '–' + x.selesai + ')'))];
      rombel.forEach(rb => grid.push([rb.prodi + ' Smt ' + rb.smt + ' ' + rb.kelas].concat(slots.map(sl => items.filter(x => x.posisi === 'GRID' && x.hari + '|' + x.sesi === sl.key && um.get(x.uid).rombel === rb.key).map(x => { const u = um.get(x.uid); return u.kur.NamaMK + ' — ' + Dom.dosenTeks(u); }).join('\n')))));
      const daftar = [['Prodi', 'Kelas', 'Smt', 'Kode MK', 'Mata Kuliah', 'SKS', 'Bagian', 'Hari', 'Sesi', 'Jam', 'Dosen', 'Gabung', 'Posisi', 'Kunci']];
      items.forEach(x => { const u = um.get(x.uid); if (!u) return; daftar.push([Dom.prodiNama(u.prodi), u.kelas, u.smt, u.kur.KodeMK, u.kur.NamaMK, u.sks, x.b + '/' + u.bagian, x.hari || '', x.sesi || '', x.hari ? Dom.jamSlot(pola, x.hari, x.sesi) : '', Dom.dosenTeks(u), u.gabung ? 'Ya' : '', x.posisi === 'GRID' ? 'Di grid' : 'Luar grid', x.kunci ? 'Ya' : '']); });
      await Excel.tulis('Jadwal ' + pola + ' ' + Dom.perLabel(per).replace('/', '-'), [{ nama: 'Grid ' + pola, rows: grid, lebar: [26].concat(slots.map(() => 30)) }, { nama: 'Daftar', rows: daftar, lebar: [24, 16, 5, 10, 36, 5, 7, 9, 5, 12, 34, 7, 10, 6] }]);
    },
    cetak() {
      const pola = this.st.pola, per = App.periode.disusun.key, w = this.siapkan();
      const entri = [...w.map.values()].filter(x => x.posisi === 'GRID').map(x => ({ RealisasiID: x.uid, Hari: x.hari, Sesi: x.sesi }));
      if (!entri.length) return toast('Grid masih kosong. Jalankan Generate Jadwal terlebih dahulu.', 'warn');
      Cetak.buka({ judul: 'Pratinjau — Jadwal ' + pola, sub: Dom.perLabel(per) + (w.kotor ? ' · draf belum disimpan' : ''), periode: per, folder: 'Jadwal', prefix: 'JDW', jenis: 'JADWAL_SELURUH',
        namaFile: 'Seluruh Jadwal ' + pola + ' — ' + Dom.perLabel(per).replace('/', '-'), orientasi: 'landscape', bisaOrientasi: false,
        buat: (ctx) => [Doc.jadwalSeluruh(pola, per, ctx, { entri })], dok: { judul: 'Seluruh Jadwal ' + pola + ' ' + Dom.perLabel(per), ringkasan: { pola } } });
    }
  },
  ch: { prodi(t) { this.st.prodi = t.value; this.render(); }, smt(t) { this.st.smt = t.value; this.render(); }, warna(t) { this.st.warna = t.checked; this.render(); }, hlgb(t) { this.st.hlgb = t.checked; this.render(); } },
  async simpan(btn) {
    const hasil = [];
    for (const pola of ['Reguler', 'Hybrid']) {
      const w = this.st.kerja[pola]; if (!w || !w.kotor) continue;
      const entri = [...w.map.values()].map(x => ({ RealisasiID: x.uid, Bagian: x.b, Hari: x.hari || '', Sesi: x.sesi || '', Posisi: x.posisi === 'GRID' ? 'GRID' : 'LUAR', Kunci: x.kunci ? 'YA' : 'TIDAK' }));
      const kirim = (pk) => api('jadwal.simpan', { pola, entri, base: { Jadwal: DB.ver.Jadwal }, paksa: !!pk }, { silent: true });
      let r = await denganSibuk(btn, 'Menyimpan…', () => kirim(false));
      if (r.code === 'CONFLICT') r = await tanganiKonflik(r, () => kirim(true));
      if (!r.success) { if (r.code !== 'CONFLICT') toast(r.message, 'err'); return false; }
      w.kotor = false; w.map = null; hasil.push(r.message);
    }
    if (hasil.length) toast(hasil.join('\n'));
    this.render(); return true;
  }
});

/* =====================================================================
   GENERATE UJIAN (UTS & UAS)
   ===================================================================== */
defPage('ujian', {
  deps: ['Ujian', 'Jadwal', 'Realisasi', 'Kurikulum', 'Dosen', 'Pengaturan', 'JamSesi'], refreshTabel: ['Ujian', 'Jadwal', 'Realisasi'],
  st: { jenis: 'UTS', pola: 'Reguler', kerja: {} },
  w() { const k = this.st.jenis; if (!this.st.kerja[k]) this.st.kerja[k] = { map: null, kotor: false }; return this.st.kerja[k]; },
  isDirty() { return ['UTS', 'UAS'].some(k => this.st.kerja[k] && this.st.kerja[k].kotor); },
  dirtyInfo() { return { judul: 'Jadwal ujian ' + ['UTS', 'UAS'].filter(k => this.st.kerja[k] && this.st.kerja[k].kotor).join(' & ') + ' belum disimpan', sub: '' }; },
  buang() { ['UTS', 'UAS'].forEach(k => { if (this.st.kerja[k]) { this.st.kerja[k].map = null; this.st.kerja[k].kotor = false; } }); this.render(); },
  siapkan() {
    const w = this.w(), per = App.periode.disusun.key;
    if (w.map && w.kotor) return w;
    w.map = new Map();
    DB.rows('Ujian').filter(j => j.TA + ' ' + j.Semester === per && j.Jenis === this.st.jenis).forEach(j => w.map.set(j.RealisasiID, { k: j.RealisasiID, uid: j.RealisasiID, pola: j.Pola, hari: j.Hari, sesi: j.Sesi, catatan: j.Catatan, posisi: 'GRID' }));
    return w;
  },
  render() {
    const s = this.st, per = App.periode.disusun.key, adaJ = Dom.adaJadwal(per), um = Dom.unitMap(per);
    const head = kepala({ crumb: ['Proses', 'Generate Ujian', 'T.A. ' + App.periode.disusun.ta + ' (' + App.periode.disusun.smt + ')'], judul: 'Generate Ujian (UTS &amp; UAS)', badge: ' <span class="badge info sq">' + esc(Dom.perLabel(per)) + '</span>',
      desc: 'Penyusunan jadwal ujian otomatis yang mengikuti jadwal perkuliahan. Semua mata kuliah dianggap 2 SKS (90 menit); mata kuliah tahfidz tidak ditampilkan.',
      aksi: btnRefresh() + '<button class="btn btn-ok" data-a="simpan" ' + (this.w().kotor ? '' : 'disabled') + '>' + ic('save') + 'Simpan</button><button class="btn" data-a="excel" ' + (adaJ ? '' : 'disabled') + '>' + ic('sheet') + 'Simpan Excel</button><button class="btn btn-accent" data-a="cetak" ' + (adaJ ? '' : 'disabled') + '>' + ic('printer') + 'Cetak (A4)</button><button class="btn btn-primary" data-a="generate" ' + (adaJ ? '' : 'disabled') + '>' + ic('zap') + 'Generate Ujian Otomatis</button>' });
    if (!adaJ) { this.el.innerHTML = head + '<div class="card card-b">' + kosong('<b>Generate Ujian aktif setelah Generate Jadwal disimpan.</b><br>Susun dan simpan jadwal perkuliahan ' + esc(Dom.perLabel(per)) + ' terlebih dahulu.<br><br><button class="btn btn-primary" data-a="nav" data-to="jadwal/reguler">' + ic('calplus') + 'Buka Generate Jadwal</button>', 'lock') + '</div>'; return; }
    const w = this.siapkan(), items = [...w.map.values()], pola = s.pola;
    const nonTahfidz = Dom.units(per).filter(u => !u.tahfidz && Dom.jadwalGrid(per).has(u.id)), tahfidz = Dom.units(per).filter(u => u.tahfidz);
    const sesiUtama = items.filter(x => x.pola === 'Reguler' && (um.get(x.uid) || {}).prodi !== 'IAT'), pctUtama = pct(sesiUtama.filter(x => +x.sesi <= 2).length, sesiUtama.length);
    const cek = Dom.periksa(items.map(x => ({ uid: x.uid, hari: x.hari, sesi: x.sesi, pola: x.pola })), per, null, true);
    const slots = Dom.ujianSlots(pola), itP = items.filter(x => x.pola === pola);
    const rombel = [...new Map(itP.map(x => um.get(x.uid)).filter(Boolean).map(u => [u.rombel, u])).values()].sort(Dom.rombelUrut).map(u => ({ key: u.rombel, label: u.prodi + ' · Smt ' + u.smt + ' (' + u.kelas + ')', sub: Dom.prodiNama(u.prodi), warna: Dom.prodiWarna(u.prodi) }));
    const isi = new Map(); itP.forEach(x => { const u = um.get(x.uid); if (!u) return; const k = u.rombel + '#' + x.hari + '|' + x.sesi; if (!isi.has(k)) isi.set(k, []); isi.get(k).push(x); });
    const kartu = (x) => { const u = um.get(x.uid); if (!u) return ''; const m = cek.masalah.get(x.uid + '#' + x.hari + '|' + x.sesi) || [];
      return '<div class="sgc' + (m.length ? ' konflik' : '') + (/BENTROK/.test(x.catatan || '') ? ' warn' : '') + '" data-k="' + attr(x.k) + '" style="--dc:' + Dom.warnaDosen(u.dosen[0]) + '" title="' + attr(u.kur.NamaMK + (x.catatan ? '\n' + x.catatan : '') + (m.length ? '\n⚠ ' + m.join('\n⚠ ') : '')) + '"><div class="top"><span class="sks">2 SKS · 90 Mnt</span>' + (u.gabung ? '<span class="flag gb">Gabung</span>' : '') + '</div><div class="mk">' + esc(u.kur.NamaMK) + '</div><div class="ds">Penguji: ' + esc(Dom.dosenTeks(u, ' & ')) + '</div>' + (x.catatan ? '<div class="t-sub" style="font-size:10px">' + esc(x.catatan) + '</div>' : '') + (m.length ? '<div class="why">⚠ ' + esc(m[0]) + '</div>' : '') + '</div>'; };
    this._items = w.map;
    this.el.innerHTML = head +
      '<div class="tabcards"><button class="' + (s.jenis === 'UTS' ? 'on' : '') + '" data-a="jenis" data-v="UTS"><span class="ik">' + ic('filetext') + '</span><span><b>UTS (Ujian Tengah Semester)</b><small>' + (this.st.kerja.UTS && this.st.kerja.UTS.kotor ? 'Belum disimpan' : DB.rows('Ujian').some(j => j.TA + ' ' + j.Semester === per && j.Jenis === 'UTS') ? 'Tersimpan' : 'Belum disusun') + '</small></span></button>' +
      '<button class="' + (s.jenis === 'UAS' ? 'on' : '') + '" data-a="jenis" data-v="UAS"><span class="ik">' + ic('award') + '</span><span><b>UAS (Ujian Akhir Semester)</b><small>' + (this.st.kerja.UAS && this.st.kerja.UAS.kotor ? 'Belum disimpan' : DB.rows('Ujian').some(j => j.TA + ' ' + j.Semester === per && j.Jenis === 'UAS') ? 'Tersimpan' : 'Belum disusun') + '</small></span></button>' +
      '<div class="alert info" style="margin:0">' + ic('info') + '<div><b>Ketentuan PRD 5.11:</b> Mata kuliah tahfidz dikecualikan dari matriks ujian tertulis. MK yang muncul di 2–3 hari kuliah dicantumkan sekali.</div></div></div>' +
      '<div class="kpis">' + kpi({ lb: 'Total Mata Uji Terplot', vl: items.length + '<small>/ ' + nonTahfidz.length + ' MK</small>', ic: 'listcheck', bar: pct(items.length, nonTahfidz.length), ft: items.length >= nonTahfidz.length ? 'Lengkap' : 'Generate untuk melengkapi' }) +
      kpi({ lb: 'Normalisasi SKS & Tahfidz', vl: tahfidz.length + '<small>MK tahfidz</small>', ic: 'filter', cls: 'orange', ft: 'Tidak masuk ujian tertulis · semua MK = 2 SKS' }) +
      kpi({ lb: 'Prioritas Sesi Utama', vl: pctUtama + '%', ic: 'clock', cls: 'ok', bar: pctUtama, barCls: 'ok', ft: 'Reguler & Ma\'had Aly di sesi 1–2' }) +
      kpi({ lb: 'Bentrok Penguji', vl: cek.bentrok, ic: cek.bentrok ? 'alert' : 'shield', cls: cek.bentrok ? 'err' : 'ok', ft: cek.bentrok ? 'Geser kartu bertanda merah' : 'Tidak ada bentrok' }) + '</div>' +
      '<div class="card card-b" style="margin-bottom:14px"><div class="row"><div class="seg"><button data-a="pola" data-v="Reguler" class="' + (pola === 'Reguler' ? 'on' : '') + '">Pola Reguler &amp; Ma\'had Aly (Senin–Jumat)</button><button data-a="pola" data-v="Hybrid" class="' + (pola === 'Hybrid' ? 'on' : '') + '">Pola Hybrid (Jumat Sore–Sabtu)</button></div><span class="sp"></span>' +
      '<div class="legend">' + Dom.prodi().map(p => '<span><i style="background:' + p.Warna + ';border-radius:50%"></i>' + esc(p.Kode) + '</span>').join('') + '</div></div></div>' +
      '<div class="card" id="uj-root"><div class="card-h"><h3>' + ic('grid') + 'Matriks Jadwal ' + (s.jenis === 'UTS' ? 'Ujian Tengah Semester' : 'Ujian Akhir Semester') + ' (Pola ' + pola + ')</h3><span class="sp"></span><span class="muted" style="font-size:12.5px">Standar durasi: 90 menit / sesi · seret kartu untuk mengubah</span></div>' +
      '<div class="sg-wrap">' + (items.length ? GridJ.tabel({ slots, rombel, isi, kelas: 'warna', kartu }) : kosong('Belum ada jadwal ' + s.jenis + '. Tekan <b>Generate Ujian Otomatis</b>.', 'zap')) + '</div></div>' +
      '<div class="card" style="margin-top:16px"><div class="card-h"><h3>' + ic('book') + 'Jadwal Ujian Tahfidz &amp; Imtihan Syafahi (Di Luar Jadwal Tertulis)</h3><span class="badge orange">PRD 5.11 Dikecualikan</span><div class="sub">Mata kuliah tahfidz tidak dicantumkan dalam lembar ujian tertulis; pengujian dilakukan melalui setoran langsung.</div></div>' +
      '<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Mata Kuliah</th><th>Kelas / Prodi</th><th>Beban SKS</th><th>Penguji</th><th>Status</th></tr></thead><tbody>' +
      (tahfidz.map(u => '<tr><td><b>' + esc(u.kur.NamaMK) + '</b>' + (u.kur.NamaArab ? '<div class="arab muted">' + esc(u.kur.NamaArab) + '</div>' : '') + '</td><td>' + esc(u.prodi + ' Smt ' + u.smt) + ' ' + badgeKelas(u.kelas) + '</td><td>' + u.sks + ' SKS (Praktik)</td><td>' + esc(Dom.dosenTeks(u) || '—') + '</td><td><span class="badge info dot">Terjadwal khusus</span></td></tr>').join('') || '<tr><td colspan="5" class="faint">Tidak ada mata kuliah tahfidz.</td></tr>') + '</tbody></table></div></div>' +
      '<div class="grid3" style="margin-top:16px">' +
      '<div class="card card-b"><b>' + ic('cap', 'ic-sm') + ' Pola Penempatan Reguler</b><p class="muted" style="margin-top:6px;font-size:13px">Program reguler (ES, HES, PAI) dan Ma\'had Aly diutamakan di Sesi 1 dan Sesi 2 pada hari kuliahnya. Sesi 3 hanya dipakai bila dosen hanya tersedia di sesi itu.</p></div>' +
      '<div class="card card-b"><b>' + ic('book', 'ic-sm') + ' Pola IAT &amp; Hybrid</b><p class="muted" style="margin-top:6px;font-size:13px">Ilmu Al Qur\'an &amp; Tafsir diplot pada waktu yang sama dengan jadwal kuliahnya. Kelas Hybrid mengikuti jadwal Hybrid (Jumat sore & Sabtu).</p></div>' +
      '<div class="card card-b"><b>' + ic('clock', 'ic-sm') + ' Standarisasi Bobot 2 SKS</b><p class="muted" style="margin-top:6px;font-size:13px">Mata kuliah 3–4 SKS yang di jadwal kuliah muncul di 2–3 hari dialokasikan satu slot ujian (2 SKS / 90 menit); kemunculan lain dihilangkan.</p></div></div>';
    if (!this._seret) { this._seret = true; Seret.pasang(this.el, { item: (k) => this.w().map.get(k), bolehJatuh: (it, t) => !t.luar && (um.get(it.uid) || {}).rombel === t.rb, alasanTolak: () => 'Kartu hanya dapat dipindah di baris kelasnya sendiri.', jatuh: (it, t) => this.jatuh(it, t), menu: (it, x, y) => this.menu(it, x, y) }); }
    App.savebar(this);
  },
  jatuh(it, t) {
    const w = this.w(), um = Dom.unitMap(App.periode.disusun.key), [hari, sesi] = t.slot.split('|'), u = um.get(it.uid);
    const occ = [...w.map.values()].filter(x => x.k !== it.k && x.pola === it.pola && x.hari === hari && String(x.sesi) === sesi && (um.get(x.uid) || {}).rombel === u.rombel);
    const lama = { hari: it.hari, sesi: it.sesi };
    it.hari = hari; it.sesi = sesi; it.catatan = 'Diatur manual';
    occ.forEach(x => { x.hari = lama.hari; x.sesi = lama.sesi; });
    w.kotor = true; this.render();
  },
  menu(it, x, y) {
    const u = Dom.unitMap(App.periode.disusun.key).get(it.uid); if (!u) return;
    Ctx.buka(x, y, [{ head: u.kur.NamaMK }, { label: 'Ganti penguji / dosen…', icon: 'user', fn: () => Pages.jadwal.gantiDosen(u) }, { label: 'Lihat di Realisasi Kurikulum', icon: 'ext', fn: () => App.nav('realisasi', { q: u.kur.KodeMK }) }]);
  },
  acts: {
    jenis(b) { this.st.jenis = b.dataset.v; this.render(); },
    pola(b) { this.st.pola = b.dataset.v; this.render(); },
    async generate(b) {
      const w = this.w();
      if (w.map && w.map.size && !(await konfirmasi('Susun ulang jadwal ' + this.st.jenis + '? Pengaturan manual akan diganti hasil otomatis.', { ok: 'Generate', icon: 'zap' }))) return;
      const r = await denganSibuk(b, 'Menyusun…', () => api('ujian.generate', { jenis: this.st.jenis }));
      if (!r.success) return;
      w.map = new Map(); r.data.entri.forEach(e => w.map.set(e.RealisasiID, { k: e.RealisasiID, uid: e.RealisasiID, pola: e.Pola, hari: e.Hari, sesi: String(e.Sesi), catatan: e.Catatan, posisi: 'GRID' }));
      w.kotor = true; this.render(); toast(r.message + ' Periksa lalu tekan Simpan.');
    },
    simpan(b) { this.simpan(b); },
    async excel() {
      const per = App.periode.disusun.key, um = Dom.unitMap(per), items = [...this.siapkan().map.values()];
      const rows = [['Jenis', 'Pola', 'Hari', 'Sesi', 'Jam', 'Prodi', 'Kelas', 'Smt', 'Kode MK', 'Mata Kuliah', 'Penguji', 'Catatan']];
      items.sort((a, b) => (URUT_HARI[a.hari] || 9) - (URUT_HARI[b.hari] || 9) || a.sesi - b.sesi).forEach(x => { const u = um.get(x.uid); if (!u) return; rows.push([this.st.jenis, x.pola, x.hari, x.sesi, Dom.jamSlot(x.pola, x.hari, x.sesi, true), Dom.prodiNama(u.prodi), u.kelas, u.smt, u.kur.KodeMK, u.kur.NamaMK, Dom.dosenTeks(u), x.catatan || '']); });
      await Excel.tulis('Jadwal ' + this.st.jenis + ' ' + Dom.perLabel(per).replace('/', '-'), [{ nama: this.st.jenis, rows, lebar: [6, 9, 9, 5, 13, 24, 16, 5, 10, 36, 32, 30] }]);
    },
    cetak() {
      const per = App.periode.disusun.key, jenis = this.st.jenis, items = [...this.siapkan().map.values()];
      if (!items.length) return toast('Belum ada jadwal ' + jenis + '. Jalankan Generate Ujian.', 'warn');
      const pola = ['Reguler', 'Hybrid'].filter(p => items.some(x => x.pola === p));
      Cetak.buka({ judul: 'Pratinjau — Jadwal ' + jenis, sub: Dom.perLabel(per) + ' · satu lembar A4 per pola', periode: per, folder: 'Ujian', prefix: 'UJN', jenis: 'UJIAN', namaFile: 'Jadwal ' + jenis + ' — ' + Dom.perLabel(per).replace('/', '-'), orientasi: 'landscape', bisaOrientasi: false,
        buat: (ctx) => pola.map(p => Doc.jadwalSeluruh(p, per, ctx, { ujian: true, jenis, entri: items.filter(x => x.pola === p).map(x => ({ RealisasiID: x.uid, Hari: x.hari, Sesi: x.sesi })) })), dok: { judul: 'Jadwal ' + jenis + ' ' + Dom.perLabel(per), ringkasan: { jenis_ujian: jenis } } });
    }
  },
  async simpan(btn) {
    for (const jenis of ['UTS', 'UAS']) {
      const w = this.st.kerja[jenis]; if (!w || !w.kotor) continue;
      const entri = [...w.map.values()].map(x => ({ RealisasiID: x.uid, Pola: x.pola, Hari: x.hari, Sesi: x.sesi, Catatan: x.catatan || '' }));
      const kirim = (pk) => api('ujian.simpan', { jenis, entri, base: { Ujian: DB.ver.Ujian }, paksa: !!pk }, { silent: true });
      let r = await denganSibuk(btn, 'Menyimpan…', () => kirim(false));
      if (r.code === 'CONFLICT') r = await tanganiKonflik(r, () => kirim(true));
      if (!r.success) { if (r.code !== 'CONFLICT') toast(r.message, 'err'); return false; }
      w.kotor = false; w.map = null; toast(r.message);
    }
    this.render(); return true;
  }
});
