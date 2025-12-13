
import React, { useEffect, useState } from 'react';
import { User, AbandonedCart, Coupon } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import Toast from '../Toast';
import Modal from '../Modal';

interface PhotographerAbandonedCartsProps {
    user: User;
    setView: (view: any) => void;
}

const EmailIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>;
const TagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const CartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300 mb-4"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;

const PhotographerAbandonedCarts: React.FC<PhotographerAbandonedCartsProps> = ({ user, setView }) => {
    const [carts, setCarts] = useState<AbandonedCart[]>([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' } | null>(null);

    // Coupon Modal State
    const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
    const [loadingCoupons, setLoadingCoupons] = useState(false);
    const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
    const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null);

    useEffect(() => {
        const fetchCarts = async () => {
            try {
                setLoading(true);
                const data = await api.getAbandonedCartsByPhotographerId(user.id);
                setCarts(data);
            } catch (error) {
                console.error("Failed to fetch abandoned carts", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCarts();
    }, [user.id]);

    const handleSendEmail = (cart: AbandonedCart) => {
        const itemsList = cart.items.map(i => `- ${i.title}`).join('\n');
        const subject = encodeURIComponent("Você esqueceu algo especial no FotoClic!");
        const body = encodeURIComponent(`Olá ${cart.userName},\n\nNotamos que você deixou algumas fotos incríveis no seu carrinho:\n\n${itemsList}\n\nElas ainda estão esperando por você. Clique aqui para finalizar sua compra!\n\nAtenciosamente,\n${user.name}`);
        
        window.open(`mailto:${cart.userEmail}?subject=${subject}&body=${body}`, '_blank');
        setNotification({ message: 'Cliente de e-mail aberto com sucesso!', type: 'info' });
        
        // Mark as contacted
        updateCartStatus(cart.id, 'contacted');
    };

    const updateCartStatus = (cartId: string, status: 'contacted' | 'recovered') => {
        setCarts(prev => prev.map(c => c.id === cartId ? { ...c, status } : c));
    };

    const handleOpenCouponModal = async (cart: AbandonedCart) => {
        setSelectedCart(cart);
        setIsCouponModalOpen(true);
        setLoadingCoupons(true);
        try {
            const data = await api.getCouponsByPhotographerId(user.id);
            // Filter only active coupons
            setAvailableCoupons(data.filter(c => c.is_active));
        } catch (error) {
            console.error("Failed to fetch coupons", error);
            setNotification({ message: 'Erro ao buscar cupons.', type: 'error' as any });
        } finally {
            setLoadingCoupons(false);
        }
    };

    const handleSelectCoupon = (coupon: Coupon) => {
        if (!selectedCart) return;

        const itemsList = selectedCart.items.map(i => `- ${i.title}`).join('\n');
        const subject = encodeURIComponent(`Um presente para você: ${coupon.discount_percent}% OFF!`);
        const body = encodeURIComponent(`Olá ${selectedCart.userName},\n\nVi que você deixou algumas fotos no carrinho:\n\n${itemsList}\n\nQuero te ajudar a finalizar essa compra. Use o cupom abaixo para ganhar ${coupon.discount_percent}% de desconto:\n\nCÓDIGO: ${coupon.code}\n\nEste cupom expira em ${new Date(coupon.expiration_date).toLocaleDateString('pt-BR')}.\n\nEspero que aproveite!\n\nAtenciosamente,\n${user.name}`);

        window.open(`mailto:${selectedCart.userEmail}?subject=${subject}&body=${body}`, '_blank');
        
        setNotification({ message: `Cupom ${coupon.code} enviado para o cliente!`, type: 'success' });
        updateCartStatus(selectedCart.id, 'contacted');
        setIsCouponModalOpen(false);
        setSelectedCart(null);
    };

    const navigateToCreateCoupon = () => {
        setIsCouponModalOpen(false);
        setView('coupons');
    };

    if (loading) return <Spinner />;

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-display font-bold text-primary-dark">Carrinhos Abandonados</h1>
                <p className="text-neutral-600 mt-1">Recupere vendas entrando em contato com clientes que deixaram suas fotos para trás.</p>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {carts.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="flex justify-center">
                            <CartIcon />
                        </div>
                        <h3 className="text-lg font-medium text-neutral-900">Nenhum carrinho abandonado</h3>
                        <p className="text-neutral-500">Ótima notícia! Seus clientes estão finalizando as compras.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                            <thead className="bg-neutral-100">
                                <tr>
                                    <th className="p-4 text-left text-sm font-semibold text-neutral-600">Cliente</th>
                                    <th className="p-4 text-left text-sm font-semibold text-neutral-600">Data</th>
                                    <th className="p-4 text-left text-sm font-semibold text-neutral-600">Itens (Seus)</th>
                                    <th className="p-4 text-right text-sm font-semibold text-neutral-600">Valor Potencial</th>
                                    <th className="p-4 text-center text-sm font-semibold text-neutral-600">Status</th>
                                    <th className="p-4 text-right text-sm font-semibold text-neutral-600">Recuperar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {carts.map((cart, index) => {
                                    const totalValue = cart.items.reduce((acc, item) => acc + item.price, 0);
                                    return (
                                        <tr key={cart.id} className={`border-t ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}>
                                            <td className="p-4">
                                                <div className="font-medium text-neutral-800">{cart.userName}</div>
                                                <div className="text-xs text-neutral-500">{cart.userEmail}</div>
                                            </td>
                                            <td className="p-4 text-sm text-neutral-600">
                                                {new Date(cart.date).toLocaleDateString('pt-BR')} <br/>
                                                <span className="text-xs text-neutral-400">{new Date(cart.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center space-x-2">
                                                    <div className="flex -space-x-2 overflow-hidden">
                                                        {cart.items.slice(0, 3).map((item, i) => (
                                                            <img 
                                                                key={i} 
                                                                src={item.preview_url} 
                                                                alt="item" 
                                                                className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" 
                                                                title={item.title}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="text-xs text-neutral-500">
                                                        {cart.items.length} foto(s)
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-bold text-green-600">
                                                R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                                                    ${cart.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                                      cart.status === 'contacted' ? 'bg-blue-100 text-blue-800' : 
                                                      'bg-green-100 text-green-800'}`}>
                                                    {cart.status === 'pending' ? 'Pendente' : cart.status === 'contacted' ? 'Contactado' : 'Recuperado'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleSendEmail(cart)}
                                                        className="p-2 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                        title="Enviar E-mail Lembrete"
                                                    >
                                                        <EmailIcon />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleOpenCouponModal(cart)}
                                                        className="p-2 text-neutral-500 hover:text-secondary hover:bg-secondary/10 rounded-full transition-colors"
                                                        title="Enviar Cupom de Desconto"
                                                    >
                                                        <TagIcon />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Seleção de Cupom */}
            <Modal
                isOpen={isCouponModalOpen}
                onClose={() => setIsCouponModalOpen(false)}
                title="Selecione um Cupom para Enviar"
                size="md"
            >
                <div>
                    {loadingCoupons ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : availableCoupons.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="inline-block p-4 bg-neutral-100 rounded-full mb-4">
                                <TagIcon />
                            </div>
                            <h3 className="text-lg font-medium text-neutral-900 mb-2">Nenhum cupom ativo encontrado</h3>
                            <p className="text-neutral-500 text-sm mb-6 max-w-xs mx-auto">
                                Você precisa criar um cupom de desconto antes de enviá-lo para seus clientes.
                            </p>
                            <button
                                onClick={navigateToCreateCoupon}
                                className="px-6 py-2 bg-secondary text-white font-medium rounded-full hover:bg-opacity-90 transition-colors"
                            >
                                Criar Novo Cupom
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            <p className="text-sm text-neutral-600">Escolha qual oferta deseja enviar para <strong>{selectedCart?.userName}</strong>:</p>
                            
                            {availableCoupons.map(coupon => (
                                <div 
                                    key={coupon.id}
                                    onClick={() => handleSelectCoupon(coupon)}
                                    className="border border-neutral-200 rounded-xl p-4 hover:border-secondary hover:shadow-md cursor-pointer transition-all group bg-white"
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center">
                                            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold text-sm mr-4 group-hover:bg-secondary group-hover:text-white transition-colors">
                                                {coupon.discount_percent}%
                                            </div>
                                            <div>
                                                <p className="font-mono font-bold text-lg text-neutral-900">{coupon.code}</p>
                                                <p className="text-xs text-neutral-500">Expira em: {new Date(coupon.expiration_date).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                        </div>
                                        <div className="text-secondary opacity-0 group-hover:opacity-100 transition-opacity font-medium text-sm">
                                            Enviar →
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            {notification && (
                <Toast 
                    message={notification.message} 
                    type={notification.type} 
                    onClose={() => setNotification(null)} 
                />
            )}
        </div>
    );
};

export default PhotographerAbandonedCarts;
