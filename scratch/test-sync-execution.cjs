const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                process.env[key] = value;
            }
        });
    }
} catch (e) {
    console.error('Erro ao ler .env.local', e);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Erro: Credenciais do Supabase ausentes no .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('=== Simulando Sincronização Local para o Cliente daiancash@gmail.com ===');
    
    const user = {
        id: '353f7b67-98a1-429e-98f1-7908ea06d85a',
        email: 'daiancash@gmail.com'
    };

    // 1. Limpar venda de teste anterior se existir
    const billingId = 'bill_xarNnNx6aHpLdTnPKTFfS5ba';
    await supabase.from('sales').delete().eq('billing_id', billingId);
    
    // Resetar metadado da cobrança removendo email_logs para ver se ela gera de novo
    const { data: bData } = await supabase.from('abacate_pay_billings').select('metadata').eq('billing_id', billingId).single();
    if (bData && bData.metadata) {
        const newMetadata = { ...bData.metadata };
        delete newMetadata.email_logs;
        await supabase.from('abacate_pay_billings').update({ metadata: newMetadata }).eq('billing_id', billingId);
    }

    // 2. Executar a lógica exata de sincronização
    try {
        const apiKey = process.env.ABACATEPAY_API_KEY;

        // Buscar todas as cobranças PAGAS deste usuário
        const { data: billings, error: bError } = await supabase
            .from('abacate_pay_billings')
            .select('*')
            .eq('status', 'PAID')
            .or(`metadata->>userId.eq.${user.id},customer_email.eq.${user.email}`);

        if (bError) throw bError;

        console.log(`Cobranças pagas encontradas para o usuário: ${billings.length}`);

        const { data: existingSales, error: sError } = await supabase
            .from('sales')
            .select('billing_id')
            .eq('buyer_id', user.id);

        if (sError) throw sError;

        const saleBillingIds = new Set(existingSales.map(s => s.billing_id));
        const orphans = billings.filter(b => !saleBillingIds.has(b.billing_id));

        console.log(`Cobranças órfãs (sem vendas correspondentes): ${orphans.length}`);

        if (orphans.length === 0) {
            console.log('Tudo sincronizado. Saindo.');
            return;
        }

        // Processar órfãos (como em api/sync-purchases.js)
        let createdCount = 0;
        const { data: settingsRow } = await supabase.from('system_settings').select('*').eq('id', 1).single();
        const defaultRate = settingsRow?.commission_default_rate || 0.06;
        const customRates = settingsRow?.commission_custom_rates || {};
        const defaultVideoRate = settingsRow?.commission_video_default_rate !== undefined && settingsRow?.commission_video_default_rate !== null ? settingsRow.commission_video_default_rate : 0.10;

        for (const billing of orphans) {
            const metadata = billing.metadata || {};
            const cartIds = metadata.cartIds || [];

            console.log(`Processando cobrança ${billing.billing_id} com fotos:`, cartIds);

            if (cartIds.length > 0) {
                const { data: photos } = await supabase.from('photos').select('*').in('id', cartIds);
                
                if (photos && photos.length > 0) {
                    const flatFeePerPhoto = 0.50 / photos.length;
                    for (const photo of photos) {
                        const isVideo = photo.media_type === 'video';
                        let rate;
                        if (isVideo) {
                            rate = defaultVideoRate;
                        } else {
                            rate = customRates[photo.photographer_id] !== undefined ? customRates[photo.photographer_id] : defaultRate;
                        }

                        const { error: saleError } = await supabase.from('sales').upsert({
                            photo_id: photo.id,
                            buyer_id: user.id,
                            price: photo.price,
                            commission: Math.min(photo.price, (photo.price * rate) + flatFeePerPhoto),
                            commission_rate: rate,
                            photographer_id: photo.photographer_id,
                            billing_id: billing.billing_id,
                            status: 'completed',
                            is_available: true,
                            available_at: new Date().toISOString(),
                            sale_date: billing.updated_at || new Date().toISOString()
                        }, { onConflict: 'photo_id, buyer_id', ignoreDuplicates: true });

                        if (!saleError) {
                            createdCount++;
                            console.log(`Venda criada com sucesso para a foto ${photo.id}`);
                        } else {
                            console.error(`Erro ao criar venda para a foto ${photo.id}:`, saleError.message);
                        }
                    }

                    // Obter dados dos fotógrafos
                    const photographerIds = [...new Set(photos.map(p => p.photographer_id))];
                    const { data: photographersData } = await supabase
                        .from('users')
                        .select('id, name, email')
                        .in('id', photographerIds);
                    
                    const photographerMap = (photographersData || []).reduce((acc, p) => {
                        acc[p.id] = p;
                        return acc;
                    }, {});

                    // Enviar e-mails
                    const photographerSalesMap = {};
                    for (const photo of photos) {
                        if (!photographerSalesMap[photo.photographer_id]) {
                            photographerSalesMap[photo.photographer_id] = {
                                photographer: photographerMap[photo.photographer_id],
                                totalCommission: 0,
                                photos: []
                            };
                        }
                        const isVideo = photo.media_type === 'video';
                        let rate;
                        if (isVideo) {
                            rate = defaultVideoRate;
                        } else {
                            rate = customRates[photo.photographer_id] !== undefined ? customRates[photo.photographer_id] : defaultRate;
                        }
                        const commissionValue = photo.price * rate;

                        photographerSalesMap[photo.photographer_id].totalCommission += commissionValue;
                        photographerSalesMap[photo.photographer_id].photos.push({
                            title: photo.title,
                            price: photo.price,
                            commission: commissionValue,
                            preview_url: photo.preview_url
                        });
                    }

                    let buyerEmailLog = null;
                    const photographerEmailsLog = [];

                    // Simular envio de e-mail ao comprador
                    console.log('Disparando e-mail de teste para o comprador:', user.email);
                    const resendRes = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            from: 'FotoClic <nao-responda@fotoclic.com.br>',
                            to: user.email,
                            subject: 'Teste Sincronização FotoClic',
                            html: '<p>Este é um teste de e-mail enviado pelo script de sincronização.</p>'
                        }),
                    });

                    const resendData = await resendRes.json();
                    if (resendRes.ok) {
                        console.log('E-mail enviado com sucesso ao comprador:', resendData.id);
                        buyerEmailLog = { success: true, id: resendData.id, to: user.email };
                    } else {
                        console.error('Erro na API do Resend (Comprador):', resendData);
                        buyerEmailLog = { success: false, error: resendData, to: user.email };
                    }

                    // Gravar logs de email no Supabase
                    const emailLogs = {
                        email_dispatched_at: new Date().toISOString(),
                        buyer_email_log: buyerEmailLog,
                        photographer_emails_log: photographerEmailsLog
                    };
                    
                    await supabase
                        .from('abacate_pay_billings')
                        .update({
                            metadata: {
                                ...(metadata || {}),
                                email_logs: emailLogs
                            }
                        })
                        .eq('billing_id', billing.billing_id);
                    console.log('Logs de email gravados no Supabase.');
                }
            }
        }
    } catch (err) {
        console.error('Erro na execução:', err);
    }
}

run();
