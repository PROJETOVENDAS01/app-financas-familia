export const CATS = [
  { n: 'Moradia', e: '🏠', c: '#5b6b8a', sub: ['Aluguel', 'Condomínio', 'Luz', 'Água', 'Gás', 'Internet', 'Reparos'] },
  { n: 'Alimentação', e: '🍽️', c: '#f59e0b', sub: ['Supermercado', 'Restaurante', 'Padaria', 'Delivery', 'Café'] },
  { n: 'Transporte', e: '🚗', c: '#3b82f6', sub: ['Combustível', 'Uber/Táxi', 'Ônibus', 'Manutenção', 'Estacionamento'] },
  { n: 'Saúde', e: '💊', c: '#8b5cf6', sub: ['Farmácia', 'Consulta', 'Exame', 'Dentista', 'Fisioterapia'] },
  { n: 'Entretenimento', e: '🎬', c: '#ec4899', sub: ['Cinema', 'Streaming', 'Eventos', 'Passeios', 'Hobbies'] },
  { n: 'Utilidades', e: '💡', c: '#14b8a6', sub: ['Supermercado', 'Farmácia', 'Casa', 'Limpeza'] },
  { n: 'Renda', e: '💼', c: '#10b981', sub: ['Salário', 'Freelance', 'Bônus', 'Outros'] }
];
export const DESPESAS = CATS.filter(c => c.n !== 'Renda');
export const catInfo = n => CATS.find(c => c.n === n) || { n, e: '🏷️', c: '#94a3b8', sub: [] };

const fmt = (o) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', ...o });
export const brl = v => fmt().format(Number(v) || 0);
export const brl0 = v => fmt({ maximumFractionDigits: 0 }).format(Number(v) || 0);

export const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const mesAtual = () => hoje().slice(0, 7);
export const addMes = (ym, n) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
export const diasNoMes = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
export const mesLabel = ym => {
  const [y, m] = ym.split('-').map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const dataCurta = iso => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
};
// mesma data N meses depois, sem estourar o fim do mês (31 jan + 1 mês = 28 fev)
export const mesmaDataEm = (iso, n) => {
  const ym = addMes(iso.slice(0, 7), n);
  const dia = Math.min(Number(iso.slice(8, 10)), diasNoMes(ym));
  return `${ym}-${String(dia).padStart(2, '0')}`;
};
export const soma = (lista, f = t => t.valor) => lista.reduce((a, t) => a + f(t), 0);
const CORES = ['#2f6bff', '#e5484d', '#0e9f6e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
export const corMembro = nome => CORES[[...nome].reduce((a, c) => a + c.charCodeAt(0), 0) % CORES.length];
export const memo = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
