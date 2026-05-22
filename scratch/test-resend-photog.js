import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function check() {
    const saleData = {
        photographer: { name: 'Moraes.click', email: 'amdass@gmail.com' },
        totalCommission: 15.5,
        photos: [
            {
                title: 'Foto 1',
                price: 25.0,
                commission: 15.5,
                preview_url: 'https://example.com/img.jpg'
            }
        ]
    };

    const photoListHtmlPhotog = saleData.photos.map(p => `
        <div style="display: flex; align-items: center; margin-bottom: 12px; padding: 10px; background: #f9fafb; border-radius: 8px; border: 1px solid #edf2f7;">
            <img src="${p.preview_url}" width="60" height="60" style="object-fit: cover; border-radius: 4px; margin-right: 12px; border: 1px solid #e2e8f0;" />
            <div>
                <div style="font-weight: bold; color: #2d3748; font-size: 14px;">${p.title || 'Foto'}</div>
                <div style="color: #718096; font-size: 12px;">Venda: R$ ${p.price.toFixed(2).replace('.', ',')} | Comissão: <strong style="color: #059669;">R$ ${p.commission.toFixed(2).replace('.', ',')}</strong></div>
            </div>
        </div>
    `).join('');
    
    const siteUrl = process.env.VITE_SITE_URL || 'https://fotoclic.com.br';
    const finalHtmlPhotog = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #059669; padding: 32px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Nova Venda Realizada!</h1>
            </div>
            <div style="padding: 32px 24px;">
                <p style="font-size: 16px;">Olá, <strong>${saleData.photographer.name || 'Fotógrafo'}</strong>!</p>
                <p style="font-size: 16px; color: #475569;">Excelentes notícias! Você acabou de realizar <strong>${saleData.photos.length} venda(s)</strong> no FotoClic.</p>
                
                <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: center;">
                    <p style="margin: 0; color: #065f46; font-size: 14px;">Comissão Recebida</p>
                    <p style="margin: 4px 0 0 0; color: #047857; font-size: 28px; font-weight: bold;">R$ ${saleData.totalCommission.toFixed(2).replace('.', ',')}</p>
                </div>

                <h3 style="color: #1e293b; margin-top: 24px;">Fotos Vendidas:</h3>
                ${photoListHtmlPhotog}

                <div style="text-align: center; margin: 40px 0;">
                    <a href="${siteUrl}/photographer-dashboard" style="background-color: #059669; color: white; padding: 14px 32px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">
                        Ver Central Financeira
                    </a>
                </div>
            </div>
            <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} FotoClic Marketplace. Todos os direitos reservados.
            </div>
        </div>`;

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'FotoClic <nao-responda@fotoclic.com.br>',
            to: 'meta@teste.com', 
            subject: '🎉 Você realizou uma nova venda no FotoClic!',
            html: finalHtmlPhotog
        }),
    });
    console.log(res.status, await res.text());
}

check();
