/**
 * Utilitário de rastreamento de conversões (Google Ads, Meta Pixel e Analytics)
 */

// Conjunto em memória para evitar disparos duplicados na mesma execução
const firedConversions = new Set<string>();

/**
 * Dispara o evento de conversão para novos fotógrafos:
 * - Google Ads: "Cadastro de fotógrafo concluído" (AW-16960525575/NqzgCKeRoskcEleqtJc_)
 * - Meta Pixel: "CompleteRegistration" (Pixel: 1619367559854156)
 *
 * Garantido para disparar APENAS 1 VEZ por cadastro e apenas para novos fotógrafos.
 */
export const trackPhotographerRegistration = (identifier?: string) => {
    try {
        const key = identifier ? `photographer_registered_${identifier}` : 'photographer_registered_session';

        // 1. Verificação em memória (evita duplicidade em re-renderizações ou múltiplos componentes)
        if (firedConversions.has(key)) {
            console.log('[Tracking] Conversão de fotógrafo já disparada nesta sessão:', key);
            return;
        }

        // 2. Verificação no sessionStorage (evita duplicidade em F5 ou navegação na mesma sessão)
        if (typeof window !== 'undefined' && window.sessionStorage) {
            const stored = window.sessionStorage.getItem(key);
            if (stored) {
                console.log('[Tracking] Conversão de fotógrafo já registrada no sessionStorage:', key);
                return;
            }
            window.sessionStorage.setItem(key, Date.now().toString());
        }

        firedConversions.add(key);

        const win = window as any;

        // 3. Registra no dataLayer (Google Tag Manager / Analytics)
        if (win.dataLayer) {
            win.dataLayer.push({
                event: 'conversion_photographer_completed',
                conversion_name: 'Cadastro de fotógrafo concluído',
                send_to: 'AW-16960525575/NqzgCKeRoskcEleqtJc_'
            });
        }

        // 4. Dispara evento no Google Ads (gtag)
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

        // 5. Dispara evento padrão no Meta Pixel (fbq)
        if (typeof win.fbq === 'function') {
            win.fbq('track', 'CompleteRegistration', {
                content_name: 'Cadastro de Fotógrafo',
                status: true,
                role: 'photographer'
            });
            console.log('✅ [Tracking] Meta Pixel: Evento "CompleteRegistration" disparado com sucesso!');
        } else {
            console.warn('⚠️ [Tracking] fbq (Meta Pixel) não disponível no momento do disparo.');
        }
    } catch (err) {
        console.error('[Tracking] Erro ao disparar conversão de fotógrafo:', err);
    }
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
