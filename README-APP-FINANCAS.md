# 💰 App Financeiro Familiar + Acessor WhatsApp

**App web completo + Bot WhatsApp integrado via Evolution API**

---

## 🎯 O Que Faz

### App Web (HTML)
✅ Dashboard com gráficos  
✅ Registrar transações (receita/despesa)  
✅ Editar e deletar transações  
✅ Aba específica para Cartão de Crédito  
✅ Gerenciar categorias (add/delete)  
✅ Gerenciar membros da família  
✅ Gráficos de despesas por categoria  
✅ Destacar gastos em cartão  

### Acessor WhatsApp
📱 Registrar transações via chat:
```
Você: "gasto 50 comida"
Bot:  "✅ 📤 R$ 50.00 em comida registrado!"

Você: "receita 1000 salário"
Bot:  "✅ 📥 R$ 1000.00 em salário registrado!"

Você: "resumo"
Bot:  "📊 Este Mês
     📥 Receitas: R$ X.XX
     📤 Despesas: R$ X.XX
     💰 Saldo: R$ X.XX"
```

---

## 🚀 Setup (Claude Code Desktop)

### 1. Criar pasta e colar arquivos
```bash
mkdir app-financas
cd app-financas
# Cole aqui: server.js, package.json, index.html
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
```bash
# Criar arquivo .env (ou set no seu sistema)
EVOLUTION_TOKEN=seu_token_evolution_aqui
EVOLUTION_URL=https://api.evolution.com.br
WHATSAPP_NUMBER=5521000000000
PORT=3000
```

### 4. Rodar servidor
```bash
npm start
# Vai abrir em http://localhost:3000
```

---

## 📱 Integrar com Evolution API

### Configurar webhook na Evolution
1. Acesse painel.evolution.com.br
2. Vá em **Webhooks**
3. Adicione URL: `http://seu_ip:3000/webhook/whatsapp`
4. Tipo: `messages`
5. Salve

### Obter token
1. Em **Instâncias**, copie seu **token API**
2. Cole no `.env` como `EVOLUTION_TOKEN`

### Número WhatsApp
1. Use um número da sua conta Evolution
2. Cole no `.env` como `WHATSAPP_NUMBER` (formato: `5521988887777`)

---

## 📂 Arquivos

| Arquivo | O Quê |
|---------|-------|
| `server.js` | Backend Express + Webhook WhatsApp |
| `index.html` | App web completo |
| `package.json` | Dependências Node |
| `transacoes.json` | Banco de dados (criado automaticamente) |

---

## 💬 Comandos WhatsApp Disponíveis

| Comando | O Que Faz |
|---------|-----------|
| `gasto 50 comida` | Registra despesa |
| `receita 1000 salário` | Registra receita |
| `resumo` | Mostra total do mês |
| `saldo` | Mesmo que resumo |
| `gastos` | Mesmo que resumo |
| (qualquer outra) | Mostra ajuda |

---

## 🔄 Fluxo de Dados

```
WhatsApp → Webhook (Evolution) → server.js → transacoes.json
                                    ↓
                               App web (HTTP)
                                    ↓
                              localStorage (front)
```

**Sincronização:**
- WhatsApp registra direto no servidor
- App web pode ler do servidor via `/api/transacoes`
- LocalStorage do app web é local (backup)

---

## ⚙️ Customizações

### Mudar padrão de mensagens
Editar em `server.js`, na função `enviarWhatsApp()`:
```javascript
// Linha ~80: customize as respostas
```

### Adicionar novos comandos WhatsApp
Editar em `server.js`, no webhook (linhas ~50-100):
```javascript
if (mensagem.includes('seu_comando')) {
  // Faça algo
  await enviarWhatsApp(remoteJid, 'resposta');
}
```

---

## 🐛 Troubleshooting

**"Erro de conexão com Evolution"**
- Cheque EVOLUTION_TOKEN
- Cheque EVOLUTION_URL
- Cheque firewall/porta 3000

**"Webhook não recebe mensagens"**
- Confirme URL webhook na Evolution
- Cheque firewall (permita entrada porta 3000)
- Teste com `curl -X POST http://localhost:3000/webhook/whatsapp`

**"App não carrega dados do servidor"**
- Cheque se server está rodando (`npm start`)
- Abra console do navegador (F12) e procure erros
- Cheque se `/api/transacoes` retorna dados

---

## 📞 Suporte

Dúvidas? Teste comandos no WhatsApp ou abra console (F12) para ver erros.

---

**Feito com ❤️ para o Boni**
