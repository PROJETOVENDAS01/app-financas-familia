import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api, temChave, salvarChave, sairDaConta, NaoAutorizado } from './api.js';
import { mesAtual, addMes, mesLabel, mesmaDataEm, memo } from './util.js';
import { Card, Ico } from './ui.jsx';
import Overview from './Overview.jsx';
import { Fixos } from './Fixos.jsx';
import { Transacoes, Metas, Membros, Assistente, Gaveta } from './Telas.jsx';

const NAV = [
  ['geral', 'Visão geral', <svg key="a" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" /></svg>],
  ['transacoes', 'Transações', <svg key="b" viewBox="0 0 24 24"><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" /></svg>],
  ['metas', 'Metas e orçamento', <svg key="c" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>],
  ['fixos', 'Contas fixas', <svg key="f" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18M9 15l2 2 4-4" /></svg>],
  ['membros', 'Por membro', <svg key="d" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .6 3.2 2.3 3.5 5.2" /></svg>],
  ['assistente', 'Assistente', <svg key="e" viewBox="0 0 24 24"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></svg>]
];
const TITULOS = { geral: 'Visão geral', transacoes: 'Transações', metas: 'Metas e orçamento', fixos: 'Contas fixas', membros: 'Por membro', assistente: 'Assistente' };
const CURTO = { geral: 'Geral', transacoes: 'Extrato', metas: 'Metas', fixos: 'Fixas', membros: 'Membros', assistente: 'Assistente' }; // nomes da barra inferior no celular
const TEMAS = ['auto', 'light', 'dark'], ROTULO_TEMA = { auto: 'Tema: automático', light: 'Tema: claro', dark: 'Tema: escuro' };

function useTema() {
  const [pref, setPref] = useState(() => memo('tema') || 'auto');
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const aplicar = () => { document.documentElement.dataset.theme = pref === 'auto' ? (mq.matches ? 'dark' : 'light') : pref; };
    aplicar(); mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, [pref]);
  const trocar = () => { const p = TEMAS[(TEMAS.indexOf(pref) + 1) % 3]; memo('tema', p); setPref(p); };
  return [pref, trocar];
}

function Login({ aoEntrar, erro }) {
  const [c, setC] = useState('');
  return (
    <div className="shell"><div className="login">
      <Card tilt={false}>
        <div className="logo">C</div>
        <h1>Casa</h1>
        <p className="sub" style={{ marginBottom: 20 }}>Digite a chave de acesso da família para ver as finanças.</p>
        <form onSubmit={e => { e.preventDefault(); if (c.trim()) aoEntrar(c.trim()); }}>
          <label className="f">Chave de acesso<input className="field" type="password" value={c} onChange={e => setC(e.target.value)} autoFocus autoComplete="current-password" /></label>
          {erro && <div className="err">{erro}</div>}
          <button className="btn p" type="submit">Entrar</button>
        </form>
      </Card>
    </div></div>
  );
}

export default function App() {
  const [tema, trocarTema] = useTema();
  const [logado, setLogado] = useState(temChave());
  const [erroLogin, setErroLogin] = useState('');
  const [view, setView] = useState('geral');
  const [mes, setMes] = useState(mesAtual());
  const [transacoes, setTransacoes] = useState(null);
  const [config, setConfig] = useState({ orcamentos: {}, membros: [] });
  const [fixos, setFixos] = useState([]);
  const [gaveta, setGaveta] = useState(null);
  const [aviso, setAviso] = useState('');

  const avisar = t => { setAviso(t); setTimeout(() => setAviso(''), 3000); };
  const lidarErro = useCallback(e => {
    if (e instanceof NaoAutorizado) { sairDaConta(); setLogado(false); setErroLogin('Chave incorreta. Confira e tente de novo.'); }
    else avisar(e.message || 'Algo deu errado. Tente de novo.');
  }, []);

  const carregar = useCallback(async () => {
    try {
      const [t, c, f] = await Promise.all([api.listar(), api.config(), api.fixos()]);
      setTransacoes(t); setConfig(c); setFixos(f);
    } catch (e) { lidarErro(e); }
  }, [lidarErro]);

  useEffect(() => {
    if (!logado) return;
    carregar();
    const id = setInterval(() => { if (!document.hidden) carregar(); }, 30000);
    return () => clearInterval(id);
  }, [logado, carregar]);

  const nomesMembros = useMemo(() => [...new Set([...config.membros, ...(transacoes || []).map(t => t.membro).filter(Boolean)])], [config, transacoes]);

  const executar = async fn => { try { await fn(); await carregar(); return true; } catch (e) { lidarErro(e); return false; } };
  const salvar = (dados, id, repetir) => executar(async () => {
    if (id) await api.editar(id, dados);
    else {
      await api.criar(dados);
      if (repetir) for (let i = 1; i <= 11; i++) await api.criar({ ...dados, data: mesmaDataEm(dados.data, i) });
    }
    setGaveta(null); avisar(id ? 'Transação atualizada' : repetir ? 'Transação repetida por 12 meses' : 'Transação adicionada');
  });
  const excluir = t => confirm(`Excluir “${t.descricao || t.categoria}”?`) && executar(async () => { await api.excluir(t.id); avisar('Transação excluída'); });
  const salvarFixo = (dados, id) => executar(async () => { if (id) await api.editarFixo(id, dados); else await api.criarFixo(dados); avisar(id ? 'Conta fixa atualizada' : 'Conta fixa criada'); });
  const excluirFixo = f => confirm(`Excluir “${f.descricao}”? Os lançamentos deste mês e dos próximos também saem; os dos meses anteriores continuam no histórico.`) && executar(async () => { await api.excluirFixo(f.id); avisar('Conta fixa excluída'); });
  const excluirCompra = parcelas => confirm(`Excluir a compra parcelada “${parcelas[0].descricao || parcelas[0].categoria}” inteira (${parcelas.length} parcelas, inclusive as já pagas)?`) && executar(async () => { for (const p of parcelas) await api.excluir(p.id); avisar('Compra parcelada excluída'); });
  const salvarConfig = c => { setConfig(c); executar(async () => { await api.salvarConfig(c); avisar('Salvo'); }); };

  if (!logado) return <Login erro={erroLogin} aoEntrar={c => { salvarChave(c); setErroLogin(''); setLogado(true); }} />;

  // pagar a fatura do cartão não é gasto novo (as compras já entraram): fica fora dos totais, mas aparece na lista de Transações
  const comum = { transacoes: (transacoes || []).filter(t => !t.fatura), config, mes, nomesMembros };
  return (
    <div className="shell">
      <div className="app">
        <aside className="side">
          <div className="brand"><div className="logo">C</div>Casa</div>
          <nav aria-label="Principal">
            {NAV.map(([id, nome, icone]) => (
              <button key={id} className={`nav ${view === id ? 'on' : ''}`} aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}>{icone}<span className="lg">{nome}</span><span className="sm">{CURTO[id]}</span></button>
            ))}
          </nav>
          <div className="sep" />
          {nomesMembros.filter(n => n !== 'Família').slice(0, 4).map(n => <div className="who" key={n}><div className="av" style={{ background: 'var(--brand)' }}>{n[0].toUpperCase()}</div>{n}</div>)}
          <button className="nav" onClick={() => { sairDaConta(); setLogado(false); }}><Ico d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={21} /><span>Sair</span></button>
        </aside>
        <main>
          <header className="top">
            <div><h1>{TITULOS[view]}</h1><div className="sub">{mesLabel(mes)}</div></div>
            <div className="tools">
              <button className="btn" onClick={trocarTema} title="Alternar entre automático, claro e escuro">{ROTULO_TEMA[tema]}</button>
              <div className="pill" role="group" aria-label="Mês">
                <button className="round" aria-label="Mês anterior" onClick={() => setMes(addMes(mes, -1))}><Ico d="M15 18l-6-6 6-6" /></button>
                <span>{mesLabel(mes)}</span>
                <button className="round" aria-label="Próximo mês" onClick={() => setMes(addMes(mes, 1))}><Ico d="M9 18l6-6-6-6" /></button>
              </div>
              <button className="btn sair-m" onClick={() => { sairDaConta(); setLogado(false); }}>Sair</button>
              <button className="btn p hd-nova" onClick={() => setGaveta({})}>Nova transação</button>
            </div>
          </header>
          {transacoes === null ? <div className="skel" /> : <>
            {view === 'geral' && <Overview {...comum} ir={setView} />}
            {view === 'transacoes' && <Transacoes {...comum} transacoes={transacoes} editar={setGaveta} excluir={excluir} nova={() => setGaveta({})} />}
            {view === 'metas' && <Metas {...comum} salvarConfig={salvarConfig} />}
            {view === 'fixos' && <Fixos {...comum} fixos={fixos} salvar={salvarFixo} excluir={excluirFixo} excluirCompra={excluirCompra} />}
            {view === 'membros' && <Membros {...comum} salvarConfig={salvarConfig} />}
            {view === 'assistente' && <Assistente mes={mes} />}
          </>}
        </main>
      </div>
      {gaveta && <Gaveta tx={gaveta} mes={mes} nomesMembros={nomesMembros} fechar={() => setGaveta(null)} salvar={salvar} />}
      {!gaveta && view !== 'assistente' && <button className="fab" aria-label="Nova transação" onClick={() => setGaveta({})}>+</button>}
      {aviso && <div className="toast" role="status">{aviso}</div>}
    </div>
  );
}
