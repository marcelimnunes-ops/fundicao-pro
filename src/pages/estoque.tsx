import Layout from '@/components/Layout';
import { useEstoque } from '@/hooks/useEstoque';
import { Card } from '@/components/ui';

export default function EstoquePage() {
  const { estoque, movimentacoes, loading } = useEstoque();

  if (loading) {
    return (
      <Layout title="Estoque">
        <div className="text-center py-12">Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Estoque">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Posição de Estoque">
          {estoque.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Nenhum estoque registrado</p>
          ) : (
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
                      className={`h-3 rounded-full transition-all ${
                        e.saldo > 1000 ? 'bg-green-500' : e.saldo > 500 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((e.saldo / 2000) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Custo Médio: R$ {e.custo_medio.toFixed(2)}/un
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Movimentações Recentes">
          {movimentacoes.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Sem movimentações registradas</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 text-left">Data</th>
                    <th className="p-2 text-left">Tipo</th>
                    <th className="p-2 text-left">Material</th>
                    <th className="p-2 text-right">Qtd.</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentacoes.slice(0, 20).map((m) => (
                    <tr key={m.id} className="border-b hover:bg-slate-50">
                      <td className="p-2">{m.data}</td>
                      <td className="p-2">
                        <span className={`font-semibold ${m.tipo_movimento === 'Entrada' ? 'text-green-600' : 'text-red-600'}`}>
                          {m.tipo_movimento}
                        </span>
                      </td>
                      <td className="p-2">{m.material}</td>
                      <td className="p-2 text-right">{m.quantidade.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
