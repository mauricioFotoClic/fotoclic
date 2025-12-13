import React, { useState } from 'react';
import { User } from '../types';
import api from '../services/api';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    photographerId: string;
    currentUser: User;
    onReviewSubmitted: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, onClose, photographerId, currentUser, onReviewSubmitted }) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) return;

        setSubmitting(true);
        try {
            await api.createReview({
                photographer_id: photographerId,
                reviewer_id: currentUser.id,
                rating,
                comment,
            });
            onReviewSubmitted();
            onClose();
        } catch (error) {
            console.error("Failed to submit review", error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-neutral-900">Avaliar Fotógrafo</h3>
                    <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex justify-center space-x-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                className="focus:outline-none transition-transform hover:scale-110"
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                onClick={() => setRating(star)}
                            >
                                <svg
                                    className={`w-10 h-10 ${(hoverRating || rating) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-300'
                                        }`}
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            </button>
                        ))}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-2">
                            Comentário (opcional)
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                            rows={4}
                            placeholder="Conte como foi sua experiência..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || rating === 0}
                        className={`w-full py-3 rounded-xl font-bold text-white transition-all ${submitting || rating === 0
                                ? 'bg-neutral-300 cursor-not-allowed'
                                : 'bg-primary hover:bg-primary-dark shadow-lg hover:shadow-primary/30'
                            }`}
                    >
                        {submitting ? 'Enviando...' : 'Enviar Avaliação'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ReviewModal;
