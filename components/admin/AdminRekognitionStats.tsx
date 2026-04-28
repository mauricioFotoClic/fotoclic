import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:4242' : '';

interface RekognitionStatsData {
    collection: { id: string; faceCount: number; faceModelVersion: string };
    database:   { totalPhotos: number; indexedPhotos: number; totalEncodings: number };
    cost: {
        storageCostPerMonth: number;
        estimatedIndexCost:  number;
        estimatedTotalCost:  number;
        realCostThisMonth:   number | null;
    };
    pricing: {
        storagePerFacePerMonth: number;
        indexFacesPerImage:     number;
        searchPerCall:          number;
        freeTierMonthly:        number;
        currency:               string;
    };
}

const fmt = (n: number) => `$${n.toFixed(4)}`;
const fmtReal = (n: number) => `$${n.toFixed(2)}`;

const Pill: React.FC<{ label: string; value: string | number; color: string }> = ({ label, value, color }) => (
    <div className={`rounded-xl p-4 ${color} flex flex-col gap-1`}>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
    </div>
);

const AdminRekognitionStats: React.FC = () => {
    const [data, setData]       = useState<RekognitionStatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/rekognition-stats`);
            if (!res.ok) throw new Error(await res.text());
            setData(await res.json());
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    if (loading) return (
        <div className="bg-white rounded-2xl shadow p-8 flex items-center justify-center gap-3 text-neutral-400">
            <div className="w-5 h-5 border-2 border-neutral-300 border-t-blue-500 rounded-full animate-spin" />
            Carregando dados do Rekognition...
        </div>
    );

    if (error) return (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
            <p className="font-bold mb-1">Erro ao carregar dados</p>
            <p className="text-sm font-mono">{error}</p>
            <button onClick={load} className="mt-3 text-sm underline">Tentar novamente</button>
        </div>
    );

    if (!data) return null;

    const { collection, database, cost, pricing } = data;
    const indexedPct = database.totalPhotos > 0
        ? Math.round((database.indexedPhotos / database.totalPhotos) * 100)
        : 0;

    return (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-5 flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">👁️</div>
                    <div>
                        <h3 className="font-bold text-lg">Amazon Rekognition</h3>
                        <p className="text-white/70 text-sm">Collection: <code className="bg-white/20 px-1 rounded">{collection.id}</code></p>
                    </div>
                </div>
                <button
                    onClick={load}
                    className="bg-white/20 hover:bg-white/30 text-white text-sm px-3 py-1.5 rounded-lg transition"
                >
                    ↻ Atualizar
                </button>
            </div>

            <div className="p-6 space-y-6">

                {/* Collection Stats */}
                <div>
                    <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">Collection AWS</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Pill label="Rostos indexados" value={collection.faceCount.toLocaleString('pt-BR')} color="bg-blue-50 text-blue-800" />
                        <Pill label="Fotos totais" value={database.totalPhotos.toLocaleString('pt-BR')} color="bg-neutral-50 text-neutral-800" />
                        <Pill label="Fotos indexadas" value={`${database.indexedPhotos} (${indexedPct}%)`} color="bg-green-50 text-green-800" />
                        <Pill label="Modelo facial" value={collection.faceModelVersion} color="bg-purple-50 text-purple-800" />
                    </div>
                </div>

                {/* Progress bar */}
                <div>
                    <div className="flex justify-between text-xs text-neutral-500 mb-1">
                        <span>Progresso de indexação</span>
                        <span>{database.indexedPhotos}/{database.totalPhotos} fotos</span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                            style={{ width: `${indexedPct}%` }}
                        />
                    </div>
                </div>

                {/* Cost */}
                <div>
                    <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">Custos</h4>

                    {cost.realCostThisMonth !== null ? (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-3 flex items-center gap-3">
                            <span className="text-2xl">💰</span>
                            <div>
                                <p className="text-xs text-green-700 font-semibold">Custo real este mês (AWS Cost Explorer)</p>
                                <p className="text-3xl font-bold text-green-800">{fmtReal(cost.realCostThisMonth)}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-xs text-amber-700">
                            ⚠️ Custo real indisponível — adicione permissão <code className="bg-amber-100 px-1 rounded">ce:GetCostAndUsage</code> ao usuário IAM para ver o valor exato.
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                        <div className="border border-neutral-100 rounded-xl p-3 text-center">
                            <p className="text-xs text-neutral-500 mb-1">Armazenamento/mês</p>
                            <p className="font-bold text-neutral-800">{fmt(cost.storageCostPerMonth)}</p>
                            <p className="text-xs text-neutral-400">{collection.faceCount} faces × $0.00001</p>
                        </div>
                        <div className="border border-neutral-100 rounded-xl p-3 text-center">
                            <p className="text-xs text-neutral-500 mb-1">Indexação total</p>
                            <p className="font-bold text-neutral-800">{fmt(cost.estimatedIndexCost)}</p>
                            <p className="text-xs text-neutral-400">{database.indexedPhotos} fotos × $0.001</p>
                        </div>
                        <div className="border border-neutral-100 rounded-xl p-3 text-center bg-neutral-50">
                            <p className="text-xs text-neutral-500 mb-1">Estimativa total</p>
                            <p className="font-bold text-lg text-neutral-900">{fmt(cost.estimatedTotalCost)}</p>
                            <p className="text-xs text-neutral-400">Estimado</p>
                        </div>
                    </div>
                </div>

                {/* Pricing Reference */}
                <div className="bg-neutral-50 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Tabela de preços AWS (us-east-1)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-neutral-600">
                        <div className="flex justify-between gap-2">
                            <span>IndexFaces / imagem</span>
                            <span className="font-mono font-semibold">$0.001</span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span>SearchFaces / busca</span>
                            <span className="font-mono font-semibold">$0.001</span>
                        </div>
                        <div className="flex justify-between gap-2">
                            <span>Armazenamento / rosto / mês</span>
                            <span className="font-mono font-semibold">$0.00001</span>
                        </div>
                    </div>
                    <p className="text-xs text-neutral-400 mt-2">
                        Free tier: {pricing.freeTierMonthly.toLocaleString()} operações/mês grátis nos primeiros 12 meses.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminRekognitionStats;
