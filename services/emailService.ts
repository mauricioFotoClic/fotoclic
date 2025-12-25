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
            <div style="background-color: #2563EB; padding: 20px; text-align: center;">
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
                    <a href="${window.location.origin}/customer-dashboard" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 24px; font-weight: bold; display: inline-block;">
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
                <a href="${resetLink}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
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

