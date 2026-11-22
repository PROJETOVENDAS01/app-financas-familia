import React, { useMemo, useState } from 'react';
import { Card, Anel, Avatar, Lancamento, Vazio } from './ui.jsx';
import { DESPESAS, brl, brl0, hoje, mesAtual, diasNoMes, soma, corMembro, memo } from './util.js';
import { api } from './api.js';

const PROMPT_INSIGHT = 'Faça uma análise curta do mês: o que está fora do normal, comparado ao mês anterior, e uma ação concreta para fechar o mês dentro das metas.';

function Ritmo({ doMes, mes, limite }) {
  const dias = diasNoMes(mes);
  const dia = mes === mesAtual() ? Number(hoje().slice(8, 10)) : dias;
  const porDia = Array(dias + 1).fill(0);
  doMes.filter(t => t.tipo === 'despesa').forEach(t => { porDia[Number(t.data.slice(8, 10))] += t.valor; });
  const acum = []; let s = 0;
  for (let d = 0; d <= dia; d++) { s += porDia[d]; acum.push(s); }
  const W = 640, H = 130, M = Math.max(limite, s * 1.1, 1);
  const x = i => i * W / dias, y = v => H - v / M * H;
  const pa = acum.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const lx = x(acum.length - 1), ly = y(s);
  return (
    <svg viewBox={`0 0 ${W} ${H + 6}`} width="100%" role="img" aria-label="Gasto acumulado ao longo do mês">
      <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--brand)" stopOpacity=".3" /><stop offset="1" stopColor="var(--brand)" stopOpacity="0" /></linearGradient></defs>
      {limite > 0 && <polyline points={`0,${H} ${W},${y(limite)}`} fill="none" stroke="var(--sub)" strokeWidth="1.5" strokeDasharray="5 5" opacity=".7" />}
      <polygon points={`0,${H} ${pa} ${lx},${H}`} fill="url(#ag)" />
      <polyline points={pa} fill="none" stroke="var(--brand)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="10" fill="var(--brand)" opacity=".18" />
      <circle cx={lx} cy={ly} r="5.5" fill="var(--brand)" stroke="var(--card)" strokeWidth="2" />
    </svg>
  );
}

