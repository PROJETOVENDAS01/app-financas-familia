import React, { useEffect, useState } from 'react';
import { Card, Ico, Vazio } from './ui.jsx';
import { CATS, DESPESAS, catInfo, brl, soma, mesAtual, mesLabel } from './util.js';
import { api } from './api.js';

const SIMB = { BRL: 'R$', USD: 'US$', EUR: '€', GBP: '£' };
const num2 = n => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const novo = tipo => ({ tipo, valor: '', descricao: '', categoria: tipo === 'receita' ? 'Renda' : 'Moradia', subcategoria: '', membro: 'Família', dia: String(new Date().getDate()), avisar: true, variavel: false, fatura: false, fechamento: '', cartao: false, moeda: 'BRL', ativo: true });

function Linha({ f, info, aprox, editar, excluir }) {
  const c = info(f.categoria);
  return (
    <div className="li" style={f.ativo ? undefined : { opacity: .55 }}>
      <div className="dot" aria-hidden="true">{c.e}</div>
      <div style={{ minWidth: 0 }}>
        <div className="n">{f.descricao}{!f.ativo && <span className="wa">Pausada</span>}{f.ativo && f.avisar && <span className="wa">Avisa no WhatsApp</span>}{f.fatura && <span className="wa cc">Fatura do cartão</span>}{f.cartao && <span className="wa cc">Cartão</span>}{f.variavel && !f.fatura && <span className="wa">Valor varia</span>}</div>
        <div className="m">Todo dia {f.dia} · {f.categoria}{f.subcategoria ? ` › ${f.subcategoria}` : ''} · {f.membro}</div>
      </div>
      <div className={`v ${f.tipo === 'receita' ? 'inc' : 'exp'}`}>{f.tipo === 'receita' ? '+' : '−'} {f.moeda ? `${SIMB[f.moeda]} ${num2(f.valor)}` : brl(f.valor)}{f.moeda && aprox != null && <small style={{ display: 'block', fontWeight: 600, opacity: .7 }}>≈ {brl(aprox)}</small>}</div>
      <div className="acts">
        <button className="round" aria-label={`Editar ${f.descricao}`} onClick={() => editar(f)}><Ico d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></button>
        <button className="round" aria-label={`Excluir ${f.descricao}`} onClick={() => excluir(f)}><Ico d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></button>
      </div>
    </div>
  );
}

