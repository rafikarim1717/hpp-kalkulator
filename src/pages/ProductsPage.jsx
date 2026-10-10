// Daftar produk tersimpan (offset atau digital).
import React from 'react';
import { Icon } from '../components/Icon.jsx';
import { Empty } from '../components/ui.jsx';
import { calcDigital, calcOffset } from '../lib/engine.js';
import { fmtNum, fmtRp } from '../lib/format.js';
import { OFFSET_TEMPLATES, productFromTemplate } from '../lib/templates.js';

const ProductsPage = ({ kind, products, master, onOpen, onNew, onFromTemplate, onDuplicate, onDelete }) => {
  const [q, setQ] = React.useState('');
  const [showTpl, setShowTpl] = React.useState(false);
  const list = products.filter((p) => p.kind === kind && (!q || (p.name || '').toLowerCase().includes(q.toLowerCase())));
  const isOffset = kind === 'offset';
  return (
    <div className="page-fade">
      <div className="page-header row-between" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">{isOffset ? 'Offset' : 'Digital'} <em>Printing</em></h1>
          <div className="page-sub">Produk yang sudah dihitung. Klik untuk buka kalkulasinya.</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {isOffset && <button className={`btn ${showTpl ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => setShowTpl(!showTpl)} aria-expanded={showTpl}>Dari template</button>}
          <button className="btn btn-primary" onClick={onNew}><Icon.Plus style={{ width: 14, height: 14 }} /> Produk baru</button>
        </div>
      </div>

      {isOffset && showTpl && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div>
              <div className="section-eyebrow">Template order</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4 }}>Contoh order yang sudah diisi. Pilih satu, lalu ubah angkanya sesuai pesanan.</div>
            </div>
            <button className="btn btn-ghost btn-icon" aria-label="Tutup template" onClick={() => setShowTpl(false)}><Icon.X style={{ width: 14, height: 14 }} /></button>
          </div>
          <div className="tpl-grid">
            {OFFSET_TEMPLATES.map((t) => {
              const r = calcOffset(productFromTemplate(t, master), master);
              return (
                <button key={t.id} className="tpl-card" onClick={() => { setShowTpl(false); onFromTemplate(t); }}>
                  <span className="tpl-name">{t.name}</span>
                  <span className="tpl-desc">{t.desc}</span>
                  <span className="tpl-foot">
                    <span className="row" style={{ gap: 4, flexWrap: 'wrap' }}>{t.tags.map((g) => <span key={g} className="tag tag-neutral">{g}</span>)}</span>
                    <span className="mono" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{fmtRp(r.perPcs)}/pcs</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk…" aria-label="Cari produk" style={{ marginBottom: 18 }} />

      {list.length === 0 ? (
        <Empty title={q ? 'Produk tidak ditemukan' : 'Belum ada produk'} sub={q ? 'Tidak ada yang cocok dengan pencarian.' : undefined} />
      ) : (
        <div className="product-grid">
          {list.map((p) => {
            const r = isOffset ? calcOffset(p, master) : calcDigital(p, master);
            const parts = isOffset ? p.media : p.items;
            const first = parts?.[0];
            const sub = first ? `${fmtNum(first.w, 1)} × ${fmtNum(first.h, 1)} cm · ${parts.length} ${isOffset ? 'media' : 'item'}` : 'Belum diisi';
            return (
              <div key={p.id} className="card product-card" role="button" tabIndex={0}
                onClick={() => onOpen(p.id)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(p.id); }}>
                <div className="row-between">
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{p.name || 'Tanpa nama'}</span>
                  <span className="tag tag-neutral">{fmtNum(p.qty)} pcs</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>
                <div className="row-between" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <span className="mono" style={{ fontSize: 18 }}>{fmtRp(r.total)}</span>
                  <span className="mono" style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{fmtRp(r.perPcs)}/pcs</span>
                </div>
                <div className="row" style={{ marginTop: 10, gap: 4, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-icon" title="Duplikat" aria-label={`Duplikat ${p.name || 'produk'}`} onClick={() => onDuplicate(p.id)}>
                    <Icon.Copy style={{ width: 15, height: 15 }} />
                  </button>
                  <button className="btn btn-ghost btn-icon icon-danger" title="Hapus" aria-label={`Hapus ${p.name || 'produk'}`} onClick={() => { if (window.confirm(`Hapus ${p.name || 'produk ini'}?`)) onDelete(p.id); }}>
                    <Icon.Trash style={{ width: 15, height: 15 }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
