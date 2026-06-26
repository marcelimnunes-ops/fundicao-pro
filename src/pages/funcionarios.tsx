import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { formatarMoeda } from '@/lib/calculations';

export default function FuncionariosPage() {
  const { funcionarios, loading } = useProducao();

  if (loading) {
    return (
      <Layout title="Funcionários">
        <div className="text-center py-12">
          <div className="spinner w-12 h-12 mx-auto mb-4"></div>
          <p>Carregando funcionários...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Funcionários">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="subsection-title">Cadastro de Funcionários</h3>
          <button className="btn-primary py-2">+ Novo Funcionário</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {funcionarios.map((f) => (
            <div key={f.id} className="border rounded-lg p-4 hover:shadow-lg transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {f.nome.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{f.nome}</p>
                  <p className="text-xs text-slate-500">{f.funcao}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Salário</span>
                  <span className="font-semibold">{formatarMoeda(f.salario)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Custo/Hora</span>
                  <span className="font-semibold">{formatarMoeda(f.custo_hora)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Vale</span>
                  <span className="font-semibold">{formatarMoeda(f.vale)}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex gap-2">
                <button className="flex-1 btn-secondary text-xs py-1">Editar</button>
                <button className="flex-1 btn-danger text-xs py-1">Inativar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
