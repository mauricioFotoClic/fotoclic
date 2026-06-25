# Plano de Configuração do Ambiente e Correção de Corte de Imagens

Este documento descreve o plano de implementação para verificar/configurar o ambiente do projeto (Git e Vercel) e aplicar a solução de exibição de imagens (Opção B) para evitar que as cabeças das pessoas sejam cortadas nos cards de eventos e listagens de fotos.

## User Review Required

> [!NOTE]
> O usuário escolheu a **Opção B**: exibir a imagem inteira sem cortes usando `object-fit: contain` com um fundo desfocado (blur) da própria imagem para preencher o contêiner de proporção fixa (aspect-ratio horizontal).
>
> Verificamos que o Git já está inicializado localmente e possui o repositório remoto apontado para `mauricioFotoClic/fotoclic.git` no GitHub. O projeto também possui a estrutura da Vercel configurada (`.vercel` e `vercel.json` presentes).

---

## Proposed Changes

### [Infraestrutura & Ambiente]

#### [VERIFY] Git e Vercel
- Confirmar que o Git local está com a working tree limpa (verificado: OK).
- Confirmar que o arquivo `.gitignore` exclui adequadamente pastas desnecessárias como `node_modules`, `.vercel`, `.env.local` (verificado: OK).

---

### [Frontend Component - WatermarkedImage]

#### [MODIFY] [WatermarkedImage.tsx](file:///d:/Backup%20PC%20HP/Projetos/Mauricio/FotoClic-NEW/fotoclic/components/WatermarkedImage.tsx)
- Adicionar a propriedade `containWithBlur?: boolean` na interface `WatermarkedImageProps`.
- Quando `containWithBlur` for verdadeiro:
  - Renderizar uma imagem de fundo desfocada com `absolute inset-0 w-full h-full object-cover filter blur-md opacity-45 scale-110`.
  - Renderizar a imagem real por cima com `relative z-10 block w-full h-full object-contain`.
  - Ajustar o contêiner para ter fundo escuro (`bg-neutral-950`) em vez de cinza claro (`bg-neutral-100`) para realçar a foto centralizada.
  - Elevar a camada de proteção para `z-20` e a marca d'água para `z-30` para garantir que fiquem no topo da imagem contida.
- Quando for falso, manter o comportamento padrão de corte com `object-cover`.

---

### [Frontend Components - Ativação da Opção B]

#### [MODIFY] [PhotoCard.tsx](file:///d:/Backup%20PC%20HP/Projetos/Mauricio/FotoClic-NEW/fotoclic/components/PhotoCard.tsx)
- Passar a prop `containWithBlur={true}` para o componente `<WatermarkedImage />` na exibição da foto de visualização pública.

#### [MODIFY] [PhotographerPortfolioPreview.tsx](file:///d:/Backup%20PC%20HP/Projetos/Mauricio/FotoClic-NEW/fotoclic/components/photographer/PhotographerPortfolioPreview.tsx)
- Passar a prop `containWithBlur={true}` para o componente `<WatermarkedImage />` que exibe a capa do evento no grid de eventos.

#### [MODIFY] [PhotographerPhotos.tsx](file:///d:/Backup%20PC%20HP/Projetos/Mauricio/FotoClic-NEW/fotoclic/components/photographer/PhotographerPhotos.tsx)
- Passar a prop `containWithBlur={true}` para o componente `<WatermarkedImage />` que exibe a capa do evento na listagem de gerenciamento de fotos do fotógrafo.

---

## Verification Plan

### Automated Tests
- Executar linting e validação de tipos TypeScript para garantir que não há erros de compilação:
  ```powershell
  npm run lint
  npx tsc --noEmit
  ```

### Manual Verification
- Iniciar o servidor de desenvolvimento:
  ```powershell
  npm run dev
  ```
- Acessar o portfólio no navegador e validar visualmente se os cards de eventos e cards de fotos agora mostram as fotos inteiras sem cortar as cabeças, com o efeito premium de fundo desfocado.

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass (Arquivos editados 100% limpos)
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-25
