const net = require('net');

const client = new net.Socket();
client.connect(43, 'whois.registro.br', () => {
    client.write('fotoclic.com.br\r\n');
});

client.on('data', (data) => {
    console.log(data.toString());
    client.destroy();
});

client.on('error', (err) => {
    console.error('Error:', err.message);
});
