# Pricelab — HPP Calculator

Kalkulator HPP (Harga Pokok Produksi) untuk percetakan offset. React 18 + Vite, tanpa backend — semua data disimpan di `localStorage` browser.

## Menjalankan

```bash
npm install
npm run dev       # dev server di http://localhost:5173
npm run build     # build production ke folder dist/
npm run preview   # preview hasil build
npm test          # unit test rumus (Vitest)
```

**Cara pakai & contoh hitungan lengkap: [docs/TUTORIAL.md](docs/TUTORIAL.md)**

Login demo: `demo` / `demo123` (cuma cek di sisi browser, bukan autentikasi beneran).

## Struktur

```
src/
  main.jsx               entry point
  App.jsx                layout, navigasi, state global, panel Tampilan
  components/
    ui.jsx               Field, Card, StatCard, Seg, Modal, Empty
    Icon.jsx             ikon SVG
    Login.jsx
    TweaksPanel.jsx      panel Tampilan (tema, aksen, density, font)
  pages/
    PlanoPage.jsx        Plano & Imposition
    HppPage.jsx          Hitung HPP
    ToolsPage.jsx        Master Mesin
    MaterialsPage.jsx    Master Material
    HistoryPage.jsx      Histori kalkulasi
  lib/
    calc.js              rumus potong plano, imposition, HPP, validasi
    calc.test.js         unit test (angka contoh tutorial dikunci di sini)
    constants.js         data default, preset, migrasi data lama
    format.js            format Rupiah / angka
  hooks/
    useLocalState.js     useState + localStorage
  styles/                app.css, fonts.css, tweaks.css
  assets/fonts/          font self-hosted (woff2)
docs/
  TUTORIAL.md            panduan pakai + contoh hitungan
legacy/
  pricelab-bundle.html   file bundle asli (single HTML) sebelum di-refactor
```

## Key localStorage

`pl_user`, `pl_page`, `pl_tools`, `pl_materials`, `pl_history`, `pl_plano`, `pl_hpp`, `pl_tweaks`
