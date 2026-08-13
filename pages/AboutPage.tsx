import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const AboutPage: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className="bg-white">
            {/* Hero Section */}
            <section className="py-20 bg-neutral-900 text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-secondary rounded-full blur-[120px]"></div>
                </div>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <div className="inline-flex items-center justify-center p-3 mb-6 bg-white/10 rounded-full backdrop-blur-sm border border-white/20 animate-fade-in-up">
                        <span className="text-2xl mr-2">🌍</span>
                        <span className="text-sm font-bold uppercase tracking-widest text-neutral-200">{t('about_page.tag')}</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 leading-tight animate-fade-in-up">
                        {t('about_page.title')}
                    </h1>
                    <p className="text-lg md:text-xl text-neutral-300 max-w-3xl mx-auto font-light leading-relaxed animate-fade-in-up delay-100">
                        {t('about_page.hero_desc')}
                    </p>
                </div>
            </section>

            {/* Main Content */}
            <section className="py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">

                    {/* Introduction */}
                    <div className="mb-20 text-center">
                        <p className="text-neutral-600 text-lg leading-relaxed mb-8">
                            {t('about_page.intro')}
                        </p>
                        <blockquote className="text-2xl font-display font-bold text-primary-dark border-l-4 border-primary pl-6 py-2 italic bg-neutral-50 rounded-r-lg mx-auto max-w-3xl">
                            {t('about_page.quote')}
                        </blockquote>
                    </div>

                    {/* Mission & Vision Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
                        <div className="bg-neutral-50 p-8 rounded-2xl border border-neutral-100 hover:shadow-lg transition-shadow duration-300 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6 text-3xl shadow-sm">🌟</div>
                            <h2 className="text-2xl font-display font-bold text-neutral-900 mb-4">{t('about_page.mission_title')}</h2>
                            <p className="text-neutral-600 leading-relaxed">
                                {t('about_page.mission_desc')}
                            </p>
                        </div>
                        <div className="bg-neutral-50 p-8 rounded-2xl border border-neutral-100 hover:shadow-lg transition-shadow duration-300 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6 text-3xl shadow-sm">🚀</div>
                            <h2 className="text-2xl font-display font-bold text-neutral-900 mb-4">{t('about_page.vision_title')}</h2>
                            <p className="text-neutral-600 leading-relaxed">
                                {t('about_page.vision_desc')}
                            </p>
                        </div>
                    </div>

                    {/* Values */}
                    <div className="mb-20">
                        <div className="text-center mb-12">
                            <div className="inline-block p-3 rounded-full bg-primary/10 text-primary-dark mb-4 shadow-sm border border-primary/20">
                                <span className="text-3xl">💎</span>
                            </div>
                            <h2 className="text-3xl font-display font-bold text-neutral-900">{t('about_page.values_title')}</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { title: t('about_page.val_quality_title'), text: t('about_page.val_quality_desc') },
                                { title: t('about_page.val_community_title'), text: t('about_page.val_community_desc') },
                                { title: t('about_page.val_transparency_title'), text: t('about_page.val_transparency_desc') },
                                { title: t('about_page.val_innovation_title'), text: t('about_page.val_innovation_desc') }
                            ].map((val, idx) => (
                                <div key={idx} className="bg-white p-6 rounded-xl border border-neutral-200 hover:border-secondary/50 hover:shadow-md transition-all">
                                    <h3 className="font-bold text-lg text-primary-dark mb-3">{val.title}</h3>
                                    <p className="text-sm text-neutral-600 leading-relaxed">{val.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* What Moves Us */}
                    <div className="bg-[#111111] text-white rounded-3xl p-8 md:p-12 relative overflow-hidden mb-20 shadow-2xl">
                        {/* Background Decoration */}
                        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
                        <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-secondary/20 rounded-full blur-3xl"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                            <div className="md:w-1/3 flex justify-center">
                                <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner">
                                    <span className="text-6xl">📸</span>
                                </div>
                            </div>
                            <div className="md:w-2/3 text-center md:text-left">
                                <h2 className="text-3xl font-display font-bold mb-6">{t('about_page.moves_us_title')}</h2>
                                <ul className="space-y-4 text-neutral-300 text-lg">
                                    <li className="flex items-center justify-center md:justify-start">
                                        <span className="w-2 h-2 bg-primary rounded-full mr-4 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
                                        {t('about_page.moves_us_1')}
                                    </li>
                                    <li className="flex items-center justify-center md:justify-start">
                                        <span className="w-2 h-2 bg-primary rounded-full mr-4 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
                                        {t('about_page.moves_us_2')}
                                    </li>
                                    <li className="flex items-center justify-center md:justify-start">
                                        <span className="w-2 h-2 bg-primary rounded-full mr-4 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
                                        {t('about_page.moves_us_3')}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Final CTA */}
                    <div className="text-center bg-gradient-to-r from-primary/5 to-secondary/5 p-10 rounded-2xl border border-neutral-100">
                        <p className="text-lg text-neutral-800 font-medium mb-2">
                            {t('about_page.cta_photographer_pre')}<span className="text-primary font-bold">{t('about_page.cta_photographer')}</span>{t('about_page.cta_photographer_pos')}
                        </p>
                        <p className="text-lg text-neutral-800 font-medium mb-8">
                            {t('about_page.cta_buyer_pre')}<span className="text-secondary font-bold">{t('about_page.cta_buyer')}</span>{t('about_page.cta_buyer_pos')}
                        </p>
                        <h3 className="text-2xl md:text-3xl font-display font-bold text-neutral-900 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                            {t('about_page.cta_slogan')}
                        </h3>
                    </div>

                </div>
            </section>
        </div>
    );
};

export default AboutPage;
