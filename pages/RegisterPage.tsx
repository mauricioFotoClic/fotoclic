import React, { useState } from 'react';
import { Page, User, UserRole } from '../types';
import { Sparkles, Camera, Trophy, CheckCircle2, ShieldAlert } from 'lucide-react';
import api from '../services/api';
import Logo from '../components/Logo';
import { useLanguage } from '../contexts/LanguageContext';

interface RegisterPageProps {
    onNavigate: (page: Page) => void;
    onLoginSuccess: (user: User, skipRedirect?: boolean) => void;
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

const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate, onLoginSuccess }) => {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
            const response = await api.register({
                name: formData.name,
                email: formData.email,
                phone: `${formData.ddi} ${formData.phone}`,
                role: selectedRole,
                password: formData.password,
                ...(selectedRole === UserRole.PRODUCER ? { company_name: formData.companyName } : {})
            } as any);

            if (response?.user) {
                if (response.user.role === UserRole.PRODUCER) {
                    onNavigate({ name: 'pending-approval' });
                } else if (response.user.role === UserRole.PHOTOGRAPHER) {
                    onLoginSuccess(response.user, true);
                    onNavigate({ name: 'welcome', role: 'photographer' });
                } else {
                    onLoginSuccess(response.user, true);
                    onNavigate({ name: 'welcome', role: 'customer' });
                }
            } else {
                setError(t('auth.email_exists_error'));
            }
        } catch (err: any) {
            setError(err.message || t('auth.generic_reg_error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-xl flex flex-col items-center">
                <Logo size={48} className="mb-4" useImage={true} />
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-3">
                    <Sparkles size={13} />
                    Cadastro Oficial FotoClic
                </span>
                <h2 className="text-center text-3xl font-extrabold text-gray-900 font-display">
                    {t('auth.create_account_title')}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    {t('auth.already_have_account')}{' '}
                    <button onClick={() => onNavigate({ name: 'login' })} className="font-bold text-primary hover:text-primary-dark cursor-pointer">
                        {t('auth.do_login')}
                    </button>
                </p>
            </div>

            <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
                <div className="bg-white py-8 px-5 shadow-xl sm:rounded-2xl sm:px-10 border border-neutral-100">
                    {/* Seletor de Perfil em 3 Cards */}
                    <div className="mb-6">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5 ml-1">
                            Escolha seu tipo de conta
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {/* 1. Atleta / Comprador */}
                            <button
                                type="button"
                                onClick={() => setSelectedRole(UserRole.CUSTOMER)}
                                className={`relative flex flex-col items-start p-3.5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
                                    selectedRole === UserRole.CUSTOMER
                                        ? 'border-primary bg-primary/[0.04] ring-2 ring-primary/20 shadow-sm'
                                        : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/70'
                                }`}
                            >
                                <div className="flex items-center justify-between w-full mb-2">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                        selectedRole === UserRole.CUSTOMER
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'bg-neutral-100 text-neutral-600'
                                    }`}>
                                        <Sparkles size={18} />
                                    </div>
                                    {selectedRole === UserRole.CUSTOMER && (
                                        <CheckCircle2 size={18} className="text-primary animate-in zoom-in-50 duration-150" />
                                    )}
                                </div>
                                <div className="font-bold text-sm text-gray-900 leading-tight">Atleta / Cliente</div>
                                <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                                    Comprar e buscar fotos
                                </div>
                                <span className="mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                    Acesso Direto
                                </span>
                            </button>

                            {/* 2. Fotógrafo */}
                            <button
                                type="button"
                                onClick={() => setSelectedRole(UserRole.PHOTOGRAPHER)}
                                className={`relative flex flex-col items-start p-3.5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
                                    selectedRole === UserRole.PHOTOGRAPHER
                                        ? 'border-primary bg-primary/[0.04] ring-2 ring-primary/20 shadow-sm'
                                        : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/70'
                                }`}
                            >
                                <div className="flex items-center justify-between w-full mb-2">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                        selectedRole === UserRole.PHOTOGRAPHER
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'bg-neutral-100 text-neutral-600'
                                    }`}>
                                        <Camera size={18} />
                                    </div>
                                    {selectedRole === UserRole.PHOTOGRAPHER && (
                                        <CheckCircle2 size={18} className="text-primary animate-in zoom-in-50 duration-150" />
                                    )}
                                </div>
                                <div className="font-bold text-sm text-gray-900 leading-tight">Fotógrafo</div>
                                <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                                    Vender fotos e criar eventos
                                </div>
                                <span className="mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                                    Vender Fotos
                                </span>
                            </button>

                            {/* 3. Produtor de Eventos */}
                            <button
                                type="button"
                                onClick={() => setSelectedRole(UserRole.PRODUCER)}
                                className={`relative flex flex-col items-start p-3.5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
                                    selectedRole === UserRole.PRODUCER
                                        ? 'border-primary bg-primary/[0.04] ring-2 ring-primary/20 shadow-sm'
                                        : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/70'
                                }`}
                            >
                                <div className="flex items-center justify-between w-full mb-2">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                        selectedRole === UserRole.PRODUCER
                                            ? 'bg-amber-500 text-white shadow-sm'
                                            : 'bg-neutral-100 text-neutral-600'
                                    }`}>
                                        <Trophy size={18} />
                                    </div>
                                    {selectedRole === UserRole.PRODUCER && (
                                        <CheckCircle2 size={18} className="text-primary animate-in zoom-in-50 duration-150" />
                                    )}
                                </div>
                                <div className="font-bold text-sm text-gray-900 leading-tight">Produtor</div>
                                <div className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                                    Eventos & equipe (até 10)
                                </div>
                                <span className="mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                                    Coordenação
                                </span>
                            </button>
                        </div>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 ml-1">
                                {selectedRole === UserRole.PRODUCER ? 'Nome do Responsável' : t('auth.name')}
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                placeholder={t('auth.your_name')}
                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400 text-sm"
                            />
                        </div>

                        {selectedRole === UserRole.PRODUCER && (
                            <div className="animate-in fade-in duration-200">
                                <label htmlFor="companyName" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 ml-1">
                                    Nome da Produtora / Empresa / Agência
                                </label>
                                <input
                                    id="companyName"
                                    name="companyName"
                                    type="text"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    placeholder="Ex: TopSports Eventos Esportivos"
                                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400 text-sm"
                                />
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 ml-1">
                                {t('auth.email_address')}
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                placeholder={t('auth.email_placeholder')}
                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400 text-sm"
                            />
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 ml-1">
                                {t('auth.whatsapp_phone')}
                            </label>
                            <div className="flex gap-2">
                                <select
                                    name="ddi"
                                    value={formData.ddi}
                                    onChange={handleChange}
                                    className="w-1/3 min-w-[100px] px-3 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent transition-all outline-none text-gray-900 cursor-pointer text-sm font-medium"
                                >
                                    {ddiList.map(item => (
                                        <option key={item.code} value={item.code}>
                                            {item.code} {item.country}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    required
                                    value={formData.phone}
                                    onChange={handlePhoneChange}
                                    placeholder="(11) 99999-9999"
                                    maxLength={15}
                                    className="w-2/3 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400 text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 ml-1">
                                    {t('auth.password')}
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••"
                                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400 text-sm"
                                />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1 ml-1">
                                    {t('auth.confirm_password')}
                                </label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••"
                                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent transition-all outline-none text-gray-900 placeholder-gray-400 text-sm"
                                />
                            </div>
                        </div>

                        {selectedRole === UserRole.PRODUCER && (
                            <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in duration-150">
                                <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                <span>
                                    Contas de <strong>Produtor</strong> passam por moderação da equipe FotoClic antes da liberação do painel para garantir a segurança dos splits e eventos.
                                </span>
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-dark hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none cursor-pointer mt-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                selectedRole === UserRole.PRODUCER
                                    ? 'Criar Conta de Produtor'
                                    : selectedRole === UserRole.PHOTOGRAPHER
                                    ? 'Cadastrar como Fotógrafo'
                                    : t('auth.create_account_button')
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
