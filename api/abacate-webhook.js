import crypto from 'crypto';
import { supabase } from '../services/supabaseClient'; // Usaremos o cliente direto no backend para bypassar RLS se necessário

// Helper para ler o body raw (necessário para verificação de assinatura)
export const config = {
    api: {
        bodyParser: false,
    },
};

async function getRawBody(readable) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    const signature = req.headers['x-webhook-signature'];
    const secret = process.env.ABACATEPAY_WEBHOOK_SECRET || process.env.ABACATEPAY_API_KEY;

    try {
        const rawBody = await getRawBody(req);
        const body = JSON.parse(rawBody.toString());

        // Verificação de Assinatura (Segurança)
        if (signature) {
            const hmac = crypto.createHmac('sha256', secret);
            const digest = hmac.update(rawBody).digest('hex');
            
            if (signature !== digest) {
                console.error('[AbacatePay Webhook] Assinatura Inválida!');
                return res.status(401).json({ error: 'Assinatura inválida.' });
            }
        }

        console.log('[AbacatePay Webhook] Evento recebido:', body.event, body.data?.id);

        // Processamos apenas quando a cobrança é paga
        if (body.event === 'billing.paid') {
            const billing = body.data;
            const metadata = billing.metadata || {};
            
            // Aqui você deve implementar a lógica de liberar as fotos no banco
            // Exemplo: registrar na tabela 'sales'
            
            /* 
            Lógica simplificada:
            1. Buscar os itens da cobrança
            2. Para cada item (foto), inserir na tabela 'sales'
            3. Enviar e-mail de confirmação
            */
            
            console.log('[AbacatePay Webhook] Pagamento Confirmado! ID:', billing.id);
            
            // TODO: Integrar com a sua lógica de api.purchasePhoto de forma massiva
        }

        return res.status(200).json({ received: true });

    } catch (error) {
        console.error('[AbacatePay Webhook] Erro:', error);
        return res.status(500).json({ error: 'Erro interno ao processar webhook.' });
    }
}
