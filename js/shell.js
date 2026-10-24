/* =====================================================================
   PENJADWALAN AL WAFA — shell.js
   Kerangka aplikasi: login, muat awal (SWR), router hash, sidebar,
   kepala halaman, pencarian global, lonceng agenda, penjaga perubahan.
   ===================================================================== */
'use strict';
const MENU = [
  { id: 'agenda', label: 'Agenda Kegiatan Akademik', icon: 'alarm', admin: true, top: true },
  { grp: 'Data' },
  { id: 'ringkasan', label: 'Ringkasan', icon: 'grid' },
  { id: 'dosen', label: 'Dosen', icon: 'users' },
  { id: 'mahasiswa', label: 'Mahasiswa', icon: 'cap' },
  { id: 'kurikulum', label: 'Kurikulum', icon: 'book' },
  { id: 'kalender', label: 'Kalender Akademik', icon: 'cal' },
  { grp: 'Proses' },
  { id: 'realisasi', label: 'Realisasi Kurikulum', icon: 'listcheck' },
  { id: 'jadwal', label: 'Generate Jadwal', icon: 'calplus', sub: [{ r: 'jadwal/reguler', label: 'Kelas Reguler' }, { r: 'jadwal/hybrid', label: 'Kelas Hybrid' }] },
  { id: 'ujian', label: 'Generate Ujian', icon: 'clipboard' },
  { grp: 'Cetak' },
  { id: 'cetak-jadwal', label: 'Cetak Jadwal Perkuliahan', icon: 'printer', sub: [{ r: 'cetak-jadwal/kelas', label: 'Per Kelas' }, { r: 'cetak-jadwal/dosen', label: 'Per Dosen' }, { r: 'cetak-jadwal/seluruh', label: 'Seluruh Jadwal' }] },
  { id: 'cetak-st', label: 'Cetak Surat Tugas', icon: 'filetext' },
  { id: 'cetak-absensi', label: 'Cetak Absensi Mahasiswa', icon: 'usercheck' },
  { id: 'cetak-hadir', label: 'Cetak Daftar Hadir', icon: 'idcard' },
  { id: 'cetak-kitab', label: 'Cetak Absensi Penerima Kitab', icon: 'bookmark' },
  { id: 'template', label: 'Dokumen dari Template', icon: 'files' },
  { grp: 'Lainnya' },
  { id: 'arsip', label: 'Arsip', icon: 'archive' },
  { id: 'blast', label: 'Blast WA', icon: 'wa', admin: true },
  { id: 'pengaturan', label: 'Pengaturan', icon: 'gear', admin: true }
];
const Pages = {};
function defPage(id, def) { Pages[id] = Object.assign({ id, st: {}, el: null, stale: true, deps: [] }, def); Pages[id]._stAwal = JSON.stringify(def.st || {}); }

const Activity = {
  at: Date.now(), last: {},
  init() { ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => addEventListener(ev, () => { this.at = Date.now(); }, { passive: true })); },
  idle() { return Date.now() - this.at > 120000; },
  due(key, aktif, diam) { if (document.visibilityState !== 'visible') return false; if (Date.now() - (this.last[key] || 0) < (this.idle() ? diam : aktif) - 500) return false; this.last[key] = Date.now(); return true; }
};

