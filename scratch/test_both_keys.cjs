const keyLower = "re_71oGEGMj_AzLtW7J2hfMfqkji4zYmixwD";
const keyUpper = "re_71oGEGMj_AzLtW7J2hfMFqkji4zYmixwD";

async function testKey(name, key) {
    console.log(`\nTestando chave ${name}: ${key}`);
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'FotoClic <nao-responda@fotoclic.com.br>',
                to: 'daian.cliente@gmail.com',
                subject: `Teste Resend - ${name}`,
                html: `<p>Teste de chave de API ${name} no FotoClic.</p>`
            }),
        });

        const data = await res.json();
        console.log(`[${name}] Resposta Status:`, res.status);
        console.log(`[${name}] Resposta Corpo:`, JSON.stringify(data));
    } catch (err) {
        console.error(`[${name}] Erro na requisição:`, err);
    }
}

async function run() {
    await testKey("Com f minúsculo (local)", keyLower);
    await testKey("Com F maiúsculo (Vercel)", keyUpper);
}

run();
