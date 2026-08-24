import os
from PIL import Image, ImageDraw

def generate_sample_photo(filename="sample_runner.jpg"):
    # Criar uma imagem de alta resolução simulando uma foto esportiva (2048x1365)
    width, height = 2048, 1365
    img = Image.new("RGB", (width, height), color=(28, 35, 48))
    draw = ImageDraw.Draw(img)

    # Fundo estilizado com gradiente de pista de corrida
    for y in range(height):
        ratio = y / height
        r = int(25 + ratio * 40)
        g = int(35 + ratio * 80)
        b = int(60 + ratio * 140)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Desenhar faixas de pista e elementos gráficos de corrida
    draw.polygon([(0, height), (width, height), (width * 0.7, height * 0.4), (width * 0.3, height * 0.4)], fill=(180, 50, 40))
    for i in range(1, 5):
        x_start = int(width * (0.2 + i * 0.12))
        draw.line([(x_start, int(height * 0.4)), (int(width * (0.05 + i * 0.22)), height)], fill=(255, 255, 255), width=6)

    # Detalhe central simulando atleta em corrida
    draw.ellipse([width * 0.45, height * 0.25, width * 0.55, height * 0.40], fill=(240, 190, 140))
    draw.rectangle([width * 0.42, height * 0.40, width * 0.58, height * 0.65], fill=(20, 120, 220))
    draw.text((int(width * 0.47), int(height * 0.50)), "42", fill=(255, 255, 255))

    img.save(filename, "JPEG", quality=95)
    print(f"Foto de exemplo esportiva gerada com sucesso: {filename}")

if __name__ == "__main__":
    generate_sample_photo()
