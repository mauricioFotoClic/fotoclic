import React, { useState, useEffect, useMemo } from 'react';
import { User, PhotoEvent } from '../../types';
import api from '../../services/api';
import { supabase } from '../../services/supabaseClient';
import Spinner from '../Spinner';

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const MegaphoneIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>;
const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const MailIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.012 2c-5.506 0-9.969 4.463-9.969 9.969 0 1.758.459 3.474 1.33 4.988L2 22l5.249-1.378a9.922 9.922 0 004.763 1.218c5.506 0 9.97-4.463 9.97-9.969S17.518 2 12.012 2zm6.2 14.268c-.274.773-1.36 1.4-1.859 1.488-.456.082-.99.117-2.903-.683-2.443-1.017-4.014-3.5-4.136-3.663-.122-.163-1.04-1.385-1.04-2.642 0-1.258.65-1.877.88-2.128.23-.251.5-.314.67-.314.17 0 .34.007.49.017.158.01.37-.06.578.434.214.506.73 1.777.796 1.91.066.133.11.288.022.464-.088.176-.133.288-.265.442-.132.155-.277.346-.395.464-.132.132-.27.276-.118.536.152.26.674 1.11 1.442 1.794.99.88 1.823 1.152 2.083 1.282.26.13.41.11.562-.062.152-.172.656-.763.832-1.02.176-.258.354-.216.597-.126.242.09 1.536.724 1.8.855.264.13.44.195.506.31.066.113.066.657-.208 1.43z"/></svg>;

type CampaignTemplateType = 'custom' | 'new_photos' | 'discount_coupon' | 'abandoned_cart';

interface CustomerWithStats extends User {
    purchaseCount: number;
    totalSpent: number;
    purchasedEventIds?: string[];
    hasAbandonedCart?: boolean;
}

