
import React, { useState } from 'react';
import { Photo, PhotoEvent } from '../../types';

interface BatchUploadFormProps {
    event: PhotoEvent;
    photographerId: string;
    onSubmit: (
        files: File[],
        metadata: { price: number, tags: string[], is_public: boolean },
        onProgress: (current: number, total: number) => void
    ) => Promise<void>;
    onCancel: () => void;
}

const BatchUploadForm: React.FC<BatchUploadFormProps> = ({ event, photographerId, onSubmit, onCancel }) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [price, setPrice] = useState<string>('');
    const [tags, setTags] = useState<string>('');
    const [isPublic, setIsPublic] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedFiles.length === 0) {
            alert("Selecione pelo menos uma foto.");
            return;
        }

        const numPrice = parseFloat(price.replace(',', '.'));
        if (isNaN(numPrice) || numPrice <= 0) {
            alert("Informe um preço válido.");
            return;
        }

        setIsUploading(true);
        setUploadProgress({ current: 0, total: selectedFiles.length });

        try {
            await onSubmit(selectedFiles, {
                price: numPrice,
                tags: tags.split(',').map(t => t.trim()).filter(t => t),
                is_public: isPublic
            }, (current, total) => {
                setUploadProgress({ current, total });
            });
        } catch (error) {
            console.error("Upload error:", error);
            alert("Erro ao enviar fotos.");
        } finally {
            setIsUploading(false);
        }
    };

    const inputClass = "w-full px-3 py-2 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition-all";

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <h4 className="font-semibold text-blue-800 mb-1">Evento: {event.name}</h4>
                <p className="text-sm text-blue-600">As fotos serão adicionadas automaticamente a este evento.</p>
            </div>

            {isUploading ? (
                <div className="py-8 text-center space-y-4">
                    <div className="w-full bg-neutral-200 rounded-full h-4 overflow-hidden">
                        <div
                            className="bg-primary h-4 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${(uploadProgress.current / Math.max(uploadProgress.total, 1)) * 100}%` }}
                        ></div>
                    </div>
                    <p className="text-neutral-600 font-medium">
                        Enviando foto {uploadProgress.current} de {uploadProgress.total}...
                    </p>
                    <p className="text-sm text-neutral-400">Por favor, não feche esta janela.</p>
                </div>
            ) : (
                <>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Selecione as Fotos *</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-300 border-dashed rounded-md hover:bg-neutral-50 transition-colors cursor-pointer relative">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={isUploading}
                            />
                            <div className="space-y-1 text-center pointer-events-none">
                                <svg className="mx-auto h-12 w-12 text-neutral-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <div className="flex text-sm text-neutral-600 justify-center">
                                    <span className="font-medium text-primary hover:text-primary-dark">Clique para selecionar</span>
                                    <span className="pl-1">ou arraste e solte</span>
                                </div>
                                <p className="text-xs text-neutral-500">PNG, JPG, JPEG até 10MB</p>
                            </div>
                        </div>
                        {selectedFiles.length > 0 && (
                            <p className="mt-2 text-sm text-green-600 font-medium">
                                {selectedFiles.length} arquivo(s) selecionado(s)
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Preço unitário (R$) *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className={inputClass}
                                required
                                disabled={isUploading}
                                placeholder="0,00"
                            />
                            <p className="text-xs text-neutral-500 mt-1">Aplicar a todas as fotos</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Tags (opcional)</label>
                            <input
                                type="text"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                className={inputClass}
                                disabled={isUploading}
                                placeholder="Ex: Cerimônia, Festa, Padrinhos"
                            />
                            <p className="text-xs text-neutral-500 mt-1">Separadas por vírgula</p>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <input
                            id="is_public_batch"
                            type="checkbox"
                            checked={isPublic}
                            onChange={(e) => setIsPublic(e.target.checked)}
                            className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 rounded"
                            disabled={isUploading}
                        />
                        <label htmlFor="is_public_batch" className="ml-2 block text-sm text-neutral-900">Tornar estas fotos públicas no marketplace</label>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isUploading}
                            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full hover:bg-neutral-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isUploading || selectedFiles.length === 0}
                            className="px-6 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors disabled:opacity-70 disabled:cursor-wait font-bold shadow-md"
                        >
                            {isUploading ? 'Enviando...' : `Enviar ${selectedFiles.length > 0 ? selectedFiles.length : ''} Fotos`}
                        </button>
                    </div>
                </>
            )}
        </form>
    );
};

export default BatchUploadForm;
