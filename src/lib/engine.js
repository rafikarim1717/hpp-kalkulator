// ─────────────────────────────────────────────────────────────────────────────
// Engine hitung ala "Kalkulator Biaya Cetak Pro" (app referensi client).
// Alurnya mengikuti cara owner percetakan menghitung:
//   hasil jadi → disusun di lembar cetak (naik) → lembar cetak dipotong dari plano
//   → kertas + plat/cetak + finishing + biaya lain → profit & pajak per komponen.
// Angka contoh Brosur di app referensi dikunci di engine.test.js.
// ─────────────────────────────────────────────────────────────────────────────
import { calcImposition } from './calc.js';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const ceil = (n) => Math.ceil(n - 1e-9);

// ── Susunan di lembar cetak ────────────────────────────────────────────────

// Susunan grid sederhana: cols × rows item, opsional diputar 90°.
function gridBlocks(iw, ih, cols, rows, rotated) {
  const bw = rotated ? ih : iw, bh = rotated ? iw : ih;
  return { blocks: [{ x: 0, y: 0, cols, rows, iw: bw, ih: bh, rotated }], count: cols * rows, usedW: cols * bw, usedH: rows * bh };
}

function usedOf(blocks) {
  let w = 0, h = 0;
  for (const b of blocks) {
    w = Math.max(w, b.x + b.cols * b.iw);
    h = Math.max(h, b.y + b.rows * b.ih);
  }
  return { usedW: w, usedH: h };
}

// Ubah susunan item jadi ukuran lembar cetak: area terpakai + margin, minimal sebesar media minimum mesin.
function toSheet(arr, machine) {
  const w = Math.max(arr.usedW + num(machine.marginSide), num(machine.minW));
  const h = Math.max(arr.usedH + num(machine.marginGrip), num(machine.minH));
  return {
    ...arr, up: arr.count, sheetW: round2(w), sheetH: round2(h),
    // posisi blok relatif ke lembar cetak (margin samping dibagi dua, gripper di bawah)
    offsetX: round2((w - arr.usedW) / 2), offsetY: round2(Math.max(0, h - arr.usedH - num(machine.marginGrip)) / 2),
  };
}

// Semua pilihan susunan yang masuk area cetak mesin.
export function layoutOptions(iw, ih, machine) {
  const pw = num(machine.printW), ph = num(machine.printH);
  const opts = [];
  const seen = new Set();
  for (const rotated of [false, true]) {
    const bw = rotated ? ih : iw, bh = rotated ? iw : ih;
    const maxC = bw > 0 ? Math.floor(pw / bw + 1e-9) : 0;
    const maxR = bh > 0 ? Math.floor(ph / bh + 1e-9) : 0;
    for (let c = 1; c <= maxC; c++) {
      for (let r = 1; r <= maxR; r++) {
        const key = `${rotated ? 'L' : 'P'}${c}x${r}`;
        if (seen.has(key)) continue;
        seen.add(key);
        opts.push({ key, ...toSheet(gridBlocks(iw, ih, c, r, rotated), machine) });
      }
    }
  }
  // susunan campuran (tegak + miring) kalau lebih banyak dari grid biasa
  const best = calcImposition(pw, ph, iw, ih, 0, 0, 0, 0, 'best');
  if (best.mixed && best.count > 0) {
    const arr = { blocks: best.blocks, count: best.count, ...usedOf(best.blocks) };
    opts.push({ key: 'mixed', mixed: true, ...toSheet(arr, machine) });
  }
  return opts;
}

// Lembar cetak cukup untuk finishing? (lebar maksimal mesin laminasi / varnish, ukuran maks pond, dll)
export function finishingLimits(sheetW, sheetH, finishings, fset) {
  const problems = [];
  const long = Math.max(sheetW, sheetH);
  const fitsBox = (mw, mh) => (sheetW <= mw && sheetH <= mh) || (sheetW <= mh && sheetH <= mw);
  for (const f of finishings || []) {
    const s = fset[f.type];
    if (!s) continue;
    if (['laminating', 'varnish', 'spotuv'].includes(f.type) && s.maxWidth > 0 && long > s.maxWidth) {
      problems.push(`${label(f.type)} maks lebar ${s.maxWidth} cm`);
    }
    if (['pond', 'folding', 'poly', 'emboss'].includes(f.type) && s.maxW > 0 && !fitsBox(s.maxW, s.maxH)) {
      problems.push(`${label(f.type)} maks ${s.maxW} × ${s.maxH} cm`);
    }
  }
  return problems;
}

