const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const TRANSACOES_FILE = path.join(__dirname, 'transacoes.json');
const EVOLUTION_TOKEN = process.env.EVOLUTION_TOKEN || 'seu_token_aqui';
const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://api.evolution.com.br';
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '5521000000000';

// Inicializar arquivo de transações
if (!fs.existsSync(TRANSACOES_FILE)) {
  fs.writeFileSync(TRANSACOES_FILE, JSON.stringify({ transacoes: [] }));
}

// Buscar transações do servidor
app.get('/api/transacoes', (req, res) => {
  const data = JSON.parse(fs.readFileSync(TRANSACOES_FILE));
  res.json(data.transacoes);
});

// Salvar transação do app web
app.post('/api/transacoes', (req, res) => {
  const { tipo, data, valor, categoria, descricao, membro, cartao } = req.body;
  
  const data_obj = JSON.parse(fs.readFileSync(TRANSACOES_FILE));
  const novaTransacao = {
    id: Date.now(),
    tipo, data, valor, categoria, descricao, membro, cartao
  };
  
  data_obj.transacoes.push(novaTransacao);
  fs.writeFileSync(TRANSACOES_FILE, JSON.stringify(data_obj, null, 2));
  
  res.json({ success: true, id: novaTransacao.id });
});

// Webhook Evolution API - receber mensagens WhatsApp
app.post('/webhook/whatsapp', async (req, res) => {
  res.status(200).send('OK');

  const { data } = req.body;
  if (!data || !data.message) return;

  const jid = data.key?.remoteJid;
  if (!jid) return;
  const numeroRemetente = jid.split('@')[0];
  const { messageType } = data.message;

  // Evolution v2 pode enviar em conversation, v1 em text
  let text = data.message.text || data.message.conversation;
  if (!text) return;

  const mensagem = text.toLowerCase().trim();
  
  // Padrões: "gasto 50 comida", "receita 1000 salário", etc
  const regex = /^(gasto|receita)\s+([0-9,.]+)\s+(.+)$/;
  const match = mensagem.match(regex);
  
  if (match) {
    const [_, tipo_msg, valor_str, categoria] = match;
    const valor = parseFloat(valor_str.replace(',', '.'));
    const tipo = tipo_msg === 'gasto' ? 'despesa' : 'receita';
    
    // Salvar
    const data_obj = JSON.parse(fs.readFileSync(TRANSACOES_FILE));
    data_obj.transacoes.push({
      id: Date.now(),
      tipo,
      data: new Date().toISOString().split('T')[0],
      valor,
      categoria: categoria.trim(),
      descricao: `Registrado por WhatsApp`,
      membro: 'Família',
      cartao: false
    });
    fs.writeFileSync(TRANSACOES_FILE, JSON.stringify(data_obj, null, 2));
    
    // Responder
    await enviarWhatsApp(numeroRemetente, `✅ ${tipo === 'despesa' ? '📤' : '📥'} R$ ${valor.toFixed(2)} em ${categoria} registrado!`);
    return;
  }
  
  // Comando: "resumo" ou "saldo"
  if (mensagem.includes('resumo') || mensagem.includes('saldo') || mensagem.includes('gastos')) {
    const data_obj = JSON.parse(fs.readFileSync(TRANSACOES_FILE));
    const mes_atual = new Date().getMonth();
    const ano_atual = new Date().getFullYear();
    
    const trans_mes = data_obj.transacoes.filter(t => {
      const d = new Date(t.data + 'T00:00:00');
      return d.getMonth() === mes_atual && d.getFullYear() === ano_atual;
    });
    
    const receitas = trans_mes.filter(t => t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);
    const despesas = trans_mes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + t.valor, 0);
    const saldo = receitas - despesas;
    
    const msg = `📊 *Este Mês*\n📥 Receitas: R$ ${receitas.toFixed(2)}\n📤 Despesas: R$ ${despesas.toFixed(2)}\n💰 Saldo: R$ ${saldo.toFixed(2)}`;
    await enviarWhatsApp(numeroRemetente, msg);
    return;
  }
  
  // Padrão
  await enviarWhatsApp(numeroRemetente, `💡 Use: "gasto 50 comida" ou "receita 1000 salário"\nOu peça: "resumo", "saldo", "gastos"`);
});

async function enviarWhatsApp(numero, mensagem) {
  try {
    // Evolution pode usar Bearer ou apikey - tenta Bearer primeiro
    const headers = process.env.EVOLUTION_AUTH_TYPE === 'apikey'
      ? { 'apikey': EVOLUTION_TOKEN }
      : { 'Authorization': `Bearer ${EVOLUTION_TOKEN}` };

    await axios.post(`${EVOLUTION_URL}/message/sendText/app-financas`, {
      number: numero,
      text: mensagem
    }, {
      headers,
      timeout: 5000
    });
    console.log(`✅ Mensagem enviada para ${numero}`);
  } catch (err) {
    console.error(`❌ Erro ao enviar WhatsApp:`, {
      numero,
      status: err.response?.status,
      erro: err.message,
      dados: err.response?.data
    });
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📱 Webhook: POST http://localhost:${PORT}/webhook/whatsapp`);
});
