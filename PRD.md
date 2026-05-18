# Product Requirement Document (PRD) - FotoClic Marketplace

> **Documento de Requisitos de Produto (PRD)** para a plataforma FotoClic.
> Versão: 1.0.0
> Data de Atualização: 18 de Maio de 2026

---

## 📋 1. Visão Geral do Produto

O **FotoClic** é um marketplace online de fotografia esportiva e de eventos que conecta fotógrafos diretamente com os clientes finais (participantes de eventos, noivas, convidados, atletas, etc.). A plataforma permite que os fotógrafos criem eventos, realizem o upload otimizado e em lote de suas fotos, e as vendam de forma segura. O principal diferencial da plataforma é a **busca por reconhecimento facial avançado (Face Search)**, que permite ao cliente fazer upload de uma foto do seu rosto e encontrar instantaneamente todas as suas fotos em um evento, economizando tempo e aumentando drasticamente as taxas de conversão de vendas.

### 1.1 Missão do Produto
Empoderar fotógrafos independentes a monetizar seus trabalhos de forma automatizada e proporcionar aos participantes de eventos a experiência mais simples e rápida de encontrar e comprar suas memórias fotográficas em alta resolução.

---

## 🎯 2. Objetivos de Negócio

1. **Eficiência no Processo de Venda**: Automatizar toda a esteira, desde o upload da foto até o recebimento do valor pelo fotógrafo e a entrega segura do arquivo em alta resolução ao cliente.
2. **Alta Conversão no Checkout**: Utilizar o **AbacatePay (PIX)** para proporcionar um checkout rápido, seguro e totalmente integrado, minimizando a taxa de abandono de carrinho.
3. **Engajamento por Reconhecimento Facial**: Oferecer busca por similaridade facial rápida (pgvector + AWS Rekognition) para que os usuários localizem suas fotos em segundos, eliminando a busca manual exaustiva em galerias com milhares de fotos.
4. **Segurança Financeira e Antifraude**: Garantir repasses automáticos seguros (payouts) para os fotógrafos baseados em regras rígidas de split, prazos de segurança e auditoria transparente.

---

## 👥 3. Perfis de Usuário (Personas)

### 3.1 O Fotógrafo (Vendedor)
Profissional de fotografia que cobre eventos (como corridas de rua, eventos corporativos, casamentos, shows). Ele necessita de uma ferramenta robusta para fazer upload rápido de gigabytes de fotos, definir preços, gerenciar cupons de desconto, acompanhar métricas de vendas e receber pagamentos de forma transparente.

### 3.2 O Cliente (Comprador)
Participante de um evento que busca suas próprias fotos. Ele valoriza a velocidade na busca (reconhecimento facial), facilidade de pagamento via PIX no celular e o download imediato das fotos in alta resolução sem marcas d'água após a compra.

### 3.3 O Administrador (Moderador/Gestor)
Equipe interna do FotoClic que gerencia a integridade da plataforma. Necessita auditar requisições de saques dos fotógrafos, gerenciar categorias de eventos, monitorar custos de infraestrutura (AWS Rekognition e Storage), analisar métricas globais de vendas e atuar na recuperação de carrinhos abandonados.

---

## ⚙️ 4. Requisitos Funcionais

### 4.1 Painel e Experiência do Cliente

#### RF1.1 - Busca e Descoberta de Eventos
* O cliente pode pesquisar eventos por nome, data, categoria ou localização na página inicial.
* A busca deve ser tolerante a acentos e maiúsculas/minúsculas (Accent & Case Insensitive).

#### RF1.2 - Busca por Reconhecimento Facial (Face Search)
* O cliente pode fazer upload de uma selfie/retrato (formatos suportados: JPG, PNG, WEBP).
* O sistema extrai os vetores faciais (embeddings usando `@vladmandic/human` ou `@xenova/transformers`) e realiza a busca de similaridade no banco PostgreSQL usando extensões espaciais/vetoriais (`pgvector`) ou via API `AWS Rekognition`.
* Retorna todas as fotos do evento selecionado que contêm o rosto do cliente ordenadas por grau de similaridade.

#### RF1.3 - Carrinho e Checkout Integrado
* O cliente pode adicionar fotos individuais ou pacotes inteiros ao carrinho.
* Possibilidade de aplicar cupons de desconto criados pelos fotógrafos ou pela administração.
* **Integração AbacatePay (PIX)**: Redirecionamento automático ou exibição do QR Code PIX para pagamento imediato.
* Recuperação automática do estado do carrinho armazenado em `localStorage` para evitar perda de dados.

#### RF1.4 - Painel do Cliente e Download Seguro
* O cliente possui um painel simples (`CustomerDashboardPage`) para ver suas compras.
* Liberação instantânea de links de download seguros após a confirmação do pagamento via webhook do AbacatePay.
* Links de download gerados dinamicamente via Supabase Storage com assinatura temporal e controle de taxa de limite de downloads (Rate Limiting) para evitar pirataria ou compartilhamento indevido de links em alta resolução.

---

### 4.2 Painel do Fotógrafo

#### RF2.1 - Gerenciamento de Eventos e Portfólio
* Criação e edição de eventos com dados como nome, local, data, preço padrão por foto e categoria.
* Criação de uma página pública de portfólio personalizada (`PhotographerPortfolioPage`).
* Geração de **Cartão de Visita Digital** (`PhotographerBusinessCard`) com QR Code dinâmico apontando para o portfólio do fotógrafo.