// Mode "referensi" (sama dengan app Android): susunan paling banyak di area cetak;
// kalau lembarnya kebesaran untuk salah satu finishing, langsung turun ke 1 naik.
function referenceLayout(iw, ih, machine, finishings, fset) {
  const pw = num(machine.printW), ph = num(machine.printH);
  const best = calcImposition(pw, ph, iw, ih, 0, 0, 0, 0, 'best');
  let arr;
  if (best.count > 0) arr = toSheet({ blocks: best.blocks, count: best.count, ...usedOf(best.blocks) }, machine);
  if (!arr || finishingLimits(arr.sheetW, arr.sheetH, finishings, fset).length) {
    arr = toSheet(gridBlocks(iw, ih, 1, 1, false), machine);
  }
  return arr;
}

// ── Plano ──────────────────────────────────────────────────────────────────

// Pilih ukuran plano termurah untuk sejumlah lembar cetak.
export function choosePlano(paper, sheetW, sheetH, totalSheets) {
  let best = null;
  for (const s of paper?.sizes || []) {
    const imp = calcImposition(num(s.w), num(s.h), sheetW, sheetH, 0, 0, 0, 0, 'best');
    if (!imp.count) continue;
    const pricePerSheet = paper.priceBy === 'ream' ? num(s.price) / 500 : num(s.price);
    const planos = ceil(totalSheets / imp.count);
    const cost = planos * pricePerSheet;
    const eff = (imp.count * sheetW * sheetH) / (s.w * s.h) * 100;
    const cand = { w: num(s.w), h: num(s.h), ratio: imp.count, planos, pricePerSheet, cost, eff, blocks: imp.blocks };
    if (!best || cand.cost < best.cost - 1e-9 || (Math.abs(cand.cost - best.cost) < 1e-9 && cand.ratio > best.ratio)) best = cand;
  }
  return best;
}

// ── Finishing ──────────────────────────────────────────────────────────────

const LABELS = { laminating: 'Laminating', varnish: 'Varnish/UV', spotuv: 'Spot UV', pond: 'Pond', folding: 'Folding', poly: 'Poly', emboss: 'Emboss', spiral: 'Spiral', cutting: 'Potong' };
const label = (t) => LABELS[t] || t;

function finishingInsheet(f, s, baseSheets) {
  if (!s) return 0;
  switch (f.type) {
    case 'laminating': case 'varnish': case 'spotuv': case 'folding': return num(s.insheet);
    case 'pond': case 'poly': case 'emboss': return Math.max(num(s.insheetMin), ceil(baseSheets * num(s.insheetPct) / 100));
    default: return 0;
  }
}

const atLeast = (min, v) => ({ cost: Math.max(num(min), v), hitMin: v < num(min) });

