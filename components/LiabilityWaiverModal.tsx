import React from 'react';
import Modal from './Modal';
import { useLanguage } from '../contexts/LanguageContext';

interface LiabilityWaiverModalProps {
    isOpen: boolean;
    photographerName: string;
    onAccept: () => void;
    loading?: boolean;
}

const LiabilityWaiverModal: React.FC<LiabilityWaiverModalProps> = ({ isOpen, photographerName, onAccept, loading = false }) => {
    const { t } = useLanguage();

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { }}
            title={t('liability_waiver.title')}
            size="lg"
            closeOnOverlayClick={false}
            showCloseButton={false}
        >
            <div className="p-4 sm:p-6">
                <div className="flex justify-center mb-4 sm:mb-6">
                    <div className="bg-yellow-100 p-3 sm:p-4 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-center text-gray-900 mb-4 sm:mb-6">
                    {t('liability_waiver.success_title')}
                </h3>

                <div className="bg-neutral-50 p-4 sm:p-6 rounded-lg border border-neutral-200 mb-6 sm:mb-8">
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed text-justify">
                        {t('liability_waiver.p1_pre')}<strong>{photographerName}</strong>{t('liability_waiver.p1_pos')}
                    </p>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed text-justify mt-3 sm:mt-4">
                        {t('liability_waiver.p2')}
                    </p>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed text-justify mt-3 sm:mt-4">
                        {t('liability_waiver.p3')}
                    </p>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={onAccept}
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center text-sm sm:text-base"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        ) : null}
                        {t('liability_waiver.accept_button')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default LiabilityWaiverModal;
