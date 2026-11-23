import { addMes } from './util.js';

// Projeção dos próximos meses: contas fixas ativas + parcelas/lançamentos já agendados + (opcional) a média dos gastos do dia a dia.
// A fatura do cartão fica de fora para não contar duas vezes (as compras do cartão já entram pelas parcelas e fixas).
// taxas: { USD: 5.9 } para as contas em moeda estrangeira; sem cotação a conta entra com 0.
export function projetar({ transacoes, fixos, taxas = {}, de, n = 6, mediaDia = true }) {
  const reais = f => (f.moeda ? f.valor * (taxas[f.moeda] || 0) : f.valor);
  const ativas = fixos.filter(f => f.ativo && !f.fatura);
  const fixasD = ativas.filter(f => f.tipo === 'despesa').reduce((s, f) => s + reais(f), 0);
  const fixasR = ativas.filter(f => f.tipo === 'receita').reduce((s, f) => s + reais(f), 0);

  // média do dia a dia: últimos 3 meses fechados, só o que não é conta fixa, fatura nem parcela
  const base = [1, 2, 3].map(i => addMes(de, -i)); // os 3 meses anteriores a "de" (o mês atual, ainda em andamento, não entra)
  const dia = transacoes.filter(t => t.tipo === 'despesa' && !t.fatura && t.origem !== 'fixo' && !(t.parcelas > 1) && !t.fixoId);
  const comDados = base.filter(m => transacoes.some(t => t.data.startsWith(m)));
  const media = mediaDia && comDados.length ? dia.filter(t => comDados.some(m => t.data.startsWith(m))).reduce((s, t) => s + t.valor, 0) / comDados.length : 0;

  const meses = [];
  for (let i = 1; i <= n; i++) {
    const ym = addMes(de, i);
    const agendadas = transacoes.filter(t => t.data.startsWith(ym) && !t.fatura && t.origem !== 'fixo');
    const parcelas = agendadas.filter(t => t.tipo === 'despesa' && t.parcelas > 1).reduce((s, t) => s + t.valor, 0);
    const outrosD = agendadas.filter(t => t.tipo === 'despesa' && !(t.parcelas > 1)).reduce((s, t) => s + t.valor, 0);
    const outrosR = agendadas.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
    const despesas = fixasD + parcelas + outrosD + media, receitas = fixasR + outrosR;
    meses.push({ ym, fixas: fixasD, parcelas, outros: outrosD, media, despesas, receitas, sobra: receitas - despesas });
  }
  return meses;
}
