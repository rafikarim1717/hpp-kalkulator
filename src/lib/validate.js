// ─────────────────────────────────────────────────────────────────────────────
// Validasi data master. Tiap fungsi mengembalikan { field: pesan } — kosong = aman.
// Dipakai di halaman Data Master (kolom merah) dan di kalkulasi (harga ditandai
// belum bisa dipakai kalau mesin / kertas yang dipilih datanya belum benar).
// Lebar & tinggi boleh diisi bolak-balik: semua cek pakai sisi pendek & sisi panjang.
// ─────────────────────────────────────────────────────────────────────────────

const n = (v) => Number(v) || 0;
const sl = (a, b) => [Math.min(n(a), n(b)), Math.max(n(a), n(b))];

const MACHINE_REQUIRED = ['minW', 'minH', 'maxW', 'maxH', 'printW', 'printH', 'platePrice'];
const MACHINE_NUMBERS = ['insheetMin', 'insheetPct', 'minW', 'minH', 'maxW', 'maxH', 'printW', 'printH', 'marginSide', 'marginGrip', 'platePrice', 'minSheets', 'costMin', 'costMinSame', 'costPerSheet'];

export function machineErrors(m) {
  const e = {};
  if (!String(m.name || '').trim()) e.name = 'Nama mesin wajib diisi';
  for (const k of MACHINE_NUMBERS) if (n(m[k]) < 0) e[k] = 'Tidak boleh minus';
  for (const k of MACHINE_REQUIRED) if (!e[k] && n(m[k]) === 0) e[k] = 'Wajib diisi';
  if (n(m.insheetPct) > 100) e.insheetPct = 'Maksimal 100%';

  const [minS, minL] = sl(m.minW, m.minH);
  const [maxS, maxL] = sl(m.maxW, m.maxH);
  const [prS, prL] = sl(m.printW, m.printH);
  const filled = (...ks) => ks.every((k) => n(m[k]) > 0 && !e[k]);

  if (filled('minW', 'minH', 'maxW', 'maxH') && (minS > maxS || minL > maxL)) {
    e.minW = e.minH = 'Ukuran minimum lebih besar dari ukuran maksimum';
  }
  if (filled('printW', 'printH', 'maxW', 'maxH') && (prS > maxS || prL > maxL)) {
    e.printW = e.printH = `Area cetak lebih besar dari kertas maksimum (${maxS} × ${maxL} cm)`;
  }
  if (filled('printW', 'printH', 'maxW', 'maxH') && !e.printW) {
    // area cetak + margin tetap harus muat di kertas maksimum
    if (prS + n(m.marginGrip) > maxS + 0.01 || prL + n(m.marginSide) > maxL + 0.01) {
      if (!e.marginGrip) e.marginGrip = 'Area cetak + margin melebihi kertas maksimum';
      if (!e.marginSide) e.marginSide = 'Area cetak + margin melebihi kertas maksimum';
    }
  }
  return e;
}

export function paperErrors(p) {
  const e = { sizes: [] };
  if (!String(p.name || '').trim()) e.name = 'Nama kertas wajib diisi';
  if (n(p.gsm) < 0) e.gsm = 'Tidak boleh minus';
  else if (n(p.gsm) === 0) e.gsm = 'Wajib diisi (dipakai hitung berat & ongkos potong)';
  if (!(p.sizes || []).length) e.general = 'Belum ada ukuran plano';
  (p.sizes || []).forEach((s, k) => {
    const se = {};
    for (const key of ['w', 'h', 'price']) {
      if (n(s[key]) < 0) se[key] = 'Tidak boleh minus';
      else if (n(s[key]) === 0) se[key] = key === 'price' ? 'Harga belum diisi' : 'Wajib diisi';
    }
    e.sizes[k] = se;
  });
  return e;
}

export const countErrors = (e) => Object.entries(e).reduce((c, [k, v]) => {
  if (k === 'sizes') return c + v.reduce((s, x) => s + Object.keys(x).length, 0);
  return c + (v ? 1 : 0);
}, 0);