const App = {
  periode: { berjalan: { ta: '2026/2027', smt: 'Ganjil', key: '2026/2027 Ganjil' }, disusun: { ta: '2026/2027', smt: 'Genap', key: '2026/2027 Genap' }, persiapan: true },
  cur: null, rute: '', perPilih: 'berjalan', _abaikanHash: false, _bootOk: false,

  /* ---------------- start ---------------- */
  start() {
    try { App.perPilih = sessionStorage.getItem('pa:per') || 'berjalan'; } catch (e) {}
    Activity.init();
    App.siapkanLogin();
    window.addEventListener('hashchange', () => App.onHash());
    window.addEventListener('beforeunload', e => { if (App.adaKotor()) { e.preventDefault(); e.returnValue = ''; } });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { if (!$('#preview').classList.contains('hidden') && typeof Cetak !== 'undefined') { Cetak.tutup(); return; } Ctx.tutup(); if (Modal.tutupAtas()) return; $('#q-res').classList.add('hidden'); }
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { e.preventDefault(); $('#tb-search').classList.add('open'); $('#q-global').focus(); }
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && App._bootOk && Activity.due('sync', 30000, 30000)) App.boot(true); });
    setInterval(() => {
      if (!Sesi.token) return;
      if (Sesi.exp() && Sesi.exp() < Date.now()) { App.sesiHabis('Sesi berakhir karena lama tidak dipakai. Silakan masuk kembali.'); return; }
      if (App._bootOk && Activity.due('sync', 60000, 300000)) App.boot(true);
    }, 15000);
    if (Sesi.load()) {
      const ada = DB.muatLokal();
      App.mulai(ada);
    } else App.tampilLogin();
  },

  siapkanLogin() {
    $('#login-logo').innerHTML = LOGO_SVG;
    $('#lf-user').innerHTML = ic('user') + '<input id="login-user" name="username" autocomplete="username" placeholder="Username" required>';
    $('#lf-pass').innerHTML = ic('lock') + '<input id="login-pass" name="password" type="password" autocomplete="current-password" placeholder="Password" required><button type="button" class="login-eye" id="login-eye" aria-label="Tampilkan password">' + ic('eye') + '</button>';
    $('#login-th').textContent = new Date().getFullYear();
    $('#login-eye').onclick = () => { const p = $('#login-pass'); p.type = p.type === 'password' ? 'text' : 'password'; $('#login-eye').innerHTML = ic(p.type === 'password' ? 'eye' : 'eyeoff'); };
    $('#login-lupa').onclick = (e) => { e.preventDefault(); Modal.buka({ title: 'Lupa password?', icon: 'key', size: 'sm', body: '<p>Password akun <b>Pengguna</b> direset oleh <b>Admin Utama</b> lewat menu Pengaturan → Kelola Akun.</p><p class="muted" style="margin-top:10px">Bila Admin Utama lupa password, pemilik aplikasi menjalankan fungsi <span class="mono">resetPasswordAdminUtama()</span> di editor Apps Script.</p>', foot: '<button class="btn btn-primary" data-close>Mengerti</button>' }); };
    $('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = $('#login-user').value.trim(), p = $('#login-pass').value, btn = $('#login-btn'), msg = $('#login-msg');
      msg.textContent = '';
      if (!u || !p) { msg.textContent = 'Isi username dan password.'; return; }
      sibuk(btn, true, 'Memeriksa…');
      const r = await api('login', { username: u, password: p, ingat: $('#login-ingat').checked, appUrl: location.origin + location.pathname }, { silent: true });
      sibuk(btn, false);
      if (!r.success) { msg.textContent = r.message; return; }
      try { if ($('#login-ingat').checked) localStorage.setItem('pa:user', u); else localStorage.removeItem('pa:user'); } catch (er) {}
      Sesi.set(r.data.token, r.data.me);
      $('#login-pass').value = '';
      const ada = DB.muatLokal();
      App.mulai(ada);
    });
    try { const u = localStorage.getItem('pa:user'); if (u) { $('#login-user').value = u; $('#login-ingat').checked = true; } } catch (e) {}
  },
  tampilLogin(pesan) {
    $('#splash').classList.add('hidden');
    $('#shell').classList.add('hidden');
    $('#login').classList.remove('hidden');
    $('#login-msg').textContent = pesan || (Net.siap() ? '' : 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js.');
    warmUpServer('pub');
    setTimeout(() => { const f = $('#login-user').value ? $('#login-pass') : $('#login-user'); f && f.focus(); }, 50);
  },
  sesiHabis(pesan) {
    if (!Sesi.token) return;
    Sesi.clear(); App._bootOk = false;
    Modal.tumpuk.slice().forEach(m => m.close());
    if (typeof Cetak !== 'undefined') Cetak.tutup();
    App.tampilLogin(pesan || 'Sesi Anda telah berakhir. Silakan masuk kembali.');
  },
  async keluar() {
    if (App.adaKotor() && !(await konfirmasi('Ada perubahan yang belum disimpan. Tetap keluar?', { danger: true, ok: 'Keluar' }))) return;
    api('logout', {}, { silent: true });
    Sesi.clear(); App._bootOk = false;
    Object.values(Pages).forEach(p => { if (p.el) { p.el.remove(); p.el = null; } p.st = JSON.parse(p._stAwal || '{}'); p._seret = false; p.stale = true; });
    DB.bersih(); $('#savebar') && $('#savebar').remove();
    App.cur = null;
    App.tampilLogin('Anda telah keluar.');
  },

  /* ---------------- mulai & muat awal ---------------- */
  mulai(adaCache) {
    $('#login').classList.add('hidden');
    App.bangunShell();
    if (adaCache) {
      $('#splash').classList.add('hidden');
      $('#shell').classList.remove('hidden');
      App.onHash(true);
      App.boot(true);
    } else {
      $('#splash').classList.remove('hidden');
      $('#splash-msg').textContent = 'Memuat data aplikasi…';
      App.boot(false).then(ok => {
        $('#splash').classList.add('hidden');
        if (!ok) return;
        $('#shell').classList.remove('hidden');
        App.onHash(true);
      });
    }
    if (Sesi.me && Sesi.me.wajibGanti) setTimeout(() => App.gantiSandi(true), 400);
  },
  async boot(latar) {
    const ver = {};
    Object.keys(DB.ver).forEach(k => { if (DB.raw[k]) ver[k] = DB.ver[k]; });
    const r = await api('boot', { ver }, { silent: latar });
    if (!r.success) { if (!latar && r.code !== 'AUTH') { $('#splash-msg').innerHTML = esc(r.message) + '<br><button class="btn btn-primary" style="margin-top:14px" onclick="location.reload()">Coba lagi</button>'; $('#splash').classList.remove('hidden'); } return false; }
    if (r.data.me) { Sesi.me = Object.assign({}, Sesi.me, r.data.me); Sesi.save(); }
    const pertama = !App._bootOk;
    App._bootOk = true;
    App.perbaruiShell();
    if (pertama && Sesi.admin() && Pages.agenda) setTimeout(() => Pages.agenda.popup(false), 600);
    return true;
  },

  /* ---------------- shell ---------------- */
  bangunShell() {
    $('#sb-logo').innerHTML = LOGO_SVG;
    $('#sb-toggle').innerHTML = ic('collapse');
    $('#tb-burger').innerHTML = ic('menu');
    $('#sb-toggle').onclick = () => { document.body.classList.toggle('sb-mini'); LS.set('pa:mini', document.body.classList.contains('sb-mini')); };
    if (LS.get('pa:mini', false)) document.body.classList.add('sb-mini');
    $('#tb-burger').onclick = () => document.body.classList.toggle('sb-open');
    $('#scrim').onclick = () => document.body.classList.remove('sb-open');
    $('#tb-search').insertAdjacentHTML('afterbegin', $('#tb-search > .ic') ? '' : ic('search'));
    App.cariSiapkan();
    App.renderSidebar();
    App.perbaruiShell();
  },
  renderSidebar() {
    const admin = Sesi.admin();
    let h = '';
    MENU.forEach(m => {
      if (m.admin && !admin) return;
      if (m.grp) { h += '<div class="sb-group">' + m.grp + '</div>'; return; }
      if (m.top) { h += '<button class="sb-agenda" data-r="' + m.id + '" title="' + attr(m.label) + '">' + ic(m.icon) + '<span>' + m.label + '</span><b class="cnt" id="sb-agenda-cnt">0</b></button>'; return; }
      if (m.sub) {
        h += '<button class="sb-item" data-sub="' + m.id + '" title="' + attr(m.label) + '">' + ic(m.icon) + '<span>' + m.label + '</span>' + ic('down', 'ic-sm chev') + '</button><div class="sb-sub" id="sbs-' + m.id + '">' +
          m.sub.map(s => '<button class="sb-item" data-r="' + s.r + '"><span>' + s.label + '</span></button>').join('') + '</div>';
        return;
      }
      h += '<button class="sb-item" data-r="' + m.id + '" title="' + attr(m.label) + '">' + ic(m.icon) + '<span>' + m.label + '</span></button>';
    });
    const nav = $('#sb-nav');
    nav.innerHTML = h;
    nav.onclick = (e) => {
      const s = e.target.closest('[data-sub]');
      if (s) { const box = $('#sbs-' + s.dataset.sub); const buka = !box.classList.contains('open'); box.classList.toggle('open', buka); s.classList.toggle('open', buka); if (document.body.classList.contains('sb-mini')) { const m = MENU.find(x => x.id === s.dataset.sub); App.nav(m.sub[0].r); } return; }
      const b = e.target.closest('[data-r]'); if (!b) return;
      App.nav(b.dataset.r);
      document.body.classList.remove('sb-open');
    };
    const me = Sesi.me || {};
    $('#sb-foot').innerHTML = '<div class="avatar dark">' + esc(inisial(me.nama)) + '</div><div class="nm" style="min-width:0;line-height:1.2"><b style="display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(me.nama || '') + '</b><small class="muted">' + (me.peran === 'ADMIN_UTAMA' ? 'Admin Utama' : 'Pengguna') + '</small></div><button class="icon-btn" style="margin-left:auto" id="sb-logout" title="Keluar">' + ic('logout') + '</button>';
    $('#sb-logout').onclick = () => App.keluar();
  },
  perbaruiShell() {
    const p = App.periode, me = Sesi.me || {};
    const singkat = (x) => x.smt + ' ' + String(x.ta).replace(/^20(\d\d)\/20(\d\d)$/, '$1/$2');
    $('#tb-per').innerHTML = '<span class="per-badge run" title="Semester berjalan: ' + attr(p.berjalan.smt + ' ' + p.berjalan.ta) + '"><span class="pb-l">T.A. ' + esc(p.berjalan.ta) + ' · ' + esc(p.berjalan.smt) + ' · Berjalan</span><span class="pb-s">' + esc(singkat(p.berjalan)) + '</span></span>' +
      (p.persiapan ? '<span class="per-badge prep" title="Semester yang sedang disusun"><i></i>Sedang disusun: ' + esc(p.disusun.smt) + ' ' + esc(p.disusun.ta) + '</span>' : '');
    const tema = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    $('#tb-act').innerHTML = '<button class="icon-btn only-m" id="tb-cari" title="Cari">' + ic('search') + '</button>' +
      '<button class="icon-btn" id="tb-tema" title="Mode terang/gelap">' + ic(tema === 'dark' ? 'sun' : 'moon') + '</button>' +
      (Sesi.admin() ? '<button class="icon-btn" id="tb-bell" title="Pengingat agenda">' + ic('bell') + '<span class="dot hidden" id="tb-bell-dot">0</span></button>' : '') +
      '<div class="tb-user"><div class="avatar">' + esc(inisial(me.nama)) + '</div><div class="nm"><b>' + esc(me.nama || '') + '</b><span class="role-badge ' + (me.peran === 'ADMIN_UTAMA' ? '' : 'user') + '">' + (me.peran === 'ADMIN_UTAMA' ? 'Admin Utama' : 'Pengguna') + '</span></div>' +
      '<button class="icon-btn" id="tb-menu-user" title="Akun">' + ic('down', 'ic-sm') + '</button><button class="icon-btn" id="tb-logout" title="Keluar">' + ic('logout') + '</button></div>';
    $('#tb-tema').onclick = () => { const t = (document.documentElement.getAttribute('data-theme') || tema) === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('pa:tema', t); } catch (e) {} App.perbaruiShell(); };
    $('#tb-logout').onclick = () => App.keluar();
    $('#tb-cari').onclick = () => { $('#tb-search').classList.toggle('open'); $('#q-global').focus(); };
    $('#tb-menu-user').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); Ctx.buka(r.left - 180, r.bottom + 6, [{ head: me.nama || '' }, { label: 'Ganti password', icon: 'key', fn: () => App.gantiSandi(false) }, { label: 'Keluar', icon: 'logout', fn: () => App.keluar() }]); };
    if ($('#tb-bell')) $('#tb-bell').onclick = () => Pages.agenda && Pages.agenda.popup(true);
    App.perbaruiLonceng();
    const logo = DB.ada('Aset') && DB.raw.Aset.logo;
    if (logo) { const img = '<img src="' + logo + '" alt="Logo">'; $('#sb-logo').innerHTML = img; $('#login-logo').innerHTML = img; }
  },
  perbaruiLonceng() {
    if (!Sesi.admin() || !Pages.agenda) return;
    const n = Pages.agenda.hitungMendesak();
    const dot = $('#tb-bell-dot'); if (dot) { dot.textContent = n; dot.classList.toggle('hidden', !n); }
    const c = $('#sb-agenda-cnt'); if (c) { c.textContent = n; c.classList.toggle('hidden', !n); }
  },
  gantiSandi(wajib) {
    const m = Modal.buka({ title: wajib ? 'Ganti password sementara' : 'Ganti password', icon: 'key', size: 'sm', dismiss: !wajib,
      body: (wajib ? '<div class="alert warn">' + ic('alert') + '<div>Untuk keamanan, ganti password sementara Anda sebelum mulai bekerja.</div></div>' : '') +
        '<div class="stack"><div class="field"><label>Password lama</label><input class="input" type="password" id="gs-lama" autocomplete="current-password"></div>' +
        '<div class="field"><label>Password baru</label><input class="input" type="password" id="gs-baru" autocomplete="new-password"><span class="help">Minimal 8 karakter, memuat huruf dan angka.</span></div>' +
        '<div class="field"><label>Ulangi password baru</label><input class="input" type="password" id="gs-ulang" autocomplete="new-password"></div></div>',
      foot: (wajib ? '' : '<button class="btn" data-close>Batal</button>') + '<button class="btn btn-primary" data-a="ok">' + ic('save') + 'Simpan Password</button>',
      acts: { ok: async (b, e, mm) => {
        const lama = $('#gs-lama').value, baru = $('#gs-baru').value;
        if (baru !== $('#gs-ulang').value) { toast('Ulangan password baru tidak sama.', 'err'); return; }
        const r = await denganSibuk(b, 'Menyimpan…', () => api('akun.gantiSandi', { lama, baru }));
        if (r.success) { Sesi.set(r.data.token, r.data.me); toast(r.message); mm.close(); App.renderSidebar(); App.perbaruiShell(); }
      } } });
    if (wajib) m.box.querySelector('[data-close]') && m.box.querySelector('.modal-h [data-close]').remove();
  },

  /* ---------------- pencarian global ---------------- */
  cariSiapkan() {
    const inp = $('#q-global'), res = $('#q-res'); let sel = -1, hasil = [];
    const render = () => {
      const q = inp.value.trim();
      if (q.length < 2) { res.classList.add('hidden'); return; }
      hasil = [];
      DB.rows('Dosen').forEach(d => { if (cocok(d.Nama + ' ' + d.NIDN, q)) hasil.push({ t: 'dosen', id: d.ID, l: d.Nama, s: 'Dosen · NIDN ' + (d.NIDN || '-') }); });
      const seen = new Set();
      DB.rows('Kurikulum').forEach(k => { const key = k.KodeMK + k.NamaMK; if (seen.has(key)) return; if (cocok(k.KodeMK + ' ' + k.NamaMK + ' ' + k.NamaArab, q)) { seen.add(key); hasil.push({ t: 'mk', id: k.KodeMK, l: k.NamaMK, s: k.KodeMK + ' · ' + (Dom.prodiNama(k.Prodi)) + ' · ' + k.SKS + ' SKS' }); } });
      hasil = hasil.slice(0, 14); sel = -1;
      res.innerHTML = hasil.length ? hasil.map((x, i) => '<button data-i="' + i + '">' + ic(x.t === 'dosen' ? 'user' : 'book', 'ic-sm') + '<div><div>' + esc(x.l) + '</div><small>' + esc(x.s) + '</small></div></button>').join('') : '<div class="empty" style="padding:16px">Tidak ditemukan.</div>';
      res.classList.remove('hidden');
    };
    const pilih = (x) => { res.classList.add('hidden'); inp.value = ''; $('#tb-search').classList.remove('open'); if (x.t === 'dosen') App.nav('dosen', { q: x.l }); else App.nav('realisasi', { q: x.id }); };
    inp.addEventListener('input', debounce(render, 140));
    inp.addEventListener('focus', render);
    inp.addEventListener('keydown', e => {
      const bs = $$('button', res);
      if (e.key === 'ArrowDown') { sel = Math.min(bs.length - 1, sel + 1); } else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); } else if (e.key === 'Enter' && hasil[Math.max(0, sel)]) { pilih(hasil[Math.max(0, sel)]); return; } else return;
      e.preventDefault(); bs.forEach((b, i) => b.classList.toggle('sel', i === sel));
    });
    res.addEventListener('mousedown', e => { const b = e.target.closest('button[data-i]'); if (b) { e.preventDefault(); pilih(hasil[+b.dataset.i]); } });
    inp.addEventListener('blur', () => setTimeout(() => { res.classList.add('hidden'); }, 150));
  },

  /* ---------------- router ---------------- */
  adaKotor() { return Object.values(Pages).some(p => p.el && p.isDirty && p.isDirty()); },
  async nav(rute, args) {
    if (args) App._args = args;
    if (App.cur && App.cur.isDirty && App.cur.isDirty() && !String(rute).startsWith(App.cur.id)) {
      const j = await pilihanTiga('Ada perubahan yang belum disimpan di menu ' + App.cur.judulMenu() + '.', { title: 'Perubahan belum disimpan' });
      if (j === 'batal') return;
      if (j === 'simpan') { const ok = await App.cur.simpan(); if (!ok) return; }
      if (j === 'buang' && App.cur.buang) App.cur.buang();
    }
    if (location.hash === '#/' + rute) App.onHash(true); else location.hash = '#/' + rute;
  },
  async onHash(paksa) {
    if (App._abaikanHash) { App._abaikanHash = false; return; }
    let h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    if (!h) h = Sesi.admin() ? 'ringkasan' : 'ringkasan';
    const parts = h.split('/'), id = parts[0], params = parts.slice(1);
    const p = Pages[id];
    if (!paksa && App.cur && App.cur !== p && App.cur.isDirty && App.cur.isDirty()) {
      App._abaikanHash = true; location.hash = '#/' + App.rute;
      const j = await pilihanTiga('Ada perubahan yang belum disimpan di menu ' + App.cur.judulMenu() + '.', { title: 'Perubahan belum disimpan' });
      if (j === 'batal') return;
      if (j === 'simpan') { const ok = await App.cur.simpan(); if (!ok) return; }
      if (j === 'buang' && App.cur.buang) App.cur.buang();
      location.hash = '#/' + h; return;
    }
    App.tampil(p ? id : 'ringkasan', p ? params : []);
  },
  tampil(id, params) {
    let p = Pages[id];
    if (p.admin && !Sesi.admin()) { toast('Menu ini khusus Admin Utama.', 'warn'); id = 'ringkasan'; p = Pages[id]; params = []; }
    if (!p.el) {
      p.el = document.createElement('section'); p.el.className = 'page'; p.el.id = 'pg-' + id;
      $('#main').appendChild(p.el); App.ikatAksi(p); p.stale = true;
    }
    if (App.cur && App.cur !== p) { App.cur.el.classList.remove('on'); if (App.cur.hide) App.cur.hide(); }
    const parBaru = JSON.stringify(params) !== JSON.stringify(p._params || null);
    p._params = params;
    const args = App._args; App._args = null;
    if (p.onParams) p.onParams(params, args);
    p.el.classList.add('on');
    const pindah = App.cur !== p;
    App.cur = p; App.rute = [id].concat(params).join('/');
    if (p.stale || parBaru || args) { p.stale = false; p.render(); }
    else if (p.onShow) p.onShow();
    $$('#sb-nav [data-r]').forEach(b => b.classList.toggle('on', b.dataset.r === App.rute || (b.dataset.r === id && !MENU.find(m => m.id === id && m.sub))));
    const m = MENU.find(x => x.id === id);
    if (m && m.sub) { const box = $('#sbs-' + id); box && box.classList.add('open'); const sb = $('[data-sub="' + id + '"]'); sb && sb.classList.add('open', 'on'); }
    $$('[data-sub]').forEach(b => { if (b.dataset.sub !== id) b.classList.remove('on'); });
    document.title = (p.judulMenu ? p.judulMenu() : id) + ' — PENJADWALAN AL WAFA';
    if (pindah) window.scrollTo(0, 0);
    App.savebar(p);
  },
  ikatAksi(p) {
    p.judulMenu = p.judulMenu || (() => { const m = MENU.find(x => x.id === p.id); return m ? m.label : p.id; });
    const cari = (e, attrName) => { const t = e.target.closest('[' + attrName + ']'); return t && p.el.contains(t) ? t : null; };
    p.el.addEventListener('click', e => {
      const t = cari(e, 'data-a'); if (!t) return;
      const a = t.dataset.a, fn = (p.acts && p.acts[a]) || App.aksiUmum[a];
      if (fn) fn.call(p, t, e);
    });
    p.el.addEventListener('change', e => { const t = cari(e, 'data-ch'); if (t && p.ch && p.ch[t.dataset.ch]) p.ch[t.dataset.ch].call(p, t, e); });
    p.el.addEventListener('input', e => { const t = cari(e, 'data-in'); if (t && p.inp && p.inp[t.dataset.in]) p.inp[t.dataset.in].call(p, t, e); });
    p.el.addEventListener('dblclick', e => { const t = cari(e, 'data-dbl'); if (t && p.dbl && p.dbl[t.dataset.dbl]) p.dbl[t.dataset.dbl].call(p, t, e); });
    p.el.addEventListener('contextmenu', e => { const t = cari(e, 'data-ctx'); if (t && p.ctx && p.ctx[t.dataset.ctx]) { e.preventDefault(); p.ctx[t.dataset.ctx].call(p, t, e); } });
    if (p.init) p.init();
  },
  aksiUmum: {
    async refresh(btn) {
      const p = this, tabel = (p.refreshTabel || p.deps || []).filter(n => n !== 'Mahasiswa' && n !== 'Aset');
      await denganSibuk(btn, '', async () => {
        if (tabel.length) await api('refresh', { tabel });
        if ((p.refreshTabel || p.deps || []).includes('Mahasiswa')) await api('mahasiswa.refresh', {}, { silent: true });
      });
      toast('Data menu ' + p.judulMenu() + ' dimuat ulang dari spreadsheet.');
      if (Sesi.admin() && Pages.agenda) Pages.agenda.popup(false, true);
    },
    nav(btn) { App.nav(btn.dataset.to, btn.dataset.q ? { q: btn.dataset.q } : null); },
    per(btn) {
      App.perPilih = btn.dataset.v; try { sessionStorage.setItem('pa:per', App.perPilih); } catch (e) {}
      Object.values(Pages).forEach(p => { if (p.pakaiPer && p !== this) p.stale = true; });
      this.render();
    }
  },
  /* periode untuk Ringkasan, Cetak, Blast WA */
  perAktif() { const p = App.periode; return App.perPilih === 'disusun' && p.persiapan ? p.disusun.key : p.berjalan.key; },
  perToggle() {
    const p = App.periode;
    if (!p.persiapan) return '<span class="badge navy">' + esc(p.berjalan.smt + ' ' + p.berjalan.ta) + '</span>';
    const on = App.perPilih === 'disusun' ? 'disusun' : 'berjalan';
    return '<div class="seg" role="tablist"><button data-a="per" data-v="berjalan" class="' + (on === 'berjalan' ? 'on' : '') + '">Berjalan · ' + esc(p.berjalan.smt + ' ' + p.berjalan.ta) + '</button><button data-a="per" data-v="disusun" class="' + (on === 'disusun' ? 'on' : '') + '">Disusun · ' + esc(p.disusun.smt + ' ' + p.disusun.ta) + '</button></div>';
  },
  onData(ch) {
    const set = new Set(ch);
    Object.values(Pages).forEach(p => {
      if (!p.el) return;
      const kena = set.has('_periode') || (p.deps || []).some(d => set.has(d));
      if (!kena) return;
      if (p === App.cur) { if (!p._raf) p._raf = requestAnimationFrame(() => { p._raf = 0; p.render(); App.savebar(p); }); }
      else p.stale = true;
    });
    if (set.has('_periode') || set.has('Pengaturan') || set.has('Aset')) App.perbaruiShell();
    if (set.has('Agenda')) App.perbaruiLonceng();
  },
  savebar(p) {
    let bar = $('#savebar');
    if (!p || !p.isDirty || !p.isDirty() || p !== App.cur) { if (bar) bar.remove(); return; }
    if (!bar) { bar = document.createElement('div'); bar.id = 'savebar'; bar.className = 'savebar'; document.body.appendChild(bar); }
    const info = p.dirtyInfo ? p.dirtyInfo() : { judul: 'Ada perubahan yang belum disimpan', sub: '' };
    bar.innerHTML = ic('edit') + '<div><b>' + esc(info.judul) + '</b>' + (info.sub ? '<small>' + esc(info.sub) + '</small>' : '') + '</div><button class="btn btn-ghost" id="sb-batal">Batal</button><button class="btn btn-accent" id="sb-simpan">' + ic('save') + 'Simpan Perubahan</button>';
    $('#sb-batal').onclick = async () => { if (await konfirmasi('Buang semua perubahan yang belum disimpan?', { danger: true, ok: 'Buang' })) { p.buang(); App.savebar(p); } };
    $('#sb-simpan').onclick = (e) => p.simpan(e.currentTarget);
  }
};
document.addEventListener('DOMContentLoaded', () => App.start());
