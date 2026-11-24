import React, { useState } from 'react';
import { Avatar, Ico, Lancamento, Vazio } from './ui.jsx';
import { brl, brl0, soma, corMembro, mesLabel } from './util.js';

// Gaveta com os lançamentos de uma categoria (ou do cartão) no mês: quem gastou, por subcategoria e por pessoa, com os mesmos lançamentos da tela Transações
export function Detalhe({ titulo, emoji, mes, itens, rotuloDe, nomeRotulo, subInicial = '', limite = 0, fechar, editar, excluir }) {
  const [rotulo, setRotulo] = useState(subInicial), [membro, setMembro] = useState('');
  const porRotulo = {}, porMembro = {};
  itens.forEach(t => { const r = rotuloDe(t); porRotulo[r] = (porRotulo[r] || 0) + t.valor; porMembro[t.membro] = (porMembro[t.membro] || 0) + t.valor; });
  const rotulos = Object.entries(porRotulo).sort((a, b) => b[1] - a[1]), membros = Object.entries(porMembro).sort((a, b) => b[1] - a[1]);
  const rotAtivo = porRotulo[rotulo] ? rotulo : '', memAtivo = porMembro[membro] ? membro : ''; // some o filtro se o último lançamento dele foi apagado
  const lista = itens.filter(t => (!rotAtivo || rotuloDe(t) === rotAtivo) && (!memAtivo || t.membro === memAtivo)).sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
  const total = soma(itens), maxM = Math.max(...membros.map(m => m[1]), 1);
  const filtrando = rotAtivo || memAtivo;
  return (
    <>
      <div className="scrim" onClick={fechar} />
      <div className="drawer wide" role="dialog" aria-label={`Lançamentos de ${titulo}`}>
        <h2><span>{emoji} {titulo}</span><button type="button" className="round" aria-label="Fechar" onClick={fechar}><Ico d="M18 6 6 18M6 6l12 12" /></button></h2>
        <div className="sub">{mesLabel(mes)}</div>
        <div className="det-tot">{brl(total)}</div>
        {limite > 0 && <div className={`sub ${total > limite ? 'exp' : ''}`} style={{ marginBottom: 6 }}>{total > limite ? `${brl0(total - limite)} acima` : `${brl0(limite - total)} restam`} da meta de {brl0(limite)}</div>}

        {membros.length > 0 && <>
          <div className="lab det-lab">Quem gastou</div>
          {membros.map(([n, v]) => (
            <button type="button" key={n} className={`mem fil ${memAtivo === n ? 'on' : ''}`} aria-pressed={memAtivo === n} onClick={() => setMembro(memAtivo === n ? '' : n)}>
              <Avatar nome={n} cor={corMembro(n)} />
              <div className="t"><div className="n">{n}</div><div className="bar"><i style={{ width: `${v / maxM * 100}%`, background: corMembro(n) }} /></div></div>
              <div className="v">{brl(v)}</div>
            </button>
          ))}
        </>}

        {rotulos.length > 1 && <>
          <div className="lab det-lab">{nomeRotulo}</div>
          <div className="fchips">
            <button type="button" className={`fchip ${!rotAtivo ? 'on' : ''}`} onClick={() => setRotulo('')}>Todas</button>
            {rotulos.map(([r, v]) => <button type="button" key={r} className={`fchip ${rotAtivo === r ? 'on' : ''}`} aria-pressed={rotAtivo === r} onClick={() => setRotulo(rotAtivo === r ? '' : r)}>{r} · {brl0(v)}</button>)}
          </div>
        </>}

        <div className="lab det-lab">{lista.length} {lista.length === 1 ? 'lançamento' : 'lançamentos'}{filtrando ? ` · ${brl(soma(lista))}` : ''}</div>
        {lista.length === 0
          ? <Vazio titulo="Nenhum lançamento" texto={filtrando ? 'Tire um filtro para ver os outros.' : 'Não há lançamentos aqui neste mês.'} />
          : lista.map(t => <Lancamento key={t.id} t={t} onEditar={editar} onExcluir={excluir} />)}
      </div>
    </>
  );
}
