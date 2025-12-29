import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
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
        // Check for session instead of token
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setStatus('valid');
            } else {
                // Wait a bit for auto-signin if redirect just happened
                setTimeout(async () => {
                    const { data: { session: retrySession } } = await supabase.auth.getSession();
                    if (retrySession) {
                        setStatus('valid');
                    } else {
                        // If no session, check if we have a hash access_token (implicit flow) or code (pkce)
                        // Supabase client usually handles this. If it failed, show error.
                        // But for now, let's assume if there's no session, the link is invalid/expired
                        // UNLESS we are in the middle of processing.
                        const hash = window.location.hash;
                        const search = window.location.search;
                        if (hash.includes('access_token') || search.includes('code')) {
                            setStatus('validating');
                            // The auth listener in main.tsx or App.tsx should handle this?? 
                            // Let's add a listener here just in case.
                            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                                if (event === 'PASSWORD_RECOVERY' || session) {
                                    setStatus('valid');
                                }
                            });
                            return () => subscription.unsubscribe();
                        } else {
                            setStatus('invalid');
                        }
                    }
                }, 1000);
            }
        };
        checkSession();

        // Listen for auth changes
        const { data: autListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (session) setStatus('valid');
        });
        return () => autListener.subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert('As senhas não coincidem');
            return;
        }

        setStatus('submitting');

        try {
            const { error } = await supabase.auth.updateUser({ password: password });

            if (!error) {
                setStatus('success');
                // Also update public.users just in case we kept the password column?
                // No, we don't store it anymore.
                setTimeout(() => {
                    onNavigate({ name: 'home' });
                }, 3000);
            } else {
                throw error;
            }
        } catch (err: any) {
            setStatus('error');
            setErrorDetails(err.message || 'Falha ao redefinir a senha.');
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
