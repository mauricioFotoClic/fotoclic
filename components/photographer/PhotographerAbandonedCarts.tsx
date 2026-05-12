
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
const WhatsAppIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" /></svg>;
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

    const buildMessage = (cart: AbandonedCart, type: 'email_subject' | 'email_body' | 'whatsapp_text') => {
        const templates = user.communication_templates?.abandoned_cart || {
            email_subject: "Você esqueceu algo especial no FotoClic!",
            email_body: "Olá {{nome_cliente}},\n\nNotamos que você deixou algumas fotos incríveis no seu carrinho:\n\n{{lista_fotos}}\n\nElas ainda estão esperando por você. Clique aqui para finalizar sua compra!\n\nAtenciosamente,\n{{nome_fotografo}}",
            whatsapp_text: "Olá {{nome_cliente}}, aqui é {{nome_fotografo}} da FotoClic! \n\nVi que você deixou algumas fotos no seu carrinho: \n{{lista_fotos}} \n\nElas estão incríveis! Gostaria de alguma ajuda para finalizar sua compra?"
        };

        let text = templates[type] || "";
        
        const rawTotal = cart.items.reduce((acc, item) => acc + item.price, 0);
        let discountAmount = 0;
        const rules = user.bulkDiscountRules || [];
        const sortedRules = [...rules].sort((a, b) => b.minQuantity - a.minQuantity);
        const appliedRule = sortedRules.find(r => cart.items.length >= r.minQuantity) || null;
        if (appliedRule) discountAmount = rawTotal * (appliedRule.discountPercent / 100);
        const totalValue = rawTotal - discountAmount;

        const itemsList = cart.items.map(i => `- ${i.title}`).join('\n');
        
        text = text.replace(/{{nome_cliente}}/g, cart.userName);
        text = text.replace(/{{lista_fotos}}/g, itemsList);
        text = text.replace(/{{nome_fotografo}}/g, user.name);
        text = text.replace(/{{valor_total}}/g, `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        text = text.replace(/{{link_carrinho}}/g, "https://fotoclic.app/cart"); // Optional but good to have
        
        return text;
    };

    const handleSendEmail = (cart: AbandonedCart) => {
        const subject = encodeURIComponent(buildMessage(cart, 'email_subject'));
        const body = encodeURIComponent(buildMessage(cart, 'email_body'));

        window.open(`mailto:${cart.userEmail}?subject=${subject}&body=${body}`, '_blank');
        setNotification({ message: 'Cliente de e-mail aberto com sucesso!', type: 'info' });

        // Mark as contacted
        updateCartStatus(cart.id, 'contacted');
    };

    const handleWhatsAppContact = (cart: AbandonedCart) => {
        if (!cart.userPhone) {
            setNotification({ message: 'Este cliente não cadastrou telefone.', type: 'info' });
            return;
        }

        const cleanPhone = cart.userPhone.replace(/\D/g, '');
        const text = encodeURIComponent(buildMessage(cart, 'whatsapp_text'));

        window.open(`https://wa.me/55${cleanPhone}?text=${text}`, '_blank');
        setNotification({ message: 'WhatsApp aberto com sucesso!', type: 'info' });

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
                    <>
                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-neutral-100">
                        {carts.map((cart) => {
                            const rawTotal = cart.items.reduce((acc, item) => acc + item.price, 0);
                            let discountAmount = 0;
                            const rules = user.bulkDiscountRules || [];
                            const sortedRules = [...rules].sort((a, b) => b.minQuantity - a.minQuantity);
                            const appliedRule = sortedRules.find(r => cart.items.length >= r.minQuantity) || null;
                            if (appliedRule) discountAmount = rawTotal * (appliedRule.discountPercent / 100);
                            const totalValue = rawTotal - discountAmount;

                            return (
                                <div key={cart.id} className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-semibold text-neutral-800">{cart.userName}</p>
                                            <p className="text-xs text-neutral-500">{cart.userEmail}</p>
                                            {cart.userPhone && <p className="text-xs text-neutral-400 mt-0.5">📱 {cart.userPhone}</p>}
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0
                                            ${cart.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                cart.status === 'contacted' ? 'bg-primary/20 text-primary' :
                                                    'bg-green-100 text-green-800'}`}>
                                            {cart.status === 'pending' ? 'Pendente' : cart.status === 'contacted' ? 'Contactado' : 'Recuperado'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-2">
                                                {cart.items.slice(0, 3).map((item, i) => (
                                                    <img key={i} src={item.preview_url} alt="item" className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" title={item.title} />
                                                ))}
                                            </div>
                                            <span className="text-xs text-neutral-500">{cart.items.length} foto(s)</span>
                                        </div>
                                        <div className="text-right">
                                            {appliedRule && (
                                                <p className="text-xs text-neutral-400 line-through">R$ {rawTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                            )}
                                            <p className="font-bold text-green-600">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`mailto:${cart.userEmail}?subject=${encodeURIComponent(buildMessage(cart, 'email_subject'))}&body=${encodeURIComponent(buildMessage(cart, 'email_body'))}`}
                                            target="_blank" rel="noopener noreferrer"
                                            onClick={() => { setNotification({ message: 'E-mail aberto!', type: 'info' }); updateCartStatus(cart.id, 'contacted'); }}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-primary-dark bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                                        >
                                            <EmailIcon /> E-mail
                                        </a>
                                        <a
                                            href={`https://wa.me/55${cart.userPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(buildMessage(cart, 'whatsapp_text'))}`}
                                            target="_blank" rel="noopener noreferrer"
                                            onClick={(e) => { if (!cart.userPhone) { e.preventDefault(); setNotification({ message: 'Cliente sem telefone.', type: 'info' }); } else { setNotification({ message: 'WhatsApp aberto!', type: 'info' }); updateCartStatus(cart.id, 'contacted'); } }}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                                        >
                                            <WhatsAppIcon /> WhatsApp
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
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
                                    const rawTotal = cart.items.reduce((acc, item) => acc + item.price, 0);
                                    let discountAmount = 0;
                                    const rules = user.bulkDiscountRules || [];
                                    const sortedRules = [...rules].sort((a, b) => b.minQuantity - a.minQuantity);
                                    const appliedRule = sortedRules.find(r => cart.items.length >= r.minQuantity) || null;

                                    if (appliedRule) {
                                        discountAmount = rawTotal * (appliedRule.discountPercent / 100);
                                    }
                                    const totalValue = rawTotal - discountAmount;

                                    return (
                                        <tr key={cart.id} className={`border-t ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}>
                                            <td className="p-4">
                                                <div className="font-medium text-neutral-800">{cart.userName}</div>
                                                <div className="text-xs text-neutral-500">{cart.userEmail}</div>
                                                {cart.userPhone && (
                                                    <div className="text-xs text-neutral-400 mt-1 flex items-center">
                                                        <span className="mr-1">📱</span> {cart.userPhone}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm text-neutral-600">
                                                {new Date(cart.date).toLocaleDateString('pt-BR')} <br />
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
                                                {appliedRule ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs text-neutral-400 font-normal line-through">R$ {rawTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                        <span>R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                ) : (
                                                    <span>R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                                                    ${cart.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        cart.status === 'contacted' ? 'bg-primary/20 text-primary' :
                                                            'bg-green-100 text-green-800'}`}>
                                                    {cart.status === 'pending' ? 'Pendente' : cart.status === 'contacted' ? 'Contactado' : 'Recuperado'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2 text-neutral-500">
                                                    <a
                                                        href={`mailto:${cart.userEmail}?subject=${encodeURIComponent(buildMessage(cart, 'email_subject'))}&body=${encodeURIComponent(buildMessage(cart, 'email_body'))}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={() => {
                                                            setNotification({ message: 'Cliente de e-mail aberto!', type: 'info' });
                                                            updateCartStatus(cart.id, 'contacted');
                                                        }}
                                                        className="p-2 hover:text-primary-dark hover:bg-primary/10 rounded-full transition-colors flex items-center justify-center"
                                                        title="Enviar E-mail Lembrete"
                                                    >
                                                        <EmailIcon />
                                                    </a>
                                                    <a
                                                        href={`https://wa.me/55${cart.userPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(buildMessage(cart, 'whatsapp_text'))}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => {
                                                            if (!cart.userPhone) {
                                                                e.preventDefault();
                                                                setNotification({ message: 'Este cliente não cadastrou telefone.', type: 'info' });
                                                            } else {
                                                                setNotification({ message: 'WhatsApp aberto!', type: 'info' });
                                                                updateCartStatus(cart.id, 'contacted');
                                                            }
                                                        }}
                                                        className="p-2 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors flex items-center justify-center"
                                                        title="Contactar via WhatsApp"
                                                    >
                                                        <WhatsAppIcon />
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    </>
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


