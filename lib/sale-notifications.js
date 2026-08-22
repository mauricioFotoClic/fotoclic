import { createClient } from '@supabase/supabase-js';
import { notifyNewSaleToTelegram } from './telegram-ai-service.js';

export async function sendLocawebEmail({ to, subject, html }) {
  const token = process.env.LOCAWEB_SMTP_TOKEN;
  if (!token) {
    console.warn('[Locaweb SMTP] LOCAWEB_SMTP_TOKEN não configurado.');
    return false;
  }

  try {
    const res = await fetch('https://api.smtplw.com.br/v1/messages', {
      method: 'POST',
      headers: {
        'x-auth-token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'nao-responda@email.fotoclic.com.br',
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        body: html
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[Locaweb SMTP] Falha no envio para ${to}: Status ${res.status} - ${errText}`);
      return false;
    }

    console.log(`[Locaweb SMTP] E-mail enviado com sucesso para ${to}`);
    return true;
  } catch (err) {
    console.error(`[Locaweb SMTP] Erro ao enviar e-mail para ${to}:`, err.message);
    return false;
  }
}

/**
 * Envia todo o pacote de notificações de uma venda confirmada
 */
export async function sendSaleNotifications({
  orderId,
  buyerName,
  customerEmail,
  totalAmount,
  photos = [],
  supabase
}) {
  try {
    const siteUrl = process.env.VITE_SITE_URL || 'https://www.fotoclic.com.br';
    const totalAmountFormatted = Number(totalAmount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // 1. E-mail de Confirmação para o Comprador
    if (customerEmail) {
      const photoItemsHtml = photos.map(p => `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; align-items: center;">
          ${p.thumb_url || p.preview_url ? `<img src="${p.thumb_url || p.preview_url}" alt="${p.title || 'Foto'}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 6px; margin-right: 15px;" />` : ''}
          <div>
            <p style="margin: 0 0 4px 0; font-weight: bold; color: #1e293b; font-size: 14px;">${p.title || 'Foto Digital em Alta Resolução'}</p>
            <p style="margin: 0; color: #64748b; font-size: 12px;">R$ ${(Number(p.price) || 0).toFixed(2).replace('.', ',')}</p>
          </div>
        </div>
      `).join('');

      const buyerHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="background: #0f172a; padding: 24px; text-align: center;">
              <h1 style="color: #FF6B00; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">FotoClic</h1>
              <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Seus melhores momentos em alta resolução</p>
            </div>
            
            <div style="padding: 30px 24px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="background: #dcfce7; color: #15803d; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase;">Pagamento Aprovado</span>
                <h2 style="color: #0f172a; margin: 12px 0 6px 0; font-size: 20px;">Obrigado pela sua compra!</h2>
                <p style="color: #64748b; margin: 0; font-size: 14px;">Olá, <strong>${buyerName || 'Cliente'}</strong>! Suas fotos já estão prontas para download.</p>
              </div>

              <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #475569;"><strong>Pedido:</strong> #${orderId}</p>
                <p style="margin: 0; font-size: 13px; color: #475569;"><strong>Valor Total:</strong> ${totalAmountFormatted}</p>
              </div>

              <p style="font-weight: 600; color: #334155; font-size: 14px; margin-bottom: 12px;">Fotos Adquiridas:</p>
              ${photoItemsHtml}

              <div style="text-align: center; margin: 30px 0 20px 0;">
                <a href="${siteUrl}/minhas-compras" style="background: #FF6B00; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(255, 107, 0, 0.2);">
                  Acessar Minhas Fotos
                </a>
              </div>
            </div>

            <div style="background: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0 0 6px 0;">FotoClic &bull; Conectando momentos inesquecíveis e fotógrafos</p>
              <p style="margin: 0;"><a href="${siteUrl}" style="color: #FF6B00; text-decoration: none;">www.fotoclic.com.br</a></p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendLocawebEmail({
        to: customerEmail,
        subject: `✅ Pagamento confirmado - Suas fotos estão prontas! (Pedido #${orderId})`,
        html: buyerHtml
      });
    }

    // 2. E-mail de Notificação para o Administrador (svalmauricio@gmail.com)
    const adminPhotosList = photos.map(p => `<li><strong>${p.title || 'Foto'}</strong> - R$ ${(Number(p.price) || 0).toFixed(2).replace('.', ',')} (ID Fotógrafo: ${p.photographer_id})</li>`).join('');
    const adminHtml = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; padding: 20px;">
        <h2 style="color: #FF6B00; margin-top: 0;">🎉 Nova Venda Confirmada no FotoClic!</h2>
        <p><strong>Pedido ID:</strong> #${orderId}</p>
        <p><strong>Comprador:</strong> ${buyerName || 'Cliente'} (${customerEmail || 'Sem e-mail'})</p>
        <p><strong>Valor Total:</strong> ${totalAmountFormatted}</p>
        <p><strong>Fotos Vendidas (${photos.length}):</strong></p>
        <ul>${adminPhotosList}</ul>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Notificação Automática FotoClic &bull; Gateway Appmax</p>
      </div>`;

    await sendLocawebEmail({
      to: 'svalmauricio@gmail.com',
      subject: `💰 Nova Venda FotoClic - ${buyerName || 'Cliente'} - ${totalAmountFormatted}`,
      html: adminHtml
    });

    // 3. E-mail de Notificação para o(s) Fotógrafo(s)
    if (supabase) {
      const photographerSalesMap = {};
      photos.forEach(p => {
        if (p.photographer_id) {
          if (!photographerSalesMap[p.photographer_id]) {
            photographerSalesMap[p.photographer_id] = { count: 0, total: 0 };
          }
          photographerSalesMap[p.photographer_id].count += 1;
          photographerSalesMap[p.photographer_id].total += Number(p.price) || 0;
        }
      });

      for (const photogId of Object.keys(photographerSalesMap)) {
        try {
          const { data: photogData } = await supabase.from('users').select('name, email').eq('id', photogId).maybeSingle();
          if (photogData?.email) {
            const info = photographerSalesMap[photogId];
            const photogHtml = `
              <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; padding: 20px;">
                <h2 style="color: #FF6B00; margin-top: 0;">📸 Você fez uma nova venda no FotoClic!</h2>
                <p>Olá, <strong>${photogData.name || 'Fotógrafo'}</strong>!</p>
                <p>Sua foto (${info.count} item) acaba de ser comprada por <strong>${buyerName || 'um cliente'}</strong>.</p>
                <p><strong>Valor Total da Venda:</strong> R$ ${info.total.toFixed(2).replace('.', ',')}</p>
                <p>Acesse seu painel do fotógrafo para acompanhar seu saldo e extrato.</p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${siteUrl}/fotografo" style="background-color: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 20px; font-weight: bold; display: inline-block;">
                    Acessar Painel
                  </a>
                </div>
              </div>`;

            await sendLocawebEmail({
              to: photogData.email,
              subject: `🎉 Nova Foto Vendida no FotoClic! (Pedido #${orderId})`,
              html: photogHtml
            });
          }
        } catch (errPhotog) {
          console.warn(`[Locaweb SMTP] Falha ao notificar fotógrafo ${photogId}:`, errPhotog.message);
        }
      }
    }

    // 4. Disparar notificação de venda em tempo real para o Telegram
    try {
      await notifyNewSaleToTelegram({
        orderId,
        buyerName,
        customerEmail,
        totalAmount,
        photos,
        paymentMethod: 'Appmax'
      });
    } catch (tgErr) {
      console.warn('[Sale Telegram Notification Error]:', tgErr.message);
    }
  } catch (err) {
    console.error('[sendSaleNotifications Error]:', err);
  }
}
