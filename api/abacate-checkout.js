import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
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
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    const apiKey = process.env.ABACATEPAY_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Configuração ausente: ABACATEPAY_API_KEY.' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(500).json({ error: 'Configuração ausente: credenciais do banco de dados.' });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { items, customer, metadata, couponCode } = req.body || {};

        if (!items || !Array.isArray(items) || items.length === 0 || !customer) {
            return res.status(400).json({ error: 'Dados do checkout (items/customer) são obrigatórios.' });
        }

        // --- 1. Autenticação e Identificação Segura do Usuário ---
        let authenticatedUserId = null;
        const authHeader = req.headers.authorization || '';
        const userJwt = authHeader.replace('Bearer ', '').trim();

        if (userJwt) {
            const { data: { user } } = await supabaseAdmin.auth.getUser(userJwt);
            if (user && user.id) {
                authenticatedUserId = user.id;
            }
        }

        const effectiveUserId = authenticatedUserId || metadata?.userId || customer.id || null;

        // Extrair IDs de fotos
        const photoIds = items.map(item => typeof item === 'string' ? item : (item.id || item.photoId)).filter(Boolean);
        if (photoIds.length === 0) {
            return res.status(400).json({ error: 'Nenhuma foto válida encontrada para o checkout.' });
        }

        // --- 2. Buscar Dados Reais das Fotos no Supabase (Prevenção de Adulteração de Preço) ---
        const { data: dbPhotos, error: photosError } = await supabaseAdmin
            .from('photos')
            .select('id, title, price, photographer_id, event_id, is_public, moderation_status')
            .in('id', photoIds);

        if (photosError || !dbPhotos || dbPhotos.length === 0) {
            return res.status(404).json({ error: 'Fotos não encontradas no sistema.' });
        }

        if (dbPhotos.length !== photoIds.length) {
            return res.status(400).json({ error: 'Algumas fotos selecionadas não estão mais disponíveis.' });
        }

        // Buscar informações de eventos (para verificar permissão de descontos allow_discounts)
        const eventIds = [...new Set(dbPhotos.map(p => p.event_id).filter(Boolean))];
        const eventMap = new Map();
        if (eventIds.length > 0) {
            const { data: events } = await supabaseAdmin
                .from('events')
                .select('id, allow_discounts')
                .in('id', eventIds);
            (events || []).forEach(e => eventMap.set(e.id, e.allow_discounts !== false));
        }

        // Buscar fotógrafos e regras de desconto progressivo
        const photographerIds = [...new Set(dbPhotos.map(p => p.photographer_id).filter(Boolean))];
        const photographerMap = new Map();
        if (photographerIds.length > 0) {
            const { data: photographers } = await supabaseAdmin
                .from('users')
                .select('id, bulk_discount_rules')
                .in('id', photographerIds);
            (photographers || []).forEach(p => photographerMap.set(p.id, p));
        }

        // Buscar e validar cupom de desconto (se fornecido)
        const targetCouponCode = (couponCode || metadata?.couponCode || '').toString().trim().toUpperCase();
        let validatedCoupon = null;

        if (targetCouponCode) {
            const { data: coupon, error: couponError } = await supabaseAdmin
                .from('coupons')
                .select('*')
                .eq('code', targetCouponCode)
                .maybeSingle();

            if (!couponError && coupon) {
                const now = new Date();
                const isNotExpired = !coupon.expiration_date || new Date(coupon.expiration_date) > now;
                const isActive = coupon.is_active !== false;

                if (isNotExpired && isActive) {
                    validatedCoupon = coupon;
                } else {
                    console.warn(`[Checkout] Cupom ${targetCouponCode} expirado ou inativo.`);
                }
            }
        }

        // --- 3. Calcular Preços e Descontos Exclusivamente no Servidor ---
        // Agrupar fotos por fotógrafo para cálculo de volume
        const photosByPhotographer = new Map();
        dbPhotos.forEach(p => {
            if (!photosByPhotographer.has(p.photographer_id)) {
                photosByPhotographer.set(p.photographer_id, []);
            }
            photosByPhotographer.get(p.photographer_id).push(p);
        });

        // Determinar percentual de desconto por volume para cada fotógrafo
        const bulkDiscountPercentByPhotographer = new Map();
        for (const [photographerId, photogPhotos] of photosByPhotographer.entries()) {
            const photogData = photographerMap.get(photographerId);
            const eligiblePhotos = photogPhotos.filter(p => {
                if (!p.event_id) return true;
                return eventMap.has(p.event_id) ? eventMap.get(p.event_id) : true;
            });

            const qty = eligiblePhotos.length;
            let discountPercent = 0;

            const rules = photogData?.bulk_discount_rules || [
                { minQuantity: 2, discountPercent: 5 },
                { minQuantity: 5, discountPercent: 10 },
                { minQuantity: 10, discountPercent: 20 },
            ];

            const sortedRules = [...rules].sort((a, b) => b.minQuantity - a.minQuantity);
            const matchedRule = sortedRules.find(r => qty >= r.minQuantity);
            if (matchedRule) {
                discountPercent = Math.min(100, Math.max(0, Number(matchedRule.discountPercent) || 0));
            }

            bulkDiscountPercentByPhotographer.set(photographerId, {
                discountPercent,
                eligiblePhotoIds: new Set(eligiblePhotos.map(p => p.id))
            });
        }

        // Calcular preço unitário final em centavos de cada foto
        const verifiedItems = dbPhotos.map(photo => {
            const basePrice = Number(photo.price) || 0;
            let finalPrice = basePrice;

            // 1. Desconto de cupom
            if (validatedCoupon && validatedCoupon.photographer_id === photo.photographer_id) {
                const couponPercent = Math.min(100, Math.max(0, Number(validatedCoupon.discount_percent) || 0));
                finalPrice -= basePrice * (couponPercent / 100);
            }

            // 2. Desconto por volume
            const bulkInfo = bulkDiscountPercentByPhotographer.get(photo.photographer_id);
            if (bulkInfo && bulkInfo.discountPercent > 0 && bulkInfo.eligiblePhotoIds.has(photo.id)) {
                finalPrice -= basePrice * (bulkInfo.discountPercent / 100);
            }

            // Garantir que o valor final seja no mínimo 0
            finalPrice = Math.max(0, finalPrice);
            // Converter para centavos com arredondamento seguro
            const priceCents = Math.max(1, Math.round(finalPrice * 100)); // Gateway requer no mínimo 1 centavo por item se for pago

            return {
                id: photo.id,
                title: String(photo.title || 'Foto Digital FotoClic').substring(0, 100),
                priceCents: priceCents,
                basePrice: basePrice,
                photographer_id: photo.photographer_id
            };
        });

        // --- 4. Registrar ou Buscar Produtos na API v2 do AbacatePay ---
        const itemsV2 = await Promise.all(verifiedItems.map(async (item) => {
            const externalId = `${item.id}_${item.priceCents}`;

            try {
                const prodRes = await fetch('https://api.abacatepay.com/v2/products/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        externalId: externalId,
                        name: item.title,
                        description: 'Foto digital em alta resolução',
                        price: item.priceCents,
                        currency: 'BRL'
                    })
                });

                const prodData = await prodRes.json();

                if (prodData.success && prodData.data?.id) {
                    return { id: prodData.data.id, quantity: 1 };
                }

                // Se já existir, buscar na lista
                const errorDetail = prodData.error || prodData.message || '';
                if (errorDetail.includes('already exists') || prodRes.status === 409 || prodRes.status === 400) {
                    const listRes = await fetch('https://api.abacatepay.com/v2/products/list', {
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${apiKey}` }
                    });
                    const listData = await listRes.json();
                    if (listData.success && Array.isArray(listData.data)) {
                        const existingProd = listData.data.find(p => p.externalId === externalId);
                        if (existingProd) {
                            return { id: existingProd.id, quantity: 1 };
                        }
                    }
                }

                console.error('[AbacatePay] Erro ao registrar produto:', prodData);
                throw new Error(`Falha ao registrar produto: ${errorDetail || JSON.stringify(prodData)}`);
            } catch (err) {
                console.error('[AbacatePay] Exceção ao criar produto:', err);
                throw err;
            }
        }));

        // --- 5. Criar / Buscar Cliente no AbacatePay ---
        let customerId = null;
        const customerPayload = {
            name: String(customer.name || 'Cliente FotoClic').substring(0, 100),
            email: String(customer.email || '').trim().toLowerCase(),
            taxId: String(customer.taxId || customer.cpf || '').replace(/\D/g, '').substring(0, 11),
            cellphone: String(customer.phone || '').replace(/\D/g, '').substring(0, 15),
        };

        try {
            const customerRes = await fetch('https://api.abacatepay.com/v2/customer/create', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(customerPayload),
            });
            const customerData = await customerRes.json();

            if (customerData.success && customerData.data?.id) {
                customerId = customerData.data.id;
            } else {
                const listRes = await fetch('https://api.abacatepay.com/v2/customer/list', {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                const listData = await listRes.json();
                if (listData.success && Array.isArray(listData.data)) {
                    const existing = listData.data.find(c =>
                        (customerPayload.email && c.email === customerPayload.email) ||
                        (customerPayload.taxId && c.taxId === customerPayload.taxId)
                    );
                    if (existing) {
                        customerId = existing.id;
                    }
                }
            }
        } catch (err) {
            console.warn('[AbacatePay] Falha ao sincronizar cliente:', err);
        }

        // --- 6. Criar Sessão de Checkout no AbacatePay ---
        const siteUrl = (process.env.VITE_SITE_URL || 'https://www.fotoclic.com.br').replace(/\/$/, '');

        const checkoutBody = {
            frequency: 'ONE_TIME',
            methods: ['PIX', 'CARD'],
            items: itemsV2,
            returnUrl: `${siteUrl}/carrinho`,
            completionUrl: `${siteUrl}/checkout-success`,
            metadata: {
                cartIds: photoIds,
                userId: effectiveUserId,
                customerName: customerPayload.name,
                customerEmail: customerPayload.email,
                couponCode: validatedCoupon?.code || null,
                termsAccepted: metadata?.termsAccepted || true
            }
        };

        if (customerId) {
            checkoutBody.customerId = customerId;
        } else {
            checkoutBody.customer = customerPayload;
        }

        const response = await fetch('https://api.abacatepay.com/v2/checkouts/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(checkoutBody)
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.data?.url) {
            console.error('[AbacatePay] Erro no checkout:', result);
            return res.status(response.status || 500).json({
                error: 'Erro ao gerar checkout com o provedor de pagamento.',
                details: result.error || result.message || result
            });
        }

        // --- 7. Salvar Cobrança Pendente no Banco ---
        const totalCents = verifiedItems.reduce((acc, item) => acc + item.priceCents, 0);

        await supabaseAdmin
            .from('abacate_pay_billings')
            .insert({
                billing_id: result.data.id,
                amount: totalCents,
                status: 'PENDING',
                checkout_url: result.data.url,
                customer_name: customerPayload.name,
                customer_email: customerPayload.email,
                customer_cpf: customerPayload.taxId || null,
                metadata: checkoutBody.metadata,
                terms_accepted: metadata?.termsAccepted || true
            });

        return res.status(200).json({
            url: result.data.url,
            id: result.data.id,
            verifiedTotalCents: totalCents
        });

    } catch (error) {
        console.error('[Checkout] Erro Crítico:', error);
        return res.status(500).json({
            error: 'Erro interno ao processar pagamento.',
            details: error.message
        });
    }
}
