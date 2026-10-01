// ─────────────────────────────────────────────────────────────────────────────
// Rumus inti Pricelab. Semua ukuran dalam cm, semua harga dalam Rupiah.
//
// Istilah:
//   plano        = lembar kertas utuh dari supplier (mis. 65 × 100 cm)
//   lembar cetak = potongan plano yang masuk mesin (mis. plano dipotong 2 → 65 × 50)
//   pass         = satu kali kertas lewat mesin. Mesin 4 unit warna mencetak
//                  4 warna dalam 1 pass; 5 warna di mesin 4 unit = 2 pass.
// ─────────────────────────────────────────────────────────────────────────────

// Cara potong plano → lembar cetak. cols × rows = jumlah lembar cetak per plano.
export const PLANO_CUTS = [
  { value: 1, cols: 1, rows: 1, label: 'Utuh (1)' },
  { value: 2, cols: 1, rows: 2, label: '½ plano (2)' },
  { value: 3, cols: 1, rows: 3, label: '⅓ plano (3)' },
  { value: 4, cols: 2, rows: 2, label: '¼ plano (4)' },
  { value: 6, cols: 2, rows: 3, label: '⅙ plano (6)' },
  { value: 8, cols: 2, rows: 4, label: '⅛ plano (8)' },
  { value: 9, cols: 3, rows: 3, label: '1/9 plano (9)' },
];

// Ukuran lembar cetak hasil potong plano (tanpa memperhitungkan tebal pisau potong)
export function calcSheetSize(planoW, planoH, cut) {
  const c = PLANO_CUTS.find((x) => x.value === Number(cut)) || PLANO_CUTS[0];
  return { w: round2(planoW / c.cols), h: round2(planoH / c.rows), cut: c.value };
}

// Imposition: berapa item muat di satu lembar.
// mode 'portrait' / 'landscape' = semua item satu arah.
// mode 'best' = coba semua arah + layout campuran (blok item berdiri + sisa ruang diisi item tidur, atau sebaliknya).
// Returns {count, cols, rows, rotated, mixed, blocks, eff, ew, eh}.
// blocks = [{x, y, cols, rows, iw, ih, rotated}] dengan x/y relatif terhadap area cetak (setelah margin).
const EPS = 1e-9;
export function calcImposition(sheetW, sheetH, itemW, itemH, bleedX, bleedY, gapX, gapY, mode) {
  const ew = sheetW - bleedX * 2;
  const eh = sheetH - bleedY * 2;
  const fitN = (len, size, gap) => (len <= 0 || size <= 0 ? 0 : Math.max(0, Math.floor((len + gap) / (size + gap) + EPS)));
  const block = (x, y, w, h, iw, ih, rotated) => {
    const cols = fitN(w, iw, gapX), rows = fitN(h, ih, gapY);
    return { x, y, cols, rows, iw, ih, rotated, count: cols * rows };
  };
  const layout = (blocks) => ({ blocks: blocks.filter((b) => b.count > 0), count: blocks.reduce((s, b) => s + b.count, 0) });

  const P = [itemW, itemH, false]; // berdiri (sesuai input)
  const L = [itemH, itemW, true];  // tidur (diputar 90°)
  const candidates = [];
  if (mode !== 'landscape') candidates.push(layout([block(0, 0, ew, eh, ...P)]));
  if (mode !== 'portrait') candidates.push(layout([block(0, 0, ew, eh, ...L)]));

  if (mode !== 'portrait' && mode !== 'landscape') {
    for (const [A, B] of [[P, L], [L, P]]) {
      const [aw, ah] = A;
      // Belah vertikal: c kolom orientasi A di kiri, sisa lebar diisi orientasi B
      const maxC = fitN(ew, aw, gapX);
      for (let c = 1; c < maxC; c++) {
        const used = c * (aw + gapX);
        candidates.push(layout([block(0, 0, used - gapX, eh, ...A), block(used, 0, ew - used, eh, ...B)]));
      }
      // Belah horizontal: r baris orientasi A di atas, sisa tinggi diisi orientasi B
      const maxR = fitN(eh, ah, gapY);
      for (let r = 1; r < maxR; r++) {
        const used = r * (ah + gapY);
        candidates.push(layout([block(0, 0, ew, used - gapY, ...A), block(0, used, ew, eh - used, ...B)]));
      }
    }
  }

  // Ambil yang paling banyak; kalau seri, pilih yang lebih sederhana (urutan kandidat: satu arah dulu)
  let best = { blocks: [], count: 0 };
  for (const c of candidates) if (c.count > best.count) best = c;

  const main = best.blocks[0] || { cols: 0, rows: 0, rotated: false };
  const mixed = best.blocks.length > 1;
  // Efisiensi dihitung terhadap luas lembar penuh (gripper & bleed termasuk waste)
  const eff = best.count > 0 ? (best.count * itemW * itemH) / (sheetW * sheetH) * 100 : 0;
  return {
    count: best.count, cols: main.cols, rows: main.rows, rotated: !mixed && main.rotated,
    mixed, blocks: best.blocks, eff, ew, eh,
  };
}

