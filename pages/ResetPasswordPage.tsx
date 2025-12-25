import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { PageRoute } from '../types';

interface ResetPasswordPageProps {
    token: string | undefined;
    onNavigate: (page: PageRoute) => void;
}

export function ResetPasswordPage({ token, onNavigate }: ResetPasswordPageProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'validating' | 'valid' | 'invalid' | 'submitting' | 'success' | 'error'>('validating');
    const [errorDetails, setErrorDetails] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        if (!token) {
            setStatus('invalid');
            return;
        }

        const validateToken = async () => {
            try {
                if (!api || !api.verifyResetToken) {
                    console.error("API not initialized");
                    setStatus('error');
                    return;
                }
                const response = await api.verifyResetToken(token);
                if (response && response.valid) {
                    setStatus('valid');
                } else {
                    setStatus('invalid');
                }
            } catch (err) {
                console.error("Token validation error:", err);
                setStatus('error'); // Or 'invalid' if we want to be safe
                setErrorDetails("Erro ao conectar com o serviço.");
            }
        };

        validateToken();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert('As senhas não coincidem');
            return;
        }

        if (!token) return;

        setStatus('submitting');
        const success = await api.completePasswordReset(token, password);

        if (success) {
            setStatus('success');
            setTimeout(() => {
                onNavigate({ name: 'home' });
                // Ideally open login modal here, but navigating to home is a safe default.
                // The user can then click login.
            }, 3000);
        } else {
            setStatus('error');
            setErrorDetails('Falha ao redefinir a senha. Tente novamente ou solicite um novo link.');
        }
    };

    if (status === 'validating') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Validando link de segurança...</p>
                </div>
            </div>
        );
    }

    if (status === 'invalid') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Inválido ou Expirado</h2>
                    <p className="text-gray-600 mb-8">
                        Este link de redefinição de senha não é mais válido. Por favor, solicite uma nova recuperação de senha.
                    </p>
                    <button
                        onClick={() => onNavigate({ name: 'home' })}
                        className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                    >
                        Voltar para o Início
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Senha Redefinida!</h2>
                    <p className="text-gray-600 mb-8">
                        Sua senha foi alterada com sucesso. Você será redirecionado para o início em instantes.
                    </p>
                    <button
                        onClick={() => onNavigate({ name: 'home' })}
                        className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
                    >
                        Ir para o Início Agora
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Nova Senha</h2>
                    <p className="text-gray-600 mt-2">Crie uma nova senha segura para sua conta.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nova Senha</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                minLength={6}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Nova Senha</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                minLength={6}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {status === 'error' && (
                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p>{errorDetails || 'Ocorreu um erro ao redefinir a senha.'}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={status === 'submitting'}
                        className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {status === 'submitting' ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Atualizando...</span>
                            </>
                        ) : (
                            'Redefinir Senha'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ResetPasswordPage;
