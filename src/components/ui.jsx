// Reusable UI primitives
import React from 'react';

export const Field = ({ label, hint, suffix, error, children, ...rest }) => (
  <div className={`field${error ? ' field-invalid' : ''}`} {...rest}>
    {label && <label className="field-label">{label}</label>}
    {suffix ? (
      <div className="field-with-suffix">
        {children}
        <span className="field-suffix">{suffix}</span>
      </div>
    ) : children}
    {error ? <div className="field-error" role="alert">{error}</div> : hint && <div className="field-hint">{hint}</div>}
  </div>
);

// Input angka yang boleh dikosongkan saat mengetik. Kosong dianggap 0 untuk hitungan,
// tapi tampilannya tetap kosong (tidak berubah jadi "0" lalu "01000").
export const NumInput = ({ value, onChange, ...rest }) => {
  const [text, setText] = React.useState(value == null ? '' : String(value));
  React.useEffect(() => {
    const n = Number(text);
    const pending = text === '' || text === '-' || Number.isNaN(n);
    if (!pending && n !== value) setText(value == null ? '' : String(value));
    if (pending && value !== 0 && value != null) setText(String(value));
  }, [value]);
  return (
    <input type="number" {...rest} value={text}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        const n = Number(t);
        onChange(t === '' || Number.isNaN(n) ? 0 : n);
      }} />
  );
};

export const Card = ({ title, eyebrow, action, children, style }) => (
  <div className="card" style={style}>
    {(title || eyebrow || action) && (
      <div className="row-between" style={{ marginBottom: 16 }}>
        <div>
          {eyebrow && <div className="section-eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div>}
          {title && <div style={{ fontFamily: 'var(--serif)', fontSize: 18, letterSpacing: '-0.01em', color: 'var(--text)' }}>{title}</div>}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

export const StatCard = ({ label, value, sub, tone = 'default', children }) => (
  <div className="stat-card">
    <div className="stat-label">{label}</div>
    <div className={`stat-value ${tone === 'accent' ? 'accent' : tone === 'good' ? 'good' : tone === 'bad' ? 'bad' : ''}`}>{value}</div>
    {sub && <div className="stat-sub">{sub}</div>}
    {children}
  </div>
);

export const Seg = ({ value, onChange, options }) => (
  <div className="seg">
    {options.map((o) => (
      <div
        key={o.value}
        className={`seg-btn ${value === o.value ? 'active' : ''}`}
        onClick={() => onChange(o.value)}
      >{o.label}</div>
    ))}
  </div>
);

export const Modal = ({ open, onClose, title, children, footer }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export const Empty = ({ title, sub, action }) => (
  <div className="empty card" style={{ background: 'var(--surface)' }}>
    <div className="empty-title">{title}</div>
    {sub && <div style={{ marginBottom: 16 }}>{sub}</div>}
    {action}
  </div>
);
