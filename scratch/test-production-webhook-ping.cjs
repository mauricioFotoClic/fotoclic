async function testPing() {
    console.log('=== Testando Ping na Rota do Webhook em Produção ===');
    const url = 'https://www.fotoclic.com.br/api/abacate-webhook';

    try {
        console.log(`Enviando POST vazio para ${url}...`);
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ping: true })
        });

        console.log('Resposta Status:', res.status);
        
        let bodyText = '';
        try {
            const data = await res.json();
            bodyText = JSON.stringify(data);
        } catch {
            bodyText = await res.text();
        }
        
        console.log('Resposta Corpo:', bodyText);
    } catch (e) {
        console.error('Erro na requisição:', e);
    }
}

testPing();
