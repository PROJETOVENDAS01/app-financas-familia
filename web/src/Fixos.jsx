import React, { useState } from 'react';
import { Card, Ico, Vazio } from './ui.jsx';
import { CATS, DESPESAS, catInfo, brl, soma } from './util.js';

const novo = tipo => ({ tipo, valor: '', descricao: '', categoria: tipo === 'receita' ? 'Renda' : 'Moradia', subcategoria: '', membro: 'Família', dia: String(new Date().getDate()), avisar: true, variavel: false, ativo: true });

function Linha({ f, info, editar, excluir }) {
  const c = info(f.categoria);
  return (
    <div className="li" style={f.ativo ? undefined : { opacity: .55 }}>
      <div className="dot" aria-hidden="true">{c.e}</div>
      <div style={{ minWidth: 0 }}>
        <div className="n">{f.descricao}{!f.ativo && <span className="wa">Pausada</span>}{f.ativo && f.avisar && <span className="wa">Avisa no WhatsApp</span>}{f.variavel && <span className="wa">Valor varia</span>}</div>
        <div className="m">Todo dia {f.dia} · {f.categoria}{f.subcategoria ? ` › ${f.subcategoria}` : ''} · {f.membro}</div>
      </div>
      <div className={`v ${f.tipo === 'receita' ? 'inc' : 'exp'}`}>{f.tipo === 'receita' ? '+' : '−'} {brl(f.valor)}</div>
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
    if (await salvar({ tipo: f.tipo, valor, descricao: f.descricao.trim(), categoria: f.categoria, subcategoria: f.subcategoria, membro: f.membro, dia, avisar: f.tipo === 'despesa' && f.avisar, variavel: f.tipo === 'despesa' && f.variavel, ativo: f.ativo }, inicial.id)) fechar();
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
        <label className="f">{f.variavel ? 'Valor estimado (R$)' : 'Valor (R$)'}<input className="field" inputMode="decimal" value={f.valor} onChange={set('valor')} placeholder="0,00" /></label>
        <label className="f">{f.tipo === 'receita' ? 'Dia do recebimento' : 'Dia do vencimento'}<input className="field" type="number" min="1" max="31" value={f.dia} onChange={set('dia')} /></label>
        {erro && <div className="err">{erro}</div>}
        <label className="f">Categoria<select className="field" value={f.categoria} onChange={e => setF({ ...f, categoria: e.target.value, subcategoria: '' })}>{[...new Set([...lista.map(c => c.n), f.categoria])].map(n => <option key={n}>{n}</option>)}</select></label>
        {subs.length > 0 && <label className="f">Tipo<select className="field" value={f.subcategoria} onChange={set('subcategoria')}><option value="">Escolher...</option>{subs.map(s => <option key={s}>{s}</option>)}</select></label>}
        <label className="f">Membro<select className="field" value={f.membro} onChange={set('membro')}>{[...new Set(['Família', ...nomesMembros, f.membro])].map(n => <option key={n}>{n}</option>)}</select></label>
        {f.tipo === 'despesa' && <label className="check"><input type="checkbox" checked={f.avisar} onChange={e => setF({ ...f, avisar: e.target.checked })} /> Avisar no WhatsApp no dia do vencimento</label>}
        {f.tipo === 'despesa' && <label className="check"><input type="checkbox" checked={!!f.variavel} onChange={e => setF({ ...f, variavel: e.target.checked })} /> O valor muda todo mês (confirmo no dia do vencimento)</label>}
        <label className="check"><input type="checkbox" checked={f.ativo} onChange={e => setF({ ...f, ativo: e.target.checked })} /> Ativa (gera o lançamento todo mês)</label>
        <div className="btns"><button className="btn p" type="submit">Salvar conta fixa</button><button className="btn" type="button" onClick={fechar}>Cancelar</button></div>
      </form>
    </>
  );
}

export function Fixos({ fixos, config, nomesMembros, salvar, excluir }) {
  const [gaveta, setGaveta] = useState(null);
  const cats = config.categorias?.length ? config.categorias : DESPESAS;
  const info = n => (config.categorias || []).find(c => c.n === n) || catInfo(n);
  const ativas = fixos.filter(f => f.ativo);
  const despesas = fixos.filter(f => f.tipo === 'despesa'), receitas = fixos.filter(f => f.tipo === 'receita');
  const totD = soma(ativas.filter(f => f.tipo === 'despesa'), f => f.valor), totR = soma(ativas.filter(f => f.tipo === 'receita'), f => f.valor);
  const ordenar = l => [...l].sort((a, b) => a.dia - b.dia);
  const lista = (l, tipo) => l.length === 0
    ? <Vazio titulo={tipo === 'receita' ? 'Nenhuma receita fixa' : 'Nenhuma despesa fixa'} texto={tipo === 'receita' ? 'Cadastre o salário e outras entradas que se repetem todo mês.' : 'Cadastre aluguel, escola, internet e outras contas que se repetem todo mês.'} acao="Adicionar" onAcao={() => setGaveta(novo(tipo))} />
    : ordenar(l).map(f => <Linha key={f.id} f={f} info={info} editar={x => setGaveta({ ...x, valor: String(x.valor).replace('.', ','), dia: String(x.dia) })} excluir={excluir} />);
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
    </div>
    {/* fora do .bento: o perspective dele prenderia o painel fixo dentro da grade */}
    {gaveta && <Gaveta inicial={gaveta} cats={cats} nomesMembros={nomesMembros} fechar={() => setGaveta(null)} salvar={salvar} />}
    </>
  );
}
