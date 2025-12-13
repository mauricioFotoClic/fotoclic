
import React, { useState } from 'react';
import { Page } from '../types';

interface HelpCenterPageProps {
    onNavigate: (page: Page) => void;
}

const HelpCenterPage: React.FC<HelpCenterPageProps> = ({ onNavigate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const categories = [
        { id: 'general', title: 'Geral', icon: '🌍', desc: 'Visão geral da plataforma' },
        { id: 'buying', title: 'Comprando', icon: '🛒', desc: 'Pagamentos e downloads' },
        { id: 'selling', title: 'Vendendo', icon: '📸', desc: 'Para fotógrafos e criadores' },
        { id: 'account', title: 'Minha Conta', icon: '👤', desc: 'Configurações e perfil' },
        { id: 'licenses', title: 'Licenças', icon: '📄', desc: 'Direitos de uso e comercial' },
        { id: 'technical', title: 'Suporte Técnico', icon: '⚙️', desc: 'Bugs e problemas' },
    ];

    const faqs = [
        {
            category: 'buying',
            question: "Como recebo as fotos após a compra?",
            answer: "Após a confirmação do pagamento, você será redirecionado automaticamente para a página de download. Além disso, todas as suas compras ficam salvas em 'Minhas Compras' no menu do usuário, onde você pode baixá-las a qualquer momento em alta resolução."
        },
        {
            category: 'selling',
            question: "Quanto custa para vender minhas fotos?",
            answer: "É totalmente gratuito criar uma conta de fotógrafo. Cobramos apenas uma comissão sobre cada venda realizada para cobrir taxas de transação e manutenção da plataforma. Você fica com a maior parte do lucro!"
        },
        {
            category: 'licenses',
            question: "Posso usar as fotos para fins comerciais?",
            answer: "Sim! Todas as fotos vendidas no FotoClic possuem licença Royalty-Free, o que significa que você paga uma única vez e pode utilizá-las em projetos pessoais, comerciais, redes sociais e marketing, sem limite de tempo."
        },
        {
            category: 'general',
            question: "O FotoClic emite nota fiscal?",
            answer: "Sim. Para todas as transações, é gerado um recibo digital. Se você precisar de uma nota fiscal formal para empresa, entre em contato com nosso suporte após a compra com os dados da sua empresa."
        },
        {
            category: 'selling',
            question: "Como funciona a moderação de fotos?",
            answer: "Todas as fotos enviadas passam por uma análise técnica e de qualidade. Nossa equipe (e nossa IA) verifica resolução, foco, iluminação e se a imagem respeita nossos termos de uso. O prazo médio é de 24 a 48 horas."
        },
        {
            category: 'technical',
            question: "Esqueci minha senha, o que faço?",
            answer: "Na página de login, clique em 'Esqueci minha senha'. Enviaremos um link para o seu e-mail cadastrado para que você possa redefinir sua senha com segurança."
        },
        {
            category: 'account',
            question: "Como altero minha foto de perfil?",
            answer: "Acesse seu painel de usuário ou fotógrafo, vá em 'Meu Perfil' ou 'Configurações' e clique na sua foto atual para fazer o upload de uma nova imagem."
        }
    ];

    const toggleFaq = (index: number) => {
        setOpenFaqIndex(openFaqIndex === index ? null : index);
    };

    const handleCategoryClick = (id: string) => {
        if (activeCategory === id) {
            setActiveCategory(null);
        } else {
            setActiveCategory(id);
            setSearchTerm(''); // Clear search when selecting category
            // Scroll to FAQ section
            setTimeout(() => {
                document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    };

    const filteredFaqs = faqs.filter(faq => {
        // Search overrides category filter
        if (searchTerm) {
            return faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
        }
        // Category filter
        if (activeCategory) {
            return faq.category === activeCategory;
        }
        return true;
    });

    const activeCategoryTitle = activeCategory ? categories.find(c => c.id === activeCategory)?.title : null;

    return (
        <div className="bg-neutral-50 min-h-screen pb-20">
            {/* Hero Section */}
            <section className="bg-primary-dark text-white py-20 relative overflow-hidden">
                {/* Abstract Background */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/3 translate-y-1/3"></div>

                <div className="container mx-auto px-4 text-center relative z-10">
                    <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">Central de Ajuda</h1>
                    <p className="text-lg text-neutral-300 mb-8 max-w-2xl mx-auto">
                        Como podemos te ajudar hoje? Encontre respostas rápidas para suas dúvidas.
                    </p>
                    
                    <div className="max-w-2xl mx-auto relative">
                        <input 
                            type="text" 
                            placeholder="Busque por dúvida, palavra-chave ou tópico..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full py-4 pl-12 pr-4 rounded-full text-neutral-800 focus:outline-none focus:ring-4 focus:ring-primary/30 shadow-lg transition-shadow"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>
                </div>
            </section>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
                {/* Categories Grid */}
                {!searchTerm && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-16">
                        {categories.map((cat) => (
                            <button 
                                key={cat.id} 
                                onClick={() => handleCategoryClick(cat.id)}
                                className={`p-6 rounded-xl shadow-md transition-all cursor-pointer border group text-center hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                    activeCategory === cat.id 
                                    ? 'bg-white border-primary ring-2 ring-primary ring-opacity-50 shadow-lg scale-105 z-10' 
                                    : 'bg-white border-neutral-100 hover:shadow-lg'
                                }`}
                            >
                                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform inline-block">{cat.icon}</div>
                                <h3 className={`font-bold mb-1 ${activeCategory === cat.id ? 'text-primary' : 'text-neutral-900'}`}>{cat.title}</h3>
                                <p className="text-xs text-neutral-500">{cat.desc}</p>
                            </button>
                        ))}
                    </div>
                )}

                {/* FAQ Section */}
                <div id="faq-section" className="max-w-3xl mx-auto scroll-mt-24">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-display font-bold text-neutral-900">
                            {searchTerm 
                                ? 'Resultados da Busca' 
                                : activeCategory 
                                    ? `Perguntas sobre ${activeCategoryTitle}` 
                                    : 'Perguntas Frequentes'}
                        </h2>
                        {activeCategory && !searchTerm && (
                            <button 
                                onClick={() => setActiveCategory(null)}
                                className="text-sm text-primary hover:underline font-medium"
                            >
                                Ver todas
                            </button>
                        )}
                    </div>

                    {filteredFaqs.length > 0 ? (
                        <div className="space-y-4">
                            {filteredFaqs.map((faq, index) => (
                                <div key={index} className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <button 
                                        onClick={() => toggleFaq(index)}
                                        className="w-full flex items-center justify-between p-5 text-left focus:outline-none bg-white"
                                    >
                                        <span className="font-semibold text-neutral-800 text-lg pr-4">{faq.question}</span>
                                        <span className={`transform transition-transform duration-300 text-primary flex-shrink-0 ${openFaqIndex === index ? 'rotate-180' : ''}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </span>
                                    </button>
                                    <div 
                                        className={`transition-all duration-300 ease-in-out overflow-hidden ${openFaqIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                                    >
                                        <div className="p-5 pt-0 text-neutral-600 border-t border-neutral-100 bg-neutral-50/50 leading-relaxed">
                                            {faq.answer}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-neutral-300">
                            <p className="text-neutral-500 text-lg">Nenhum resultado encontrado para "{searchTerm}".</p>
                            <button 
                                onClick={() => setSearchTerm('')} 
                                className="mt-4 text-primary hover:underline font-medium"
                            >
                                Limpar busca
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer CTA */}
                <div className="mt-20 text-center bg-white p-10 rounded-2xl shadow-lg border border-neutral-100 max-w-4xl mx-auto">
                    <h3 className="text-2xl font-bold text-neutral-900 mb-2">Ainda precisa de ajuda?</h3>
                    <p className="text-neutral-600 mb-6">Nossa equipe de suporte está pronta para responder suas questões específicas.</p>
                    <button 
                        onClick={() => onNavigate({ name: 'contact' })}
                        className="px-8 py-3 bg-primary text-white rounded-full font-bold hover:bg-opacity-90 transition-colors shadow-md"
                    >
                        Entrar em Contato
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HelpCenterPage;
