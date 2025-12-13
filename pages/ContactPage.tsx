
import React from 'react';
import { Page } from '../types';

interface ContactPageProps {
    onNavigate: (page: Page) => void;
}

const EnvelopeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
const UserGroupIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>;
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
                    
                    {/* Card Clientes */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-neutral-100 hover:shadow-2xl transition-shadow duration-300 group">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-300">
                            <UserGroupIcon />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-neutral-900 mb-3">Suporte ao Cliente</h2>
                        <p className="text-neutral-600 mb-6 leading-relaxed">
                            Dúvidas sobre compras, download de arquivos, licenças de uso ou problemas com sua conta? Nossa equipe está à disposição.
                        </p>
                        <div className="space-y-4">
                            <a href="mailto:suporte@fotoclic.com" className="flex items-center p-4 rounded-xl bg-neutral-50 hover:bg-primary/5 border border-neutral-200 hover:border-primary/30 transition-all group/link">
                                <div className="p-2 bg-white rounded-full shadow-sm text-primary mr-4 group-hover/link:bg-primary group-hover/link:text-white transition-colors">
                                    <EnvelopeIcon />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Envie um e-mail</p>
                                    <p className="font-semibold text-neutral-800">suporte@fotoclic.com</p>
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* Card Fotógrafos */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-neutral-100 hover:shadow-2xl transition-shadow duration-300 group">
                        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center text-secondary mb-6 group-hover:scale-110 transition-transform duration-300">
                            <CameraIcon />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-neutral-900 mb-3">Suporte ao Fotógrafo</h2>
                        <p className="text-neutral-600 mb-6 leading-relaxed">
                            Precisa de ajuda com seu portfólio, pagamentos, processo de moderação ou dicas para vender mais? Fale com nosso time especializado.
                        </p>
                        <div className="space-y-4">
                            <a href="mailto:fotografos@fotoclic.com" className="flex items-center p-4 rounded-xl bg-neutral-50 hover:bg-secondary/5 border border-neutral-200 hover:border-secondary/30 transition-all group/link">
                                <div className="p-2 bg-white rounded-full shadow-sm text-secondary mr-4 group-hover/link:bg-secondary group-hover/link:text-white transition-colors">
                                    <EnvelopeIcon />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Envie um e-mail</p>
                                    <p className="font-semibold text-neutral-800">fotografos@fotoclic.com</p>
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
                            <h3 className="font-bold text-neutral-900 mb-1">Escritório</h3>
                            <p className="text-sm text-neutral-600">Av. Paulista, 1000 - Bela Vista</p>
                            <p className="text-sm text-neutral-600">São Paulo - SP, Brasil</p>
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
