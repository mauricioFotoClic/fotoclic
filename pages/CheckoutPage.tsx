import React, { useState, useEffect } from 'react';
import { Photo, User, Page, Coupon, BulkDiscountRule } from '../types';
import api from '../services/api';
import Spinner from '../components/Spinner';
import { useLanguage } from '../contexts/LanguageContext';
import { QrCode, CreditCard, Copy, Check, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';

interface CheckoutPageProps {
    cartItemIds: string[];
    currentUser: User | null;
    onPurchaseComplete: () => void;
    onNavigate: (page: Page) => void;
}

interface CartGrouping {
    photographerId: string;
    photos: Photo[];
    bulkRules: BulkDiscountRule[];
    appliedBulkRule: BulkDiscountRule | null;
    eligiblePhotoIds?: string[];
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ cartItemIds, currentUser, onPurchaseComplete, onNavigate }) => {
    const { t, formatCurrency } = useLanguage();
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);

    const [groupedCart, setGroupedCart] = useState<CartGrouping[]>([]);
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
    const [paymentError, setPaymentError] = useState<string | null>(null);

    // PIX State
    const [pixData, setPixData] = useState<{ pix_code?: string; qr_code_image?: string; orderId?: string | number } | null>(null);
    const [copiedPix, setCopiedPix] = useState(false);

    // Credit Card State
    const [cardNumber, setCardNumber] = useState('');
    const [cardHolder, setCardHolder] = useState(currentUser?.name || '');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [installments, setInstallments] = useState(1);
    const [cpf, setCpf] = useState('');

    // Load Cart Items
    useEffect(() => {
        if (!currentUser) {
            onNavigate({ name: 'login' });
            return;
        }

        const loadItems = async () => {
            try {
                const promises = cartItemIds.map(id => api.getPhotoById(id));
                const results = await Promise.all(promises);
                const validPhotos = results.filter((p): p is Photo => !!p);

                if (validPhotos.length > 0) {
                    const groups: Record<string, Photo[]> = {};
                    validPhotos.forEach(p => {
                        if (!groups[p.photographer_id]) groups[p.photographer_id] = [];
                        groups[p.photographer_id].push(p);
                    });

                    const groupedData: CartGrouping[] = [];
                    for (const [photographerId, pList] of Object.entries(groups)) {
                        const photographer = await api.getPhotographerById(photographerId);
                        const rules = photographer?.bulkDiscountRules || [];

                        const photoEligibilities = await Promise.all(
                            pList.map(async (p) => {
                                if (!p.event_id) return { photo: p, eligible: true };
                                const event = await api.getEventById(p.event_id);
                                const isEligible = event ? (event.allow_discounts !== false) : true;
                                return { photo: p, eligible: isEligible };
                            })
                        );

                        const eligiblePhotos = photoEligibilities.filter(pe => pe.eligible).map(pe => pe.photo);
                        const eligiblePhotoIds = eligiblePhotos.map(p => p.id);

                        const qty = eligiblePhotos.length;
                        let appliedRule = null;

                        if (qty >= 2 && qty <= 4) {
                            appliedRule = rules.find(r => r.minQuantity === 2) || null;
                        } else if (qty >= 5 && qty <= 9) {
                            appliedRule = rules.find(r => r.minQuantity === 5) || null;
                        } else if (qty >= 10) {
                            appliedRule = rules.find(r => r.minQuantity === 10) || null;
                        }

                        groupedData.push({
                            photographerId,
                            photos: pList,
                            bulkRules: rules,
                            appliedBulkRule: appliedRule,
                            eligiblePhotoIds
                        });
                    }
                    setGroupedCart(groupedData);
                }

                setPhotos(validPhotos);

                const savedCoupon = localStorage.getItem('appliedCoupon');
                if (savedCoupon) {
                    try {
                        const coupon = JSON.parse(savedCoupon);
                        const validatedCoupon = await api.validateCoupon(coupon.code);
                        if (validatedCoupon) {
                            setAppliedCoupon(validatedCoupon);
                        } else {
                            localStorage.removeItem('appliedCoupon');
                        }
                    } catch (e) {
                        localStorage.removeItem('appliedCoupon');
                    }
                }
            } catch (error) {
                console.error("Failed to load checkout items", error);
            } finally {
                setLoading(false);
            }
        };
        loadItems();
    }, [cartItemIds, currentUser, onNavigate]);

    // Calculate Totals
    const subtotal = photos.reduce((acc, p) => acc + p.price, 0);

    const couponDiscount = appliedCoupon
        ? photos.reduce((acc, photo) => {
            if (photo.photographer_id === appliedCoupon.photographer_id) {
                return acc + (photo.price * (appliedCoupon.discount_percent / 100));
            }
            return acc;
        }, 0)
        : 0;

    let bulkDiscountTotal = 0;
    groupedCart.forEach(group => {
        if (group.appliedBulkRule) {
            const eligiblePhotos = group.photos.filter(p => !group.eligiblePhotoIds || group.eligiblePhotoIds.includes(p.id));
            const groupSubtotal = eligiblePhotos.reduce((sum, p) => sum + p.price, 0);
            const discount = groupSubtotal * (group.appliedBulkRule.discountPercent / 100);
            bulkDiscountTotal += discount;
        }
    });

    const totalDiscount = couponDiscount + bulkDiscountTotal;
    const total = Math.max(0, subtotal - totalDiscount);

    // Formatter helpers
    const formatCardNumber = (val: string) => {
        return val.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim().slice(0, 19);
    };

    const formatExpiry = (val: string) => {
        const clean = val.replace(/\D/g, '');
        if (clean.length >= 2) {
            return `${clean.slice(0, 2)}/${clean.slice(2, 4)}`;
        }
        return clean.slice(0, 4);
    };

    const formatCPF = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .slice(0, 14);
    };

    const handleCopyPix = () => {
        if (pixData?.pix_code) {
            navigator.clipboard.writeText(pixData.pix_code);
            setCopiedPix(true);
            setTimeout(() => setCopiedPix(false), 3000);
        }
    };

    // Checkout Submit
    const handleCheckoutSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            alert("Você precisa estar logado para finalizar a compra.");
            return;
        }

        if (!termsAccepted) {
            setPaymentError("Você precisa aceitar os termos de compra digital para continuar.");
            return;
        }

        try {
            setIsProcessing(true);
            setPaymentError(null);

            const checkoutPayload: any = {
                photoIds: photos.map(p => p.id),
                couponCode: appliedCoupon?.code,
                paymentMethod: paymentMethod,
                customer: {
                    name: currentUser.name || cardHolder,
                    email: currentUser.email,
                    cpf: cpf.replace(/\D/g, ''),
                    phone: currentUser.phone
                }
            };

            if (paymentMethod === 'credit_card') {
                if (!cardNumber || !cardExpiry || !cardCvv) {
                    throw new Error("Por favor, preencha todos os dados do cartão de crédito.");
                }
                // Tokenização simulada para ambiente Sandbox
                checkoutPayload.cardData = {
                    card_token: `token_card_${cardNumber.replace(/\D/g, '').slice(-4)}`,
                    installments: Number(installments) || 1,
                    cvv: cardCvv
                };
            }

            const result = await api.createAppmaxCheckout(checkoutPayload);

            if (paymentMethod === 'pix') {
                setPixData({
                    pix_code: result.pix_code,
                    qr_code_image: result.qr_code_image,
                    orderId: result.orderId
                });
            } else {
                // Cartão aprovado
                localStorage.removeItem('appliedCoupon');
                onPurchaseComplete();
                onNavigate({ name: 'checkout-success' });
            }

        } catch (error: any) {
            console.error("Erro no checkout Appmax:", error);
            setPaymentError(error.message || "Falha ao processar pagamento com a Appmax.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-neutral-50 min-h-screen py-12">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
                <button
                    onClick={() => onNavigate({ name: 'cart' })}
                    className="flex items-center text-sm font-semibold text-neutral-500 hover:text-neutral-900 mb-8 transition-colors group"
                >
                    <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                    Voltar para o Carrinho
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {loading ? (
                        <Spinner size="lg" fullHeight={true} label="Preparando seu checkout seguro..." />
                    ) : (
                        <>
                            {/* Left Column: Transparent Checkout */}
                            <div>
                                <h1 className="text-3xl font-display font-extrabold text-neutral-900 mb-2">Finalizar Pedido</h1>
                                <p className="text-sm text-neutral-500 mb-6">Pagamento transparente e liberação instantânea de downloads.</p>

                                <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 p-6 sm:p-8 mb-6 relative overflow-hidden">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-100">
                                        <h2 className="text-base font-bold text-neutral-800 flex items-center gap-2">
                                            <ShieldCheck className="text-emerald-500" size={20} />
                                            Checkout Transparente Seguro
                                        </h2>
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                            Pagamento Protegido
                                        </span>
                                    </div>

                                    {/* Payment Method Selector */}
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <button
                                            type="button"
                                            onClick={() => { setPaymentMethod('pix'); setPixData(null); }}
                                            className={`flex items-center justify-center gap-2 p-3.5 rounded-2xl border text-sm font-bold transition-all ${paymentMethod === 'pix'
                                                ? 'border-primary bg-primary/5 text-primary shadow-sm ring-2 ring-primary/20'
                                                : 'border-neutral-200 hover:border-neutral-300 text-neutral-600 bg-white'
                                                }`}
                                        >
                                            <QrCode size={18} />
                                            PIX Instantâneo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setPaymentMethod('credit_card'); setPixData(null); }}
                                            className={`flex items-center justify-center gap-2 p-3.5 rounded-2xl border text-sm font-bold transition-all ${paymentMethod === 'credit_card'
                                                ? 'border-primary bg-primary/5 text-primary shadow-sm ring-2 ring-primary/20'
                                                : 'border-neutral-200 hover:border-neutral-300 text-neutral-600 bg-white'
                                                }`}
                                        >
                                            <CreditCard size={18} />
                                            Cartão (até 21x)
                                        </button>
                                    </div>

                                    {paymentError && (
                                        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs mb-6 flex items-start gap-2.5">
                                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                            <p>{paymentError}</p>
                                        </div>
                                    )}

                                    {/* PIX Display Mode */}
                                    {pixData ? (
                                        <div className="space-y-6 text-center animate-in fade-in duration-300">
                                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl inline-block mb-2">
                                                <QrCode size={36} className="text-emerald-500 mx-auto" />
                                            </div>
                                            <h3 className="text-xl font-bold text-neutral-900 font-display">Pague com o PIX QR Code</h3>
                                            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                                                Abra o app do seu banco, escolha <strong>Pagar com PIX</strong> e escaneie o código abaixo ou copie a chave.
                                            </p>

                                            {pixData.qr_code_image ? (
                                                <div className="p-4 bg-white rounded-2xl border border-neutral-200 inline-block shadow-sm">
                                                    <img src={pixData.qr_code_image} alt="QR Code PIX" className="w-48 h-48 mx-auto" />
                                                </div>
                                            ) : (
                                                <div className="p-6 bg-neutral-100 rounded-2xl text-neutral-400 text-xs font-mono">
                                                    QR Code gerado na Appmax
                                                </div>
                                            )}

                                            {/* Copia e Cola */}
                                            <div className="space-y-2">
                                                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
                                                    Código PIX Copia e Cola
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={pixData.pix_code || ''}
                                                        className="w-full text-xs font-mono bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 truncate"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleCopyPix}
                                                        className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all ${copiedPix ? 'bg-emerald-600' : 'bg-primary hover:bg-primary-dark'
                                                            }`}
                                                    >
                                                        {copiedPix ? <Check size={14} /> : <Copy size={14} />}
                                                        {copiedPix ? 'Copiado!' : 'Copiar'}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                                                <span className="flex items-center gap-1">
                                                    <Spinner size="sm" /> Aguardando confirmação...
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        localStorage.removeItem('appliedCoupon');
                                                        onPurchaseComplete();
                                                        onNavigate({ name: 'checkout-success' });
                                                    }}
                                                    className="text-primary font-bold hover:underline"
                                                >
                                                    Já realizei o pagamento
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Checkout Form */
                                        <form onSubmit={handleCheckoutSubmit} className="space-y-5">
                                            {/* CPF Field */}
                                            <div>
                                                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                                                    CPF do Titular
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={cpf}
                                                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                                                    placeholder="000.000.000-00"
                                                    className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                                                />
                                            </div>

                                            {paymentMethod === 'credit_card' && (
                                                <div className="space-y-4 pt-2 border-t border-neutral-100 animate-in fade-in duration-200">
                                                    <div>
                                                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                                                            Número do Cartão
                                                        </label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={cardNumber}
                                                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                                            placeholder="0000 0000 0000 0000"
                                                            className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                                                            Nome Impresso no Cartão
                                                        </label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={cardHolder}
                                                            onChange={(e) => setCardHolder(e.target.value)}
                                                            placeholder="NOME COMO NO CARTAO"
                                                            className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 uppercase focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                                                                Validade
                                                            </label>
                                                            <input
                                                                type="text"
                                                                required
                                                                value={cardExpiry}
                                                                onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                                                                placeholder="MM/AA"
                                                                className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                                                                CVV
                                                            </label>
                                                            <input
                                                                type="password"
                                                                maxLength={4}
                                                                required
                                                                value={cardCvv}
                                                                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                                                                placeholder="123"
                                                                className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Parcelamento até 21x */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                                                            Parcelamento
                                                        </label>
                                                        <select
                                                            value={installments}
                                                            onChange={(e) => setInstallments(Number(e.target.value))}
                                                            className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                                                        >
                                                            {Array.from({ length: 21 }, (_, i) => i + 1).map(num => {
                                                                const installmentVal = total / num;
                                                                return (
                                                                    <option key={num} value={num}>
                                                                        {num}x de R$ {installmentVal.toFixed(2).replace('.', ',')} {num === 1 ? '(à vista)' : ''}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Terms Checkbox */}
                                            <label className="flex items-start gap-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 cursor-pointer group hover:bg-neutral-100 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    required
                                                    checked={termsAccepted}
                                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                                    className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary/20 mt-0.5 cursor-pointer"
                                                />
                                                <span className="text-xs leading-relaxed text-neutral-600 select-none">
                                                    Li e concordo com os <button type="button" onClick={() => onNavigate({ name: 'terms' })} className="text-primary font-semibold hover:underline">termos de compra digital</button>. Compreendo que o download é liberado imediatamente após a confirmação.
                                                </span>
                                            </label>

                                            <button
                                                type="submit"
                                                disabled={isProcessing}
                                                className="w-full py-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-bold shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 text-base"
                                            >
                                                {isProcessing ? (
                                                    <><Spinner size="sm" /> Gerando Pagamento na Appmax...</>
                                                ) : paymentMethod === 'pix' ? (
                                                    <>Gerar QR Code PIX (R$ {total.toFixed(2).replace('.', ',')})</>
                                                ) : (
                                                    <>Pagar com Cartão de Crédito</>
                                                )}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Order Summary */}
                            <div>
                                <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 p-6 sm:p-8 sticky top-24">
                                    <h2 className="text-lg font-bold text-neutral-900 mb-6 border-b border-neutral-100 pb-4">
                                        Resumo do Pedido ({photos.length} {photos.length === 1 ? 'foto' : 'fotos'})
                                    </h2>

                                    <div className="space-y-4 mb-6 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                                        {photos.map(photo => (
                                            <div key={photo.id} className="flex items-center group justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-14 h-12 rounded-xl bg-neutral-100 overflow-hidden shrink-0 border border-neutral-100">
                                                        <img src={photo.preview_url} alt={photo.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-neutral-800 truncate max-w-[180px] sm:max-w-[220px]" title={photo.title}>
                                                            {photo.title}
                                                        </p>
                                                        <p className="text-xs text-neutral-400">Download Alta Resolução</p>
                                                    </div>
                                                </div>
                                                <div className="text-sm font-bold text-neutral-900">
                                                    R$ {photo.price.toFixed(2).replace('.', ',')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t border-dashed border-neutral-200 pt-4 space-y-2.5 text-sm">
                                        <div className="flex justify-between text-neutral-600">
                                            <span>Subtotal</span>
                                            <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                                        </div>
                                        {bulkDiscountTotal > 0 && (
                                            <div className="flex justify-between text-primary font-semibold">
                                                <span>Desconto por Volume</span>
                                                <span>- R$ {bulkDiscountTotal.toFixed(2).replace('.', ',')}</span>
                                            </div>
                                        )}
                                        {couponDiscount > 0 && (
                                            <div className="flex justify-between text-emerald-600 font-semibold">
                                                <span>Cupom ({appliedCoupon?.code})</span>
                                                <span>- R$ {couponDiscount.toFixed(2).replace('.', ',')}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-neutral-400 text-xs">
                                            <span>Taxas de Processamento (Appmax)</span>
                                            <span>Inclusas</span>
                                        </div>
                                    </div>

                                    <div className="border-t border-neutral-900 pt-4 mt-4 flex justify-between items-baseline">
                                        <span className="font-bold text-lg text-neutral-900">Total a Pagar</span>
                                        <span className="font-display font-extrabold text-3xl text-primary">
                                            R$ {total.toFixed(2).replace('.', ',')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
