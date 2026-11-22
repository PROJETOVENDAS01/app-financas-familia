# 🔧 Guia de Debug: Webhook WhatsApp

## Problema: "Registrei com sucesso, mas não recebi resposta no WhatsApp"

### Passo 1: Validar que o webhook recebeu a mensagem

1. **Rode o servidor com npm start**
2. **Envie uma mensagem**: `gasto 50 comida`
3. **Veja o console** - procure por:
   ```
   📨 Webhook recebido: { ... dados da mensagem ... }
   ```

Se **NÃO** aparecer nada:
- ❌ A Evolution não está encontrando seu webhook
- Cheque se a URL no painel Evolution é: `http://seu_ip:3000/webhook/whatsapp`
- Se está em **casa/localhost**, use `ngrok` ou `cloudflared` para expor a porta

---

### Passo 2: Validar que a transação foi registrada

Mesmo sem resposta WhatsApp, cheque `transacoes.json`:
```bash
cat transacoes.json
```

Se aparecer a transação registrada:
- ✅ Webhook funciona
- ❌ Problema é só o envio de resposta

---

### Passo 3: Verificar autenticação Evolution

No console, procure por:
```
❌ Erro ao enviar WhatsApp: { status: 401, ... }
```

**Se status 401 (não autorizado):**

Sua Evolution pode estar usando `apikey` em vez de `Bearer`. **Solução:**

1. Abra seu `.env` em `C:\projetos\app-financas\.env`
2. Mude:
```
EVOLUTION_AUTH_TYPE=apikey
```
3. Salve e rode novamente

---

### Passo 4: Checar o formato da mensagem

Se a transação **NÃO** foi registrada (nada em `transacoes.json`):

Adicione um `console.log` para ver o que veio:

**Em server.js, linha ~52, após `let text = ...`, adicione:**
```javascript
console.log('📝 Texto recebido:', text);
console.log('📝 Padrão regex esperado: "gasto 50 comida" ou "receita 1000 salário"');
```

Depois rode de novo e veja o que está chegando no console.

**Se a mensagem chegar em formato diferente** (ex: em `conversation` em vez de `text`), o código já trata isso.

---

### Passo 5: Testar com curl (sem WhatsApp)

Simule um webhook:

```bash
curl -X POST http://localhost:3000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "message": {
        "remoteJid": "5521988887777@s.whatsapp.net",
        "text": "gasto 50 comida"
      }
    }
  }'
```

Veja o console - deve registrar e tentar enviar resposta.

---

## Checklist Rápido

- [ ] `npm start` roda sem erro
- [ ] Webhook está configurado na Evolution
- [ ] `EVOLUTION_TOKEN` está preenchido e válido
- [ ] `WHATSAPP_NUMBER` está no formato correto (55 + DDD + número)
- [ ] Enviou "gasto 50 comida" e viu `transacoes.json` registrar
- [ ] Recebeu resposta no WhatsApp? Se não, debugue Passo 3-5

---

## Dúvida Comum: "Testei e funcionou, agora para de funcionar"

**Causas:**
1. Token expirou → regenere na Evolution
2. Número da instância errado → confirme em Evolution > Instâncias
3. Webhook URL errada → reconfigure

**Teste rápido:**
```bash
curl -X POST http://localhost:3000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"data": {"message": {"remoteJid": "seu_número", "text": "gasto 10 teste"}}}'
```

Se falhar aqui, está tudo certo (webhook ok). Se registrar em `transacoes.json`, o problema é só a resposta (autenticação Evolution).

---

**Precisa de mais ajuda? Cole o erro completo do console aqui!**