function Gaveta({ inicial, cats, nomesMembros, fechar, salvar }) {
  const editando = !!inicial.id;
  const [f, setF] = useState(inicial);
  const [erro, setErro] = useState('');
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const estrangeira = f.moeda !== 'BRL' && !f.fatura; // conta em dólar/euro/libra
  const lista = f.tipo === 'receita' ? CATS.filter(c => c.n === 'Renda') : cats;
  const subs = (lista.find(c => c.n === f.categoria)?.sub) || [];
  const trocarTipo = tipo => setF({ ...f, tipo, categoria: tipo === 'receita' ? 'Renda' : (cats[0]?.n || 'Moradia'), subcategoria: '' });
  const enviar = async e => {
    e.preventDefault();
    const valor = Number(String(f.valor).replace(',', '.')), dia = Number(f.dia);
    if (!f.descricao.trim()) return setErro('Diga o que é essa conta. Ex.: Aluguel.');
    if (!(valor > 0)) return setErro('Informe um valor maior que zero.');
    if (!(dia >= 1 && dia <= 31)) return setErro('O dia precisa estar entre 1 e 31.');
    setErro('');
    if (await salvar({ tipo: f.tipo, valor, descricao: f.descricao.trim(), categoria: f.categoria, subcategoria: f.subcategoria, membro: f.membro, dia, avisar: f.tipo === 'despesa' && f.avisar, variavel: f.tipo === 'despesa' && f.variavel, moeda: f.moeda !== 'BRL' && !f.fatura ? f.moeda : null, fatura: f.tipo === 'despesa' && !!f.fatura, fechamento: f.fatura && f.fechamento ? Number(f.fechamento) : null, cartao: f.tipo === 'despesa' && !f.fatura && !!f.cartao, ativo: f.ativo }, inicial.id)) fechar();
  };
  const titulo = editando ? 'Editar conta fixa' : 'Nova conta fixa';
  return (
    <>
      <div className="scrim" onClick={fechar} />
      <form className="drawer" onSubmit={enviar} role="dialog" aria-label={titulo}>
        <h2>{titulo}<button type="button" className="round" aria-label="Fechar" onClick={fechar}><Ico d="M18 6 6 18M6 6l12 12" /></button></h2>
        <div className="seg">
          <button type="button" className={f.tipo === 'despesa' ? 'on' : ''} onClick={() => trocarTipo('despesa')}>Despesa fixa</button>
          <button type="button" className={f.tipo === 'receita' ? 'on' : ''} onClick={() => trocarTipo('receita')}>Receita fixa</button>
        </div>
        <label className="f">Descrição<input className="field" value={f.descricao} onChange={set('descricao')} placeholder={f.tipo === 'receita' ? 'Ex.: Salário' : 'Ex.: Aluguel'} maxLength={100} autoFocus /></label>
        <label className="f">{f.variavel || estrangeira ? 'Valor estimado' : 'Valor'} ({SIMB[f.moeda]})
          <div style={{ display: 'flex', gap: 8 }}>
            {!f.fatura && <select className="field" style={{ width: 112, flex: 'none' }} value={f.moeda} onChange={set('moeda')} aria-label="Moeda"><option value="BRL">Real</option><option value="USD">Dólar</option><option value="EUR">Euro</option><option value="GBP">Libra</option></select>}
            <input className="field" style={{ flex: 1 }} inputMode="decimal" value={f.valor} onChange={set('valor')} placeholder="0,00" />
          </div>
        </label>
        {estrangeira && <div className="sub" style={{ marginBottom: 10 }}>O valor em reais é calculado pela cotação do dia: quando o mês começa e de novo no dia do vencimento, no aviso do WhatsApp. Lá você confirma o valor real cobrado.</div>}
        <label className="f">{f.tipo === 'receita' ? 'Dia do recebimento' : 'Dia do vencimento'}<input className="field" type="number" min="1" max="31" value={f.dia} onChange={set('dia')} /></label>
        {erro && <div className="err">{erro}</div>}
        <label className="f">Categoria<select className="field" value={f.categoria} onChange={e => setF({ ...f, categoria: e.target.value, subcategoria: '' })}>{[...new Set([...lista.map(c => c.n), f.categoria])].map(n => <option key={n}>{n}</option>)}</select></label>
        {subs.length > 0 && <label className="f">Tipo<select className="field" value={f.subcategoria} onChange={set('subcategoria')}><option value="">Escolher...</option>{subs.map(s => <option key={s}>{s}</option>)}</select></label>}
        <label className="f">Membro<select className="field" value={f.membro} onChange={set('membro')}>{[...new Set(['Família', ...nomesMembros, f.membro])].map(n => <option key={n}>{n}</option>)}</select></label>
        {f.tipo === 'despesa' && <label className="check"><input type="checkbox" checked={f.avisar} onChange={e => setF({ ...f, avisar: e.target.checked })} /> Avisar no WhatsApp no dia do vencimento</label>}
        {f.tipo === 'despesa' && <label className="check"><input type="checkbox" checked={!!f.fatura} onChange={e => setF({ ...f, fatura: e.target.checked, moeda: e.target.checked ? 'BRL' : f.moeda, variavel: e.target.checked || f.variavel, categoria: e.target.checked ? 'Fatura do cartão' : cats[0]?.n || 'Moradia', subcategoria: '' })} /> É a fatura do cartão de crédito</label>}
        {f.fatura && <>
          <div className="sub" style={{ marginBottom: 10 }}>A fatura avisa e registra o valor pago, mas não entra no total de gastos: as compras do cartão já foram contadas quando você as lançou. No dia, o bot compara o valor pago com as compras registradas no ciclo e oferece lançar a diferença.</div>
          <label className="f">Dia do fechamento da fatura (opcional)<input className="field" type="number" min="1" max="31" value={f.fechamento} onChange={set('fechamento')} placeholder="Sem informar, usamos 7 dias antes do vencimento" /></label>
        </>}
        {f.tipo === 'despesa' && !f.fatura && <label className="check"><input type="checkbox" checked={!!f.cartao} onChange={e => setF({ ...f, cartao: e.target.checked })} /> Paga no cartão de crédito (entra nos gastos do cartão)</label>}
        {f.tipo === 'despesa' && <label className="check"><input type="checkbox" checked={!!f.variavel || estrangeira} disabled={!!f.fatura || estrangeira} onChange={e => setF({ ...f, variavel: e.target.checked })} /> O valor muda todo mês (confirmo no dia do vencimento)</label>}
        <label className="check"><input type="checkbox" checked={f.ativo} onChange={e => setF({ ...f, ativo: e.target.checked })} /> Ativa (gera o lançamento todo mês)</label>
        <div className="btns"><button className="btn p" type="submit">Salvar conta fixa</button><button className="btn" type="button" onClick={fechar}>Cancelar</button></div>
      </form>
    </>
  );
}

