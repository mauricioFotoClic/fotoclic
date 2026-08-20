# Análise Profunda: fotoclic.com.br

Data da análise: 19/08/2026. Método: recon externo (headers, robots, sitemap), download e leitura do bundle JavaScript de produção (`index.js` 560 KB + 26 chunks de rota + `emailService`), renderização página a página no browser, e probes read-only ao Supabase/Vercel com a anon key pública embutida no site. Nenhuma operação de escrita foi executada contra o banco de produção.

> Convenção: **CONFIRMADO** = verificado ao vivo por probe. **INFERIDO** = deduzido da leitura do código minificado, ainda não provado em runtime. **ASSUMPTION** = premissa que depende de política server-side não observável (RLS, checagem em rota Vercel).

---

## 1. Resumo executivo

FotoClic é um marketplace de fotografia esportiva: fotógrafos sobem fotos de eventos, o atleta se encontra por **busca facial (selfie/câmera) via AWS Rekognition** ou por similaridade visual (pgvector), e compra o download em alta resolução. Pagamento por PIX/cartão (AbacatePay), comissão padrão de 6% na promoção de lançamento.

A engenharia é competente no produto (busca facial, carrinho, descontos progressivos, painel admin completo, painel do fotógrafo com upload em lote e carteira PIX), mas **a arquitetura de segurança é quase inteiramente client-side**. O navegador é tratado como autoridade: preços, cupons, papel do usuário e liberação de download são decididos no cliente com a anon key, e várias rotas Vercel de dinheiro/biometria não enviam credencial.

### Achados críticos (ordem de risco)

| # | Severidade | Achado | Status |
|---|---|---|---|
| C1 | 🔴 Crítico | Leitura anônima irrestrita de tabelas sensíveis (`users`, `sales`, `payouts`, `coupons`, `system_settings`, `photographer_reports`, `carts`). Vaza PII + financeiro. | **CONFIRMADO** |
| C2 | 🔴 Crítico | RPCs `SECURITY DEFINER` sem checagem de papel: `get_admin_stats` e `get_photographers_with_stats` retornam faturamento, contagem de vendas e emails para anônimo. | **CONFIRMADO** |
| C3 | 🔴 Crítico | Rotas de dinheiro sem `Authorization`: `/api/abacate-stats` (saque/ajuste de saldo), `/api/abacate-refund` (estorno), `/api/send-email` (relay), `/api/rekognition` (biometria: search/index/delete). | INFERIDO (ASSUMPTION sobre auth server-side) |
| C4 | 🔴 Crítico | Bypass de pagamento embutido em produção: `purchasePhoto()` faz `INSERT` direto em `sales` com preço arbitrário (inclusive 0), sem etapa de pagamento. É o que o download usa como gate. | INFERIDO (depende de RLS INSERT em `sales`) |
| C5 | 🔴 Crítico | Preços e cupons calculados no browser e enviados ao provedor de pagamento; cupons empilháveis podem zerar o total. | INFERIDO |
| C6 | 🔴 Crítico | XSS armazenado na sessão do admin via modal de rejeição de foto (`dangerouslySetInnerHTML` com título de foto/nome do fotógrafo sem escape). | INFERIDO (código explícito) |

### Correção invalidada do relatório automatizado
Os agentes reportaram "vazamento de hash bcrypt em `users.password`". **Isso é FALSO**: probe ao vivo retorna `column users.password does not exist`. O código client referencia essa coluna (fluxo legado de reset de senha), mas ela não existe no schema. O takeover via hash está descartado. A escalação por `update({role:'admin'})` continua plausível porque a coluna `role` existe, mas é INFERIDA e não foi testada (não escrevo no banco).

---

## 2. Stack e arquitetura (como o site funciona)

### Frontend
- **Vite + React 18**, SPA pura (sem SSR), roteador **hand-rolled** sobre `history.pushState`/`popstate` (não é react-router-dom para as rotas de app).
- Code-splitting em **27 chunks lazy** por rota (`HomePage`, `AdminPage`, `PhotographerPage`, etc.).
- i18n próprio (pt-BR / en-US) com dicionários embutidos no bundle principal.
- Hospedagem **Vercel** (`Server: Vercel`, `X-Vercel-Cache: HIT`). Repo GitHub: `mauricioFotoClic/fotoclic`.

