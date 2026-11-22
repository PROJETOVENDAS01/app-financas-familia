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
    obj.transacoes.push({ id: id++, tipo: f.tipo, data: dataDoMes(mes, f.dia), valor: f.valor, categoria: f.categoria, subcategoria: f.subcategoria, descricao: f.descricao, membro: f.membro, cartao: false, origem: 'fixo', fixoId: f.id });
    f.meses = [...f.meses, mes].slice(-24);
    mudou = true;
  }
  return mudou;
}

// Editou a conta: atualiza os lançamentos dela do mês atual em diante (meses passados ficam como estavam)
function aplicarEdicao(obj, f, mesAtual) {
  for (const t of obj.transacoes) {
    if (t.fixoId !== f.id || t.data.slice(0, 7) < mesAtual) continue;
    Object.assign(t, { tipo: f.tipo, valor: f.valor, categoria: f.categoria, subcategoria: f.subcategoria, descricao: f.descricao, membro: f.membro, data: dataDoMes(t.data.slice(0, 7), f.dia) });
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

  const mensagem = itens => `🔔 *Contas para pagar hoje*\n\n${itens.map(t => `• ${t.descricao} — ${brl(t.valor)}`).join('\n')}\n\n💰 Total: ${brl(itens.reduce((s, t) => s + t.valor, 0))}`;

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

  return { limparFixo, gerarFixosDoMes, aplicarEdicao, removerGerados, avisarVencimentos, mesAtual, hoje: () => agoraSP().slice(0, 10), iniciar };
};
module.exports.dataDoMes = dataDoMes;
