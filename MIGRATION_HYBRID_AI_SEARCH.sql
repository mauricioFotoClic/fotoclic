-- ==============================================================================
-- FOTOCLIC - MIGRATION HYBRID AI SEARCH (VISUAL + FACIAL + OCR)
-- Adiciona suporte a busca multimodal para esportes de acao (Surfe, Ciclismo, etc)
-- ==============================================================================

-- 1. Adicionar colunas de inteligencia visual e OCR na tabela photos
ALTER TABLE public.photos 
ADD COLUMN IF NOT EXISTS visual_labels jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS detected_numbers text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS is_ai_indexed boolean DEFAULT false;

-- 2. Criar indices GIN para busca instantanea em alta escala
CREATE INDEX IF NOT EXISTS idx_photos_visual_labels ON public.photos USING gin (visual_labels);
CREATE INDEX IF NOT EXISTS idx_photos_detected_numbers ON public.photos USING gin (detected_numbers);

-- 3. Funcao de busca hibrida otimizada (Busca por similaridade de tags e numeros em um evento)
CREATE OR REPLACE FUNCTION public.search_photos_hybrid(
    p_event_id uuid DEFAULT NULL,
    p_numbers text[] DEFAULT '{}'::text[],
    p_labels text[] DEFAULT '{}'::text[],
    p_limit integer DEFAULT 100
)
RETURNS TABLE (
    id uuid,
    event_id uuid,
    photographer_id uuid,
    title text,
    preview_url text,
    thumb_url text,
    price numeric,
    resolution text,
    match_score numeric,
    match_reasons text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.event_id,
        p.photographer_id,
        p.title,
        p.preview_url,
        p.thumb_url,
        p.price,
        p.resolution,
        -- Calculo de Score de Relevancia
        (
            -- Pontos por numero da lycra correspondente (peso alto: 50 pts cada)
            COALESCE((
                SELECT count(*)::numeric * 50.0 
                FROM unnest(p.detected_numbers) num 
                WHERE num = ANY(p_numbers)
            ), 0.0) +
            -- Pontos por objetos/equipamentos visuais correspondentes (peso medio: 10 pts cada)
            COALESCE((
                SELECT count(*)::numeric * 10.0
                FROM jsonb_array_elements(p.visual_labels) elem
                WHERE (elem->>'Name') = ANY(p_labels)
            ), 0.0)
        ) AS match_score,
        -- Motivos de correspondencia
        ARRAY(
            SELECT 'Número ' || num FROM unnest(p.detected_numbers) num WHERE num = ANY(p_numbers)
            UNION
            SELECT 'Visual: ' || (elem->>'Name') FROM jsonb_array_elements(p.visual_labels) elem WHERE (elem->>'Name') = ANY(p_labels)
        ) AS match_reasons
    FROM public.photos p
    WHERE 
        (p_event_id IS NULL OR p.event_id = p_event_id)
        AND p.is_approved = true
        AND (
            (cardinality(p_numbers) > 0 AND p.detected_numbers && p_numbers)
            OR
            (cardinality(p_labels) > 0 AND EXISTS (
                SELECT 1 FROM jsonb_array_elements(p.visual_labels) elem
                WHERE (elem->>'Name') = ANY(p_labels)
            ))
        )
    ORDER BY match_score DESC, p.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Permissoes para execucao da funcao
GRANT EXECUTE ON FUNCTION public.search_photos_hybrid(uuid, text[], text[], integer) TO anon, authenticated, service_role;
