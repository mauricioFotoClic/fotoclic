# Regras de Negócio: Sistema de Pagamentos e Saques (FotoClic)

Este arquivo serve como referência permanente para o funcionamento do motor financeiro da plataforma.

## 1. Regras de Saque (Payout)
- **Limite Mínimo:** O fotógrafo só pode realizar ou ter um saque processado se o `balance_available` (saldo disponível) for igual ou superior a **R$ 100,00**.
- **Frequência:** Definida no cadastro do fotógrafo (diário, semanal, mensal), mas o gatilho de valor mínimo (R$ 100) é soberano.
- **API:** Utiliza AbacatePay **API v2** (`/v2/payouts/create`).

## 2. Fluxo de Recebimento e Disponibilidade
- **Disponibilidade Imediata:** Não existe mais a carência de 7 dias. Assim que a venda é confirmada pelo Webhook, o valor líquido (Preço - Comissão) deve ser somado ao saldo disponível do fotógrafo.
- **Abatimento de Taxas:** A comissão da plataforma deve ser calculada e subtraída do valor bruto da foto imediatamente no momento da inserção do registro na tabela `sales`.

## 3. Comissões e Tarifas
- **Prioridade de Taxa:** 
    1. Verifica se existe uma taxa customizada para o fotógrafo específico em `system_settings.commission_custom_rates`.
    2. Caso não exista, utiliza a `commission_default_rate` de `system_settings`.
- **Cálculo:** `commission_value = photo_price * commission_rate`.

## 4. Cadastro e Vínculo de Dados
- **Dados do Comprador:** Na hora da venda, o sistema deve coletar nome e e-mail.
- **Persistência de Usuário:** Se o e-mail não existir na tabela `users`, criar automaticamente um registro com `role: 'customer'`.
- **Rastreabilidade:** A tabela `sales` deve conter obrigatoriamente `photographer_id`, `buyer_id` (vinculado ao user recém-criado ou existente) e `photo_id`.

## 5. Histórico de Implementação (Status Atual)
- [x] Worker de Saque atualizado para API v2.
- [x] Webhook configurado para salvar Clientes (Users) e registrar Vendas.
- [ ] REMOVER TRIGGER DE 7 DIAS: A trigger `set_sale_available_date` e a view `photographer_wallet_summary` precisam ser simplificadas para tratar tudo como disponível imediatamente.
