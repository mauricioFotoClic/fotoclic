import React, { useState } from 'react';
import { Page, User, UserRole } from '../types';
import api from '../services/api';
import Modal from './Modal';

interface RegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: (user: User) => void;
    onNavigate: (page: Page) => void;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onLoginSuccess, onNavigate }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        isPhotographer: false
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const performRegister = async () => {
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        if (formData.password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setLoading(true);

        try {
            const newUser = await api.register({
                name: formData.name,
                email: formData.email,
                role: formData.isPhotographer ? UserRole.PHOTOGRAPHER : UserRole.CUSTOMER,
                password: formData.password
            });

            if (newUser) {
                onClose();
                if (newUser.role === UserRole.PHOTOGRAPHER) {
                    onNavigate({ name: 'pending-approval' });
                } else {
                    onLoginSuccess(newUser);
                    onNavigate({ name: 'home' });
                }
            } else {
                setError('Este e-mail já está cadastrado.');
            }
        } catch (err) {
            setError('Ocorreu um erro ao criar a conta. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await performRegister();
    };

    const handleLoginClick = () => {
        onClose();
        onNavigate({ name: 'login' });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" size="md" noPadding>
            <div className="p-8">
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">Crie sua conta</h2>
                    <p className="text-gray-500">
                        Junte-se à nossa comunidade criativa
                    </p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="reg-name" className="block text-sm font-medium text-gray-700 mb-1 ml-1">
                            Nome Completo
                        </label>
                        <input
                            id="reg-name"
                            name="name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Seu nome"
                            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400"
                        />
                    </div>

                    <div>
                        <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1 ml-1">
                            E-mail
                        </label>
                        <input
                            id="reg-email"
                            name="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="seu@email.com"
                            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1 ml-1">
                                Senha
                            </label>
                            <input
                                id="reg-password"
                                name="password"
                                type="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••"
                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400"
                            />
                        </div>
                        <div>
                            <label htmlFor="reg-confirm" className="block text-sm font-medium text-gray-700 mb-1 ml-1">
                                Confirmar
                            </label>
                            <input
                                id="reg-confirm"
                                name="confirmPassword"
                                type="password"
                                required
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="••••••"
                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400"
                            />
                        </div>
                    </div>

                    <div className="flex items-center p-3 bg-neutral-50 rounded-xl border border-neutral-100 cursor-pointer hover:bg-neutral-100 transition-colors" onClick={() => setFormData(prev => ({ ...prev, isPhotographer: !prev.isPhotographer }))}>
                        <div className="flex items-center h-5">
                            <input
                                id="isPhotographer"
                                name="isPhotographer"
                                type="checkbox"
                                checked={formData.isPhotographer}
                                onChange={handleChange}
                                className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer"
                            />
                        </div>
                        <div className="ml-3 text-sm">
                            <label htmlFor="isPhotographer" className="font-medium text-gray-900 cursor-pointer">
                                Quero vender minhas fotos
                            </label>
                            <p className="text-gray-500 text-xs">Conta de Fotógrafo</p>
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-xl border border-red-100 flex items-center justify-center animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
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
                            'Criar Conta'
                        )}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                    <p className="text-sm text-gray-600">
                        Já tem uma conta?{' '}
                        <button
                            onClick={handleLoginClick}
                            className="font-bold text-primary hover:text-primary-dark transition-colors"
                        >
                            Faça login
                        </button>
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default RegisterModal;
