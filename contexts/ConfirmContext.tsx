
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'info' | 'primary';
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<{
        isOpen: boolean;
        options: ConfirmOptions;
        resolve: ((value: boolean) => void) | null;
    }>({
        isOpen: false,
        options: { title: '', message: '' },
        resolve: null,
    });

    const confirm = (options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setState({
                isOpen: true,
                options,
                resolve,
            });
        });
    };

    const handleConfirm = () => {
        if (state.resolve) state.resolve(true);
        setState({ ...state, isOpen: false });
    };

    const handleCancel = () => {
        if (state.resolve) state.resolve(false);
        setState({ ...state, isOpen: false });
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {state.isOpen && (
                <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-fade-in-up">
                        <h3 className={`text-lg font-bold mb-2 ${state.options.variant === 'danger' ? 'text-red-600' : 'text-neutral-900'}`}>{state.options.title}</h3>
                        <p className="text-neutral-600 mb-6">{state.options.message}</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-sm font-medium transition-colors"
                            >
                                {state.options.cancelText || 'Cancelar'}
                            </button>
                            <button
                                onClick={handleConfirm}
                                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${state.options.variant === 'danger'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-primary hover:bg-primary-dark'
                                    }`}
                            >
                                {state.options.confirmText || 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error("useConfirm must be used within a ConfirmProvider");
    }
    return context;
};
