# 🛡️ FotoClic Protect Worker

Microserviço em Python de alta performance para proteção de imagens contra Inteligências Artificiais de remoção de marcas d'água (*Watermark Vaccine / DWV*) e assinatura forense invisível (*Adobe TrustMark*).

---

## 📁 Estrutura de Arquivos

* `requirements.txt`: Dependências do ambiente Python e PyTorch com suporte a CUDA.
* `fotoclic_protect.py`: Motor principal de processamento de imagens.
* `test_run.py`: Script de benchmark comparativo (Versão A, B e C) para testes contra IAs de inpainting.

---

## 🚀 Como Executar o Teste (Fase 1 - Laboratório)

### Opção 1: No RunPod / Servidor Linux com GPU NVIDIA
```bash
# 1. Instalar dependências
pip install -r requirements.txt

# 2. Rodar o benchmark comparativo em uma foto de teste
python test_run.py foto_teste.jpg
```

### Opção 2: Testar uma foto individualmente e salvar como WebP
```bash
python fotoclic_protect.py foto_original.jpg preview_protegida.webp FC-2026-001
```

---

## 🔍 Como Validar a Eficácia (Teste de Ataque por IA)
1. Pegue o arquivo gerado em `benchmark_output/*_B_vaccine_protected.webp` ou `*_C_full_protect.webp`.
2. Acesse uma ferramenta pública de remoção de marca d'água (ex: [WatermarkRemover.io](https://www.watermarkremover.io/) ou [Cleanup.pictures](https://cleanup.pictures/)).
3. Envie a foto protegida e compare com a foto normal (`*_A_normal_wm.webp`).
4. A versão com **Watermark Vaccine** forçará o modelo de IA a gerar deformações, borrões ou artefatos texturais na tentativa de remoção.