export default function Overview({ transacoes, config, mes, ir, nomesMembros }) {
  const doMes = useMemo(() => transacoes.filter(t => t.data.startsWith(mes)), [transacoes, mes]);
  const desp = doMes.filter(t => t.tipo === 'despesa'), rec = doMes.filter(t => t.tipo === 'receita');
  const totD = soma(desp), totR = soma(rec);
  const limite = soma(Object.entries(config.orcamentos).filter(([k]) => k !== 'Renda'), ([, v]) => v);
  const dias = diasNoMes(mes), atual = mes === mesAtual(), dia = atual ? Number(hoje().slice(8, 10)) : dias;
  const ideal = limite * dia / dias, diff = totD - ideal;
  const restante = limite - totD;

  const chave = 'insight-' + mes;
  const [insight, setInsight] = useState(() => memo(chave) || '');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const gerar = async () => {
    setCarregando(true); setErro('');
    try { const { resposta } = await api.perguntar(PROMPT_INSIGHT, mes); setInsight(resposta); memo(chave, resposta); }
    catch (e) { setErro(e.message); }
    setCarregando(false);
  };

  const gastoCat = n => soma(desp.filter(t => t.categoria === n));
  const porMembro = nomesMembros.map(n => ({ n, v: soma(desp.filter(t => t.membro === n)) })).filter(m => m.v > 0 || config.membros.includes(m.n));
  const maxM = Math.max(...porMembro.map(m => m.v), 1);

  return (
    <div className="bento">
      <Card className="c8">
        <div className="lab">{limite > 0 ? (restante >= 0 ? 'Você ainda pode gastar' : 'Você passou do orçamento em') : 'Gasto no mês'}</div>
        <div className="big">
          {brl(limite > 0 ? Math.abs(restante) : totD)}{' '}
          <small>{limite > 0 ? `de ${brl0(limite)} orçados` : 'defina metas para acompanhar o ritmo'}</small>
        </div>
        {limite > 0 && atual && (diff > 0
          ? <span className="tag warn">▲ {brl0(diff)} acima do ritmo ideal</span>
          : <span className="tag ok">▼ {brl0(-diff)} abaixo do ritmo ideal</span>)}
        {limite === 0 && <button className="btn p" onClick={() => ir('metas')}>Definir metas</button>}
        <div className="chart"><Ritmo doMes={doMes} mes={mes} limite={limite} /></div>
        <div className="legend"><span>● gasto acumulado</span>{limite > 0 && <span>┄ ritmo ideal</span>}</div>
        <div className="stats">
          <div><span className="lab">Receitas</span><b className="inc">{brl(totR)}</b></div>
          <div><span className="lab">Despesas</span><b className="exp">{brl(totD)}</b></div>
          <div><span className="lab">Saldo</span><b>{brl(totR - totD)}</b></div>
        </div>
      </Card>

      <Card className="c4 ai">
        <div className="spark"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.2 6.3L21 11l-6.8 2.7L12 20l-2.2-6.3L3 11l6.8-2.7z" /></svg></div>
        <div className="lab" style={{ marginBottom: 6 }}>Assistente</div>
        {insight ? <p>{insight}</p> : <p>Peça uma análise do mês e receba uma dica prática com base nos seus lançamentos.</p>}
        {erro && <div className="err" style={{ marginTop: 10 }}>{erro}</div>}
        <div className="btns">
          <button className="btn p" onClick={gerar} disabled={carregando}>{carregando ? 'Analisando…' : insight ? 'Gerar nova análise' : 'Analisar meu mês'}</button>
          <button className="btn" onClick={() => ir('assistente')}>Fazer uma pergunta</button>
        </div>
      </Card>

      <Card className="c12">
        <h3>Categorias <button className="link" onClick={() => ir('metas')}>Metas</button></h3>
        <div className="rrow">
          {DESPESAS.map(c => {
            const g = gastoCat(c.n), l = config.orcamentos[c.n] || 0, passou = l > 0 && g > l;
            return (
              <div className="r" key={c.n}>
                <Anel pct={l > 0 ? g / l : totD > 0 ? g / totD : 0} cor={passou ? 'var(--exp)' : c.c} emoji={c.e} />
                <div className="n">{c.n}</div>
                <div className={`v ${passou ? 'over' : ''}`}>{l > 0 ? (passou ? `${brl0(g - l)} acima` : `${brl0(l - g)} restam`) : brl0(g)}</div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="c12">
        <h3>Gastos por tipo</h3>
        {desp.length === 0 ? <div className="sub">Sem gastos neste mês.</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {(() => {
              const subs = {};
              desp.forEach(t => {
                const key = t.subcategoria || t.categoria;
                subs[key] = (subs[key] || 0) + t.valor;
              });
              return Object.entries(subs).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([sub, v]) => (
                <div key={sub} style={{ padding: 12, border: '1px solid var(--rule)', borderRadius: 12, background: 'var(--card)' }}>
                  <div style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 8 }}>{sub}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{brl0(v)}</div>
                  <div style={{ height: 4, background: 'var(--track)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${v / Math.max(...Object.values(subs)) * 100}%`, background: 'var(--brand)' }} />
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </Card>

      <Card className="c4">
        <h3>Por membro <button className="link" onClick={() => ir('membros')}>Ver</button></h3>
        {porMembro.length === 0 && <div className="sub">Sem gastos neste mês.</div>}
        {porMembro.map(m => (
          <div className="mem" key={m.n}>
            <Avatar nome={m.n} cor={corMembro(m.n)} />
            <div className="t"><div className="n">{m.n}</div><div className="bar"><i style={{ width: `${m.v / maxM * 100}%`, background: corMembro(m.n) }} /></div></div>
            <div className="v">{brl0(m.v)}</div>
          </div>
        ))}
      </Card>

      <Card className="c8">
        <h3>Últimos lançamentos <button className="link" onClick={() => ir('transacoes')}>Ver todos</button></h3>
        {doMes.length === 0
          ? <Vazio titulo="Nenhum lançamento neste mês" texto="Mande “gasto 50 pão” pelo WhatsApp ou adicione aqui." />
          : [...doMes].sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id).slice(0, 5).map(t => <Lancamento key={t.id} t={t} />)}
      </Card>
    </div>
  );
}