function calcFinishing(f, s, ctx) {
  const { w, h, pcs, printSheets, productQty } = ctx;
  const up = Math.max(1, num(ctx.up) || 1); // alat yang menempel per naik (pisau, klise) dikali jumlah naik
  const area = w * h;
  const out = { type: f.type, label: label(f.type), parts: [], cost: 0, hitMin: false };
  const add = (note, r) => { out.parts.push({ note, cost: r.cost, hitMin: r.hitMin }); out.cost += r.cost; out.hitMin = out.hitMin || r.hitMin; };
  if (!s) return out;
  switch (f.type) {
    case 'laminating': {
      const b = num(s.bleed);
      const lw = w + 2 * b, lh = h + 2 * b;
      out.size = `${round2(lw)} × ${round2(lh)}`;
      const side = (typeName, which) => {
        const t = (s.types || []).find((x) => x.name === typeName) || (s.types || [])[0];
        if (!t) return;
        add(`${which}: ${t.name} · ${printSheets} lbr`, atLeast(t.min, pcs * lw * lh * num(t.rate)));
      };
      side(f.front, 'Depan');
      if (f.twoSides) side(f.back || f.front, 'Belakang');
      break;
    }
    case 'varnish': case 'spotuv': {
      const sides = Math.max(1, num(f.sides) || 1);
      add(`${sides} sisi`, atLeast(s.min, pcs * area * num(s.rate) * sides));
      break;
    }
    case 'pond': {
      add(`${printSheets} lbr`, atLeast(s.min, printSheets * num(s.rate)));
      if (f.includeTemplate) {
        const t = (s.templates || []).find((x) => x.name === f.template) || (s.templates || [])[0];
        if (t) {
          const manual = num(f.knifeLength) > 0;
          const per = manual ? num(f.knifeLength) : 2 * (w + h);
          const len = per * up;
          add(`Pisau ${t.name} · ${round2(per)} cm${manual ? '' : ' (keliling)'}${up > 1 ? ` × ${up} naik` : ''}`, atLeast(t.min, len * num(t.rate)));
        }
      }
      break;
    }
    case 'folding': {
      const folds = Math.max(1, num(f.folds) || 1);
      add(`${folds} lipatan · ${printSheets} lbr`, atLeast(s.min, printSheets * num(s.rate) * folds));
      break;
    }
    case 'poly': {
      const sides = f.twoSides ? 2 : 1;
      if (f.formula === 'second') {
        const spots = f.spots || [];
        let sum = 0, tpl = 0;
        for (const sp of spots) {
          const a = num(sp.w) * num(sp.h);
          sum += Math.max(num(s.f2.minPerSpot), a * num(s.f2.rate) * printSheets * up);
          if (!sp.templateAvailable && a > 0) tpl += Math.max(num(s.templateMin), a * up * num(s.templateRate));
        }
        add(`${spots.length} spot × ${up} naik · ${sides} sisi`, atLeast(s.f2.min, sum * sides));
        if (tpl > 0) add('Template', { cost: tpl, hitMin: false });
      } else {
        const a = num(f.w) * num(f.h);
        add(`${round2(num(f.w))} × ${round2(num(f.h))} × ${up} naik · ${sides} sisi`, atLeast(s.f1.min, a * up * num(s.f1.rate) * printSheets * sides));
        if (f.includeTemplate && a > 0) add(`Klise × ${up}`, atLeast(s.templateMin, a * up * num(s.templateRate)));
      }
      break;
    }
    case 'emboss': {
      add(`${printSheets} lbr`, atLeast(s.min, printSheets * num(s.rate)));
      if (f.includeTemplate) add(`Klise × ${up}`, atLeast(s.templateMin, area * up * num(s.templateRate)));
      break;
    }
    case 'spiral': {
      const t = (s.types || []).find((x) => x.name === f.spiralType) || (s.types || [])[0];
      if (t) add(`${t.name} · ${num(f.long)} cm × ${productQty} set`, atLeast(s.min, num(t.rate) * num(f.long) * productQty));
      break;
    }
    default: break;
  }
  return out;
}

// ── Media offset ───────────────────────────────────────────────────────────

// Bagi desain ke set plat. Satu lembar cetak isi `up` naik, jadi satu set plat bisa memuat
// sampai `up` desain berbeda (ditumpuk). Contoh kalender 13 halaman, 4 naik → 4 set plat.
// Tiap desain dicetak ceil(pcs / desain) kali; desain dalam satu set berbagi naik sama rata.
export function plateSets(designs, up, pcs) {
  const D = Math.max(1, designs), U = Math.max(1, up);
  const n = Math.ceil(D / U);
  const copies = pcs > 0 ? ceil(pcs / D) : 0;
  const out = [];
  for (let i = 0; i < n; i++) {
    const g = Math.floor(D / n) + (i < D % n ? 1 : 0);
    const slots = Math.max(1, Math.floor(U / g));
    out.push({ designs: g, slots, base: copies > 0 ? ceil(copies / slots) : 0 });
  }
  return out;
}

export const mediaCostOf = (r) => r.paperCost + (r.print?.cost || 0) + r.finItems.reduce((s, f) => s + f.cost, 0) + (r.cutting?.cost || 0);

// Hitung tiap pilihan susunan yang muat semua finishing, ambil yang biayanya paling kecil
// (seri → naik lebih banyak).
function cheapestOption(options, media, product, master) {
  let best = null, bestCost = Infinity;
  for (const o of options) {
    if (o.problems.length) continue;
    const r = calcOffsetMedia({ ...media, layoutKey: o.key }, product, master);
    const c = mediaCostOf(r);
    if (c < bestCost - 0.5 || (Math.abs(c - bestCost) <= 0.5 && o.up > best.up)) { best = o; bestCost = c; }
  }
  return best;
}

