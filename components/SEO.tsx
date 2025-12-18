import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
}

const SEO: React.FC<SEOProps> = ({
    title = 'FotoClic - Marketplace de Fotos Esportivas',
    description = 'Descubra e compre as melhores fotos esportivas de alta qualidade. Plataforma para fotógrafos e atletas.',
    image = 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1920&auto=format&fit=crop',
    url = typeof window !== 'undefined' ? window.location.href : '',
    type = 'website'
}) => {
    const siteTitle = title === 'FotoClic - Marketplace de Fotos Esportivas' ? title : `${title} | FotoClic`;

    return (
        <Helmet>
            {/* Standard Metadata */}
            <title>{siteTitle}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={url} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={url} />
            <meta property="og:title" content={siteTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:url" content={url} />
            <meta name="twitter:title" content={siteTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />
        </Helmet>
    );
};

export default SEO;
