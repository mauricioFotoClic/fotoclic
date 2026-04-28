import React, { useState } from 'react';
import { User, ReportReason } from '../types';
import api from '../services/api';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    photographerId: string;
    currentUser: User;
    photographerName: string;
}

const REASONS: { value: ReportReason; label: string; description: string }[] = [
    { value: 'conteudo_inapropriado', label: 'Conteúdo Inapropriado', description: 'Fotos com nudez, violência ou material ofensivo' },
    { value: 'perfil_falso',          label: 'Perfil Falso',           description: 'Identidade falsa ou informações enganosas' },
    { value: 'violacao_direitos',     label: 'Violação de Direitos',   description: 'Uso não autorizado de imagens ou marcas registradas' },
    { value: 'assedio',               label: 'Assédio',                description: 'Comportamento abusivo ou intimidador' },
    { value: 'spam',                  label: 'Spam',                   description: 'Conteúdo repetitivo ou publicidade abusiva' },
    { value: 'outro',                 label: 'Outro',                  description: 'Outro motivo não listado acima' },
];

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, photographerId, currentUser, photographerName }) => {
    const [reason, setReason]         = useState<ReportReason | ''>('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted]   = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason) return;

        setSubmitting(true);
        try {
            await api.createReport({
                photographer_id: photographerId,
                reporter_id: currentUser.id,
                reason: reason as ReportReason,
                description: description.trim() || undefined,
            });
            setSubmitted(true);
        } catch (error) {
            console.error('Failed to submit report:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setReason('');
        setDescription('');
        setSubmitted(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-2">
                        <span className="text-red-500 text-xl">🚩</span>
                        <h3 className="text-lg font-bold text-neutral-900">Denunciar Fotógrafo</h3>
                    </div>
                    <button onClick={handleClose} className="text-neutral-400 hover:text-neutral-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {submitted ? (
                    <div className="text-center py-6">
                        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="font-bold text-neutral-800 mb-1">Denúncia enviada</p>
                        <p className="text-sm text-neutral-500">Nossa equipe irá analisar em breve. Obrigado por ajudar a manter a plataforma segura.</p>
                        <button onClick={handleClose} className="mt-5 px-6 py-2 bg-primary text-white rounded-xl font-medium text-sm">
                            Fechar
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-sm text-neutral-500">
                            Você está denunciando <strong className="text-neutral-700">{photographerName}</strong>. Sua identidade não será revelada ao fotógrafo.
                        </p>

                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-neutral-700">Motivo da denúncia</p>
                            {REASONS.map(r => (
                                <label
                                    key={r.value}
                                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${reason === r.value ? 'border-red-400 bg-red-50' : 'border-neutral-200 hover:border-neutral-300'}`}
                                >
                                    <input
                                        type="radio"
                                        name="reason"
                                        value={r.value}
                                        checked={reason === r.value}
                                        onChange={() => setReason(r.value)}
                                        className="mt-0.5 accent-red-500"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-neutral-800">{r.label}</p>
                                        <p className="text-xs text-neutral-500">{r.description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 mb-1">Detalhes adicionais <span className="font-normal text-neutral-400">(opcional)</span></label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all resize-none text-sm"
                                rows={3}
                                placeholder="Descreva o problema com mais detalhes..."
                                maxLength={500}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={!reason || submitting}
                            className="w-full py-3 rounded-xl font-bold text-white transition-all bg-red-500 hover:bg-red-600 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Enviando...' : 'Enviar Denúncia'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ReportModal;
