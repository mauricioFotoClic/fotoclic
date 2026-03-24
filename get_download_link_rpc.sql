CREATE OR REPLACE FUNCTION get_download_link(p_photo_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_file_url TEXT;
    v_photographer_id UUID;
    v_sale_exists BOOLEAN;
BEGIN
    -- 1. Buscar os dados da foto
    SELECT file_url, photographer_id INTO v_file_url, v_photographer_id
    FROM photos
    WHERE id = p_photo_id;

    IF v_file_url IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Foto não encontrada.');
    END IF;

    -- 2. Verificar permissão de acesso:
    --    a) Fotógrafo dono da foto → acesso liberado
    --    b) Cliente que comprou a foto → acesso liberado
    IF v_photographer_id = auth.uid() THEN
        -- Dono da foto, acesso liberado
    ELSE
        -- Verificar se existe venda para este comprador e esta foto
        SELECT EXISTS (
            SELECT 1 FROM sales
            WHERE buyer_id  = auth.uid()
              AND photo_id  = p_photo_id
        ) INTO v_sale_exists;

        IF NOT v_sale_exists THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Acesso negado. Você precisa comprar a foto para fazer o download.'
            );
        END IF;
    END IF;

    -- 3. Retornar o file_url (Base64 data URL armazenado diretamente na coluna)
    RETURN jsonb_build_object('success', true, 'url', v_file_url);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
