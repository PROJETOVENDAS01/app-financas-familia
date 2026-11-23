import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Card, Anel, Avatar, Lancamento, Vazio, Ico, Texto } from './ui.jsx';
import { CATS, DESPESAS, catInfo, brl, brl0, soma, corMembro, addMes } from './util.js';
import { api } from './api.js';

/* ---------- Transações ---------- */
const FILTROS = [
  ['cartao', 'No cartão', t => t.cartao],
  ['fixas', 'Contas fixas', t => t.origem === 'fixo'],
  ['apagar', 'A pagar (fixas)', t => t.fixoId && t.tipo === 'despesa' && !t.pago],
  ['pagas', 'Pagas (fixas)', t => t.fixoId && t.tipo === 'despesa' && t.pago],
  ['parcelas', 'Parceladas', t => t.parcelas > 1]
];

export function Transacoes({ transacoes, mes, nomesMembros, editar, excluir, nova }) {
  const [q, setQ] = useState(''), [cat, setCat] = useState(''), [mem, setMem] = useState(''), [tipo, setTipo] = useState(''), [especial, setEspecial] = useState('');
  const lista = useMemo(() => transacoes
    .filter(t => t.data.startsWith(mes))
    .filter(t => !especial || FILTROS.find(f => f[0] === especial)[2](t))
    .filter(t => !cat || t.categoria === cat)
    .filter(t => !mem || t.membro === mem)
    .filter(t => !tipo || t.tipo === tipo)
    .filter(t => !q || `${t.descricao} ${t.categoria} ${t.membro}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id), [transacoes, mes, q, cat, mem, tipo, especial]);
  const rec = soma(lista.filter(t => t.tipo === 'receita')), desp = soma(lista.filter(t => t.tipo === 'despesa' && !t.fatura));
  const filtrando = q || cat || mem || tipo || especial;
  return (
    <Card tilt={false}>
      <div className="toolbar">
        <input className="field grow" placeholder="Buscar lançamento" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar" />
        <select className="field" value={tipo} onChange={e => setTipo(e.target.value)} aria-label="Tipo"><option value="">Todos os tipos</option><option value="despesa">Despesas</option><option value="receita">Receitas</option></select>
        <select className="field" value={especial} onChange={e => setEspecial(e.target.value)} aria-label="Filtrar por"><option value="">Todos os lançamentos</option>{FILTROS.map(([k, nome]) => <option key={k} value={k}>{nome}</option>)}</select>
        <select className="field" value={cat} onChange={e => setCat(e.target.value)} aria-label="Categoria"><option value="">Todas as categorias</option>{CATS.map(c => <option key={c.n}>{c.n}</option>)}</select>
        <select className="field" value={mem} onChange={e => setMem(e.target.value)} aria-label="Membro"><option value="">Todos os membros</option>{nomesMembros.map(n => <option key={n}>{n}</option>)}</select>
        <button className="btn p hd-nova" onClick={nova}>Nova transação</button>
      </div>
      <div className="sub" style={{ marginBottom: 6 }}>{lista.length} lançamentos · Receitas <b className="inc">{brl(rec)}</b> · Despesas <b className="exp">{brl(desp)}</b></div>
      {lista.length === 0
        ? <Vazio titulo={filtrando ? 'Nada encontrado' : 'Nenhum lançamento neste mês'} texto={filtrando ? 'Tente limpar os filtros.' : 'Adicione o primeiro ou mande “gasto 50 pão” pelo WhatsApp.'} acao={filtrando ? null : 'Nova transação'} onAcao={nova} />
        : lista.map(t => <Lancamento key={t.id} t={t} onEditar={editar} onExcluir={excluir} />)}
    </Card>
  );
}

/* ---------- Metas e orçamento ---------- */
function LimiteCat({ c, gasto, limite, salvar }) {
  const [v, setV] = useState(limite ? String(limite) : '');
  useEffect(() => setV(limite ? String(limite) : ''), [limite]);
  const confirmar = () => { const n = Number(String(v).replace(',', '.')); if ((n || 0) !== (limite || 0)) salvar(c.n, n); };
  const passou = limite > 0 && gasto > limite;
  return (
    <Card className="c4">
      <div className="budget">
        <Anel pct={limite > 0 ? gasto / limite : 0} cor={passou ? 'var(--exp)' : c.c} emoji={c.e} tam={76} />
        <div className="t">
          <div className="n">{c.n}</div>
          <div className="sub">{brl0(gasto)} gastos{limite > 0 && <> · <b className={passou ? 'exp' : 'inc'}>{passou ? `${brl0(gasto - limite)} acima` : `${brl0(limite - gasto)} restam`}</b></>}</div>
          <div className="limit">
            <input className="field" inputMode="decimal" placeholder="Limite R$" value={v} aria-label={`Limite mensal de ${c.n}`}
              onChange={e => setV(e.target.value)} onBlur={confirmar} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function Metas({ transacoes, config, mes, salvarConfig }) {
  const [novaEmoji, setNovaEmoji] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [editandoSub, setEditandoSub] = useState(null);
  const [novoSub, setNovoSub] = useState('');
  const desp = transacoes.filter(t => t.tipo === 'despesa' && t.data.startsWith(mes));
  const totD = soma(desp), limite = soma(Object.entries(config.orcamentos).filter(([k]) => k !== 'Renda'), ([, v]) => v);
  const salvar = (nome, valor) => salvarConfig({ ...config, orcamentos: { ...config.orcamentos, [nome]: valor } });
  const cats = config.categorias || DESPESAS;
  const deletarCat = (nome) => {
    if (confirm(`Deletar categoria "${nome}"? Os lançamentos continuam salvos.`)) {
      salvarConfig({ ...config, categorias: cats.filter(c => c.n !== nome) });
    }
  };
  const adicionarCat = (e) => {
    e.preventDefault();
    const n = novoNome.trim(), emoji = novaEmoji.trim();
    if (!n || !emoji) return alert('Preencha nome e emoji');
    if (cats.some(c => c.n === n)) return alert('Categoria já existe');
    salvarConfig({ ...config, categorias: [...cats, { n, e: emoji, c: '#94a3b8', sub: [] }] });
    setNovoNome('');
    setNovaEmoji('');
  };
  const atualizarSubs = (catNome, novasSubs) => {
    const novasCats = cats.map(c => c.n === catNome ? { ...c, sub: novasSubs } : c);
    salvarConfig({ ...config, categorias: novasCats });
  };
  const adicionarSub = (catNome) => {
    const s = novoSub.trim();
    if (!s) return alert('Digite um tipo');
    const cat = cats.find(c => c.n === catNome);
    if (cat.sub.includes(s)) return alert('Tipo já existe');
    atualizarSubs(catNome, [...cat.sub, s]);
    setNovoSub('');
  };
  const deletarSub = (catNome, sub) => {
    const cat = cats.find(c => c.n === catNome);
    atualizarSubs(catNome, cat.sub.filter(s => s !== sub));
  };
  return (
    <div className="bento">
      <Card className="c12">
        <div className="lab">Orçamento do mês</div>
        <div className="big">{brl0(totD)} <small>de {limite > 0 ? brl0(limite) : 'nenhum limite definido'}</small></div>
        <div className="bar" style={{ height: 12 }}><i style={{ width: `${limite > 0 ? Math.min(totD / limite, 1) * 100 : 0}%`, background: totD > limite && limite > 0 ? 'var(--exp)' : 'var(--brand)' }} /></div>
        <div className="sub" style={{ marginTop: 10 }}>Os limites valem para todos os meses. Digite o valor e saia do campo para salvar.</div>
      </Card>
      {cats.map(c => <LimiteCat key={c.n} c={c} gasto={soma(desp.filter(t => t.categoria === c.n))} limite={config.orcamentos[c.n] || 0} salvar={salvar} />)}
      <Card className="c12" tilt={false}>
        <h3>Gerenciar categorias</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 20 }}>
          {cats.map(c => (
            <div key={c.n} style={{ padding: 12, border: '1px solid var(--rule)', borderRadius: 12, background: 'var(--card)' }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{c.e}</div>
                <div style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 4 }}>Categoria</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{c.n}</div>
                <div style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 8 }}>Tipos ({c.sub?.length || 0})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                  {c.sub?.slice(0, 2).map(s => <span key={s} style={{ fontSize: 11, background: 'var(--chip)', padding: '2px 8px', borderRadius: 6 }}>{s}</span>)}
                  {c.sub?.length > 2 && <span style={{ fontSize: 11, color: 'var(--sub)' }}>+{c.sub.length - 2}</span>}
                </div>
              </div>
              {editandoSub === c.n ? (
                <div style={{ padding: 10, background: 'var(--hover)', borderRadius: 8, marginBottom: 8 }}>
                  <input className="field" style={{ fontSize: 12, marginBottom: 6, display: 'block', width: '100%' }} value={novoSub} onChange={e => setNovoSub(e.target.value)} placeholder="Novo tipo" />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn" style={{ flex: 1, fontSize: 11, padding: '6px 8px' }} onClick={() => adicionarSub(c.n)}>Adicionar</button>
                    <button className="btn" style={{ flex: 1, fontSize: 11, padding: '6px 8px' }} onClick={() => setEditandoSub(null)}>Fechar</button>
                  </div>
                  {c.sub?.length > 0 && <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--rule)', fontSize: 11 }}>
                    {c.sub.map(s => (
                      <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span>{s}</span>
                        <button className="btn danger" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => deletarSub(c.n, s)}>✕</button>
                      </div>
                    ))}
                  </div>}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn" style={{ flex: 1, fontSize: 12 }} onClick={() => setEditandoSub(c.n)}>Editar tipos</button>
                  {c.n !== 'Renda' && <button className="btn danger" style={{ fontSize: 12 }} onClick={() => deletarCat(c.n)}>Deletar</button>}
                </div>
              )}
            </div>
          ))}
        </div>
        <form onSubmit={adicionarCat} style={{ paddingTop: 20, borderTop: '1px solid var(--rule)' }}>
          <h3 style={{ marginBottom: 16 }}>Adicionar categoria</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <label className="f">Emoji<input className="field" value={novaEmoji} onChange={e => setNovaEmoji(e.target.value)} placeholder="Ex: 🏋️" maxLength={5} /></label>
            <label className="f">Nome<input className="field" value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Ex: Academia" maxLength={30} /></label>
          </div>
          <button className="btn p" type="submit">Adicionar</button>
        </form>
        <div className="sub" style={{ marginTop: 12 }}>Cole emojis de qualquer fonte. As categorias criadas aparecem ao lançar transações.</div>
      </Card>
    </div>
  );
}

/* ---------- Por membro ---------- */
export function Membros({ transacoes, config, mes, nomesMembros, salvarConfig }) {
  const [novo, setNovo] = useState('');
  const doMes = transacoes.filter(t => t.data.startsWith(mes));
  const totD = soma(doMes.filter(t => t.tipo === 'despesa')), totR = soma(doMes.filter(t => t.tipo === 'receita'));
  const adicionar = e => { e.preventDefault(); const n = novo.trim(); if (n) { salvarConfig({ ...config, membros: [...config.membros, n] }); setNovo(''); } };
  return (
    <div className="bento">
      <Card className="c12" tilt={false}>
        <h3>Total da família</h3>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div><div className="lab">Gastou</div><div className="val exp">{brl(totD)}</div></div>
          <div><div className="lab">Recebeu</div><div className="val inc">{brl(totR)}</div></div>
          <div><div className="lab">Saldo</div><div className="val">{brl(totR - totD)}</div></div>
        </div>
        <div className="sub" style={{ marginTop: 10 }}>Soma de todos os membros abaixo.</div>
      </Card>
      {nomesMembros.map(n => {
        const d = doMes.filter(t => t.membro === n && t.tipo === 'despesa'), r = doMes.filter(t => t.membro === n && t.tipo === 'receita');
        const g = soma(d), porCat = DESPESAS.map(c => ({ c, v: soma(d.filter(t => t.categoria === c.n)) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
        return (
          <Card className="c4 mcard" key={n}>
            <div className="top"><Avatar nome={n} cor={corMembro(n)} grande /><div><div style={{ fontWeight: 800, fontSize: 17 }}>{n}</div><div className="sub">{totD > 0 ? Math.round(g / totD * 100) : 0}% dos gastos do mês</div></div></div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}><div style={{ flex: 1 }}><div className="lab">Gastou</div><div className="val exp">{brl(g)}</div></div><div style={{ flex: 1 }}><div className="lab">Recebeu</div><div className="val inc">{brl(soma(r))}</div></div></div>
            <div className="bar" style={{ height: 10, marginTop: 10 }}>{porCat.map(x => <i key={x.c.n} title={x.c.n} style={{ width: `${x.v / (g || 1) * 100}%`, background: x.c.c }} />)}</div>
            <div className="chips">{porCat.slice(0, 3).map(x => <span key={x.c.n}>{x.c.e} {x.c.n} {brl0(x.v)}</span>)}{porCat.length === 0 && <span>Sem gastos</span>}</div>
            {n === 'Família' && <div className="sub" style={{ marginTop: 12 }}>Lançamentos sem dono (antigos ou de um número não cadastrado).</div>}
            {config.membros.includes(n) && <div className="btns"><button className="btn danger" onClick={() => confirm(`Remover ${n} da lista? Os lançamentos continuam salvos.`) && salvarConfig({ ...config, membros: config.membros.filter(m => m !== n) })}>Remover da lista</button></div>}
          </Card>
        );
      })}
      <Card className="c4" tilt={false}>
        <h3>Adicionar membro</h3>
        <form onSubmit={adicionar}>
          <label className="f">Nome<input className="field" value={novo} onChange={e => setNovo(e.target.value)} placeholder="Ex.: Maria" maxLength={50} /></label>
          <button className="btn p" type="submit">Adicionar</button>
        </form>
        <div className="sub" style={{ marginTop: 12 }}>Quem estiver na lista aparece ao lançar uma transação.</div>
      </Card>
    </div>
  );
}

/* ---------- Assistente ---------- */
const SUGESTOES = ['Onde posso economizar este mês?', 'Como foi o mês comparado ao anterior?', 'Quanto gastamos no cartão de crédito?', 'Quais contas fixas ainda faltam pagar?', 'Vamos fechar dentro das metas?'];
export function Assistente({ mes }) {
  const [msgs, setMsgs] = useState([]), [q, setQ] = useState(''), [espera, setEspera] = useState(false);
  const fim = useRef(null);
  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }); }, [msgs, espera]);
  const enviar = async texto => {
    const p = texto.trim(); if (!p || espera) return;
    setMsgs(m => [...m, { de: 'u', t: p }]); setQ(''); setEspera(true);
    const historico = msgs.filter(m => !m.erro).map(m => ({ role: m.de === 'u' ? 'user' : 'assistant', content: m.t })); // a conversa até aqui, para perguntas de continuação
    try { const { resposta } = await api.perguntar(p, mes, historico); setMsgs(m => [...m, { de: 'a', t: resposta }]); }
    catch (e) { setMsgs(m => [...m, { de: 'a', t: e.message, erro: true }]); }
    setEspera(false);
  };
  return (
    <Card tilt={false}>
      <h3>Pergunte sobre as finanças da casa</h3>
      {msgs.length === 0 && <div className="sugs">{SUGESTOES.map(s => <button key={s} onClick={() => enviar(s)}>{s}</button>)}</div>}
      <div className="chat">
        {msgs.map((m, i) => <div key={i} className={`msg ${m.de}`}><Texto t={m.t} /></div>)}
        {espera && <div className="msg a">Pensando…</div>}
        <div ref={fim} />
      </div>
      <form className="ask" onSubmit={e => { e.preventDefault(); enviar(q); }}>
        <input className="field" value={q} onChange={e => setQ(e.target.value)} placeholder="Ex.: quanto o João gastou com transporte?" maxLength={500} aria-label="Sua pergunta" />
        <button className="btn p" type="submit">Perguntar</button>
      </form>
      <div className="sub" style={{ marginTop: 12 }}>O assistente vê os lançamentos de 3 meses atrás até 3 meses à frente (com cartão, parcelas e contas fixas) e as metas. Pode perguntar de continuação, como “e a Carol?”. Limite de 30 perguntas por hora, somando o WhatsApp.</div>
    </Card>
  );
}

/* ---------- Formulário (gaveta lateral) ---------- */
export function Gaveta({ tx, mes, nomesMembros, fechar, salvar }) {
  const editando = !!tx?.id;
  const catObj = CATS.find(c => c.n === (tx?.categoria || 'Alimentação'));
  const [f, setF] = useState(() => ({ tipo: 'despesa', valor: '', descricao: '', categoria: 'Alimentação', subcategoria: '', membro: nomesMembros.find(n => n !== 'Família') || 'Família', data: `${mes}-${String(Math.min(new Date().getDate(), 28)).padStart(2, '0')}`, repetir: false, cartao: false, parcelas: '1', ...tx, moeda: 'BRL' }));
  const [erro, setErro] = useState('');
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const estrangeira = !editando && f.moeda !== 'BRL'; // valor digitado em dólar/euro/libra: o servidor converte para reais ao salvar
  const [cot, setCot] = useState(null); // { taxa, quando } | 'erro' | null (buscando)
  useEffect(() => {
    if (!estrangeira) return setCot(null);
    let vivo = true; setCot(null);
    api.cotacao(f.moeda).then(c => vivo && setCot(c)).catch(() => vivo && setCot('erro'));
    return () => { vivo = false; };
  }, [f.moeda, estrangeira]);
  const catAtual = CATS.find(c => c.n === f.categoria);
  const enviar = async e => {
    e.preventDefault();
    const valor = Number(String(f.valor).replace(',', '.'));
    if (!(valor > 0)) return setErro('Informe um valor maior que zero.');
    setErro('');
    await salvar({ tipo: f.tipo, valor, descricao: f.descricao.trim(), categoria: f.categoria, subcategoria: f.subcategoria, membro: f.membro, data: f.data, moeda: estrangeira ? f.moeda : undefined, cartao: f.tipo === 'despesa' && !!f.cartao, parcelas: !editando && f.tipo === 'despesa' && f.cartao ? Number(f.parcelas) || 1 : undefined }, tx?.id, f.repetir);
  };
  return (
    <>
      <div className="scrim" onClick={fechar} />
      <form className="drawer" onSubmit={enviar} role="dialog" aria-label={editando ? 'Editar transação' : 'Nova transação'}>
        <h2>{editando ? 'Editar transação' : 'Nova transação'}<button type="button" className="round" aria-label="Fechar" onClick={fechar}><Ico d="M18 6 6 18M6 6l12 12" /></button></h2>
        <div className="seg">
          <button type="button" className={f.tipo === 'despesa' ? 'on' : ''} onClick={() => setF({ ...f, tipo: 'despesa', categoria: f.categoria === 'Renda' ? 'Alimentação' : f.categoria })}>Despesa</button>
          <button type="button" className={f.tipo === 'receita' ? 'on' : ''} onClick={() => setF({ ...f, tipo: 'receita', categoria: 'Renda' })}>Receita</button>
        </div>
        <label className="f">Valor ({{ BRL: 'R$', USD: 'US$', EUR: '€', GBP: '£' }[f.moeda]})
          <div style={{ display: 'flex', gap: 8 }}>
            {!editando && <select className="field" style={{ width: 112, flex: 'none' }} value={f.moeda} onChange={set('moeda')} aria-label="Moeda"><option value="BRL">Real</option><option value="USD">Dólar</option><option value="EUR">Euro</option><option value="GBP">Libra</option></select>}
            <input className="field" style={{ flex: 1 }} inputMode="decimal" value={f.valor} onChange={set('valor')} placeholder="0,00" autoFocus />
          </div>
        </label>
        {estrangeira && (cot === 'erro'
          ? <div className="err">Não consegui buscar a cotação agora. Tente de novo em instantes ou informe o valor em reais.</div>
          : !cot ? <div className="sub">Buscando a cotação…</div>
          : <div className="sub" style={{ marginBottom: 10 }}>{(() => {
              const v = Number(String(f.valor).replace(',', '.')), [dia, hora] = cot.quando.split(' '), quando = `${dia.slice(8)}/${dia.slice(5, 7)}${hora ? ' ' + hora.slice(0, 5) : ''}`;
              const taxa = cot.taxa.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
              return v > 0 ? <>≈ <b>{brl(Math.round(v * cot.taxa * 100) / 100)}</b> em reais (× R$ {taxa}, cotação de {quando}). Será salvo em reais.</> : <>Cotação de {quando}: R$ {taxa}. Digite o valor para ver em reais.</>;
            })()}</div>)}
        {erro && <div className="err">{erro}</div>}
        <label className="f">Descrição<input className="field" value={f.descricao} onChange={set('descricao')} placeholder="Ex.: Supermercado" maxLength={100} /></label>
        <label className="f">Categoria<select className="field" value={f.categoria} onChange={e => setF({ ...f, categoria: e.target.value, subcategoria: '' })}>{CATS.map(c => <option key={c.n}>{c.n}</option>)}</select></label>
        {catAtual?.sub && catAtual.sub.length > 0 && <label className="f">Tipo<select className="field" value={f.subcategoria} onChange={set('subcategoria')}><option value="">Escolher...</option>{catAtual.sub.map(s => <option key={s}>{s}</option>)}</select></label>}
        <label className="f">Membro<select className="field" value={f.membro} onChange={set('membro')}>{[...new Set(['Família', ...nomesMembros, f.membro])].map(n => <option key={n}>{n}</option>)}</select></label>
        {f.tipo === 'despesa' && <label className="check"><input type="checkbox" checked={!!f.cartao} onChange={e => setF({ ...f, cartao: e.target.checked })} /> Pago no cartão de crédito</label>}
        {f.tipo === 'despesa' && f.cartao && !editando && <label className="f">Parcelas<input className="field" type="number" min="1" max="48" value={f.parcelas} onChange={set('parcelas')} /><span className="sub">O valor acima é o total da compra. Cada mês entra uma parcela.</span></label>}
        <label className="f">Data<input className="field" type="date" value={f.data} onChange={set('data')} required /></label>
        {!editando && <label className="check"><input type="checkbox" checked={f.repetir} onChange={e => setF({ ...f, repetir: e.target.checked })} /> Repetir todo mês pelos próximos 11 meses</label>}
        <div className="btns"><button className="btn p" type="submit">Salvar transação</button><button className="btn" type="button" onClick={fechar}>Cancelar</button></div>
      </form>
    </>
  );
}
