
import React, { useState, useEffect } from 'react';
import { User } from '../../types';

type FormData = Omit<User, 'id' | 'role'>;

interface PhotographerFormProps {
    onSubmit: (data: FormData) => void;
    onCancel: () => void;
    initialData: User | null;
}

const PhotographerForm: React.FC<PhotographerFormProps> = ({ onSubmit, onCancel, initialData }) => {
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        bio: '',
        avatar_url: '',
        banner_url: '',
        location: '',
        social_instagram: '',
        is_active: false,
    });
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                email: initialData.email || '',
                bio: initialData.bio || '',
                avatar_url: initialData.avatar_url || '',
                banner_url: initialData.banner_url || '',
                location: initialData.location || '',
                social_instagram: initialData.social_instagram || '',
                is_active: initialData.is_active || false,
            });
            if (initialData.avatar_url) setAvatarPreview(initialData.avatar_url);
            if (initialData.banner_url) setBannerPreview(initialData.banner_url);
        } else {
             setFormData({
                name: '', email: '', bio: '', avatar_url: '',
                banner_url: '', location: '', social_instagram: '', is_active: false
            });
            setAvatarPreview(null);
            setBannerPreview(null);
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
         if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'banner') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (field === 'avatar') {
                    setFormData(prev => ({ ...prev, avatar_url: result }));
                    setAvatarPreview(result);
                } else {
                    setFormData(prev => ({ ...prev, banner_url: result }));
                    setBannerPreview(result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name.trim() && formData.email.trim()) {
            const dataToSubmit = { ...formData };
            if (!dataToSubmit.avatar_url.trim()) {
                dataToSubmit.avatar_url = `https://picsum.photos/seed/${formData.name.replace(/\s+/g, '') || Date.now()}/200`;
            }
            onSubmit(dataToSubmit);
        } else {
            alert('Por favor, preencha os campos obrigatórios: Nome e Email.');
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
            <div>
                <label htmlFor="bio" className="block text-sm font-medium text-neutral-700 mb-1">Bio</label>
                <textarea id="bio" name="bio" value={formData.bio} onChange={handleChange} className={inputClass} rows={3}></textarea>
            </div>
            <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700">Avatar</label>
                <div className="flex items-center space-x-4">
                    {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-16 h-16 rounded-full object-cover"/>
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                    )}
                    <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
                    <label htmlFor="avatar-upload" className="cursor-pointer bg-white py-2 px-3 border border-neutral-300 rounded-md shadow-sm text-sm leading-4 font-medium text-neutral-700 hover:bg-neutral-50">Alterar</label>
                </div>
            </div>
            <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700">Banner</label>
                <div className="flex items-center space-x-4">
                     {bannerPreview ? (
                        <img src={bannerPreview} alt="Banner" className="w-full h-24 object-cover rounded-md"/>
                    ) : (
                        <div className="w-full h-24 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-400">
                           <span>Pré-visualização do Banner</span>
                        </div>
                    )}
                </div>
                 <input type="file" id="banner-upload" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} />
                 <label htmlFor="banner-upload" className="cursor-pointer inline-block mt-2 bg-white py-2 px-3 border border-neutral-300 rounded-md shadow-sm text-sm leading-4 font-medium text-neutral-700 hover:bg-neutral-50">Escolher Banner</label>
            </div>
             <div>
                <label htmlFor="location" className="block text-sm font-medium text-neutral-700 mb-1">Localização</label>
                <input id="location" name="location" type="text" value={formData.location} onChange={handleChange} className={inputClass} placeholder="Cidade, País"/>
            </div>
            <div>
                <label htmlFor="social_instagram" className="block text-sm font-medium text-neutral-700 mb-1">Instagram</label>
                <input id="social_instagram" name="social_instagram" type="text" value={formData.social_instagram} onChange={handleChange} className={inputClass} placeholder="usuario_instagram"/>
            </div>

            <div className="pt-2">
                 <div className="flex items-center">
                    <input id="is_active" name="is_active" type="checkbox" checked={formData.is_active} onChange={handleChange} className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 rounded" />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-neutral-900">Fotógrafo Ativo</label>
                </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors">
                    Cancelar
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors">
                    {initialData ? 'Salvar Alterações' : 'Criar Fotógrafo'}
                </button>
            </div>
        </form>
    );
};

export default PhotographerForm;
