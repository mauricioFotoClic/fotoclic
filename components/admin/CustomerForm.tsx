
import React, { useState, useEffect } from 'react';
import { User } from '../../types';

interface CustomerFormProps {
    onSubmit: (data: { name: string; email: string }) => void;
    onCancel: () => void;
    initialData: User | null;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ onSubmit, onCancel, initialData }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                email: initialData.email || '',
            });
        } else {
             setFormData({ name: '', email: '' });
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name.trim() && formData.email.trim()) {
            onSubmit(formData);
        } else {
            alert('Por favor, preencha os campos obrigatórios.');
        }
    };
    
    const inputClass = "w-full px-3 py-2 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition-all";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">Nome *</label>
                <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">Email *</label>
                <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className={inputClass} required />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors">
                    Cancelar
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors">
                    {initialData ? 'Salvar Alterações' : 'Criar Cliente'}
                </button>
            </div>
        </form>
    );
};

export default CustomerForm;
