import { createClient } from '@supabase/supabase-js';
import appmax from '../lib/appmax-client.js';
import { sendSaleNotifications } from '../lib/sale-notifications.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    const origin = req.headers.origin;
    const allowedOrigins = [
        'https://www.fotoclic.com.br',
        'https://fotoclic.com.br',
        'http://localhost:5173',
        'http://localhost:3000'
    ];
    if (origin && (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', 'https://www.fotoclic.com.br');
    }
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

    try {
        const { photoId, action } = req.body || {};

        // Rota para geração de Presigned Upload URLs do S3 (Flash Upload)
        if (action === 'getUploadUrl' || action === 's3-upload-url' || req.query.action === 'getUploadUrl') {
            const { fileName, fileType, folder = 'previews', photographerId, eventId } = req.body || {};
            if (!fileName || !photographerId || !eventId) {
                return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes (fileName, photographerId, eventId).' });
            }
            const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
            const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
            const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'fotoclic-media-storage';
            const REGION = process.env.AWS_REGION || 'us-east-1';

            const s3Client = new S3Client({
                region: REGION,
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                },
            });

            const cleanPhotographerId = String(photographerId).replace(/[^a-zA-Z0-9_-]/g, '');
            const cleanEventId = String(eventId).replace(/[^a-zA-Z0-9_-]/g, '');
            const cleanFileName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '');

            const key = `${folder}/${cleanPhotographerId}/${cleanEventId}/${cleanFileName}`;

            const putCommand = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                ContentType: fileType || 'image/jpeg',
            });

            const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 900 });
            const publicUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;

            return res.status(200).json({
                uploadUrl,
                publicUrl,
                s3Key: key,
                bucket: BUCKET_NAME,
                region: REGION
            });
        }

        // --- Extrair JWT do usuário autenticado para operações de compra/download ---
        const authHeader = req.headers.authorization || '';
        const userJwt = authHeader.replace('Bearer ', '').trim();

        if (!userJwt) {
            return res.status(401).json({ error: 'Não autenticado.' });
        }

        // Rota para buscar compras do usuário autenticado com fotos e fotógrafos
        if (action === 'get-purchases' || req.query.action === 'get-purchases') {
            return await handleGetPurchases(req, res, userJwt, supabaseUrl, serviceKey);
        }

        // Rota para sincronização de compras pendentes (Consolidado de sync-purchases.js)
        if (action === 'sync-purchases' || req.query.action === 'sync-purchases' || !photoId) {
            return await handleSyncPurchases(req, res, userJwt, supabaseUrl, serviceKey);
        }

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

        // Verificar se o usuário solicitante é administrador
        const { data: userProfile } = await adminClient
            .from('users')
            .select('role, email')
            .eq('id', userId)
            .maybeSingle();

        const isAdmin = userProfile?.role === 'admin' || user.email === 'svalmauricio@gmail.com';

        // 2. Buscar dados da foto (file_url e photographer_id)
        const { data: photo, error: photoError } = await adminClient
            .from('photos')
            .select('file_url, photographer_id, media_type, video_uid')
            .eq('id', photoId)
            .single();

        if (photoError || !photo) {
            return res.status(404).json({ error: 'Foto não encontrada.' });
        }

        // 3. Verificar permissão: dono da foto OU admin OU comprador
        const isOwner = photo.photographer_id === userId;

        if (!isOwner && !isAdmin) {
            const { data: sale } = await adminClient
                .from('sales')
                .select('id')
                .eq('photo_id', photoId)
                .eq('buyer_id', userId)
                .neq('status', 'refunded')
                .maybeSingle();

            if (!sale) {
                console.warn(`[DownloadURL] Acesso negado: user=${userId} photo=${photoId}`);
                return res.status(403).json({ error: 'Acesso negado. Você precisa comprar a foto para baixá-la.' });
            }
        }

        // 4. Se for vídeo, obter link de download do Cloudflare Stream
        if (photo.media_type === 'video') {
            const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = process.env;

            if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
                console.error('[DownloadURL] Credenciais Cloudflare ausentes.');
                return res.status(500).json({ error: 'Erro de configuração do servidor de vídeos.' });
            }

            try {
                // Dispara a geração de download no Cloudflare (idempotente)
                await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${photo.video_uid}/downloads`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                });

                // Tenta buscar a lista de downloads gerados
                const cfRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${photo.video_uid}/downloads`, {
                    headers: {
                        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (cfRes.ok) {
                    const cfData = await cfRes.json();
                    if (cfData.success && cfData.result && cfData.result.default && cfData.result.default.url) {
                        console.log(`[DownloadURL] Link de vídeo gerado pelo Cloudflare: user=${userId} photo=${photoId}`);
                        return res.status(200).json({ url: cfData.result.default.url });
                    } else {
                        // Tenta extrair subdomínio dinamicamente a partir dos detalhes do vídeo
                        const detailRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream/${photo.video_uid}`, {
                            headers: { 'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}` }
                        });
                        if (detailRes.ok) {
                            const detailData = await detailRes.json();
                            if (detailData.success && detailData.result && detailData.result.thumbnail) {
                                const match = detailData.result.thumbnail.match(/https:\/\/(customer-[a-z0-9]+)\.cloudflarestream\.com/);
                                if (match && match[1]) {
                                    const fallbackUrl = `https://${match[1]}.cloudflarestream.com/${photo.video_uid}/downloads/default.mp4`;
                                    console.log(`[DownloadURL] Link de vídeo fallback dinâmico gerado: user=${userId} photo=${photoId}`);
                                    return res.status(200).json({ url: fallbackUrl });
                                }
                            }
                        }
                    }
                }
            } catch (cfErr) {
                console.error('[DownloadURL] Erro na API do Cloudflare:', cfErr);
            }

            // Fallback final com o subdomínio padrão verificado
            const fallbackUrl = `https://customer-7t6jbx4ml8cvuouh.cloudflarestream.com/${photo.video_uid}/downloads/default.mp4`;
            console.log(`[DownloadURL] Link de vídeo fallback padrão gerado: user=${userId} photo=${photoId}`);
            return res.status(200).json({ url: fallbackUrl });
        }

        // 5. Se o arquivo estiver no Amazon S3 (pasta originals/ ou s3 Key)
        if (photo.file_url && (photo.file_url.startsWith('originals/') || photo.file_url.includes('s3.amazonaws.com') || photo.file_url.startsWith('s3://'))) {
            try {
                const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
                const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
                const S3_BUCKET = process.env.AWS_S3_BUCKET || 'fotoclic-media-storage';
                const s3Client = new S3Client({
                    region: process.env.AWS_REGION || 'us-east-1',
                    credentials: {
                        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    },
                });

                let cleanKey = photo.file_url.replace(/^https?:\/\/[^\/]+\//, '').replace(/^s3:\/\/[^\/]+\//, '');
                const getCmd = new GetObjectCommand({
                    Bucket: S3_BUCKET,
                    Key: cleanKey,
                });
                const s3SignedUrl = await getSignedUrl(s3Client, getCmd, { expiresIn: 7200 });
                console.log(`[DownloadURL] Link AWS S3 gerado: user=${userId} photo=${photoId}`);
                return res.status(200).json({ url: s3SignedUrl });
            } catch (s3DownloadErr) {
                console.warn('[DownloadURL] Falha ao gerar link do S3, tentando Supabase fallback:', s3DownloadErr.message);
            }
        }

        // 6. Gerar signed URL do bucket privado do Supabase (para fotos do acervo legado)
        const { data: signedData, error: signedError } = await adminClient.storage
            .from('photos-original')
            .createSignedUrl(photo.file_url, 3600);

        if (signedError || !signedData?.signedUrl) {
            console.error('[DownloadURL] Erro ao gerar signed URL:', signedError?.message);
            return res.status(500).json({ error: 'Não foi possível gerar o link de download.' });
        }

        console.log(`[DownloadURL] Link Supabase gerado: user=${userId} photo=${photoId}`);
        return res.status(200).json({ url: signedData.signedUrl });

    } catch (error) {
        console.error('[DownloadURL] Erro interno:', error);
        return res.status(500).json({ error: 'Erro interno ao processar a solicitação.' });
    }
}

