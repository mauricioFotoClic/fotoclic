
import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Search, Camera, Info, ChevronDown, User, Sun, Maximize2, Scan } from 'lucide-react';
import { faceRecognitionService } from '../services/faceRecognition';
import api from '../services/api';
import { Photo } from '../types';
import Spinner from './Spinner';
import { getOptimizedImageUrl } from '../utils/imageOptimization';
import WatermarkedImage from './WatermarkedImage';

interface FaceSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (page: any) => void;
    onAddToCart: (id: string) => void;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
    eventId?: string;
    eventName?: string;
}

const FaceSearchModal: React.FC<FaceSearchModalProps> = ({ isOpen, onClose, onNavigate, onAddToCart, onShowToast, eventId, eventName }) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<Photo[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [showTips, setShowTips] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const isMobileDevice = () => {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
        return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraOpen(false);
    };

    const startCamera = async () => {
        try {
            setIsCameraOpen(true);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            onShowToast("Não foi possível acessar a webcam. Por favor, verifique as permissões de câmera do navegador ou utilize a opção 'Enviar Foto'.", 'error');
            setIsCameraOpen(false);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Real orientation (no flip or scale translate)
                ctx.drawImage(videoRef.current, 0, 0);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                setSelectedImage(dataUrl);
                setResults([]);
                setHasSearched(false);
                stopCamera();
            }
        }
    };

    useEffect(() => {
        if (isOpen) {
            setSelectedImage(null);
            setResults([]);
            setHasSearched(false);
            setShowTips(false);
            setIsProcessing(false);
            
            // Reset input values so onChange triggers even if the user selects the same file
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (cameraInputRef.current) cameraInputRef.current.value = '';
        } else {
            stopCamera();
        }
    }, [isOpen]);

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

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

    const handleSearch = async () => {
        if (!selectedImage) return;

        setIsProcessing(true);
        setHasSearched(false);
        const startTime = performance.now();

        try {
            // Unblock UI to let spinner render
            await new Promise(resolve => setTimeout(resolve, 50));

            let photos: Photo[] = [];
            let isHybridFallback = false;

            // 1. Busca via Amazon Rekognition (server-side)
            const matches = await faceRecognitionService.searchByImage(selectedImage, eventId);
            console.log(`Rekognition matched ${matches.length} photos.`);

            if (matches.length > 0) {
                const matchedIds = matches.map(m => m.id);
                photos = await api.getPhotosByIds(matchedIds);
            } else {
                // FALLBACK: sem rosto detectado pelo Rekognition, usa similaridade visual (IA)
                console.warn("Nenhum rosto encontrado pelo Rekognition. Iniciando fallback de Similaridade Visual...");
                isHybridFallback = true;
                photos = await api.searchImageContext(selectedImage);
                if (eventId) {
                    photos = photos.filter(p => p.event_id === eventId);
                }
            }

            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(1);

            setResults(photos);

            if (photos.length > 0) {
                if (isHybridFallback) {
                    onShowToast(`${photos.length} fotos contextuais encontradas em ${duration}s!`, 'success');
                } else {
                    onShowToast(`${photos.length} fotos encontradas em ${duration}s!`, 'success');
                }
            } else {
                onShowToast(`Nenhuma foto correspondente encontrada (${duration}s).`, 'info');
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
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-primary/20 shadow-lg">
                            <Camera size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-display font-bold text-neutral-900 tracking-tight">Reconhecimento Facial</h2>
                            <p className="text-xs md:text-sm text-neutral-500 font-medium">
                                {eventName ? `Buscando em: ${eventName}` : 'Encontre você nas fotos'}
                            </p>
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
                    <div className="min-h-full p-4 md:p-8 flex flex-col pb-24">

                        {/* State 1: Results Display (When searched) */}
                        {hasSearched && (
                            <div className="animate-in slide-in-from-bottom-5 fade-in duration-500">
                                {/* Compact Search Header */}
                                <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-sm border border-neutral-100">
                                    <div className="flex items-center gap-4">
                                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-md ring-2 ring-primary/20">
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
                                                className="text-primary text-sm font-medium hover:underline"
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
                                                    <WatermarkedImage
                                                        src={getOptimizedImageUrl(photo.thumb_url || photo.preview_url, 400, 75)}
                                                        alt={photo.title}
                                                        loading="lazy"
                                                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                                                        containWithBlur={true}
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
                                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-neutral-900"></div>

                                    <div className="mb-8">
                                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-20"></div>
                                            <Camera size={40} className="text-primary" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-neutral-900 mb-3">Tire ou envie uma selfie</h3>
                                        <p className="text-neutral-500 leading-relaxed mb-6">
                                            Usamos inteligência artificial para encontrar todas as fotos onde você aparece.
                                            <br className="hidden md:block" /> Sua privacidade é protegida.
                                        </p>

                                        {/* Expandable Tips */}
                                        <div className="max-w-md mx-auto">
                                            <button
                                                onClick={() => setShowTips(!showTips)}
                                                className={`flex items-center justify-between w-full p-4 rounded-2xl border transition-all duration-300 ${
                                                    showTips 
                                                    ? 'bg-primary-dark border-primary-dark text-white shadow-lg shadow-primary' 
                                                    : 'bg-primary/10 border-primary/20 text-primary-dark hover:bg-primary/10'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Info size={20} />
                                                    <span className="font-bold text-sm">Dicas para uma busca perfeita</span>
                                                </div>
                                                <ChevronDown size={20} className={`transition-transform duration-500 ${showTips ? 'rotate-180' : ''}`} />
                                            </button>

                                            {showTips && (
                                                <div className="mt-2 text-left bg-white rounded-2xl border border-neutral-100 shadow-xl p-5 animate-in slide-in-from-top-4 duration-500">
                                                    <div className="grid grid-cols-1 gap-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                                                                <User size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-neutral-800">Fique de frente</p>
                                                                <p className="text-xs text-neutral-500">Fotos de perfil ou rosto muito inclinado dificultam a precisão.</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                                                                <Sun size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-neutral-800">Iluminação é a chave</p>
                                                                <p className="text-xs text-neutral-500">Evite sombras fortes no rosto ou luz forte vindo de trás.</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                                                                <Maximize2 size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-neutral-800">Distância média</p>
                                                                <p className="text-xs text-neutral-500">Não tire a foto de muito perto. Mantenha o celular a um braço de distância.</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-start gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary-dark shrink-0">
                                                                <Scan size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-neutral-800">Rosto limpo</p>
                                                                <p className="text-xs text-neutral-500">Evite óculos de sol, bonés exagerados ou máscaras.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>


                                    {isCameraOpen ? (
                                        <div className="mb-6 flex flex-col items-center">
                                            <div className="relative w-full max-w-md aspect-video bg-neutral-950 rounded-2xl overflow-hidden shadow-inner border-2 border-neutral-200">
                                                <video
                                                    ref={videoRef}
                                                    autoPlay
                                                    playsInline
                                                    muted
                                                    className="w-full h-full object-cover transform -scale-x-100 bg-neutral-900"
                                                />
                                                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                                    Ao Vivo
                                                </div>
                                            </div>
                                            <div className="flex gap-3 mt-4 w-full max-w-md">
                                                <button
                                                    type="button"
                                                    onClick={stopCamera}
                                                    className="flex-1 py-3 px-4 rounded-xl border border-neutral-200 text-neutral-700 font-semibold hover:bg-neutral-50 transition-all active:scale-95 text-sm"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={capturePhoto}
                                                    className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark shadow-md hover:shadow-primary/20 transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                                                >
                                                    <Camera size={18} />
                                                    Capturar Foto
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
                                            <div
                                                onClick={() => {
                                                    if (isMobileDevice()) {
                                                        cameraInputRef.current?.click();
                                                    } else {
                                                        startCamera();
                                                    }
                                                }}
                                                className="border-2 border-dashed border-neutral-200 hover:border-primary hover:bg-primary/10 rounded-2xl p-4 md:p-6 cursor-pointer transition-all duration-300 group flex flex-col items-center justify-center text-center h-36 md:h-48"
                                            >
                                                <div className="w-12 h-12 md:w-14 md:h-14 bg-primary/20 rounded-full flex items-center justify-center mb-2 md:mb-3 group-hover:scale-110 transition-transform text-primary-dark">
                                                    <Camera className="w-6 h-6 md:w-7 md:h-7" />
                                                </div>
                                                <span className="font-semibold text-neutral-800 text-sm">Tirar Selfie</span>
                                                <span className="text-xs text-neutral-400 mt-1 hidden md:block">Usar Câmera</span>
                                            </div>

                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="border-2 border-dashed border-neutral-200 hover:border-primary-dark hover:bg-primary/10 rounded-2xl p-4 md:p-6 cursor-pointer transition-all duration-300 group flex flex-col items-center justify-center text-center h-36 md:h-48"
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
                                                        <div className="w-12 h-12 md:w-14 md:h-14 bg-primary/20 rounded-full flex items-center justify-center mb-2 md:mb-3 group-hover:scale-110 transition-transform text-primary-dark">
                                                            <Upload className="w-6 h-6 md:w-7 md:h-7" />
                                                        </div>
                                                        <span className="font-semibold text-neutral-800 text-sm">Enviar Foto</span>
                                                        <span className="text-xs text-neutral-400 mt-1 hidden md:block">Da Galeria</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-2">
                                        <button
                                            onClick={handleSearch}
                                            disabled={!selectedImage || isProcessing}
                                            className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-lg shadow-lg hover:shadow-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden"
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
                                        <div className="w-16 h-16 border-4 border-primary/10 border-t-primary rounded-full animate-spin mb-4 shadow-lg"></div>
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
                <input
                    type="file"
                    ref={cameraInputRef}
                    className="hidden"
                    accept="image/*"
                    capture="user"
                    onChange={handleFileChange}
                />
            </div>
        </div>
    );
};

export default FaceSearchModal;


