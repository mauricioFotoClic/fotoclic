import React, { useEffect, useState } from 'react';
import { User, Coupon } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import Modal from '../Modal';
import CouponForm from './CouponForm';

interface PhotographerCouponsProps {
    user: User;
}

const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const WarningIcon: React.FC<{className?: string}> = ({className}) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;


const PhotographerCoupons: React.FC<PhotographerCouponsProps> = ({ user }) => {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fetchCoupons = async () => {
            try {
                const data = await api.getCouponsByPhotographerId(user.id);
                setCoupons(data);
            } catch (error) {
                console.error("Failed to fetch coupons", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCoupons();
    }, [user.id]);

    const handleCreateCoupon = async (data: Omit<Coupon, 'id'>) => {
        try {
            const newCoupon = await api.createCoupon(data);
            setCoupons(prev => [...prev, newCoupon].sort((a, b) => new Date(b.expiration_date).getTime() - new Date(a.expiration_date).getTime()));
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error("Failed to create coupon", error);
            alert("Erro ao criar cupom.");
        }
    };

    const openDeleteConfirmation = (coupon: Coupon) => {
        setCouponToDelete(coupon);
        setIsConfirmDeleteOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!couponToDelete) return;

        setIsDeleting(true);
        try {
            const success = await api.deleteCoupon(couponToDelete.id);
            if (success) {
                // Correctly update state using functional form
                setCoupons(prevCoupons => prevCoupons.filter(c => c.id !== couponToDelete.id));
            } else {
                 alert('Erro: O cupom não foi encontrado ou não pôde ser excluído.');
            }
        } catch (error) {
            console.error("Falha ao excluir cupom", error);
            alert('Ocorreu um erro ao tentar excluir o cupom.');
        } finally {
            setIsConfirmDeleteOpen(false);
            setCouponToDelete(null);
            setIsDeleting(false);
        }
    };

    if (loading) return <Spinner />;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-display font-bold text-primary-dark">Meus Cupons</h1>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors shadow-sm"
                >
                    Novo Cupom
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden border border-neutral-100">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                        <thead className="bg-neutral-100 border-b border-neutral-200">
                            <tr>
                                <th className="p-4 text-left text-sm font-semibold text-neutral-600 uppercase tracking-wider">Código</th>
                                <th className="p-4 text-center text-sm font-semibold text-neutral-600 uppercase tracking-wider">Desconto</th>
                                <th className="p-4 text-left text-sm font-semibold text-neutral-600 uppercase tracking-wider">Expiração</th>
                                <th className="p-4 text-center text-sm font-semibold text-neutral-600 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-right text-sm font-semibold text-neutral-600 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coupons.map((coupon, index) => (
                                <tr key={coupon.id} className={`border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-white'}`}>
                                    <td className="p-4">
                                        <span className="font-mono font-bold text-primary bg-primary/5 px-2 py-1 rounded">{coupon.code}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="inline-block font-bold text-neutral-900 bg-neutral-200 px-3 py-1 rounded-full border border-neutral-300 shadow-sm">
                                            {coupon.discount_percent || 0}%
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-neutral-500 font-medium">{new Date(coupon.expiration_date).toLocaleDateString('pt-BR')}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${coupon.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {coupon.is_active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            type="button"
                                            onClick={() => openDeleteConfirmation(coupon)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-all duration-200"
                                            title="Excluir Cupom"
                                        >
                                            <TrashIcon />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {coupons.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center p-12 text-neutral-500">
                                        <p className="text-lg font-medium">Nenhum cupom criado.</p>
                                        <p className="text-sm mt-1">Crie cupons para impulsionar suas vendas.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Criar Novo Cupom">
                <CouponForm 
                    onSubmit={handleCreateCoupon} 
                    onCancel={() => setIsCreateModalOpen(false)} 
                    photographerId={user.id} 
                />
            </Modal>

            <Modal
                isOpen={isConfirmDeleteOpen}
                onClose={() => setIsConfirmDeleteOpen(false)}
                title="Confirmar Exclusão"
                size="sm"
            >
                {couponToDelete && (
                    <div>
                         <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded-r-md">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <WarningIcon className="h-5 w-5 text-red-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700 font-medium">
                                        Esta ação é irreversível.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <p className="text-neutral-600 mb-6">
                            Tem certeza que deseja excluir o cupom <strong>"{couponToDelete.code}"</strong>?
                        </p>
                        <div className="flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={() => setIsConfirmDeleteOpen(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors flex items-center min-w-[100px] justify-center"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Excluindo...
                                    </>
                                ) : 'Excluir'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default PhotographerCoupons;