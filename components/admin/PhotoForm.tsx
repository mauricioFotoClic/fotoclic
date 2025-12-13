
import React, { useState, useEffect } from 'react';
import { Photo, User, Category } from '../../types';

type FormData = Omit<Photo, 'id' | 'upload_date' | 'moderation_status' | 'rejection_reason'>;

interface PhotoFormProps {
    onSubmit: (data: FormData) => void;
    onCancel: () => void;
    initialData: Photo | null;
    photographers: User[];
    categories: Category[];
}

const PhotoForm: React.FC<PhotoFormProps> = ({ onSubmit, onCancel, initialData, photographers, categories }) => {
    const [formData, setFormData] = useState<Omit<Photo, 'id' | 'upload_date'>>({
        title: '',
        description: '',
        price: 0,
        photographer_id: '',
        category_id: '',
        preview_url: '',
        file_url: '',
        resolution: '4K',
        tags: [],
        is_public: true,
        moderation_status: 'approved',
        rejection_reason: undefined,
        is_featured: false,
        likes: 0,
        liked_by_users: [],
    });
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        if (initialData) {
            const { upload_date, ...rest } = initialData;
            setFormData({ ...rest });
            if(initialData.preview_url) setPreviewImage(initialData.preview_url);
        } else {
            setFormData({
                title: '', description: '', price: 0,
                photographer_id: photographers[0]?.id || '',
                category_id: categories[0]?.id || '',
                preview_url: '', file_url: '',
                resolution: '4K', tags: [], is_public: true,
                moderation_status: 'approved',
                rejection_reason: undefined,
                is_featured: false,
                likes: 0,
                liked_by_users: [],
            });
            setPreviewImage(null);
        }
    }, [initialData, photographers, categories]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (name === 'tags') {
             setFormData(prev => ({ ...prev, [name]: value.split(',').map(tag => tag.trim()) }));
        }
        else {
            setFormData(prev => ({ ...prev, [name]: name === 'price' ? parseFloat(value) : value }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'preview' | 'file') => {
        const file = e.target.files?.[0];
        if(file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if(field === 'preview') {
                    setFormData(prev => ({...prev, preview_url: result}));
                    setPreviewImage(result);
                    // For simplicity in this demo, we'll use the same image for file_url
                    setFormData(prev => ({...prev, file_url: result}));
                } else {
                     setFormData(prev => ({...prev, file_url: result}));
                }
            }
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.title.trim() && formData.photographer_id && formData.category_id && formData.preview_url) {
            const { moderation_status, rejection_reason, ...rest } = formData;
            onSubmit(rest);
        } else {
            alert('Por favor, preencha todos os campos obrigatórios, incluindo a imagem de pré-visualização.');
        }
    };

    const inputClass = "w-full px-3 py-2 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition-all";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-1">Título *</label>
                <input id="title" name="title" type="text" value={formData.title} onChange={handleChange} className={inputClass} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="photographer_id" className="block text-sm font-medium text-neutral-700 mb-1">Fotógrafo *</label>
                    <select id="photographer_id" name="photographer_id" value={formData.photographer_id} onChange={handleChange} className={inputClass} required>
                        <option value="">Selecione</option>
                        {photographers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="category_id" className="block text-sm font-medium text-neutral-700 mb-1">Categoria *</label>
                    <select id="category_id" name="category_id" value={formData.category_id} onChange={handleChange} className={inputClass} required>
                        <option value="">Selecione</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>
            
            <div>
                 <label className="block text-sm font-medium text-neutral-700 mb-1">Imagem da Foto *</label>
                 <div className="mt-1 p-4 border-2 border-dashed border-neutral-200 rounded-md">
                    {previewImage ? (
                        <img src={previewImage} alt="Pré-visualização da Foto" className="w-full h-48 object-contain rounded-md bg-neutral-100" />
                    ) : (
                         <div className="w-full h-48 bg-neutral-100 rounded-md flex items-center justify-center text-neutral-400 text-center p-4">
                            <span>Selecione uma imagem para pré-visualização</span>
                         </div>
                    )}
                     <input
                        id="preview_upload"
                        name="preview_url"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'preview')}
                        className="hidden"
                    />
                    <label htmlFor="preview_upload" className="mt-4 cursor-pointer w-full inline-block text-center bg-white py-2 px-3 border border-neutral-300 rounded-md shadow-sm text-sm leading-4 font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                        Escolher Imagem de Pré-visualização
                    </label>
                    <p className="text-xs text-neutral-500 mt-1">Isso também definirá o arquivo final para fins de demonstração.</p>
                 </div>
            </div>

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-1">Descrição</label>
                <textarea id="description" name="description" value={formData.description} onChange={handleChange} className={inputClass} rows={3}></textarea>
            </div>
            
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="price" className="block text-sm font-medium text-neutral-700 mb-1">Preço (R$) *</label>
                    <input id="price" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} className={inputClass} required />
                </div>
                <div>
                    <label htmlFor="resolution" className="block text-sm font-medium text-neutral-700 mb-1">Resolução</label>
                    <select id="resolution" name="resolution" value={formData.resolution} onChange={handleChange} className={inputClass}>
                        <option>HD</option>
                        <option>Full HD</option>
                        <option>4K</option>
                        <option>RAW</option>
                    </select>
                </div>
            </div>

             <div>
                <label htmlFor="tags" className="block text-sm font-medium text-neutral-700 mb-1">Tags (separadas por vírgula)</label>
                <input id="tags" name="tags" type="text" value={formData.tags.join(', ')} onChange={handleChange} className={inputClass} />
            </div>

            <div className="flex items-center space-x-6">
                <div className="flex items-center">
                    <input id="is_public" name="is_public" type="checkbox" checked={formData.is_public} onChange={handleChange} className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 rounded" />
                    <label htmlFor="is_public" className="ml-2 block text-sm text-neutral-900">Foto Pública</label>
                </div>
                 <div className="flex items-center">
                    <input id="is_featured" name="is_featured" type="checkbox" checked={formData.is_featured} onChange={handleChange} className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 rounded" />
                    <label htmlFor="is_featured" className="ml-2 block text-sm text-neutral-900">Foto em Destaque</label>
                </div>
            </div>


            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors">
                    Cancelar
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors">
                    {initialData ? 'Salvar Alterações' : 'Criar Foto'}
                </button>
            </div>
        </form>
    );
};

export default PhotoForm;
