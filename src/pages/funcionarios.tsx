import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card, Badge } from '@/components/ui';

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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900">Cadastro de Funcionários</h3>
          <button className="btn-primary">+ Novo Funcionário</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {funcionarios.map((f) => (
            <Card key={f.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {f.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{f.nome}</p>
                  <p className="text-xs text-slate-500">{f.funcao}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Status</span>
                  <Badge variant={f.ativo ? 'success' : 'danger'}>
                    {f.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                {f.salario !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Salário</span>
                    <span className="font-semibold">
                      {f.salario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                )}
                {f.custo_hora !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Custo/Hora</span>
                    <span className="font-semibold">
                      {f.custo_hora.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t flex gap-2">
                <button className="flex-1 btn-secondary text-xs py-1">Editar</button>
                <button className="flex-1 btn-danger text-xs py-1">Inativar</button>
              </div>
            </Card>
          ))}

          {funcionarios.length === 0 && (
            <div className="col-span-3 text-center py-12 text-slate-500">
              Nenhum funcionário cadastrado
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
