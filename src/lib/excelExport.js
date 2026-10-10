// ─────────────────────────────────────────────────────────────────────────────
// Unduh Excel (khusus admin): data master & daftar produk.
// Fungsi *Sheets() hanya menyusun isi tabel (mudah dites); downloadExcel() yang menulis file .xlsx.
// File ini satu arah: untuk dibaca / dicetak, bukan untuk diimpor balik.
// ─────────────────────────────────────────────────────────────────────────────
import { calcDigital, calcOffset } from './engine.js';
import { FINISHING_TYPES, OTHER_BY } from './masterData.js';

const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const RP = '#,##0';
const DEC = '#,##0.##';

// sel
const head = (value) => ({ value, fontWeight: 'bold', backgroundColor: '#E8EEF9', type: String });
const txt = (value) => ({ value: value == null || value === '' ? '' : String(value), type: String });
const rp = (value) => ({ value: Math.round(n(value)), type: Number, format: RP });
const num = (value) => ({ value: n(value), type: Number, format: DEC });
const size = (w, h) => txt(n(w) || n(h) ? `${n(w)} × ${n(h)}` : '');

const sheet = (name, headers, rows, widths) => ({
  sheet: name,
  data: [headers.map(head), ...rows],
  columns: widths.map((width) => ({ width })),
  stickyRowsCount: 1,
});

const finLabel = (type) => FINISHING_TYPES.find((t) => t.value === type)?.label || type;

// ── Data master ───────────────────────────────────────────────────────────

function papersSheet(papers = []) {
  const rows = [];
  for (const p of papers) {
    const sizes = p.sizes?.length ? p.sizes : [{}];
    for (const s of sizes) {
      const price = n(s.price);
      const perSheet = p.priceBy === 'ream' ? price / 500 : price;
      rows.push([txt(p.name), num(p.gsm), size(s.w, s.h), rp(perSheet), rp(perSheet * 500)]);
    }
  }
  return sheet('Kertas', ['Kertas', 'GSM', 'Ukuran plano (cm)', 'Harga / lembar', 'Harga / rim (500 lbr)'], rows, [26, 8, 18, 16, 20]);
}

function machinesSheet(machines = []) {
  const rows = machines.map((m) => [
    txt(m.name), size(m.minW, m.minH), size(m.maxW, m.maxH), size(m.printW, m.printH),
    rp(m.platePrice), num(m.minSheets), rp(m.costMin), rp(m.costMinSame), rp(m.costPerSheet),
    txt(`${n(m.insheetMin)} lbr / ${n(m.insheetPct)}%`),
  ]);
  return sheet('Mesin', [
    'Mesin', 'Kertas min (cm)', 'Kertas maks (cm)', 'Area cetak (cm)', 'Harga plat',
    'Minimum s.d. (lbr)', 'Ongkos minimum / plat', 'Ongkos min. plat sama (bolak-balik)', 'Ongkos / lembar / warna', 'Kertas cadangan (min / %)',
  ], rows, [18, 15, 15, 15, 12, 16, 18, 26, 20, 22]);
}

// Satu baris per tarif: jenis | tipe | minimum | tarif | dihitung per
function finishingSheet(fin = {}) {
  const rows = [];
  const row = (type, tipe, min, rate, unit) => rows.push([txt(finLabel(type)), txt(tipe), rp(min), num(rate), txt(unit)]);
  const f = fin;
  for (const t of f.laminating?.types || []) row('laminating', t.name, t.min, t.rate, 'per cm² per pcs');
  if (f.varnish) row('varnish', '', f.varnish.min, f.varnish.rate, 'per cm² per sisi');
  if (f.spotuv) row('spotuv', '', f.spotuv.min, f.spotuv.rate, 'per cm² per sisi');
  if (f.pond) row('pond', 'Ongkos pond', f.pond.min, f.pond.rate, 'per lembar cetak');
  for (const t of f.pond?.templates || []) row('pond', `Pisau ${t.name}`, t.min, t.rate, 'per cm keliling pisau');
  if (f.folding) row('folding', '', f.folding.min, f.folding.rate, 'per lembar per lipatan');
  if (f.poly?.f1) row('poly', 'Rumus 1', f.poly.f1.min, f.poly.f1.rate, 'per cm² per lembar');
  if (f.poly?.f2) row('poly', 'Rumus 2 (per spot)', f.poly.f2.min, f.poly.f2.rate, `per cm² per lembar · min. ${n(f.poly.f2.minPerSpot)} per spot`);
  if (f.poly) row('poly', 'Klise', f.poly.templateMin, f.poly.templateRate, 'per cm²');
  if (f.emboss) row('emboss', 'Ongkos emboss', f.emboss.min, f.emboss.rate, 'per lembar cetak');
  if (f.emboss) row('emboss', 'Klise', f.emboss.templateMin, f.emboss.templateRate, 'per cm²');
  for (const t of f.spiral?.types || []) row('spiral', t.name, f.spiral.min, t.rate, 'per cm per set');
  if (f.cutting) rows.push([txt('Potong'), txt(''), rp(f.cutting.min), num(f.cutting.rate), txt('per kg')]);
  return sheet('Finishing', ['Finishing', 'Tipe', 'Minimum', 'Tarif', 'Dihitung'], rows, [16, 20, 14, 12, 36]);
}

