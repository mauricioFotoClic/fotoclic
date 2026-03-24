import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    // --- Validar env ---
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error('[DownloadURL] Credenciais Supabase ausentes.');
        return res.status(500).json({ error: 'Erro de configuração do servidor.' });
    }

    // --- Extrair JWT do usuário autenticado ---
    const authHeader = req.headers.authorization || '';
    const userJwt = authHeader.replace('Bearer ', '').trim();

    if (!userJwt) {
        return res.status(401).json({ error: 'Não autenticado.' });
    }

    try {
        const { photoId } = req.body;

        // Validar UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!photoId || !uuidRegex.test(photoId)) {
            return res.status(400).json({ error: 'ID de foto inválido.' });
        }

        // Cliente com service role (para gerar signed URL)
        const adminClient = createClient(supabaseUrl, serviceKey);

        // Cliente autenticado como o usuário (para verificar RLS)
        const userClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${userJwt}` } }
        });

        // 1. Identificar o usuário pelo JWT
        const { data: { user }, error: userError } = await userClient.auth.getUser();
        if (userError || !user) {
            return res.status(401).json({ error: 'Token inválido ou expirado.' });
        }

        const userId = user.id;

        // 2. Buscar dados da foto (file_url e photographer_id)
        const { data: photo, error: photoError } = await adminClient
            .from('photos')
            .select('file_url, photographer_id')
            .eq('id', photoId)
            .single();

        if (photoError || !photo) {
            return res.status(404).json({ error: 'Foto não encontrada.' });
        }

        // 3. Verificar permissão: dono da foto OU comprador
        const isOwner = photo.photographer_id === userId;

        if (!isOwner) {
            const { data: sale } = await adminClient
                .from('sales')
                .select('id')
                .eq('photo_id', photoId)
                .eq('buyer_id', userId)
                .maybeSingle();

            if (!sale) {
                console.warn(`[DownloadURL] Acesso negado: user=${userId} photo=${photoId}`);
                return res.status(403).json({ error: 'Acesso negado. Você precisa comprar a foto para baixá-la.' });
            }
        }

        // 4. Gerar signed URL do bucket privado (válida 1 hora)
        const { data: signedData, error: signedError } = await adminClient.storage
            .from('photos-original')
            .createSignedUrl(photo.file_url, 3600);

        if (signedError || !signedData?.signedUrl) {
            console.error('[DownloadURL] Erro ao gerar signed URL:', signedError?.message);
            return res.status(500).json({ error: 'Não foi possível gerar o link de download.' });
        }

        console.log(`[DownloadURL] Link gerado: user=${userId} photo=${photoId}`);
        return res.status(200).json({ url: signedData.signedUrl });

    } catch (error) {
        console.error('[DownloadURL] Erro interno:', error);
        return res.status(500).json({ error: 'Erro interno ao processar a solicitação.' });
    }
}
