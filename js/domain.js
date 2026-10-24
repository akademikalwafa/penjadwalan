/* =====================================================================
   PENJADWALAN AL WAFA — domain.js
   Aturan bisnis sisi tampilan (cermin aturan server): periode, semester
   mahasiswa, pola jam & slot, unit realisasi, rombel, ketersediaan dosen,
   deteksi bentrok, warna dosen. Semua dihitung dari data lokal (instan).
   ===================================================================== */
'use strict';
const URUT_HARI = { Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6, Ahad: 7, Minggu: 7 };
const PALET_DOSEN = ['#1E40AF', '#047857', '#B45309', '#7C3AED', '#BE123C', '#0E7490', '#4D7C0F', '#C2410C', '#4338CA', '#0F766E', '#A21CAF', '#9A3412', '#1D4ED8', '#15803D', '#B91C1C', '#6D28D9', '#0369A1', '#854D0E'];

const Dom = {
  _m: {},
  memo(k, fn) { if (!(k in this._m)) this._m[k] = fn(); return this._m[k]; },
  reset() { this._m = {}; },

  /* ---------- pengaturan & periode ---------- */
  set(k, d) { const r = DB.get('Pengaturan', 'Kunci', k); return r && r.Nilai !== '' ? r.Nilai : (d === undefined ? '' : d); },
  setJson(k, d) { try { const v = this.set(k, ''); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  perObj(key) { const p = String(key || '').split(' '); return { ta: p[0] || '', smt: p[1] || '', key: key }; },
  perLabel(key) { const p = this.perObj(key); return p.smt + ' ' + p.ta; },
  perTA(key) { const p = this.perObj(key); return (p.smt || '').toUpperCase() + ' ' + String(p.ta).replace('/', ' / '); },
  rentang(key) { const r = this.setJson('PERIODE_TANGGAL', {})[key]; return r || null; },
  semMhs(angkatan, perKey) { const p = this.perObj(perKey); return (parseInt(p.ta, 10) - Number(angkatan)) * 2 + (p.smt === 'Ganjil' ? 1 : 2); },
  tingkat(smt) { return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][Math.max(0, Math.ceil(smt / 2) - 1)] || String(Math.ceil(smt / 2)); },
  urlVerif(kode) {
    const base = this.set('VERIF_URL') || (location.origin + location.pathname.replace(/[^/]*$/, '') + 'verifikasi.html');
    return base + (base.indexOf('?') >= 0 ? '&' : '?') + 'k=' + encodeURIComponent(kode);
  },

  /* ---------- prodi, kelas, angkatan ---------- */
  prodiSemua() { return this.memo('prodiS', () => DB.rows('Prodi').slice().sort(by(p => num(p.Urutan, 99)))); },
  prodi() { return this.prodiSemua().filter(p => p.Aktif !== 'TIDAK'); },
  prodiNama(kode) { const p = DB.get('Prodi', 'Kode', kode); return p ? p.Nama : (kode || ''); },
  prodiWarna(kode) { const p = DB.get('Prodi', 'Kode', kode); return (p && p.Warna) || '#1E3A8A'; },
  kelasSemua() { return this.memo('kelasS', () => DB.rows('Kelas').slice().sort(by(k => num(k.Urutan, 99)))); },
  kelas() { return this.kelasSemua().filter(k => k.Aktif !== 'TIDAK'); },
  kelasObj(nama) { return DB.get('Kelas', 'Nama', nama) || {}; },
  kelasPola(nama) { return this.kelasObj(nama).Pola || ''; },
  kelasProdi(kode, termasukKhusus) { return this.kelas().filter(k => String(k.Prodi).split(',').map(x => x.trim()).includes(kode) && (termasukKhusus || k.Pola !== 'Tidak dijadwalkan')); },
  kelasTerjadwal() { return this.kelas().filter(k => k.Pola !== 'Tidak dijadwalkan'); },
  kelasKode(nama) { const k = this.kelasObj(nama); return k.Kode || String(nama || '').slice(0, 2).toUpperCase(); },
  kelasWarna(nama) { return this.kelasObj(nama).Warna || '#1E3A8A'; },
  angkatanSemua() { return DB.rows('Angkatan').slice().sort(by(a => -num(a.Tahun))); },
  angkatanAktif() { return this.angkatanSemua().filter(a => a.Status !== 'Diarsipkan').map(a => a.Tahun); },
  angkatanArsip() { return new Set(this.angkatanSemua().filter(a => a.Status === 'Diarsipkan').map(a => a.Tahun)); },

  /* ---------- pola jam & slot ---------- */
  hariReg() { return this.set('REGULER_HARI', 'Senin,Selasa,Rabu,Kamis,Jumat').split(',').map(x => x.trim()).filter(Boolean); },
  menit(hhmm) { const p = String(hhmm || '0.0').replace(':', '.').split('.'); return (+p[0]) * 60 + (+(p[1] || 0)); },
  slots(pola) {
    return this.memo('slots_' + pola, () => {
      const hariReg = this.hariReg(), js = DB.rows('JamSesi').filter(j => j.Pola === pola), khusus = {}, out = [];
      js.forEach(j => { if (j.Hari !== 'Senin-Jumat' && j.Hari !== '*') khusus[j.Hari] = true; });
      js.forEach(j => {
        const hari = (j.Hari === 'Senin-Jumat' || j.Hari === '*') ? hariReg.filter(h => !khusus[h]) : [j.Hari];
        hari.forEach(h => out.push({ hari: h, sesi: +j.Sesi, key: h + '|' + j.Sesi, mulai: j.Mulai, selesai: j.Selesai, label: j.Label || '', m0: this.menit(j.Mulai), m1: this.menit(j.Selesai) }));
      });
      out.sort((a, b) => (URUT_HARI[a.hari] || 9) - (URUT_HARI[b.hari] || 9) || a.sesi - b.sesi);
      return out;
    });
  },
  slotMap(pola) { return this.memo('slotM_' + pola, () => { const m = {}; this.slots(pola).forEach(s => m[s.key] = s); return m; }); },
  hariPola(pola) { return [...new Set(this.slots(pola).map(s => s.hari))]; },
  sesiPola(pola) { return [...new Set(this.slots(pola).map(s => s.sesi))].sort((a, b) => a - b); },
  ujianSesi() { const d = [{ sesi: 1, mulai: '08.00', selesai: '09.30' }, { sesi: 2, mulai: '10.00', selesai: '11.30' }, { sesi: 3, mulai: '13.00', selesai: '14.30' }, { sesi: 4, mulai: '14.50', selesai: '16.20' }]; const v = this.setJson('UJIAN_SESI', d); return Array.isArray(v) && v.length ? v : d; },
  ujianSlots(pola) {
    if (pola === 'Hybrid') return this.slots('Hybrid');
    return this.memo('uslot', () => { const out = []; this.hariReg().forEach(h => this.ujianSesi().forEach(s => out.push({ hari: h, sesi: +s.sesi, key: h + '|' + s.sesi, mulai: s.mulai, selesai: s.selesai, m0: this.menit(s.mulai), m1: this.menit(s.selesai) }))); return out; });
  },
  jamSlot(pola, hari, sesi, ujian) { const s = (ujian ? this.ujianSlots(pola) : this.slots(pola)).find(x => x.hari === hari && String(x.sesi) === String(sesi)); return s ? s.mulai + '–' + s.selesai : ''; },

  /* ---------- dosen ---------- */
  dosen() { return this.memo('dsn', () => DB.rows('Dosen').slice().sort(by(d => norm(d.Nama)))); },
  dosenNama(id) { const d = DB.get('Dosen', 'ID', id); return d ? d.Nama : ''; },
  sedia(d, pola) { return this.memo('sedia_' + (d && d.ID) + '_' + pola, () => { try { return new Set(JSON.parse((d && d['Sedia' + pola]) || '[]')); } catch (e) { return new Set(); } }); },
  dosenPola(pola) { return this.dosen().filter(d => this.sedia(d, pola).size > 0); },
  warnaDosen(id) { if (!id) return '#94A3B8'; let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; const list = this.dosen(); const i = list.findIndex(d => d.ID === id); return PALET_DOSEN[(i >= 0 ? i : h) % PALET_DOSEN.length]; },

  /* ---------- unit realisasi (MK × rombel) ---------- */
  units(perKey) {
    return this.memo('units_' + perKey, () => {
      const out = [];
      DB.rows('Realisasi').forEach(r => {
        if (r.TA + ' ' + r.Semester !== perKey) return;
        const k = DB.get('Kurikulum', 'ID', r.KurikulumID); if (!k) return;
        const pola = this.kelasPola(k.Kelas); if (!pola || pola === 'Tidak dijadwalkan') return;
        const sks = Math.max(1, num(k.SKS, 2)), smt = this.semMhs(k.Angkatan, perKey);
        out.push({ id: r.ID, r, kur: k, pola, prodi: k.Prodi, angkatan: k.Angkatan, kelas: k.Kelas, smt, rombel: k.Prodi + '|' + k.Angkatan + '|' + k.Kelas,
          sks, bagian: Math.max(1, Math.ceil(sks / 2)), aturan: r.AturanSKS === 'BEDA' ? 'BEDA' : 'BERTURUT', dosen: [r.Dosen1, r.Dosen2].filter(Boolean), tahfidz: k.Tahfidz === 'YA', gabung: r.Gabung || '' });
      });
      return out;
    });
  },
  unitMap(perKey) { return this.memo('umap_' + perKey, () => { const m = new Map(); this.units(perKey).forEach(u => m.set(u.id, u)); return m; }); },
  dosenTeks(u, sep) { return (u.dosen || []).map(id => this.dosenNama(id)).filter(Boolean).join(sep || ' dan '); },
  rombelLabel(prodi, angkatan, kelas, perKey, panjang) { const smt = this.semMhs(angkatan, perKey); return panjang ? this.prodiNama(prodi) + ' · Semester ' + smt + ' · ' + kelas : prodi + ' · Smt ' + smt + ' · ' + kelas; },
  rombelUrut(a, b) {
    const pa = DB.get('Prodi', 'Kode', a.prodi) || {}, pb = DB.get('Prodi', 'Kode', b.prodi) || {};
    return num(pa.Urutan, 99) - num(pb.Urutan, 99) || num(b.angkatan) - num(a.angkatan) || num(Dom.kelasObj(a.kelas).Urutan, 99) - num(Dom.kelasObj(b.kelas).Urutan, 99);
  },
  rombelJadwal(perKey, pola) {
    const m = new Map();
    this.units(perKey).forEach(u => { if (pola && u.pola !== pola) return; if (!m.has(u.rombel)) m.set(u.rombel, { key: u.rombel, prodi: u.prodi, angkatan: u.angkatan, kelas: u.kelas, smt: u.smt, pola: u.pola }); });
    return [...m.values()].sort(this.rombelUrut);
  },

  /* ---------- jadwal tersimpan ---------- */
  jadwal(perKey, pola) { return DB.rows('Jadwal').filter(j => j.TA + ' ' + j.Semester === perKey && (!pola || j.Pola === pola)); },
  jadwalGrid(perKey) { return this.memo('jg_' + perKey, () => { const m = new Map(); this.jadwal(perKey).forEach(j => { if (j.Posisi !== 'GRID') return; if (!m.has(j.RealisasiID)) m.set(j.RealisasiID, []); m.get(j.RealisasiID).push(j); }); m.forEach(l => l.sort((a, b) => (URUT_HARI[a.Hari] || 9) - (URUT_HARI[b.Hari] || 9) || a.Sesi - b.Sesi)); return m; }); },
  hariJam(uid, perKey, pola) {
    const l = this.jadwalGrid(perKey).get(uid) || [];
    if (!l.length) return '';
    return l.map(j => j.Hari + ', ' + this.jamSlot(pola || j.Pola, j.Hari, j.Sesi)).join('; ');
  },
  adaJadwal(perKey) { return this.jadwal(perKey).some(j => j.Posisi === 'GRID'); },
  dosenBerjadwal(perKey) {
    return this.memo('dbj_' + perKey, () => {
      const g = this.jadwalGrid(perKey), um = this.unitMap(perKey), set = new Map();
      g.forEach((l, id) => { const u = um.get(id); if (!u) return; u.dosen.forEach(ds => { if (!set.has(ds)) set.set(ds, []); set.get(ds).push(u); }); });
      return set;
    });
  },
  /** Beban dosen dari realisasi (MK diampu) untuk satu periode. */
  bebanDosen(perKey) {
    return this.memo('beban_' + perKey, () => {
      const m = new Map();
      this.units(perKey).forEach(u => u.dosen.forEach(ds => { if (!m.has(ds)) m.set(ds, []); m.get(ds).push(u); }));
      return m;
    });
  },
  stDosen(perKey) { return this.memo('st_' + perKey, () => { const m = new Map(); DB.rows('SuratTugas').forEach(s => { if (s.TA + ' ' + s.Semester === perKey) m.set(s.DosenID, s); }); return m; }); },

  /* ---------- mahasiswa ---------- */
  mhs() { return DB.rows('Mahasiswa'); },
  mhsAktif() { return this.memo('mhsA', () => this.mhs().filter(m => m.Status === 'Aktif')); },
  mhsRombel(prodi, angkatan, kelas, jk) {
    return this.mhsAktif().filter(m => m.Cocok === 'YA' && m.Prodi === prodi && m.Angkatan === String(angkatan) && m.Kelas === kelas && (!jk || m.JK === jk))
      .sort((a, b) => norm(a.Nama).localeCompare(norm(b.Nama)));
  },
  /** Rombel dari data mahasiswa aktif (bukan Khusus) — untuk Daftar Hadir & Penerima Kitab. */
  rombelMhs(perKey) {
    return this.memo('rmhs_' + perKey, () => {
      const m = new Map();
      this.mhsAktif().forEach(x => {
        if (x.Cocok !== 'YA' || this.kelasPola(x.Kelas) === 'Tidak dijadwalkan') return;
        const k = x.Prodi + '|' + x.Angkatan + '|' + x.Kelas;
        if (!m.has(k)) m.set(k, { key: k, prodi: x.Prodi, angkatan: x.Angkatan, kelas: x.Kelas, smt: this.semMhs(x.Angkatan, perKey), pola: this.kelasPola(x.Kelas), L: 0, P: 0, n: 0 });
        const r = m.get(k); r.n++; if (x.JK === 'L') r.L++; else if (x.JK === 'P') r.P++;
      });
      return [...m.values()].sort(this.rombelUrut);
    });
  },

  /* ---------- bentrok (dipakai Generate Jadwal & Ujian) ---------- */
  /** entri: [{uid, hari, sesi}] → Map uid#hari|sesi → [masalah] */
  periksa(entri, perKey, polaSaatIni, ujian) {
    const um = this.unitMap(perKey), masalah = new Map(), sibuk = new Map(), tambah = (k, m) => { if (!masalah.has(k)) masalah.set(k, []); if (!masalah.get(k).includes(m)) masalah.get(k).push(m); };
    entri.forEach(e => {
      const u = um.get(e.uid); if (!u) return;
      const s = (ujian ? this.ujianSlots(e.pola || u.pola) : this.slots(e.pola || u.pola)).find(x => x.hari === e.hari && String(x.sesi) === String(e.sesi)); if (!s) return;
      u.dosen.forEach(ds => { const k = ds + '|' + s.hari; if (!sibuk.has(k)) sibuk.set(k, []); sibuk.get(k).push({ e, u, s }); });
      if (!ujian && (e.pola || u.pola) === polaSaatIni && u.dosen.length) {
        const d = DB.get('Dosen', 'ID', u.dosen[0]);
        u.dosen.forEach(ds => { const dd = DB.get('Dosen', 'ID', ds); if (dd && !this.sedia(dd, u.pola).has(s.key)) tambah(e.uid + '#' + e.hari + '|' + e.sesi, this.namaPendek(dd.Nama) + ' tidak menandai tersedia di slot ini'); });
        if (!d) tambah(e.uid + '#' + e.hari + '|' + e.sesi, 'Dosen tidak ditemukan');
      }
    });
    let bentrok = 0;
    sibuk.forEach(list => {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (!(a.s.m0 < b.s.m1 && b.s.m0 < a.s.m1)) continue;
        if (a.u.id === b.u.id) continue;
        if (a.u.gabung && a.u.gabung === b.u.gabung) continue;
        if (a.u.tahfidz && b.u.tahfidz) continue;
        bentrok++;
        const nm = this.namaPendek(this.dosenNama(a.u.dosen.find(x => b.u.dosen.includes(x))));
        tambah(a.e.uid + '#' + a.e.hari + '|' + a.e.sesi, 'Bentrok: ' + nm + ' juga mengajar ' + b.u.kur.NamaMK + ' (' + b.u.kelas + ')');
        tambah(b.e.uid + '#' + b.e.hari + '|' + b.e.sesi, 'Bentrok: ' + nm + ' juga mengajar ' + a.u.kur.NamaMK + ' (' + a.u.kelas + ')');
      }
    });
    return { masalah, bentrok };
  },
  namaPendek(n) { return String(n || '').replace(/,.*$/, '').trim(); },
  adaArab(s) { return /[؀-ۿ]/.test(String(s || '')); }
};
const _onDataAsli = App.onData;
App.onData = function (ch) { Dom.reset(); return _onDataAsli.call(App, ch); };
