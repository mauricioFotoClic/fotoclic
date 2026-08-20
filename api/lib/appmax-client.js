// Appmax API v4 Helper Client for Serverless Functions
// Supports OAuth2 JWT token caching with automatic renewal and direct API Key usage.

let cachedToken = null;
let tokenExpiresAt = 0;

function getEnvironment() {
  return process.env.APPMAX_ENV === 'production' ? 'production' : 'sandbox';
}

function getBaseUrl() {
  return getEnvironment() === 'production'
    ? 'https://api.appmax.com.br/api/v4'
    : 'https://sandbox.appmax.com.br/api/v4';
}

function getAuthUrl() {
  return getEnvironment() === 'production'
    ? 'https://auth.appmax.com.br/oauth2/token'
    : 'https://auth.sandboxappmax.com.br/oauth2/token';
}

/**
 * Retorna o token de acesso válido para a Appmax
 */
async function getAccessToken() {
  // Se houver uma API Key direta configurada, usa diretamente
  if (process.env.APPMAX_API_KEY) {
    return process.env.APPMAX_API_KEY;
  }

  const clientId = process.env.APPMAX_CLIENT_ID;
  const clientSecret = process.env.APPMAX_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    // Fallback para sandbox token genérico de desenvolvimento se não fornecido
    console.warn("[Appmax Client] Credenciais APPMAX_CLIENT_ID / APPMAX_CLIENT_SECRET não configuradas. Verifique suas variáveis de ambiente.");
    return process.env.APPMAX_API_KEY || 'demo_sandbox_token';
  }

  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  try {
    const authUrl = getAuthUrl();
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await response.json();
    if (!response.ok || !data.access_token) {
      throw new Error(`Falha ao obter token OAuth2 da Appmax: ${data.message || response.statusText}`);
    }

    cachedToken = data.access_token;
    // Expira em 55 minutos (token dura 60 min)
    tokenExpiresAt = now + (data.expires_in ? (data.expires_in - 300) * 1000 : 55 * 60 * 1000);
    return cachedToken;
  } catch (err) {
    console.error("[Appmax Client] Erro na autenticação OAuth2:", err);
    throw err;
  }
}

/**
 * Cria ou atualiza um cliente (Customer) na Appmax
 */
async function createCustomer({ firstname, lastname, email, cpf, telephone, ip }) {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();

  const cleanCpf = (cpf || '').replace(/\D/g, '');
  const cleanPhone = (telephone || '').replace(/\D/g, '');

  const payload = {
    access_token: token,
    firstname: firstname || 'Cliente',
    lastname: lastname || 'FotoClic',
    email: (email || '').trim().toLowerCase(),
    cpf: cleanCpf || '00000000000',
    telephone: cleanPhone || '11999999999',
    ip: ip || '127.0.0.1'
  };

  const response = await fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    console.error("[Appmax Customer Error]", data);
    throw new Error(data.text || data.message || "Erro ao registrar cliente na Appmax");
  }

  return data.data; // { id: customer_id, ... }
}

/**
 * Cria um pedido (Order) com Split de Pagamentos na Appmax
 */
async function createOrder({ customer_id, products, total, split }) {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();

  const payload = {
    access_token: token,
    customer_id,
    products: products.map(p => ({
      id: p.id,
      title: p.title,
      qty: p.qty || 1,
      price: Number(p.price.toFixed(2))
    })),
    total: Number(total.toFixed(2))
  };

  // Se houver regras de split configuradas, inclui no payload
  if (split && Array.isArray(split) && split.length > 0) {
    payload.split = split;
  }

  const response = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    console.error("[Appmax Order Error]", data);
    throw new Error(data.text || data.message || "Erro ao criar pedido na Appmax");
  }

  return data.data; // { id: order_id, ... }
}

/**
 * Processa pagamento via PIX
 */
async function payWithPix({ order_id }) {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();

  const response = await fetch(`${baseUrl}/payments/pix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: token,
      order_id
    })
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    console.error("[Appmax PIX Payment Error]", data);
    throw new Error(data.text || data.message || "Erro ao processar pagamento PIX na Appmax");
  }

  return data.data; // { pix_code, qr_code_image, expiration_date, ... }
}

/**
 * Processa pagamento via Cartão de Crédito
 */
async function payWithCreditCard({ order_id, card_token, installments, cvv }) {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();

  const payload = {
    access_token: token,
    order_id,
    payment: {
      card_token,
      installments: Number(installments) || 1,
      cvv: cvv || '123'
    }
  };

  const response = await fetch(`${baseUrl}/payments/credit-card`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    console.error("[Appmax Card Payment Error]", data);
    throw new Error(data.text || data.message || "Erro ao processar pagamento por Cartão na Appmax");
  }

  return data.data; // { status, authorization_code, ... }
}

/**
 * Registra ou atualiza um recebedor (fotógrafo) para o Split na Appmax
 */
async function createRecipient({ name, email, document, bank_code, bank_agency, bank_account, bank_account_digit, pix_key }) {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();

  const payload = {
    access_token: token,
    name,
    email,
    document: (document || '').replace(/\D/g, ''),
    bank_code,
    bank_agency,
    bank_account,
    bank_account_digit,
    pix_key
  };

  const response = await fetch(`${baseUrl}/recipients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    console.error("[Appmax Recipient Error]", data);
    throw new Error(data.text || data.message || "Erro ao registrar recebedor na Appmax");
  }

  return data.data;
}

module.exports = {
  getAccessToken,
  createCustomer,
  createOrder,
  payWithPix,
  payWithCreditCard,
  createRecipient,
  getBaseUrl
};
