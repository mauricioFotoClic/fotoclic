// This service calls the Vercel Serverless Function at /api/send-email
// It does NOT contain any API keys.
import api from './api';
import { EmailTemplates } from '../types';

const replacePlaceholders = (template: string, variables: Record<string, string>) => {
  return template.replace(/{{(\w+)}}/g, (_, key) => variables[key] || '');
};

export const emailService = {
  // Helper to fetch templates (could be cached in a real app context)
  getTemplates: async (): Promise<EmailTemplates | null> => {
    try {
      return await api.getEmailTemplates();
    } catch (error) {
      console.error("Failed to fetch email templates", error);
      return null;
    }
  },

  sendNewPhotographerNotification: async (photographerName: string, photographerEmail: string) => {
    return emailService.sendEmail(
      'svalmauricio@gmail.com', // Notification to Admin
      '📸 Novo Fotógrafo Cadastrado no FotoClic',
      `<div style="font-family: sans-serif; color: #333;">
            <h1>Novo Fotógrafo Cadastrado!</h1>
            <p>Um novo usuário se cadastrou como fotógrafo na plataforma.</p>
            <hr />
            <p><strong>Nome:</strong> ${photographerName}</p>
            <p><strong>Email:</strong> ${photographerEmail}</p>
            <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
            <hr />
            <p>Acesse o painel administrativo para revisar e aprovar este cadastro.</p>
        </div>`
    );
  },

  sendPhotographerStatusEmail: async (photographerEmail: string, photographerName: string, status: 'activated' | 'deactivated') => {
    const templates = await emailService.getTemplates();
    if (!templates) return false;

    const template = status === 'activated' ? templates.photographerActivated : templates.photographerDeactivated;

    const subject = replacePlaceholders(template.subject, { nome_fotografo: photographerName });
    const body = replacePlaceholders(template.body, { nome_fotografo: photographerName });

    // Wrap simple text body in HTML if needed, or assume templates are plain text/simple HTML
    const htmlBody = `<div style="font-family: sans-serif; color: #333; white-space: pre-wrap;">${body}</div>`;

    return emailService.sendEmail(photographerEmail, subject, htmlBody);
  },

  sendPhotoRejectionEmail: async (photographerEmail: string, photographerName: string, photoTitle: string, reason: string) => {
    const templates = await emailService.getTemplates();
    if (!templates) return false;

    const template = templates.photoRejected;

    const subject = replacePlaceholders(template.subject, {
      nome_fotografo: photographerName,
      titulo_foto: photoTitle,
      motivo_rejeicao: reason
    });
    const body = replacePlaceholders(template.body, {
      nome_fotografo: photographerName,
      titulo_foto: photoTitle,
      motivo_rejeicao: reason
    });

    const htmlBody = `<div style="font-family: sans-serif; color: #333; white-space: pre-wrap;">${body}</div>`;

    return emailService.sendEmail(photographerEmail, subject, htmlBody);
  },

  sendPayoutProcessedEmail: async (photographerEmail: string, photographerName: string, amount: number, date: string) => {
    const templates = await emailService.getTemplates();
    if (!templates) return false;

    const template = templates.payoutProcessed;

    const subject = replacePlaceholders(template.subject, {
      nome_fotografo: photographerName,
      valor_pagamento: amount.toFixed(2).replace('.', ','),
      data_pagamento: date
    });
    const body = replacePlaceholders(template.body, {
      nome_fotografo: photographerName,
      valor_pagamento: `R$ ${amount.toFixed(2).replace('.', ',')}`,
      data_pagamento: date
    });

    const htmlBody = `<div style="font-family: sans-serif; color: #333; white-space: pre-wrap;">${body}</div>`;

    return emailService.sendEmail(photographerEmail, subject, htmlBody);
  },

  sendPurchaseConfirmation: async (buyerEmail: string, buyerName: string, orderTotal: number, itemCount: number) => {
    return emailService.sendEmail(
      buyerEmail,
      '✅ Confirmação de Compra - FotoClic',
      `<div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #FF6B00; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Compra Confirmada!</h1>
            </div>
            <div style="padding: 24px;">
                <p style="font-size: 16px;">Olá, <strong>${buyerName}</strong>!</p>
                <p>Obrigado por sua compra no FotoClic. Suas fotos já estão disponíveis para download no seu painel.</p>
                
                <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 24px 0;">
                    <h3 style="margin-top: 0; color: #1e293b;">Resumo do Pedido</h3>
                    <p style="margin: 8px 0;"><strong>Total de Itens:</strong> ${itemCount}</p>
                    <p style="margin: 8px 0; font-size: 18px;"><strong>Valor Total:</strong> R$ ${orderTotal.toFixed(2).replace('.', ',')}</p>
                </div>

                <div style="text-align: center; margin: 32px 0;">
                    <a href="${window.location.origin}/customer-dashboard" style="background-color: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 24px; font-weight: bold; display: inline-block;">
                        Baixar Minhas Fotos
                    </a>
                </div>
                
                <p style="font-size: 14px; color: #64748b; text-align: center; margin-top: 32px;">
                    Se você tiver alguma dúvida, responda a este email.
                </p>
            </div>
            <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
                © 2024 FotoClic Marketplace. Todos os direitos reservados.
            </div>
        </div>`
    );
  },

  sendPasswordResetEmail: async (to: string, name: string, resetLink: string) => {
    return emailService.sendEmail(
      to,
      'Recuperação de Senha - FotoClic',
      `<div style="font-family: sans-serif; color: #333;">
            <h2>Olá, ${name}!</h2>
            <p>Recebemos uma solicitação para recuperar sua senha no FotoClic.</p>
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}" style="background-color: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    Redefinir Senha
                </a>
            </div>
            <p>Ou copie e cole o link abaixo no seu navegador:</p>
            <p><a href="${resetLink}">${resetLink}</a></p>
            <hr />
            <p style="font-size: 12px; color: #666;">Se você não solicitou isso, ignore este e-mail. O link expira em 1 hora.</p>
        </div>`
    );
  },

  sendReportWarningEmail: async (photographerEmail: string, photographerName: string, reportReason: string, adminNote: string) => {
    const reasonLabels: Record<string, string> = {
      conteudo_inapropriado: 'Conteúdo Inapropriado',
      perfil_falso: 'Perfil Falso',
      violacao_direitos: 'Violação de Direitos',
      assedio: 'Assédio',
      spam: 'Spam',
      outro: 'Outro',
    };
    const reasonLabel = reasonLabels[reportReason] || reportReason;

    return emailService.sendEmail(
      photographerEmail,
      '⚠️ Aviso Importante sobre sua conta - FotoClic',
      `<div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #dc2626; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">⚠️ Aviso sobre sua Conta</h1>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 16px;">Olá, <strong>${photographerName}</strong>!</p>
          <p>Sua conta no FotoClic recebeu uma denúncia que foi analisada pela nossa equipe de moderação.</p>

          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 4px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #991b1b;">Motivo da Denúncia:</p>
            <p style="margin: 0; color: #7f1d1d;">${reasonLabel}</p>
          </div>

          ${adminNote ? `<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #1e293b;">Nota da Moderação:</p>
            <p style="margin: 0; color: #475569; white-space: pre-wrap;">${adminNote}</p>
          </div>` : ''}

          <p>Por favor, revise o conteúdo do seu perfil e certifique-se de que está em conformidade com os nossos <a href="${typeof window !== 'undefined' ? window.location.origin : ''}/terms" style="color: #FF6B00;">Termos de Uso</a>.</p>
          <p>Reincidências poderão resultar na suspensão da sua conta.</p>

          <p style="font-size: 14px; color: #64748b; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            Se você acredita que isso foi um erro, entre em contato com nosso suporte respondendo este e-mail.
          </p>
        </div>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
          © ${new Date().getFullYear()} FotoClic Marketplace. Todos os direitos reservados.
        </div>
      </div>`
    );
  },

  sendEmail: async (to: string, subject: string, html: string) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro ao enviar email:', errorData);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro de rede ao enviar email:', error);
      return false;
    }
  }
};


