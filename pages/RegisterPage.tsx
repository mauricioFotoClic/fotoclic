import React, { useState } from 'react';
import { Page, User, UserRole } from '../types';
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
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        ddi: '+55',
        phone: '',
        password: '',
        confirmPassword: '',
        isPhotographer: false
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
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
                role: formData.isPhotographer ? UserRole.PHOTOGRAPHER : UserRole.CUSTOMER,
                password: formData.password
            });

            if (response?.user) {
                onLoginSuccess(response.user, true);
                if (response.user.role === UserRole.PHOTOGRAPHER) {
                    onNavigate({ name: 'welcome', role: 'photographer' });
                } else {
                    onNavigate({ name: 'welcome', role: 'customer' });
                }
            } else {
                setError(t('auth.email_exists_error'));
            }
        } catch (err) {
            setError(t('auth.generic_reg_error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
                <Logo size={48} className="mb-6" useImage={true} />
                <h2 className="text-center text-3xl font-extrabold text-gray-900 font-display">
                    {t('auth.create_account_title')}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    {t('auth.already_have_account')}{' '}
                    <button onClick={() => onNavigate({ name: 'login' })} className="font-medium text-primary hover:text-primary-dark">
                        {t('auth.do_login')}
                    </button>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                {t('auth.name')}
                            </label>
                            <div className="mt-1">
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                {t('auth.email_address')}
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                {t('auth.whatsapp_phone')}
                            </label>
                            <div className="mt-1 flex gap-2">
                                <select
                                    name="ddi"
                                    value={formData.ddi}
                                    onChange={handleChange}
                                    className="w-1/3 min-w-[100px] block px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm cursor-pointer"
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
                                    autoComplete="tel"
                                    placeholder="(11) 99999-9999"
                                    required
                                    value={formData.phone}
                                    onChange={handlePhoneChange}
                                    maxLength={15}
                                    className="appearance-none block w-2/3 px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                {t('auth.password')}
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                {t('auth.confirm_password')}
                            </label>
                            <div className="mt-1">
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex items-center">
                            <input
                                id="isPhotographer"
                                name="isPhotographer"
                                type="checkbox"
                                checked={formData.isPhotographer}
                                onChange={handleChange}
                                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <label htmlFor="isPhotographer" className="ml-2 block text-sm text-gray-900">
                                {t('auth.want_to_sell_photos')} ({t('auth.photographer_account')})
                            </label>
                        </div>

                        {error && (
                            <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
                                {error}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70 transition-colors"
                            >
                                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : t('auth.register_button')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
