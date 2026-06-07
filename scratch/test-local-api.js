async function testLocalApi() {
    try {
        console.log('Consultando API local (http://localhost:4242/api/abacate-stats)...');
        const res = await fetch('http://localhost:4242/api/abacate-stats');
        console.log('Status da resposta:', res.status);
        const data = await res.json();
        console.log('Atributos no JSON retornado:');
        console.log('api_connected:', data.api_connected);
        console.log('api_error:', data.api_error);
        console.log('api_balance:', data.api_balance);
        console.log('stats:', JSON.stringify(data.stats, null, 2));
    } catch (e) {
        console.error('Erro na requisição:', e.message);
    }
}

testLocalApi();
