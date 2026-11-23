// Cotação do dia para compras em moeda estrangeira (dólar, euro, libra -> real)
const axios = require('axios');

const MOEDAS = ['USD', 'EUR', 'GBP'];
const cache = {};

// Devolve { taxa, quando, fonte } ou null se nenhuma fonte respondeu. Usa a cotação de venda (o que se paga ao comprar).
async function cotar(moeda) {
  if (!MOEDAS.includes(moeda)) return null;
  const guardada = cache[moeda];
  if (guardada && Date.now() - guardada.em < 60000) return guardada.v; // 1 min: várias compras seguidas não repetem a consulta

  let v = null;
  try {
    const r = await axios.get(`https://economia.awesomeapi.com.br/json/last/${moeda}-BRL`, { timeout: 5000 });
    const q = r.data?.[`${moeda}BRL`], taxa = Number(q?.ask);
    if (taxa > 0) v = { taxa, quando: q.create_date, fonte: 'AwesomeAPI' }; // 'AAAA-MM-DD HH:mm:ss'
  } catch (e) { console.warn('⚠️ Cotação AwesomeAPI falhou:', e.message); }
  if (!v) {
    try { // reserva: taxa de referência do Banco Central Europeu (1 por dia útil)
      const r = await axios.get(`https://api.frankfurter.dev/v1/latest?base=${moeda}&symbols=BRL`, { timeout: 5000 });
      const taxa = Number(r.data?.rates?.BRL);
      if (taxa > 0) v = { taxa, quando: r.data.date, fonte: 'Frankfurter (BCE)' };
    } catch (e) { console.warn('⚠️ Cotação Frankfurter falhou:', e.message); }
  }
  if (v) cache[moeda] = { em: Date.now(), v };
  return v;
}

module.exports = { cotar, MOEDAS };