### Backend
- **Supabase** (projeto `jzrrwhuletsknujjfdwa`): Postgres + Auth + Storage + Edge Functions.
- Anon key JWT embutida no bundle (`role:anon`, exp 2079). Esperado ser pública; o problema é o que ela consegue ler/escrever (ver §7).
- **Edge Function**: `image-embedding` (gera embedding CLIP-style para busca por similaridade).
- **RPCs** (16): `upload_photo`, `moderate_photo`, `admin_delete_user`, `get_admin_stats`, `get_photographers_with_stats`, `get_photographer_abandoned_carts`, `match_images` (pgvector), `request_storage_limit`, `get_storage_requests`, `approve_storage_request`, `reject_storage_request`, `get_my_latest_storage_request`, entre outras.
- **Storage buckets**: `photos-preview` (público, webp com marca d'água por overlay DOM) e `photos-original` (privado, **CONFIRMADO**: retorna 400 sem assinatura).

### Rotas serverless (Vercel `/api/*`)
| Rota | Método | Auth enviada pelo cliente | Função |
|---|---|---|---|
| `/api/abacate-checkout` | POST | ❌ nenhuma | cria checkout PIX/cartão (recebe preços do cliente) |
| `/api/get-download-url` | POST | ✅ Bearer (Supabase JWT) | libera URL assinada do original |
| `/api/sync-purchases` | POST | ✅ Bearer | reconcilia webhook de pagamento |
| `/api/payout-worker` | POST | ✅ Bearer | transferência PIX ao fotógrafo |
| `/api/send-email` | POST | ❌ nenhuma | relay Resend (to/subject/html) |
| `/api/rekognition` | POST | ❌ nenhuma | AWS Rekognition (index/search/delete faces) |
| `/api/rekognition-stats` | GET | ❌ nenhuma | dashboard de custo/coleção AWS |
| `/api/abacate-stats` | GET/POST/DELETE | ❌ nenhuma | ledger do gateway, saques, ajuste de saldo |
| `/api/abacate-refund` | POST | ❌ nenhuma | estorno de cobrança |
| `/api/cloudflare-stream-url` | POST | ❌ nenhuma | URL de upload de vídeo |
| `/api/broadcast` | GET | ❌ | retorna 200 (Realtime lib) |

**Padrão sistêmico**: as rotas que movem dinheiro (`abacate-*`) e a de biometria (`rekognition`) **não** enviam credencial; as de download/payout/sync enviam Bearer. Se as rotas `abacate-*`/`rekognition`/`send-email` não autenticarem por outro meio server-side, estão abertas (C3).

### Terceiros e tracking
Stripe (`pk_test_...`, **chave de teste em produção** e malformada, ver §8), AbacatePay (PIX), Resend (email), Cloudflare Stream (vídeo), Google Ads (`AW-16960525575`), Meta Pixel (`1619367559854156`). GA e Meta Pixel disparam **antes** do banner de consentimento (ver §9, LGPD).

---

## 3. Modelo de negócio e fluxos principais

- **Comissão**: padrão 6% (promo lançamento), com rates custom por fotógrafo em `system_settings`. Há divergência de constantes no código: 0.06, 0.10 (vídeo), 0.15 (fallbacks) coexistem.
- **Descontos progressivos** (por fotógrafo): 5% em 2 fotos, 10% em 5, 20% em 10. Configurável em `users.bulk_discount_rules`.
- **Cupons** por fotógrafo (código, % desconto, validade). Sem limite de uso, sem valor mínimo (ver §8).
- **Payout**: PIX automático ao atingir R$ 100 (taxa exibida diverge: R$ 1,00 no dashboard vs R$ 0,80 na Central Financeira). Carteira derivada de `photographer_wallet_summary` cruzada com `sales`.
- **Moderação**: fotógrafo se cadastra `is_active: true` (aprovação de admin é cosmética, ver §8), fotos passam por `moderate_photo` (humano + análise de qualidade, que na verdade retorna score hardcoded 85/90/80/85).

### Fluxo de compra (feliz)
1. Atleta acha fotos por busca facial (`/api/rekognition` searchFaces) ou por texto/evento.
2. `/foto/:id`: preview com marca d'água (overlay DOM) + painel de preço.
3. Carrinho (localStorage + tabela `carts`), preço calculado no cliente com cupom + volume.
4. Checkout: `POST /api/abacate-checkout` com line-items em centavos → redireciona ao AbacatePay hospedado.
5. Retorno em `/checkout-success`: `POST /api/sync-purchases` reconcilia, dispara conversão Google Ads, lista fotos liberadas.
6. Download: `POST /api/get-download-url {photoId}` com Bearer → URL assinada do `photos-original`.

---

## 4. Mapa de rotas (página a página)

Rotas em pt-BR (as âncoras no bundle usam paths em inglês `/about`, `/contact` etc. que o parser **não reconhece**, gerando 404 em middle-click/crawler, ver §9-SEO).

| Path | Chunk | Tipo | Auth |
|---|---|---|---|
| `/` | HomePage | público | não |
| `/descobrir` | DiscoverPage | público (galeria) | não |
| `/fotos-destaque` | FeaturedPhotosPage | público | não |
| `/encontrar-fotos` | FindPhotosPage | público (busca evento) | não |
| `/categoria/:uuid` | CategoryPage | público | não |
| `/evento/:uuid` | EventPage | público (galeria + busca facial) | não |
| `/foto/:uuid` | PhotoDetailPage | público (venda) | não |
| `/fotografos` | PhotographersPage | público | não |
| `/portfolio/:slug\|:uuid` | PhotographerPortfolioPage | público | não |
| `/carrinho` `/checkout` `/checkout-success` | Cart/Checkout/Success | funil | login p/ pagar |
| `/minhas-compras` | CustomerDashboardPage | cliente | login (sem guard de role) |
| `/login` `/cadastro` `/reset-password` `/bem-vindo` `/aguardando-aprovacao` | Auth | auth | não |
| `/area-fotografo` | PhotographerPage | fotógrafo | guard client-side |
| `/admin` | AdminPage | admin | guard client-side |
| `/sobre` `/contato` `/ajuda` `/termos` `/privacidade` | estáticas | institucional | não |
| `/404` + qualquer path não casado | NotFoundPage | soft-404 (HTTP 200) | não |

---

## 5. Análise página a página

### 5.1 HomePage (`/`)
Hero com busca, CTA "Sou atleta / encontrar minhas fotos" e **"Busca por IA / Usar Câmera"** (abre modal de selfie sem mudar URL). Carrossel de 25 categorias, mosaico de fotos em destaque, fotos/eventos recentes, carrossel "Talentos em ascensão" (61 fotógrafos com % aprovação e nota) e modal "Fotógrafo Fundador" (pitch de 6%). Dispara 5 promises independentes no mount, cada uma chamando `getInactivePhotographerIds()` (scan completo de `users`), gerando ~10 round-trips e 4 scans concorrentes de tabela antes do primeiro paint.
- **Achados**: `getRecentPhotos` tem fallback de 3 níveis que **remove os filtros de moderação** (nível 3 = sem filtro, publica fotos privadas/rejeitadas na home se o set aprovado esvaziar). Promessas contraditórias no modal Fundador ("1 ano de 6%" vs "primeiros 100 que atingirem R$ 3.000/mês"). "Featured" seleciona eventos `is_featured`, não fotos, e embaralha a cada reload (não-determinístico).

### 5.2 DiscoverPage (`/descobrir`)
Galeria com paginação client-side (12/página). A busca do hero **não filtra na página**: navega para `/encontrar-fotos` (busca de evento, entidade diferente). Puxa até 500 fotos, embaralha e pagina no cliente (488 transferidas e nunca renderizadas). Loading flag inicia `false` → pisca "nenhuma foto" antes dos skeletons.

### 5.3 FindPhotosPage (`/encontrar-fotos`)
Busca de eventos sobre `getAllPublicEvents()` (cap **200 eventos**, filtragem 100% no cliente). Dropdown "cidade" é na prática o **estado** (`location.split(",").pop()`). Filtro de data chama `new Date(event_date.replace(...))` sem guard de null → um evento com data nula derruba a página inteira para o error boundary.

### 5.4 CategoryPage (`/categoria/:uuid`)
Hero + grid de eventos da categoria. Canonical usa **UUID** apesar de existir coluna `slug`. Única página não internacionalizada (strings pt-BR hardcoded). Filtra eventos cujo fotógrafo não está no set ativo (redundante e lossy).

### 5.5 EventPage (`/evento/:uuid`)
Galeria do evento, pastas (`sub_group`), share (6 redes), report (fake), e CTA de busca facial escopada ao evento.
- **Achados**: `getPhotosByEventId` **não filtra** `moderation_status` nem `is_public` (fotos pendentes/rejeitadas/privadas aparecem). `getPhotographers()` é chamado a cada load e o mapper expõe email/telefone/pix/bank de **todos** os fotógrafos no payload (usa só nome/avatar). O join `photo_likes(user_id)` vaza quem curtiu. UI de "Pastas" é código morto (a query não seleciona `sub_group`). Evento com >1000 fotos é truncado silenciosamente e o contador mostra o número truncado.

### 5.6 PhotoDetailPage (`/foto/:uuid`)
Página de venda com preview marca-d'água, detecção de compra (`checkIfPurchased`), preço + carrinho, e ladder de desconto por volume. Vídeo via iframe Cloudflare Stream com "trava de áudio" por `setInterval` de 1s.
- **Achados**: `getPhotoById` seleciona `file_url` (path do original) e devolve para qualquer visitante. Renderiza qualquer foto por link direto **independente de moderação** (foto rejeitada segue comprável). Preview é overlay DOM: `preview_url` limpo está a um clique do devtools. Vídeo via URL `videodelivery.net` não assinada (uid visível no DOM) = assistir sem comprar.

### 5.7 Busca facial (FaceSearchModal + faceRecognitionService)
Selfie por webcam ou upload → downscale a 1024px JPEG q0.85 → `POST /api/rekognition {searchFaces}` → se zero matches, **cai para busca por similaridade visual** (`image-embedding` + `match_images` threshold 0.35) e apresenta como se fosse match facial.
- **Achados críticos**: (1) a selfie é salva em `localStorage['fotoclic_saved_selfie']` **por padrão** (checkbox ON), sem etapa de consentimento, biometria = dado sensível LGPD Art. 11. (2) Degradação silenciosa para similaridade visual pode mostrar/vender fotos de **outra pessoa** que apenas se parece. (3) `/api/rekognition` sem auth (C3).

### 5.8 Cart / Checkout / Success
Motor de preços empilha cupom (por fotógrafo) + desconto por volume (por evento com `allow_discounts`). Checkout envia line-items **em centavos calculados no cliente** ao `/api/abacate-checkout` (sem Bearer, `userId` no metadata).
- **Achados críticos**: preços client-supplied (C5); cupom+volume podem passar de 100% (clamp inconsistente: total no nível do pedido, line-item no nível do item → cobra diferente do "Total a Pagar" exibido); campo CPF/CNPJ **morto** (`taxId: ""` sempre enviado, AbacatePay exige); conversão para centavos com `*100` sem `Math.round` (erro de ponto flutuante); provável **loop de render infinito** em `/checkout-success` (callback inline + `setCart([])` a cada render dispara `syncCart` → martela o banco); conversão Google Ads dispara a cada refresh dentro de janela de 5 min (receita inflada). Cupom sem limite de uso.

### 5.9 CustomerDashboardPage (`/minhas-compras`)
Lista compras (`getPurchasesByUserId`, filtra só `status != refunded`) e re-download via URL assinada.
- **Achados**: over-select traz `file_url` do original para o cliente; filtro só exclui `refunded` (PIX pendente/expirado aparece como "comprado" com botão Baixar ativo); sem guard de role (fotógrafo/admin não têm link, mas a rota funciona); download de vídeo cross-origin não funciona (browser ignora `download` cross-origin); imagem inteira bufferizada em memória (crash em mobile). Impersonation de admin cai aqui usando o **JWT do admin** (sem trilha de auditoria real).

### 5.10 Auth (Login, Cadastro, Reset, Welcome, Pending)
Supabase Auth + tabela `users` espelhada.
- **Achados críticos**: `role` vem do payload do cliente no `INSERT users` do cadastro → escalação a admin se RLS não fixar (INFERIDO); moderação de fotógrafo é cosmética (`is_active: true` sempre, login só bloqueia depois de autenticar e **não faz signOut**, então o JWT válido permanece); `/reset-password` aceita **qualquer** sessão autenticada como sessão de recovery (`onAuthStateChange` ignora o tipo do evento) → troca de senha sem saber a atual; login de cliente não redireciona (fica na tela de login); duplicação total do fluxo (páginas vs modais no `index.js`) já divergiu; fluxo legado de reset com bcrypt escrevendo `users.password` (coluna inexistente, código morto, bcryptjs no bundle principal à toa).

### 5.11 PhotographerPage (`/area-fotografo`) — 214 KB
Painel de 11 views: dashboard, eventos/fotos, vendas, carteira/PIX, cupons, descontos, funil de carrinhos abandonados, comunicação, cartão virtual (QR), perfil, preview de portfólio. Upload em lote (5 workers, imagem 50 MB / vídeo 250 MB / 90 s), dedupe "Retomada Inteligente", indexação facial em lote, alteração de preço/pasta em lote.
- **Achados críticos/altos**: URL do original montada como **pública** (`.../object/public/photos-original/${file_url}`) e path derivável do preview (mesmo prefixo, só muda sufixo) — mitigado por o bucket ser privado (**CONFIRMADO** 400), mas o código assume público; upload do original em `catch{}` vazio (registro criado apontando para objeto que pode não existir, reportado como sucesso); falha de indexação facial grava `is_face_indexed: true` (foto some da busca para sempre); preço/pasta em lote **ignoram a seleção** e atingem o evento inteiro, sem `.eq('photographer_id')` (depende de RLS) e furando o cache; status de carrinho abandonado nunca persiste (só state React); link de recuperação aponta para **domínio errado** `fotoclic.app/cart` (site é `.com.br`); vídeo entregue por URL pública sem token; gate de Termos e "Modo Vistoria" só client-side (basta criar a key no localStorage/devtools).

### 5.12 AdminPage (`/admin`) — 251 KB
Console de 12 views: dashboard (KPIs de `get_admin_stats`), categorias, fotógrafos, clientes, fotos/moderação, vendas, payouts, storage-requests, settings (comissão + templates de email), rekognition (custo AWS), remarketing (blast de email + CSV export), abacate (ledger PIX/cartão, estorno, ajuste de saldo).
- **Achados críticos**: **XSS armazenado** na sessão do admin via modal de rejeição (`dangerouslySetInnerHTML` com `nome_fotografo` + `titulo_foto` sem escape) → foto titulada `<img src=x onerror=...>` executa JS no browser do admin ao rejeitar (C6); todas as 6 chamadas `abacate-*`/`abacate-refund` **sem Authorization** (C3); Remarketing puxa `sales` + `carts` inteiras e exporta CSV com nome/email/telefone sem auditoria nem consentimento LGPD; imagens base64 gravadas em colunas Postgres (avatar/banner/foto manual) em vez de Storage; mínimo de payout R$100 exibido mas não imposto; view storage-requests inacessível pela sidebar (só por hash manual); nenhuma checagem de `role` no próprio chunk (delega 100% ao roteador + RLS).

### 5.13 Páginas estáticas (Sobre, Contato, Ajuda, Termos, Privacidade, 404)
Zero chamadas de rede; conteúdo em i18n.
- **Achados críticos (legal/LGPD)**: a Política de Privacidade **não menciona dado biométrico/facial**, que é o core do produto; afirma "não coletamos dados sensíveis"; sem seção de direitos do titular (Art. 18), sem encarregado/DPO, sem período de retenção da selfie, sem lista de operadores (todos fora do Brasil), sem cláusula de transferência internacional. Privacidade e Termos renderizam **sem estilo** (plugin Tailwind Typography ausente: `prose` não existe no CSS) → headings viram texto corrido, os dois documentos legais são um paredão indiferenciado. Data "Última atualização" carimba **o dia atual** a cada visita (destrói valor probatório). Cláusula de "sem reembolso após download" provavelmente inválida sob CDC Art. 49 (arrependimento de 7 dias). Contato aponta para email `fvimagem@fvimagem.com` (outro domínio/marca) e não captura nada (só mailto/WhatsApp). Âncoras internas usam paths em inglês que o router não reconhece.

---

## 6. Camada de dados e serviços (`index.js`)

Um único objeto de serviço com ~108 funções async envolvendo um cliente Supabase, mais cache in-memory de 5 min. Re-exporta o cliente cru como `B.supabase` (qualquer consumidor pode furar a camada). Tabelas: `users`, `photos`, `events`, `categories`, `sales`, `payouts`, `coupons`, `carts`, `reviews`, `photo_likes`, `photographer_reports`, `system_settings`, `password_reset_tokens`, `storage_requests`, `download_logs`, views `photographer_wallet_summary` e `photographer_stats_view`.

Root cause recorrente: **"o browser é a autoridade"**. Escritas sensíveis passam direto: `updatePhoto` (spread livre → `price`/`is_public`/`moderation_status` client-writable), `approvePhotosBatch`, `toggleLike` escreve `photos.likes_count`, `updateCommissionSettings`/`updateEmailTemplates` fazem upsert no `system_settings` singleton, `requestPayout` insere com `amount` escolhido pelo cliente, `purchasePhoto` insere em `sales`. Todas só são seguras se a RLS existir. Injeção de filtro PostgREST em `searchPhotos` (query do usuário interpolada cru no `.or()`). N+1 e queries sem limite espalhados. Código morto/fake exportado (`getStats` retorna constantes, `getPhotographerUser` busca `daian@example.com`, `analyzePhoto` retorna score hardcoded).

---

## 7. Segurança: achados detalhados

### 🔴 C1. RLS permissiva/desligada para `anon` (CONFIRMADO)
Probe ao vivo com a anon key retornou linhas completas de:
- `users`: 140 linhas, com nome, email, telefone, `role`, `pix_key` (**17 com chave PIX não-nula**), `pix_key_type`, `bank_info`, `payout_frequency`, `payout_blocked`.
- `sales`: preços, `buyer_id`, `commission`, `billing_id`, `status`.
- `payouts`: `amount`, `status`, `external_id` (ids de transação PIX).
- `coupons`: códigos ativos + % (ex.: um cupom com 100% de desconto).
- `system_settings`: rates de comissão, templates de email.
- `photographer_reports`, `carts`: idem.

**Impacto**: vazamento de PII + dados financeiros de clientes e fotógrafos a qualquer visitante. Violação direta de LGPD. Enumeração e reuso de cupons (fraude de desconto).

**ASSUMPTION importante**: o retorno 200 + linhas prova leitura anônima irrestrita. **Não distingue** "RLS totalmente desligada" de "RLS ligada com policy `USING (true)`". Só a primeira implica escrita anônima (C4). Não testei escrita para não adulterar produção. Verificar no dashboard Supabase qual dos dois casos é.

**Fix**: habilitar RLS com default-deny em todas as tabelas do schema `public`; `REVOKE INSERT/UPDATE/DELETE` de `anon` e `authenticated`; expor só colunas públicas via view (ou RPC `SECURITY DEFINER` que deriva identidade de `auth.uid()`); nunca `select('*')` em `users` do cliente público.

### 🔴 C2. RPCs `SECURITY DEFINER` sem checagem de papel (CONFIRMADO)
- `get_admin_stats()` chamável por anônimo → retornou faturamento total, contagem de vendas, fotógrafos ativos, série de vendas dos últimos 7 dias.
- `get_photographers_with_stats()` chamável por anônimo → retornou `user_data` com emails + estatísticas de venda/comissão.

**Fix**: dentro da função, checar `auth.uid()`/role antes de retornar; ou remover `SECURITY DEFINER` e proteger por RLS.

### 🔴 C3. Rotas Vercel de dinheiro/biometria sem auth (INFERIDO)
`/api/abacate-stats` (POST cria saque, POST ajusta saldo, DELETE remove), `/api/abacate-refund` (estorno), `/api/send-email` (relay Resend → phishing DKIM-assinado como fotoclic.com.br), `/api/rekognition` (`deleteFaces`/`createCollection` destrutivos, `searchFaces` = matching biométrico em massa contra a base de compradores). Todas chamadas do bundle sem `Authorization`.

**ASSUMPTION**: se essas rotas não autenticarem server-side por outro meio, estão abertas à internet. **Ação #1: inspecionar o código dessas rotas Vercel** (não estava no escopo do bundle client) e adicionar verificação de JWT + role.

### 🔴 C4. Bypass de pagamento (`purchasePhoto`) (INFERIDO)
`purchasePhoto(photoId, buyerId, priceOverride)` faz `supabase.from('sales').insert({...})` client-side, com preço arbitrário e sem pagamento, ligado a um dialog "Simular Compra" que **está no bundle de produção**. `/api/get-download-url` libera o download com base em linha de `sales`. Se RLS permite INSERT em `sales` por `authenticated`, é aquisição gratuita de qualquer foto. Ponto de entrada na UI atualmente é código morto, mas a função é chamável pelo console.

**Fix**: remover a função/handler; `REVOKE INSERT` em `sales` de `authenticated`; criar vendas só via webhook validado do AbacatePay.

### 🔴 C5. Preços/cupons no cliente (INFERIDO)
Checkout envia `price` calculado no browser ao `/api/abacate-checkout`. Se a rota confia no valor recebido, paga-se R$0,01 por qualquer carrinho. Cupom+volume empilham e podem zerar. `metadata.userId` client-supplied.

**Fix**: cliente envia só `{cartIds, couponCode}`; servidor recomputa preço a partir do banco e identidade do JWT; entitlement só via webhook assinado.

### 🔴 C6. XSS armazenado na sessão admin (INFERIDO, código explícito)
Modal de rejeição: `template.replace("{{titulo_foto}}", c.title)` + `dangerouslySetInnerHTML`. Título de foto é input livre do fotógrafo. Payload executa no browser do admin (que pode estornar, pagar PIX, deletar contas).

**Fix**: escapar valores interpolados; renderizar preview como texto.

### 🟢 Positivo confirmado
- `photos-original` é **privado** (probe retorna 400 sem assinatura). Download do original é gated server-side por `/api/get-download-url` (que envia Bearer). O código monta uma URL "public" mas o bucket rejeita.
- `/api/send-email` e `/api/get-download-url` retornam 405 em GET (existem, exigem POST).
- HTTPS forçado (HSTS preload), CSP presente e razoavelmente restritiva, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.

### Outros (médio/baixo)
Injeção de filtro PostgREST em `searchPhotos`; sessão não revogada em fotógrafo inativo; impersonation client-side sem auditoria; templates de email sem escape (stored content em caixas da equipe); metadados de build Vercel/Git no bundle; vídeo Stream sem signed URLs.

---

## 8. Regras de negócio quebradas

- **Moderação de fotógrafo cosmética**: `is_active: true` no cadastro; fotógrafo novo loga direto com acesso total; a aprovação do admin é ignorada.
- **Fotos não moderadas públicas**: `getPhotosByEventId`/`getPhotoById` sem filtro de `moderation_status`/`is_public` (rejeitadas/privadas visíveis e compráveis por link direto).
- **Cupons sem limite** de uso/valor mínimo; cupom ignora opt-out `allow_discounts` do evento; stacking pode passar de 100%.
- **Comissão inconsistente**: 0.06 / 0.10 / 0.15 hardcoded em pontos diferentes; vídeo ignora `customVideoRates`.
- **Payout mínimo R$100 não imposto**; taxa de saque diverge (R$1,00 vs R$0,80); saldo com duas fontes de verdade divergentes.
- **`deleteEvent` apaga fotos já vendidas** (compradores perdem acesso); `updateEvent` reescreve todos os títulos das fotos e dispara 1 UPDATE por foto (rajada de milhares de requests).
- **Report de evento é placebo** (só toast, nada persistido).

---

## 9. Transversais: performance, SEO, UX, LGPD

### Performance
- Home: ~10 round-trips + 4 scans concorrentes de `users` antes do primeiro paint.
- `getInactivePhotographerIds` baixa a tabela `users` inteira (cap 1000 → trunca silenciosamente com o crescimento, fotógrafos banidos reaparecem).
- N+1 em cart/checkout (1 request por foto + 1 por evento), Discover puxa 500 e usa 12, imagens base64 em colunas Postgres arrastadas para o browser.
- `bcryptjs` no entry chunk (560 KB) para código morto.

### SEO
- SPA sem SSR: crawlers do WhatsApp/Facebook veem shell vazio, links compartilhados sem preview (justo o loop de crescimento do produto).
- 5 das 6 páginas estáticas + auth + checkout **sem `<title>`/meta/canonical/noindex** próprios (herdam título genérico). Confirmado ao vivo: `/sobre`, `/descobrir`, `/fotografos`, `/contato`, `/ajuda` todas com title `"Suas Melhores Fotos Sempre em um Clique"`.
- Âncoras em inglês (`/about`, `/contact`) não casam no router → middle-click/crawler caem em soft-404 (HTTP 200). URLs reais (`/sobre` etc.) sem nenhum link interno rastreável (páginas órfãs).
- URLs por UUID em vez de slug (existe coluna `slug`).

### UX/acessibilidade
- Cards são `<div onClick>` sem role/tabIndex/teclado (superfície de browse inacessível).
- Modais sem `role=dialog`/focus trap/Escape.
- Mistura de `alert()`/`confirm()` nativos com o sistema de toast próprio.
- Erros de rede indistinguíveis de "não encontrado" em várias telas.

### LGPD (crítico para produto brasileiro com biometria)
- Biometria (selfie/embedding facial) coletada e salva por padrão sem consentimento destacado nem base legal declarada (Art. 11).
- Política de Privacidade omite biometria, direitos do titular, DPO, retenção, operadores e transferência internacional.
- GA + Meta Pixel disparam antes do banner de consentimento (banner é decorativo, sem Consent Mode v2 nem gating de scripts).

---

## 10. Recomendações priorizadas

### P0 (fazer agora, risco ativo)
1. **RLS**: habilitar em todas as tabelas `public`, default-deny, revogar DML de `anon`/`authenticated`, expor só views/RPCs com colunas públicas. Fecha C1 e boa parte de C4.
2. **RPCs**: adicionar checagem de `auth.uid()`/role em `get_admin_stats`, `get_photographers_with_stats` e todas as `SECURITY DEFINER`. Fecha C2.
3. **Rotas `/api`**: auditar o código server-side de `abacate-stats`, `abacate-refund`, `send-email`, `rekognition`, `abacate-checkout`; exigir JWT verificado + role; recomputar preços/entitlement no servidor; entrega só via webhook assinado. Fecha C3 e C5.
4. **Bypass de compra**: remover `purchasePhoto`/dialog "Simular Compra"; revogar INSERT em `sales`. Fecha C4.
5. **XSS admin**: escapar interpolação no modal de rejeição. Fecha C6.
6. **Cupom 100%/`TESTE01`** e cupons de teste ativos: desativar; adicionar limite de uso e valor mínimo.

### P1 (semana)
7. LGPD: reescrever Política de Privacidade (biometria, direitos, DPO, retenção, operadores, transferência internacional); consentimento explícito para selfie; gating de tracking por consentimento.
8. Instalar `@tailwindcss/typography` (ou classes explícitas) para Termos/Privacidade renderizarem; fixar data de "última atualização".
9. Filtrar `moderation_status='approved'` + `is_public=true` em `getPhotosByEventId`/`getPhotoById`.
10. Corrigir loop de render em `/checkout-success`; `Math.round` nos centavos; campo CPF; clamp único de desconto.
11. Corrigir moderação de fotógrafo (aprovação real server-side); revogar sessão de fotógrafo inativo; `/reset-password` checar tipo de evento PASSWORD_RECOVERY.
12. `deleteEvent` preservar fotos vendidas (padrão de `deletePhotographer`); assinar URLs de vídeo Cloudflare Stream.

### P2 (backlog)
13. SEO: SSR/prerender das rotas públicas (evento/foto/portfólio/categoria) ou OG tags server-side; corrigir âncoras pt-BR; slug nas URLs; noindex em transacionais.
14. Perf: `getPhotosByIds` no lugar de N+1; `getInactivePhotographerIds` filtrado server-side; mover imagens base64 para Storage; `.range()` server-side.
15. Refatorar a camada de dados por domínio e mover toda escrita para RPCs; remover código morto (bcryptjs, `getStats`, `analyzePhoto`).
16. Acessibilidade (cards com role/teclado, modais com focus trap); unificar feedback em toast; consolidar duplicação auth (páginas vs modais) e o motor de preços (3 cópias).

---

## 11. Anexo: confirmado ao vivo vs inferido

| Item | Método |
|---|---|
| Stack (Vercel/Supabase/Vite/React), CSP, headers | CONFIRMADO (headers + bundle) |
| Rotas, tabelas, RPCs, edge fn, buckets, endpoints `/api` | CONFIRMADO (strings do bundle) |
| Leitura anônima de `users`/`sales`/`payouts`/`coupons`/`system_settings`/`carts`/`reports` | CONFIRMADO (REST probe) |
| `get_admin_stats` / `get_photographers_with_stats` anônimos | CONFIRMADO (RPC probe) |
| `users.password` inexistente (invalida "leak de hash") | CONFIRMADO (`42703`) |
| `photos-original` privado (originais protegidos) | CONFIRMADO (400 sem assinatura) |
| 140 usuários, 17 com `pix_key` exposta | CONFIRMADO (count) |
| Rotas `/api` de dinheiro sem auth; escrita anônima; XSS admin; bypass `purchasePhoto`; preços client-side | INFERIDO do código (não testei escrita/rotas server-side) |

Arquivos brutos da análise em `raw/` (HTML, `index.js`, `index.css`, `chunks/`, `modules_extract.txt`).
