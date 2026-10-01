export const fmtRp = (n) => {
  if (!Number.isFinite(n)) n = 0;
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
};

export const fmtNum = (n, d = 0) => {
  if (!Number.isFinite(n)) n = 0;
  return n.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
};
