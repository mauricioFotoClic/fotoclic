
import React, { useState } from 'react';
import { Coupon } from '../../types';

interface CouponFormProps {
    onSubmit: (data: Omit<Coupon, 'id'>) => void;
    onCancel: () => void;
    photographerId: string;
}

const CouponForm: React.FC<CouponFormProps> = ({ onSubmit, onCancel, photographerId }) => {
    const [formData, setFormData] = useState({
        code: '',
        discount_percent: 10,
        expiration_date: '',
        is_active: true
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : name === 'discount_percent' ? Number(value) : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code || !formData.expiration_date) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }
        
        onSubmit({
            code: formData.code.toUpperCase(),
            discount_percent: formData.discount_percent,
            expiration_date: formData.expiration_date,
            photographer_id: photographerId,
            is_active: formData.is_active
        });
    };

    const inputClass = "w-full px-3 py-2 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder-neutral-400";

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label htmlFor="code" className="block text-sm font-medium text-neutral-700 mb-1">Código do Cupom *</label>
                <div className="relative">
                    <input 
                        id="code"
                        type="text" 
                        name="code" 
                        value={formData.code} 
                        onChange={handleChange} 
                        className={`${inputClass} uppercase tracking-wide font-medium`}
                        placeholder="EX: DESCONTO10"
                        required
                    />
                </div>
                <p className="text-xs text-neutral-500 mt-1">Este é o código que seus clientes utilizarão no checkout.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="discount_percent" className="block text-sm font-medium text-neutral-700 mb-1">Desconto (%) *</label>
                    <div className="relative">
                        <input 
                            id="discount_percent"
                            type="number" 
                            name="discount_percent" 
                            min="1" 
                            max="100" 
                            value={formData.discount_percent} 
                            onChange={handleChange} 
                            className={`${inputClass} pr-8`}
                            required
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-medium">%</span>
                    </div>
                </div>

                <div>
                    <label htmlFor="expiration_date" className="block text-sm font-medium text-neutral-700 mb-1">Data de Expiração *</label>
                    <input 
                        id="expiration_date"
                        type="date" 
                        name="expiration_date" 
                        value={formData.expiration_date} 
                        onChange={handleChange} 
                        className={inputClass}
                        required
                    />
                </div>
            </div>

            <div className="flex items-center pt-1">
                <input 
                    id="is_active"
                    type="checkbox" 
                    name="is_active" 
                    checked={formData.is_active} 
                    onChange={handleChange} 
                    className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 rounded cursor-pointer"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm font-medium text-neutral-700 cursor-pointer">Cupom Ativo</label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-100 mt-2">
                <button 
                    type="button" 
                    onClick={onCancel} 
                    className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    className="px-6 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors shadow-sm"
                >
                    Criar Cupom
                </button>
            </div>
        </form>
    );
};

export default CouponForm;
