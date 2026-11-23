// Contas fixas mensais (despesas e receitas): geram o lançamento de cada mês
// e avisam no WhatsApp, no dia do vencimento, o que pagar e quanto.
const FUSO = 'America/Sao_Paulo';
const agoraSP = (d = new Date()) => d.toLocaleString('sv-SE', { timeZone: FUSO }); // 'AAAA-MM-DD HH:mm:ss'
const diasNoMes = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const dataDoMes = (ym, dia) => `${ym}-${String(Math.min(dia, diasNoMes(ym))).padStart(2, '0')}`; // dia 31 em fevereiro vira 28/29
const brl = n => 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Só aceita os campos conhecidos e valida; devolve null se inválido
function limparFixo(b) {
  const valor = Number(b.valor), dia = Math.trunc(Number(b.dia));
  const descricao = String(b.descricao || '').trim().slice(0, 100);
  if (!['despesa', 'receita'].includes(b.tipo) || !(valor > 0) || !(dia >= 1 && dia <= 31) || !descricao) return null;
  return {
    tipo: b.tipo, valor, dia, descricao,
    categoria: String(b.categoria || (b.tipo === 'receita' ? 'Renda' : 'Outros')).slice(0, 50),
    subcategoria: String(b.subcategoria || '').slice(0, 50),
    membro: String(b.membro || 'Família').slice(0, 50),
    avisar: b.tipo === 'despesa' && b.avisar !== false,
    variavel: b.tipo === 'despesa' && !!b.variavel, // valor muda todo mês: o valor da conta é só uma estimativa, confirmada no dia
    ativo: b.ativo !== false
  };
}

// Cria, em obj, o lançamento do mês de cada conta ativa que ainda não gerou esse mês. Devolve true se mudou algo.
// Usa f.meses (e não a existência do lançamento) para não recriar o que a família apagou de propósito.
function gerarFixosDoMes(obj, mes) {
  let id = Date.now(), mudou = false;
  for (const f of obj.fixos || []) {
    f.meses = f.meses || [];
    if (!f.ativo || f.meses.includes(mes)) continue;
    obj.transacoes.push({ id: id++, tipo: f.tipo, data: dataDoMes(mes, f.dia), valor: f.valor, categoria: f.categoria, subcategoria: f.subcategoria, descricao: f.descricao, membro: f.membro, cartao: false, origem: 'fixo', fixoId: f.id, ...(f.variavel ? { variavel: true, confirmado: false } : {}) });
    f.meses = [...f.meses, mes].slice(-24);
    mudou = true;
  }
  return mudou;
}

// Editou a conta: atualiza os lançamentos dela do mês atual em diante (meses passados ficam como estavam)
function aplicarEdicao(obj, f, mesAtual) {
  for (const t of obj.transacoes) {
    if (t.fixoId !== f.id || t.data.slice(0, 7) < mesAtual) continue;
    const jaConfirmado = t.variavel && t.confirmado; // valor real já confirmado: a edição da estimativa não mexe nele
    Object.assign(t, { tipo: f.tipo, categoria: f.categoria, subcategoria: f.subcategoria, descricao: f.descricao, membro: f.membro, data: dataDoMes(t.data.slice(0, 7), f.dia) });
    if (!jaConfirmado) t.valor = f.valor;
    if (f.variavel) t.variavel = true; else { delete t.variavel; delete t.confirmado; delete t.aguardandoValor; }
  }
}

// Apagou a conta: remove só o que ainda não venceu; o que já passou fica no histórico
function removerGerados(obj, fixoId, hoje) {
  obj.transacoes = obj.transacoes.filter(t => !(t.fixoId === fixoId && t.data >= hoje));
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
      mudam.length && `💡 *Confirme o valor:*\n${mudam.map(t => `• ${t.descricao} — estimado ${brl(t.valor)}`).join('\n')}\n\nResponda o valor real (ex.: "${mudam[0].descricao.toLowerCase()} 187,40") ou *ok* para manter o estimado.`,
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
    const aguardando = obj.transacoes.filter(t => t.aguardandoValor && !t.confirmado && t.data >= limite);
    if (!aguardando.length) return null;
    const t0 = norm(texto).trim();
    const confirmar = (lista, valor) => {
      const linhas = lista.map(t => {
        const antes = t.valor, novo = valor ?? t.valor;
        t.valor = novo; t.confirmado = true; t.aguardandoValor = false;
        const f = (obj.fixos || []).find(x => x.id === t.fixoId);
        if (f?.variavel) f.valor = novo; // o próximo mês já começa estimando este valor
        return `✅ ${t.descricao}: ${brl(novo)}${valor != null && antes !== novo ? ` (estava ${brl(antes)})` : ''}`;
      });
      gravar(obj);
      return `${linhas.join('\n')}\n\nJá está registrado. É só pagar! 💸`;
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

    const porNumero = new Map();
    for (const t of pend) for (const n of destinatarios(t.membro)) porNumero.set(n, [...(porNumero.get(n) || []), t]);
    let enviados = 0;
    for (const [numero, itens] of porNumero) if (await enviarWhatsApp(numero, mensagem(itens))) enviados++;

    // relê antes de gravar: o arquivo pode ter mudado durante os envios
    if (enviados || !porNumero.size) {
      const novo = ler();
      novo.avisos = { data: hoje, ids: [...jaAvisados, ...pend.map(t => t.id)] };
      const pedirValor = new Set(pend.filter(t => t.variavel).map(t => t.id));
      for (const t of novo.transacoes) if (pedirValor.has(t.id)) t.aguardandoValor = true; // passa a esperar a resposta com o valor real
      gravar(novo);
    }
    return enviados;
  }

  function ciclo() {
    try {
      const obj = ler();
      if (gerarFixosDoMes(obj, mesAtual())) gravar(obj);
    } catch (e) { console.error('❌ Erro ao gerar contas fixas:', e.message); }
    avisarVencimentos().catch(e => console.error('❌ Erro ao avisar vencimentos:', e.message));
  }

  // Confere a cada minuto (e logo ao subir, para recuperar o dia se o servidor reiniciou)
  const iniciar = () => { setTimeout(ciclo, 5000); setInterval(ciclo, 60000); };

  return { limparFixo, gerarFixosDoMes, aplicarEdicao, removerGerados, avisarVencimentos, responderValor, mesAtual, hoje: () => agoraSP().slice(0, 10), iniciar };
};
module.exports.dataDoMes = dataDoMes;
