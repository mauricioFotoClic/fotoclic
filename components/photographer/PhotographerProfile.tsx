
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';

interface PhotographerProfileProps {
    user: User;
    onProfileUpdate?: () => void;
}

type FormData = Partial<Omit<User, 'id' | 'role' | 'is_active' | 'email'>>;

const PhotographerProfile: React.FC<PhotographerProfileProps> = ({ user, onProfileUpdate }) => {
    const [formData, setFormData] = useState<FormData>({});
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Crop Modal State
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [tempAvatarSrc, setTempAvatarSrc] = useState<string | null>(null);
    const [cropZoom, setCropZoom] = useState(1);
    const [cropY, setCropY] = useState(50); // 0 to 100%
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true);
            const userData = await api.getPhotographerById(user.id);
            if (userData) {
                setFormData({
                    name: userData.name,
                    bio: userData.bio,
                    avatar_url: userData.avatar_url,
                    banner_url: userData.banner_url,
                    location: userData.location,
                    social_instagram: userData.social_instagram,
                });
                setAvatarPreview(userData.avatar_url);
                setBannerPreview(userData.banner_url || null);
            }
        } catch (error) {
            console.error("Failed to fetch profile", error);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'banner') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (field === 'avatar') {
                    // Instead of setting immediately, open crop modal
                    setTempAvatarSrc(result);
                    setCropZoom(1);
                    setCropY(50);
                    setIsCropModalOpen(true);
                    // Reset input so same file can be selected again if cancelled
                    if (fileInputRef.current) fileInputRef.current.value = '';
                } else {
                    setFormData(prev => ({ ...prev, banner_url: result }));
                    setBannerPreview(result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const generateCroppedImage = async () => {
        if (!tempAvatarSrc) return;

        return new Promise<string>((resolve) => {
            const img = new Image();
            img.src = tempAvatarSrc;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const size = 400; // Output resolution
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                // Background color (optional, just in case)
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, size, size);

                // Calculate logic to mimic object-fit: cover
                const scale = Math.max(size / img.width, size / img.height) * cropZoom;
                const x = (size / 2) - (img.width / 2) * scale;
                
                // Calculate Y based on percentage (0% = top, 50% = center, 100% = bottom)
                // We need to calculate the total vertical space we can move
                const scaledHeight = img.height * scale;
                const hiddenHeight = scaledHeight - size;
                // If cropY is 0, we want y = 0 (align top) IF zoom is high enough? 
                // Actually, let's align closely to CSS object-position: 50% Y%
                
                // Simplified approach: Center the image, then offset by the slider difference
                // Center Y would be: (size - scaledHeight) / 2
                // The slider goes from 0 to 100. 50 is center.
                // Let's map 0..100 to the range of movement.
                
                const centerY = (size - scaledHeight) / 2;
                // Move relative to center. 
                // If cropY = 0 (Top), y should be 0.
                // If cropY = 100 (Bottom), y should be size - scaledHeight.
                
                // Let's trust the standard math:
                // Destination Y = (CanvasHeight - ScaledImageHeight) * (PositionPercentage / 100)
                const y = (size - scaledHeight) * (cropY / 100);

                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
        });
    };

    const handleConfirmCrop = async () => {
        const croppedImage = await generateCroppedImage();
        if (croppedImage) {
            setFormData(prev => ({ ...prev, avatar_url: croppedImage }));
            setAvatarPreview(croppedImage);
        }
        setIsCropModalOpen(false);
        setTempAvatarSrc(null);
    };

    const handleCancelCrop = () => {
        setIsCropModalOpen(false);
        setTempAvatarSrc(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.updatePhotographer(user.id, formData);
            if (onProfileUpdate) {
                onProfileUpdate();
            }
            alert('Perfil atualizado com sucesso!');
        } catch (error) {
            console.error("Failed to update profile", error);
            alert('Ocorreu um erro ao atualizar o perfil.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Spinner />;

    const inputClass = "w-full px-3 py-2 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-secondary focus:border-transparent transition-all";

    return (
        <div>
            <h1 className="text-3xl font-display font-bold text-primary-dark mb-6">Meu Perfil</h1>
            
            <div className="bg-white rounded-lg shadow-md p-6">
                <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
                    {/* Imagens */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                         <div className="flex flex-col items-center">
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Foto de Perfil</label>
                            <div className="relative group">
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Avatar" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-sm"/>
                                ) : (
                                    <div className="w-32 h-32 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                                         <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                    </div>
                                )}
                                <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-secondary text-white p-2 rounded-full cursor-pointer shadow-md hover:bg-opacity-90 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </label>
                                <input 
                                    type="file" 
                                    id="avatar-upload" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={(e) => handleFileChange(e, 'avatar')}
                                    ref={fileInputRef} 
                                />
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label className="block text-sm font-medium text-neutral-700 mb-2">Banner do Perfil</label>
                            <div className="relative group w-full h-32 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200">
                                 {bannerPreview ? (
                                    <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                       <span>Sem banner</span>
                                    </div>
                                )}
                                <label htmlFor="banner-upload" className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 cursor-pointer transition-all opacity-0 group-hover:opacity-100">
                                    <span className="bg-white text-neutral-800 px-3 py-1 rounded-full text-sm font-medium shadow-sm">Alterar Banner</span>
                                </label>
                                <input type="file" id="banner-upload" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} />
                            </div>
                            <p className="text-xs text-neutral-500 mt-2">Recomendado: 1500x400px.</p>
                        </div>
                    </div>
                    
                    {/* Campos de Texto */}
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">Nome de Exibição</label>
                            <input id="name" name="name" type="text" value={formData.name || ''} onChange={handleChange} className={inputClass} />
                        </div>
                        
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-neutral-700 mb-1">Biografia</label>
                            <textarea id="bio" name="bio" value={formData.bio || ''} onChange={handleChange} className={inputClass} rows={4} placeholder="Conte um pouco sobre você e seu estilo fotográfico..."></textarea>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="location" className="block text-sm font-medium text-neutral-700 mb-1">Localização</label>
                                <input id="location" name="location" type="text" value={formData.location || ''} onChange={handleChange} className={inputClass} placeholder="Ex: São Paulo, Brasil" />
                            </div>
                             <div>
                                <label htmlFor="social_instagram" className="block text-sm font-medium text-neutral-700 mb-1">Instagram (usuário)</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-3 flex items-center text-neutral-500">@</span>
                                    <input id="social_instagram" name="social_instagram" type="text" value={formData.social_instagram || ''} onChange={handleChange} className={`${inputClass} pl-8`} placeholder="seu.usuario" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t flex justify-end">
                        <button 
                            type="submit" 
                            disabled={saving}
                            className="px-6 py-2 text-sm font-medium text-white bg-secondary rounded-full hover:bg-opacity-90 transition-colors disabled:bg-neutral-400"
                        >
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Crop Modal */}
            {isCropModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 flex flex-col items-center">
                        <h3 className="text-lg font-display font-bold text-primary-dark mb-4">Ajustar Foto de Perfil</h3>
                        
                        <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-neutral-200 shadow-inner mb-6 bg-neutral-100">
                            {tempAvatarSrc && (
                                <img 
                                    src={tempAvatarSrc} 
                                    alt="Preview" 
                                    className="w-full h-full object-cover"
                                    style={{
                                        transform: `scale(${cropZoom})`,
                                        objectPosition: `50% ${cropY}%`,
                                        transition: 'none' // Remove transition for smooth dragging feel
                                    }}
                                />
                            )}
                        </div>

                        <div className="w-full space-y-4 mb-6">
                            <div>
                                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                                    <span>Zoom</span>
                                    <span>{cropZoom.toFixed(1)}x</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="3" 
                                    step="0.1" 
                                    value={cropZoom}
                                    onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-secondary"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                                    <span>Posição Vertical</span>
                                    <span>{cropY === 0 ? 'Topo' : cropY === 100 ? 'Fundo' : 'Centro'}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    step="1" 
                                    value={cropY}
                                    onChange={(e) => setCropY(parseInt(e.target.value))}
                                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-secondary"
                                />
                            </div>
                        </div>

                        <div className="flex space-x-3 w-full">
                            <button 
                                onClick={handleCancelCrop}
                                className="flex-1 px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleConfirmCrop}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotographerProfile;
