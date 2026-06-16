const fs = require('fs');
const path = require('path');

// Ler o .env.local e jogar no process.env
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

const locawebToken = process.env.LOCAWEB_SMTP_TOKEN;

if (!locawebToken) {
    console.error('LOCAWEB_SMTP_TOKEN não configurada no .env.local');
    process.exit(1);
}

const method = 'PIX'; // Simulando pagamento por Pix

const saleData = {
    photographer: 'Paulo Daian',
    photos: [
        {
            title: 'Casamento Mariana & Roberto - 001',
            price: 15.00,
            rate: 0.06,
            commission: 15.00 * 0.06 + 0.25, // Simulando taxa de pix (0.50 total / 2) + plataforma
            gatewayFee: 0.25,
            preview_url: 'https://via.placeholder.com/60/059669/FFFFFF?text=Foto+1'
        },
        {
            title: 'Casamento Mariana & Roberto - 002',
            price: 15.00,
            rate: 0.06,
            commission: 15.00 * 0.06 + 0.25,
            gatewayFee: 0.25,
            preview_url: 'https://via.placeholder.com/60/ef4444/FFFFFF?text=Foto+2'
        }
    ]
};

const totalPhotogNet = saleData.photos.reduce((acc, p) => acc + (p.price - p.commission), 0);
const totalPhotosPrice = saleData.photos.reduce((acc, p) => acc + p.price, 0);
const totalPlatformFee = saleData.photos.reduce((acc, p) => acc + (p.price * p.rate), 0);
const totalGatewayFee = saleData.photos.reduce((acc, p) => acc + p.gatewayFee, 0);

const photoListHtmlPhotog = saleData.photos.map(p => {
    const platformFee = p.price * p.rate;
    return `
    <div style="display: flex; align-items: center; margin-bottom: 12px; padding: 10px; background: #f9fafb; border-radius: 8px; border: 1px solid #edf2f7;">
        <img src="${p.preview_url}" width="60" height="60" style="object-fit: cover; border-radius: 4px; margin-right: 12px; border: 1px solid #e2e8f0;" />
        <div style="width: 100%;">
            <div style="font-weight: bold; color: #2d3748; font-size: 14px; margin-bottom: 4px;">${p.title || 'Foto'}</div>
            <div style="color: #475569; font-size: 13px; line-height: 1.4;">
                Venda Realizada: <strong>R$ ${p.price.toFixed(2).replace('.', ',')}</strong><br/>
                Desconto Plataforma (${(p.rate * 100).toFixed(0)}%): <span style="color: #ef4444;">- R$ ${platformFee.toFixed(2).replace('.', ',')}</span>
            </div>
        </div>
    </div>
    `;
}).join('');

const siteUrl = 'https://fotoclic.com.br';

const emailHtmlPhotog = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; background-color: #f8fafc; padding: 20px;">
    <div style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        <div style="background-color: #059669; padding: 30px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Nova Venda Realizada!</h1>
        </div>
        
        <div style="padding: 30px;">
            <p style="font-size: 16px; color: #475569;">Olá <strong>${saleData.photographer}</strong>,</p>
            <p style="font-size: 16px; color: #475569;">Excelentes notícias! Você acabou de realizar <strong>${saleData.photos.length} venda(s)</strong> no FotoClic.</p>
            
            <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <div style="text-align: center; border-bottom: 1px solid #a7f3d0; padding-bottom: 12px; margin-bottom: 12px;">
                    <p style="margin: 0; color: #065f46; font-size: 14px;">Total Líquido a Receber</p>
                    <p style="margin: 4px 0 0 0; color: #047857; font-size: 28px; font-weight: bold;">R$ ${totalPhotogNet.toFixed(2).replace('.', ',')}</p>
                </div>
                <table style="width: 100%; font-size: 13px; color: #374151; border-collapse: collapse;">
                    <tr style="height: 22px;">
                        <td style="text-align: left; color: #065f46;">Total das Fotos:</td>
                        <td style="text-align: right; font-weight: bold; color: #065f46;">R$ ${totalPhotosPrice.toFixed(2).replace('.', ',')}</td>
                    </tr>
                    <tr style="height: 22px;">
                        <td style="text-align: left; color: #065f46;">Desconto Plataforma:</td>
                        <td style="text-align: right; color: #ef4444;">- R$ ${totalPlatformFee.toFixed(2).replace('.', ',')}</td>
                    </tr>
                    <tr style="height: 22px;">
                        <td style="text-align: left; color: #065f46;">Desconto Op. Pagamento (${method === 'CARD' ? 'Cartão' : 'Pix'}):</td>
                        <td style="text-align: right; color: #ef4444;">- R$ ${totalGatewayFee.toFixed(2).replace('.', ',')}</td>
                    </tr>
                </table>
            </div>

            <h3 style="color: #1e293b; margin-top: 24px;">Fotos Vendidas:</h3>
            ${photoListHtmlPhotog}

            <div style="text-align: center; margin: 40px 0;">
                <a href="${siteUrl}/photographer-dashboard" style="background-color: #059669; color: white; padding: 14px 32px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">
                    Ver Central Financeira
                </a>
            </div>
            
            <p style="font-size: 14px; color: #64748b; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                Continue com o ótimo trabalho!<br>
                <strong>Equipe FotoClic</strong>
            </p>
        </div>
    </div>
</div>
`;

async function test() {
    console.log('Enviando e-mail de teste de layout de nova venda...');
    try {
        const res = await fetch('https://api.smtplw.com.br/v1/messages', {
            method: 'POST',
            headers: {
                'x-auth-token': locawebToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'nao-responda@email.fotoclic.com.br',
                to: ['paulodaian@gmail.com'],
                subject: '✨ FOTOCLIC TESTE: Novo Layout Agrupado (Taxas no Total) - ' + Date.now(),
                body: emailHtmlPhotog,
            }),
        });

        const textResponse = await res.text();
        console.log('Status HTTP:', res.status);
        console.log('Resposta da API:', textResponse);
    } catch (err) {
        console.error('Erro na requisição:', err);
    }
}

test();
