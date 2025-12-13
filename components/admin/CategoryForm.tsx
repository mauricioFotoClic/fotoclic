import React, { useState, useEffect } from 'react';
import { Category } from '../../types';

interface CategoryFormProps {
    onSubmit: (data: { name: string; image_url: string }) => void;
    onCancel: () => void;
    initialData: Category | null;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ onSubmit, onCancel, initialData }) => {
    const [formData, setFormData] = useState({
        name: '',
        image_url: '',
    });
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                image_url: initialData.image_url || '',
            });
            if (initialData.image_url) {
                setImagePreview(initialData.image_url);
            }
        } else {
            setFormData({ name: '', image_url: '' });
            setImagePreview(null);
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setFormData(prev => ({...prev, image_url: result}));
                setImagePreview(result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name.trim() && formData.image_url) {
            onSubmit(formData);
        } else {
            alert('Por favor, preencha o nome e adicione uma imagem.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
                    Nome da Categoria *
                </label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Imagem da Categoria *
                </label>
                <div className="mt-1 flex items-center space-x-4">
                    {imagePreview ? (
                        <img src={imagePreview} alt="Pré-visualização" className="w-24 h-24 object-cover rounded-md bg-neutral-100" />
                    ) : (
                         <div className="w-24 h-24 bg-neutral-100 rounded-md flex items-center justify-center text-neutral-400">
                             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                         </div>
                    )}
                    <input
                        id="image_url"
                        name="image_url"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                    />
                    <label htmlFor="image_url" className="cursor-pointer bg-white py-2 px-3 border border-neutral-300 rounded-md shadow-sm text-sm leading-4 font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                        Alterar
                    </label>
                </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors"
                >
                    {initialData ? 'Salvar Alterações' : 'Criar Categoria'}
                </button>
            </div>
        </form>
    );
};

export default CategoryForm;