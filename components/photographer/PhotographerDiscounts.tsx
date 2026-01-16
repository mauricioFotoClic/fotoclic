import React, { useEffect, useState, useCallback } from 'react';
import { User, BulkDiscountRule } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import Modal from '../Modal';

interface PhotographerDiscountsProps {
    user: User;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

const PhotographerDiscounts: React.FC<PhotographerDiscountsProps> = ({ user, showToast }) => {
    const [rules, setRules] = useState<BulkDiscountRule[]>([]);
    const [initialRules, setInitialRules] = useState<BulkDiscountRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state inside Modal
    const [minQty, setMinQty] = useState(2);
    const [discountPct, setDiscountPct] = useState(5);

    const fetchRules = useCallback(async () => {
        try {
            setLoading(true);
            const userData = await api.getPhotographerById(user.id);
            const currentRules = userData?.bulkDiscountRules || [];
            currentRules.sort((a, b) => a.minQuantity - b.minQuantity);
            setRules(currentRules);
            setInitialRules(currentRules);
        } catch (error) {
            console.error("Failed to fetch discounts", error);
            showToast("Erro ao carregar regras de desconto.", "error");
        } finally {
            setLoading(false);
        }
    }, [user.id, showToast]);

    useEffect(() => {
        fetchRules();
    }, [fetchRules]);

    const hasChanges = JSON.stringify(rules) !== JSON.stringify(initialRules);

    const handleOpenModal = () => {
        setMinQty(2);
        setDiscountPct(5);
        setIsModalOpen(true);
    };

    const handleAddRule = () => {
        if (minQty < 2) {
            showToast("A quantidade mínima deve ser pelo menos 2.", "error");
            return;
        }
        if (discountPct <= 0 || discountPct > 90) {
            showToast("A porcentagem de desconto deve ser entre 1 e 90.", "error");
            return;
        }

        if (rules.some(r => r.minQuantity === minQty)) {
            showToast("Já existe uma regra para esta quantidade.", "error");
            return;
        }

        const newRules = [...rules, { minQuantity: minQty, discountPercent: discountPct }];
        newRules.sort((a, b) => a.minQuantity - b.minQuantity);
        setRules(newRules);
        setIsModalOpen(false);
    };

    const handleRemoveRule = (indexToRemove: number) => {
        const newRules = rules.filter((_, index) => index !== indexToRemove);
        setRules(newRules);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.updatePhotographer(user.id, { bulkDiscountRules: rules });

            // Verify by fetching fresh data
            await fetchRules();

            showToast("Regras de desconto salvas com sucesso!", "success");
        } catch (error) {
            console.error("Failed to save discounts", error);
            showToast("Erro ao salvar as regras de desconto.", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Spinner />;

    const inputClass = "w-full px-3 py-2 bg-white text-neutral-900 border border-neutral-300 rounded-md focus:ring-2 focus:ring-secondary focus:border-transparent transition-all placeholder-neutral-400 shadow-sm";

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-primary-dark">Descontos Progressivos</h1>
                    <p className="text-neutral-600 mt-1 max-w-2xl">
                        Incentive compras maiores oferecendo descontos automáticos baseados na quantidade de fotos no carrinho de um cliente. As regras se aplicam apenas às suas fotos.
                    </p>
                </div>
                <button
                    onClick={handleOpenModal}
                    className="px-4 py-2 bg-secondary text-white font-medium rounded-full hover:bg-opacity-90 transition-colors shadow-sm flex items-center flex-shrink-0"
                >
                    <span className="mr-2"><PlusIcon /></span>
                    Nova Regra
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-neutral-100 overflow-hidden">
                <div className="p-6">
                    <h3 className="text-lg font-bold text-neutral-800 mb-4">Regras Ativas</h3>

                    {rules.length === 0 ? (
                        <div className="text-center py-12 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                            <p className="text-neutral-500 mb-2">Você ainda não configurou descontos por volume.</p>
                            <button onClick={handleOpenModal} className="text-secondary font-medium hover:underline">Adicionar sua primeira regra</button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {rules.map((rule, index) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-neutral-50 border border-neutral-200 rounded-lg hover:shadow-sm transition-shadow">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary font-bold text-lg">
                                            {rule.minQuantity}
                                        </div>
                                        <div>
                                            <p className="font-bold text-neutral-900">
                                                Na compra de {rule.minQuantity} fotos ou mais
                                            </p>
                                            <p className="text-sm text-green-600 font-bold">
                                                O cliente ganha {rule.discountPercent}% de desconto
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveRule(index)}
                                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                        title="Remover Regra"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className="px-8 py-2.5 bg-green-600 text-white font-bold rounded-full shadow-md hover:bg-green-700 transition-all disabled:bg-neutral-400 disabled:cursor-not-allowed flex items-center min-w-[180px] justify-center"
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                Salvando...
                            </>
                        ) : 'Salvar Alterações'}
                    </button>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Adicionar Regra de Desconto"
                size="sm"
            >
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Quantidade Mínima de Fotos
                        </label>
                        <input
                            type="number"
                            min="2"
                            value={minQty}
                            onChange={(e) => setMinQty(parseInt(e.target.value) || 0)}
                            className={inputClass}
                        />
                        <p className="text-xs text-neutral-500 mt-1">A partir de quantas fotos o desconto será aplicado.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Porcentagem de Desconto
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min="1"
                                max="90"
                                value={discountPct}
                                onChange={(e) => setDiscountPct(parseInt(e.target.value) || 0)}
                                className={`${inputClass} pr-8`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">%</span>
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-md transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAddRule}
                            className="px-6 py-2 bg-secondary text-white font-bold rounded-md hover:bg-opacity-90 transition-colors shadow-sm"
                        >
                            Adicionar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PhotographerDiscounts;