import React, { useState } from 'react';
import { User, UserRole, Page } from '../types';
import api from '../services/api';
import Modal from './Modal';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: (user: User) => void;
    onNavigate: (page: Page) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess, onNavigate }) => {
    const [view, setView] = useState<'login' | 'forgot-password'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Reset state when modal opens/closes or view changes
    // (Actually this component unmounts on close, so state resets automatically.
    //  But jumping between views needs manual clearing if desired.
    //  For now, let's keep email populated when switching views as user convenience)

    const performLogin = async () => {
        setError('');
        setLoading(true);

        try {
            const user = await api.login(email, password);
            if (user) {
                onLoginSuccess(user);
                onClose();
            } else {
                setError('E-mail não encontrado ou senha inválida.');
            }
        } catch (err) {
            setError('Ocorreu um erro ao tentar entrar. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const performResetPassword = async () => {
        setError('');
        setSuccessMessage('');

        if (!email) {
            setError('Por favor, digite seu e-mail.');
            return;
        }

        setLoading(true);

        try {
            const success = await api.resetPassword(email);
            if (success) {
                setSuccessMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
            } else {
                setError('Erro ao enviar e-mail. Verifique se o endereço está correto.');
            }
        } catch (err) {
            setError('Ocorreu um erro. Tente novamente mais tarde.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (view === 'login') {
            await performLogin();
        } else {
            await performResetPassword();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (view === 'login') {
                performLogin();
            } else {
                performResetPassword();
            }
        }
    };

    const handleRegisterClick = () => {
        onClose();
        onNavigate({ name: 'register' });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" size="md" noPadding>
            <div className="p-8">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">
                        {view === 'login' ? 'Bem-vindo de volta' : 'Recuperar Senha'}
                    </h2>
                    <p className="text-gray-500">
                        {view === 'login'
                            ? 'Acesse sua conta para continuar'
                            : 'Digite seu e-mail para receber um link de redefinição'}
                    </p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="modal-email" className="block text-sm font-medium text-gray-700 mb-1 ml-1">
                            E-mail
                        </label>
                        <input
                            id="modal-email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="seu@email.com"
                            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400"
                        />
                    </div>

                    {view === 'login' && (
                        <div>
                            <div className="flex justify-between items-center mb-1 ml-1">
                                <label htmlFor="modal-password" className="block text-sm font-medium text-gray-700">
                                    Senha
                                </label>
                                <button
                                    type="button"
                                    onClick={() => { setView('forgot-password'); setError(''); }}
                                    className="text-xs font-medium text-primary hover:text-primary-dark transition-colors"
                                >
                                    Esqueceu a senha?
                                </button>
                            </div>
                            <input
                                id="modal-password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-xl border border-red-100 flex items-center justify-center animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-xl border border-green-100">
                            {successMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dark hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            view === 'login' ? 'Entrar' : 'Enviar Link de Recuperação'
                        )}
                    </button>

                    {view === 'forgot-password' && (
                        <button
                            type="button"
                            onClick={() => { setView('login'); setError(''); setSuccessMessage(''); }}
                            className="w-full text-center text-sm font-medium text-gray-500 hover:text-gray-900 mt-2"
                        >
                            Voltar para Login
                        </button>
                    )}
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <p className="text-sm text-gray-600">
                        Não tem uma conta?{' '}
                        <button
                            onClick={handleRegisterClick}
                            className="font-bold text-primary hover:text-primary-dark transition-colors"
                        >
                            Cadastre-se grátis
                        </button>
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default LoginModal;
