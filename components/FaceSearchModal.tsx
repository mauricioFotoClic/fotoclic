
import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Search, Camera } from 'lucide-react';
import { faceRecognitionService } from '../services/faceRecognition';
import api from '../services/api';
import { Photo } from '../types';
import Spinner from './Spinner';

interface FaceSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (page: any) => void;
    onAddToCart: (id: string) => void;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const FaceSearchModal: React.FC<FaceSearchModalProps> = ({ isOpen, onClose, onNavigate, onAddToCart, onShowToast }) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<Photo[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Preload models as soon as the modal opens to save time
            faceRecognitionService.loadModels().catch(err => console.error("Failed to preload models", err));
        }
    }, [isOpen]);

    if (!isOpen) return null;



    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setSelectedImage(ev.target?.result as string);
                setResults([]);
                setHasSearched(false);
            };
            reader.readAsDataURL(file);
        }
    };

    // Camera State
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        return () => {
            // Cleanup stream on unmount
            stopCamera();
        }
    }, []);

    const startCamera = async () => {
        try {
            setIsCameraOpen(true);
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            onShowToast("Não foi possível acessar a câmera. Verifique as permissões.", 'error');
            setIsCameraOpen(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Flip horizontally if it's a selfie to match mirror effect usually expect
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(videoRef.current, 0, 0);

                const dataUrl = canvas.toDataURL('image/jpeg');
                setSelectedImage(dataUrl);
                setResults([]);
                setHasSearched(false);
                stopCamera();
            }
        }
    };

    const handleSearch = async () => {
        if (!selectedImage) return;

        setIsProcessing(true);
        setHasSearched(false);
        const startTime = performance.now();

        try {
            // Create an image element from the data URL
            const img = new Image();
            img.src = selectedImage;
            await new Promise((resolve) => { img.onload = resolve; });

            // Unblock UI to let spinner render
            await new Promise(resolve => setTimeout(resolve, 100));

            // 1. Get descriptor
            const descriptor = await faceRecognitionService.getFaceDescriptor(img, (status) => {
                // Show status in UI via toast or other method
                console.log(status);
                onShowToast(status, 'info'); // User wants feedback if it's slow
            });

            if (!descriptor) {
                onShowToast("Nenhum rosto detectado na imagem. Tente outra foto.", 'error');
                setIsProcessing(false);
                return;
            }

            // 2. Search matches
            const matches = await faceRecognitionService.searchMatches(descriptor);
            const matchedIds = matches.map(m => m.id);

            console.log("Valid Matches after Filter:", matches);

            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(1);

            if (matchedIds.length === 0) {
                setResults([]);
            } else {
                // 3. Fetch photos
                const photos = await api.getPhotosByIds(matchedIds);
                setResults(photos);
                if (photos.length > 0) {
                    onShowToast(`${photos.length} fotos encontradas em ${duration}s!`, 'success');
                } else {
                    onShowToast(`Nenhuma foto correspondente encontrada (${duration}s).`, 'info');
                }
            }

            setHasSearched(true);

        } catch (error) {
            console.error("Erro na busca facial:", error);
            onShowToast("Ocorreu um erro ao processar a busca.", 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-5xl md:rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">

                {/* Mobile Header / Desktop Header */}
                <div className="flex-none p-4 md:p-6 border-b border-neutral-100 flex justify-between items-center bg-white/90 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-blue-200 shadow-lg">
                            <Camera size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-display font-bold text-neutral-900 tracking-tight">Reconhecimento Facial</h2>
                            <p className="text-xs md:text-sm text-neutral-500 font-medium">Encontre você nas fotos</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-neutral-100 h hover:bg-neutral-200 rounded-full transition-all text-neutral-600 active:scale-95"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Main Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto bg-neutral-50/50 relative">
                    {/* CAMERA OVERLAY */}
                    {isCameraOpen && (
                        <div className="absolute inset-0 z-30 bg-black flex flex-col items-center justify-center">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover md:object-contain transform -scale-x-100"
                            />
                            <div className="absolute bottom-8 flex gap-4">
                                <button
                                    onClick={stopCamera}
                                    className="px-6 py-3 rounded-full bg-white/20 backdrop-blur text-white font-medium hover:bg-white/30 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={capturePhoto}
                                    className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-transparent hover:bg-white/20 transition-all"
                                >
                                    <div className="w-12 h-12 bg-white rounded-full"></div>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="min-h-full p-4 md:p-8 flex flex-col">

                        {/* State 1: Results Display (When searched) */}
                        {hasSearched && (
                            <div className="animate-in slide-in-from-bottom-5 fade-in duration-500">
                                {/* Compact Search Header */}
                                <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-sm border border-neutral-100">
                                    <div className="flex items-center gap-4">
                                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-md ring-2 ring-blue-100">
                                                <img src={selectedImage!} alt="Sua selfie" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Upload size={16} className="text-white" />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-neutral-900 text-lg">
                                                {results.length > 0 ? `${results.length} fotos encontradas` : "Nenhuma imagem"}
                                            </h3>
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-blue-600 text-sm font-medium hover:underline"
                                            >
                                                Tentar outra foto
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Results Grid */}
                                {results.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                                        {results.map(photo => (
                                            <div key={photo.id} className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 ring-1 ring-neutral-100">
                                                <div className="aspect-[2/3] overflow-hidden bg-neutral-200">
                                                    <img
                                                        src={photo.preview_url}
                                                        alt={photo.title}
                                                        loading="lazy"
                                                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                                    />
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                                    <p className="text-white font-medium text-sm mb-2 line-clamp-1">{photo.title}</p>
                                                    <button
                                                        onClick={() => {
                                                            onClose();
                                                            onNavigate({ name: 'photo-detail', id: photo.id });
                                                        }}
                                                        className="w-full bg-white/20 backdrop-blur-md border border-white/30 text-white font-semibold py-2.5 rounded-xl hover:bg-white hover:text-black transition-all text-sm"
                                                    >
                                                        Ver Detalhes
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                                            <Search size={32} className="text-neutral-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-neutral-900 mb-2">Sem resultados</h3>
                                        <p className="text-neutral-500 max-w-xs mx-auto">Não encontramos fotos com esse rosto. Tente uma selfie com melhor iluminação.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* State 2: Initial Upload (Not searched yet) */}
                        {!hasSearched && (
                            <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full animate-in zoom-in-95 duration-300">
                                <div className="w-full bg-white rounded-3xl p-6 md:p-10 shadow-xl border border-neutral-100 text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-600"></div>

                                    <div className="mb-8">
                                        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                            <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
                                            <Camera size={40} className="text-blue-600" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-neutral-900 mb-3">Tire ou envie uma selfie</h3>
                                        <p className="text-neutral-500 leading-relaxed">
                                            Usamos inteligência artificial para encontrar todas as fotos onde você aparece.
                                            <br className="hidden md:block" /> Sua privacidade é protegida.
                                        </p>
                                    </div>


                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div
                                            onClick={startCamera}
                                            className="border-2 border-dashed border-neutral-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-2xl p-6 cursor-pointer transition-all duration-300 group flex flex-col items-center justify-center text-center h-48"
                                        >
                                            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-blue-600">
                                                <Camera size={28} />
                                            </div>
                                            <span className="font-semibold text-neutral-800 text-sm">Tirar Selfie</span>
                                            <span className="text-xs text-neutral-400 mt-1">Usar Câmera</span>
                                        </div>

                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="border-2 border-dashed border-neutral-200 hover:border-purple-400 hover:bg-purple-50/50 rounded-2xl p-6 cursor-pointer transition-all duration-300 group flex flex-col items-center justify-center text-center h-48"
                                        >
                                            {selectedImage ? (
                                                <div className="relative w-full h-full rounded-xl overflow-hidden">
                                                    <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Upload className="text-white" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-purple-600">
                                                        <Upload size={28} />
                                                    </div>
                                                    <span className="font-semibold text-neutral-800 text-sm">Enviar Foto</span>
                                                    <span className="text-xs text-neutral-400 mt-1">Da Galeria</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-2">
                                        <button
                                            onClick={handleSearch}
                                            disabled={!selectedImage || isProcessing}
                                            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-lg hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden"
                                        >
                                            {/* Standard Spinner inside button */}
                                            {isProcessing ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span>Processando...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <Search size={22} />
                                                    <span>Encontrar Minhas Fotos</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Full Modal Spinner Overlay */}
                                {isProcessing && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-200">
                                        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4 shadow-lg"></div>
                                        <p className="text-lg font-semibold text-neutral-800 animate-pulse">Buscando você...</p>
                                        <p className="text-sm text-neutral-500">Isso leva apenas alguns segundos</p>
                                    </div>
                                )}

                                <div className="mt-6 text-center">
                                    <p className="text-xs text-neutral-400 flex items-center justify-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                        Sua foto é apagada logo após a busca
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>



                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />
            </div>
        </div>
    );
};

export default FaceSearchModal;
