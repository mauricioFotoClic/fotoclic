
import React, { useState, useEffect } from 'react';
import { Photo, Category } from '../../types';

type FormData = Omit<Photo, 'id' | 'upload_date' | 'moderation_status' | 'rejection_reason' | 'likes' | 'liked_by_users'>;

interface PhotoUploadFormProps {
    onSubmit: (data: FormData) => Promise<void> | void;
    onCancel: () => void;
    initialData: Photo | null;
    photographerId: string;
    categories: Category[];
}

const PhotoUploadForm: React.FC<PhotoUploadFormProps> = ({ onSubmit, onCancel, initialData, photographerId, categories }) => {
    const [formData, setFormData] = useState<FormData>({
        title: '',
        description: '',
        price: 0,
        photographer_id: photographerId,
        category_id: '',
        preview_url: '',
        file_url: '',
        resolution: '4K',
        width: 0,
        height: 0,
        tags: [],
        is_public: true,
        is_featured: false,
    });
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isProcessingImage, setIsProcessingImage] = useState(false);

    const isEditing = !!initialData;
    const isApproved = initialData?.moderation_status === 'approved';

    useEffect(() => {
        if (initialData) {
            // Explicitly map fields to avoid spreading 'id', 'upload_date', 'likes' etc. which are not in DB update schema
            setFormData({
                title: initialData.title,
                description: initialData.description || '',
                price: Number(initialData.price),
                photographer_id: photographerId,
                category_id: initialData.category_id,
                preview_url: initialData.preview_url,
                file_url: initialData.file_url || '',
                resolution: initialData.resolution,
                width: initialData.width,
                height: initialData.height,
                tags: initialData.tags || [],
                is_public: initialData.is_public,
                is_featured: initialData.is_featured,
            });
            if (initialData.preview_url) setPreviewImage(initialData.preview_url);
        } else {
            setFormData({
                title: '', description: '', price: 0,
                photographer_id: photographerId,
                category_id: categories[0]?.id || '',
                preview_url: '', file_url: '',
                resolution: '4K',
                width: 0, height: 0,
                tags: [], is_public: true,
                is_featured: false,
            });
            setPreviewImage(null);
        }
    }, [initialData, photographerId, categories]);

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsProcessingImage(true);
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;

                // Compress logic
                const img = new Image();
                img.src = result;
                img.onload = () => {
                    // Max dimensions to avoid DB timeout with large base64 strings
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    let width = img.naturalWidth;
                    let height = img.naturalHeight;

                    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                        if (width > height) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        } else {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    let finalDataUrl = result;

                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        // Compress to JPEG with 0.7 quality
                        finalDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    }

                    setFormData(prev => ({
                        ...prev,
                        preview_url: finalDataUrl,
                        file_url: finalDataUrl,
                        width: Math.round(width),
                        height: Math.round(height)
                    }));
                    setPreviewImage(finalDataUrl);
                    setIsProcessingImage(false);
                };
            }
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.title.trim() && formData.category_id && formData.preview_url) {
            setIsSubmitting(true);
            try {
                await onSubmit(formData);
            } catch (error) {
                console.error("Error submitting form", error);
                alert("Houve um erro ao enviar a foto. Por favor, tente novamente.");
            } finally {
                setIsSubmitting(false);
            }
        } else {
            alert('Por favor, preencha todos os campos obrigatórios (*).');
        }
    };

    const inputClass = "w-full px-3 py-2 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition-all";

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Imagem da Foto {isApproved ? '(Travada pela Moderação)' : isEditing ? '(Não editável)' : '*'}
                </label>
                <div className={`mt-1 p-4 border-2 rounded-md ${isEditing ? 'border-solid border-neutral-200 bg-neutral-50' : 'border-dashed border-neutral-200'}`}>
                    {previewImage ? (
                        <div className="relative flex justify-center">
                            <img src={previewImage} alt="Pré-visualização" className="w-full h-48 object-contain rounded-md" />
                            {formData.width > 0 && (
                                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-md">
                                    {formData.width} x {formData.height}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-full h-48 bg-neutral-100 rounded-md flex items-center justify-center text-neutral-400 text-center p-4">
                            {isProcessingImage ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin"></div>
                                    Processando imagem...
                                </span>
                            ) : (
                                <span>Clique para selecionar uma imagem</span>
                            )}
                        </div>
                    )}

                    {!isEditing && !isApproved ? (
                        <>
                            <input
                                id="preview_upload"
                                name="preview_url"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                                disabled={isSubmitting || isProcessingImage}
                            />
                            <label htmlFor="preview_upload" className={`mt-4 cursor-pointer w-full inline-block text-center bg-white py-2 px-3 border border-neutral-300 rounded-md shadow-sm text-sm leading-4 font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${(isSubmitting || isProcessingImage) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {previewImage ? 'Alterar Imagem' : 'Escolher Imagem'}
                            </label>
                        </>
                    ) : (
                        <div className="mt-3 text-center">
                            {isApproved ? (
                                <p className="text-xs text-green-600 font-bold bg-green-50 p-2 rounded border border-green-100 inline-block">
                                    <span className="mr-1">✓</span> Esta imagem já foi aprovada e não pode ser alterada. Você pode editar as informações abaixo.
                                </p>
                            ) : (
                                <p className="text-xs text-neutral-500 italic bg-yellow-50 p-2 rounded border border-yellow-100 inline-block">
                                    A imagem original não pode ser substituída após o envio para garantir a integridade da moderação.
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div>
                <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-1">Título *</label>
                <input id="title" name="title" type="text" value={formData.title} onChange={handleChange} className={inputClass} required disabled={isSubmitting} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="category_id" className="block text-sm font-medium text-neutral-700 mb-1">Categoria *</label>
                    <select id="category_id" name="category_id" value={formData.category_id} onChange={handleChange} className={inputClass} required disabled={isSubmitting}>
                        <option value="">Selecione</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="price" className="block text-sm font-medium text-neutral-700 mb-1">Preço (R$) *</label>
                    <input id="price" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} className={inputClass} required disabled={isSubmitting} />
                </div>
            </div>

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-1">Descrição</label>
                <textarea id="description" name="description" value={formData.description} onChange={handleChange} className={inputClass} rows={3} disabled={isSubmitting}></textarea>
            </div>

            <div>
                <label htmlFor="tags" className="block text-sm font-medium text-neutral-700 mb-1">Tags (separadas por vírgula)</label>
                <input id="tags" name="tags" type="text" value={formData.tags.join(', ')} onChange={handleChange} className={inputClass} disabled={isSubmitting} />
            </div>

            <div className="flex items-center">
                <input id="is_public" name="is_public" type="checkbox" checked={formData.is_public} onChange={handleChange} className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 rounded" disabled={isSubmitting} />
                <label htmlFor="is_public" className="ml-2 block text-sm text-neutral-900">Tornar esta foto pública no marketplace</label>
            </div>

            <p className="text-xs text-neutral-500 pt-2">
                {isApproved
                    ? "Suas alterações nas informações (título, preço, etc.) serão salvas automaticamente sem necessidade de nova moderação."
                    : isEditing
                        ? "Ao editar detalhes, sua foto voltará para o status de 'Pendente' para uma rápida revisão."
                        : "Após o envio, sua foto passará por um processo de moderação antes de ser publicada. Você será notificado sobre o status."
                }
            </p>

            <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || isProcessingImage}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors disabled:opacity-70 disabled:cursor-wait flex items-center min-w-[140px] justify-center shadow-lg"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            {initialData ? 'Salvando...' : 'Enviando...'}
                        </>
                    ) : (
                        initialData ? 'Salvar Alterações' : 'Enviar para Moderação'
                    )}
                </button>
            </div>
        </form>
    );
};

export default PhotoUploadForm;
