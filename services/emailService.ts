// This service calls the Vercel Serverless Function at /api/send-email
// It does NOT contain any API keys.

export const emailService = {
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
