// Utilitários de formatação globais

export function fmtData(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
}

export function fmtR(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

export function fmtN(n: number, d = 2) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function fmtKg(n?: number | null, dec = 3) {
  if (n == null || n === 0) return '--';
  return fmtN(n, dec) + ' kg';
}
