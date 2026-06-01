import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Mock request and response objects
const req = {
  headers: {
    authorization: `Bearer ${process.env.CRON_SECRET}`
  }
};

const res = {
  statusCode: 200,
  headers: {},
  setHeader(name, value) {
    this.headers[name] = value;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  async json(data) {
    console.log('\n--- Resposta do Worker ---');
    console.log(`HTTP Status: ${this.statusCode}`);
    console.log('JSON Output:', JSON.stringify(data, null, 2));
    return this;
  }
};

async function testWorker() {
  console.log('Iniciando execução local do payout-worker...');
  try {
    const { default: handler } = await import('../api/payout-worker.js');
    await handler(req, res);
  } catch (err) {
    console.error('Falha ao rodar o worker:', err);
  }
}

testWorker();
