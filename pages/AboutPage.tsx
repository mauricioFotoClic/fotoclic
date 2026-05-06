
import React from 'react';

const AboutPage: React.FC = () => {
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
                        <span className="text-sm font-bold uppercase tracking-widest text-neutral-200">Nossa História</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 leading-tight animate-fade-in-up">
                        Sobre Nós — FotoClic
                    </h1>
                    <p className="text-lg md:text-xl text-neutral-300 max-w-3xl mx-auto font-light leading-relaxed animate-fade-in-up delay-100">
                        O FotoClic nasceu com um propósito claro: conectar pessoas à força das imagens. Acreditamos que cada fotografia carrega uma história, uma emoção, um instante capaz de inspirar e transformar.
                    </p>
                </div>
            </section>

            {/* Main Content */}
            <section className="py-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">

                    {/* Introduction */}
                    <div className="mb-20 text-center">
                        <p className="text-neutral-600 text-lg leading-relaxed mb-8">
                            Por isso, criamos um marketplace de fotografias profissionais que une fotógrafos talentosos do mundo inteiro a pessoas, marcas e criadores que buscam imagens autênticas, exclusivas e de alta qualidade.
                        </p>
                        <blockquote className="text-2xl font-display font-bold text-primary-dark border-l-4 border-primary pl-6 py-2 italic bg-neutral-50 rounded-r-lg mx-auto max-w-3xl">
                            "Aqui, não vendemos apenas fotos. Vendemos sensações, experiências visuais e momentos capturados com alma."
                        </blockquote>
                    </div>

                    {/* Mission & Vision Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
                        <div className="bg-neutral-50 p-8 rounded-2xl border border-neutral-100 hover:shadow-lg transition-shadow duration-300 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-6 text-3xl shadow-sm">🌟</div>
                            <h2 className="text-2xl font-display font-bold text-neutral-900 mb-4">Nossa Missão</h2>
                            <p className="text-neutral-600 leading-relaxed">
                                Tornar a fotografia profissional acessível para todos. Democratizar o acesso a imagens de alta resolução, oferecendo uma plataforma onde fotógrafos podem expressar sua arte e onde compradores encontram exatamente o que precisam para contar suas histórias de forma impactante.
                            </p>
                        </div>
                        <div className="bg-neutral-50 p-8 rounded-2xl border border-neutral-100 hover:shadow-lg transition-shadow duration-300 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6 text-3xl shadow-sm">🚀</div>
                            <h2 className="text-2xl font-display font-bold text-neutral-900 mb-4">Nossa Visão</h2>
                            <p className="text-neutral-600 leading-relaxed">
                                Construir a maior e mais confiável comunidade online de fotografia, onde cada projeto — seja pessoal, comercial ou artístico — encontra a imagem ideal. Queremos ser referência global em conteúdo visual de qualidade, valorizando tanto quem cria quanto quem compra.
                            </p>
                        </div>
                    </div>

                    {/* Values */}
                    <div className="mb-20">
                        <div className="text-center mb-12">
                            <div className="inline-block p-3 rounded-full bg-primary/10 text-primary-dark mb-4 shadow-sm border border-primary/20">
                                <span className="text-3xl">💎</span>
                            </div>
                            <h2 className="text-3xl font-display font-bold text-neutral-900">Nossos Valores</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { title: "Qualidade", text: "Uma curadoria rigorosa garante que apenas as melhores fotografias fazem parte do nosso catálogo." },
                                { title: "Comunidade", text: "Apoiamos e incentivamos fotógrafos com um ambiente justo, inspirador e cheio de oportunidades." },
                                { title: "Transparência", text: "Praticamos preços honestos, licenças claras e uma comunicação aberta com todos os usuários." },
                                { title: "Inovação", text: "Aprimoramos continuamente nossa plataforma com tecnologia moderna, tornando o FotoClic um espaço rápido, intuitivo e seguro." }
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
                                <h2 className="text-3xl font-display font-bold mb-6">O que nos move</h2>
                                <ul className="space-y-4 text-neutral-300 text-lg">
                                    <li className="flex items-center justify-center md:justify-start">
                                        <span className="w-2 h-2 bg-primary rounded-full mr-4 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
                                        A paixão pela fotografia.
                                    </li>
                                    <li className="flex items-center justify-center md:justify-start">
                                        <span className="w-2 h-2 bg-primary rounded-full mr-4 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
                                        A vontade de criar conexões reais através de imagens.
                                    </li>
                                    <li className="flex items-center justify-center md:justify-start">
                                        <span className="w-2 h-2 bg-primary rounded-full mr-4 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
                                        O compromisso com um marketplace que valoriza talento, criatividade e autenticidade.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Final CTA */}
                    <div className="text-center bg-gradient-to-r from-primary/5 to-secondary/5 p-10 rounded-2xl border border-neutral-100">
                        <p className="text-lg text-neutral-800 font-medium mb-2">
                            Se você é <span className="text-primary font-bold">fotógrafo</span>, aqui é o seu lugar para mostrar o mundo sob o seu olhar.
                        </p>
                        <p className="text-lg text-neutral-800 font-medium mb-8">
                            Se você é <span className="text-secondary font-bold">comprador</span>, aqui você encontrará a imagem perfeita para seu projeto.
                        </p>
                        <h3 className="text-2xl md:text-3xl font-display font-bold text-neutral-900 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                            FotoClic — A arte de capturar histórias.
                        </h3>
                    </div>

                </div>
            </section>
        </div>
    );
};

export default AboutPage;