export function calcOffsetMedia(media, product, master) {
  const paper = master.papers.find((p) => p.id === media.paperId);
  const machine = media.machine ? master.machines.find((m) => m.id === media.machine.machineId) : null;
  const fset = master.finishing;
  const finishings = media.finishings || [];
  const pcs = num(product.qty) * Math.max(1, num(media.perPcs) || 1);
  const bleed = media.machine?.bleed ? num(master.settings.bleed) : 0;
  const w = num(media.w), h = num(media.h);
  const iw = w + 2 * bleed, ih = h + 2 * bleed;
  const warnings = [];

  // 1. susunan di lembar cetak
  let arr;
  let options = [];
  if (machine && iw > 0 && ih > 0) {
    options = layoutOptions(iw, ih, machine).map((o) => ({ ...o, problems: finishingLimits(o.sheetW, o.sheetH, finishings, fset) }));
    const picked = media.layoutKey && options.find((o) => o.key === media.layoutKey);
    if (picked) arr = picked;
    else if (master.settings?.autoLayout === 'reference') arr = referenceLayout(iw, ih, machine, finishings, fset);
    else {
      // otomatis: susunan termurah yang masih muat di semua mesin finishing
      const best = cheapestOption(options, media, product, master);
      arr = best || referenceLayout(iw, ih, machine, finishings, fset);
    }
    if (picked && picked.problems.length) warnings.push(`Lembar ${picked.sheetW} × ${picked.sheetH} terlalu besar untuk ${picked.problems.join(', ')}.`);
    if (iw > num(machine.printW) && iw > num(machine.printH)) warnings.push(`Ukuran ${w} × ${h} lebih besar dari area cetak ${machine.name}.`);
  } else {
    // tanpa mesin: kertas langsung dipotong seukuran hasil jadi
    arr = { up: 1, count: 1, sheetW: iw, sheetH: ih, blocks: [{ x: 0, y: 0, cols: 1, rows: 1, iw, ih, rotated: false }], offsetX: 0, offsetY: 0, usedW: iw, usedH: ih };
  }
  const up = Math.max(1, arr.up || 0);

  // 2. jumlah lembar, per set plat (desain berbeda → plat berbeda)
  const designs = Math.max(1, Math.floor(num(media.designs)) || 1);
  const sets = plateSets(designs, up, pcs).map((st) => {
    const finIns = st.base > 0 ? finishings.reduce((s, f) => s + finishingInsheet(f, fset[f.type], st.base), 0) : 0;
    const print = st.base > 0 ? st.base + finIns : 0;
    const mIns = machine && print > 0 ? Math.max(num(machine.insheetMin), ceil(print * num(machine.insheetPct) / 100)) : 0;
    return { ...st, finIns, print, mIns };
  });
  const sum = (k) => sets.reduce((s, x) => s + x[k], 0);
  const baseSheets = sum('base');
  const finInsheet = sum('finIns');
  const printSheets = sum('print');
  const machineInsheet = sum('mIns');
  const totalSheets = printSheets + machineInsheet;

  // 3. kertas
  const plano = paper && totalSheets > 0 ? choosePlano(paper, arr.sheetW, arr.sheetH, totalSheets) : null;
  if (paper && totalSheets > 0 && !plano) warnings.push(`Lembar ${arr.sheetW} × ${arr.sheetH} tidak muat di ukuran plano ${paper.name} mana pun.`);
  const paperCost = plano ? plano.cost : 0;

  // 4. cetak
  let print = null;
  if (machine && printSheets > 0) {
    const m = media.machine;
    const front = num(m.front), back = m.twoSides ? num(m.back) : 0, special = num(m.special);
    const same = m.twoSides && m.samePlate && back === front;
    const platesPerSet = same ? front + special : front + back + special;
    const plates = platesPerSet * sets.length;
    const plateCost = plates * num(machine.platePrice);
    const minCost = plates * (same ? num(machine.costMinSame) : num(machine.costMin));
    // ongkos minimum berlaku per set plat (tiap ganti plat mulai hitungan baru)
    const extraSheets = sets.reduce((s, st) => s + Math.max(0, st.print - num(machine.minSheets)), 0);
    const colorSides = front + back + special;
    const extraCost = extraSheets * num(machine.costPerSheet) * colorSides;
    print = { plates, platesPerSet, sets: sets.length, plateCost, minCost, extraSheets, extraCost, cost: plateCost + minCost + extraCost, hitMin: extraSheets === 0, same };
  }

  // 5. finishing + potong otomatis
  const ctx = { w, h, pcs, printSheets, up, productQty: num(product.qty) };
  const finItems = finishings.map((f) => calcFinishing(f, fset[f.type], ctx));
  const lam = finishings.find((f) => f.type === 'laminating');
  const lb = lam ? num(fset.laminating?.bleed) : 0;
  const cutArea = (w + 2 * lb) * (h + 2 * lb);
  const gsm = num(paper?.gsm);
  let cutting = null;
  if (machine && printSheets > 0 && fset.cutting) {
    const kg = pcs * cutArea * gsm / 1e7;
    const r = atLeast(fset.cutting.min, kg * num(fset.cutting.rate));
    cutting = { type: 'cutting', label: 'Potong', kg: round2(kg), cost: r.cost, hitMin: r.hitMin, parts: [{ note: `${round2(kg)} kg`, cost: r.cost, hitMin: r.hitMin }] };
  }

  const weightKg = pcs * w * h * gsm / 1e7;

  return {
    id: media.id, paper, machine, pcs, w, h, iw, ih, up, layout: arr, options, designs, sets,
    baseSheets, finInsheet, printSheets, machineInsheet, totalSheets,
    plano, paperCost, print, finItems, cutting, weightKg, warnings,
  };
}

