# Configuração e Credenciais da Appmax - FotoClic

Este documento armazena todas as informações, credenciais e configurações do aplicativo da **FotoClic** na **Appmax** (AppStore / Loja de Aplicativos e Vercel).

---

## 1. Dados do Aplicativo na Appmax

* **Nome do Aplicativo:** FotoClic Checkout
* **ID Numérico do Aplicativo:** `1645`
* **UUID (ID Público):** `c64232f3-47d4-42dd-ba6f-c226cdd02bee`
* **Status:** Configurado / Em Desenvolvimento (Sandbox)

---

## 2. URLs de Configuração (Appmax AppStore)

* **URL de Webhook:**
  ```text
  https://fotoclic.com.br/api/appmax-webhook
  ```
* **URL da sua plataforma:**
  ```text
  https://fotoclic.com.br
  ```
* **URL de validação / Health check:**
  ```text
  https://fotoclic.com.br/api/appmax-webhook
  ```

---

## 3. Credenciais da API (Sandbox)

* **Client ID:**
  ```text
  2486d19b96f94920905602b66d441af8
  ```
* **Client Secret:**
  ```text
  22c2815af74f432a83b96dc1ec1ba200
  ```

---

## 4. Variáveis de Ambiente na Vercel (*Settings > Environment Variables*)

| Nome da Variável | Valor | Ambiente |
| :--- | :--- | :--- |
| **`APPMAX_CLIENT_ID`** | `2486d19b96f94920905602b66d441af8` | Production, Preview, Development |
| **`APPMAX_CLIENT_SECRET`** | `22c2815af74f432a83b96dc1ec1ba200` | Production, Preview, Development |
| **`APPMAX_ENV`** | `sandbox` *(alterar para `production` após aprovação)* | Production, Preview, Development |
| **`SUPABASE_URL`** | `https://jzrrwhuletsknujjfdwa.supabase.co` | Production, Preview, Development |

---

## 5. Histórico e Otimizações de Deploy

* **Limite Vercel Hobby:** A Vercel impõe o limite máximo de 12 Serverless Functions.
* **Solução Implementada:** O endpoint de health check foi unificado no `api/appmax-webhook.js` (mantendo o total em 11 funções), garantindo compilação e deploy sem erros.
* **Autenticação OAuth2:** Testada e validada com sucesso com retorno do token JWT da Appmax.