function othersSheet(others = []) {
  const rows = others.map((o) => {
    const by = OTHER_BY.find((b) => b.value === o.by)?.label || o.by;
    const unit = o.by === 'pcs' ? `per ${n(o.perQty) || 1} pcs` : by;
    return [txt(o.name), txt(unit), o.by === 'order' || o.by === 'pcs' ? txt('') : rp(o.min), num(o.rate)];
  });
  return sheet('Biaya lain', ['Biaya', 'Dihitung', 'Minimum', 'Tarif'], rows, [22, 22, 14, 14]);
}

function digitalSheet(machines = [], papers = []) {
  const rows = [];
  for (const m of machines) {
    for (const pr of m.prices || []) {
      const paper = papers.find((p) => p.id === pr.paperId);
      const tiers = [...(pr.tiers || [])].filter((t) => n(t.upTo) > 0).sort((a, b) => n(a.upTo) - n(b.upTo))
        .map((t) => `s.d. ${n(t.upTo)} lbr: ${Math.round(n(t.price)).toLocaleString('id-ID')}`).join(' · ');
      rows.push([txt(m.name), size(m.w, m.h), txt(paper?.name || '-'), num(paper?.gsm), rp(pr.normal), txt(tiers)]);
    }
  }
  return sheet('Digital', ['Mesin', 'Ukuran kertas (cm)', 'Kertas', 'GSM', 'Harga normal / lembar', 'Harga per jumlah lembar'], rows, [18, 16, 18, 8, 20, 50]);
}

function settingsSheet(s = {}) {
  const rows = [
    [txt('Profit'), num(s.profitPct), txt('%')],
    [txt('Profit minimum per order'), rp(s.profitMin), txt('Rp')],
    [txt('Pajak'), num(s.taxPct), txt('%')],
    [txt('Bleed'), num(s.bleed), txt('cm per sisi')],
  ];
  return sheet('Pengaturan umum', ['Pengaturan', 'Nilai', 'Satuan'], rows, [28, 14, 14]);
}

export function masterSheets(master) {
  return [
    papersSheet(master.papers),
    machinesSheet(master.machines),
    finishingSheet(master.finishing),
    othersSheet(master.others),
    digitalSheet(master.digitalMachines, master.digitalPapers),
    settingsSheet(master.settings),
  ];
}

// ── Produk ────────────────────────────────────────────────────────────────

export function productSheets(products, master) {
  const summary = [];
  const detail = [];
  for (const p of products) {
    const isOffset = p.kind === 'offset';
    let r;
    try { r = isOffset ? calcOffset(p, master) : calcDigital(p, master); } catch { r = null; }
    const name = p.name || 'Tanpa nama';
    const kind = isOffset ? 'Offset' : 'Digital';
    const parts = (isOffset ? p.media : p.items) || [];
    const sizes = parts.map((m) => `${n(m.w)} × ${n(m.h)}`).join(', ');
    summary.push([
      txt(name), txt(kind), num(p.qty), txt(sizes),
      rp(r?.cost), rp(r?.profit), rp(r?.tax), rp(r?.total), rp(r?.perPcs),
    ]);
    for (const l of r?.lines || []) detail.push([txt(name), txt(l.label), txt(l.note), rp(l.cost)]);
  }
  return [
    sheet('Produk', ['Produk', 'Jenis', 'Jumlah (pcs)', 'Ukuran jadi (cm)', 'Modal (HPP)', 'Profit', 'Pajak', 'Harga jual', 'Harga / pcs'],
      summary, [28, 10, 13, 22, 16, 14, 14, 16, 14]),
    sheet('Rincian biaya', ['Produk', 'Komponen', 'Keterangan', 'Biaya'], detail, [28, 30, 50, 16]),
  ];
}

// ── Tulis file ────────────────────────────────────────────────────────────

const stamp = () => new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const safe = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, '').trim();

export const excelFileName = (what, shopName) => `${what} - ${safe(shopName)} - ${stamp()}.xlsx`;

export async function downloadExcel(sheets, fileName) {
  const { default: writeExcelFile } = await import('write-excel-file/universal');
  const blob = await writeExcelFile(sheets).toBlob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
