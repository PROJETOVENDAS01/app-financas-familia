# 📌 PROMPT PARA COLAR NO CLAUDE CODE DESKTOP

Copie todo o texto abaixo e cole no seu chat Claude Code:

---

```
Configurar e rodar app financeiro familiar com acessor WhatsApp

Arquivos já existem em /mnt/user-data/outputs/:
- server.js (backend Express + webhook)
- index.html (app web completo)
- package.json (dependências)
- .env.example (template de config)

Tarefas:

1. Criar pasta `app-financas` no seu projeto
2. Copiar server.js, package.json, index.html de /mnt/user-data/outputs/ para lá
3. Instalar dependências: npm install
4. Criar .env local baseado em .env.example:
   - EVOLUTION_TOKEN: coloque aqui (vem do painel Evolution)
   - EVOLUTION_URL: deixe como está
   - WHATSAPP_NUMBER: seu número com código país (ex: 5521988887777)
   - PORT: 3000
5. Testar servidor: npm start
6. Validar que app abre em http://localhost:3000
7. Configurar webhook na Evolution API para: http://seu_ip:3000/webhook/whatsapp

Pronto! Sistema rodando. Depois:
- Envie "gasto 50 comida" no WhatsApp
- Envie "resumo" para ver saldo do mês
```

---

## ✅ O que vai rodar

**Backend:**
- Express no port 3000
- Webhook para receber mensagens WhatsApp
- Banco JSON (transacoes.json) para guardar dados
- API para app web ler/salvar transações

**App web:**
- Dashboard com gráficos
- Transações (add/edit/delete)
- Cartão de crédito (aba dedicada)
- Categorias customizáveis
- Membros da família

**WhatsApp:**
- Registrar gasto: "gasto 50 comida"
- Registrar receita: "receita 1000 salário"
- Ver resumo: "resumo"

---

## 🔑 Dados Evolution API

Precisa pegar:
1. **Token API**: Painel Evolution → Instâncias → copie o token
2. **Webhook URL**: Configure em Evolution → Webhooks → POST http://seu_ip:3000/webhook/whatsapp
3. **Número WhatsApp**: use um número da sua conta Evolution (formato: 55 + DDD + número)

---

**Cole o prompt acima no Claude Code Desktop e deixe que ele configure tudo!**
