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

const EmailIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>;
const WhatsAppIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" /></svg>;
const TagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const CartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300 mb-4"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>;
const CheckCircle = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const XCircle = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
const ChevronDown = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;

type CartStatus = 'pending' | 'contacted' | 'converted' | 'lost';

const PhotographerAbandonedCarts: React.FC<PhotographerAbandonedCartsProps> = ({ user, setView }) => {
    const [carts, setCarts] = useState<AbandonedCart[]>([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);

    // Coupon Modal State
    const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
    const [loadingCoupons, setLoadingCoupons] = useState(false);
    const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
    const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null);
    const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);

    useEffect(() => {
        const fetchCarts = async () => {
            try {
                setLoading(true);
                const data = await api.getAbandonedCartsByPhotographerId(user.id);
                // Ensure status is valid
                const validCarts = data.map((c: any) => ({
                    ...c,
                    status: c.status && ['pending', 'contacted', 'converted', 'lost'].includes(c.status) ? c.status : 'pending'
                }));
                setCarts(validCarts);
            } catch (error) {
                console.error("Failed to fetch abandoned carts", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCarts();
    }, [user.id]);

    const buildMessage = (cart: AbandonedCart, type: 'email_subject' | 'email_body' | 'whatsapp_text' | 'congrats_text') => {
        const templates = user.communication_templates?.abandoned_cart || {
            email_subject: "Você esqueceu algo especial no FotoClic!",
            email_body: "Olá {{nome_cliente}},\n\nNotamos que você deixou algumas fotos incríveis no seu carrinho:\n\n{{lista_fotos}}\n\nElas ainda estão esperando por você. Clique aqui para finalizar sua compra!\n\nAtenciosamente,\n{{nome_fotografo}}",
            whatsapp_text: "Olá {{nome_cliente}}, aqui é {{nome_fotografo}} da FotoClic! \n\nVi que você deixou algumas fotos no seu carrinho: \n{{lista_fotos}} \n\nElas estão incríveis! Gostaria de alguma ajuda para finalizar sua compra?"
        };

        const congrats_text = "Olá {{nome_cliente}}, aqui é {{nome_fotografo}}! Muito obrigado pela sua compra! Espero que você ame as fotos tanto quanto eu amei tirá-las. 📸❤️";

        let text = type === 'congrats_text' ? congrats_text : (templates[type as keyof typeof templates] || "");
        
        const rawTotal = cart.items.reduce((acc, item) => acc + item.price, 0);
        let discountAmount = 0;
        const rules = user.bulkDiscountRules || [];
        
        const qty = cart.items.length;
        let appliedRule = null;

        if (qty >= 2 && qty <= 4) {
            appliedRule = rules.find(r => r.minQuantity === 2) || null;
        } else if (qty >= 5 && qty <= 9) {
            appliedRule = rules.find(r => r.minQuantity === 5) || null;
        } else if (qty >= 10) {
            appliedRule = rules.find(r => r.minQuantity === 10) || null;
        }

        if (appliedRule) discountAmount = rawTotal * (appliedRule.discountPercent / 100);
        const totalValue = rawTotal - discountAmount;

        const itemsList = cart.items.map(i => `- ${i.title}`).join('\n');
        
        text = text.replace(/{{nome_cliente}}/g, cart.userName);
        text = text.replace(/{{lista_fotos}}/g, itemsList);
        text = text.replace(/{{nome_fotografo}}/g, user.name);
        text = text.replace(/{{valor_total}}/g, `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        text = text.replace(/{{link_carrinho}}/g, "https://fotoclic.app/cart");
        
        return text;
    };

    const updateCartStatus = (cartId: string, status: CartStatus) => {
        setCarts(prev => prev.map(c => c.id === cartId ? { ...c, status } : c));
        setOpenStatusDropdown(null);
        setNotification({ message: `Status atualizado para ${getStatusName(status)}`, type: 'success' });
        // Em um sistema real, aqui você faria uma chamada para a API salvar o novo status
        // api.updateCartStatus(cartId, status);
    };

    const handleWhatsAppContact = (cart: AbandonedCart, type: 'recover' | 'congrats' = 'recover') => {
        if (!cart.userPhone) {
            setNotification({ message: 'Este cliente não cadastrou telefone.', type: 'error' });
            return;
        }

        const cleanPhone = cart.userPhone.replace(/\D/g, '');
        const text = encodeURIComponent(buildMessage(cart, type === 'recover' ? 'whatsapp_text' : 'congrats_text'));

        window.open(`https://wa.me/55${cleanPhone}?text=${text}`, '_blank');
        
        if (type === 'recover' && cart.status === 'pending') {
            updateCartStatus(cart.id, 'contacted');
        }
    };

    const handleOpenCouponModal = async (cart: AbandonedCart) => {
        setSelectedCart(cart);
        setIsCouponModalOpen(true);
        setLoadingCoupons(true);
        try {
            const data = await api.getCouponsByPhotographerId(user.id);
            setAvailableCoupons(data.filter(c => c.is_active));
        } catch (error) {
            setNotification({ message: 'Erro ao buscar cupons.', type: 'error' });
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
        if (selectedCart.status === 'pending') {
            updateCartStatus(selectedCart.id, 'contacted');
        }
        setIsCouponModalOpen(false);
        setSelectedCart(null);
    };

    const getStatusColor = (status: CartStatus) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'contacted': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'converted': return 'bg-green-100 text-green-800 border-green-200';
            case 'lost': return 'bg-neutral-100 text-neutral-600 border-neutral-200';
            default: return 'bg-neutral-100 text-neutral-800 border-neutral-200';
        }
    };

    const getStatusName = (status: CartStatus) => {
        switch (status) {
            case 'pending': return '⏳ Pendente';
            case 'contacted': return '💬 Contactado';
            case 'converted': return '🎉 Convertido';
            case 'lost': return '❌ Perdido';
            default: return status;
        }
    };

    if (loading) return <Spinner />;

    return (
        <div className="pb-20">
            <div className="mb-6">
                <h1 className="text-3xl font-display font-bold text-primary-dark">Funil de Vendas</h1>
                <p className="text-neutral-600 mt-1">Gerencie carrinhos abandonados, envie ofertas e feche mais negócios.</p>
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
                            const discountAmount = 0; // Simplified for UI
                            const totalValue = rawTotal - discountAmount;

                            return (
                                <div key={cart.id} className="p-4 bg-white relative">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-semibold text-neutral-800 text-lg">{cart.userName}</p>
                                            {cart.userPhone && <p className="text-xs text-neutral-500 mt-0.5">📱 {cart.userPhone}</p>}
                                        </div>
                                        
                                        <div className="relative">
                                            <button 
                                                onClick={() => setOpenStatusDropdown(openStatusDropdown === cart.id ? null : cart.id)}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-full flex items-center gap-1 border ${getStatusColor(cart.status)} transition-colors hover:opacity-80`}
                                            >
                                                {getStatusName(cart.status)}
                                                <ChevronDown />
                                            </button>
                                            
                                            {openStatusDropdown === cart.id && (
                                                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-xl border border-neutral-100 z-50 overflow-hidden">
                                                    {(['pending', 'contacted', 'converted', 'lost'] as CartStatus[]).map(st => (
                                                        <button 
                                                            key={st}
                                                            onClick={() => updateCartStatus(cart.id, st)}
                                                            className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 flex items-center gap-2 transition-colors"
                                                        >
                                                            <div className={`w-2 h-2 rounded-full ${getStatusColor(st).split(' ')[0]}`}></div>
                                                            {getStatusName(st).replace(/[^a-zA-ZÀ-ÿ\s]/g, '').trim()}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mb-4 bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-2">
                                                {cart.items.slice(0, 3).map((item, i) => (
                                                    <img key={i} src={item.preview_url} alt="item" className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" />
                                                ))}
                                            </div>
                                            <span className="text-xs font-medium text-neutral-600">{cart.items.length} itens</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider mb-0.5">Potencial</p>
                                            <p className="font-bold text-green-600">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Action Buttons based on status */}
                                    <div className="flex items-center gap-2">
                                        {cart.status !== 'converted' && cart.status !== 'lost' && (
                                            <>
                                                <button
                                                    onClick={() => handleWhatsAppContact(cart, 'recover')}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-white bg-[#25D366] rounded-lg hover:bg-[#20bd5a] shadow-sm transition-colors"
                                                >
                                                    <WhatsAppIcon /> Abordar
                                                </button>
                                                <button
                                                    onClick={() => handleOpenCouponModal(cart)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-secondary-dark bg-secondary/10 rounded-lg hover:bg-secondary/20 transition-colors"
                                                >
                                                    <TagIcon /> Cupom
                                                </button>
                                            </>
                                        )}
                                        
                                        {cart.status === 'converted' && (
                                            <button
                                                onClick={() => handleWhatsAppContact(cart, 'congrats')}
                                                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors border border-green-200"
                                            >
                                                <CheckCircle /> Agradecer Compra
                                            </button>
                                        )}
                                        
                                        {cart.status === 'lost' && (
                                            <button
                                                onClick={() => updateCartStatus(cart.id, 'pending')}
                                                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                                            >
                                                Reativar Oportunidade
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto min-h-[400px]">
                        <table className="w-full min-w-[900px]">
                            <thead className="bg-neutral-50 border-b border-neutral-200">
                                <tr>
                                    <th className="p-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Status</th>
                                    <th className="p-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Cliente</th>
                                    <th className="p-4 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider">Itens</th>
                                    <th className="p-4 text-right text-xs font-bold text-neutral-500 uppercase tracking-wider">Potencial</th>
                                    <th className="p-4 text-right text-xs font-bold text-neutral-500 uppercase tracking-wider">Ações Estratégicas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {carts.map((cart) => {
                                    const rawTotal = cart.items.reduce((acc, item) => acc + item.price, 0);
                                    const totalValue = rawTotal; // Simplified

                                    return (
                                        <tr key={cart.id} className="bg-white hover:bg-neutral-50 transition-colors group">
                                            <td className="p-4 w-48 relative">
                                                <button 
                                                    onClick={() => setOpenStatusDropdown(openStatusDropdown === cart.id ? null : cart.id)}
                                                    className={`w-full px-3 py-1.5 text-xs font-bold rounded-lg flex items-center justify-between border ${getStatusColor(cart.status)} transition-colors hover:shadow-sm`}
                                                >
                                                    {getStatusName(cart.status)}
                                                    <ChevronDown />
                                                </button>
                                                
                                                {openStatusDropdown === cart.id && (
                                                    <div className="absolute top-14 left-4 w-40 bg-white rounded-lg shadow-xl border border-neutral-100 z-50 overflow-hidden">
                                                        {(['pending', 'contacted', 'converted', 'lost'] as CartStatus[]).map(st => (
                                                            <button 
                                                                key={st}
                                                                onClick={() => updateCartStatus(cart.id, st)}
                                                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 flex items-center gap-2 transition-colors border-l-2 border-transparent hover:border-primary"
                                                            >
                                                                <div className={`w-2 h-2 rounded-full ${getStatusColor(st).split(' ')[0]}`}></div>
                                                                {getStatusName(st).replace(/[^a-zA-ZÀ-ÿ\s]/g, '').trim()}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                        {cart.userName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-neutral-800">{cart.userName}</div>
                                                        <div className="text-xs text-neutral-500">{cart.userEmail}</div>
                                                        {cart.userPhone && (
                                                            <div className="text-[10px] font-medium text-neutral-400 mt-0.5">
                                                                📱 {cart.userPhone}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="flex -space-x-2 overflow-hidden mb-1">
                                                        {cart.items.slice(0, 3).map((item, i) => (
                                                            <img key={i} src={item.preview_url} alt="item" className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" />
                                                        ))}
                                                    </div>
                                                    <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                                                        {cart.items.length} foto(s)
                                                    </span>
                                                </div>
                                            </td>
                                            
                                            <td className="p-4 text-right">
                                                <span className="font-display font-bold text-lg text-green-600">
                                                    R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                                <div className="text-[10px] text-neutral-400">{new Date(cart.date).toLocaleDateString('pt-BR')}</div>
                                            </td>
                                            
                                            <td className="p-4">
                                                <div className="flex justify-end gap-2">
                                                    {cart.status !== 'converted' && cart.status !== 'lost' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleWhatsAppContact(cart, 'recover')}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#25D366] rounded-lg hover:bg-[#20bd5a] shadow-sm transition-all hover:-translate-y-0.5"
                                                                title="Abordar no WhatsApp"
                                                            >
                                                                <WhatsAppIcon /> Abordar
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenCouponModal(cart)}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-secondary-dark bg-secondary/10 rounded-lg hover:bg-secondary/20 transition-all hover:-translate-y-0.5"
                                                                title="Enviar Cupom de Desconto"
                                                            >
                                                                <TagIcon /> Cupom
                                                            </button>
                                                            <a
                                                                href={`mailto:${cart.userEmail}?subject=${encodeURIComponent(buildMessage(cart, 'email_subject'))}&body=${encodeURIComponent(buildMessage(cart, 'email_body'))}`}
                                                                target="_blank" rel="noopener noreferrer"
                                                                onClick={() => updateCartStatus(cart.id, 'contacted')}
                                                                className="flex items-center justify-center w-8 h-8 text-neutral-400 bg-neutral-50 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                                                                title="Enviar E-mail"
                                                            >
                                                                <EmailIcon />
                                                            </a>
                                                        </>
                                                    )}
                                                    
                                                    {cart.status === 'converted' && (
                                                        <button
                                                            onClick={() => handleWhatsAppContact(cart, 'congrats')}
                                                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors border border-green-200"
                                                        >
                                                            <CheckCircle /> Agradecer
                                                        </button>
                                                    )}
                                                    
                                                    {cart.status === 'lost' && (
                                                        <button
                                                            onClick={() => updateCartStatus(cart.id, 'pending')}
                                                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
                                                        >
                                                            Reativar
                                                        </button>
                                                    )}
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
                title="🎁 Enviar Presente"
                size="md"
            >
                <div>
                    {loadingCoupons ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : availableCoupons.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="inline-block p-4 bg-neutral-100 rounded-full mb-4 text-neutral-400">
                                <TagIcon />
                            </div>
                            <h3 className="text-lg font-bold text-neutral-900 mb-2">Sem cupons ativos</h3>
                            <p className="text-neutral-500 text-sm mb-6 max-w-xs mx-auto">
                                Você precisa criar um cupom de desconto antes de enviá-lo.
                            </p>
                            <button
                                onClick={() => { setIsCouponModalOpen(false); setView('coupons'); }}
                                className="px-6 py-2 bg-secondary text-white font-bold rounded-full hover:bg-secondary-dark shadow-md transition-all hover:-translate-y-0.5"
                            >
                                + Criar Novo Cupom
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            <p className="text-sm text-neutral-600 mb-4">Selecione o cupom que deseja oferecer para <strong>{selectedCart?.userName}</strong>:</p>

                            {availableCoupons.map(coupon => (
                                <div
                                    key={coupon.id}
                                    onClick={() => handleSelectCoupon(coupon)}
                                    className="relative overflow-hidden border-2 border-transparent bg-neutral-50 rounded-xl p-4 hover:border-secondary hover:bg-secondary/5 cursor-pointer transition-all group"
                                >
                                    <div className="flex justify-between items-center relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center text-secondary font-black text-xl border border-neutral-100 group-hover:border-secondary/30">
                                                {coupon.discount_percent}%
                                            </div>
                                            <div>
                                                <p className="font-mono font-black text-lg text-neutral-800 tracking-wide uppercase">{coupon.code}</p>
                                                <p className="text-xs font-medium text-neutral-500">Validade: {new Date(coupon.expiration_date).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                        </div>
                                        <div className="bg-secondary text-white text-xs font-bold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm translate-x-2 group-hover:translate-x-0">
                                            Enviar
                                        </div>
                                    </div>
                                    {/* Decoration */}
                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rounded-full blur-xl group-hover:bg-secondary/10 transition-colors"></div>
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
