import React, { useEffect, useState, useCallback } from 'react';
import { User, BulkDiscountRule } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';

interface PhotographerDiscountsProps {
    user: User;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const PhotographerDiscounts: React.FC<PhotographerDiscountsProps> = ({ user, showToast }) => {
    const [opt5, setOpt5] = useState(false);
    const [opt10, setOpt10] = useState(false);
    const [opt20, setOpt20] = useState(false);

    const [initialOpt5, setInitialOpt5] = useState(false);
    const [initialOpt10, setInitialOpt10] = useState(false);
    const [initialOpt20, setInitialOpt20] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchRules = useCallback(async () => {
        try {
            setLoading(true);
            const userData = await api.getPhotographerById(user.id);
            const currentRules = userData?.bulkDiscountRules || [];
            
            // Check if any rule in the database maps to our fixed rules
            const hasOpt5 = currentRules.some(r => r.minQuantity === 2);
            const hasOpt10 = currentRules.some(r => r.minQuantity === 5);
            const hasOpt20 = currentRules.some(r => r.minQuantity === 10);

            setOpt5(hasOpt5);
            setOpt10(hasOpt10);
            setOpt20(hasOpt20);

            setInitialOpt5(hasOpt5);
            setInitialOpt10(hasOpt10);
            setInitialOpt20(hasOpt20);
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

    const hasChanges = opt5 !== initialOpt5 || opt10 !== initialOpt10 || opt20 !== initialOpt20;

    const handleSave = async () => {
        setSaving(true);
        try {
            const rulesToSave: BulkDiscountRule[] = [];
            if (opt5) rulesToSave.push({ minQuantity: 2, discountPercent: 5 });
            if (opt10) rulesToSave.push({ minQuantity: 5, discountPercent: 10 });
            if (opt20) rulesToSave.push({ minQuantity: 10, discountPercent: 20 });

            await api.updatePhotographer(user.id, { bulkDiscountRules: rulesToSave });

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

    if (loading) return <Spinner size="lg" fullHeight={true} label="Carregando descontos progressivos..." />;

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-primary-dark">Descontos Progressivos</h1>
                    <p className="text-neutral-600 mt-1 max-w-2xl">
                        Ative descontos por volume de compra para incentivar seus clientes a comprarem mais fotos. Os descontos serão aplicados automaticamente no carrinho.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-neutral-100 overflow-hidden">
                <div className="p-6">
                    <h3 className="text-lg font-bold text-neutral-800 mb-4">Escolha as regras de desconto que deseja aplicar:</h3>

                    <div className="space-y-4">
                        {/* Opção 1: 5% para 2 a 4 fotos */}
                        <label className={`flex items-center justify-between p-5 border-2 rounded-xl cursor-pointer transition-all hover:shadow-sm ${opt5 ? 'border-green-500 bg-green-50/20' : 'border-neutral-200 hover:border-neutral-300'}`}>
                            <div className="flex items-center space-x-4">
                                <input
                                    type="checkbox"
                                    checked={opt5}
                                    onChange={(e) => setOpt5(e.target.checked)}
                                    className="w-5 h-5 text-green-600 border-neutral-300 rounded focus:ring-green-500 cursor-pointer animate-none"
                                />
                                <div>
                                    <p className="font-bold text-neutral-900 text-lg">
                                        5% de Desconto
                                    </p>
                                    <p className="text-sm text-neutral-600">
                                        Aplicado na compra de <strong className="text-neutral-800">2 a 4 fotos</strong>
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${opt5 ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-500'}`}>
                                    {opt5 ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                        </label>

                        {/* Opção 2: 10% para 5 a 9 fotos */}
                        <label className={`flex items-center justify-between p-5 border-2 rounded-xl cursor-pointer transition-all hover:shadow-sm ${opt10 ? 'border-green-500 bg-green-50/20' : 'border-neutral-200 hover:border-neutral-300'}`}>
                            <div className="flex items-center space-x-4">
                                <input
                                    type="checkbox"
                                    checked={opt10}
                                    onChange={(e) => setOpt10(e.target.checked)}
                                    className="w-5 h-5 text-green-600 border-neutral-300 rounded focus:ring-green-500 cursor-pointer animate-none"
                                />
                                <div>
                                    <p className="font-bold text-neutral-900 text-lg">
                                        10% de Desconto
                                    </p>
                                    <p className="text-sm text-neutral-600">
                                        Aplicado na compra de <strong className="text-neutral-800">5 a 9 fotos</strong>
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${opt10 ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-500'}`}>
                                    {opt10 ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                        </label>

                        {/* Opção 3: 20% para 10 ou mais fotos */}
                        <label className={`flex items-center justify-between p-5 border-2 rounded-xl cursor-pointer transition-all hover:shadow-sm ${opt20 ? 'border-green-500 bg-green-50/20' : 'border-neutral-200 hover:border-neutral-300'}`}>
                            <div className="flex items-center space-x-4">
                                <input
                                    type="checkbox"
                                    checked={opt20}
                                    onChange={(e) => setOpt20(e.target.checked)}
                                    className="w-5 h-5 text-green-600 border-neutral-300 rounded focus:ring-green-500 cursor-pointer animate-none"
                                />
                                <div>
                                    <p className="font-bold text-neutral-900 text-lg">
                                        20% de Desconto
                                    </p>
                                    <p className="text-sm text-neutral-600">
                                        Aplicado na compra de <strong className="text-neutral-800">10 fotos ou mais</strong>
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${opt20 ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-500'}`}>
                                    {opt20 ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>
                        </label>
                    </div>
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
        </div>
    );
};

export default PhotographerDiscounts;

