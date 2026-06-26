// src/pages/estoque.tsx
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';

export default function EstoquePage() {
  const { estoque } = useProducao();

  return (
    <Layout title="Estoque">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posição de Estoque */}
        <div className="card">
          <h3 className="subsection-title">Posição de Estoque</h3>
          <div className="space-y-6">
            {estoque.map((e) => (
              <div key={e.id}>
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">{e.tipo}</span>
                  <span className="font-bold text-lg">
                    {e.saldo.toFixed(2)} {e.tipo === 'Óleo' ? 'L' : 'kg'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      e.saldo > 1000 ? 'bg-green-500' : e.saldo > 500 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min((e.saldo / 2000) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Custo Médio: R$ {e.custo_medio.toFixed(2)}/un
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Movimentações Recentes */}
        <div className="card">
          <h3 className="subsection-title">Movimentações Recentes</h3>
          <p className="text-slate-600 text-center py-8">Sem movimentações registradas</p>
        </div>
      </div>
    </Layout>
  );
}
