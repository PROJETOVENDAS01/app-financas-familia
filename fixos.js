// Contas fixas mensais (despesas e receitas): geram o lançamento de cada mês
// e avisam no WhatsApp, no dia do vencimento, o que pagar e quanto.
const { cotar, MOEDAS } = require('./cotacao');
const FUSO = 'America/Sao_Paulo';
const r2 = n => Math.round(n * 100) / 100;
const SIMBOLO = { USD: 'US$', EUR: '€', GBP: '£' };
const num2 = n => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const agoraSP = (d = new Date()) => d.toLocaleString('sv-SE', { timeZone: FUSO }); // 'AAAA-MM-DD HH:mm:ss'
const diasNoMes = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const dataDoMes = (ym, dia) => `${ym}-${String(Math.min(dia, diasNoMes(ym))).padStart(2, '0')}`; // dia 31 em fevereiro vira 28/29
const brl = n => 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Só aceita os campos conhecidos e valida; devolve null se inválido
function limparFixo(b) {
  const valor = Number(b.valor), dia = Math.trunc(Number(b.dia));
  const descricao = String(b.descricao || '').trim().slice(0, 100);
  if (!['despesa', 'receita'].includes(b.tipo) || !(valor > 0) || !(dia >= 1 && dia <= 31) || !descricao) return null;
  const fatura = b.tipo === 'despesa' && !!b.fatura; // pagamento da fatura do cartão: avisa e registra, mas não conta como gasto novo
  const fechamento = fatura && Number.isInteger(Number(b.fechamento)) && b.fechamento >= 1 && b.fechamento <= 31 ? Number(b.fechamento) : null; // dia em que a fatura fecha (opcional; sem ele, 7 dias antes do vencimento)
  const moeda = !fatura && MOEDAS.includes(b.moeda) ? b.moeda : null; // conta em dólar/euro/libra: "valor" fica na moeda e o real é calculado pela cotação
  return {
    tipo: b.tipo, valor, dia, descricao,
    categoria: fatura ? 'Fatura do cartão' : String(b.categoria || (b.tipo === 'receita' ? 'Renda' : 'Outros')).slice(0, 50),
    subcategoria: fatura ? '' : String(b.subcategoria || '').slice(0, 50),
    membro: String(b.membro || 'Família').slice(0, 50),
    avisar: b.tipo === 'despesa' && b.avisar !== false,
    variavel: fatura || (b.tipo === 'despesa' && (!!b.variavel || !!moeda)), // valor muda todo mês: o valor da conta é só uma estimativa, confirmada no dia
    moeda,
    cartao: b.tipo === 'despesa' && !fatura && !!b.cartao, // conta paga no cartão de crédito: entra nos gastos do cartão
    fatura,
    fechamento,
    ativo: b.ativo !== false
  };
}

// Cria, em obj, o lançamento do mês de cada conta ativa que ainda não gerou esse mês. Devolve true se mudou algo.
// Usa f.meses (e não a existência do lançamento) para não recriar o que a família apagou de propósito.
// taxas: { USD: { taxa, quando } } já buscadas (ver taxasDe); conta em moeda estrangeira sem cotação espera o próximo ciclo.
function gerarFixosDoMes(obj, mes, taxas = {}) {
  let id = Date.now(), mudou = false;
  for (const f of obj.fixos || []) {
    f.meses = f.meses || [];
    if (!f.ativo || f.meses.includes(mes)) continue;
    const q = f.moeda ? taxas[f.moeda] : null;
    if (f.moeda && !q) continue;
    obj.transacoes.push({ id: id++, tipo: f.tipo, data: dataDoMes(mes, f.dia), valor: q ? r2(f.valor * q.taxa) : f.valor, ...(q ? { moeda: f.moeda, valorOriginal: f.valor, cotacao: q.taxa } : {}), categoria: f.categoria, subcategoria: f.subcategoria, descricao: f.descricao, membro: f.membro, cartao: !!f.cartao, origem: 'fixo', fixoId: f.id, ...(f.variavel ? { variavel: true, confirmado: false } : {}), ...(f.fatura ? { fatura: true } : {}) });
    f.meses = [...f.meses, mes].slice(-24);
    mudou = true;
  }
  return mudou;
}

