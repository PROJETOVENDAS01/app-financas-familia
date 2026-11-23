const K = 'apiKey';
const ler = () => { try { return localStorage.getItem(K); } catch { return null; } };

export const temChave = () => !!ler();
export const salvarChave = c => { try { localStorage.setItem(K, c); } catch { /* navegador sem armazenamento */ } };
export const sairDaConta = () => { try { localStorage.removeItem(K); } catch { /* idem */ } };

export class NaoAutorizado extends Error {}

async function req(metodo, caminho, corpo) {
  const r = await fetch(caminho, {
    method: metodo,
    headers: { Authorization: 'Bearer ' + (ler() || ''), 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  if (r.status === 401) throw new NaoAutorizado();
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erro || 'Erro ' + r.status);
  return dados;
}

export const api = {
  listar: () => req('GET', '/api/transacoes'),
  criar: t => req('POST', '/api/transacoes', t),
  editar: (id, t) => req('PUT', '/api/transacoes/' + id, t),
  excluir: id => req('DELETE', '/api/transacoes/' + id),
  pagar: (id, pago) => req('POST', `/api/transacoes/${id}/pago`, { pago }),
  cotacao: moeda => req('GET', '/api/cotacao/' + moeda),
  config: () => req('GET', '/api/config'),
  salvarConfig: c => req('PUT', '/api/config', c),
  fixos: () => req('GET', '/api/fixos'),
  criarFixo: f => req('POST', '/api/fixos', f),
  editarFixo: (id, f) => req('PUT', '/api/fixos/' + id, f),
  excluirFixo: id => req('DELETE', '/api/fixos/' + id),
  perguntar: (pergunta, mes, historico) => req('POST', '/api/assistente', { pergunta, mes, historico })
};