// ── Biaya lain ─────────────────────────────────────────────────────────────

function calcOther(o, def, ctx) {
  if (!def) return null;
  const out = { id: o.id, name: def.name, by: def.by, note: '', cost: 0, hitMin: false };
  let r;
  switch (def.by) {
    case 'weight': r = atLeast(def.min, ctx.weightKg * num(def.rate)); out.note = `${round2(ctx.weightKg)} kg`; break;
    case 'area': r = atLeast(def.min, num(o.w) * num(o.h) * Math.max(1, num(o.multiply) || 1) * num(def.rate)); out.note = `${num(o.w)} × ${num(o.h)} cm × ${Math.max(1, num(o.multiply) || 1)}`; break;
    case 'order': r = { cost: num(def.rate), hitMin: false }; out.note = 'Per order'; break;
    case 'pcs': {
      const per = Math.max(1, num(def.perQty) || 1);
      const packs = ceil(num(ctx.qty) / per);
      r = { cost: packs * num(def.rate), hitMin: false };
      out.note = `${ctx.qty} pcs`;
      break;
    }
    case 'sheet': r = atLeast(def.min, num(o.sheets) * num(def.rate)); out.note = `${num(o.sheets)} lembar`; break;
    default: r = { cost: 0, hitMin: false };
  }
  out.cost = r.cost; out.hitMin = r.hitMin;
  return out;
}

// ── Profit & pajak ─────────────────────────────────────────────────────────

export function applyProfitTax(lines, settings, qty) {
  const pct = num(settings.profitPct) / 100, tax = num(settings.taxPct) / 100;
  const withPT = lines.map((l) => ({
    ...l,
    profit: settings.profitOn?.[l.group] === false ? 0 : l.cost * pct,
    tax: settings.taxOn?.[l.group] === false ? 0 : l.cost * tax,
  }));
  const cost = withPT.reduce((s, l) => s + l.cost, 0);
  const profitRaw = withPT.reduce((s, l) => s + l.profit, 0);
  const profitMin = num(settings.profitMin);
  const profit = cost > 0 ? Math.max(profitRaw, profitMin) : 0;
  const profitAdj = cost > 0 ? Math.max(0, profitMin - profitRaw) : 0;
  const taxTotal = withPT.reduce((s, l) => s + l.tax, 0);
  const total = cost + profit + taxTotal;
  return { lines: withPT, cost, profitRaw, profitAdj, profit, tax: taxTotal, total, perPcs: qty > 0 ? total / qty : 0 };
}

// Hitung setelah nego: customer menawar harga per pcs
export function negotiate(result, bidPerPcs, qty) {
  const totalBid = num(bidPerPcs) * num(qty);
  const profit = totalBid - result.cost - result.tax;
  // harga terendah supaya profit minimum tetap aman
  return { totalBid, profit, safe: profit >= result.profit - 1e-6, minSafePerPcs: qty > 0 ? (result.cost + result.tax + result.profit) / qty : 0 };
}

// ── Produk offset ──────────────────────────────────────────────────────────

