import React, { useState, useEffect } from 'react';
import { Photo, User, Page, Coupon, BulkDiscountRule } from '../types';
import api from '../services/api';
import Spinner from '../components/Spinner';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { CheckoutForm } from '../components/CheckoutForm';
import { stripePromise } from '../lib/stripe';

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
    const [clientSecret, setClientSecret] = useState('');
    const [groupedCart, setGroupedCart] = useState<CartGrouping[]>([]);
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

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
                setPhotos(validPhotos);

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

                        const sortedRules = [...rules].sort((a, b) => b.minQuantity - a.minQuantity);
                        const appliedRule = sortedRules.find(r => photos.length >= r.minQuantity) || null;

                        groupedData.push({
                            photographerId,
                            photos,
                            bulkRules: rules,
                            appliedBulkRule: appliedRule
                        });
                    }
                    setGroupedCart(groupedData);
                }

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

    // Create Payment Intent when Total is ready
    useEffect(() => {
        if (total > 0 && currentUser && !clientSecret) {
            setPaymentError(null); // Reset error on retry
            fetch("/api/create-payment-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: cartItemIds, amount: total * 100 }), // Amount in cents
            })
                .then(async (res) => {
                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || res.statusText || "Erro ao conectar com servidor de pagamento");
                    }
                    return res.json();
                })
                .then((data) => {
                    console.log("Payment Intent Created:", data);
                    setClientSecret(data.clientSecret);
                })
                .catch((error) => {
                    console.error("Error creating payment intent:", error);
                    setPaymentError(error.message || "Erro desconhecido ao iniciar pagamento.");
                });
        }
    }, [total, currentUser, cartItemIds, clientSecret]);

    const handleSuccess = async () => {
        try {
            // Process all purchases in parallel via our API (Supabase)
            const promises = photos.map(p => api.purchasePhoto(p.id, currentUser?.id));
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
            alert(`Pagamento processado no Stripe, mas houve erro ao salvar no banco: ${errorMessage}. Entre em contato com o suporte.`);
        }
    };

    if (loading) return <div className="py-20"><Spinner /></div>;

    const appearance = {
        theme: 'stripe',
        variables: {
            colorPrimary: '#2563eb',
            borderRadius: '12px',
        },
    };

    // Pass options to Elements
    const options = {
        clientSecret,
        appearance,
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
                    {/* Left Column: Stripe Payment Form */}
                    <div>
                        <h1 className="text-3xl font-display font-bold text-neutral-900 mb-6">Pagamento</h1>

                        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 mb-6 relative overflow-hidden min-h-[400px]">
                            {/* Card Header */}
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                        <line x1="1" y1="10" x2="23" y2="10"></line>
                                    </svg>
                                    Pagamento Seguro
                                </h2>
                                <div className="flex space-x-2 opacity-50 grayscale hover:grayscale-0 transition-all">
                                    <div className="bg-neutral-100 px-2 py-1 rounded text-[10px] font-bold text-neutral-600 tracking-wider border border-neutral-200">STRIPE</div>
                                </div>
                            </div>

                            {paymentError ? (
                                <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                                    <div className="text-red-500 mb-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-neutral-800 font-bold mb-2">Erro ao iniciar pagamento</p>
                                    <p className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-100">{paymentError}</p>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="mt-4 px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm hover:bg-neutral-800"
                                    >
                                        Tentar Novamente
                                    </button>
                                </div>
                            ) : clientSecret ? (
                                <Elements options={options as any} stripe={stripePromise}>
                                    <CheckoutForm
                                        onSuccess={handleSuccess}
                                        amount={total}
                                        onClose={() => { }} // Not needed here as it's not a modal
                                    />
                                </Elements>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
                                    <Spinner />
                                    <p className="mt-4 text-sm">Iniciando sessão segura com Stripe...</p>
                                </div>
                            )}
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
                                    <div className="flex justify-between text-sm text-blue-600 font-medium">
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

                            <div className="mt-6 bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    Ao confirmar o pagamento, você concorda com nossos Termos de Uso e recebe uma licença imediata para uso das imagens.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;

// End of file