const AdminRemarketing: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
    const [events, setEvents] = useState<PhotoEvent[]>([]);
    
    // Filtros
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'purchased' | 'not_purchased' | 'abandoned'>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const itemsPerPage = 10;

    // Disparo de E-mails
    const [emailSubject, setEmailSubject] = useState<string>('');
    const [emailBody, setEmailBody] = useState<string>('');
    const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplateType>('custom');
    const [sendingEmail, setSendingEmail] = useState<boolean>(false);
    const [emailProgress, setEmailProgress] = useState<{ current: number; total: number; status: string }>({ current: 0, total: 0, status: '' });

    // Mensagem do WhatsApp
    const [whatsappTemplateText, setWhatsappTemplateText] = useState<string>(
        'Olá [Nome]! Passando para avisar que as fotos do evento [Evento] já estão publicadas no FotoClic. Confirma lá no link: https://www.fotoclic.com.br/portfolio'
    );

    // Carregar dados iniciais
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                
                // 1. Carregar Clientes Básicos
                const dbCustomers = await api.getCustomers();
                
                // 2. Carregar Eventos
                const dbEvents = await api.getAllPublicEvents();
                setEvents(dbEvents);

                // 3. Buscar todas as vendas para mapear quais clientes compraram de quais eventos
                const { data: salesData, error: salesError } = await supabase
                    .from('sales')
                    .select('buyer_id, photo:photos(event_id)');

                if (salesError) console.warn("Failed to fetch sales for remarketing map:", salesError);

                // 4. Buscar carrinhos abandonados
                const { data: cartsData, error: cartsError } = await supabase
                    .from('carts')
                    .select('user_id, items');

                if (cartsError) console.warn("Failed to fetch carts for remarketing map:", cartsError);

                const mappedCustomers: CustomerWithStats[] = dbCustomers.map(cust => {
                    // Mapear eventos comprados
                    const purchasedEventIds = salesData
                        ?.filter(s => s.buyer_id === cust.id && s.photo?.event_id)
                        ?.map(s => s.photo!.event_id!) || [];

                    // Mapear carrinho abandonado (carrinho com itens)
                    const userCart = cartsData?.find(c => c.user_id === cust.id);
                    const hasAbandonedCart = userCart && Array.isArray(userCart.items) && userCart.items.length > 0;

                    return {
                        ...cust,
                        purchasedEventIds: Array.from(new Set(purchasedEventIds)),
                        hasAbandonedCart: !!hasAbandonedCart
                    };
                });

                setCustomers(mappedCustomers);
            } catch (error) {
                console.error("Erro ao carregar dados do Remarketing:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Atualizar corpo de e-mail ao mudar o template
    const handleTemplateChange = (template: CampaignTemplateType) => {
        setSelectedTemplate(template);
        const selectedEvent = events.find(e => e.id === selectedEventId);
        const eventName = selectedEvent ? selectedEvent.name : '[Nome do Evento]';

        if (template === 'new_photos') {
            if (selectedStatus === 'abandoned') {
                setSelectedStatus('all');
            }
            setEmailSubject(`Novas fotos do evento ${eventName} já estão disponíveis!`);
            setEmailBody(
                `<p>Olá [Nome],</p>\n` +
                `<p>Temos ótimas notícias! O fotógrafo acabou de carregar novas fotos incríveis do evento <strong>${eventName}</strong> na nossa plataforma.</p>\n` +
                `<p>Venha procurar pelas suas fotos e garantir as suas melhores recordações:</p>\n` +
                `<p style="margin-top: 25px;"><a href="https://www.fotoclic.com.br" style="background-color:#E36125; color:white; padding:12px 24px; border-radius:30px; text-decoration:none; display:inline-block; font-weight:bold; box-shadow: 0 4px 6px rgba(227,97,37,0.2);">Ver Minhas Fotos</a></p>\n` +
                `<p style="margin-top: 30px; font-size:12px; color:#888;">Equipe FotoClic</p>`
            );
        } else if (template === 'discount_coupon') {
            if (selectedStatus === 'abandoned') {
                setSelectedStatus('all');
            }
            setEmailSubject(`Desconto Exclusivo para o evento ${eventName}`);
            setEmailBody(
                `<p>Olá [Nome],</p>\n` +
                `<p>Gostou das suas fotos do evento <strong>${eventName}</strong>? Preparamos um presente especial para você!</p>\n` +
                `<p>Use o cupom <strong>REMARKETING10</strong> ao finalizar sua compra e garanta <strong>10% de desconto adicional</strong> em qualquer foto!</p>\n` +
                `<p style="margin-top: 25px;"><a href="https://www.fotoclic.com.br" style="background-color:#E36125; color:white; padding:12px 24px; border-radius:30px; text-decoration:none; display:inline-block; font-weight:bold;">Aproveitar Desconto</a></p>\n` +
                `<p style="margin-top: 30px; font-size:12px; color:#888;">Equipe FotoClic</p>`
            );
        } else if (template === 'abandoned_cart') {
            setSelectedStatus('abandoned');
            setEmailSubject(`Você deixou momentos incríveis no seu carrinho!`);
            setEmailBody(
                `<p>Olá [Nome],</p>\n` +
                `<p>Percebemos que você escolheu fotos incríveis na nossa plataforma, mas não concluiu o pagamento.</p>\n` +
                `<p>Seus momentos inesquecíveis continuam guardados com segurança no seu carrinho de compras. Conclua seu pedido hoje mesmo e garanta o acesso em alta resolução!</p>\n` +
                `<p style="margin-top: 25px;"><a href="https://www.fotoclic.com.br/carrinho" style="background-color:#E36125; color:white; padding:12px 24px; border-radius:30px; text-decoration:none; display:inline-block; font-weight:bold;">Finalizar Compra Agora</a></p>\n` +
                `<p style="margin-top: 30px; font-size:12px; color:#888;">Equipe FotoClic</p>`
            );
        } else {
            setEmailSubject('');
            setEmailBody('');
        }
    };

    // Atualizar mensagens com o evento selecionado
    useEffect(() => {
        if (selectedTemplate !== 'custom') {
            handleTemplateChange(selectedTemplate);
        }
        
        const selectedEvent = events.find(e => e.id === selectedEventId);
        const eventName = selectedEvent ? selectedEvent.name : '[Nome do Evento]';
        setWhatsappTemplateText(
            `Olá [Nome]! Passando para avisar que as fotos do evento ${eventName} já estão publicadas no FotoClic. Confirma lá no link: https://www.fotoclic.com.br/portfolio`
        );
    }, [selectedEventId]);

    // Filtragem dos Clientes
    const filteredCustomers = useMemo(() => {
        return customers.filter(cust => {
            // Filtro por termo de busca
            const matchesSearch = 
                cust.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                cust.email.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (!matchesSearch) return false;

            // Filtro por Status e Evento
            if (selectedStatus === 'purchased') {
                if (!selectedEventId) return true; // Se nenhum evento escolhido, mostra todos
                return cust.purchasedEventIds?.includes(selectedEventId);
            }

            if (selectedStatus === 'not_purchased') {
                if (!selectedEventId) return true;
                return !cust.purchasedEventIds?.includes(selectedEventId);
            }

            if (selectedStatus === 'abandoned') {
                return cust.hasAbandonedCart;
            }

            return true;
        });
    }, [customers, searchTerm, selectedStatus, selectedEventId]);

    // Estatísticas da Lista Filtrada
    const stats = useMemo(() => {
        const count = filteredCustomers.length;
        const totalSpent = filteredCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
        const avgSpent = count > 0 ? totalSpent / count : 0;
        const abandonedCartsCount = filteredCustomers.filter(c => c.hasAbandonedCart).length;
        return { count, totalSpent, avgSpent, abandonedCartsCount };
    }, [filteredCustomers]);

    // Paginação
    const paginatedCustomers = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredCustomers, currentPage]);

    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

    // Exportação em formato CSV
    const handleExportCSV = () => {
        if (filteredCustomers.length === 0) {
            alert("Nenhum cliente na lista atual para exportar.");
            return;
        }

        const headers = ['Nome', 'Email', 'Telefone', 'Compras Realizadas', 'Total Gasto (R$)'].join(';');
        const rows = filteredCustomers.map(c => [
            c.name,
            c.email,
            c.phone || 'Nao informado',
            c.purchaseCount,
            c.totalSpent.toFixed(2).replace('.', ',')
        ].map(val => `"${val}"`).join(';'));

        const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `remarketing_clientes_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Envio de E-mails em Lote
    const handleSendBulkEmails = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Garantia de segurança extra: se o template for abandoned_cart, só envia para clientes com carrinho abandonado
        const targets = selectedTemplate === 'abandoned_cart'
            ? filteredCustomers.filter(c => c.hasAbandonedCart)
            : filteredCustomers;

        if (targets.length === 0) {
            alert("Nenhum cliente selecionado nos filtros atuais.");
            return;
        }
        if (!emailSubject || !emailBody) {
            alert("Preencha o assunto e o corpo do e-mail.");
            return;
        }

        const confirmSend = window.confirm(
            `Você está prestes a disparar e-mails em lote para ${targets.length} clientes. Deseja continuar?`
        );
        if (!confirmSend) return;

        setSendingEmail(true);
        setEmailProgress({ current: 0, total: targets.length, status: 'Iniciando disparos...' });

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < targets.length; i++) {
            const client = targets[i];
            
            // Substituir placeholders como [Nome]
            const personalizedBody = emailBody.replace(/\[Nome\]/g, client.name);

            setEmailProgress({
                current: i + 1,
                total: filteredCustomers.length,
                status: `Enviando para ${client.name} (${client.email})...`
            });

            try {
                await api.sendEmail(client.email, emailSubject, personalizedBody);
                successCount++;
            } catch (err) {
                console.error(`Falha ao disparar e-mail para ${client.email}:`, err);
                failCount++;
            }

            // Pequeno delay para evitar sobrecarregar o SMTP da Locaweb
            await new Promise(resolve => setTimeout(resolve, 150));
        }

        setSendingEmail(false);
        alert(`Campanha concluída!\nSucessos: ${successCount}\nFalhas: ${failCount}`);
        setEmailProgress({ current: 0, total: 0, status: '' });
    };

    // Montar link personalizado do WhatsApp
    const getWhatsAppUrl = (customer: CustomerWithStats) => {
        if (!customer.phone) return '';
        
        // Limpar número de telefone
        const cleanPhone = customer.phone.replace(/\D/g, '');
        
        // Substituir placeholders
        const message = whatsappTemplateText.replace(/\[Nome\]/g, customer.name);
        
        return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    };

    if (loading) return <Spinner size="lg" fullHeight={true} label="Carregando dados de remarketing..." />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-primary-dark flex items-center gap-2">
                        <MegaphoneIcon className="text-primary w-8 h-8" />
                        Campanhas de Remarketing
                    </h1>
                    <p className="text-neutral-500 text-sm mt-1">
                        Segmente e envie mensagens ou cupons aos clientes cadastrados para alavancar suas vendas.
                    </p>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-neutral-300 text-neutral-700 font-semibold text-sm rounded-full hover:bg-neutral-50 hover:border-neutral-400 transition-all shadow-sm"
                >
                    <DownloadIcon className="w-4 h-4 text-neutral-500" />
                    Exportar Lista (CSV)
                </button>
            </div>

            {/* Metas/Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Clientes Filtrados</p>
                    <p className="text-3xl font-bold text-neutral-900">{stats.count}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Ticket Médio (Filtro)</p>
                    <p className="text-3xl font-bold text-neutral-900">
                        {stats.avgSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Faturamento Filtrado</p>
                    <p className="text-3xl font-bold text-green-600">
                        {stats.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Carrinhos Abandonados</p>
                    <p className="text-3xl font-bold text-orange-500">{stats.abandonedCartsCount}</p>
                </div>
            </div>

            {/* Filtros da Campanha */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                <h2 className="text-lg font-bold text-neutral-900 mb-4">1. Configurar Segmentação da Base</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Evento */}
                    <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-2">Filtrar por Evento</label>
                        <select
                            value={selectedEventId}
                            onChange={(e) => {
                                setSelectedEventId(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-sm"
                        >
                            <option value="">Selecione um evento...</option>
                            {events.map(ev => (
                                <option key={ev.id} value={ev.id}>{ev.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status de Compra */}
                    <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-2">Comportamento de Compra</label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => {
                                const newStatus = e.target.value as any;
                                setSelectedStatus(newStatus);
                                setCurrentPage(1);
                                // Se o usuário mudar o filtro manualmente e não for mais carrinho abandonado, reseta o template selecionado
                                if (newStatus !== 'abandoned' && selectedTemplate === 'abandoned_cart') {
                                    setSelectedTemplate('custom');
                                }
                            }}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-sm"
                        >
                            <option value="all">Todos os compradores</option>
                            <option value="purchased" disabled={!selectedEventId}>Compraram no evento selecionado</option>
                            <option value="not_purchased" disabled={!selectedEventId}>Não compraram no evento selecionado</option>
                            <option value="abandoned">Clientes com carrinho abandonado</option>
                        </select>
                    </div>

                    {/* Pesquisa por Texto */}
                    <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-2">Buscar Cliente</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Pesquise por nome ou e-mail..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                            />
                            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Ações de Remarketing */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Disparo por E-mail */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                            <MailIcon className="text-primary" />
                            2. Criar Campanha de E-mail (Disparo em Lote)
                        </h2>
                        
                        <form onSubmit={handleSendBulkEmails} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-2">Escolher Modelo Pronto</label>
                                <select
                                    value={selectedTemplate}
                                    onChange={(e) => handleTemplateChange(e.target.value as CampaignTemplateType)}
                                    className="w-full px-4 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-sm"
                                >
                                    <option value="custom">Mensagem Personalizada (Em branco)</option>
                                    <option value="new_photos">Notificar Novas Fotos Carregadas</option>
                                    <option value="discount_coupon">Enviar Cupom de Desconto Especial</option>
                                    <option value="abandoned_cart">Recuperar Carrinho Abandonado</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-2">Assunto do E-mail</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Suas fotos inesquecíveis estão prontas!"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                    Conteúdo do E-mail (Suporta HTML simples)
                                </label>
                                <textarea
                                    rows={8}
                                    placeholder="Utilize [Nome] para personalizar o nome do destinatário no corpo do e-mail."
                                    value={emailBody}
                                    onChange={(e) => setEmailBody(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-mono"
                                />
                            </div>

                            {sendingEmail && (
                                <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
                                    <div className="flex justify-between text-xs font-semibold text-neutral-600">
                                        <span>Status: {emailProgress.status}</span>
                                        <span>{emailProgress.current} / {emailProgress.total}</span>
                                    </div>
                                    <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-primary h-full transition-all duration-300"
                                            style={{ width: `${(emailProgress.current / emailProgress.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={sendingEmail || (selectedTemplate === 'abandoned_cart' ? filteredCustomers.filter(c => c.hasAbandonedCart).length === 0 : filteredCustomers.length === 0)}
                                className="w-full py-3 bg-primary text-white font-bold rounded-full hover:bg-opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/10"
                            >
                                <MailIcon className="w-5 h-5" />
                                Disparar E-mails em Lote ({selectedTemplate === 'abandoned_cart' ? filteredCustomers.filter(c => c.hasAbandonedCart).length : filteredCustomers.length})
                            </button>
                        </form>
                    </div>
                </div>

                {/* WhatsApp Config e dicas */}
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                            <WhatsAppIcon className="text-emerald-600" />
                            3. Mensagem do WhatsApp (Template)
                        </h2>
                        <p className="text-neutral-500 text-xs leading-relaxed">
                            Configure o modelo de mensagem abaixo. Na tabela de clientes à direita, clique no botão de WhatsApp para abrir o chat com essa mensagem preenchida de forma personalizada.
                        </p>
                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 mb-2">Mensagem do WhatsApp</label>
                            <textarea
                                rows={6}
                                value={whatsappTemplateText}
                                onChange={(e) => setWhatsappTemplateText(e.target.value)}
                                className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                            />
                            <span className="text-[10px] text-neutral-400 block mt-1">
                                Placeholders suportados: [Nome] (Nome do cliente), [Evento] (Evento selecionado).
                            </span>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <h4 className="font-bold text-emerald-800 text-sm mb-1">Dica de Conversão:</h4>
                        <p className="text-emerald-700 text-xs leading-relaxed">
                            O contato no WhatsApp é pessoal e direto. Oferecer cupons personalizados como <strong>FOTO15</strong> para recuperar carrinhos abandonados costuma converter mais de 45% dos casos.
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabela de Clientes Segmentados */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-neutral-950">Lista de Clientes Segmentados</h3>
                    <span className="text-xs font-semibold bg-neutral-200 text-neutral-700 px-3 py-1 rounded-full">
                        {filteredCustomers.length} contatos
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead className="bg-neutral-100/80">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">E-mail</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Telefone</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider">Compras</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-neutral-500 uppercase tracking-wider">Total Gasto</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider">Ações de Contato</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                            {paginatedCustomers.map((user, idx) => {
                                const waUrl = getWhatsAppUrl(user);
                                return (
                                    <tr key={user.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-neutral-800">
                                            <div className="flex flex-col">
                                                <span>{user.name}</span>
                                                {user.hasAbandonedCart && (
                                                    <span className="text-[10px] text-orange-500 font-bold bg-orange-50 self-start px-2 py-0.5 rounded-full mt-1 border border-orange-200">
                                                        Carrinho Abandonado
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{user.phone || 'Não informado'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800 font-medium text-center">{user.purchaseCount}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold text-right">
                                            {user.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex justify-center gap-2">
                                                {user.phone ? (
                                                    <a
                                                        href={waUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200 transition-colors"
                                                        title="Chamar no WhatsApp"
                                                    >
                                                        <WhatsAppIcon className="w-3.5 h-3.5" />
                                                        WhatsApp
                                                    </a>
                                                ) : (
                                                    <button
                                                        disabled
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 text-neutral-400 font-medium text-xs rounded-full border border-neutral-200 cursor-not-allowed"
                                                        title="Sem telefone cadastrado"
                                                    >
                                                        Sem Telefone
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredCustomers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center p-8 text-neutral-500">
                                        Nenhum cliente atende aos filtros definidos.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-neutral-50/50 border-t border-neutral-200 flex justify-between items-center">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Anterior
                        </button>
                        <span className="text-xs font-semibold text-neutral-500">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Próxima
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminRemarketing;
