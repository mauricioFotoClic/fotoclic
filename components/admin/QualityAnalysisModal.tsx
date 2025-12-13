
import React, { useEffect, useState } from 'react';
import { Photo, PhotoQualityAnalysis } from '../../types';
import api from '../../services/api';
import Modal from '../Modal';

interface QualityAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    photo: Photo | null;
    onApprove: (id: string) => void;
    onReject: (photo: Photo) => void;
}

const QualityAnalysisModal: React.FC<QualityAnalysisModalProps> = ({ isOpen, onClose, photo, onApprove, onReject }) => {
    const [analysis, setAnalysis] = useState<PhotoQualityAnalysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(true);

    useEffect(() => {
        if (isOpen && photo) {
            setIsAnalyzing(true);
            setAnalysis(null);
            // Trigger analysis
            api.analyzePhoto(photo.id).then(result => {
                setAnalysis(result);
                setIsAnalyzing(false);
            });
        }
    }, [isOpen, photo]);

    if (!photo) return null;

    // Helper para cor da barra de progresso
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'bg-green-500';
        if (score >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };
    
    const getScoreTextColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            size="2xl" 
            title="Análise de Qualidade IA"
            noPadding
        >
            <div className="flex flex-col md:flex-row h-full min-h-[500px]">
                {/* Left Side: Image & Scanning Effect */}
                <div className="w-full md:w-1/2 bg-black relative overflow-hidden flex items-center justify-center">
                    <img 
                        src={photo.preview_url} 
                        alt="Analysis Target" 
                        className="max-w-full max-h-[400px] object-contain opacity-90"
                    />
                    
                    {isAnalyzing && (
                        <>
                            {/* Scanning Laser Line */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                            {/* Grid Overlay */}
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] opacity-20 pointer-events-none"></div>
                            {/* Text Overlay */}
                            <div className="absolute bottom-10 left-0 w-full text-center">
                                <span className="inline-block px-4 py-1 bg-black/70 text-green-400 font-mono text-sm rounded border border-green-500/30 animate-pulse">
                                    ANALISANDO PIXELS...
                                </span>
                            </div>
                        </>
                    )}

                    {!isAnalyzing && analysis && (
                        <div className="absolute top-4 left-4">
                            <span className="bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm border border-white/20">
                                {analysis.recommendation === 'approve' ? '✅ Alta Qualidade' : '⚠️ Requer Atenção'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Right Side: Stats & Results */}
                <div className="w-full md:w-1/2 p-6 bg-white flex flex-col">
                    {isAnalyzing ? (
                        <div className="flex-grow flex flex-col items-center justify-center space-y-4">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-neutral-500 font-medium animate-pulse">Processando imagem...</p>
                            <div className="w-3/4 space-y-2 opacity-50">
                                <div className="h-2 bg-neutral-200 rounded w-full"></div>
                                <div className="h-2 bg-neutral-200 rounded w-5/6"></div>
                                <div className="h-2 bg-neutral-200 rounded w-4/6"></div>
                            </div>
                        </div>
                    ) : analysis ? (
                        <div className="animate-fade-in-up">
                            {/* Overall Score */}
                            <div className="text-center mb-8">
                                <div className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-1">Pontuação Geral</div>
                                <div className={`text-6xl font-display font-bold ${getScoreTextColor(analysis.overallScore)}`}>
                                    {analysis.overallScore}
                                    <span className="text-2xl text-neutral-300">/100</span>
                                </div>
                            </div>

                            {/* Detailed Metrics */}
                            <div className="space-y-4 mb-6">
                                <MetricBar label="Nitidez" value={analysis.sharpness} color={getScoreColor(analysis.sharpness)} />
                                <MetricBar label="Iluminação & Exposição" value={analysis.lighting} color={getScoreColor(analysis.lighting)} />
                                <MetricBar label="Composição" value={analysis.composition} color={getScoreColor(analysis.composition)} />
                                <MetricBar label="Qualidade (Baixo Ruído)" value={analysis.noise} color={getScoreColor(analysis.noise)} />
                            </div>

                            {/* Summary Box */}
                            <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-100 mb-6">
                                <h4 className="flex items-center text-sm font-bold text-neutral-800 mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    Conclusão da IA
                                </h4>
                                <p className="text-sm text-neutral-600 leading-relaxed">
                                    {analysis.summary}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex space-x-3 mt-auto pt-4 border-t border-neutral-100">
                                <button
                                    onClick={() => { onClose(); onReject(photo); }}
                                    className="flex-1 px-4 py-3 text-sm font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                                >
                                    Rejeitar
                                </button>
                                <button
                                    onClick={() => { onClose(); onApprove(photo.id); }}
                                    className="flex-1 px-4 py-3 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
                                >
                                    Aprovar Foto
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p>Erro ao carregar análise.</p>
                    )}
                </div>
            </div>
             <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </Modal>
    );
};

const MetricBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
    <div>
        <div className="flex justify-between text-xs font-medium text-neutral-600 mb-1">
            <span>{label}</span>
            <span>{value}%</span>
        </div>
        <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
            <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`} 
                style={{ width: `${value}%` }}
            ></div>
        </div>
    </div>
);

export default QualityAnalysisModal;