#### RF2.2 - Upload de Imagens Otimizado (Batch Upload)
* Upload em lote (Batch Upload) de fotos de alta resolução.
* **Processamento no Cliente (Client-side)**: Otimização de imagens, compressão automática no navegador para manter a performance, suporte a HEIC/HEIF e limite de tamanho de 50MB por arquivo.
* Geração e upload automático de três versões de cada imagem:
  1. *Original*: Alta resolução (armazenada de forma privada e segura).
  2. *Preview*: Média resolução com marca d'água aplicada no navegador (para visualização no site).
  3. *Thumbnail*: Baixa resolução (para exibição rápida em listas).

#### RF2.3 - Gestão de Vendas, Estatísticas e Abandono de Carrinho
* Gráficos em tempo real com estatísticas de vendas, faturamento diário/mensal e visualizações de fotos.
* **Recuperação de Carrinhos Abandonados** (`PhotographerAbandonedCarts`): Visualização de carrinhos criados por clientes que não concluíram o pagamento, permitindo o acionamento de fluxos de comunicação e descontos específicos.
* Configurações de comunicação personalizada via WhatsApp ou e-mail.

#### RF2.4 - Controle de Cupons e Descontos
* Criação de cupons personalizados com regras como: desconto percentual ou fixo, valor mínimo de compra, validade e limite de usos.

#### RF2.5 - Painel Financeiro e Saques (Payouts)
* Visualização do saldo disponível para saque, saldo pendente e histórico de saques.
* Solicitação de saques via PIX.
* **Regra de Retenção de 7 Dias**: O valor de cada venda fica retido por 7 dias como margem de segurança para cancelamentos/estornos.
* **Limite Mínimo de Saque**: Valor mínimo de R$ 100,00 para solicitação de saque.

---

### 4.3 Painel Administrativo

#### RF3.1 - Gestão Geral e Configurações Globais
* Definição de taxas globais da plataforma sobre as vendas dos fotógrafos.
* Configuração e ativação/desativação de integrações e APIs (Supabase, AbacatePay, AWS).

#### RF3.2 - Moderação de Fotógrafos e Fotos
* Aprovação manual de novos cadastros de fotógrafos antes de liberá-los para venda.
* Visualização de relatórios (denúncias) e ferramentas de moderação de fotos.

#### RF3.3 - Auditoria de Pagamentos e Saques (Admin Payouts)
* Visualização e processamento (aprovação/execução) de solicitações de saque dos fotógrafos.
* Integração com AbacatePay para disparar a transferência PIX de repasse.

#### RF3.4 - Monitoramento e Custos
* Estatísticas de chamadas da API de reconhecimento facial (AWS Rekognition) para controle de custos operacionais.
* Monitoramento de requisições de armazenamento e saúde dos buckets.

---

## 🔒 5. Requisitos Não-Funcionais

### 5.1 Segurança e Integridade dos Dados
* **Supabase Row Level Security (RLS)**: Todas as tabelas críticas (vendas, carrinhos, saques, fotos originais) possuem políticas de RLS extremamente seguras, garantindo que usuários comuns só acessem seus próprios dados e fotógrafos apenas visualizem suas vendas/fotos.
* **Prevenção contra Fraude**: Limpeza periódica de dados de teste, validação estrita de webhooks de pagamento (assinatura digital do webhook do AbacatePay) e controle contra deleção em cascata indevida de registros integrados financeiramente.

### 5.2 Performance e Escalabilidade
* **Upload Paralelizado**: O sistema de upload em lote processa fotos em paralelo de forma otimizada para evitar travamento da aba do navegador do fotógrafo.
* **Tempo de Resposta Facial**: A busca facial no banco de dados com pgvector ou AWS Rekognition deve retornar resultados em menos de 2 segundos para galerias de até 50.000 fotos.
* **Otimização de Assets**: Utilização de thumbnails compactos para carregamento instantâneo de galerias extensas.

### 5.3 UX/UI e Responsividade
* **Design Premium**: Visual moderno e fluido, paleta de cores equilibrada, transições suaves, foco na usabilidade mobile-first (mais de 85% dos compradores acessam via celular durante os eventos).
* **Acessibilidade**: Contraste adequado de fontes, suporte a leitores de tela e navegação por teclado nos fluxos principais.

---

## 🛠️ 6. Stack Tecnológica Utilizada

* **Frontend**: React.js (v18), TypeScript, Vite (porta 3000), Tailwind CSS para estilização e Lucide React para ícones.
* **Backend como Serviço (BaaS)**: Supabase (PostgreSQL para dados estruturados, Auth para controle de usuários, Storage para arquivos de imagem originais e otimizados, e Database Functions/RPCs para uploads eficientes).
* **Gateway de Pagamento**: AbacatePay (Checkout e Payout via PIX integrado por Webhooks e controle de cron jobs).
* **Machine Learning / IA**: AWS Rekognition (ou modelos locais ONNX rodando via `@xenova/transformers` / `@vladmandic/human`) combinados com a extensão `pgvector` no PostgreSQL para busca vetorial de similaridade facial.
