/**
 * Utilitário de rastreamento de conversões (Google Ads, Meta Pixel e Analytics)
 */

// Conjunto em memória para evitar disparos duplicados na mesma execução
const firedConversions = new Set<string>();

/**
 * Dispara o evento de conversão de cadastro concluído com sucesso:
 * - Meta Pixel: "CompleteRegistration" (Pixel ID: 1619367559854156)
 * - Google Ads: "Cadastro de fotógrafo concluído" (AW-16960525575/NqzgCKeRoskcEleqtJc_ - apenas se fotógrafo)
 *
 * Disparado EXCLUSIVAMENTE após o cadastro ser concluído e confirmado na tela de boas-vindas.
 * Garantido para disparar APENAS 1 VEZ por usuário/sessão.
 */
export interface CompleteRegistrationParams {
    role?: 'photographer' | 'customer' | 'pending-approval' | string;
    identifier?: string;
    contentName?: string;
}

export const trackCompleteRegistration = (params: CompleteRegistrationParams = {}) => {
    try {
        const role = params.role || 'customer';
        const isPhotographer = role === 'photographer' || role === 'pending-approval';
        const key = params.identifier 
            ? `reg_completed_${params.identifier}` 
            : `reg_completed_${role}_${Date.now()}`;

        // 1. Verificação em memória (evita duplicidade em re-renderizações ou múltiplos componentes)
        if (firedConversions.has(key)) {
            console.log('[Tracking] Conversão de cadastro já disparada nesta sessão:', key);
            return;
        }

        // 2. Verificação no sessionStorage (evita duplicidade em F5 ou navegação repetida)
        if (typeof window !== 'undefined' && window.sessionStorage) {
            const sessionKey = params.identifier ? `reg_completed_${params.identifier}` : `reg_completed_${role}_session`;
            const stored = window.sessionStorage.getItem(sessionKey);
            if (stored) {
                console.log('[Tracking] Conversão de cadastro já registrada no sessionStorage:', sessionKey);
                return;
            }
            window.sessionStorage.setItem(sessionKey, Date.now().toString());
        }

        firedConversions.add(key);

        const win = window as any;
        const contentName = params.contentName || (isPhotographer ? 'Cadastro de Fotógrafo' : 'Cadastro de Cliente');

        // 3. Registra no dataLayer (Google Tag Manager / Analytics)
        if (win.dataLayer) {
            win.dataLayer.push({
                event: 'CompleteRegistration',
                content_name: contentName,
                user_role: role
            });
        }

        // 4. Dispara evento padrão no Meta Pixel (fbq) - CompleteRegistration
        if (typeof win.fbq === 'function') {
            win.fbq('track', 'CompleteRegistration', {
                content_name: contentName,
                status: true,
                role: role
            });
            console.log('✅ [Tracking] Meta Pixel: Evento "CompleteRegistration" disparado com sucesso!', { contentName, role });
        } else {
            console.warn('⚠️ [Tracking] fbq (Meta Pixel) não disponível no momento do disparo.');
        }

        // 5. Dispara evento no Google Ads / GA4 (gtag)
        if (typeof win.gtag === 'function') {
            win.gtag('event', 'sign_up', {
                method: 'email',
                user_role: role
            });
            console.log('✅ [Tracking] Google Ads/GA4: Evento "sign_up" disparado com sucesso!', { role });
        }

        // 6. Dispara a conversão específica do Google Ads (gtag)
        if (isPhotographer) {
            if (typeof win.gtag === 'function') {
                win.gtag('event', 'conversion', {
                    'send_to': 'AW-16960525575/NqzgCKeRoskcEleqtJc_',
                    'transport_type': 'beacon'
                });
                console.log('✅ [Tracking] Google Ads: Conversão "Cadastro de fotógrafo concluído" disparada! (AW-16960525575/NqzgCKeRoskcEleqtJc_)');
            } else if (win.dataLayer) {
                win.dataLayer.push('event', 'conversion', {
                    'send_to': 'AW-16960525575/NqzgCKeRoskcEleqtJc_',
                    'transport_type': 'beacon'
                });
                console.log('✅ [Tracking] Google Ads: Conversão enviada via dataLayer fallback!');
            }
        }
    } catch (err) {
        console.error('[Tracking] Erro ao disparar CompleteRegistration:', err);
    }
};

/**
 * Mantido para compatibilidade retroativa
 */
export const trackPhotographerRegistration = (identifier?: string) => {
    trackCompleteRegistration({ role: 'photographer', identifier });
};

/**
 * Dispara o evento de conversão de compra (Google Ads + Meta Pixel)
 */
export const trackPurchaseConversion = (orderId: string, totalValue: number, currency: string = 'BRL') => {
    try {
        const key = `purchase_${orderId}`;

        if (firedConversions.has(key)) return;

        if (typeof window !== 'undefined' && window.sessionStorage) {
            if (window.sessionStorage.getItem(key)) return;
            window.sessionStorage.setItem(key, Date.now().toString());
        }

        firedConversions.add(key);

        const win = window as any;

        // Google Ads Purchase
        if (typeof win.gtag === 'function') {
            win.gtag('event', 'conversion', {
                'send_to': 'AW-16960525575/OSHjCJSyuskcEleqtJc_',
                'value': totalValue,
                'currency': currency,
                'transaction_id': orderId,
                'transport_type': 'beacon'
            });
            console.log('✅ [Tracking] Google Ads: Conversão de compra disparada:', totalValue);
        }

        // Meta Pixel Purchase
        if (typeof win.fbq === 'function') {
            win.fbq('track', 'Purchase', {
                value: totalValue,
                currency: currency,
                content_type: 'product'
            });
            console.log('✅ [Tracking] Meta Pixel: Evento "Purchase" disparado:', totalValue);
        }
    } catch (err) {
        console.error('[Tracking] Erro ao disparar conversão de compra:', err);
    }
};