// Apakah lembar cetak muat di mesin (boleh diputar 90°)
export function sheetFitsMachine(sheetW, sheetH, tool) {
  const fitsMax = (sheetW <= tool.maxw && sheetH <= tool.maxh) || (sheetW <= tool.maxh && sheetH <= tool.maxw);
  const fitsMin = (sheetW >= tool.minw && sheetH >= tool.minh) || (sheetW >= tool.minh && sheetH >= tool.minw);
  return { fitsMax, fitsMin, ok: fitsMax && fitsMin };
}

// HPP calc
export function calcHPP(input) {
  const {
    type = 'single', qty = 0, pages = 0,
    pcsPerSheet = 0, planoCut = 1,
    wastePct = 0, setupSheets = 0,
    colorsFront = 4, colorsBack = 0, maxColor = 4,
    runRate = 0, platePrice = 0, minRun = 0,
    paperPrice = 0, sheetsPerPack = 500,
    finishings = [], otherCost = 0,
    pricingMode = 'markup', marginPct = 0, ppnPct = 0,
  } = input;

  const isBook = type === 'book';
  const sides = colorsBack > 0 ? 2 : 1;
  const unit = Math.max(1, maxColor || 1);

  // 1. Lembar cetak bersih (belum termasuk rusak/setting)
  let netSheets = 0;
  if (pcsPerSheet > 0 && qty > 0) {
    if (isBook) {
      // 1 lembar cetak memuat pcsPerSheet halaman per sisi
      const sheetsPerCopy = pages / (pcsPerSheet * sides);
      netSheets = Math.ceil(qty * sheetsPerCopy);
    } else {
      netSheets = Math.ceil(qty / pcsPerSheet);
    }
  }

  // 2. Jumlah pass mesin
  const passesFront = Math.ceil(colorsFront / unit);
  const passesBack = colorsBack > 0 ? Math.ceil(colorsBack / unit) : 0;
  const passes = netSheets > 0 ? passesFront + passesBack : 0;

  // 3. Waste: % rusak + lembar setting (inschiet) per pass
  const wastePctSheets = Math.ceil(netSheets * wastePct / 100);
  const setupWaste = setupSheets * passes;
  const printSheets = netSheets > 0 ? netSheets + wastePctSheets + setupWaste : 0;

  // 4. Kertas dibeli dalam satuan plano
  const planoSheets = Math.ceil(printSheets / Math.max(1, planoCut));
  const paperCost = (planoSheets / Math.max(1, sheetsPerPack)) * paperPrice;

  // 5. Plat: 1 plat per warna per sisi
  const plates = netSheets > 0 ? colorsFront + colorsBack : 0;
  const plateCost = plates * platePrice;

  // 6. Ongkos cetak: per 1000 lembar per pass, minimal minRun lembar per pass
  const billedPerPass = printSheets > 0 ? Math.max(printSheets, minRun) : 0;
  const runCost = passes * (billedPerPass / 1000) * runRate;

  // 7. Finishing, qty otomatis mengikuti basis-nya. sides = 2 untuk finishing 2 sisi (mis. laminasi bolak-balik)
  const finItems = (finishings || []).map((f) => {
    const price = parseFloat(f.price) || 0;
    const fSides = f.basis === 'flat' ? 1 : (Number(f.sides) === 2 ? 2 : 1);
    let units;
    if (f.basis === 'flat') units = 1;
    else if (f.basis === 'per1000lembar') units = netSheets;
    else units = qty; // per1000pcs (default)
    const cost = f.basis === 'flat' ? price : price / 1000 * units * fSides;
    return { ...f, units, sides: fSides, cost };
  });
  const finTotal = finItems.reduce((s, f) => s + f.cost, 0);

  const other = parseFloat(otherCost) || 0;
  const sub = plateCost + runCost + paperCost + finTotal + other;
  const perPcs = qty > 0 ? sub / qty : 0;

  return {
    netSheets, wastePctSheets, setupWaste, printSheets, planoSheets,
    passesFront, passesBack, passes, plates, billedPerPass,
    plateCost, runCost, paperCost, finItems, finTotal, otherCost: other,
    sub, perPcs,
    ...applyPricing(sub, qty, { pricingMode, marginPct, ppnPct }),
  };
}