export function calcOffset(product, master) {
  const qty = num(product.qty);
  const media = (product.media || []).map((m) => calcOffsetMedia(m, product, master));
  const lines = [];
  media.forEach((m, i) => {
    const tag = product.media.length > 1 ? ` · media ${i + 1}` : '';
    if (m.paper && m.plano) lines.push({ group: 'media', label: `Kertas${tag}`, note: `${m.paper.name} · ${m.plano.planos} plano · ${m.totalSheets} lbr`, cost: m.paperCost, hitMin: false });
    if (m.print) lines.push({ group: 'print', label: `Cetak · ${m.machine.name}${tag}`, note: m.print.sets > 1 ? `${m.print.sets} set × ${m.print.platesPerSet} plat = ${m.print.plates} plat · ${m.printSheets} lbr` : `${m.print.plates} plat · ${m.printSheets} lbr`, cost: m.print.cost, hitMin: m.print.hitMin });
    m.finItems.forEach((f) => lines.push({ group: 'finishing', label: `${f.label}${tag}`, note: f.parts.map((p) => p.note).join(' · '), cost: f.cost, hitMin: f.hitMin }));
    if (m.cutting) lines.push({ group: 'finishing', label: `Potong${tag}`, note: `${m.cutting.kg} kg`, cost: m.cutting.cost, hitMin: m.cutting.hitMin });
  });
  const weightKg = media.reduce((s, m) => s + m.weightKg, 0);
  const others = (product.others || []).map((o) => calcOther(o, master.others.find((d) => d.id === o.otherId), { weightKg, qty })).filter(Boolean);
  others.forEach((o) => lines.push({ group: 'other', label: o.name, note: o.note, cost: o.cost, hitMin: o.hitMin }));
  return { media, others, weightKg, ...applyProfitTax(lines, master.settings, qty) };
}

// ── Produk digital ─────────────────────────────────────────────────────────

export function digitalSheetPrice(priceRow, sheets) {
  if (!priceRow) return 0;
  const tiers = [...(priceRow.tiers || [])].filter((t) => num(t.upTo) > 0).sort((a, b) => num(a.upTo) - num(b.upTo));
  const t = tiers.find((x) => sheets <= num(x.upTo));
  return t ? num(t.price) : num(priceRow.normal);
}

export function calcDigital(product, master) {
  const qty = num(product.qty);
  const lines = [];
  let weightKg = 0;
  const items = (product.items || []).map((it, i) => {
    const machine = master.digitalMachines.find((m) => m.id === it.machineId);
    const paper = master.digitalPapers.find((p) => p.id === it.paperId);
    const pcs = qty * Math.max(1, num(it.perPcs) || 1);
    const bleed = it.bleed ? num(master.settings.bleed) : 0;
    const w = num(it.w), h = num(it.h);
    const iw = w + 2 * bleed, ih = h + 2 * bleed;
    const imp = machine && iw > 0 && ih > 0 ? calcImposition(num(machine.w), num(machine.h), iw, ih, 0, 0, 0, 0, 'best') : { count: 0, blocks: [] };
    const up = imp.count;
    const sheets = up > 0 && pcs > 0 ? ceil(pcs / up) : 0;
    const priceRow = machine?.prices?.find((p) => p.paperId === it.paperId);
    const pricePerSheet = digitalSheetPrice(priceRow, sheets);
    const printCost = sheets * pricePerSheet;
    const tag = (product.items || []).length > 1 ? ` · ${i + 1}` : '';
    const warnings = [];
    if (machine && iw > 0 && up === 0) warnings.push(`Ukuran ${w} × ${h} tidak muat di ${machine.name} (${machine.w} × ${machine.h}).`);
    if (machine && paper && !priceRow) warnings.push(`${machine.name} belum punya harga untuk ${paper.name}.`);
    if (sheets > 0) lines.push({ group: 'print', label: `Cetak digital · ${machine?.name || '-'}${tag}`, note: `${paper?.name || '-'} · ${sheets} lbr × ${Math.round(pricePerSheet).toLocaleString('id-ID')}`, cost: printCost, hitMin: false });
    const ctx = { w, h, pcs, printSheets: sheets, productQty: qty };
    const finItems = (it.finishings || []).map((f) => calcFinishing(f, master.finishing[f.type], ctx));
    finItems.forEach((f) => lines.push({ group: 'finishing', label: `${f.label}${tag}`, note: f.parts.map((p) => p.note).join(' · '), cost: f.cost, hitMin: f.hitMin }));
    weightKg += pcs * w * h * num(paper?.gsm) / 1e7;
    return { id: it.id, machine, paper, pcs, up, sheets, pricePerSheet, printCost, imp, iw, ih, finItems, warnings };
  });
  const others = (product.others || []).map((o) => calcOther(o, master.others.find((d) => d.id === o.otherId), { weightKg, qty })).filter(Boolean);
  others.forEach((o) => lines.push({ group: 'other', label: o.name, note: o.note, cost: o.cost, hitMin: o.hitMin }));
  return { items, others, weightKg, ...applyProfitTax(lines, master.settings, qty) };
}

function round2(n) { return Math.round(n * 100) / 100; }
