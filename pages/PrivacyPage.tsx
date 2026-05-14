
import React from 'react';

const PrivacyPage: React.FC = () => {
    return (
        <div className="bg-neutral-50 min-h-screen pb-12">
            {/* Header Section */}
            <section className="bg-[#0A1A2F] text-white relative overflow-hidden py-20 pb-28">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/3 translate-y-1/3"></div>
                
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <div className="inline-flex items-center justify-center p-3 mb-6 bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
                        <span className="text-2xl mr-2">🔒</span>
                        <span className="text-sm font-bold uppercase tracking-widest text-neutral-200">Legal</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
                        Política de Privacidade
                    </h1>
                    <p className="text-lg text-neutral-300">
                        Última atualização: {new Date().toLocaleDateString('pt-BR')}
                    </p>
                </div>
            </section>

            {/* Content Section */}
            <section className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20">
                <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-4xl mx-auto prose prose-lg prose-neutral prose-headings:font-display prose-headings:font-bold prose-headings:text-primary-dark prose-a:text-primary hover:prose-a:text-primary-dark">
                    
                    <h2>1. Coleta de Informações</h2>
                    <p>
                        Coletamos informações pessoais de usuários e fotógrafos quando você:
                    </p>
                    <ul>
                        <li>cria uma conta na plataforma,</li>
                        <li>realiza uma compra,</li>
                        <li>se inscreve em nossa newsletter,</li>
                        <li>ou preenche qualquer formulário disponível no site.</li>
                    </ul>
                    <p>
                        As informações coletadas podem incluir:
                    </p>
                    <ul>
                        <li>Nome completo,</li>
                        <li>Endereço de e-mail,</li>
                        <li>Informações de pagamento (para fotógrafos que recebem valores),</li>
                        <li>e outros dados necessários para o funcionamento do marketplace de fotografias.</li>
                    </ul>
                    <p>
                        Não coletamos dados sensíveis sem necessidade e não vendemos suas informações a terceiros.
                    </p>

                    <h2>2. Uso das Informações</h2>
                    <p>
                        Os dados fornecidos pelos usuários podem ser utilizados para:
                    </p>
                    <ul>
                        <li>Personalizar sua experiência na plataforma,</li>
                        <li>Melhorar nosso site e funcionalidades,</li>
                        <li>Aprimorar o suporte ao cliente,</li>
                        <li>Processar pagamentos e transações,</li>
                        <li>Enviar comunicados importantes, atualizações e e-mails periódicos relacionados ao FotoClic.</li>
                    </ul>
                    <p>
                        O FotoClic se compromete a utilizar suas informações de forma ética, transparente e alinhada às boas práticas de proteção de dados.
                    </p>

                    <h2>3. Proteção das Informações</h2>
                    <p>
                        Adotamos uma série de medidas técnicas e administrativas de segurança para proteger seus dados pessoais contra acesso indevido, alteração, divulgação ou destruição.
                        Entre as medidas utilizadas estão:
                    </p>
                    <ul>
                        <li>Conexão segura (HTTPS),</li>
                        <li>Criptografia de dados sensíveis,</li>
                        <li>Controle de acesso,</li>
                        <li>Monitoramento interno,</li>
                        <li>Hospedagem em provedores confiáveis.</li>
                    </ul>
                    <p>
                        Apesar de nossos esforços, nenhum sistema é totalmente imune, mas trabalhamos continuamente para manter seus dados o mais seguros possível.
                    </p>

                    <h2>4. Uso de Cookies</h2>
                    <p>
                        Sim, o FotoClic utiliza cookies para melhorar sua experiência de navegação. Esses arquivos são armazenados no seu dispositivo através do navegador e permitem que nosso sistema:
                    </p>
                    <ul>
                        <li>reconheça suas preferências,</li>
                        <li>guarde informações importantes,</li>
                        <li>melhore o desempenho do site,</li>
                        <li>personalize conteúdos e funcionalidades.</li>
                    </ul>
                    <p>
                        Você pode desativar os cookies nas configurações do seu navegador, porém isso pode impactar algumas funcionalidades da plataforma.
                    </p>

                    <h2>5. Produtos Digitais e Reembolso</h2>
                    <p>
                        O FotoClic comercializa produtos digitais com liberação imediata após a confirmação do pagamento. Devido à natureza digital do produto e à possibilidade de download imediato, não haverá reembolso dos valores pagos após o download da imagem, salvo exceções expressamente previstas em lei ou falhas técnicas comprovadas no arquivo.
                    </p>

                </div>
            </section>
        </div>
    );
};

export default PrivacyPage;


