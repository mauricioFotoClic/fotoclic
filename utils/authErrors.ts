/**
 * Centraliza a tradução de mensagens de erro de autenticação (Supabase Auth, APIs e rede)
 * para Português do Brasil (PT-BR), evitando exibir mensagens cruas em inglês na interface.
 */

interface ErrorLike {
  message?: string;
  error?: string;
  code?: string;
  status?: number;
}

const PT_BR_HINT_REGEX =
  /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]|\b(não|já|inválid|erro|falha|aguard|senha|e-mail|cadastro|obrigatóri|conexão|sessão|autorizado|expirou)\b/i;

const AUTH_ERROR_RULES: Array<{ test: (msg: string, code: string, status?: number) => boolean; ptBr: string }> = [
  {
    test: (msg, code) =>
      msg.includes('invalid login credentials') ||
      msg.includes('invalid email or password') ||
      code === 'invalid_credentials',
    ptBr: 'E-mail ou senha incorretos.',
  },
  {
    test: (msg, code) =>
      msg.includes('email not confirmed') || code === 'email_not_confirmed',
    ptBr: 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou pasta de spam.',
  },
  {
    test: (msg) =>
      msg.includes('error sending recovery email') ||
      msg.includes('error sending confirmation email') ||
      msg.includes('error sending magic link email'),
    ptBr: 'Não foi possível enviar o e-mail de recuperação no momento. Tente novamente em instantes.',
  },
  {
    test: (msg, code) =>
      msg.includes('already registered') ||
      msg.includes('already exists') ||
      msg.includes('user already exists') ||
      code === 'user_already_exists' ||
      code === 'email_exists',
    ptBr: 'Este e-mail já possui cadastro no FotoClic. Faça login na sua conta ou utilize a recuperação de senha.',
  },
  {
    test: (msg, code) =>
      msg.includes('password should be at least') ||
      msg.includes('password is too short') ||
      code === 'weak_password',
    ptBr: 'A senha deve ter pelo menos 6 caracteres.',
  },
  {
    test: (msg, code) =>
      msg.includes('new password should be different from the old password') ||
      code === 'same_password',
    ptBr: 'A nova senha deve ser diferente da senha atual.',
  },
  {
    test: (msg, code, status) =>
      status === 429 ||
      code === 'over_email_send_rate_limit' ||
      code === 'over_request_rate_limit' ||
      msg.includes('rate limit') ||
      msg.includes('too many requests') ||
      msg.includes('you can only request this after'),
    ptBr: 'Muitas tentativas seguidas. Aguarde alguns instantes antes de tentar novamente.',
  },
  {
    test: (msg, code) =>
      msg.includes('unable to validate email address') ||
      msg.includes('invalid email') ||
      code === 'validation_failed',
    ptBr: 'Endereço de e-mail inválido. Verifique o formato digitado.',
  },
  {
    test: (msg, code) =>
      msg.includes('user not found') || code === 'user_not_found',
    ptBr: 'Nenhuma conta foi encontrada com este e-mail.',
  },
  {
    test: (msg, code) =>
      msg.includes('auth session missing') ||
      msg.includes('invalid refresh token') ||
      msg.includes('jwt expired') ||
      msg.includes('token has expired') ||
      msg.includes('otp expired') ||
      code === 'otp_expired' ||
      code === 'session_expired',
    ptBr: 'Sua sessão ou link de verificação expirou. Solicite um novo link ou faça login novamente.',
  },
  {
    test: (msg, code) =>
      msg.includes('signup is disabled') || code === 'signup_disabled',
    ptBr: 'O cadastro de novas contas está temporariamente desabilitado.',
  },
  {
    test: (msg) =>
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('network request failed') ||
      msg.includes('load failed'),
    ptBr: 'Erro de conexão com o servidor. Verifique sua internet e tente novamente.',
  },
];

export function translateAuthError(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro inesperado. Tente novamente.'
): string {
  if (!error) return fallbackMessage;

  const errObj: ErrorLike = typeof error === 'object' ? (error as ErrorLike) : {};
  const rawMessage =
    typeof error === 'string'
      ? error
      : errObj.message || errObj.error || '';

  const normalizedMessage = rawMessage.trim().toLowerCase();
  const normalizedCode = String(errObj.code || '').trim().toLowerCase();
  const status = typeof errObj.status === 'number' ? errObj.status : undefined;

  for (const rule of AUTH_ERROR_RULES) {
    if (rule.test(normalizedMessage, normalizedCode, status)) {
      return rule.ptBr;
    }
  }

  if (rawMessage && PT_BR_HINT_REGEX.test(rawMessage)) {
    return rawMessage;
  }

  return fallbackMessage;
}

