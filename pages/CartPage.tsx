
import React, { useEffect, useState } from 'react';
import { Photo, Page, Coupon, BulkDiscountRule } from '../types';
import api from '../services/api';
import Spinner from '../components/Spinner';

interface CartPageProps {
    cartItemIds: string[];
    onRemoveItem: (id: string) => void;
    onCheckout: () => void;
    onNavigate: (page: Page) => void;
}

const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const TicketIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2-2H5a2 2 0 0 1-2-2V5z"></path><path d="M3 12h18"></path><path d="M12 3v18"></path></svg>;

interface CartGrouping {
    photographerId: string;
    photos: Photo[];
    bulkRules: BulkDiscountRule[];
    appliedBulkRule: BulkDiscountRule | null;
}

const CartPage: React.FC<CartPageProps> = ({ cartItemIds, onRemoveItem, onCheckout, onNavigate }) => {
    const [cartPhotos, setCartPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [groupedCart, setGroupedCart] = useState<CartGrouping[]>([]);

    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const loadCartItems = async () => {
            if (cartItemIds.length === 0) {
                setCartPhotos([]);
                setGroupedCart([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Use Promise.allSettled to ensure that even if one photo fails to load, the rest of the cart still renders.
                const promises = cartItemIds.map(id => api.getPhotoById(id));
                const results = await Promise.allSettled(promises);

                const validPhotos = results
                    .filter((result): result is PromiseFulfilledResult<Photo> => result.status === 'fulfilled' && !!result.value)
                    .map(result => result.value);

                setCartPhotos(validPhotos);

                if (validPhotos.length === 0) {
                    setGroupedCart([]);
                    setLoading(false);
                    return;
                }

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

            } catch (error) {
                console.error("Failed to load cart items", error);
            } finally {
                setLoading(false);
            }
        };

        loadCartItems();
    }, [cartItemIds]);

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponMessage(null);

        const coupon = await api.validateCoupon(couponCode.toUpperCase());
        if (coupon) {
            setAppliedCoupon(coupon);
            localStorage.setItem('appliedCoupon', JSON.stringify(coupon));
            setCouponMessage({ type: 'success', text: `Cupom ${coupon.code} aplicado: ${coupon.discount_percent}% de desconto.` });
        } else {
            setAppliedCoupon(null);
            setCouponMessage({ type: 'error', text: 'Cupom inválido ou expirado.' });
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponMessage(null);
        localStorage.removeItem('appliedCoupon');
    };

    const subtotal = cartPhotos.reduce((acc, photo) => acc + photo.price, 0);

    const couponDiscount = appliedCoupon
        ? cartPhotos.reduce((acc, photo) => {
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

    if (loading) return <div className="py-20"><Spinner /></div>;

    return (
        <div className="bg-white min-h-screen">
            <div className="py-12 bg-neutral-100">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-display font-bold text-primary-dark">
                        Seu Carrinho
                    </h1>
                    <p className="mt-2 text-lg text-neutral-600">
                        {cartPhotos.length === 0 ? "Seu carrinho está vazio." : `Você tem ${cartPhotos.length} item(ns) no carrinho.`}
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {cartPhotos.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="inline-block p-6 rounded-full bg-neutral-50 shadow-sm mb-6 border border-neutral-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <circle cx="9" cy="21" r="1"></circle>
                                <circle cx="20" cy="21" r="1"></circle>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-display font-bold text-neutral-800 mb-4">Seu carrinho está vazio</h2>
                        <p className="text-neutral-500 mb-6">Parece que você ainda não adicionou nenhuma foto.</p>
                        <button
                            onClick={() => onNavigate({ name: 'home' })}
                            className="px-8 py-3 bg-primary text-white rounded-full font-medium hover:bg-opacity-90 transition-all shadow-md hover:shadow-lg"
                        >
                            Começar a Explorar
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-12">
                        <div className="flex-grow space-y-6">
                            {cartPhotos.map(photo => {
                                const group = groupedCart.find(g => g.photographerId === photo.photographer_id);
                                const hasBulk = !!group?.appliedBulkRule;
                                const hasCoupon = appliedCoupon && appliedCoupon.photographer_id === photo.photographer_id;

                                return (
                                    <div key={photo.id} className="flex flex-col sm:flex-row items-center bg-white border border-neutral-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="w-full sm:w-32 h-24 flex-shrink-0 bg-neutral-100 rounded-lg overflow-hidden mb-4 sm:mb-0">
                                            <img src={photo.preview_url} alt={photo.title} className="w-full h-full object-cover" />
                                        </div>

                                        <div className="flex-grow sm:ml-6 text-center sm:text-left">
                                            <h3 className="font-display font-bold text-lg text-neutral-800">{photo.title}</h3>
                                            <p className="text-sm text-neutral-500">{photo.resolution} • Royalty-Free</p>

                                            {hasBulk && (
                                                <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full mt-1 inline-block mr-1">
                                                    Volume: {group?.appliedBulkRule?.discountPercent}% OFF
                                                </span>
                                            )}
                                            {hasCoupon && (
                                                <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                                                    Cupom: {appliedCoupon.code}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between w-full sm:w-auto mt-4 sm:mt-0 sm:gap-8">
                                            <span className="font-bold text-lg text-primary">
                                                R$ {photo.price.toFixed(2).replace('.', ',')}
                                            </span>
                                            <button
                                                onClick={() => onRemoveItem(photo.id)}
                                                className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                title="Remover item"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="lg:w-96 flex-shrink-0">
                            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-md sticky top-24">
                                <h2 className="text-xl font-display font-bold text-neutral-900 mb-6 border-b border-neutral-100 pb-4">Resumo do Pedido</h2>

                                <div className="space-y-3 mb-6 pb-6 border-b border-neutral-100">
                                    <div className="flex justify-between text-neutral-600">
                                        <span>Subtotal ({cartPhotos.length} itens)</span>
                                        <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                    {bulkDiscountTotal > 0 && (
                                        <div className="flex justify-between text-blue-600 font-medium">
                                            <span>Desconto por Volume</span>
                                            <span>- R$ {bulkDiscountTotal.toFixed(2).replace('.', ',')}</span>
                                        </div>
                                    )}
                                    {couponDiscount > 0 && (
                                        <div className="flex justify-between text-green-600 font-medium">
                                            <span>Desconto Cupom</span>
                                            <span>- R$ {couponDiscount.toFixed(2).replace('.', ',')}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mb-6 pb-6 border-b border-neutral-100">
                                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                                        Cupom de Desconto
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-grow">
                                            <input
                                                type="text"
                                                placeholder="Código"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value)}
                                                disabled={!!appliedCoupon}
                                                className="w-full pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 uppercase"
                                            />
                                            <span className="absolute left-2.5 top-2.5 text-neutral-400">
                                                <TicketIcon />
                                            </span>
                                        </div>
                                        {appliedCoupon ? (
                                            <button
                                                onClick={handleRemoveCoupon}
                                                className="px-3 py-2 bg-red-100 text-red-600 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors"
                                            >
                                                X
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleApplyCoupon}
                                                className="px-4 py-2 bg-neutral-800 text-white text-sm font-medium rounded-lg hover:bg-neutral-700 transition-colors"
                                            >
                                                Aplicar
                                            </button>
                                        )}
                                    </div>
                                    {couponMessage && (
                                        <p className={`text-xs mt-2 ${couponMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                                            {couponMessage.text}
                                        </p>
                                    )}
                                </div>

                                <div className="flex justify-between items-end mb-8">
                                    <span className="font-bold text-neutral-900 text-lg">Total</span>
                                    <span className="font-display font-bold text-3xl text-primary">
                                        R$ {total.toFixed(2).replace('.', ',')}
                                    </span>
                                </div>

                                <button
                                    onClick={onCheckout}
                                    className="w-full py-4 bg-primary text-white font-bold rounded-full shadow-lg hover:bg-opacity-90 transition-all transform hover:-translate-y-0.5 mb-4"
                                >
                                    Ir para Pagamento
                                </button>

                                <button
                                    onClick={() => onNavigate({ name: 'home' })}
                                    className="w-full py-3 text-sm font-medium text-neutral-500 hover:text-primary transition-colors"
                                >
                                    Continuar Comprando
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CartPage;