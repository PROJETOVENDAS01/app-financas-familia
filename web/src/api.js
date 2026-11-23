const K = 'apiKey';
const ler = () => { try { return localStorage.getItem(K); } catch { return null; } };

export const temChave = () => !!ler();
export const salvarChave = c => { try { localStorage.setItem(K, c); } catch { /* navegador sem armazenamento */ } };
export const sairDaConta = () => { try { localStorage.removeItem(K); } catch { /* idem */ } };

export class NaoAutorizado extends Error {}

// repetir: se o proxy devolver 502/503/504 (servidor reiniciando num deploy, conexão que caiu), espera e tenta de novo até 3 vezes. Só para chamadas que podem repetir sem efeito duplicado.
const FORA_DO_AR = [502, 503, 504];
async function req(metodo, caminho, corpo, repetir = metodo === 'GET') {
  const enviar = () => fetch(caminho, {
    method: metodo,
    headers: { Authorization: 'Bearer ' + (ler() || ''), 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  let r = await enviar();
  for (let i = 1; i <= 3 && repetir && FORA_DO_AR.includes(r.status); i++) { await new Promise(ok => setTimeout(ok, 2000 * i)); r = await enviar(); }
  if (r.status === 401) throw new NaoAutorizado();
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erro || (FORA_DO_AR.includes(r.status) ? 'O servidor está reiniciando ou fora do ar. Espere uns segundos e tente de novo.' : 'Erro ' + r.status));
  return dados;
}

export const api = {
  listar: () => req('GET', '/api/transacoes'),
  criar: t => req('POST', '/api/transacoes', t),
  editar: (id, t) => req('PUT', '/api/transacoes/' + id, t),
  excluir: id => req('DELETE', '/api/transacoes/' + id),
  pagar: (id, pago) => req('POST', `/api/transacoes/${id}/pago`, { pago }, true),
  cotacao: moeda => req('GET', '/api/cotacao/' + moeda),
  config: () => req('GET', '/api/config'),
  salvarConfig: c => req('PUT', '/api/config', c),
  fixos: () => req('GET', '/api/fixos'),
  criarFixo: f => req('POST', '/api/fixos', f),
  editarFixo: (id, f) => req('PUT', '/api/fixos/' + id, f),
  excluirFixo: id => req('DELETE', '/api/fixos/' + id),
  // O servidor devolve um número de pedido na hora e o Claude responde em seguida: aqui consultamos o resultado em requisições curtas
  perguntar: async (pergunta, mes, historico) => {
    const { id } = await req('POST', '/api/assistente', { pergunta, mes, historico }, true);
    for (let i = 0; i < 60; i++) {
      await new Promise(ok => setTimeout(ok, 1200));
      const r = await req('GET', '/api/assistente/' + id);
      if (r.pronto) { if (r.erro) throw new Error(r.erro); return { resposta: r.resposta }; }
    }
    throw new Error('O assistente demorou demais. Tente de novo.');
  }
};
