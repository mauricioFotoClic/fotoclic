import handler from '../api/abacate-stats.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    const req = {
        method: 'GET'
    };
    const res = {
        headers: {},
        setHeader(name, val) {
            this.headers[name] = val;
        },
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.body = data;
            return this;
        }
    };

    console.log('Running handler...');
    await handler(req, res);
    console.log('Status code:', res.statusCode);
    console.log('Withdrawals count:', res.body?.withdrawals?.length);
    console.log('Withdrawals details:');
    res.body?.withdrawals?.forEach(w => {
        console.log(`- ID: ${w.id} | Amount: R$ ${(w.amount/100).toFixed(2)} | Note: ${w.note} | Auto: ${w.is_automatic}`);
    });
    console.log('Stats:', JSON.stringify(res.body?.stats, null, 2));
}

test();
