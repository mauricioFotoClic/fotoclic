import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const TermsPage: React.FC = () => {
    const { t, formatDate } = useLanguage();

    return (
        <div className="bg-neutral-50 min-h-screen pb-12">
            {/* Header Section */}
            <section className="bg-[#0A1A2F] text-white relative overflow-hidden py-20 pb-28">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
                
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <div className="inline-flex items-center justify-center p-3 mb-6 bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
                        <span className="text-2xl mr-2">📄</span>
                        <span className="text-sm font-bold uppercase tracking-widest text-neutral-200">{t('terms_page.tag')}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
                        {t('terms_page.title')}
                    </h1>
                    <p className="text-lg text-neutral-300">
                        {t('terms_page.last_updated')} {formatDate(new Date())}
                    </p>
                </div>
            </section>

            {/* Content Section */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20">
                <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-4xl mx-auto prose prose-lg prose-neutral prose-headings:font-display prose-headings:font-bold prose-headings:text-primary-dark prose-a:text-primary hover:prose-a:text-primary-dark">
                    
                    <h2>{t('terms_page.s1_title')}</h2>
                    <p>
                        {t('terms_page.s1_p1')}
                    </p>
                    <p>
                        {t('terms_page.s1_p2')}
                    </p>

                    <h2>{t('terms_page.s2_title')}</h2>
                    <p>
                        {t('terms_page.s2_p1')}
                    </p>
                    <p>
                        {t('terms_page.s2_p2')}
                    </p>

                    <h2>{t('terms_page.s3_title')}</h2>
                    <p>
                        {t('terms_page.s3_p1')}
                    </p>
                    <ul>
                        <li><strong>{t('terms_page.s3_li1')}</strong></li>
                        <li><strong>{t('terms_page.s3_li2')}</strong></li>
                        <li><strong>{t('terms_page.s3_li3')}</strong></li>
                    </ul>
                    <p>
                        {t('terms_page.s3_p2')}
                    </p>

                    <h2>{t('terms_page.s4_title')}</h2>
                    <p>
                        {t('terms_page.s4_p1')}
                    </p>
                    <ul>
                        <li>{t('terms_page.s4_li1')}</li>
                        <li>{t('terms_page.s4_li2')}</li>
                        <li>{t('terms_page.s4_li3')}</li>
                        <li>{t('terms_page.s4_li4')}</li>
                    </ul>
                    <p>
                        {t('terms_page.s4_p2')}
                    </p>

                    <h2>{t('terms_page.s5_title')}</h2>
                    <p>
                        {t('terms_page.s5_p1')}
                    </p>
                    <p>
                        {t('terms_page.s5_p2')}
                    </p>
                </div>
            </section>
        </div>
    );
};

export default TermsPage;
