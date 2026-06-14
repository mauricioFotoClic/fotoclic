
import React from 'react';
import { Page } from '../types';

interface ContactPageProps {
    onNavigate: (page: Page) => void;
}

const EnvelopeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
const UserGroupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M12.012 2c-5.506 0-9.969 4.463-9.969 9.969 0 1.758.459 3.474 1.33 4.988L2 22l5.249-1.378a9.922 9.922 0 004.763 1.218c5.506 0 9.97-4.463 9.97-9.969S17.518 2 12.012 2zm6.2 14.268c-.274.773-1.36 1.4-1.859 1.488-.456.082-.99.117-2.903-.683-2.443-1.017-4.014-3.5-4.136-3.663-.122-.163-1.04-1.385-1.04-2.642 0-1.258.65-1.877.88-2.128.23-.251.5-.314.67-.314.17 0 .34.007.49.017.158.01.37-.06.578.434.214.506.73 1.777.796 1.91.066.133.11.288.022.464-.088.176-.133.288-.265.442-.132.155-.277.346-.395.464-.132.132-.27.276-.118.536.152.26.674 1.11 1.442 1.794.99.88 1.823 1.152 2.083 1.282.26.13.41.11.562-.062.152-.172.656-.763.832-1.02.176-.258.354-.216.597-.126.242.09 1.536.724 1.8.855.264.13.44.195.506.31.066.113.066.657-.208 1.43z"/></svg>
);
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;

const ContactPage: React.FC<ContactPageProps> = ({ onNavigate }) => {
    return (
        <div className="bg-neutral-50 min-h-screen pb-20">
            {/* Header / Hero Section */}
            <section className="bg-[#0A1A2F] text-white relative overflow-hidden py-24 pb-32">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/3 translate-y-1/3"></div>
                
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 animate-fade-in-up">
                        Fale Conosco
                    </h1>
                    <p className="text-lg md:text-xl text-neutral-300 max-w-2xl mx-auto font-light animate-fade-in-up delay-100">
                        Estamos prontos para ajudar você a encontrar a imagem perfeita ou a compartilhar sua arte com o mundo.
                    </p>
                </div>
            </section>

            {/* Main Content - Contact Cards */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    
                    {/* Card E-mail */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-neutral-100 hover:shadow-2xl transition-shadow duration-300 group">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-300">
                            <UserGroupIcon />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-neutral-900 mb-3">Suporte por E-mail</h2>
                        <p className="text-neutral-600 mb-6 leading-relaxed">
                            Tem dúvidas sobre compras, downloads, seu portfólio de fotógrafo ou precisa de suporte técnico? Entre em contato conosco pelo e-mail.
                        </p>
                        <div className="space-y-4">
                            <a href="mailto:fvimagem@fvimagem.com" className="flex items-center p-4 rounded-xl bg-neutral-50 hover:bg-primary/5 border border-neutral-200 hover:border-primary/30 transition-all group/link">
                                <div className="p-2 bg-white rounded-full shadow-sm text-primary mr-4 group-hover/link:bg-primary group-hover/link:text-white transition-colors">
                                    <EnvelopeIcon />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Envie um e-mail</p>
                                    <p className="font-semibold text-neutral-800">fvimagem@fvimagem.com</p>
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* Card WhatsApp */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-neutral-100 hover:shadow-2xl transition-shadow duration-300 group">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform duration-300">
                            <WhatsAppIcon />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-neutral-900 mb-3">Atendimento via WhatsApp</h2>
                        <p className="text-neutral-600 mb-6 leading-relaxed">
                            Prefere um contato mais ágil? Fale diretamente com a nossa equipe de suporte para tirar suas dúvidas de forma rápida.
                        </p>
                        <div className="space-y-4">
                            <a href="https://wa.me/5521992580137" target="_blank" rel="noopener noreferrer" className="flex items-center p-4 rounded-xl bg-neutral-50 hover:bg-emerald-50/50 border border-neutral-200 hover:border-emerald-300 transition-all group/link">
                                <div className="p-2 bg-white rounded-full shadow-sm text-emerald-600 mr-4 group-hover/link:bg-emerald-600 group-hover/link:text-white transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Converse agora</p>
                                    <p className="font-semibold text-neutral-800">+55 21 99258-0137</p>
                                </div>
                            </a>
                        </div>
                    </div>

                </div>
            </section>

            {/* Additional Info Section */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 mt-16 max-w-5xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    
                    <div className="bg-white p-6 rounded-xl border border-neutral-200 flex items-start space-x-4">
                        <div className="text-primary mt-1"><ClockIcon /></div>
                        <div>
                            <h3 className="font-bold text-neutral-900 mb-1">Horário de Atendimento</h3>
                            <p className="text-sm text-neutral-600">Segunda a Sexta</p>
                            <p className="text-sm text-neutral-600 font-medium">09:00 às 18:00</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-neutral-200 flex items-start space-x-4">
                        <div className="text-primary mt-1"><MapPinIcon /></div>
                        <div>
                            <h3 className="font-bold text-neutral-900 mb-1">Endereço Escritório</h3>
                            <p className="text-sm text-neutral-600">Av. Lineu de Paula Machado</p>
                            <p className="text-sm text-neutral-600">Rio de Janeiro - RJ, Brasil</p>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-primary to-primary-dark p-6 rounded-xl text-white flex flex-col justify-center text-center">
                        <h3 className="font-bold mb-2">FAQ</h3>
                        <p className="text-sm text-white/80 mb-3">Dúvidas rápidas? Consulte nossa central de ajuda.</p>
                        <button 
                            onClick={() => onNavigate({ name: 'help-center' })}
                            className="text-xs font-bold bg-white/20 hover:bg-white/30 py-2 px-4 rounded-full transition-colors"
                        >
                            Acessar Central de Ajuda
                        </button>
                    </div>

                </div>
            </section>
        </div>
    );
};

export default ContactPage;