async function handleSyncPurchases(req, res, userJwt, supabaseUrl, serviceKey) {
    try {
        const supabase = createClient(supabaseUrl, serviceKey);
        const { data: { user }, error: authError } = await supabase.auth.getUser(userJwt);
        if (authError || !user) return res.status(401).json({ error: 'Sessão inválida.' });

        // Identificar se o solicitante é administrador e se há targetUserId (Modo Vistoria)
        const { data: userProfile } = await supabase
            .from('users')
            .select('role, email')
            .eq('id', user.id)
            .maybeSingle();

        const isAdmin = userProfile?.role === 'admin' || user.email === 'svalmauricio@gmail.com';
        const { targetUserId } = req.body || {};
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        let effectiveUserId = user.id;
        let effectiveUserEmail = user.email;

        if (isAdmin && targetUserId && uuidRegex.test(targetUserId)) {
            effectiveUserId = targetUserId;
            const { data: targetProfile } = await supabase
                .from('users')
                .select('email')
                .eq('id', targetUserId)
                .maybeSingle();
            if (targetProfile?.email) {
                effectiveUserEmail = targetProfile.email;
            }
        }

        const { data: pendingBillings } = await supabase
            .from('abacate_pay_billings')
            .select('*')
            .eq('status', 'PENDING')
            .or(`metadata->>userId.eq.${effectiveUserId},customer_email.eq.${effectiveUserEmail}`);

        if (pendingBillings && pendingBillings.length > 0) {
            try {
                const token = await appmax.getAccessToken().catch(() => null);
                const baseUrl = appmax.getBaseUrl ? appmax.getBaseUrl() : 'https://api.appmax.com.br/v1';

                for (const pending of pendingBillings) {
                    if (token && pending.billing_id) {
                        try {
                            const resOrder = await fetch(`${baseUrl}/orders/${pending.billing_id}`, {
                                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
                            });
                            const orderJson = await resOrder.json().catch(() => ({}));
                            const order = orderJson?.data?.order;
                            const statusStr = String(order?.status || '').toLowerCase();

                            if (statusStr === 'aprovado' || statusStr === 'paid' || statusStr === 'pago' || statusStr === 'approved') {
                                await supabase
                                    .from('abacate_pay_billings')
                                    .update({
                                        status: 'PAID',
                                        payment_method: orderJson?.data?.payment?.method || 'PIX',
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('billing_id', pending.billing_id);
                            }
                        } catch (errOne) {
                            console.warn(`[Sync] Falha ao checar pedido Appmax ${pending.billing_id}:`, errOne.message);
                        }
                    }
                }
            } catch (apiErr) {
                console.error('[Sync] Erro na consulta Appmax:', apiErr);
            }
        }

        const { data: billings } = await supabase
            .from('abacate_pay_billings')
            .select('*')
            .eq('status', 'PAID')
            .or(`metadata->>userId.eq.${effectiveUserId},customer_email.eq.${effectiveUserEmail}`);

        if (!billings || billings.length === 0) {
            return res.status(200).json({ message: 'Tudo sincronizado.', count: 0 });
        }

        const { data: existingSales } = await supabase
            .from('sales')
            .select('billing_id')
            .eq('buyer_id', effectiveUserId);

        const saleBillingIds = new Set((existingSales || []).map(s => s.billing_id));
        const orphans = billings.filter(b => !saleBillingIds.has(b.billing_id));

        // Buscar taxas de comissão
        const { data: settingsRow } = await supabase
            .from('system_settings')
            .select('*')
            .eq('id', 1)
            .maybeSingle();

        const defaultRate = settingsRow?.commission_default_rate || 0.06;
        const customRates = settingsRow?.commission_custom_rates || {};

        for (const billing of orphans) {
            const metadata = billing.metadata || {};
            const cartIds = metadata.cartIds || metadata.photoIds || billing.items || [];
            if (cartIds.length > 0) {
                const { data: photos } = await supabase.from('photos').select('*').in('id', cartIds);
                if (photos && photos.length > 0) {
                    for (const photo of photos) {
                        const commRate = customRates[photo.photographer_id] !== undefined ? customRates[photo.photographer_id] : defaultRate;
                        const commVal = Number((photo.price * commRate).toFixed(2));

                        await supabase.from('sales').insert({
                            photo_id: photo.id,
                            buyer_id: effectiveUserId,
                            buyer_name: billing.customer_name || user.user_metadata?.name || 'Cliente',
                            price: photo.price,
                            commission: commVal,
                            commission_rate: commRate,
                            photographer_id: photo.photographer_id,
                            billing_id: billing.billing_id,
                            status: 'completed',
                            sale_date: billing.updated_at || new Date().toISOString()
                        });
                    }
                }
            }
        }

        return res.status(200).json({ message: 'Sincronização concluída.', count: orphans.length });
    } catch (err) {
        console.error('[SyncPurchases Error]:', err);
        return res.status(500).json({ error: err.message });
    }
}

async function handleGetPurchases(req, res, userJwt, supabaseUrl, serviceKey) {
    try {
        const supabase = createClient(supabaseUrl, serviceKey);
        const { data: { user }, error: authError } = await supabase.auth.getUser(userJwt);
        if (authError || !user) return res.status(401).json({ error: 'Sessão inválida.' });

        // Identificar se o solicitante é administrador e se há targetUserId (Modo Vistoria)
        const { data: userProfile } = await supabase
            .from('users')
            .select('role, email')
            .eq('id', user.id)
            .maybeSingle();

        const isAdmin = userProfile?.role === 'admin' || user.email === 'svalmauricio@gmail.com';
        const { targetUserId } = req.body || {};
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        let effectiveUserId = user.id;
        let effectiveUserEmail = user.email;

        if (isAdmin && targetUserId && uuidRegex.test(targetUserId)) {
            effectiveUserId = targetUserId;
            const { data: targetProfile } = await supabase
                .from('users')
                .select('email')
                .eq('id', targetUserId)
                .maybeSingle();
            if (targetProfile?.email) {
                effectiveUserEmail = targetProfile.email;
            }
        }

        // 1. Tentar sincronizar pedidos pendentes em tempo real
        try {
            const { data: pendingBillings } = await supabase
                .from('abacate_pay_billings')
                .select('*')
                .eq('status', 'PENDING')
                .or(`metadata->>userId.eq.${effectiveUserId},customer_email.eq.${effectiveUserEmail}`);

            if (pendingBillings && pendingBillings.length > 0) {
                const token = await appmax.getAccessToken().catch(() => null);
                const baseUrl = appmax.getBaseUrl ? appmax.getBaseUrl() : 'https://api.appmax.com.br/v1';

                for (const pending of pendingBillings) {
                    if (token && pending.billing_id) {
                        try {
                            const resOrder = await fetch(`${baseUrl}/orders/${pending.billing_id}`, {
                                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
                            });
                            const orderJson = await resOrder.json().catch(() => ({}));
                            const order = orderJson?.data?.order;
                            const statusStr = String(order?.status || '').toLowerCase();

                            if (statusStr === 'aprovado' || statusStr === 'paid' || statusStr === 'pago' || statusStr === 'approved') {
                                await supabase
                                    .from('abacate_pay_billings')
                                    .update({
                                        status: 'PAID',
                                        payment_method: orderJson?.data?.payment?.method || 'PIX',
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('billing_id', pending.billing_id);

                                const cartIds = pending.items || pending.metadata?.photoIds || [];
                                const { data: photos } = await supabase.from('photos').select('*').in('id', cartIds);
                                if (photos && photos.length > 0) {
                                    for (const photo of photos) {
                                        await supabase.from('sales').insert({
                                            photo_id: photo.id,
                                            buyer_id: effectiveUserId,
                                            buyer_name: pending.customer_name || user.user_metadata?.name || 'Cliente',
                                            price: photo.price,
                                            commission: Number((photo.price * 0.06).toFixed(2)),
                                            commission_rate: 0.06,
                                            photographer_id: photo.photographer_id,
                                            billing_id: pending.billing_id,
                                            status: 'completed',
                                            sale_date: new Date().toISOString()
                                        });
                                    }

                                    // Disparar notificações de e-mail para comprador, admin (svalmauricio@gmail.com) e fotógrafo
                                    await sendSaleNotifications({
                                        orderId: pending.billing_id,
                                        buyerName: pending.customer_name || user.user_metadata?.name || 'Cliente',
                                        customerEmail: pending.customer_email || effectiveUserEmail,
                                        totalAmount: Number(pending.amount) / 100 || photos.reduce((acc, p) => acc + (Number(p.price) || 0), 0),
                                        photos: photos,
                                        supabase: supabase
                                    }).catch(e => console.warn('[GetPurchases Email Error]:', e.message));
                                }
                            }
                        } catch (errOne) {
                            console.warn(`[GetPurchases Sync] Falha ao checar pedido Appmax ${pending.billing_id}:`, errOne.message);
                        }
                    }
                }
            }
        } catch (syncErr) {
            console.warn('[GetPurchases Sync] Erro não bloqueante ao sincronizar:', syncErr);
        }

        // 2. Buscar vendas associadas a este comprador
        const { data: sales, error: sErr } = await supabase
            .from('sales')
            .select('*, photo:photos(*, photographer:users!photos_photographer_id_fkey(name))')
            .eq('buyer_id', effectiveUserId)
            .neq('status', 'refunded')
            .order('sale_date', { ascending: false });

        if (sErr) {
            console.error('[GetPurchases Error]:', sErr);
            return res.status(500).json({ error: sErr.message });
        }

        const purchases = (sales || [])
            .map(sale => {
                if (!sale.photo) return null;
                return {
                    ...sale.photo,
                    purchase_date: sale.sale_date,
                    sale_id: sale.id,
                    paid_price: Number(sale.price),
                    photographer_name: sale.photo.photographer?.name || 'Fotógrafo',
                };
            })
            .filter(Boolean);

        return res.status(200).json({ purchases });
    } catch (err) {
        console.error('[GetPurchases Exception]:', err);
        return res.status(500).json({ error: err.message });
    }
}