// Harga jual. markup = % dari HPP, margin = % dari harga jual
export function applyPricing(sub, qty, { pricingMode = 'markup', marginPct = 0, ppnPct = 0 } = {}) {
  const m = (marginPct || 0) / 100;
  let sell;
  if (pricingMode === 'margin') sell = m < 1 ? sub / (1 - m) : NaN;
  else sell = sub * (1 + m);
  const profit = sell - sub;
  const effMarginPct = sell > 0 ? profit / sell * 100 : 0;
  const effMarkupPct = sub > 0 ? profit / sub * 100 : 0;
  const sellPer = qty > 0 ? sell / qty : 0;
  const ppn = sell * (ppnPct || 0) / 100;
  const sellIncl = sell + ppn;
  const sellInclPer = qty > 0 ? sellIncl / qty : 0;
  return { sell, sellPer, profit, effMarginPct, effMarkupPct, ppn, sellIncl, sellInclPer };
}

// Qty cetak sebuah komponen = jumlah produk jadi × jumlah komponen per produk
export const componentQty = (jobQty, comp) => (jobQty || 0) * (Number(comp.perProduct) > 0 ? Number(comp.perProduct) : 1);

// Produk multi-komponen (mis. buku = isi + cover, kalender = lembar bulan + alas).
// job = { qty, components: [componentInput], jobFinishings, otherCost, pricingMode, marginPct, ppnPct }
// Tiap komponen dihitung dengan calcHPP (tanpa margin), lalu dijumlah + finishing produk jadi + biaya lain.
export function calcJob(job) {
  const qty = job.qty || 0;
  const components = (job.components || []).map((c) => {
    const cQty = componentQty(qty, c);
    const result = calcHPP({ ...c, qty: cQty, otherCost: 0, marginPct: 0, ppnPct: 0 });
    return { id: c.id, name: c.name, qty: cQty, result };
  });
  const productionSub = components.reduce((s, c) => s + c.result.sub, 0);

  // Finishing produk jadi (jilid, ring, rakit): per 1000 produk atau flat
  const jobFinItems = (job.jobFinishings || []).map((f) => {
    const price = parseFloat(f.price) || 0;
    const cost = f.basis === 'flat' ? price : price / 1000 * qty;
    return { ...f, units: f.basis === 'flat' ? 1 : qty, cost };
  });
  const jobFinTotal = jobFinItems.reduce((s, f) => s + f.cost, 0);
  const otherCost = parseFloat(job.otherCost) || 0;

  const sub = productionSub + jobFinTotal + otherCost;
  const perPcs = qty > 0 ? sub / qty : 0;
  return {
    components, productionSub, jobFinItems, jobFinTotal, otherCost, sub, perPcs,
    ...applyPricing(sub, qty, job),
  };
}

// Peringatan untuk kombinasi input yang tidak masuk akal
export function validateJob(input, tool) {
  const w = [];
  const { type, qty, pages, pcsPerSheet, colorsFront, colorsBack, maxColor, sheetW, sheetH,
    pricingMode, marginPct, planoW, planoH } = input;
  if (!(qty > 0)) w.push('Jumlah order masih 0.');
  if (!(pcsPerSheet > 0)) w.push('Pcs per lembar cetak masih 0 — hitung dulu di Plano & Imposition.');
  if (type === 'book') {
    if (!(pages > 0)) w.push('Jumlah halaman masih 0.');
    else if (pages % 4 !== 0) w.push(`Jumlah halaman ${pages} bukan kelipatan 4 — buku jilid biasanya kelipatan 4.`);
  }
  if (tool) {
    if (colorsFront > maxColor || colorsBack > maxColor) {
      w.push(`Mesin ${tool.name} cuma ${maxColor} unit warna — cetak dilakukan lebih dari 1 pass (ongkos cetak & waste setting ikut naik).`);
    }
    if (sheetW > 0 && sheetH > 0) {
      const fit = sheetFitsMachine(sheetW, sheetH, tool);
      if (!fit.fitsMax) w.push(`Lembar cetak ${sheetW} × ${sheetH} cm terlalu besar untuk ${tool.name} (maks ${tool.maxw} × ${tool.maxh} cm). Potong plano lebih kecil.`);
      if (!fit.fitsMin) w.push(`Lembar cetak ${sheetW} × ${sheetH} cm terlalu kecil untuk ${tool.name} (min ${tool.minw} × ${tool.minh} cm).`);
    }
  }
  if (input.paper && planoW > 0 && planoH > 0) {
    const p = input.paper;
    const same = (p.lebar === planoW && p.tinggi === planoH) || (p.lebar === planoH && p.tinggi === planoW);
    if (!same) w.push(`Ukuran plano di layout (${planoW} × ${planoH}) beda dengan kertas ${p.name} (${p.lebar} × ${p.tinggi}).`);
  }
  if (pricingMode === 'margin' && marginPct >= 100) w.push('Margin harus di bawah 100% dari harga jual.');
  return w;
}

function round2(n) { return Math.round(n * 100) / 100; }
