# Appmax API v4 & Split de Pagamentos - Guia Técnico Detalhado (FotoClic)

Este documento é a referência técnica completa e detalhada para a futura substituição do gateway de pagamentos no FotoClic (substituindo o Abacate Pay pela **Appmax**). Ele compila todas as diretrizes oficiais de integração via API v4, cadastro no painel admin, regras operacionais e especificações técnicas de **Split de Pagamentos**.

---

## 1. Visão Geral e Requisitos de Integração

A integração via API da Appmax permite que o FotoClic processe pagamentos de ponta a ponta em seu próprio **checkout transparente**, sem redirecionar o cliente para páginas externas ou plataformas de e-commerce.

### Ambientes e Comunicação
* **Arquitetura:** Server-to-Server (Backend em Node.js/Vercel/Supabase Edge Functions).
* **Formato de Dados:** JSON (`Content-Type: application/json`).
* **Base URLs:**
  * **Sandbox (Testes/Homologação):** `https://sandbox.appmax.com.br/api/v4/`
  * **Produção:** `https://api.appmax.com.br/api/v4/`
* **Links Oficiais de Referência Estudados:**
  1. **Integrando por API (Central de Ajuda):** `https://help-center.appmax.com.br/artigos/integrando-por-api`
  2. **Split de Pagamentos (Central de Ajuda):** `https://help-center.appmax.com.br/artigos/split-de-pagamentos-na-appmax`
  3. **FAQ do Desenvolvedor (Docs Oficial):** `https://docs.appmax.com.br/guides/faq`
  4. **Guia de Início Rápido e Referência API (Readme):** `https://appmax.readme.io/reference/guia`

---


## 2. Passo a Passo de Ativação no Painel Administrativo Appmax

Para obter as credenciais e utilizar a API, os seguintes passos no painel admin da Appmax devem ser seguidos:

1. Acesse o **Painel Administrativo Appmax** (`https://admin.appmax.com.br/`).
2. No menu lateral esquerdo, vá em **Aplicativos** > **API**.
3. Clique em **+ Instalar**.
4. **Preencha os Dados Gerais da Loja:**
   * `Nome da Loja`: Nome interno do produto/aplicação (ex: *FotoClic*).
   * `Empresa`: Empresa vinculada à conta.
   * `Página de vendas`: URL oficial da plataforma (ex: `https://fotoclic.com.br`).
   * `Modelo de Negócio`: Selecionar o modelo correspondente (ou *Outros*).
   * `E-mail de suporte`: E-mail de atendimento ao consumidor final.
   * `Telefone de suporte`: Telefone/WhatsApp de suporte da plataforma.
5. Clique em **Avançar**. Na seção **Afiliação Appmax**, clique em **Salvar**.
6. **Solicitação da Chave API:** A chave de API (`API Key` / `Access Token`) deve ser **solicitada diretamente através do chat de suporte da plataforma Appmax**.
7. **Homologação:** Antes da entrada em produção, o conector precisa passar pelo processo de homologação fornecido pela equipe da Appmax.

---

## 3. Autenticação, OAuth2 e Gestão de Tokens

A API do desenvolvedor da Appmax v4 utiliza o fluxo de **OAuth 2.0 (Client Credentials)** com tokens de acesso **JWT** (JSON Web Token).

### 3.1. Diferença Crucial: Credenciais do App vs. Credenciais do Merchant

| Tipo | Onde é obtido | Finalidade Exclusiva | Permissões |
| :--- | :--- | :--- | :--- |
| **Credenciais do App** | Painel do Desenvolvedor (ao criar o aplicativo) | **Apenas** o fluxo inicial de instalação e autorização | **NÃO** pode criar clientes, pedidos ou pagamentos. |
| **Credenciais do Merchant** | Geradas via `POST /app/client/generate` ao fim da instalação | Operações transacionais do dia a dia (clientes, pedidos, split, pagamentos) | Acesso completo para gerenciar vendas da loja vinculada. |

> ⚠️ **Diagnóstico de Erro 401:** Se o backend receber erro `401 Unauthorized` ao tentar criar um `Customer` ou `Order`, 99% das vezes a causa é ter enviado o token das credenciais do aplicativo em vez do token gerado com as **credenciais do Merchant**.

### 3.2. Separação Estrita de Endpoints (Evitando Erro 403)
O servidor de autenticação (OAuth2) é **separado** do servidor de API de recursos. Fazer a requisição de token no host de recursos gera erro `403 Forbidden`.

