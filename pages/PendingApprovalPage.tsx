import React from 'react';
import { Page } from '../types';
import Logo from '../components/Logo';
import { ShieldCheck, Clock, CheckCircle2, ArrowRight, HelpCircle, Mail } from 'lucide-react';

interface PendingApprovalPageProps {
    onNavigate: (page: Page) => void;
}

const PendingApprovalPage: React.FC<PendingApprovalPageProps> = ({ onNavigate }) => {
    return (
        <div className="min-h-screen bg-neutral-50/70 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="max-w-2xl w-full text-center relative z-10 flex flex-col items-center">
                <Logo size={46} className="mb-6" useImage={true} />

                {/* Ícone de Status de Moderação */}
                <div className="mb-5 relative">
                    <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-inner border border-amber-500/20">
                        <Clock size={38} className="animate-pulse" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm">
                        <ShieldCheck size={20} className="text-emerald-600" />
                    </div>
                </div>

                {/* Título e Subtítulo Técnicos */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 mb-3 border border-amber-300/60">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                    Status: Cadastro em Moderação Técnica
                </div>

                <h1 className="text-3xl sm:text-4xl font-display font-black text-gray-900 tracking-tight mb-3">
                    Conta em Processo de Avaliação
                </h1>

                <p className="text-sm sm:text-base text-gray-600 max-w-lg mb-8 leading-relaxed">
                    Seu cadastro foi recebido com sucesso pelos nossos servidores e está atualmente sob análise do departamento de curadoria e conformidade técnica do <strong>FotoClic</strong>.
                </p>

                {/* Painel Explicativo Técnico */}
                <div className="w-full bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-6 sm:p-7 text-left space-y-4 mb-8">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Etapas do Processo de Homologação
                    </h3>

                    <div className="space-y-3.5">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                                <CheckCircle2 size={15} />
                            </div>
                            <div>
                                <div className="text-xs sm:text-sm font-bold text-gray-900">
                                    1. Recebimento e Validação de Credenciais
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                    Seus dados cadastrais e identificação foram computados de forma segura em nossa infraestrutura.
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                                <Clock size={15} />
                            </div>
                            <div>
                                <div className="text-xs sm:text-sm font-bold text-amber-900">
                                    2. Análise de Conformidade e Coordenação (Em Andamento)
                                </div>
                                <div className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                                    Nossa equipe técnica analisa a estrutura de coordenação de eventos e valida as diretrizes de comissões e segurança da plataforma.
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center shrink-0 mt-0.5">
                                <ShieldCheck size={15} />
                            </div>
                            <div>
                                <div className="text-xs sm:text-sm font-bold text-gray-700">
                                    3. Liberação Automática do Painel
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                    Assim que a moderação for concluída, você receberá a notificação de ativação por e-mail e o acesso total ao painel será destravado.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-3.5 border-t border-neutral-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-amber-600" />
                            <span>Tempo médio de resposta: <strong>até 24 horas úteis</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-400">
                            <Mail size={13} />
                            <span>contato@fotoclic.com.br</span>
                        </div>
                    </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => onNavigate({ name: 'home' })}
                        className="w-full sm:w-auto px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl shadow hover:bg-primary-dark transition cursor-pointer flex items-center justify-center gap-2"
                    >
                        Navegar na FotoClic
                        <ArrowRight size={16} />
                    </button>

                    <button
                        onClick={() => onNavigate({ name: 'help-center' })}
                        className="w-full sm:w-auto px-5 py-3 bg-white border border-neutral-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-neutral-50 transition cursor-pointer flex items-center justify-center gap-2"
                    >
                        <HelpCircle size={16} className="text-gray-400" />
                        Central de Ajuda
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PendingApprovalPage;
