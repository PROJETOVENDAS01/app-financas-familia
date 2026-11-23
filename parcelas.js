// Compra parcelada no cartão: o valor informado é o total; cada mês entra uma parcela.
const pad = n => String(n).padStart(2, '0');

// mesma data N meses depois, sem estourar o fim do mês (31 jan + 1 mês = 28 fev)
function somarMeses(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const alvo = new Date(y, m - 1 + n, 1);
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  return `${alvo.getFullYear()}-${pad(alvo.getMonth() + 1)}-${pad(Math.min(d, ultimo))}`;
}

// Devolve os lançamentos: 1 se à vista, N se parcelado (centavos que sobram vão para as primeiras parcelas,
// assim a soma das parcelas é sempre igual ao total). base já traz id, data, valor total etc.
function parcelar(base, parcelas) {
  const n = Math.min(Math.max(Math.trunc(Number(parcelas)) || 1, 1), 48);
  if (n === 1) return [base];
  const centavos = Math.round(base.valor * 100), cada = Math.floor(centavos / n), resto = centavos - cada * n;
  return Array.from({ length: n }, (_, i) => ({
    ...base, id: base.id + i, valor: (cada + (i < resto ? 1 : 0)) / 100, data: somarMeses(base.data, i),
    parcela: i + 1, parcelas: n, compraId: base.id
  }));
}

module.exports = { parcelar, somarMeses };