* **Host de Autenticação OAuth2:** `https://auth.appmax.com.br/oauth2/token` (Sandbox: `https://auth.sandboxappmax.com.br/oauth2/token`)
* **Host da API de Recursos:** `https://api.appmax.com.br/` (Sandbox: `https://api.sandboxappmax.com.br/`)

#### Requisição Padrão de Token OAuth2:
```bash
curl --location 'https://auth.sandboxappmax.com.br/oauth2/token' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'grant_type=client_credentials' \
--data-urlencode 'client_id=MERCHANT_CLIENT_ID' \
--data-urlencode 'client_secret=MERCHANT_CLIENT_SECRET'
```

### 3.3. Tempo de Validade do Token JWT
* **Expiração do Token Access Token (JWT):** Válido por exatamente **1 hora (60 minutos)**.
* **Renovação:** O backend do FotoClic deve implementar um mecanismo de cache de token com renovação automática a cada 55 minutos utilizando o mesmo `client_id` e `client_secret` do Merchant.
* **Permanência das Credenciais:** O `client_id` e `client_secret` do Merchant **não expiram**, permanecendo válidos por tempo indeterminado até que a loja desinstale o aplicativo.

### 3.4. Fluxo Completo de Instalação e Autorização (Prevenindo Erro 500)
1. **Gerar Token do App:** `POST https://auth.sandboxappmax.com.br/oauth2/token` (com credenciais do App).
2. **Gerar Hash de Autorização:** `POST https://api.sandboxappmax.com.br/app/authorize`.
3. **Redirecionar o Usuário/Lojista:** `https://admin.appmax.com.br/appstore/integration/{HASH_GERADO}`.
4. **Gerar Credenciais do Merchant:** `POST https://api.sandboxappmax.com.br/app/client/generate`.
*(Pular a etapa de redirecionamento nº 3 resulta em Erro 500 ao tentar gerar as credenciais).*

### 3.5. Diferença entre `external_key` e `external_id`
* `external_key`: String definida pelo nosso sistema para indicar a origem do cliente/instalação (pode ser repetida).
* `external_id`: UUID único gerado durante o health check da URL de validação. Identifica de forma unívoca a instalação da loja na CDN da Appmax (não pode ser repetido).

---


## 4. Fluxo Completo de Pagamento na API v4

O processamento de um pedido via API exige a execução sequencial de 3 etapas no backend:

### Etapa 1: Cadastro / Atualização do Cliente (`Customer`)
Cria ou atualiza o comprador na base de dados da Appmax.
* **Endpoint:** `POST /api/v4/customers`
* **Campos Obrigatórios:**
  * `firstname` / `lastname` (ou `name`)
  * `email`
  * `cpf` ou `cnpj` (apenas caracteres numéricos)
  * `telephone` (DDI + DDD + Número)
  * `ip` (Endereço IP real do cliente - essencial para a análise de risco antifraude)

### Etapa 2: Criação do Pedido (`Order`)
Vincula o cliente, itens comprados (fotos digitais) e as regras do Split de Pagamentos.
* **Endpoint:** `POST /api/v4/orders`
* **Campos Principais:**
  * `customer_id`: ID numérico retornado na Etapa 1.
  * `products`: Lista de itens (`id`, `title`, `qty`, `price`).
  * `total`: Valor total do pedido em Reais.
  * `split`: Array com a definição da divisão entre plataforma e fotógrafo (ver Seção 5).

### Etapa 3: Execução do Pagamento (`Payment`)
De acordo com o método escolhido pelo usuário no checkout do FotoClic:

#### A. Pagamento via PIX
* **Endpoint:** `POST /api/v4/payments/pix`
* **Payload:** `{ "access_token": "TOKEN", "order_id": ORDER_ID }`
* **Resposta:** Retorna o código "Copia e Cola" (`pix_code`), imagem QR Code e data de expiração.

#### B. Pagamento via Cartão de Crédito
* **Endpoint:** `POST /api/v4/payments/credit-card`
* **Parcelamento em até 21x:**
  * A API permite oferecer parcelamento em até **21x**.
  * **Habilitação:** O parcelamento até 21x precisa ser solicitado e configurado via chat do suporte da Appmax.
  * **Regra de Aprovação:** A aprovação do número de parcelas é de responsabilidade exclusiva do banco emissor do cartão do cliente. Caso o banco não autorize 21x (ou o número selecionado), a transação será recusada pela emissora.
* **Payload:**
  ```json
  {
    "access_token": "TOKEN",
    "order_id": ORDER_ID,
    "payment": {
      "card_token": "TOKEN_GERADO_VIA_APPMAX_JS",
      "installments": 1,
      "cvv": "123"
    }
  }
  ```

---

## 5. Split de Pagamentos na Appmax - Especificação Completa

