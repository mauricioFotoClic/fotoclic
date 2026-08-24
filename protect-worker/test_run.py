"""
Script de Benchmark e Teste do FotoClic Protect (Fase 1 - Laboratório)
Gera versões comparativas de teste para validação contra ferramentas de IA.
"""

import os
import sys
import time

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from fotoclic_protect import (
    add_visible_watermark,
    apply_adversarial_vaccine,
    apply_trustmark_signature,
    process_photo_protect
)
from PIL import Image

def run_benchmark(input_image: str, output_dir: str = "benchmark_output"):
    if not os.path.exists(input_image):
        print(f"[Erro] Imagem {input_image} nao encontrada.")
        return

    os.makedirs(output_dir, exist_ok=True)
    base_name = os.path.splitext(os.path.basename(input_image))[0]

    print("\n==========================================")
    print("Iniciando Benchmark FotoClic Protect")
    print(f"Foto de entrada: {input_image}")
    print("==========================================")

    img = Image.open(input_image).convert("RGB")
    max_side = 2048
    if img.width > max_side or img.height > max_side:
        if img.width > img.height:
            new_h = int(img.height * (max_side / img.width))
            new_w = max_side
        else:
            new_w = int(img.width * (max_side / img.height))
            new_h = max_side
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    # Versão A: Prévia Convencional apenas com Marca d'Água Visível
    t0 = time.time()
    img_a = add_visible_watermark(img.copy(), "Fotoclic Preview")
    out_a = os.path.join(output_dir, f"{base_name}_A_normal_wm.webp")
    img_a.save(out_a, "WEBP", quality=85)
    t_a = (time.time() - t0) * 1000
    print(f"[OK] Versao A (Convencional): {out_a} ({t_a:.1f}ms)")

    # Versão B: Prévia com Watermark Vaccine (DWV Anti-IA) + Marca d'Água
    t0 = time.time()
    img_b_vac = apply_adversarial_vaccine(img.copy(), epsilon=8.0, iterations=20)
    img_b = add_visible_watermark(img_b_vac, "Fotoclic Preview")
    out_b = os.path.join(output_dir, f"{base_name}_B_vaccine_protected.webp")
    img_b.save(out_b, "WEBP", quality=85)
    t_b = (time.time() - t0) * 1000
    print(f"[OK] Versao B (Watermark Vaccine DWV Anti-IA): {out_b} ({t_b:.1f}ms)")

    # Versão C: Proteção Completa (Vaccine + Marca Visível + TrustMark Invisível)
    t0 = time.time()
    img_c = apply_trustmark_signature(img_b.copy(), "FC-2026-TEST-001")
    out_c = os.path.join(output_dir, f"{base_name}_C_full_protect.webp")
    img_c.save(out_c, "WEBP", quality=85)
    t_c = (time.time() - t0) * 1000
    print(f"[OK] Versao C (Protecao Completa): {out_c} ({t_c:.1f}ms)")

    print(f"\n[Sucesso] Todos os arquivos foram gerados na pasta: {output_dir}")
    print("Agora voce pode enviar as versoes A e B para o WatermarkRemover.io e comparar o resultado!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python test_run.py <foto_exemplo.jpg>")
    else:
        run_benchmark(sys.argv[1])
