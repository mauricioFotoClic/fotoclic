CREATE OR REPLACE FUNCTION get_download_link(p_photo_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_file_path TEXT;
    v_photographer_id UUID;
    v_sale_exists BOOLEAN;
    v_signed_url TEXT;
BEGIN
    -- 1. Buscar o caminho do arquivo original e o dono da foto
    SELECT file_url, photographer_id INTO v_file_path, v_photographer_id
    FROM photos
    WHERE id = p_photo_id;

    IF v_file_path IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Foto não encontrada.');
    END IF;

    -- 2. Verificar permissão de acesso:
    --    a) Fotógrafo dono da foto → acesso liberado
    --    b) Cliente que comprou a foto → acesso liberado
    IF v_photographer_id = auth.uid() THEN
        -- Dono da foto, acesso liberado
    ELSE
        -- Verificar compra diretamente na tabela sales (buyer_id + photo_id)
        SELECT EXISTS (
            SELECT 1 FROM sales
            WHERE buyer_id = auth.uid()
              AND photo_id = p_photo_id
        ) INTO v_sale_exists;

        IF NOT v_sale_exists THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Acesso negado. Você precisa comprar a foto para fazer o download.'
            );
        END IF;
    END IF;

    -- 3. Gerar URL assinada do bucket privado (válida por 1 hora = 3600 segundos)
    SELECT storage.create_signed_url('photos-original', v_file_path, 3600)
    INTO v_signed_url;

    IF v_signed_url IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Não foi possível gerar o link de download. Contate o suporte.');
    END IF;

    RETURN jsonb_build_object('success', true, 'url', v_signed_url);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
