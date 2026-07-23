
import React, { useState } from 'react';
import { Photo, PhotoEvent } from '../../types';

interface BatchUploadFormProps {
    event: PhotoEvent;
    photographerId: string;
    existingFolders?: string[];
    existingPhotos?: Photo[];
    onSubmit: (
        files: File[],
        metadata: { price: number, tags: string[], is_public: boolean, sub_group?: string | null },
        onProgress: (stats: { current: number, total: number, successes: number, failures: number }) => void
    ) => Promise<{ successCount: number; failCount: number; failedFiles: Array<{ name: string; reason: string }> }>;
    onCancel: () => void;
}

const BatchUploadForm: React.FC<BatchUploadFormProps> = ({ event, photographerId, existingFolders = [], existingPhotos = [], onSubmit, onCancel }) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [skipDuplicates, setSkipDuplicates] = useState(true);
    const [price, setPrice] = useState<string>('');
    const [tags, setTags] = useState<string>('');
    const [isPublic, setIsPublic] = useState(true);
    const [subGroupMode, setSubGroupMode] = useState<'none' | 'select' | 'new'>(existingFolders.length > 0 ? 'select' : 'none');
    const [selectedSubGroup, setSelectedSubGroup] = useState<string>(existingFolders[0] || '');
    const [newSubGroup, setNewSubGroup] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number, successes: number, failures: number }>({ current: 0, total: 0, successes: 0, failures: 0 });
    const [uploadResult, setUploadResult] = useState<{
        successCount: number;
        failCount: number;
        failedFiles: Array<{ name: string; reason: string }>;
    } | null>(null);
    const [showResults, setShowResults] = useState(false);

    // Build deduplication index of existing photos in event
    const existingFileMap = React.useMemo(() => {
        const set = new Set<string>();
        existingPhotos.forEach(p => {
            if (p.original_filename) set.add(p.original_filename.toLowerCase());
            if (p.title) set.add(p.title.toLowerCase());
        });
        return set;
    }, [existingPhotos]);

    const { newFiles, duplicateFiles } = React.useMemo(() => {
        const newF: File[] = [];
        const dupF: File[] = [];
        selectedFiles.forEach(f => {
            if (existingFileMap.has(f.name.toLowerCase())) {
                dupF.push(f);
            } else {
                newF.push(f);
            }
        });
        return { newFiles: newF, duplicateFiles: dupF };
    }, [selectedFiles, existingFileMap]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedFiles.length === 0) {
            alert("Selecione pelo menos um arquivo.");
            return;
        }

        const filesToUpload = (duplicateFiles.length > 0 && skipDuplicates) ? newFiles : selectedFiles;

        if (filesToUpload.length === 0) {
            alert("Todas as fotos selecionadas já foram enviadas para este evento anteriormente!");
            return;
        }

        const numPrice = parseFloat(price.replace(',', '.'));
        if (isNaN(numPrice) || numPrice < 10) {
            alert("O preço mínimo por foto deve ser de R$ 10,00.");
            return;
        }

        setIsUploading(true);
        setUploadProgress({ current: 0, total: filesToUpload.length, successes: 0, failures: 0 });
        setUploadResult(null);
        setShowResults(false);

        const subGroupValue = subGroupMode === 'select' ? selectedSubGroup : subGroupMode === 'new' ? newSubGroup.trim() : null;

        try {
            const result = await onSubmit(filesToUpload, {
                price: numPrice,
                tags: tags.split(',').map(t => t.trim()).filter(t => t),
                is_public: isPublic,
                sub_group: subGroupValue
            }, (stats) => {
                setUploadProgress(stats);
            });

            if (result && result.failCount > 0) {
                setUploadResult(result);
                setShowResults(true);
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Erro inesperado ao enviar arquivos.");
        } finally {
            setIsUploading(false);
        }
    };

    const inputClass = "w-full px-3 py-2 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition-all";

    if (showResults && uploadResult) {
        return (
            <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start space-x-3">
                    <div className="p-2 bg-amber-100 text-amber-700 rounded-full flex-shrink-0">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="font-semibold text-amber-900">Upload Concluído com Erros</h4>
                        <p className="text-sm text-amber-700">
                            Alguns arquivos não puderam ser enviados. Verifique os motivos individuais abaixo.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-100 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">{uploadResult.successCount}</div>
                        <div className="text-xs text-green-700 font-medium uppercase tracking-wider">Enviado(s)</div>
                    </div>
                    <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-500">{uploadResult.failCount}</div>
                        <div className="text-xs text-red-700 font-medium uppercase tracking-wider">Com Falha</div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-neutral-800">
                        Detalhes das Falhas ({uploadResult.failedFiles.length} arquivos)
                    </label>
                    <div className="max-h-60 overflow-y-auto border border-neutral-200 rounded-lg divide-y divide-neutral-100 bg-white">
                        {uploadResult.failedFiles.map((errFile, idx) => (
                            <div key={idx} className="p-3 hover:bg-neutral-50 transition-colors flex items-start space-x-3">
                                <span className="mt-0.5 text-red-500 flex-shrink-0">
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </span>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-semibold text-neutral-800 break-all">{errFile.name}</p>
                                    <p className="text-xs text-red-600 font-medium leading-relaxed">{errFile.reason}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                    <button
                        type="button"
                        onClick={() => {
                            const failedNames = new Set(uploadResult.failedFiles.map(f => f.name));
                            const remainingFiles = selectedFiles.filter(f => failedNames.has(f.name));
                            setSelectedFiles(remainingFiles);
                            setUploadResult(null);
                            setShowResults(false);
                        }}
                        className="px-4 py-2 text-sm font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full hover:bg-primary/20 transition-colors"
                    >
                        Ajustar Falhas
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-2 text-sm font-bold text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors shadow-md"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-primary/10 p-4 rounded-md border border-primary/20">
                <h4 className="font-semibold text-primary mb-1">Evento: {event.name}</h4>
                <p className="text-sm text-primary-dark">As fotos e vídeos serão adicionados automaticamente a este evento.</p>
            </div>

            {isUploading ? (
                <div className="py-8 text-center space-y-4">
                    <div className="flex justify-between text-xs font-semibold px-1">
                        <span className="text-green-600">{uploadProgress.successes} Sucessos</span>
                        <span className="text-red-500">{uploadProgress.failures} Falhas</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-4 overflow-hidden">
                        <div
                            className={`h-4 rounded-full transition-all duration-300 ease-out ${uploadProgress.failures > 0 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${(uploadProgress.current / Math.max(uploadProgress.total, 1)) * 100}%` }}
                        ></div>
                    </div>
                    <p className="text-neutral-600 font-medium">
                        Processando arquivo {uploadProgress.current} de {uploadProgress.total}...
                    </p>
                    {uploadProgress.failures > 0 && (
                        <p className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">
                            Alguns arquivos falharam. Veja os motivos individuais na próxima tela.
                        </p>
                    )}
                    <p className="text-sm text-neutral-400">Por favor, não feche esta janela ou mude de página.</p>
                </div>
            ) : (
                <>
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Selecione as Fotos e Vídeos *</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-neutral-300 border-dashed rounded-md hover:bg-neutral-50 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
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
                                    <p className="text-xs text-neutral-500">JPG, PNG, WebP, HEIC, MP4, MOV (Máx 90s)</p>
                                <p className="text-xs text-primary p-1 bg-primary/10 mt-1 rounded inline-block">Nota: Fotos maiores de 15MB serão automaticamente comprimidas para 15MB, preservando a alta resolução (8K). Vídeos devem ter no máximo 90 segundos (Máx 250MB).</p>
                            </div>
                        </div>
                        {selectedFiles.length > 0 && (
                            <div className="mt-3 space-y-2">
                                <p className="text-sm text-green-700 font-semibold">
                                    ✓ {selectedFiles.length} arquivo(s) selecionado(s)
                                </p>

                                {duplicateFiles.length > 0 && (
                                    <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-lg space-y-2">
                                        <div className="flex items-center space-x-2 text-emerald-900 font-semibold text-xs sm:text-sm">
                                            <span className="p-1 bg-emerald-100 text-emerald-700 rounded-full flex-shrink-0">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </span>
                                            <span>Retomada Inteligente: {duplicateFiles.length} fotos já existem neste evento</span>
                                        </div>
                                        <p className="text-xs text-emerald-700 leading-relaxed">
                                            Detectamos que <strong>{duplicateFiles.length}</strong> das {selectedFiles.length} fotos selecionadas já foram enviadas anteriormente.
                                        </p>
                                        <label className="flex items-center gap-2 pt-1 text-xs font-bold text-emerald-900 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={skipDuplicates}
                                                onChange={(e) => setSkipDuplicates(e.target.checked)}
                                                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                            />
                                            <span>Pular fotos já enviadas (Continuar upload enviando apenas {newFiles.length} novas)</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Preço unitário (R$) *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="10"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className={inputClass}
                                required
                                disabled={isUploading}
                                placeholder="10,00"
                            />
                            <p className="text-xs text-red-500 mt-1 font-semibold">⚠️ Mínimo: R$ 10,00 por foto</p>
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

                    <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200/80">
                        <label className="block text-sm font-semibold text-neutral-800 mb-2">Organizar em Pastas / Dias de Evento? (Opcional)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                            <label className="flex items-center gap-2 p-2.5 bg-white border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-50">
                                <input
                                    type="radio"
                                    name="subGroupMode"
                                    checked={subGroupMode === 'none'}
                                    onChange={() => setSubGroupMode('none')}
                                    className="text-primary focus:ring-primary"
                                    disabled={isUploading}
                                />
                                <span className="text-xs text-neutral-700 font-medium">Não organizar</span>
                            </label>
                            {existingFolders.length > 0 && (
                                <label className="flex items-center gap-2 p-2.5 bg-white border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-50">
                                    <input
                                        type="radio"
                                        name="subGroupMode"
                                        checked={subGroupMode === 'select'}
                                        onChange={() => setSubGroupMode('select')}
                                        className="text-primary focus:ring-primary"
                                        disabled={isUploading}
                                    />
                                    <span className="text-xs text-neutral-700 font-medium">Pasta existente</span>
                                </label>
                            )}
                            <label className="flex items-center gap-2 p-2.5 bg-white border border-neutral-200 rounded-md cursor-pointer hover:bg-neutral-50">
                                <input
                                    type="radio"
                                    name="subGroupMode"
                                    checked={subGroupMode === 'new'}
                                    onChange={() => setSubGroupMode('new')}
                                    className="text-primary focus:ring-primary"
                                    disabled={isUploading}
                                />
                                <span className="text-xs text-neutral-700 font-medium">Criar nova pasta</span>
                            </label>
                        </div>

                        {subGroupMode === 'select' && existingFolders.length > 0 && (
                            <div>
                                <label htmlFor="select_subgroup" className="block text-xs font-medium text-neutral-500 mb-1">Escolha a pasta *</label>
                                <select
                                    id="select_subgroup"
                                    value={selectedSubGroup}
                                    onChange={(e) => setSelectedSubGroup(e.target.value)}
                                    className={inputClass}
                                    disabled={isUploading}
                                >
                                    {existingFolders.map(folder => (
                                        <option key={folder} value={folder}>{folder}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {subGroupMode === 'new' && (
                            <div>
                                <label htmlFor="new_subgroup" className="block text-xs font-medium text-neutral-500 mb-1">Nome da nova pasta *</label>
                                <input
                                    id="new_subgroup"
                                    type="text"
                                    value={newSubGroup}
                                    onChange={(e) => setNewSubGroup(e.target.value)}
                                    className={inputClass}
                                    disabled={isUploading}
                                    placeholder="Ex: Dia 1, Sábado, Finais"
                                    required={subGroupMode === 'new'}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex items-center">
                            <input
                                id="is_public_batch"
                                type="checkbox"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 rounded"
                                disabled={isUploading}
                            />
                            <label htmlFor="is_public_batch" className="ml-2 block text-sm text-neutral-900">Tornar estes arquivos públicos no marketplace</label>
                        </div>

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
                            {isUploading ? 'Enviando...' : `Enviar ${selectedFiles.length > 0 ? selectedFiles.length : ''} Arquivos`}
                        </button>
                    </div>
                </>
            )}
        </form>
    );
};

export default BatchUploadForm;