// Editou a conta: atualiza os lançamentos dela do mês atual em diante (meses passados ficam como estavam)
function aplicarEdicao(obj, f, mesAtual, taxas = {}) {
  for (const t of obj.transacoes) {
    if (t.fixoId !== f.id || t.data.slice(0, 7) < mesAtual) continue;
    const jaConfirmado = t.variavel && t.confirmado; // valor real já confirmado: a edição da estimativa não mexe nele
    Object.assign(t, { tipo: f.tipo, categoria: f.categoria, subcategoria: f.subcategoria, descricao: f.descricao, membro: f.membro, cartao: !!f.cartao, data: dataDoMes(t.data.slice(0, 7), f.dia) });
    if (!jaConfirmado) {
      const q = f.moeda ? taxas[f.moeda] : null;
      if (q) Object.assign(t, { valor: r2(f.valor * q.taxa), moeda: f.moeda, valorOriginal: f.valor, cotacao: q.taxa });
      else if (!f.moeda) { t.valor = f.valor; delete t.moeda; delete t.valorOriginal; delete t.cotacao; } // sem cotação agora: mantém o valor em reais que já estava
    }
    if (f.fatura) t.fatura = true; else delete t.fatura;
    if (f.variavel) t.variavel = true; else { delete t.variavel; delete t.confirmado; delete t.aguardandoValor; }
  }
}

