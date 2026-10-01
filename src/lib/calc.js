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

// Imposition: berapa item muat di satu lembar, returns {cols, rows, count, rotated, eff}
export function calcImposition(sheetW, sheetH, itemW, itemH, bleedX, bleedY, gapX, gapY, mode) {
  const ew = sheetW - bleedX * 2;
  const eh = sheetH - bleedY * 2;
  const fit = (iw, ih) => {
    if (ew <= 0 || eh <= 0 || iw <= 0 || ih <= 0) return { cols: 0, rows: 0, count: 0 };
    const cols = Math.max(0, Math.floor((ew + gapX) / (iw + gapX)));
    const rows = Math.max(0, Math.floor((eh + gapY) / (ih + gapY)));
    return { cols, rows, count: cols * rows };
  };
  const r1 = fit(itemW, itemH);
  const r2 = fit(itemH, itemW);
  let best, rotated = false;
  if (mode === 'portrait') best = r1;
  else if (mode === 'landscape') { best = r2; rotated = true; }
  else {
    if (r2.count > r1.count) { best = r2; rotated = true; }
    else best = r1;
  }
  // Efisiensi dihitung terhadap luas lembar penuh (gripper & bleed termasuk waste)
  const eff = best.count > 0 ? (best.count * itemW * itemH) / (sheetW * sheetH) * 100 : 0;
  return { ...best, rotated, eff, ew, eh };
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

  // 7. Finishing, qty otomatis mengikuti basis-nya
  const finItems = (finishings || []).map((f) => {
    const price = parseFloat(f.price) || 0;
    let units, cost;
    if (f.basis === 'flat') { units = 1; cost = price; }
    else if (f.basis === 'per1000lembar') { units = netSheets; cost = price / 1000 * netSheets; }
    else { units = qty; cost = price / 1000 * qty; } // per1000pcs (default)
    return { ...f, units, cost };
  });
  const finTotal = finItems.reduce((s, f) => s + f.cost, 0);

  const other = parseFloat(otherCost) || 0;
  const sub = plateCost + runCost + paperCost + finTotal + other;
  const perPcs = qty > 0 ? sub / qty : 0;

  // 8. Harga jual. markup = % dari HPP, margin = % dari harga jual
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

  return {
    netSheets, wastePctSheets, setupWaste, printSheets, planoSheets,
    passesFront, passesBack, passes, plates, billedPerPass,
    plateCost, runCost, paperCost, finItems, finTotal, otherCost: other,
    sub, perPcs, sell, sellPer, profit, effMarginPct, effMarkupPct,
    ppn, sellIncl, sellInclPer,
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