O **Split de Pagamentos** permite a divisão automática do valor de uma transação entre a plataforma FotoClic e os fotógrafos parceiros no momento da venda.

### 5.1. Regras Fundamentais e Restrições
1. **Versão Exclusiva:** O Split de Pagamentos está disponível exclusivamente na **API v4 da Appmax**.
2. **Momento da Definição:** O split é configurado no payload de criação do pedido (`POST /api/v4/orders`) e vale para toda a transação.
3. **Imutabilidade:** Após a confirmação do pagamento, a regra de divisão **NÃO pode ser alterada**.
4. **Validação de 100%:** A soma dos valores fixos ou porcentagens atribuídas aos recebedores deve fechar em **exatamente 100%** do valor do pedido. Se a soma for superior a 100%, a transação é **automaticamente rejeitada por regra de negócio**.
5. **Meios de Pagamento Suportados:** Cartão de Crédito, PIX e Boleto Bancário.

### 5.2. Operação e Conta dos Recebedores (Fotógrafos)
* **Sem Necessidade de Login:** Os recebedores (fotógrafos) **NÃO precisam acessar ou criar login no painel da Appmax**. Toda a gestão e comunicação acontecem 100% via API pelo backend do FotoClic.
* **Liquidação dos Recebíveis:** Os valores splitados ficam disponíveis para saque do recebedor somente após a **liquidação do recebível**, respeitando o mesmo prazo de vencimento/disponibilização aplicado à conta principal do marketplace (FotoClic).
* **Antecipação:** A antecipação de repasses para recebedores é permitida caso haja limite disponível e sejam respeitadas as regras de crédito e reserva financeira do marketplace.

### 5.3. Fluxo de Cadastro e Onboarding do Recebedor (`Recipient`)
Antes de incluir um fotógrafo no split de um pedido, ele deve ser cadastrado como recebedor na Appmax:
* **Cadastro:** `POST /api/v4/recipients`
* **Verificação KYC / Facematch:** Link gerado em `POST /api/v4/recipients/{id}/facematch` para envio de documentos e biometria facial, se exigido pela análise de conformidade.
* **Consulta de Status:** `GET /api/v4/recipients/{id}` (Somente recebedores com status `active` podem participar do split).

### 5.4. Exemplo de Payload de Pedido com Split
```json
{
  "access_token": "SEU_API_KEY",
  "customer_id": 12345,
  "products": [
    {
      "id": 998,
      "title": "Foto Digital - Maratona 2026",
      "qty": 1,
      "price": 50.00
    }
  ],
  "total": 50.00,
  "split": [
    {
      "recipient_id": "RECIPIENT_ID_FOTOGRAFO",
      "percentage": 80.00,
      "charge_processing_fee": false
    },
    {
      "recipient_id": "RECIPIENT_ID_FOTOCLIC",
      "percentage": 20.00,
      "charge_processing_fee": true
    }
  ]
}
```

### 5.5. Fluxo de Estorno no Split (REGRA CRÍTICA)
* **Estorno Proporcional Automático:** Quando um pedido com split é estornado, o valor do estorno é debitado de forma estritamente **proporcional** do saldo de todos os recebedores que participaram da venda original.
  * *Exemplo:* Em um pedido de R$ 100,00 onde o Lojista recebe R$ 60,00 e dois recebedores recebem R$ 20,00 cada, o estorno gerará um débito de R$ 60,00 no Lojista e R$ 20,00 em cada recebedor.
* **PROIBIÇÃO DE ESTORNO PARCIAL:** Em pedidos que possuem Split de Pagamentos, **O ESTORNO PARCIAL NÃO É SUPORTADO PELA APPMAX**. Qualquer solicitação de estorno em transações com split será **SEMPRE REALIZADA DE FORMA TOTAL (100%)**.

---

## 5.6. Gestão Financeira dos Recebedores via API (Saldos e Saques)
A API V4 da Appmax fornece endpoints para que o sistema consulte e gerencie os saldos e saques dos fotógrafos (recebedores) sem que eles precisem acessar o painel:

* **Consulta de Status do Recebedor:** `GET /api/v4/recipients/{recipient_id}`
  * Retorna o status de aprovação KYC (`active`, `pending`, `blocked`).
* **Consulta de Saldos do Recebedor:** `GET /api/v4/recipients/{recipient_id}/balance`
  * Retorna o saldo disponível para saque, saldo a liquidar (a vencer) e saldo bloqueado por reserva técnica.
* **Simulação de Antecipação de Saque:** `GET /api/v4/recipients/{recipient_id}/withdraw/simulate`
  * Permite calcular taxas e valores líquidos antes de efetivar o saque/antecipação.