// Compras parceladas no cartão (criadas pelo WhatsApp ou pelo formulário): cada parcela já é um lançamento mensal; aqui aparecem juntas, pelo período das parcelas
function Parcelados({ transacoes, mes, info, excluirCompra }) {
  const hoje = mesAtual(), grupos = {};
  transacoes.filter(t => t.compraId).forEach(t => (grupos[t.compraId] ||= []).push(t));
  const compras = Object.values(grupos).map(ps => ps.sort((a, b) => a.data.localeCompare(b.data)))
    .filter(ps => ps[ps.length - 1].data.slice(0, 7) >= hoje) // só as que ainda têm parcela a pagar
    .sort((a, b) => a[0].data.localeCompare(b[0].data));
  const noMes = soma(compras.flat().filter(t => t.data.startsWith(mes)), t => t.valor);
  return (
    <Card className="c12" tilt={false}>
      <h3>Compras parceladas no cartão</h3>
      {compras.length === 0
        ? <Vazio titulo="Nenhuma compra parcelada em andamento" texto="Diga “comprei um tênis em 3x” no WhatsApp, ou marque cartão e parcelas ao criar uma transação." />
        : <>
          <div className="sub" style={{ marginBottom: 6 }}>Parcelas em {mesLabel(mes)}: <b className="exp">{brl(noMes)}</b></div>
          {compras.map(ps => {
            const p = ps[0], atual = Math.max(ps.findIndex(x => x.data.slice(0, 7) >= hoje), 0), faltam = ps.slice(atual);
            return (
              <div className="li" key={p.compraId}>
                <div className="dot" aria-hidden="true">{info(p.categoria).e}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="n">{p.descricao || p.categoria}<span className="wa cc">Parcela {atual + 1}/{p.parcelas}</span></div>
                  <div className="m">{p.categoria}{p.subcategoria ? ` › ${p.subcategoria}` : ''} · {p.membro} · última em {mesLabel(ps[ps.length - 1].data.slice(0, 7))} · faltam {brl(soma(faltam, t => t.valor))}</div>
                </div>
                <div className="v exp">− {brl(p.valor)}<small style={{ display: 'block', fontWeight: 600, opacity: .7 }}>por mês</small></div>
                <div className="acts"><button className="round" aria-label={`Excluir compra ${p.descricao}`} onClick={() => excluirCompra(ps)}><Ico d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></button></div>
              </div>
            );
          })}
        </>}
    </Card>
  );
}

