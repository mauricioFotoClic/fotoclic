import React, { useState } from 'react';
import { Page } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface HelpCenterPageProps {
    onNavigate: (page: Page) => void;
}

const HelpCenterPage: React.FC<HelpCenterPageProps> = ({ onNavigate }) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const categories = [
        { id: 'general', title: t('help_center_page.cat_general'), icon: '🌍', desc: t('help_center_page.cat_general_desc') },
        { id: 'buying', title: t('help_center_page.cat_buying'), icon: '🛒', desc: t('help_center_page.cat_buying_desc') },
        { id: 'selling', title: t('help_center_page.cat_selling'), icon: '📸', desc: t('help_center_page.cat_selling_desc') },
        { id: 'account', title: t('help_center_page.cat_account'), icon: '👤', desc: t('help_center_page.cat_account_desc') },
        { id: 'licenses', title: t('help_center_page.cat_licenses'), icon: '📄', desc: t('help_center_page.cat_licenses_desc') },
        { id: 'technical', title: t('help_center_page.cat_technical'), icon: '⚙️', desc: t('help_center_page.cat_technical_desc') },
    ];

    const faqs = [
        {
            category: 'buying',
            question: t('help_center_page.q1'),
            answer: t('help_center_page.a1')
        },
        {
            category: 'selling',
            question: t('help_center_page.q2'),
            answer: t('help_center_page.a2')
        },
        {
            category: 'licenses',
            question: t('help_center_page.q3'),
            answer: t('help_center_page.a3')
        },
        {
            category: 'general',
            question: t('help_center_page.q4'),
            answer: t('help_center_page.a4')
        },
        {
            category: 'selling',
            question: t('help_center_page.q5'),
            answer: t('help_center_page.a5')
        },
        {
            category: 'technical',
            question: t('help_center_page.q6'),
            answer: t('help_center_page.a6')
        },
        {
            category: 'account',
            question: t('help_center_page.q7'),
            answer: t('help_center_page.a7')
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
            setTimeout(() => {
                document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    };

    const filteredFaqs = faqs.filter(faq => {
        if (searchTerm) {
            return faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
        }
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
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/3 translate-y-1/3"></div>

                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 animate-fade-in-up">
                        {t('help_center_page.hero_title')}
                    </h1>
                    <p className="text-lg md:text-xl text-neutral-200 max-w-2xl mx-auto font-light mb-8 animate-fade-in-up delay-100">
                        {t('help_center_page.hero_subtitle')}
                    </p>

                    {/* Search Bar */}
                    <div className="max-w-2xl mx-auto relative animate-fade-in-up delay-200">
                        <input
                            type="text"
                            placeholder={t('help_center_page.search_placeholder')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-6 pr-12 py-4 rounded-2xl text-neutral-800 bg-white border-0 shadow-2xl focus:ring-4 focus:ring-primary/30 text-base md:text-lg"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </span>
                    </div>
                </div>
            </section>

            {/* Categories Section */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
                <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest text-center mb-6">{t('help_center_page.categories_title')}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {categories.map((cat) => {
                        const isActive = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => handleCategoryClick(cat.id)}
                                className={`p-5 rounded-2xl border text-center transition-all duration-300 flex flex-col items-center justify-center ${
                                    isActive
                                        ? 'bg-primary text-white border-primary shadow-lg scale-105'
                                        : 'bg-white text-neutral-800 border-neutral-200 hover:border-primary/50 hover:shadow-md hover:-translate-y-1'
                                }`}
                            >
                                <span className="text-3xl mb-2">{cat.icon}</span>
                                <span className="font-bold text-sm leading-snug mb-1">{cat.title}</span>
                                <span className={`text-[11px] leading-tight ${isActive ? 'text-white/80' : 'text-neutral-500'}`}>
                                    {cat.desc}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* FAQ Accordion Section */}
            <section id="faq-section" className="container mx-auto px-4 sm:px-6 lg:px-8 mt-16 max-w-4xl">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-200">
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-neutral-900">
                        {searchTerm ? `${t('help_center_page.faqs_title')} ("${searchTerm}")` : activeCategoryTitle ? `${t('help_center_page.faqs_title')}: ${activeCategoryTitle}` : t('help_center_page.faqs_all')}
                    </h2>
                    {(activeCategory || searchTerm) && (
                        <button
                            onClick={() => { setActiveCategory(null); setSearchTerm(''); }}
                            className="text-xs font-bold text-primary hover:underline uppercase tracking-wider"
                        >
                            Ver Todas
                        </button>
                    )}
                </div>

                {filteredFaqs.length > 0 ? (
                    <div className="space-y-4">
                        {filteredFaqs.map((faq, idx) => {
                            const isOpen = openFaqIndex === idx;
                            return (
                                <div
                                    key={idx}
                                    className="bg-white rounded-2xl border border-neutral-200 overflow-hidden transition-all duration-200 hover:border-neutral-300 shadow-sm"
                                >
                                    <button
                                        onClick={() => toggleFaq(idx)}
                                        className="w-full p-6 text-left flex items-center justify-between focus:outline-none"
                                    >
                                        <span className="font-semibold text-neutral-900 text-base md:text-lg pr-4">
                                            {faq.question}
                                        </span>
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 flex-shrink-0 ${
                                            isOpen ? 'bg-primary text-white rotate-180' : 'bg-neutral-100 text-neutral-500'
                                        }`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </span>
                                    </button>
                                    {isOpen && (
                                        <div className="px-6 pb-6 pt-2 text-neutral-600 text-sm md:text-base leading-relaxed border-t border-neutral-100 bg-neutral-50/50">
                                            {faq.answer}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200 p-8">
                        <span className="text-4xl block mb-3">🔍</span>
                        <p className="text-neutral-600 font-medium text-lg mb-2">{t('help_center_page.no_faqs')}</p>
                        <button
                            onClick={() => { setSearchTerm(''); setActiveCategory(null); }}
                            className="mt-4 px-6 py-2 bg-primary text-white font-bold rounded-full text-sm hover:bg-primary-dark transition-colors"
                        >
                            Ver Todas as Dúvidas
                        </button>
                    </div>
                )}

                {/* Contact Banner */}
                <div className="mt-16 bg-gradient-to-r from-primary to-primary-dark text-white rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                    <div>
                        <h3 className="text-2xl font-display font-bold mb-2">{t('help_center_page.still_have_questions')}</h3>
                        <p className="text-white/80 text-sm md:text-base">{t('help_center_page.still_have_questions_desc')}</p>
                    </div>
                    <button
                        onClick={() => onNavigate({ name: 'contact' })}
                        className="bg-white text-primary-dark font-bold px-8 py-3.5 rounded-full hover:bg-neutral-100 transition-colors shadow-lg whitespace-nowrap text-sm"
                    >
                        {t('help_center_page.contact_us')}
                    </button>
                </div>
            </section>
        </div>
    );
};

export default HelpCenterPage;
