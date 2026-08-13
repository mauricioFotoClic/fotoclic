# AWS Speed Stack - Guia de Infraestrutura e Criação de Contas (FotoClic)

Este documento é o guia de referência oficial para a futura migração e implantação da nova infraestrutura de alta performance do FotoClic, projetada para suportar eventos massivos com **20+ fotógrafos simultâneos subindo 40.000+ fotos em alta resolução** sem travamentos, com resposta instantânea e custo acessível.

---

## 1. Arquitetura Geral da Solução (AWS Speed Stack)

A arquitetura desacopla completamente o envio de arquivos pesados (Storage) da gravação de dados estruturados (Database):

1. **Storage Layer:** Amazon S3 + S3 Transfer Acceleration (Upload direto via navegadores usando Pre-Signed URLs no Edge global da AWS).
2. **Database Layer:** AWS Aurora Serverless v2 (PostgreSQL) com auto-scaling instantâneo de 0.5 a 16/32 ACUs.
3. **Connection Pooling Layer:** AWS RDS Proxy (reutilização de conexões e proteção contra estouro de memória).
4. **Processamento Assíncrono (Opcional):** S3 Event Notification + AWS Lambda para marcas d'água, thumbnails e inserção em lote (`Batch Insert`).

---

## 2. Passo a Passo de Cadastro e Criação de Contas

### 2.1. Passo 1: Criar a Conta Principal na AWS
* 🌐 **Link Oficial de Cadastro:** [https://portal.aws.amazon.com/billing/signup](https://portal.aws.amazon.com/billing/signup)
* **Requisitos:**
  * E-mail corporativo ou pessoal principal.
  * Cartão de crédito internacional para validação da conta.
  * Telefone celular para verificação via SMS.
* **Recomendações de Configuração:**
  * Plano de suporte: **Basic / Free Plan**.
  * Região recomendada: `us-east-1` (N. Virginia) para menor custo por ACU e menor latência nos serviços de borda.

---

### 2.2. Passo 2: Criar Usuário de Segurança IAM (Credenciais de API)
* 🌐 **Link do Console IAM:** [https://console.aws.amazon.com/iam/](https://console.aws.amazon.com/iam/)
* **Passos:**
  1. No menu lateral, selecione **Users** > **Add User**.
  2. Nome: `fotoclic-backend-user`.
  3. Em *Permissions*, selecione **Attach policies directly** e adicione:
     * `AmazonS3FullAccess`
     * `AmazonRDSDataFullAccess`
  4. Acesse a aba **Security Credentials** > clique em **Create Access Key**.
  5. **Salve as chaves geradas:**
     * `AWS_ACCESS_KEY_ID`
     * `AWS_SECRET_ACCESS_KEY`

---

### 2.3. Passo 3: Criar o Bucket Amazon S3 + Ativar Aceleração
* 🌐 **Link do Console S3:** [https://s3.console.aws.amazon.com/s3/](https://s3.console.aws.amazon.com/s3/)
* **Passos:**
  1. Clique em **Create Bucket**.
  2. Nome do Bucket: `fotoclic-photos-prod` (ou similar único globalmente).
  3. Selecione a Região: `us-east-1`.
  4. Configure o **CORS (Cross-Origin Resource Sharing)** nas propriedades do bucket:
     ```json
     [
       {
         "AllowedHeaders": ["*"],
         "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
         "AllowedOrigins": ["https://fotoclic.com.br", "http://localhost:5173"],
         "ExposeHeaders": ["ETag"]
       }
     ]
     ```
  5. **Ativar S3 Transfer Acceleration:**
     * Abra o bucket criado > selecione a aba **Properties**.
     * Localize **Transfer Acceleration** > clique em **Edit** > selecione **Enable** > **Save**.

---

### 2.4. Passo 4: Criar o Cluster AWS Aurora Serverless v2 (PostgreSQL)
* 🌐 **Link do Console RDS:** [https://console.aws.amazon.com/rds/](https://console.aws.amazon.com/rds/)
* **Passos:**
  1. Clique em **Create Database**.
  2. Escolha **Standard Create**.
  3. Engine: **Amazon Aurora** (Compatible with PostgreSQL 15.x / 16.x).
  4. Tipo de Instância: **Serverless v2**.
  5. **Capacidade ACU (Aurora Capacity Units):**
     * **Mínima:** `0.5 ACU` (~1 GB RAM - economia em horários sem evento).
     * **Máxima:** `16.0 ACU` ou `32.0 ACU` (~32 GB a 64 GB RAM - pico automático durante os eventos).
  6. Credenciais Mestre:
     * Usuário: `fotoclic_admin`
     * Senha: Senha forte de produção.
  7. Acesso: Ativar **Publicly Accessible** para conexões de ferramentas de gestão externas (DBeaver, TablePlus).

---

### 2.5. Passo 5: Criar o AWS RDS Proxy (Pooler de Conexões Serverless)
* 🌐 **Link do Console RDS Proxies:** [https://console.aws.amazon.com/rds/home#proxies:](https://console.aws.amazon.com/rds/home#proxies:)
* **Passos:**
  1. Clique em **Create Proxy**.
  2. Nome: `fotoclic-rds-proxy`.
  3. Engine Family: **PostgreSQL**.
  4. Target Database: Escolha o cluster **Aurora Serverless v2** criado no Passo 4.
  5. Copie a URL do endpoint gerado (ex: `fotoclic-rds-proxy.proxy-xxxx.us-east-1.rds.amazonaws.com`).

---

### 2.6. Passo 6 (Opcional): Conta Cloudflare (CDN + DNS Gratuito)
* 🌐 **Link de Cadastro Cloudflare:** [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
* Utilizado para proteção DDoS, gestão de DNS e cache estático gratuito de fotos publicadas.

---

## 3. Variáveis de Ambiente no Backend (`.env.local` / Vercel)

```env
# AWS Credentials
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIAxxxxxxxxxxxxxxxx"
AWS_SECRET_ACCESS_KEY="wJalrXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Storage (Amazon S3 + Transfer Acceleration)
AWS_S3_BUCKET_NAME="fotoclic-photos-prod"
AWS_S3_ACCELERATE_URL="https://fotoclic-photos-prod.s3-accelerate.amazonaws.com"

# Database (Aurora Serverless v2 via RDS Proxy)
DATABASE_URL="postgresql://fotoclic_admin:SUA_SENHA@fotoclic-rds-proxy.proxy-xxxx.us-east-1.rds.amazonaws.com:5432/fotoclic"
```

---

## 4. Resumo de Benefícios de Desempenho

| Métrica | Supabase Padrão (Anterior) | AWS Speed Stack (Novo) |
| :--- | :--- | :--- |
| **Gargalo no Upload** | Proxy Kong / PostgREST (Trava em lotes altos) | Upload direto via Edge CloudFront (Upload 50-300% mais rápido) |
| **Capacidade de Gravação** | Requisições HTTP individuais por foto | Inserção em Lote (*Batch Insert*) + RDS Proxy Pool |
| **Escala de Banco** | Instância Fixa (Trava no limite da RAM) | Auto-scaling de 0.5 a 32 ACUs em fração de segundo |
| **Suporte Simultâneo** | 5~10 fotógrafos ativos | **50+ fotógrafos ativos simultâneos** |