* **Solicitação de Saque / Antecipação:** `POST /api/v4/recipients/{recipient_id}/withdraw`
  * Efetiva a transferência do saldo disponível do recebedor diretamente para a conta bancária/PIX cadastrada.

---

## 6. Ciclo de Vida e Status de Pedidos (Orders)

Durante o processamento no gateway, o pedido transita entre os seguintes status oficiais:

| Status | Descrição no FotoClic | Ação Recomendada no Backend |
| :--- | :--- | :--- |
| `pending` | Pedido gerado aguardando pagamento (PIX ou análise). | Manter carrinho reservado. |
| `processing` | Transação em análise antifraude manual/automática. | Aguardar evento do webhook. |
| `approved` / `paid` | Pagamento confirmado com sucesso. | **Liberar fotos em alta resolução** e creditar carteira do fotógrafo. |
| `canceled` / `declined` | Transação recusada pelo banco ou cancelada por expiração de PIX. | Notificar cliente para tentar outro meio de pagamento. |
| `refunded` | Pedido estornado totalmente. | Reverter créditos do fotógrafo e revogar link de download. |

---

## 7. Simulador de Cartões de Crédito em Ambiente Sandbox

Para testar todos os cenários no ambiente de desenvolvimento (`sandbox.appmax.com.br`), a Appmax disponibiliza dados de cartões de teste que simulam aprovações e recusas específicas:

* **Cartão de Aprovação Imediata:**
  * Número: `4000 0000 0000 0001` (Visa) ou `5100 0000 0000 0001` (Mastercard)
  * CVV: `123` | Validade: Qualquer data futura (ex: `12/2030`)
* **Cartão para Teste de Recusa por Saldo Insuficiente:**
  * Número: `4000 0000 0000 0002`
* **Cartão para Teste de Suspeita de Fraude:**
  * Número: `4000 0000 0000 0003`

---

## 8. Recursos Adicionais da API v4

### 8.1. Registro de Código de Rastreio (Tracking Code)
Caso o FotoClic passe a oferecer produtos físicos (quadros, impressões fotográficas, álbuns), o envio do código de rastreamento reduz chargebacks e atualiza o status na Appmax:
* **Endpoint:** `POST /api/v4/orders/{order_id}/tracking`
* **Payload:** `{ "tracking_code": "BR123456789BR", "shipping_company": "Correios" }`

### 8.2. Upsell de 1-Clique (Checkout pós-compra)
Permite oferecer fotos adicionais ao cliente logo após a aprovação da compra original sem re-solicitar os dados do cartão de crédito (utilizando a tokenização do pedido anterior).
* **Endpoint:** `POST /api/v4/orders/{order_id}/upsell`

---

## 9. Webhooks e Notificações (Apphooks)

Para manter o FotoClic sincronizado com as mudanças de status na Appmax:
* **Configuração:** No painel Appmax em *Aplicativos* > *Apphooks* (Webhooks).
* **Principais Eventos:**
  * `order_approved`: Pagamento aprovado -> O backend libera o download em alta resolução da foto para o cliente e registra os créditos na carteira do fotógrafo.
  * `order_refunded`: Estorno efetuado -> O backend ajusta o saldo/extrato e revoga o acesso se necessário.
  * `order_canceled`: Pagamento cancelado ou recusado pela emissora do cartão.
* **Validação:** Todos os webhooks recebidos no webhook worker do Vercel/Supabase devem ter sua assinatura e token verificados para garantir a integridade da notificação.
* **Diagnóstico de Erros (Erro HTTP 502):** Se o painel da Appmax acusar erro `502 Bad Gateway` no disparo de um webhook, a causa é que a URL cadastrada está incorreta ou o servidor de destino (nosso worker) não respondeu com código de sucesso HTTP 200/204 dentro do tempo limite.


---

## 7. Resumo Comparativo: Abacate Pay vs. Appmax

| Funcionalidade | Abacate Pay (Atual) | Appmax (Futuro Gateway) |
| :--- | :--- | :--- |
| **Métodos Principais** | PIX | PIX e Cartão de Crédito (até 21x) |
| **Split de Pagamento** | Disponível via API | Disponível via API v4 (Divisão Proporcional) |
| **Estorno no Split** | Suporta parciais em PIX | **Apenas 100% Total** (Proporcional por recebedor) |
| **Acesso dos Fotógrafos** | Conta bancária / Chave Pix cadastrada | Recebedor via API sem necessidade de login na Appmax |
| **Análise Antifraude** | Básica | Antifraude Nativa integrada no Cartão |
