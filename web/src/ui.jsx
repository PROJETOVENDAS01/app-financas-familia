import React, { useRef } from 'react';
import { catInfo, brl } from './util.js';

const reduzir = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Card com inclinação 3D e brilho que segue o cursor
export function Card({ className = '', tilt = true, children, ...resto }) {
  const ref = useRef(null);
  const mover = e => {
    if (reduzir()) return;
    const el = ref.current, r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', x * 100 + '%');
    el.style.setProperty('--my', y * 100 + '%');
    el.style.transform = `rotateX(${(.5 - y) * 6}deg) rotateY(${(x - .5) * 8}deg) translateY(-3px)`;
  };
  const sair = () => { if (ref.current) ref.current.style.transform = ''; };
  return (
    <section ref={ref} className={`card ${tilt ? 'tilt' : ''} ${className}`}
      onPointerMove={tilt ? mover : undefined} onPointerLeave={tilt ? sair : undefined} {...resto}>
      {children}
    </section>
  );
}

// Anel de progresso com o emoji da categoria no meio
export function Anel({ pct, cor, emoji, tam = 92 }) {
  const C = 2 * Math.PI * 38;
  const p = Math.max(0, Math.min(pct, 1));
  return (
    <svg viewBox="0 0 92 92" width={tam} height={tam} aria-hidden="true">
      <circle cx="46" cy="46" r="38" fill="none" stroke="var(--track)" strokeWidth="7" />
      <circle cx="46" cy="46" r="38" fill="none" stroke={cor} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${C * p} ${C}`} transform="rotate(-90 46 46)" />
      <text x="46" y="55" textAnchor="middle" fontSize="26">{emoji}</text>
    </svg>
  );
}

export function Avatar({ nome, cor, grande }) {
  return <div className={`av ${grande ? 'lg' : ''}`} style={{ background: cor }}>{nome.charAt(0).toUpperCase()}</div>;
}

export function Lancamento({ t, onEditar, onExcluir }) {
  const c = catInfo(t.categoria);
  const doZap = t.origem === 'whatsapp';
  return (
    <div className="li">
      <div className="dot" aria-hidden="true">{c.e}</div>
      <div style={{ minWidth: 0 }}>
        <div className="n">{t.descricao || t.categoria}{doZap && <span className="wa">WhatsApp</span>}{t.origem === 'fixo' && <span className="wa">Fixa</span>}{t.variavel && !t.confirmado && <span className="wa">Valor estimado</span>}{t.cartao && <span className="wa cc">Cartão</span>}{t.parcelas > 1 && <span className="wa cc">{t.parcela}/{t.parcelas}</span>}{t.fatura && <span className="wa cc">Fatura</span>}</div>
        <div className="m">{t.categoria} · {t.membro}</div>
      </div>
      <div className={`v ${t.tipo === 'receita' ? 'inc' : 'exp'}`}>{t.tipo === 'receita' ? '+' : '−'} {brl(t.valor)}</div>
      {onEditar && (
        <div className="acts">
          <button className="round" aria-label="Editar" onClick={() => onEditar(t)}><Ico d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></button>
          <button className="round" aria-label="Excluir" onClick={() => onExcluir(t)}><Ico d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></button>
        </div>
      )}
    </div>
  );
}

export const Ico = ({ d, size = 18 }) => (
  <svg className="ic" style={{ width: size, height: size }} viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
);

export const Vazio = ({ titulo, texto, acao, onAcao }) => (
  <div className="empty"><b>{titulo}</b>{texto}{acao && <div className="btns" style={{ justifyContent: 'center' }}><button className="btn p" onClick={onAcao}>{acao}</button></div>}</div>
);
