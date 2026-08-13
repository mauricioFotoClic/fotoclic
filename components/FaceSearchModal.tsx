import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Upload, Search, Camera, RotateCcw, Calendar, MapPin, Check, Store } from 'lucide-react';
import { faceRecognitionService } from '../services/faceRecognition';
import api from '../services/api';
import { Photo, PhotoEvent, User } from '../types';
import Spinner from './Spinner';
import { getOptimizedImageUrl } from '../utils/imageOptimization';
import WatermarkedImage from './WatermarkedImage';
import { useLanguage } from '../contexts/LanguageContext';
import { includesNormalized, getAvatarFallbackUrl } from '../utils/stringUtils';

interface FaceSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (page: any) => void;
    onAddToCart: (id: string) => void;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
    eventId?: string;
    eventName?: string;
}

const FaceSearchModal: React.FC<FaceSearchModalProps> = ({
    isOpen,
    onClose,
    onNavigate,
    onAddToCart,
    onShowToast,
    eventId,
    eventName
}) => {
    const { t, tCategory, formatDate } = useLanguage();

    const [activeTab, setActiveTab] = useState<'selfie' | 'upload'>('selfie');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [saveForFuture, setSaveForFuture] = useState<boolean>(true);
    
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedCity, setSelectedCity] = useState<string>('');

    const [events, setEvents] = useState<PhotoEvent[]>([]);
    const [photographersMap, setPhotographersMap] = useState<Record<string, User>>({});
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<Photo[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    // Load saved selfie from localStorage on mount/open
    useEffect(() => {
        if (isOpen) {
            const savedSelfie = localStorage.getItem('fotoclic_saved_selfie');
            if (savedSelfie) {
                setSelectedImage(savedSelfie);
            } else {
                setSelectedImage(null);
            }

            setResults([]);
            setHasSearched(false);
            setIsProcessing(false);

            // Load events to extract cities & dates
            api.getAllPublicEvents().then(allEvents => {
                setEvents(allEvents);
                
                // Map photographer users from events
                const pMap: Record<string, User> = {};
                allEvents.forEach(e => {
                    if (e.photographer_id && (e as any).photographer) {
                        pMap[e.photographer_id] = {
                            id: e.photographer_id,
                            name: (e as any).photographer.name || 'Fotógrafo',
                            avatar_url: (e as any).photographer.avatar_url || '',
                            slug: (e as any).photographer.slug || e.photographer_id
                        } as User;
                    }
                });
                setPhotographersMap(pMap);
            }).catch(console.error);

            if (activeTab === 'selfie' && !savedSelfie) {
                startCamera();
            }
        } else {
            stopCamera();
        }
    }, [isOpen]);

    // Handle tab change
    const handleTabChange = (tab: 'selfie' | 'upload') => {
        setActiveTab(tab);
        if (tab === 'selfie') {
            if (!selectedImage || isCameraOpen) {
                startCamera();
            }
        } else {
            stopCamera();
            if (fileInputRef.current) fileInputRef.current.click();
        }
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
            stopCamera();
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
            onShowToast("Não foi possível acessar a webcam. Por favor, verifique as permissões de câmera ou envie um arquivo de foto.", 'error');
            setIsCameraOpen(false);
            setActiveTab('upload');
        }
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth || 640;
            canvas.height = videoRef.current.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                setSelectedImage(dataUrl);

                if (saveForFuture) {
                    localStorage.setItem('fotoclic_saved_selfie', dataUrl);
                }

                stopCamera();
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const dataUrl = ev.target?.result as string;
                setSelectedImage(dataUrl);
                if (saveForFuture) {
                    localStorage.setItem('fotoclic_saved_selfie', dataUrl);
                }
                stopCamera();
            };
            reader.readAsDataURL(file);
        }
    };

    // Extract unique cities from events
    const availableCities = useMemo(() => {
        const set = new Set<string>();
        events.forEach(e => {
            if (e.location) {
                const parts = e.location.split(',');
                const city = parts[parts.length - 1].trim();
                if (city) set.add(city);
            }
        });
        return Array.from(set).sort();
    }, [events]);

    // Extract unique dates from events
    const availableDates = useMemo(() => {
        const map = new Map<string, string>(); // raw -> formatted
        events.forEach(e => {
            if (e.event_date) {
                const formatted = formatDate(e.event_date, { day: '2-digit', month: 'short' });
                map.set(e.event_date, formatted);
            }
        });
        return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    }, [events, formatDate]);

    // Handle face search
    const handleSearch = async () => {
        if (!selectedImage) {
            onShowToast("Tire uma selfie ou envie uma foto para realizar a busca.", 'info');
            return;
        }

        setIsProcessing(true);
        setHasSearched(false);
        const startTime = performance.now();

        try {
            await new Promise(resolve => setTimeout(resolve, 50));

            let photos: Photo[] = [];

            // 1. Rekognition search
            const matches = await faceRecognitionService.searchByImage(selectedImage, eventId);

            if (matches.length > 0) {
                const matchedIds = matches.map(m => m.id);
                photos = await api.getPhotosByIds(matchedIds);
            } else {
                // Fallback visual similarity
                photos = await api.searchImageContext(selectedImage);
                if (eventId) {
                    photos = photos.filter(p => p.event_id === eventId);
                }
            }

            // 2. Filter by City & Date if selected
            if (selectedCity || selectedDate) {
                const eventMap = new Map<string, PhotoEvent>();
                events.forEach(ev => eventMap.set(ev.id, ev));

                photos = photos.filter(p => {
                    const ev = eventMap.get(p.event_id);
                    if (!ev) return true; // Keep if event data not loaded

                    if (selectedCity && ev.location) {
                        if (!includesNormalized(ev.location, selectedCity)) {
                            return false;
                        }
                    }

                    if (selectedDate && ev.event_date) {
                        if (ev.event_date !== selectedDate) {
                            return false;
                        }
                    }

                    return true;
                });
            }

            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(1);

            setResults(photos);
            setHasSearched(true);

            if (photos.length > 0) {
                onShowToast(t('face_search.photos_found', { count: photos.length }) + ` (${duration}s)`, 'success');
            } else {
                onShowToast(t('face_search.no_results_title') + ` (${duration}s)`, 'info');
            }

        } catch (error) {
            console.error("Erro na busca por selfie:", error);
            onShowToast("Ocorreu um erro ao processar a busca facial.", 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    // Group results by photographer
    const groupedResults = useMemo(() => {
        const groups: Record<string, { photographer: User | null; photos: Photo[] }> = {};

        results.forEach(photo => {
            const pId = photo.photographer_id || 'unknown';
            if (!groups[pId]) {
                const pUser = photographersMap[pId] || null;
                groups[pId] = { photographer: pUser, photos: [] };
            }
            groups[pId].photos.push(photo);
        });

        return Object.values(groups);
    }, [results, photographersMap]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-[#18181B] text-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-neutral-800 flex flex-col relative max-h-[92vh]">

                {/* Header */}
                <div className="p-5 pb-3 flex justify-between items-start border-b border-neutral-800/60 bg-[#18181B]">
                    <div>
                        <span className="text-xs font-extrabold uppercase tracking-widest text-primary block mb-1">
                            {t('face_search.title')}
                        </span>
                        <h2 className="text-xl sm:text-2xl font-display font-bold text-white leading-snug">
                            {t('face_search.subtitle')}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-full transition-all text-neutral-300 active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                    {/* Mode 1: Search View (Form & Camera) */}
                    {!hasSearched && (
                        <>
                            {/* Toggle Tabs: Enviar foto | Tirar selfie */}
                            <div className="grid grid-cols-2 gap-2 bg-neutral-900/80 p-1.5 rounded-2xl border border-neutral-800">
                                <button
                                    onClick={() => handleTabChange('upload')}
                                    className={`py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                        activeTab === 'upload' && !isCameraOpen
                                            ? 'bg-neutral-800 text-white shadow-md border border-neutral-700'
                                            : 'text-neutral-400 hover:text-white'
                                    }`}
                                >
                                    <Upload size={16} />
                                    {t('face_search.upload_photo')}
                                </button>
                                <button
                                    onClick={() => handleTabChange('selfie')}
                                    className={`py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                        activeTab === 'selfie' || isCameraOpen
                                            ? 'bg-primary text-white shadow-md font-extrabold'
                                            : 'text-neutral-400 hover:text-white'
                                    }`}
                                >
                                    <Camera size={16} />
                                    {t('face_search.take_selfie')}
                                </button>
                            </div>

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />

                            {/* Capture Frame Container */}
                            <div className="relative rounded-3xl overflow-hidden bg-neutral-950 border border-neutral-800 aspect-[4/5] max-h-[340px] flex items-center justify-center mx-auto w-full group shadow-inner">
                                {isCameraOpen ? (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover transform -scale-x-100"
                                        />
                                        {/* Dashed Oval Face Overlay */}
                                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                                            <div className="w-[190px] h-[250px] sm:w-[220px] sm:h-[280px] border-2 border-dashed border-primary/90 rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] relative flex items-center justify-center">
                                                <div className="w-full h-[1px] bg-primary/70 absolute top-1/3"></div>
                                                <span className="text-xs text-white/90 font-medium bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm text-center max-w-[80%]">
                                                    {t('face_search.frame_face_instruction')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Capture Button */}
                                        <button
                                            onClick={capturePhoto}
                                            className="absolute bottom-4 bg-primary hover:bg-primary-dark text-white font-extrabold px-6 py-3 rounded-full shadow-2xl transition-all flex items-center gap-2 text-sm active:scale-95 z-10"
                                        >
                                            <Camera size={18} />
                                            {t('face_search.take_photo_button')}
                                        </button>
                                    </div>
                                ) : selectedImage ? (
                                    <div className="relative w-full h-full group">
                                        <img
                                            src={selectedImage}
                                            alt="Selfie"
                                            className="w-full h-full object-cover"
                                        />
                                        {/* Dashed Overlay on preview */}
                                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                            <div className="w-[190px] h-[250px] border-2 border-dashed border-primary/80 rounded-[50%]"></div>
                                        </div>

                                        {/* Change Photo Overlay button */}
                                        <button
                                            onClick={() => {
                                                if (activeTab === 'selfie') startCamera();
                                                else fileInputRef.current?.click();
                                            }}
                                            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 hover:bg-black text-white text-xs font-semibold px-4 py-2.5 rounded-full backdrop-blur-md transition-all flex items-center gap-2 border border-white/20"
                                        >
                                            <RotateCcw size={14} />
                                            {t('face_search.retake_photo_button')}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-8 text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-500 mb-3 border border-neutral-800">
                                            <Upload size={28} />
                                        </div>
                                        <p className="text-sm font-semibold text-neutral-300 mb-1">{t('face_search.upload_photo')}</p>
                                        <p className="text-xs text-neutral-500">Clique para selecionar uma foto da sua galeria</p>
                                    </div>
                                )}
                            </div>

                            {/* Checkbox: Save photo for future searches */}
                            <label className="flex items-center gap-3 p-3 bg-neutral-900/60 rounded-2xl border border-neutral-800/80 cursor-pointer hover:bg-neutral-900 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={saveForFuture}
                                    onChange={(e) => {
                                        setSaveForFuture(e.target.checked);
                                        if (!e.target.checked) {
                                            localStorage.removeItem('fotoclic_saved_selfie');
                                        } else if (selectedImage) {
                                            localStorage.setItem('fotoclic_saved_selfie', selectedImage);
                                        }
                                    }}
                                    className="w-5 h-5 rounded border-neutral-700 text-primary focus:ring-primary bg-neutral-800 cursor-pointer"
                                />
                                <span className="text-xs sm:text-sm font-medium text-neutral-300">
                                    {t('face_search.save_photo_future')}
                                </span>
                            </label>

                            {/* Filter Selectors (Date & City) */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Date Selector */}
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                                        <Calendar size={16} />
                                    </span>
                                    <select
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">{t('face_search.all_dates')}</option>
                                        {availableDates.map(([raw, formatted]) => (
                                            <option key={raw} value={raw}>
                                                {formatted}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* City Selector */}
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                                        <MapPin size={16} />
                                    </span>
                                    <select
                                        value={selectedCity}
                                        onChange={(e) => setSelectedCity(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">{t('face_search.all_cities')}</option>
                                        {availableCities.map(city => (
                                            <option key={city} value={city}>
                                                {city}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Submit Button CTA */}
                            <button
                                onClick={handleSearch}
                                disabled={isProcessing || !selectedImage}
                                className="w-full bg-primary hover:bg-primary-dark text-white font-extrabold py-4 px-6 rounded-2xl shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center justify-center gap-2 active:scale-98"
                            >
                                {isProcessing ? (
                                    <>
                                        <Spinner size="sm" />
                                        <span>Procurando fotos por IA...</span>
                                    </>
                                ) : (
                                    <>
                                        <Search size={20} strokeWidth={2.5} />
                                        <span>{t('face_search.search_my_photos')}</span>
                                    </>
                                )}
                            </button>
                        </>
                    )}

                    {/* Mode 2: Results Display (Grouped by Photographer) */}
                    {hasSearched && (
                        <div className="space-y-6">
                            {/* Top Bar with New Search Button */}
                            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                                <div>
                                    <span className="text-xs text-neutral-400 block">{t('face_search.photos_found', { count: results.length })}</span>
                                    {selectedCity && (
                                        <span className="text-xs text-primary font-semibold">📍 {selectedCity}</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => { setHasSearched(false); }}
                                    className="bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md"
                                >
                                    <RotateCcw size={14} />
                                    {t('face_search.new_search')}
                                </button>
                            </div>

                            {results.length > 0 ? (
                                <div className="space-y-8">
                                    {groupedResults.map(({ photographer, photos }) => {
                                        const pName = photographer?.name || 'Fotógrafo FotoClic';
                                        const pSlug = photographer?.slug || photographer?.id;

                                        return (
                                            <div key={photographer?.id || 'unknown'} className="bg-neutral-900/60 rounded-3xl p-4 border border-neutral-800/80 space-y-4">
                                                {/* Photographer Header Card */}
                                                <div className="flex items-center justify-between bg-neutral-900 p-3 rounded-2xl border border-neutral-800">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={photographer?.avatar_url || getAvatarFallbackUrl(pName, 40)}
                                                            alt={pName}
                                                            className="w-10 h-10 rounded-full object-cover border border-neutral-700"
                                                            onError={(e) => { e.currentTarget.src = getAvatarFallbackUrl(pName, 40); }}
                                                        />
                                                        <div>
                                                            <p className="text-xs text-neutral-400 uppercase font-semibold tracking-wider">{t('face_search.photographer_label')}</p>
                                                            <h4 className="text-sm font-bold text-white truncate max-w-[180px] sm:max-w-xs">{pName}</h4>
                                                        </div>
                                                    </div>

                                                    {pSlug && (
                                                        <button
                                                            onClick={() => {
                                                                onClose();
                                                                onNavigate({ name: 'photographer-portfolio', photographerId: pSlug });
                                                            }}
                                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                                                        >
                                                            <Store size={14} />
                                                            <span>{t('face_search.visit_store')}</span>
                                                            <span className="bg-primary text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ml-1">
                                                                {photos.length}
                                                            </span>
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Photos Grid */}
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    {photos.map(photo => (
                                                        <div
                                                            key={photo.id}
                                                            className="group relative bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 hover:border-primary transition-all cursor-pointer aspect-[3/4]"
                                                            onClick={() => {
                                                                onClose();
                                                                onNavigate({ name: 'photo-detail', id: photo.id });
                                                            }}
                                                        >
                                                            <WatermarkedImage
                                                                src={getOptimizedImageUrl(photo.thumb_url || photo.preview_url, 400, 75)}
                                                                alt={photo.title}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                containWithBlur={true}
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                                                                <span className="text-xs font-bold text-white bg-primary px-3 py-1.5 rounded-full shadow-lg">
                                                                    Ver Foto
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 px-4 space-y-3">
                                    <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto text-neutral-500 border border-neutral-800">
                                        <Search size={28} />
                                    </div>
                                    <h3 className="text-base font-bold text-white">{t('face_search.no_results_title')}</h3>
                                    <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
                                        {t('face_search.no_results_desc')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default FaceSearchModal;
