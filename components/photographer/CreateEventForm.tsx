
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
