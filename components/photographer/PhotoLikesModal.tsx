
import React, { useEffect, useState } from 'react';
import { User, Photo, Coupon } from '../../types';
import api from '../../services/api';
import Modal from '../Modal';
import Toast from '../Toast';

interface PhotoLikesModalProps {
    isOpen: boolean;
    onClose: () => void;
    photo: Photo | null;
}

const PhotoLikesModal: React.FC<PhotoLikesModalProps> = ({ isOpen, onClose, photo }) => {
    const [likers, setLikers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' } | null>(null);

    // Coupon Selection State
    const [view, setView] = useState<'list' | 'coupons'>('list');
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loadingCoupons, setLoadingCoupons] = useState(false);
    const [targetUser, setTargetUser] = useState<User | null>(null);

    useEffect(() => {
        if (isOpen && photo) {
            setLoading(true);
            setView('list'); // Reset view always
            api.getPhotoLikers(photo.id).then(users => {
                setLikers(users);
                setLoading(false);
            });
        }
    }, [isOpen, photo]);

    const handleCopyEmail = (email: string) => {
        navigator.clipboard.writeText(email);
        setNotification({ message: 'E-mail copiado!', type: 'success' });
        setTimeout(() => setNotification(null), 2000);
    };

    const handleSendEmail = (user: User) => {
        const subject = encodeURIComponent(`Obrigado pelo Amei na foto "${photo?.title}"`);
        const body = encodeURIComponent(`Olá ${user.name},\n\nVi que você gostou da minha foto "${photo?.title}" no FotoClic.\n\nGostaria de oferecer um desconto especial para você adquirir esta imagem.\n\nAtenciosamente,\n[Seu Nome]`);
        window.open(`mailto:${user.email}?subject=${subject}&body=${body}`, '_blank');
    };

    // New: Open Coupon Selection
    const handleOpenCouponSelection = async (user: User) => {
        if (!photo) return;
        setTargetUser(user);
        setView('coupons');
        setLoadingCoupons(true);

        try {
            const data = await api.getCouponsByPhotographerId(photo.photographer_id);
            // Filter only active coupons
            const activeCoupons = data.filter(c => c.is_active);
            setCoupons(activeCoupons);
        } catch (error) {
            console.error("Failed to fetch coupons", error);
            setNotification({ message: "Erro ao buscar cupons.", type: "error" as any });
        } finally {
            setLoadingCoupons(false);
        }
    };

    const handleSendCouponEmail = (coupon: Coupon) => {
        if (!targetUser || !photo) return;

        const subject = encodeURIComponent(`Um presente especial para você: ${coupon.discount_percent}% OFF!`);
        const body = encodeURIComponent(`Olá ${targetUser.name},\n\nVi que você curtiu minha foto "${photo.title}" no FotoClic.\n\nPara te ajudar a ter essa imagem incrível, criei um cupom exclusivo para você!\n\nUse o código: ${coupon.code}\nPara ganhar ${coupon.discount_percent}% de desconto no checkout.\n\nLink da foto: ${window.location.origin}/#/photo/${photo.id}\n\nEspero que aproveite!\n\nAtenciosamente,\n[Seu Nome]`);

        window.open(`mailto:${targetUser.email}?subject=${subject}&body=${body}`, '_blank');

        setNotification({ message: 'Cliente de e-mail aberto com cupom!', type: 'success' });
        setTimeout(() => {
            setNotification(null);
            setView('list'); // Return to list after sending
        }, 2000);
    };

    const handleBackToList = () => {
        setView('list');
        setTargetUser(null);
    };

    if (!photo) return null;

    const anonymousLikes = photo.likes - likers.length;

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={view === 'list' ? "Marketing & Interessados" : `Enviar Cupom para ${targetUser?.name}`}
                size="md"
            >
                <div className="relative min-h-[300px]">
                    {/* Header Photo Info */}
                    <div className="mb-4 flex items-center p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                        <img src={photo.preview_url} alt={photo.title} className="w-14 h-14 object-cover rounded-md mr-4 shadow-sm" />
                        <div>
                            <p className="font-bold text-neutral-800">{photo.title}</p>
                            <div className="flex items-center text-sm text-neutral-600 mt-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mr-1 fill-current" viewBox="0 0 24 24">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                                <span className="font-medium">{photo.likes} pessoas amaram</span>
                            </div>
                        </div>
                    </div>

                    {/* View: User List */}
                    {view === 'list' && (
                        <>
                            {loading ? (
                                <div className="flex justify-center py-10">
                                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-2 text-xs font-bold text-neutral-400 uppercase tracking-wider">LIKES ({likers.length})</div>
                                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                                        {likers.length > 0 ? likers.map(user => (
                                            <div key={user.id} className="flex items-center justify-between p-3 bg-white border border-neutral-200 rounded-lg hover:shadow-md transition-all group">
                                                <div className="flex items-center">
                                                    <div>
                                                        <p className="text-sm font-bold text-neutral-900">{user.name}</p>
                                                        <p className="text-xs text-neutral-500">{user.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex space-x-1 opacity-100 sm:opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleCopyEmail(user.email)}
                                                        className="p-2 text-neutral-500 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                                                        title="Copiar E-mail"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="text-center py-8 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                                                <p className="text-sm text-neutral-500">Nenhum usuário cadastrado deu like ainda.</p>
                                            </div>
                                        )}
                                    </div>

                                    {anonymousLikes > 0 && (
                                        <div className="mt-4 pt-3 border-t border-neutral-100 text-center bg-yellow-50 p-2 rounded-md">
                                            <p className="text-xs text-yellow-800">
                                                <span className="font-bold">{anonymousLikes}</span> visitantes não identificados (anônimos) também amaram esta foto.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* View: Coupon Selection */}
                    {view === 'coupons' && (
                        <div className="animate-fade-in-up">
                            <button
                                onClick={handleBackToList}
                                className="flex items-center text-sm text-neutral-500 hover:text-primary mb-4 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                                Voltar para lista
                            </button>

                            {loadingCoupons ? (
                                <div className="flex justify-center py-10">
                                    <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : coupons.length === 0 ? (
                                <div className="text-center py-10 bg-neutral-50 rounded-xl border border-dashed border-neutral-300">
                                    <div className="inline-block p-3 bg-white rounded-full shadow-sm mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400"><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2-2H5a2 2 0 0 1-2-2V5z"></path><path d="M3 12h18"></path><path d="M12 3v18"></path></svg>
                                    </div>
                                    <h4 className="text-neutral-900 font-medium">Nenhum cupom ativo</h4>
                                    <p className="text-sm text-neutral-500 mt-1 max-w-xs mx-auto">
                                        Você precisa criar cupons na aba "Cupons" do seu painel antes de enviar ofertas.
                                    </p>
                                    <button
                                        onClick={onClose}
                                        className="mt-4 px-4 py-2 bg-white border border-neutral-300 text-neutral-700 text-sm font-medium rounded-lg hover:bg-neutral-50"
                                    >
                                        Fechar e ir para Cupons
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-neutral-600 mb-3">Selecione um cupom para enviar por e-mail:</p>
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                        {coupons.map(coupon => (
                                            <div key={coupon.id} className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-xl hover:border-secondary/50 hover:shadow-md transition-all group cursor-pointer" onClick={() => handleSendCouponEmail(coupon)}>
                                                <div className="flex items-center">
                                                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mr-4 group-hover:bg-secondary group-hover:text-white transition-colors">
                                                        <span className="font-bold text-sm">{coupon.discount_percent}%</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-mono font-bold text-neutral-900 text-lg tracking-wide">{coupon.code}</p>
                                                        <p className="text-xs text-neutral-500">Expira em {new Date(coupon.expiration_date).toLocaleDateString('pt-BR')}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    className="px-4 py-2 text-sm font-medium text-secondary bg-secondary/5 rounded-lg group-hover:bg-secondary group-hover:text-white transition-all"
                                                >
                                                    Enviar
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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
        </>
    );
};

export default PhotoLikesModal;
