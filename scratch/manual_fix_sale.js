import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function manualFix() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userId = '353f7b67-98a1-429e-98f1-7908ea06d85a'; // Daian Cliente
    const photoId = '1760594b-1c53-4778-9a0c-2b383e745ba7'; // 02-Surfe
    const photographerId = '394d208c-07b3-49aa-a04b-63630cb85bb7'; // Paulo

    console.log(`Tentando registrar venda manual: Foto ${photoId} para Usuário ${userId}`);

    const { data: photo } = await supabase.from('photos').select('price').eq('id', photoId).single();
    const price = photo?.price || 20;
    const rate = 0.15; // Taxa padrão
    const commission = price * rate;

    const { data, error } = await supabase.from('sales').insert({
        photo_id: photoId,
        buyer_id: userId,
        price: price,
        commission: commission,
        photographer_id: photographerId,
        commission_rate: rate,
        sale_date: new Date().toISOString()
    }).select();

    if (error) {
        console.error('Erro na correção manual:', error);
    } else {
        console.log('✅ Venda registrada com sucesso!', data);
    }
}

manualFix();
