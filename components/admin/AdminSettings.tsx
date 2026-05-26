import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { CommissionSettings, User, EmailTemplates, EmailTemplate } from '../../types';
import api from '../../services/api';
import Spinner from '../Spinner';
import Toast from '../Toast';
import { includesNormalized } from '../../utils/stringUtils';

const EmailTemplateEditor: React.FC<{
    title: string;
    template: EmailTemplate;
    onUpdate: (template: EmailTemplate) => void;
    placeholders: string[];
}> = ({ title, template, onUpdate, placeholders }) => {
    return (
        <div className="border-t pt-4">
            <h3 className="text-lg font-display font-semibold text-primary-dark">{title}</h3>
            {placeholders.length > 0 && (
                <p className="text-xs text-neutral-500 mt-1 mb-2">
                    Variáveis disponíveis: {placeholders.map(p => `{{${p}}}`).join(', ')}
                </p>
            )}
            <div className="space-y-2">
                <div>
                    <label className="text-sm font-medium text-neutral-700">Assunto</label>
                    <input
                        type="text"
                        value={template.subject}
                        onChange={(e) => onUpdate({ ...template, subject: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium text-neutral-700">Corpo do E-mail</label>
                    <textarea
                        value={template.body}
                        onChange={(e) => onUpdate({ ...template, body: e.target.value })}
                        rows={6}
                        className="w-full mt-1 px-3 py-2 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                </div>
            </div>
        </div>
    );
};

const AdminSettings: React.FC = () => {
    const [commissionSettings, setCommissionSettings] = useState<CommissionSettings | null>(null);
    const [emailTemplates, setEmailTemplates] = useState<EmailTemplates | null>(null);
    const [photographers, setPhotographers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;


    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [settingsData, photographersData, templatesData] = await Promise.all([
                api.getCommissionSettings(),
                api.getPhotographers(),
                api.getEmailTemplates(),
            ]);
            setCommissionSettings(settingsData);
            setPhotographers(photographersData);
            setEmailTemplates(templatesData);
        } catch (error) {
            console.error("Failed to fetch settings data", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDefaultRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!commissionSettings) return;
        const value = e.target.value;
        setCommissionSettings({
            ...commissionSettings,
            defaultRate: value ? parseFloat(value) / 100 : 0,
        });
    };

    const handleDefaultVideoRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!commissionSettings) return;
        const value = e.target.value;
        setCommissionSettings({
            ...commissionSettings,
            defaultVideoRate: value ? parseFloat(value) / 100 : 0,
        });
    };

    const handleCustomRateChange = (photographerId: string, value: string) => {
        if (!commissionSettings) return;

        const newCustomRates = { ...commissionSettings.customRates };

        if (value === '' || isNaN(parseFloat(value))) {
            delete newCustomRates[photographerId];
        } else {
            newCustomRates[photographerId] = parseFloat(value) / 100;
        }

        setCommissionSettings({
            ...commissionSettings,
            customRates: newCustomRates,
        });
    };

    const handleTemplateChange = (templateName: keyof EmailTemplates, data: EmailTemplate) => {
        setEmailTemplates(prev => prev ? { ...prev, [templateName]: data } : null);
    };

    const handleSave = async () => {
        if (!commissionSettings || !emailTemplates) return;

        setSaving(true);
        try {
            await Promise.all([
                api.updateCommissionSettings(commissionSettings),
                api.updateEmailTemplates(emailTemplates),
            ]);
            setToast({ message: 'Configurações salvas com sucesso!', type: 'success' });
        } catch (error) {
            console.error("Failed to save settings", error);
            setToast({ message: 'Ocorreu um erro ao salvar as configurações.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const filteredPhotographers = useMemo(() => {
        return photographers.filter(p =>
            includesNormalized(p.name, searchTerm) ||
            includesNormalized(p.email, searchTerm)
        );
    }, [photographers, searchTerm]);

    const totalPages = Math.ceil(filteredPhotographers.length / itemsPerPage);
    const paginatedPhotographers = useMemo(() => {
        return filteredPhotographers.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );
    }, [filteredPhotographers, currentPage]);

    const goToNextPage = () => {
        setCurrentPage((page) => Math.min(page + 1, totalPages));
    };

    const goToPreviousPage = () => {
        setCurrentPage((page) => Math.max(page - 1, 1));
    };


    if (loading) return <Spinner size="lg" fullHeight={true} label="Carregando configurações..." />;
    if (!commissionSettings || !emailTemplates) return <p>Não foi possível carregar as configurações.</p>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-display font-bold text-primary-dark">Configurações</h1>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 text-sm font-medium text-white bg-primary rounded-full hover:bg-opacity-90 transition-colors disabled:bg-neutral-400"
                >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-xl font-display font-bold text-primary-dark mb-4">Configurações de Comissão</h2>
                <div className="mb-6">
                    <h3 className="text-lg font-display font-semibold text-primary-dark mb-2">Comissão Padrão</h3>
                    <p className="text-sm text-neutral-600 mb-4">
                        Defina a comissão padrão para fotos (aplicável a menos que haja taxa específica por fotógrafo) e a comissão padrão para vídeos (aplicada globalmente).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
                        <div>
                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                                Fotos
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={(commissionSettings.defaultRate * 100).toFixed(0)}
                                    onChange={handleDefaultRateChange}
                                    className="w-full pl-3 pr-8 py-2 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    placeholder="15"
                                />
                                <span className="absolute inset-y-0 right-3 flex items-center text-neutral-500">%</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                                Vídeos (Global)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={((commissionSettings.defaultVideoRate ?? 0.10) * 100).toFixed(0)}
                                    onChange={handleDefaultVideoRateChange}
                                    className="w-full pl-3 pr-8 py-2 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    placeholder="10"
                                />
                                <span className="absolute inset-y-0 right-3 flex items-center text-neutral-500">%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-display font-semibold text-primary-dark">Comissões Específicas por Fotógrafo</h3>
                    <p className="text-sm text-neutral-600 mb-4">
                        Defina uma comissão diferente para fotógrafos específicos. Deixe em branco para usar a taxa padrão.
                    </p>
                    <div className="mb-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar fotógrafo por nome ou email..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-300 rounded-full focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {paginatedPhotographers.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 rounded-md bg-neutral-50 border">
                                <div className="flex items-center">
                                    <img src={p.avatar_url} alt={p.name} className="w-10 h-10 rounded-full object-cover mr-4" />
                                    <div>
                                        <p className="font-medium text-neutral-800">{p.name}</p>
                                        <p className="text-xs text-neutral-500">{p.email}</p>
                                    </div>
                                </div>
                                <div className="relative w-36">
                                    <input
                                        type="number"
                                        value={commissionSettings.customRates[p.id] !== undefined ? (commissionSettings.customRates[p.id] * 100).toFixed(0) : ''}
                                        onChange={(e) => handleCustomRateChange(p.id, e.target.value)}
                                        className="w-full pl-3 pr-8 py-2 bg-white border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                        placeholder={`${(commissionSettings.defaultRate * 100).toFixed(0)} (padrão)`}
                                    />
                                    <span className="absolute inset-y-0 right-3 flex items-center text-neutral-500">%</span>
                                </div>
                            </div>
                        ))}
                        {filteredPhotographers.length === 0 && (
                            <p className="text-center py-4 text-neutral-500">Nenhum fotógrafo encontrado.</p>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-6 pt-4 border-t">
                            <button
                                onClick={goToPreviousPage}
                                disabled={currentPage === 1}
                                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors"
                            >
                                Anterior
                            </button>
                            <span className="text-sm text-neutral-500">
                                Página {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={goToNextPage}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors"
                            >
                                Próxima
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mt-8">
                <h2 className="text-xl font-display font-bold text-primary-dark mb-4">Modelos de E-mail</h2>
                <p className="text-sm text-neutral-600 mb-4">
                    Personalize as mensagens automáticas enviadas aos fotógrafos.
                </p>
                <div className="space-y-6">
                    <EmailTemplateEditor
                        title="Boas-vindas (Fotógrafo)"
                        template={emailTemplates.welcomePhotographer || { subject: '', body: '' }}
                        onUpdate={(t) => handleTemplateChange('welcomePhotographer', t)}
                        placeholders={['nome_fotografo']}
                    />
                    <EmailTemplateEditor
                        title="Boas-vindas (Cliente)"
                        template={emailTemplates.welcomeCustomer || { subject: '', body: '' }}
                        onUpdate={(t) => handleTemplateChange('welcomeCustomer', t)}
                        placeholders={['nome_cliente']}
                    />
                    <EmailTemplateEditor
                        title="Ativação de Fotógrafo"
                        template={emailTemplates.photographerActivated}
                        onUpdate={(t) => handleTemplateChange('photographerActivated', t)}
                        placeholders={['nome_fotografo']}
                    />
                    <EmailTemplateEditor
                        title="Desativação de Fotógrafo"
                        template={emailTemplates.photographerDeactivated}
                        onUpdate={(t) => handleTemplateChange('photographerDeactivated', t)}
                        placeholders={['nome_fotografo']}
                    />
                    <EmailTemplateEditor
                        title="Rejeição de Foto"
                        template={emailTemplates.photoRejected}
                        onUpdate={(t) => handleTemplateChange('photoRejected', t)}
                        placeholders={['nome_fotografo', 'titulo_foto', 'motivo_rejeicao']}
                    />
                    <EmailTemplateEditor
                        title="Pagamento Processado (Fotógrafo)"
                        template={emailTemplates.payoutProcessed}
                        onUpdate={(t) => handleTemplateChange('payoutProcessed', t)}
                        placeholders={['nome_fotografo', 'valor_pagamento', 'data_pagamento']}
                    />
                    <EmailTemplateEditor
                        title="Confirmação de Compra (Cliente)"
                        template={emailTemplates.purchaseConfirmation || { subject: '', body: '' }}
                        onUpdate={(t) => handleTemplateChange('purchaseConfirmation', t)}
                        placeholders={['nome_cliente', 'valor_total', 'quantidade_fotos', 'lista_fotos']}
                    />
                </div>
            </div>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default AdminSettings;

