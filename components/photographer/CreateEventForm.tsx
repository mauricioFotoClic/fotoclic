
import React, { useState } from 'react';
import { PhotoEvent, Category } from '../../types';

interface CreateEventFormProps {
    onSubmit: (data: Omit<PhotoEvent, 'id' | 'created_at' | 'photographer_id'>) => Promise<void>;
    onCancel: () => void;
    categories: Category[];
    initialData?: PhotoEvent;
}

const CreateEventForm: React.FC<CreateEventFormProps> = ({ onSubmit, onCancel, categories, initialData }) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        category_id: initialData?.category_id || '',
        description: initialData?.description || '',
        location: initialData?.location || '',
        event_date: initialData?.event_date ? new Date(initialData.event_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        cover_photo_url: initialData?.cover_photo_url || ''
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error("Error submitting event:", error);
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-3 py-2 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition-all";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Nome do Evento *</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={inputClass}
                    required
                    placeholder="Ex: Casamento Maria e João"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Categoria *</label>
                <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                    className={inputClass}
                    required
                >
                    <option value="">Selecione uma categoria</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Data do Evento</label>
                    <input
                        type="date"
                        name="event_date"
                        value={formData.event_date}
                        onChange={handleChange}
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Local</label>
                    <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Ex: Espaço Gardens"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Descrição</label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className={inputClass}
                    rows={3}
                    placeholder="Detalhes opcionais sobre o evento..."
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Capa do Evento (Opcional)</label>
                <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24 bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200 flex-shrink-0">
                        {formData.cover_photo_url ? (
                            <img src={formData.cover_photo_url} alt="Capa" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex items-center justify-center w-full h-full text-neutral-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    // Resize and Base64
                                    const img = new Image();
                                    img.src = URL.createObjectURL(file);
                                    await new Promise(r => img.onload = r);

                                    const canvas = document.createElement('canvas');
                                    const MAX_SIZE = 800; // Adequate for cover
                                    let w = img.width;
                                    let h = img.height;

                                    if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
                                    else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }

                                    canvas.width = w;
                                    canvas.height = h;
                                    const ctx = canvas.getContext('2d');
                                    ctx?.drawImage(img, 0, 0, w, h);

                                    const base64 = canvas.toDataURL('image/jpeg', 0.8);
                                    setFormData(prev => ({ ...prev, cover_photo_url: base64 }));
                                }
                            }}
                            className="text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-light file:text-primary hover:file:bg-primary-light/80"
                        />
                        <p className="text-xs text-neutral-400 mt-1">Recomendado: 800x600px ou superior.</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors flex items-center"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Salvando...
                        </>
                    ) : (
                        'Salvar Evento'
                    )}
                </button>
            </div>
        </form>
    );
};

export default CreateEventForm;
