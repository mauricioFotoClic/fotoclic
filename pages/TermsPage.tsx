
import React from 'react';

const TermsPage: React.FC = () => {
    return (
        <div className="bg-neutral-50 min-h-screen pb-12">
            {/* Header Section */}
            <section className="bg-[#0A1A2F] text-white relative overflow-hidden py-20 pb-28">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
                
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <div className="inline-flex items-center justify-center p-3 mb-6 bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
                        <span className="text-2xl mr-2">📄</span>
                        <span className="text-sm font-bold uppercase tracking-widest text-neutral-200">Legal</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
                        Termos de Serviço
                    </h1>
                    <p className="text-lg text-neutral-300">
                        Última atualização: {new Date().toLocaleDateString('pt-BR')}
                    </p>
                </div>
            </section>

            {/* Content Section */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20">
                <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-4xl mx-auto prose prose-lg prose-neutral prose-headings:font-display prose-headings:font-bold prose-headings:text-primary-dark prose-a:text-primary hover:prose-a:text-primary-dark">
                    
                    <h2>1. Aceitação dos Termos</h2>
                    <p>
                        Ao acessar, navegar ou utilizar o FotoClic (“Serviço”), você declara estar ciente, compreender e concordar integralmente com estes Termos de Serviço. Caso não concorde com qualquer disposição aqui estabelecida, recomendamos que não utilize o Serviço.
                    </p>
                    <p>
                        O uso contínuo do FotoClic também implica na aceitação de quaisquer diretrizes, políticas ou regras adicionais publicadas na plataforma.
                    </p>

                    <h2>2. Descrição do Serviço</h2>
                    <p>
                        O FotoClic é um marketplace de fotografias digitais, cujo objetivo é conectar fotógrafos a compradores interessados em adquirir licenças de uso de suas imagens.
                    </p>
                    <p>
                        O FotoClic não reivindica propriedade sobre as fotografias enviadas pelos fotógrafos. Todos os direitos autorais permanecem exclusivamente com os criadores das imagens.
                        A plataforma atua como um intermediário, fornecendo recursos para exposição, licenciamento e compra de fotografias digitais.
                    </p>

                    <h2>3. Licenciamento de Uso</h2>
                    <p>
                        Ao adquirir uma fotografia na plataforma, o comprador recebe uma licença de uso conforme os termos da modalidade selecionada no momento da compra.
                        Essa licença é:
                    </p>
                    <ul>
                        <li><strong>Não exclusiva</strong></li>
                        <li><strong>Intransferível</strong></li>
                        <li><strong>Limitada</strong> ao uso permitido na descrição da licença escolhida</li>
                    </ul>
                    <p>
                        A propriedade intelectual e os direitos autorais permanecem integralmente com o fotógrafo que criou a imagem.
                    </p>

                    <h2>4. Conduta do Usuário</h2>
                    <p>
                        Ao utilizar o FotoClic, você concorda em não praticar ações que violem a legislação vigente ou prejudiquem a segurança e o bom funcionamento do Serviço. Entre as condutas proibidas estão:
                    </p>
                    <ul>
                        <li>Enviar, publicar ou transmitir qualquer conteúdo ilegal, ofensivo, difamatório, ameaçador ou prejudicial.</li>
                        <li>Tentar personificar terceiros, incluindo fotógrafos, compradores ou representantes da plataforma.</li>
                        <li>Violar leis locais, estaduais, nacionais ou internacionais.</li>
                        <li>Interferir no funcionamento da plataforma, tentar acessar áreas restritas ou realizar atividades que comprometam o sistema.</li>
                    </ul>
                    <p>
                        O FotoClic reserva-se o direito de suspender ou encerrar contas que violem estes Termos ou que comprometam a integridade da comunidade.
                    </p>
                </div>
            </section>
        </div>
    );
};

export default TermsPage;