export function Fixos({ fixos, config, nomesMembros, transacoes, mes, salvar, excluir, excluirCompra }) {
  const [gaveta, setGaveta] = useState(null);
  const cats = config.categorias?.length ? config.categorias : DESPESAS;
  const info = n => (config.categorias || []).find(c => c.n === n) || catInfo(n);
  const ativas = fixos.filter(f => f.ativo);
  const despesas = fixos.filter(f => f.tipo === 'despesa'), receitas = fixos.filter(f => f.tipo === 'receita');
  // contas em moeda estrangeira: converte com a cotação de agora só para mostrar e somar (o lançamento do mês usa a do dia)
  const [taxas, setTaxas] = useState({});
  const moedas = [...new Set(fixos.map(f => f.moeda).filter(Boolean))].join(',');
  useEffect(() => {
    moedas.split(',').filter(Boolean).forEach(m => api.cotacao(m).then(c => setTaxas(t => ({ ...t, [m]: c.taxa }))).catch(() => {}));
  }, [moedas]);
  const emReais = f => (f.moeda ? (taxas[f.moeda] ? f.valor * taxas[f.moeda] : 0) : f.valor);
  const totD = soma(ativas.filter(f => f.tipo === 'despesa'), emReais), totR = soma(ativas.filter(f => f.tipo === 'receita'), emReais);
  const ordenar = l => [...l].sort((a, b) => a.dia - b.dia);
  const lista = (l, tipo) => l.length === 0
    ? <Vazio titulo={tipo === 'receita' ? 'Nenhuma receita fixa' : 'Nenhuma despesa fixa'} texto={tipo === 'receita' ? 'Cadastre o salário e outras entradas que se repetem todo mês.' : 'Cadastre aluguel, escola, internet e outras contas que se repetem todo mês.'} acao="Adicionar" onAcao={() => setGaveta(novo(tipo))} />
    : ordenar(l).map(f => <Linha key={f.id} f={f} info={info} aprox={f.moeda && taxas[f.moeda] ? f.valor * taxas[f.moeda] : null} editar={x => setGaveta({ ...x, valor: String(x.valor).replace('.', ','), dia: String(x.dia), moeda: x.moeda || 'BRL', fechamento: x.fechamento ? String(x.fechamento) : '' })} excluir={excluir} />);
  return (
    <>
    <div className="bento">
      <Card className="c12" tilt={false}>
        <div className="stats" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
          <div><span className="lab">Despesas fixas por mês</span><b className="exp">{brl(totD)}</b></div>
          <div><span className="lab">Receitas fixas por mês</span><b className="inc">{brl(totR)}</b></div>
          <div><span className="lab">Sobra fixa por mês</span><b>{brl(totR - totD)}</b></div>
        </div>
        <div className="sub" style={{ marginTop: 12 }}>Os lançamentos aparecem sozinhos no começo de cada mês. As despesas marcadas para avisar chegam no WhatsApp de manhã, no dia do vencimento.</div>
        <div className="btns"><button className="btn p" onClick={() => setGaveta(novo('despesa'))}>Nova conta fixa</button></div>
      </Card>
      <Card className="c6" tilt={false}><h3>Despesas fixas</h3>{lista(despesas, 'despesa')}</Card>
      <Card className="c6" tilt={false}><h3>Receitas fixas</h3>{lista(receitas, 'receita')}</Card>
      <Parcelados transacoes={transacoes} mes={mes} info={info} excluirCompra={excluirCompra} />
    </div>
    {/* fora do .bento: o perspective dele prenderia o painel fixo dentro da grade */}
    {gaveta && <Gaveta inicial={gaveta} cats={cats} nomesMembros={nomesMembros} fechar={() => setGaveta(null)} salvar={salvar} />}
    </>
  );
}
