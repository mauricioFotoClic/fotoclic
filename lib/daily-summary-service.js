import { createClient } from '@supabase/supabase-js';
import { sendTelegramMessage } from './telegram-ai-service.js';

const TELEGRAM_GROUP_ID = process.env.TELEGRAM_GROUP_ID || '-5372484924';

/**
 * Gera e envia o resumo diário consolidado para o grupo do Telegram
 */
export async function generateAndSendDailySummary() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('[Daily Summary] Supabase credentials not found.');
    return { success: false, error: 'Credenciais do Supabase ausentes' };
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Definir início e fim do dia de hoje no fuso horário de Brasília (UTC-3)
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  
  // Pegar início de hoje em ISO
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startIso = startOfDay.toISOString();

  try {
    // 1. Consultar Vendas do dia
    const { data: sales, error: salesErr } = await supabase
      .from('sales')
      .select('*, photo:photo_id(price, title, photographer_id)')
      .gte('created_at', startIso);

    let totalRevenue = 0;
    let totalPhotosSold = 0;
    let platformFee = 0;
    const photographerSalesMap = {};

    if (sales && sales.length > 0) {
      sales.forEach(s => {
        const price = Number(s.price || s.photo?.price || 0);
        totalRevenue += price;
        totalPhotosSold += 1;
        
        // Comissão oficial do FotoClic: 6%
        platformFee += price * 0.06;

        const photogId = s.photographer_id || s.photo?.photographer_id;
        if (photogId) {
          photographerSalesMap[photogId] = (photographerSalesMap[photogId] || 0) + price;
        }
      });
    }

    // Identificar Top Fotógrafo
    let topPhotographerName = 'Nenhum hoje';
    let topPhotographerTotal = 0;

    const topPhotogId = Object.keys(photographerSalesMap).sort((a, b) => photographerSalesMap[b] - photographerSalesMap[a])[0];
    if (topPhotogId) {
      const { data: topUser } = await supabase.from('users').select('name').eq('id', topPhotogId).maybeSingle();
      if (topUser) {
        topPhotographerName = topUser.name;
        topPhotographerTotal = photographerSalesMap[topPhotogId];
      }
    }

    // 2. Consultar Fotos publicadas hoje
    const { count: photosUploadedToday } = await supabase
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startIso);

    // 3. Consultar Novos Usuários do dia
    const { data: newUsers } = await supabase
      .from('users')
      .select('id, role, is_active')
      .gte('created_at', startIso);

    const newCustomersCount = (newUsers || []).filter(u => u.role !== 'photographer').length;
    const newPhotographersCount = (newUsers || []).filter(u => u.role === 'photographer').length;

    // 4. Consultar Fotógrafos aguardando moderação
    const { count: pendingPhotographersCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'photographer')
      .eq('is_active', false);

    // 5. Montar mensagem formatada
    const totalRevFormatted = totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const feeFormatted = platformFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const topValFormatted = topPhotographerTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const message = `📊 *Resumo Diário FotoClic • ${dateStr}*
⏰ *Horário:* 19:00 (Fechamento do Dia)

💰 *Faturamento & Vendas:*
• *Total Faturado:* *${totalRevFormatted}*
• *Comissão FotoClic (6%):* *${feeFormatted}*
• *Fotos Vendidas:* ${totalPhotosSold} ${totalPhotosSold === 1 ? 'foto' : 'fotos'}
• 🏆 *Destaque do Dia:* ${topPhotographerName} ${topPhotographerTotal > 0 ? `(${topValFormatted})` : ''}

📸 *Conteúdo & Plataforma:*
• *Novas Fotos Publicadas Hoje:* ${photosUploadedToday || 0} fotos

👥 *Comunidade & Cadastros:*
• *Novos Clientes:* +${newCustomersCount}
• *Novos Fotógrafos:* +${newPhotographersCount}
${pendingPhotographersCount > 0 ? `• ⚠️ *Aguardando Moderação:* ${pendingPhotographersCount} fotógrafo(s)\n` : ''}
⚡ *Status do Sistema:* 🟢 100% Operacional`;

    const buttons = [
      [
        { text: '📊 Ver Painel Administrativo', url: 'https://www.fotoclic.com.br/admin' },
        { text: '🌐 Abrir FotoClic', url: 'https://www.fotoclic.com.br' }
      ]
    ];

    const sent = await sendTelegramMessage({
      text: message,
      buttons,
      targetChatId: TELEGRAM_GROUP_ID
    });

    return {
      success: sent,
      date: dateStr,
      metrics: {
        totalRevenue,
        platformFee,
        totalPhotosSold,
        photosUploadedToday: photosUploadedToday || 0,
        newCustomersCount,
        newPhotographersCount,
        pendingPhotographersCount: pendingPhotographersCount || 0
      }
    };
  } catch (err) {
    console.error('[Daily Summary Error]:', err);
    return { success: false, error: err.message };
  }
}
