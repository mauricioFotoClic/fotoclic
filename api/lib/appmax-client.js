// Appmax API Helper Client for Serverless Functions
// Supports OAuth2 JWT token caching with automatic renewal and direct API Key usage.

let cachedToken = null;
let tokenExpiresAt = 0;

function getEnvironment() {
  return process.env.APPMAX_ENV === 'production' ? 'production' : 'sandbox';
}

function getBaseUrl() {
  return getEnvironment() === 'production'
    ? 'https://api.appmax.com.br/v1'
    : 'https://api.sandboxappmax.com.br/v1';
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
  if (process.env.APPMAX_API_KEY) {
    return process.env.APPMAX_API_KEY;
  }

  const clientId = process.env.APPMAX_CLIENT_ID;
  const clientSecret = process.env.APPMAX_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("[Appmax Client] Credenciais APPMAX_CLIENT_ID / APPMAX_CLIENT_SECRET não configuradas.");
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

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`Resposta de autenticação inválida da Appmax: ${raw.slice(0, 200)}`);
    }

    if (!response.ok || !data.access_token) {
      throw new Error(`Falha ao obter token OAuth2 da Appmax: ${data.message || data.error_description || response.statusText}`);
    }

    cachedToken = data.access_token;
    // Expira em 55 minutos (token dura 60 min ou conforme retornado)
    tokenExpiresAt = now + (data.expires_in ? (data.expires_in - 300) * 1000 : 55 * 60 * 1000);
    return cachedToken;
  } catch (err) {
    console.error("[Appmax Client] Erro na autenticação OAuth2:", err);
    throw err;
  }
}

/**
 * Auxiliar para fazer requisições seguras à API da Appmax
 */
async function apiRequest(endpoint, payload) {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const rawText = await response.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { error: rawText || `Erro HTTP ${response.status} da Appmax` };
  }

  if (!response.ok || data.success === false) {
    const errorMsg = data.message || data.text || data.error || `Erro na comunicação com a Appmax (Status ${response.status})`;
    
    // Tratamento especial para erro de Merchant não vinculado na Sandbox
    if (response.status === 404 && errorMsg.includes('Merchant not found')) {
      throw new Error('A aplicação na Appmax precisa estar vinculada à sua loja na Sandbox (ou utilize a Chave de API direta APPMAX_API_KEY no painel).');
    }
    
    throw new Error(errorMsg);
  }

  return data.data || data;
}

/**
 * Cria ou atualiza um cliente (Customer) na Appmax
 */
async function createCustomer({ firstname, lastname, email, cpf, telephone, ip }) {
  const cleanCpf = (cpf || '').replace(/\D/g, '');
  const cleanPhone = (telephone || '').replace(/\D/g, '');

  const payload = {
    firstname: firstname || 'Cliente',
    lastname: lastname || 'FotoClic',
    email: (email || '').trim().toLowerCase(),
    cpf: cleanCpf || '00000000000',
    telephone: cleanPhone || '11999999999',
    ip: ip || '127.0.0.1'
  };

  return await apiRequest('/customers', payload);
}

/**
 * Cria um pedido (Order) com Split de Pagamentos na Appmax
 */
async function createOrder({ customer_id, products, total, split }) {
  const payload = {
    customer_id,
    products: products.map(p => ({
      id: p.id,
      title: p.title,
      qty: p.qty || 1,
      price: Number(p.price.toFixed(2))
    })),
    total: Number(total.toFixed(2))
  };

  if (split && Array.isArray(split) && split.length > 0) {
    payload.split = split;
  }

  return await apiRequest('/orders', payload);
}

/**
 * Processa pagamento via PIX
 */
async function payWithPix({ order_id }) {
  const payload = {
    order_id
  };

  return await apiRequest('/payments/pix', payload);
}

/**
 * Processa pagamento via Cartão de Crédito
 */
async function payWithCreditCard({ order_id, card_token, installments, cvv }) {
  const payload = {
    order_id,
    payment: {
      card_token,
      installments: Number(installments) || 1,
      cvv: cvv || '123'
    }
  };

  return await apiRequest('/payments/credit-card', payload);
}

/**
 * Registra ou atualiza um recebedor (fotógrafo) para o Split na Appmax
 */
async function createRecipient({ name, email, document, bank_code, bank_agency, bank_account, bank_account_digit, pix_key }) {
  const payload = {
    name,
    email,
    document: (document || '').replace(/\D/g, ''),
    bank_code,
    bank_agency,
    bank_account,
    bank_account_digit,
    pix_key
  };

  return await apiRequest('/recipients', payload);
}

export default {
  getAccessToken,
  createCustomer,
  createOrder,
  payWithPix,
  payWithCreditCard,
  createRecipient,
  getBaseUrl
};

export {
  getAccessToken,
  createCustomer,
  createOrder,
  payWithPix,
  payWithCreditCard,
  createRecipient,
  getBaseUrl
};

