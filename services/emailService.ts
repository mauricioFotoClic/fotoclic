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
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.fotoclic.com.br';
    return emailService.sendEmail(
      'svalmauricio@gmail.com', // Notification to Admin
      '📸 Novo Fotógrafo Aguardando Aprovação - FotoClic',
      `<div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #FF6B00 0%, #FF8533 100%); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: bold;">📸 Novo Fotógrafo Cadastrado!</h1>
        </div>
        <div style="padding: 28px 24px; background-color: #ffffff;">
          <p style="font-size: 16px; margin-top: 0; color: #334155;">Um novo fotógrafo acabou de se cadastrar na plataforma e está <strong>aguardando moderação</strong> para ter o acesso liberado.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Nome:</strong> ${photographerName}</p>
            <p style="margin: 0 0 10px 0;"><strong>E-mail:</strong> ${photographerEmail}</p>
            <p style="margin: 0;"><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          </div>

          <p style="font-size: 15px; color: #475569; font-weight: 600;">Você pode revisar e aprovar/recusar este cadastro de 2 formas:</p>
          
          <div style="margin: 24px 0; text-align: center;">
            <a href="${siteUrl}/admin" style="background-color: #FF6B00; color: white; padding: 12px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-right: 10px; margin-bottom: 8px;">
              💻 Revisar no Painel Admin
            </a>
            <a href="https://t.me/fotoclic_ai_bot" style="background-color: #0088cc; color: white; padding: 12px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-bottom: 8px;">
              📱 Revisar pelo Telegram
            </a>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            💡 <em>Dica: Pelo Telegram, você pode aprovar ou rejeitar o cadastro em 1 toque usando os botões interativos do bot.</em>
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
          FotoClic &bull; Sistema Automático de Notificações
        </div>
      </div>`
    );
  },

  sendNewProducerAdminNotification: async (producerName: string, producerEmail: string, companyName?: string) => {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.fotoclic.com.br';
    return emailService.sendEmail(
      'svalmauricio@gmail.com',
      '🎪 Novo Produtor de Eventos Aguardando Moderação - FotoClic',
      `<div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: bold;">🎪 Novo Produtor de Eventos Cadastrado!</h1>
        </div>
        <div style="padding: 28px 24px; background-color: #ffffff;">
          <p style="font-size: 16px; margin-top: 0; color: #334155;">Um novo organizador de eventos solicitou acesso como <strong>Produtor</strong> e está aguardando moderação para gerenciar eventos e equipes de fotógrafos.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Responsável:</strong> ${producerName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Produtora / Empresa:</strong> ${companyName || 'Individual'}</p>
            <p style="margin: 0 0 10px 0;"><strong>E-mail:</strong> ${producerEmail}</p>
            <p style="margin: 0;"><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          </div>

          <p style="font-size: 15px; color: #475569; font-weight: 600;">Modere este cadastro pelo Painel Admin ou Telegram:</p>
          
          <div style="margin: 24px 0; text-align: center;">
            <a href="${siteUrl}/admin#producers" style="background-color: #ea580c; color: white; padding: 12px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-right: 10px; margin-bottom: 8px;">
              💻 Moderar no Painel Admin
            </a>
            <a href="https://t.me/fotoclic_ai_bot" style="background-color: #0088cc; color: white; padding: 12px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-bottom: 8px;">
              📱 Moderar pelo Telegram
            </a>
          </div>
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
          FotoClic &bull; Sistema Automático de Notificações
        </div>
      </div>`
    );
  },

  sendProducerPendingModerationEmail: async (producerEmail: string, producerName: string) => {
    return emailService.sendEmail(
      producerEmail,
      '⏳ Seu cadastro de Produtor foi recebido e está em moderação - FotoClic',
      `<div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: bold;">FotoClic &bull; Bem-vindo!</h1>
        </div>
        <div style="padding: 28px 24px; background-color: #ffffff;">
          <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">Olá, ${producerName}!</h2>
          <p style="font-size: 15px; color: #334155; line-height: 1.6;">
            Recebemos com sucesso sua solicitação de cadastro como <strong>Produtor de Eventos</strong> na plataforma FotoClic.
          </p>
          
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.5;">
              <strong>📋 Status: Em Moderação Técnica</strong><br/>
              Sua conta entrou em nossa fila de avaliação para validação das diretrizes e segurança da plataforma.
            </p>
          </div>

          <h3 style="font-size: 15px; color: #1e293b; margin-top: 24px; margin-bottom: 8px;">O que acontece a seguir?</h3>
          <ul style="font-size: 14px; color: #475569; line-height: 1.6; padding-left: 20px; margin: 0 0 20px 0;">
            <li>Nossa equipe técnica analisa seu perfil (tempo médio: <strong>até 24 horas úteis</strong>).</li>
            <li>Assim que a conta for homologada, você receberá um e-mail de confirmação de ativação.</li>
            <li>Seu painel exclusivo será destravado para criação de eventos e convocação de equipes.</li>
          </ul>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            Dúvidas ou urgência com algum evento próximo? Responda a este e-mail ou escreva para <strong>contato@fotoclic.com.br</strong>.
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
          FotoClic &bull; Gestão Inteligente de Fotos e Eventos
        </div>
      </div>`
    );
  },

  sendProducerActivatedEmail: async (producerEmail: string, producerName: string) => {
    return emailService.sendEmail(
      producerEmail,
      '🎉 Parabéns! Seu cadastro de Produtor no FotoClic foi Aprovado!',
      `<div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 26px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">🎉 Cadastro Aprovado!</h1>
          <p style="color: #f0fdf4; margin: 6px 0 0 0; font-size: 14px;">Seu Painel de Produtor de Eventos está liberado</p>
        </div>
        <div style="padding: 28px 24px; background-color: #ffffff;">
          <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">Parabéns, ${producerName}!</h2>
          <p style="font-size: 15px; color: #334155; line-height: 1.6;">
            É um prazer ter você conosco! Sua conta de <strong>Produtor Oficial FotoClic</strong> foi analisada, aprovada e já está totalmente ativada.
          </p>
          
          <div style="text-align: center; margin: 28px 0;">
            <a href="https://www.fotoclic.com.br/produtor" style="background-color: #ea580c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(234, 88, 12, 0.3);">
              🚀 Acessar Painel do Produtor
            </a>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 24px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #1e293b; font-size: 14px;">O que você pode fazer agora:</p>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569;">📅 <strong>Criar seus Eventos:</strong> Cadastre corridas, torneios ou festivais esportivos.</p>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569;">👥 <strong>Convidar Fotógrafos:</strong> Monte sua equipe de cobertura com até 10 profissionais.</p>
            <p style="margin: 0; font-size: 13px; color: #475569;">💰 <strong>Acompanhar Vendas & Comissões:</strong> Visualize o faturamento em tempo real e configure sua chave Pix para saques.</p>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            Conte com o suporte FotoClic para o sucesso dos seus eventos esportivos!
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
          FotoClic &bull; Conectando momentos, organizadores e fotógrafos
        </div>
      </div>`
    );
  },

  sendCollaboratorInviteEmail: async (params: {
    photographerEmail: string;
    producerName: string;
    companyName?: string;
    eventName: string;
    eventDate: string;
    commissionPercent: number;
  }) => {
    const inviter = params.companyName || params.producerName;
    const photographerSplitPercent = 100 - params.commissionPercent;
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.fotoclic.com.br';

    return emailService.sendEmail(
      params.photographerEmail,
      `📸 Convite para Equipe: ${params.eventName} no FotoClic`,
      `<div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #FF6B00 0%, #FF8533 100%); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: bold;">📸 Convite de Cobertura Fotográfica</h1>
          <p style="color: #fff7ed; margin: 6px 0 0 0; font-size: 14px;">Você foi convidado para a equipe oficial de um evento!</p>
        </div>
        <div style="padding: 28px 24px; background-color: #ffffff;">
          <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">Olá!</h2>
          <p style="font-size: 15px; color: #334155; line-height: 1.6;">
            O produtor <strong>${inviter}</strong> convocou você para integrar a equipe exclusiva de cobertura fotográfica no <strong>FotoClic</strong>.
          </p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #1e293b;">📅 <strong>Evento:</strong> ${params.eventName}</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #1e293b;">🗓️ <strong>Data:</strong> ${new Date(params.eventDate).toLocaleDateString('pt-BR')}</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #1e293b;">🏢 <strong>Coordenação:</strong> ${inviter}</p>
            <p style="margin: 0; font-size: 14px; color: #16a34a;">💰 <strong>Sua Parte das Vendas:</strong> <strong>${photographerSplitPercent}% líquido</strong> (taxa de coordenação do produtor: ${params.commissionPercent}%)</p>
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${siteUrl}/area-fotografo" style="background-color: #FF6B00; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(255, 107, 0, 0.3);">
              🚀 Acessar FotoClic e Começar
            </a>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            Ao publicar suas fotos selecionando este evento, os repasses financeiros e divisões automáticas de comissões serão aplicados diretamente em cada venda.
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
          FotoClic &bull; Marketplace Profissional de Fotografia Esportiva
        </div>
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

  sendWelcomeEmail: async (userEmail: string, userName: string, role: 'photographer' | 'customer') => {
    const templates = await emailService.getTemplates();
    if (!templates) return false;

    const isPhotographer = role === 'photographer';
    const template = isPhotographer ? templates.welcomePhotographer : templates.welcomeCustomer;

    if (!template) return false;

    const placeholders = isPhotographer ? { nome_fotografo: userName } : { nome_cliente: userName };
    const subject = replacePlaceholders(template.subject, placeholders);
    const body = replacePlaceholders(template.body, placeholders);

    const htmlBody = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #FF6B00 0%, #FF8533 100%); padding: 32px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">Bem-vindo ao FotoClic!</h1>
        </div>
        <div style="padding: 32px 24px; background-color: white;">
          <p style="font-size: 18px; margin-bottom: 24px;">Olá, <strong>${userName}</strong>!</p>
          <div style="font-size: 16px; line-height: 1.6; color: #4b5563; white-space: pre-wrap; margin-bottom: 32px;">${body}</div>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${window.location.origin}" style="background-color: #FF6B00; color: white; padding: 14px 32px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(255, 107, 0, 0.2);">
              Começar Agora
            </a>
          </div>
          
          <p style="font-size: 14px; color: #9ca3af; text-align: center; margin-top: 40px; border-top: 1px solid #f3f4f6; padding-top: 24px;">
            Estamos ansiosos para ver suas fotos! <br />
            Equipe FotoClic
          </p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} FotoClic Marketplace. Todos os direitos reservados.
        </div>
      </div>`;

    return emailService.sendEmail(userEmail, subject, htmlBody);
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
      await api.sendEmail(to, subject, html);
      return true;
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      return false;
    }
  }
};


