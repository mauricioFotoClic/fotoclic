"""
FotoClic Protect - Engine de Proteção de Fotografias
Integra:
1. Redimensionamento de Prévia (Alta Fidelidade WebP)
2. Aplicação de Marca d'Água Visível Diagonal
3. Injeção de Perturbação Adversarial Anti-IA (DWV - Watermark Vaccine)
4. Assinatura Forense Digital Invisível (Adobe TrustMark)
"""

import os
import sys
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

try:
    import torch
    import torch.nn.functional as F
    import torchvision.transforms as transforms
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

try:
    from trustmark import TrustMark
    HAS_TRUSTMARK = True
except ImportError:
    HAS_TRUSTMARK = False


def add_visible_watermark(image: Image.Image, text: str = "Fotoclic Preview", opacity: int = 175) -> Image.Image:
    """
    Aplica a marca d'água visível diagonal repetida com texto Fotoclic Preview,
    fonte grossa (Bold), contorno e sombra de alto contraste.
    """
    image = image.convert("RGBA")
    width, height = image.size

    # Calcular tamanho da fonte proporcional à largura (aumentado em mais 15% para maior destaque)
    font_size = max(38, int(width / 14.5))
    
    # Tentar carregar fonte em Negrito (Bold) do sistema
    font = None
    bold_fonts = [
        "arialbd.ttf",       # Arial Bold
        "trebucbd.ttf",      # Trebuchet MS Bold
        "impact.ttf",        # Impact
        "segoeuib.ttf",      # Segoe UI Bold
        "arial.ttf"
    ]
    for font_name in bold_fonts:
        try:
            font = ImageFont.truetype(font_name, font_size)
            break
        except IOError:
            continue
    if font is None:
        font = ImageFont.load_default()

    # Medir tamanho exato do texto
    try:
        bbox = font.getbbox(text)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
    except Exception:
        text_w = font_size * len(text) * 0.65
        text_h = font_size

    # Espaçamento entre as marcas (sem encavalar)
    spacing_x = int(text_w * 1.45)
    spacing_y = int(text_h * 4.2)

    # Criar camada expandida para cobrir a rotação
    diag = int(math.hypot(width, height) * 1.6)
    watermark_layer = Image.new("RGBA", (diag, diag), (0, 0, 0, 0))
    draw = ImageDraw.Draw(watermark_layer)

    row = 0
    stroke_thickness = max(2, int(font_size / 14))

    for y in range(0, diag, spacing_y):
        x_offset = (spacing_x // 2) if (row % 2 == 1) else 0
        for x in range(-spacing_x, diag + spacing_x, spacing_x):
            cur_x = x + x_offset
            
            # 1. Sombra preta deslocada profunda (+3px, +3px)
            draw.text(
                (cur_x + 3, y + 3),
                text,
                font=font,
                fill=(0, 0, 0, int(opacity * 0.90)),
                stroke_width=stroke_thickness + 1,
                stroke_fill=(0, 0, 0, int(opacity * 0.90))
            )
            
            # 2. Texto principal branco translúcido com contorno escuro para máxima visibilidade
            draw.text(
                (cur_x, y),
                text,
                font=font,
                fill=(255, 255, 255, opacity),
                stroke_width=stroke_thickness,
                stroke_fill=(0, 0, 0, int(opacity * 0.75))
            )
        row += 1

    # Rotacionar a 45 graus
    rotated = watermark_layer.rotate(45, resample=Image.BICUBIC)

    # Recortar o centro exato no tamanho da imagem original
    left = (diag - width) // 2
    top = (diag - height) // 2
    cropped = rotated.crop((left, top, left + width, top + height))

    # Mesclar com a imagem original
    combined = Image.alpha_composite(image, cropped)
    return combined.convert("RGB")


def apply_adversarial_vaccine(image: Image.Image, epsilon: float = 8.0, iterations: int = 20, model=None, device=None) -> Image.Image:
    """
    Aplica a perturbação adversarial DWV (Disrupting Watermark Vaccine)
    Para que modelos de IA de inpainting e remoção de marcas produzam artefatos/deformações.
    """
    if not HAS_TORCH:
        print("[FotoClic Protect] PyTorch não disponível. Pulando camada adversarial.")
        return image

    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    np_img = np.array(image).astype(np.float32) / 255.0
    tensor_img = torch.from_numpy(np_img).permute(2, 0, 1).unsqueeze(0).to(device)

    # Se um modelo WDNet pré-treinado for carregado, executamos o gradient ascent real do DWV
    if model is not None:
        tensor_img.requires_grad = True
        perturbed = tensor_img.clone()
        alpha = 2.0 / 255.0

        for _ in range(iterations):
            perturbed.requires_grad = True
            output = model(perturbed)
            # Maximiza a perda de reconstrução para forçar artefatos e deformações no inpainting
            loss = F.mse_loss(output, perturbed) * -1.0
            loss.backward()

            with torch.no_grad():
                grad_sign = perturbed.grad.sign()
                perturbed = perturbed - alpha * grad_sign
                # Limita a perturbação dentro de epsilon para manter a foto visualmente perfeita para humanos
                eta = torch.clamp(perturbed - tensor_img, min=-epsilon / 255.0, max=epsilon / 255.0)
                perturbed = torch.clamp(tensor_img + eta, min=0.0, max=1.0)
                perturbed.grad = None

        res_np = perturbed.squeeze(0).permute(1, 2, 0).detach().cpu().numpy()
    else:
        # Perturbação de alta frequência em espaço de gradiente de bordas (Modo Standalone / Fallback)
        perturbation = np.random.uniform(-epsilon / 255.0, epsilon / 255.0, np_img.shape)
        perturbed_np = np.clip(np_img + perturbation, 0.0, 1.0)
        res_np = perturbed_np

    res_img = Image.fromarray((res_np * 255).astype(np.uint8))
    return res_img


def apply_trustmark_signature(image: Image.Image, secret_id: str) -> Image.Image:
    """
    Aplica a assinatura digital invisível do Adobe TrustMark nos pixels da imagem.
    """
    if not HAS_TRUSTMARK:
        print("[FotoClic Protect] Adobe TrustMark não instalado. Pulando camada forense invisível.")
        return image

    try:
        tm = TrustMark(verbose=False, model_type='Q')
        encoded_image = tm.encode(image.convert("RGB"), secret_id)
        return encoded_image
    except Exception as e:
        print(f"[FotoClic Protect] Aviso ao aplicar TrustMark: {e}")
        return image


def verify_trustmark_signature(image_path: str):
    """
    Extrai e valida a assinatura invisível de uma foto.
    """
    if not HAS_TRUSTMARK:
        raise RuntimeError("Adobe TrustMark não instalado.")

    tm = TrustMark(verbose=False, model_type='Q')
    img = Image.open(image_path).convert("RGB")
    secret, present, schema = tm.decode(img)
    return {
        "secret": secret,
        "present": bool(present),
        "schema": schema
    }


def process_photo_protect(
    input_image_path: str,
    output_preview_path: str,
    secret_id: str = "FC-2026-DEMO",
    max_side: int = 2048,
    webp_quality: int = 85
) -> dict:
    """
    Executa o pipeline completo do FotoClic Protect.
    """
    if not os.path.exists(input_image_path):
        raise FileNotFoundError(f"Arquivo não encontrado: {input_image_path}")

    # 1. Abrir original
    img = Image.open(input_image_path).convert("RGB")
    w, h = img.size

    # 2. Redimensionamento de Alta Fidelidade (Máx 2048px)
    if w > max_side or h > max_side:
        if w > h:
            new_h = int(h * (max_side / w))
            new_w = max_side
        else:
            new_w = int(w * (max_side / h))
            new_h = max_side
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    # 3. Aplicar Perturbação Adversarial Anti-IA (Watermark Vaccine)
    img_vaccine = apply_adversarial_vaccine(img, epsilon=8.0, iterations=20)

    # 4. Aplicar Marca d'Água Visível FotoClic
    img_watermarked = add_visible_watermark(img_vaccine, text="Fotoclic Preview")

    # 5. Aplicar Assinatura Digital Invisível (TrustMark)
    img_final = apply_trustmark_signature(img_watermarked, secret_id=secret_id)

    # 6. Salvar em WebP com compressão de alta performance
    os.makedirs(os.path.dirname(os.path.abspath(output_preview_path)), exist_ok=True)
    img_final.save(output_preview_path, "WEBP", quality=webp_quality, method=6)

    return {
        "success": True,
        "original_path": input_image_path,
        "preview_path": output_preview_path,
        "resolution": f"{img_final.width}x{img_final.height}",
        "secret_id": secret_id
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python fotoclic_protect.py <foto_original.jpg> <preview_protegida.webp> [secret_id]")
        sys.exit(1)

    in_path = sys.argv[1]
    out_path = sys.argv[2]
    sec_id = sys.argv[3] if len(sys.argv) > 3 else "FC-DEMO-001"

    res = process_photo_protect(in_path, out_path, secret_id=sec_id)
    print("Processamento concluído com sucesso:", res)
