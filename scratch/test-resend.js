import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function check() {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'FotoClic <nao-responda@fotoclic.com.br>',
            to: 'meta@teste.com', // fake email to see what resend returns
            subject: '🎉 Você realizou uma nova venda no FotoClic!',
            html: "<b>Test</b>"
        }),
    });
    console.log(res.status, await res.text());
}

check();
