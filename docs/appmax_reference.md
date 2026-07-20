# Appmax API v4 - Guia Técnico de Integração (FotoClic)

Este documento centraliza todas as especificações técnicas, fluxos de integração e regras de negócio da **Appmax API v4** para servir como base de conhecimento para a futura substituição do gateway de pagamentos no FotoClic.

---

## 1. Visão Geral e Arquitetura

A Appmax utiliza uma arquitetura baseada em endpoints RESTful (HTTPS) e comunicação **Server-to-Server** (Backend). 
* **Formato de dados:** JSON (`Content-Type: application/json`)
* **Diferença de Ambientes:**
  * **Sandbox:** Para testes e homologação (`https://sandbox.appmax.com.br/api/v4/`)
  * **Produção:** Ambiente real (`https://api.appmax.com.br/api/v4/`)

---

## 2. Autenticação e Segurança

A API adota um modelo de autenticação direto baseado em **API Token**, enviado no corpo das requisições (payload JSON) ou nos headers HTTP para chamadas específicas.
* **Modelo sem Refresh Token:** Por ser comunicação direta entre servidores confiáveis (Backend-to-Backend), a chave API é persistente e configurada nas variáveis de ambiente do servidor.
* **Payload de Autenticação:**
  ```json
  {
    "access_token": "SEU_API_TOKEN"
  }
  ```

---

## 3. Fluxo de Pagamento Integrado

Para processar uma venda na Appmax de ponta a ponta, o backend deve executar três etapas obrigatórias na sequência lógica:

### Passo 1: Criar ou Atualizar o Cliente (`Customer`)
Antes de gerar o pedido, é necessário cadastrar o cliente na base da Appmax.
* **Endpoint:** `POST /api/v4/customers`
* **Campos principais:**
  * `firstname` / `lastname` (ou `name`)
  * `email`
  * `cpf` ou `cnpj` (apenas números)
  * `telephone` (DDI + DDD + Número)
  * `ip` (Obrigatório coletar o IP real do cliente para análise de fraude)

### Passo 2: Criar o Pedido (`Order`)
Vincula o cliente, o produto digital (fotos do FotoClic) e os dados de split se aplicável.
* **Endpoint:** `POST /api/v4/orders`
* **Campos principais:**
  * `customer_id`: Retornado no passo anterior.
  * `products`: Lista contendo ID do produto, nome, quantidade e preço unitário.
  * `total`: Valor total calculado.
  * `split`: Regras de split de pagamento (definidas diretamente no pedido).

### Passo 3: Efetuar o Pagamento
Conforme a escolha do cliente, o pagamento é realizado chamando um dos dois endpoints dedicados de checkout transparente.

#### Opção A: Pix
* **Endpoint:** `POST /api/v4/payments/pix`
* **Estrutura básica:**
  ```json
  {
    "access_token": "TOKEN",
    "order_id": 123456
  }
  ```
* **Retorno da API:** Link para o QR Code em imagem e a chave de texto "Copia e Cola" (`pix_code`).

#### Opção B: Cartão de Crédito
* **Endpoint:** `POST /api/v4/payments/credit-card`
* **Tokenização de Cartão (Recomendado via Appmax JS):** Para evitar que os dados sensíveis do cartão trafeguem pelo nosso backend (reduzindo o escopo PCI-DSS), utiliza-se o script cliente `Appmax JS` no frontend para gerar um token de pagamento seguro.
* **Estrutura básica da API:**
  ```json
  {
    "access_token": "TOKEN",
    "order_id": 123456,
    "payment": {
      "card_token": "TOKEN_GERADO",
      "installments": 1, // Número de parcelas
      "cvv": "123" // Código de segurança
    }
  }
  ```

---

## 4. Estrutura de Taxas e Custos (Sem Boleto)

A Appmax opera sob um modelo de taxa por transação aprovada (sem mensalidades ou custos fixos de adesão). Conforme a diretriz do FotoClic, **não utilizaremos pagamentos via Boleto Bancário**.

| Meio de Pagamento | Taxa Padrão de Processamento | Taxa Adicional de Parcelamento |
| :--- | :--- | :--- |
| **Pix** | **0.99% a 1.00%** do valor da venda | *Não se aplica* |
| **Cartão (À Vista)** | **3.49% a 4.99%** | *Não se aplica* |
| **Cartão (Parcelado)** | **3.49% a 4.99%** (Taxa base) | **+1.89% a 2.49% ao mês** por parcela |

* **Antifraude:** Integrado no processamento de cartões de crédito sem custo adicional sobre transações recusadas.

---

## 5. Split de Pagamento (Arquitetura para Marketplaces)

O split é ideal para dividir os ganhos entre a plataforma (FotoClic) e o fotógrafo que tirou a foto imediatamente na aprovação do pagamento.

### Passo 1: Cadastro dos Recebedores (`Recipients` / Fotógrafos)
Todo fotógrafo precisa ser registrado como recebedor na Appmax via API para receber os repasses diretamente.
* **Fast Onboarding Endpoint:** `POST /api/v4/recipients`
* **Envio de Documentação (KYC):** A Appmax exige verificação e selfie do recebedor. A API permite gerar o link de Facematch:
  * **Link Facematch Endpoint:** `POST /api/v4/recipients/{id}/facematch`
* **Consulta de Status:** Antes de disparar o split de um pedido, consulte o status do recebedor para confirmar se está ativo (`active`).
  * **Status Endpoint:** `GET /api/v4/recipients/{id}`

### Passo 2: Configuração de Divisão no Pedido
A regra do split deve ser incluída no payload de criação do pedido (`POST /api/v4/orders`).

* **Exemplo de Payload com Split:**
  ```json
  {
    "customer_id": 98765,
    "products": [
      {
        "id": 112,
        "title": "Pacote Digital de Fotos - Evento X",
        "qty": 1,
        "price": 100.00
      }
    ],
    "split": [
      {
        "recipient_id": "ID_DO_FOTOGRAFO_APPMAX",
        "percentage": 85.00, // Fotógrafo fica com 85% (R$ 85,00)
        "charge_processing_fee": false // Taxas do gateway descontadas do FotoClic
      },
      {
        "recipient_id": "ID_DA_CONTA_FOTOCLIC_APPMAX",
        "percentage": 15.00, // FotoClic fica com 15% (R$ 15,00)
        "charge_processing_fee": true // FotoClic absorve as taxas
      }
    ]
  }
  ```

### Regras de Negócio do Split:
1. **Consistência:** A soma de todos os percentuais ou valores fixos configurados no split deve totalizar **exatamente 100%** do valor total dos produtos.
2. **Estorno (Refund) Proporcional:** Se uma venda for estornada, o valor do estorno é cobrado proporcionalmente de todos os recebedores participantes do split original.
3. **Imutabilidade:** As porcentagens do split não podem ser alteradas depois que a transação é efetuada no gateway.

---

## 6. Webhooks e Sincronização

A Appmax envia notificações HTTP do tipo POST para o servidor do FotoClic informando atualizações de transações em tempo real.
* **Eventos Principais:**
  * `order_approved`: Pedido pago (liberar as fotos digitais imediatamente).
  * `order_refunded`: Pedido estornado.
  * `order_canceled`: Pedido cancelado/negado pelo banco.
* **Segurança:** O backend deve validar o payload utilizando a assinatura SHA-256 enviada no cabeçalho HTTP da notificação para evitar requisições falsificadas.
