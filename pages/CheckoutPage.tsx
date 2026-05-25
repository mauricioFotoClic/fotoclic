import React, { useState, useEffect } from 'react';
import { Photo, User, Page, Coupon, BulkDiscountRule } from '../types';
import api from '../services/api';
import Spinner from '../components/Spinner';


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
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ cartItemIds, currentUser, onPurchaseComplete, onNavigate }) => {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);

    const [groupedCart, setGroupedCart] = useState<CartGrouping[]>([]);
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [customerTaxId, setCustomerTaxId] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);

    const formatCPF = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    };

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
                // setPhotos moved to after grouping logic to prevent race condition in price calculation

                // Group photos by photographer and calculate bulk discounts
                if (validPhotos.length > 0) {
                    const groups: Record<string, Photo[]> = {};
                    validPhotos.forEach(p => {
                        if (!groups[p.photographer_id]) groups[p.photographer_id] = [];
                        groups[p.photographer_id].push(p);
                    });

                    const groupedData: CartGrouping[] = [];
                    for (const [photographerId, photos] of Object.entries(groups)) {
                        const photographer = await api.getPhotographerById(photographerId);
                        const rules = photographer?.bulkDiscountRules || [];

                        const qty = photos.length;
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
                            photos,
                            bulkRules: rules,
                            appliedBulkRule: appliedRule
                        });
                    }
                    setGroupedCart(groupedData);
                }

                // Set photos AFTER calculating groups/discounts to ensure atomic render of Total
                setPhotos(validPhotos);

                // Try to retrieve applied coupon from localStorage (if user came from cart)
                const savedCoupon = localStorage.getItem('appliedCoupon');
                if (savedCoupon) {
                    try {
                        const coupon = JSON.parse(savedCoupon);
                        // Validate it's still valid
                        const validatedCoupon = await api.validateCoupon(coupon.code);
                        if (validatedCoupon) {
                            setAppliedCoupon(validatedCoupon);
                        } else {
                            localStorage.removeItem('appliedCoupon');
                        }
                    } catch (e) {
                        console.error("Failed to parse saved coupon", e);
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
            const groupSubtotal = group.photos.reduce((sum, p) => sum + p.price, 0);
            const discount = groupSubtotal * (group.appliedBulkRule.discountPercent / 100);
            bulkDiscountTotal += discount;
        }
    });

    const totalDiscount = couponDiscount + bulkDiscountTotal;
    const total = Math.max(0, subtotal - totalDiscount);

    const [paymentError, setPaymentError] = useState<string | null>(null);



    const handleSuccess = async () => {
        try {
            // Process all purchases in parallel via our API (Supabase)
            // Calculate discount ratio correctly handling floating point precision
            const discountRatio = subtotal > 0 ? (total / subtotal) : 1;

            const promises = photos.map(p => {
                // Effective price = Original Price * Ratio (e.g. 0.75 for 25% off)
                const effectivePrice = p.price * discountRatio;
                return api.purchasePhoto(p.id, currentUser?.id, effectivePrice);
            });
            const results = await Promise.all(promises);

            // Validate if all purchases were successful
            const failures = results.filter(r => !r.success);
            if (failures.length > 0) {
                throw new Error(failures[0].error || "Falha ao registrar a compra no banco de dados.");
            }

            // Send Confirmation Email
            if (currentUser && currentUser.email) {
                import('../services/emailService').then(({ emailService }) => {
                    emailService.sendPurchaseConfirmation(
                        currentUser.email,
                        currentUser.name || 'Cliente',
                        total,
                        photos.length
                    ).catch(err => console.error("Failed to send confirmation email:", err));
                });
            }

            localStorage.removeItem('appliedCoupon');
            onPurchaseComplete();

        } catch (error) {
            console.error("Purchase recording failed", error);
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
            alert(`Houve um erro ao salvar a compra no banco: ${errorMessage}. Por favor, entre em contato com o suporte.`);
        }
    };

    return (
        <div className="bg-neutral-50 min-h-screen py-12">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
                <button
                    onClick={() => onNavigate({ name: 'cart' })}
                    className="flex items-center text-sm text-neutral-500 hover:text-neutral-900 mb-8 transition-colors group"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 group-hover:-translate-x-1 transition-transform"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Voltar para o Carrinho
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {loading ? (
                        <div className="col-span-1 lg:col-span-2 flex justify-center py-20"><Spinner /></div>
                    ) : (
                        <>
                            {/* Left Column: Stripe Payment Form */}
                            <div>
                                <h1 className="text-3xl font-display font-bold text-neutral-900 mb-6">Pagamento</h1>

                        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 mb-6 relative overflow-hidden min-h-[400px]">
                            {/* Card Header */}
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
                                    <span className="p-1.5 bg-neutral-100 text-neutral-600 rounded-lg">🔒</span>
                                    Pagamento Seguro
                                </h2>
                                <div className="flex space-x-2">
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Dados do Cliente (Automático) */}
                                <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Nome</label>
                                        <p className="text-sm font-semibold text-neutral-800 truncate">{currentUser?.name}</p>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">E-mail</label>
                                        <p className="text-sm font-semibold text-neutral-800 truncate">{currentUser?.email}</p>
                                    </div>
                                </div>

                                {paymentError && (
                                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs mb-4">
                                        {paymentError}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <label className="flex items-start gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-100 cursor-pointer group hover:bg-neutral-100 transition-colors">
                                        <div className="flex items-center h-5">
                                            <input
                                                id="terms-checkbox"
                                                type="checkbox"
                                                checked={termsAccepted}
                                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                                className="w-4 h-4 text-primary border-neutral-300 rounded focus:ring-primary/20 cursor-pointer"
                                            />
                                        </div>
                                        <div className="text-xs leading-relaxed text-neutral-600 select-none">
                                            Li e concordo com os <button onClick={(e) => { e.preventDefault(); onNavigate({ name: 'terms' }); }} className="text-primary font-semibold hover:underline">termos de compra de produto digital</button>. 
                                            Compreendo que a liberação é imediata e não haverá reembolso após o download da imagem.
                                        </div>
                                    </label>
                                </div>

                                <button
                                    onClick={async () => {
                                        if (!currentUser) {
                                            alert("Você precisa estar logado para finalizar a compra.");
                                            return;
                                        }

                                        /* CPF não é mais obrigatório na nossa página, o Abacate Pay pedirá se necessário */

                                        if (!termsAccepted) {
                                            setPaymentError("Você precisa aceitar os termos de compra digital para continuar.");
                                            return;
                                        }

                                        try {
                                            setIsProcessing(true);
                                            setPaymentError(null);

                                            // Preparamos os itens para a Abacate Pay calculando os descontos proporcionais
                                            const items = photos.map(p => {
                                                let discountedPrice = p.price;

                                                // 1. Aplica desconto de cupom (se o fotógrafo for o mesmo do cupom)
                                                if (appliedCoupon && p.photographer_id === appliedCoupon.photographer_id) {
                                                    discountedPrice -= (p.price * (appliedCoupon.discount_percent / 100));
                                                }

                                                // 2. Aplica desconto por volume do fotógrafo
                                                const group = groupedCart.find(g => g.photographerId === p.photographer_id);
                                                if (group && group.appliedBulkRule) {
                                                    discountedPrice -= (p.price * (group.appliedBulkRule.discountPercent / 100));
                                                }

                                                return {
                                                    id: p.id,
                                                    title: p.title,
                                                    price: Math.max(0, discountedPrice) * 100, // Abacate Pay usa centavos
                                                    quantity: 1
                                                };
                                            });

                                            const checkout = await api.createAbacateCheckout(items, {
                                                name: currentUser.name,
                                                email: currentUser.email,
                                                taxId: customerTaxId.replace(/\D/g, ''), // Pode ser vazio agora
                                                phone: currentUser.phone
                                            }, {
                                                cartIds: cartItemIds,
                                                couponCode: appliedCoupon?.code,
                                                userId: currentUser.id,
                                                termsAccepted: termsAccepted
                                            });

                                            if (checkout.url) {
                                                window.location.href = checkout.url;
                                            } else {
                                                throw new Error("URL de pagamento não gerada.");
                                            }
                                        } catch (error: any) {
                                            console.error("Abacate Pay Error:", error);
                                            // Se o erro vier do nosso backend, ele pode ter uma mensagem específica
                                            const msg = error.message || "Falha ao iniciar pagamento.";
                                            setPaymentError(msg);
                                        } finally {
                                            setIsProcessing(false);
                                        }
                                    }}
                                    disabled={isProcessing}
                                    className="w-full py-4 bg-neutral-900 text-white rounded-xl font-bold shadow-lg hover:bg-neutral-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? (
                                        <><Spinner size="sm" /> Processando...</>
                                    ) : (
                                        <>Finalizar Pedido com PIX/Cartão</>
                                    )}
                                </button>
                                
                                <p className="text-[10px] text-neutral-400 text-center">
                                    Ao clicar em finalizar, você será redirecionado para o ambiente de pagamento seguro.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Order Summary */}
                    <div>
                        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 sticky top-24">
                            <h2 className="text-lg font-bold text-neutral-900 mb-6 border-b border-neutral-100 pb-4">Resumo do Pedido</h2>

                            <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {photos.map(photo => (
                                    <div key={photo.id} className="flex items-start group">
                                        <div className="w-16 h-12 rounded-md bg-neutral-100 overflow-hidden flex-shrink-0 border border-neutral-100 relative">
                                            <img src={photo.preview_url} alt={photo.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                        <div className="ml-3 flex-grow min-w-0">
                                            <p className="text-sm font-semibold text-neutral-800 truncate" title={photo.title}>{photo.title}</p>
                                            <p className="text-xs text-neutral-500">{photo.resolution} • Digital</p>
                                        </div>
                                        <div className="text-sm font-medium text-neutral-900 whitespace-nowrap ml-2">
                                            R$ {photo.price.toFixed(2).replace('.', ',')}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-dashed border-neutral-200 pt-4 space-y-2">
                                <div className="flex justify-between text-sm text-neutral-600">
                                    <span>Subtotal</span>
                                    <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                                </div>
                                {bulkDiscountTotal > 0 && (
                                    <div className="flex justify-between text-sm text-primary-dark font-medium">
                                        <span>Desconto por Volume</span>
                                        <span>- R$ {bulkDiscountTotal.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                )}
                                {couponDiscount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600 font-medium">
                                        <span>Desconto Cupom ({appliedCoupon?.code})</span>
                                        <span>- R$ {couponDiscount.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm text-neutral-600">
                                    <span>Taxas de Processamento</span>
                                    <span>R$ 0,00</span>
                                </div>
                            </div>

                            <div className="border-t border-neutral-900 pt-4 mt-4 flex justify-between items-center">
                                <span className="font-bold text-lg text-neutral-900">Total a Pagar</span>
                                <span className="font-display font-bold text-3xl text-primary">R$ {total.toFixed(2).replace('.', ',')}</span>
                            </div>

                            <div className="mt-6 bg-primary/10 p-3 rounded-lg border border-primary/20 flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <p className="text-xs text-primary-dark leading-relaxed">
                                    Ao confirmar o pagamento, você concorda com nossos Termos de Uso e recebe uma licença imediata para uso das imagens.
                                </p>
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

// End of file


