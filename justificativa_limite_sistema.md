# Justificativa Técnica e Comercial: Limite de 500 Fotos por Evento

Este documento detalha as razões técnicas, operacionais e de experiência do usuário para a implementação do limite padrão de 500 fotos por fotógrafo/evento na plataforma.

## 1. Desempenho e Estabilidade da Plataforma (Crítico)
O motivo principal é garantir que o site carregue rápido para **todos**, especialmente para o cliente final.
*   **Limitação dos Navegadores**: Navegadores, especialmente em celulares (onde ocorre a maioria das compras), têm memória limitada. Tentar carregar galerias com milhares de miniaturas de uma só vez trava o celular do cliente.
*   **Crash de Aplicação**: Galerias muito pesadas causam "lags" na rolagem e podem fechar o navegador inesperadamente, fazendo o cliente desistir da compra.
*   **Limite Seguro**: Testes mostram que 500 fotos é um ponto de equilíbrio ideal onde a galeria carrega instantaneamente e a rolagem permanece fluida.

## 2. Experiência de Compra (UX) e Conversão de Vendas
Mais fotos não significam mais vendas. Na verdade, o excesso de fotos ruins ("lixo") atrapalha a venda das boas.
*   **Paralisia da Escolha**: Quando um cliente vê 3.000 fotos, ele se sente sobrecarregado e desiste de procurar a dele.
*   **Curadoria Forçada**: O limite incentiva o fotógrafo a subir apenas as **melhores fotos** (focadas, bem enquadradas). Uma galeria "limpa" passa uma imagem muito mais profissional.
*   **Facilidade de Encontrar**: Com menos fotos repetidas ou de teste, o cliente encontra a foto dele mais rápido, aumentando a chance de conversão imediata.

## 3. Confiabilidade no Upload
*   **Falhas de Rede**: Fazer upload de milhares de arquivos de uma vez aumenta exponencialmente a chance de erros de rede, timeouts ou arquivos corrompidos no meio do processo. Lotes menores garantem que tudo o que foi enviado chegou com segurança.

## 4. Custo e Sustentabilidade do Negócio
*   **Armazenamento e Processamento**: Cada foto exige processamento (redimensionamento, marca d'água, reconhecimento facial). Controlar o volume impede custos desnecessários com fotos que nunca serão vendidas (fotos tremidas, de teste, etc).

---

### Resumo para o Cliente
> *"O limite de 500 fotos não é para prender o fotógrafo, é para proteger a venda. Galerias gigantes travam o celular do comprador e dificultam que ele ache a foto dele. Ao focar nas 500 melhores, garantimos que o site voe, que o cliente tenha uma experiência premium e que a venda aconteça sem frustrações."*