const addMes = (ym, n) => { const [y, m] = ym.split('-').map(Number), d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const ddmm = iso => `${iso.slice(8)}/${iso.slice(5, 7)}`;
const diaSeguinte = iso => new Date(new Date(`${iso}T12:00:00Z`).getTime() + 864e5).toISOString().slice(0, 10);

// Ciclo de uma fatura que vence em mesVenc: compras do cartão entre o fechamento anterior (exclusive) e o desta fatura (inclusive).
// f.dia = vencimento; f.fechamento = dia do fechamento (sem ele: 7 dias antes do vencimento). Parcelas contam na data de cada uma.
function cicloFatura(f, mesVenc, transacoes) {
  const fech = f.fechamento || ((f.dia - 8 + 31) % 31) + 1;
  const mesFech = fech < f.dia ? mesVenc : addMes(mesVenc, -1); // fechamento depois do dia do vencimento = no mês anterior
  const ate = dataDoMes(mesFech, fech), anterior = dataDoMes(addMes(mesFech, -1), fech);
  const itens = transacoes.filter(t => t.cartao && t.tipo === 'despesa' && !t.fatura && t.data > anterior && t.data <= ate);
  return { de: diaSeguinte(anterior), ate, total: r2(itens.reduce((s, t) => s + t.valor, 0)), qtd: itens.length };
}

// Apagou a conta: remove os lançamentos dela do mês atual em diante (mesmo os que já venceram neste mês);
// meses anteriores ficam como histórico
function removerGerados(obj, fixoId, mesAtual) {
  obj.transacoes = obj.transacoes.filter(t => !(t.fixoId === fixoId && t.data.slice(0, 7) >= mesAtual));
}

// Lançamentos de uma conta fixa que já foi excluída (do mês atual em diante): sobras de quando a exclusão deixava o mês para trás
function limparOrfas(obj, mesAtual) {
  const ids = new Set((obj.fixos || []).map(f => f.id)), antes = obj.transacoes.length;
  obj.transacoes = obj.transacoes.filter(t => !(t.fixoId && !ids.has(t.fixoId) && t.data.slice(0, 7) >= mesAtual));
  return obj.transacoes.length !== antes;
}

module.exports = function criarFixos({ ler, gravar, enviarWhatsApp, membrosWhatsapp, allowed, botNumber, horaAviso = 8 }) {
  const mesAtual = () => agoraSP().slice(0, 7);

  // Quem recebe o aviso: o dono da conta; se for "Família" ou sem número cadastrado, todos
  const destinatarios = membro => {
    const donos = Object.keys(membrosWhatsapp).filter(n => membrosWhatsapp[n] === membro);
    if (donos.length) return donos;
    const todos = Object.keys(membrosWhatsapp);
    return todos.length ? todos : allowed.filter(n => n !== botNumber);
  };

  const mensagem = itens => {
    const certas = itens.filter(t => !t.variavel), mudam = itens.filter(t => t.variavel);
    const linha = t => `• ${t.descricao} — ${brl(t.valor)}`;
    return [
      '🔔 *Contas para pagar hoje*',
      certas.length && certas.map(linha).join('\n'),
      mudam.length && `💡 *Confirme o valor:*\n${mudam.map(t => t.ciclo ? `• ${t.descricao} — estimado ${brl(t.valor)} · compras registradas no ciclo (${ddmm(t.ciclo.de)} a ${ddmm(t.ciclo.ate)}): ${brl(t.ciclo.total)}` : t.moeda && t.valorOriginal ?`• ${t.descricao} — ${SIMBOLO[t.moeda]} ${num2(t.valorOriginal)} ≈ ${brl(t.valor)} (cotação de hoje)` : `• ${t.descricao} — estimado ${brl(t.valor)}`).join('\n')}\n\nResponda o valor real (ex.: "${mudam[0].descricao.toLowerCase()} 187,40") ou *ok* para manter o estimado.`,
      `💰 Total${mudam.length ? ' (com estimados)' : ''}: ${brl(itens.reduce((s, t) => s + t.valor, 0))}`
    ].filter(Boolean).join('\n\n');
  };

  const ha45Dias = () => agoraSP(new Date(Date.now() - 45 * 864e5)).slice(0, 10);
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const parseValor = s => { // "1.234,56" / "187,4" / "R$ 187" -> número
    const m = s.match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:[.,](\d{1,2}))?/);
    return m ? Number(`${m[1].replace(/\./g, '')}.${m[2] || '0'}`) : null;
  };

  // Resposta ao pedido de confirmação de valor ("luz 187,40", "187,40" ou "ok"). Devolve o texto a enviar, ou null se a mensagem não é sobre isso.
  function responderValor(texto) {
    const obj = ler();
    const limite = ha45Dias();
    const t0 = norm(texto).trim();

    // Diferença entre a fatura paga e as compras registradas: sim lança como gasto do cartão sem detalhe; não descarta
    const pc = obj.conciliacao;
    if (pc && Date.now() - new Date(pc.criada).getTime() < 30 * 60000) {
      if (/^(sim|s|lancar)\b/.test(t0)) {
        obj.transacoes.push({ id: Date.now(), tipo: 'despesa', data: pc.data, valor: pc.valor, categoria: 'Outros', subcategoria: '', descricao: 'Compras do cartão sem registro', membro: pc.membro, cartao: true, origem: 'conciliacao' });
        delete obj.conciliacao; gravar(obj);
        return `✅ Lancei ${brl(pc.valor)} como gasto do cartão sem detalhe (${ddmm(pc.data)}). Assim o mês fica com o gasto real.`;
      }
      if (/^(nao|n)\b/.test(t0)) { delete obj.conciliacao; gravar(obj); return 'Ok, não lancei a diferença.'; }
    }

    const aguardando = obj.transacoes.filter(t => t.aguardandoValor && !t.confirmado && t.data >= limite);
    if (!aguardando.length) return null;
    const confirmar = (lista, valor) => {
      const extras = [];
      const linhas = lista.map(t => {
        const antes = t.valor, novo = valor ?? t.valor;
        t.valor = novo; t.confirmado = true; t.aguardandoValor = false;
        const f = (obj.fixos || []).find(x => x.id === t.fixoId);
        if (f?.variavel && !f.moeda) f.valor = novo; // o próximo mês já começa estimando este valor (conta em moeda estrangeira segue estimada pela cotação)
        if (t.fatura && f) { // concilia: o que foi pago x o que foi registrado no ciclo
          const c = cicloFatura(f, t.data.slice(0, 7), obj.transacoes), dif = r2(novo - c.total);
          extras.push(`💳 Compras registradas no ciclo (${ddmm(c.de)} a ${ddmm(c.ate)}): ${brl(c.total)}`);
          if (dif >= 1) {
            obj.conciliacao = { valor: dif, data: c.ate, membro: t.membro, criada: new Date().toISOString() };
            extras.push(`Sobram ${brl(dif)} sem registro (compras antigas, juros...). Quer lançar como gasto do cartão sem detalhe? Responda *sim*.`);
          } else if (dif <= -1) extras.push(`Você registrou ${brl(-dif)} a mais do que pagou: vale conferir as compras desse ciclo.`);
          else extras.push('Bate com o que você registrou. ✅');
        }
        return `✅ ${t.descricao}: ${brl(novo)}${valor != null && antes !== novo ? ` (estava ${brl(antes)})` : ''}`;
      });
      gravar(obj);
      return `${linhas.join('\n')}${extras.length ? `\n\n${extras.join('\n')}` : ''}\n\nJá está registrado. É só pagar! 💸`;
    };

    if (/^(ok|okay|mantem|manter|confirmo|confirmado|certo|isso mesmo|pode manter)\b/.test(t0)) return confirmar(aguardando);

    const valor = parseValor(texto);
    if (!(valor > 0)) return null;
    const citadas = aguardando.filter(t => norm(t.descricao).split(/\s+/).some(p => p.length >= 3 && new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t0)));
    if (citadas.length === 1) return confirmar(citadas, valor);
    if (citadas.length > 1) return `Qual conta? ${citadas.map(t => t.descricao).join(' ou ')}. Ex.: "${citadas[0].descricao.toLowerCase()} ${String(valor).replace('.', ',')}".`;
    if (aguardando.length === 1 && /^(r\$\s*)?[\d.,]+\s*(reais)?$/.test(t0)) return confirmar(aguardando, valor); // só o número, com uma única conta esperando
    if (aguardando.length > 1 && /^(r\$\s*)?[\d.,]+\s*(reais)?$/.test(t0)) return `Qual conta? ${aguardando.map(t => t.descricao).join(' ou ')}. Ex.: "${aguardando[0].descricao.toLowerCase()} ${String(valor).replace('.', ',')}".`;
    return null; // outra coisa (ex.: "gasto 50 pão"): segue o fluxo normal
  }

  // Manda, uma vez por dia (depois de horaAviso), as contas que vencem hoje. Devolve quantas mensagens foram enviadas.
  async function avisarVencimentos(agora = new Date()) {
    const [hoje, hora] = agoraSP(agora).split(' ');
    if (Number(hora.slice(0, 2)) < horaAviso) return 0;
    const obj = ler();
    const jaAvisados = obj.avisos?.data === hoje ? obj.avisos.ids : [];
    const fixos = new Map((obj.fixos || []).map(f => [f.id, f]));
    const pend = obj.transacoes.filter(t => t.fixoId && t.tipo === 'despesa' && t.data === hoje && fixos.get(t.fixoId)?.avisar && !jaAvisados.includes(t.id));
    if (!pend.length) return 0;
    for (const t of pend) if (t.fatura) t.ciclo = cicloFatura(fixos.get(t.fixoId), t.data.slice(0, 7), obj.transacoes); // soma das compras do cartão, como referência

    // conta em moeda estrangeira: refaz a conta com a cotação de hoje antes de avisar
    const taxas = await taxasDe(pend.filter(t => t.moeda && t.variavel && !t.confirmado).map(t => t.moeda));
    const atualizados = new Map();
    for (const t of pend) {
      const q = t.moeda && !t.confirmado ? taxas[t.moeda] : null;
      if (q && t.valorOriginal) { t.valor = r2(t.valorOriginal * q.taxa); t.cotacao = q.taxa; atualizados.set(t.id, { valor: t.valor, cotacao: t.cotacao }); }
    }

    const porNumero = new Map();
    for (const t of pend) for (const n of destinatarios(t.membro)) porNumero.set(n, [...(porNumero.get(n) || []), t]);
    let enviados = 0;
    for (const [numero, itens] of porNumero) if (await enviarWhatsApp(numero, mensagem(itens))) enviados++;

    // relê antes de gravar: o arquivo pode ter mudado durante os envios
    if (enviados || !porNumero.size) {
      const novo = ler();
      novo.avisos = { data: hoje, ids: [...jaAvisados, ...pend.map(t => t.id)] };
      const pedirValor = new Set(pend.filter(t => t.variavel).map(t => t.id));
      for (const t of novo.transacoes) {
        if (pedirValor.has(t.id)) t.aguardandoValor = true; // passa a esperar a resposta com o valor real
        const u = atualizados.get(t.id);
        if (u) Object.assign(t, u); // valor em reais com a cotação de hoje
      }
      gravar(novo);
    }
    return enviados;
  }

  // Busca as cotações antes de ler o arquivo: a rede demora e não pode deixar o arquivo "velho" na mão
  async function taxasDe(moedas) {
    const taxas = {};
    for (const m of new Set(moedas.filter(Boolean))) { const q = await cotar(m); if (q) taxas[m] = q; }
    return taxas;
  }

  async function ciclo() {
    try {
      const mes = mesAtual();
      const precisam = (ler().fixos || []).filter(f => f.ativo && f.moeda && !(f.meses || []).includes(mes)).map(f => f.moeda);
      const taxas = await taxasDe(precisam);
      const obj = ler();
      const gerou = gerarFixosDoMes(obj, mes, taxas), limpou = limparOrfas(obj, mes);
      if (gerou || limpou) gravar(obj);
    } catch (e) { console.error('❌ Erro ao gerar contas fixas:', e.message); }
    avisarVencimentos().catch(e => console.error('❌ Erro ao avisar vencimentos:', e.message));
  }

  // Confere a cada minuto (e logo ao subir, para recuperar o dia se o servidor reiniciou)
  const iniciar = () => { setTimeout(ciclo, 5000); setInterval(ciclo, 60000); };

  return { limparFixo, gerarFixosDoMes, aplicarEdicao, removerGerados, limparOrfas, cicloFatura, avisarVencimentos, responderValor, taxasDe, mesAtual, hoje: () => agoraSP().slice(0, 10), iniciar };
};
module.exports.dataDoMes = dataDoMes;
