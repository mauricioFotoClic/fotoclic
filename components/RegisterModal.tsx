import React, { useState } from 'react';
import { Page, User, UserRole } from '../types';
import { Eye, EyeOff, Sparkles, Camera, Trophy, CheckCircle2, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import Modal from './Modal';
import LiabilityWaiverModal from './LiabilityWaiverModal';
import { useLanguage } from '../contexts/LanguageContext';

interface RegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: (user: User, skipRedirect?: boolean) => void;
    onNavigate: (page: Page) => void;
    onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ddiList = [
    { code: '+55', country: 'BR' },
    { code: '+1', country: 'USA/CA' },
    { code: '+351', country: 'PT' },
    { code: '+44', country: 'UK' },
    { code: '+34', country: 'ES' },
    { code: '+33', country: 'FR' },
    { code: '+49', country: 'DE' },
    { code: '+39', country: 'IT' },
    { code: '+54', country: 'AR' },
    { code: '+52', country: 'MX' },
    { code: '+56', country: 'CL' },
    { code: '+57', country: 'CO' },
    { code: '+86', country: 'CN' },
    { code: '+91', country: 'IN' }
];

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onLoginSuccess, onNavigate, onShowToast }) => {
    const { t } = useLanguage();
    const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.CUSTOMER);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        companyName: '',
        ddi: '+55',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Liability Modal State (for photographers)
    const [showLiabilityModal, setShowLiabilityModal] = useState(false);
    const [pendingUser, setPendingUser] = useState<User | null>(null);
    const [acceptingLiability, setAcceptingLiability] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            ...(name === 'ddi' ? { phone: '' } : {})
        }));
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (formData.ddi !== '+55') {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 15);
            setFormData(prev => ({ ...prev, phone: digits }));
            return;
        }
        const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
        let masked = digits;
        if (digits.length > 10) {
            masked = digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
        } else if (digits.length > 6) {
            masked = digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
        } else if (digits.length > 2) {
            masked = digits.replace(/^(\d{2})(\d+)/, '($1) $2');
        } else if (digits.length > 0) {
            masked = digits.replace(/^(\d+)/, '($1');
        }
        setFormData(prev => ({ ...prev, phone: masked }));
    };

    const performRegister = async () => {
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError(t('auth.passwords_dont_match'));
            return;
        }

        if (formData.password.length < 6) {
            setError(t('auth.password_min_length'));
            return;
        }

        setLoading(true);

        try {
            const newUser = await api.register({
                name: formData.name,
                email: formData.email,
                phone: `${formData.ddi} ${formData.phone}`,
                role: selectedRole,
                password: formData.password,
                ...(selectedRole === UserRole.PRODUCER ? { company_name: formData.companyName } : {})
            } as any);

            if (newUser && newUser.user) {
                const user = newUser.user;

                if (!newUser.session) {
                    setLoading(false);
                    setError('');
                    setFormData(prev => ({ ...prev, name: '' }));

                    onShowToast(`Enviamos um link de confirmação para ${formData.email}. Verifique seu e-mail.`, 'success');
                    onClose();
                    onNavigate({ name: 'login' });
                    return;
                }

                if (user.role === UserRole.PRODUCER) {
                    onShowToast("Cadastro de Produtor realizado! Aguarde a moderação da equipe FotoClic.", "success");
                    onClose();
                    onNavigate({ name: 'pending-approval' });
                } else if (user.role === UserRole.PHOTOGRAPHER) {
                    try {
                        const { emailService } = await import('../services/emailService');
                        await Promise.all([
                            emailService.sendNewPhotographerNotification(user.name, user.email),
                            emailService.sendWelcomeEmail(user.email, user.name, 'photographer')
                        ]);
                    } catch (emailError) {
                        console.error("Failed to send photographer emails:", emailError);
                    }
                    setPendingUser(user);
                    setShowLiabilityModal(true);
                } else {
                    try {
                        const { emailService } = await import('../services/emailService');
                        await emailService.sendWelcomeEmail(user.email, user.name, 'customer');
                    } catch (emailError) {
                        console.error("Failed to send customer welcome email:", emailError);
                    }
                    onClose();
                    onLoginSuccess(user, true);
                    onNavigate({ name: 'welcome', role: 'customer' });
                }
            } else {
                setError(t('auth.email_exists_error'));
            }
        } catch (err: any) {
            console.error("Registration error:", err);
            const errMsg = err?.message || '';
            if (
                err?.code === 'user_already_exists' ||
                err?.isDuplicateEmail ||
                errMsg.toLowerCase().includes('already registered') ||
                errMsg.toLowerCase().includes('already exists') ||
                errMsg.toLowerCase().includes('já possui cadastro') ||
                errMsg.toLowerCase().includes('já está cadastrado')
            ) {
                setError(t('auth.email_exists_error'));
            } else {
                setError(errMsg || t('auth.generic_reg_error'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLiabilityAccept = async () => {
        if (!pendingUser) return;

        setAcceptingLiability(true);
        try {
            const success = await api.updateUserLiabilityWaiver(pendingUser.id);
            if (success) {
                onClose();
                onLoginSuccess(pendingUser, true);
                onNavigate({ name: 'welcome', role: 'photographer' });
            } else {
                alert("Erro ao salvar aceitação do termo. Tente novamente.");
            }
        } catch (error) {
            console.error("Error accepting liability:", error);
            alert("Erro ao processar. Tente novamente.");
        } finally {
            setAcceptingLiability(false);
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

    if (showLiabilityModal && pendingUser) {
        return (
            <LiabilityWaiverModal
                isOpen={isOpen}
                photographerName={pendingUser.name}
                onAccept={handleLiabilityAccept}
                loading={acceptingLiability}
            />
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" noPadding showCloseButton={true} closeOnOverlayClick={false}>
            <div className="p-4 sm:p-6">
                {/* Cabeçalho Compacto */}
                <div className="text-center mb-3.5">
                    <h2 className="text-xl sm:text-2xl font-display font-black text-gray-900 tracking-tight">
                        {t('auth.create_account_title')}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Selecione seu tipo de conta para começar
                    </p>
                </div>

                {/* 🌟 SELETOR DE PERFIL COMPACTO (3 CARDS SEM ROLAGEM) */}
                <div className="mb-3.5">
                    <div className="grid grid-cols-3 gap-2">
                        {/* 1. Cliente */}
                        <button
                            type="button"
                            onClick={() => setSelectedRole(UserRole.CUSTOMER)}
                            className={`relative flex flex-col items-center sm:items-start p-2.5 rounded-xl border-2 text-center sm:text-left transition-all duration-150 cursor-pointer ${
                                selectedRole === UserRole.CUSTOMER
                                    ? 'border-primary bg-primary/[0.04] ring-1 ring-primary/20 shadow-xs'
                                    : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50'
                            }`}
                        >
                            <div className="flex items-center justify-between w-full mb-1">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                    selectedRole === UserRole.CUSTOMER
                                        ? 'bg-primary text-white shadow-xs'
                                        : 'bg-neutral-100 text-neutral-600'
                                }`}>
                                    <Sparkles size={14} />
                                </div>
                                {selectedRole === UserRole.CUSTOMER && (
                                    <CheckCircle2 size={15} className="text-primary hidden sm:block animate-in zoom-in-50 duration-150" />
                                )}
                            </div>
                            <div className="font-bold text-xs sm:text-sm text-gray-900 leading-tight">Cliente</div>
                            <div className="text-[10px] text-gray-500 mt-0.5 hidden sm:block line-clamp-1">
                                Comprar e buscar fotos
                            </div>
                            <span className="mt-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                Acesso Direto
                            </span>
                        </button>

                        {/* 2. Fotógrafo */}
                        <button
                            type="button"
                            onClick={() => setSelectedRole(UserRole.PHOTOGRAPHER)}
                            className={`relative flex flex-col items-center sm:items-start p-2.5 rounded-xl border-2 text-center sm:text-left transition-all duration-150 cursor-pointer ${
                                selectedRole === UserRole.PHOTOGRAPHER
                                    ? 'border-primary bg-primary/[0.04] ring-1 ring-primary/20 shadow-xs'
                                    : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50'
                            }`}
                        >
                            <div className="flex items-center justify-between w-full mb-1">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                    selectedRole === UserRole.PHOTOGRAPHER
                                        ? 'bg-primary text-white shadow-xs'
                                        : 'bg-neutral-100 text-neutral-600'
                                }`}>
                                    <Camera size={14} />
                                </div>
                                {selectedRole === UserRole.PHOTOGRAPHER && (
                                    <CheckCircle2 size={15} className="text-primary hidden sm:block animate-in zoom-in-50 duration-150" />
                                )}
                            </div>
                            <div className="font-bold text-xs sm:text-sm text-gray-900 leading-tight">Fotógrafo</div>
                            <div className="text-[10px] text-gray-500 mt-0.5 hidden sm:block line-clamp-1">
                                Vender fotos e criar galerias
                            </div>
                            <span className="mt-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                                Vender Fotos
                            </span>
                        </button>

                        {/* 3. Produtor */}
                        <button
                            type="button"
                            onClick={() => setSelectedRole(UserRole.PRODUCER)}
                            className={`relative flex flex-col items-center sm:items-start p-2.5 rounded-xl border-2 text-center sm:text-left transition-all duration-150 cursor-pointer ${
                                selectedRole === UserRole.PRODUCER
                                    ? 'border-primary bg-primary/[0.04] ring-1 ring-primary/20 shadow-xs'
                                    : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50'
                            }`}
                        >
                            <div className="flex items-center justify-between w-full mb-1">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                    selectedRole === UserRole.PRODUCER
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'bg-neutral-100 text-neutral-600'
                                }`}>
                                    <Trophy size={14} />
                                </div>
                                {selectedRole === UserRole.PRODUCER && (
                                    <CheckCircle2 size={15} className="text-primary hidden sm:block animate-in zoom-in-50 duration-150" />
                                )}
                            </div>
                            <div className="font-bold text-xs sm:text-sm text-gray-900 leading-tight">Produtor</div>
                            <div className="text-[10px] text-gray-500 mt-0.5 hidden sm:block line-clamp-1">
                                Eventos e equipe (até 10)
                            </div>
                            <span className="mt-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                                Coordenação
                            </span>
                        </button>
                    </div>
                </div>

                {/* Formulário Dinâmico e Compacto */}
                <form className="space-y-2.5" onSubmit={handleSubmit}>
                    {/* Linha 1: Nome (e Empresa se Produtor) */}
                    <div className={selectedRole === UserRole.PRODUCER ? "grid grid-cols-1 sm:grid-cols-2 gap-2" : "grid grid-cols-1 sm:grid-cols-2 gap-2"}>
                        <div className="min-w-0">
                            <label htmlFor="reg-name" className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-0.5 ml-0.5">
                                {selectedRole === UserRole.PRODUCER ? 'Nome do Responsável' : t('auth.name')}
                            </label>
                            <input
                                id="reg-name"
                                name="name"
                                type="text"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                placeholder={t('auth.your_name')}
                                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400 text-xs sm:text-sm"
                            />
                        </div>

                        {selectedRole === UserRole.PRODUCER ? (
                            <div className="min-w-0">
                                <label htmlFor="reg-company" className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-0.5 ml-0.5">
                                    Produtora / Empresa
                                </label>
                                <input
                                    id="reg-company"
                                    name="companyName"
                                    type="text"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    placeholder="Ex: TopSports Eventos"
                                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400 text-xs sm:text-sm"
                                />
                            </div>
                        ) : (
                            <div className="min-w-0">
                                <label htmlFor="reg-email" className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-0.5 ml-0.5">
                                    {t('auth.email')}
                                </label>
                                <input
                                    id="reg-email"
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder={t('auth.email_placeholder')}
                                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400 text-xs sm:text-sm"
                                />
                            </div>
                        )}
                    </div>

                    {/* Linha 2: E-mail (se Produtor) e WhatsApp/Telefone */}
                    <div className={selectedRole === UserRole.PRODUCER ? "grid grid-cols-1 sm:grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
                        {selectedRole === UserRole.PRODUCER && (
                            <div className="min-w-0">
                                <label htmlFor="reg-email-prod" className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-0.5 ml-0.5">
                                    {t('auth.email')}
                                </label>
                                <input
                                    id="reg-email-prod"
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder={t('auth.email_placeholder')}
                                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400 text-xs sm:text-sm"
                                />
                            </div>
                        )}

                        <div className="min-w-0">
                            <label htmlFor="reg-phone" className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-0.5 ml-0.5">
                                {t('auth.whatsapp_phone')}
                            </label>
                            <div className="flex gap-1.5 w-full min-w-0">
                                <select
                                    name="ddi"
                                    value={formData.ddi}
                                    onChange={handleChange}
                                    className="w-[84px] sm:w-[90px] px-1.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent transition-all outline-none text-gray-900 cursor-pointer text-xs font-medium shrink-0 text-ellipsis overflow-hidden"
                                >
                                    {ddiList.map(item => (
                                        <option key={item.code} value={item.code}>
                                            {item.code} {item.country}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    id="reg-phone"
                                    name="phone"
                                    type="tel"
                                    required
                                    value={formData.phone}
                                    onChange={handlePhoneChange}
                                    placeholder="(11) 99999-9999"
                                    maxLength={15}
                                    className="w-full min-w-0 flex-1 px-2.5 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400 text-xs sm:text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Linha 3: Senhas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="min-w-0">
                            <label htmlFor="reg-password" className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-0.5 ml-0.5">
                                {t('auth.password')}
                            </label>
                            <div className="relative w-full min-w-0">
                                <input
                                    id="reg-password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••"
                                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400 pr-9 text-xs sm:text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>
                        <div className="min-w-0">
                            <label htmlFor="reg-confirm" className="block text-[11px] font-bold uppercase tracking-wider text-gray-700 mb-0.5 ml-0.5">
                                {t('auth.confirm')}
                            </label>
                            <div className="relative w-full min-w-0">
                                <input
                                    id="reg-confirm"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••"
                                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400 pr-9 text-xs sm:text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                                >
                                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Aviso de Moderação para Produtores */}
                    {selectedRole === UserRole.PRODUCER && (
                        <div className="p-2 bg-amber-50/80 border border-amber-200/70 rounded-lg flex items-center gap-2 text-[11px] text-amber-900 animate-in fade-in duration-150">
                            <ShieldAlert size={14} className="text-amber-600 shrink-0" />
                            <span>
                                Contas de <strong>Produtor</strong> passam por moderação antes da liberação do painel.
                            </span>
                        </div>
                    )}

                    {error && (
                        <div className={`p-3 rounded-xl border text-xs transition-all duration-200 ${
                            error.includes('já possui cadastro') || error.includes('já está cadastrado') || error.includes('already registered')
                                ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-sm'
                                : 'bg-red-50 border-red-100 text-red-600'
                        }`}>
                            <div className="flex items-start gap-2.5">
                                <ShieldAlert size={16} className={`shrink-0 mt-0.5 ${
                                    error.includes('já possui cadastro') || error.includes('já está cadastrado') || error.includes('already registered')
                                        ? 'text-amber-600'
                                        : 'text-red-500'
                                }`} />
                                <div className="flex-1">
                                    <span className="font-bold block mb-0.5 text-gray-900">
                                        {error.includes('já possui cadastro') || error.includes('já está cadastrado') || error.includes('already registered')
                                            ? 'E-mail já cadastrado!'
                                            : 'Erro no cadastro'}
                                    </span>
                                    <p className="text-gray-700 leading-snug">{error}</p>
                                    {(error.includes('já possui cadastro') || error.includes('já está cadastrado') || error.includes('already registered')) && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onClose();
                                                    onNavigate({ name: 'login' });
                                                }}
                                                className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary-dark shadow-sm transition-all cursor-pointer"
                                            >
                                                Fazer Login
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dark hover:shadow-md transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer mt-1"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            selectedRole === UserRole.PRODUCER
                                ? 'Criar Conta de Produtor'
                                : selectedRole === UserRole.PHOTOGRAPHER
                                ? 'Cadastrar como Fotógrafo'
                                : t('auth.create_account_button')
                        )}
                    </button>
                </form>

                <div className="mt-3 pt-2.5 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-600">
                        {t('auth.already_have_account')}{' '}
                        <button
                            onClick={handleLoginClick}
                            className="font-bold text-primary hover:text-primary-dark transition-colors cursor-pointer"
                        >
                            {t('auth.do_login')}
                        </button>
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default RegisterModal;
