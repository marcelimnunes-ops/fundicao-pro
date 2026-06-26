import { useState } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import {
  importarApontamentos,
  importarFuncionarios,
  importarProdutos,
  importarClientes,
  type ApontamentoImportado,
  type FuncionarioImportado,
  type ProdutoImportado,
  type ClienteImportado,
  type ImportacaoResult,
} from '@/lib/importacao-excel';

type TipoImportacao = 'apontamentos' | 'funcionarios' | 'produtos' | 'clientes';

const TIPOS: { value: TipoImportacao; label: string }[] = [
  { value: 'apontamentos', label: 'Apontamentos de Produção' },
  { value: 'funcionarios', label: 'Funcionários' },
  { value: 'produtos', label: 'Produtos' },
  { value: 'clientes', label: 'Clientes' },
];

const COLUNAS: Record<TipoImportacao, string> = {
  apontamentos: 'Data | Moldador | Produto | Caixas | Alumínio Bruto | Peso Retorno | Perdas | Óleo | Horas',
  funcionarios: 'Nome | Função | Salário | Vale | Cartão Custo | Custo/Hora',
  produtos: 'Código | Nome | Descrição',
  clientes: 'Nome | CNPJ | Email | Telefone | Cidade | Estado',
};

export default function ImportacaoPage() {
  const { funcionarios, produtos } = useProducao();
  const [tipo, setTipo] = useState<TipoImportacao>('apontamentos');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [processando, setProcessando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<ImportacaoResult<unknown> | null>(null);
  const [msgSalvo, setMsgSalvo] = useState('');

  const handleProcessar = async () => {
    if (!arquivo) return;
    setProcessando(true);
    setResultado(null);
    setMsgSalvo('');
    try {
      let res: ImportacaoResult<unknown>;
      if (tipo === 'apontamentos') res = await importarApontamentos(arquivo);
      else if (tipo === 'funcionarios') res = await importarFuncionarios(arquivo);
      else if (tipo === 'produtos') res = await importarProdutos(arquivo);
      else res = await importarClientes(arquivo);
      setResultado(res);
    } catch (err) {
      alert(`Erro ao processar arquivo: ${err instanceof Error ? err.message : err}`);
    } finally {
      setProcessando(false);
    }
  };

  const handleSalvar = async () => {
    if (!resultado || resultado.dados.length === 0) return;
    setSalvando(true);
    setMsgSalvo('');
    try {
      if (tipo === 'funcionarios') {
        const rows = (resultado as ImportacaoResult<FuncionarioImportado>).dados;
        const { error } = await supabase.from('funcionarios').insert(rows);
        if (error) throw error;
        setMsgSalvo(`${rows.length} funcionários importados com sucesso.`);
      } else if (tipo === 'produtos') {
        const rows = (resultado as ImportacaoResult<ProdutoImportado>).dados;
        const { error } = await supabase.from('produtos').insert(rows);
        if (error) throw error;
        setMsgSalvo(`${rows.length} produtos importados com sucesso.`);
      } else if (tipo === 'clientes') {
        const rows = (resultado as ImportacaoResult<ClienteImportado>).dados;
        const { error } = await supabase.from('clientes').insert(rows);
        if (error) throw error;
        setMsgSalvo(`${rows.length} clientes importados com sucesso.`);
      } else if (tipo === 'apontamentos') {
        const rows = (resultado as ImportacaoResult<ApontamentoImportado>).dados;
        let salvoCount = 0;
        const erros: string[] = [];

        for (const row of rows) {
          const moldador = funcionarios.find(
            (f) => f.nome.toLowerCase() === row.moldador_nome.toLowerCase()
          );
          const produto = produtos.find(
            (p) => p.codigo.toLowerCase() === row.produto_codigo.toLowerCase()
          );

          if (!moldador) { erros.push(`Moldador não encontrado: ${row.moldador_nome}`); continue; }
          if (!produto) { erros.push(`Produto não encontrado: ${row.produto_codigo}`); continue; }

          const { error } = await supabase.from('producao').insert({
            data: row.data,
            moldador_id: moldador.id,
            produto_id: produto.id,
            qtde_caixas: row.qtde_caixas,
            aluminio_bruto: row.aluminio_bruto,
            peso_retorno: row.peso_retorno,
            perdas_peca: row.perdas_peca,
            consumo_oleo: row.consumo_oleo,
            tempo_horas: row.tempo_horas,
          });

          if (error) erros.push(`${row.data}: ${error.message}`);
          else salvoCount++;
        }

        const msg = `${salvoCount} apontamentos salvos.`;
        setMsgSalvo(erros.length > 0 ? `${msg} Erros: ${erros.join('; ')}` : msg);
      }
      setResultado(null);
      setArquivo(null);
    } catch (err) {
      alert(`Erro ao salvar: ${err instanceof Error ? err.message : err}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Layout title="Importação de Dados">
      <div className="space-y-6 max-w-3xl">
        {msgSalvo && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-semibold">
            {msgSalvo}
          </div>
        )}

        <Card title="Importar Dados do Excel">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Tipo de Importação
              </label>
              <select
                className="form-select"
                value={tipo}
                onChange={(e) => { setTipo(e.target.value as TipoImportacao); setResultado(null); setArquivo(null); }}
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
              <p className="font-semibold mb-1">Colunas esperadas:</p>
              <p>{COLUNAS[tipo]}</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Arquivo Excel (.xlsx, .xls, .csv)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="form-input"
                onChange={(e) => { setArquivo(e.target.files?.[0] ?? null); setResultado(null); }}
              />
              {arquivo && (
                <p className="text-xs text-green-600 mt-1 font-semibold">{arquivo.name}</p>
              )}
            </div>

            <button
              className="btn-primary"
              onClick={handleProcessar}
              disabled={!arquivo || processando}
            >
              {processando ? 'Processando...' : 'Validar Arquivo'}
            </button>
          </div>
        </Card>

        {resultado && (
          <Card title="Resultado da Validação">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="p-3 bg-green-50 rounded-lg flex-1 text-center">
                  <p className="text-xs text-slate-600">Válidos</p>
                  <p className="text-2xl font-bold text-green-700">{resultado.sucesso}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg flex-1 text-center">
                  <p className="text-xs text-slate-600">Erros</p>
                  <p className="text-2xl font-bold text-red-700">{resultado.erros.length}</p>
                </div>
              </div>

              {resultado.erros.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-red-700 mb-2">Erros encontrados:</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {resultado.erros.map((e, i) => (
                      <div key={i} className="text-xs text-red-600 p-2 bg-red-50 rounded">
                        <span className="font-semibold">Linha {e.linha}:</span> {e.erro}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {resultado.sucesso > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">
                    Prévia ({Math.min(resultado.dados.length, 5)} de {resultado.dados.length}):
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100">
                        <tr>
                          {Object.keys(resultado.dados[0] as object).map((k) => (
                            <th key={k} className="p-2 text-left">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(resultado.dados as Record<string, unknown>[]).slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b">
                            {Object.values(row).map((v, j) => (
                              <td key={j} className="p-2">{String(v ?? '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    className="btn-primary mt-4"
                    onClick={handleSalvar}
                    disabled={salvando}
                  >
                    {salvando ? 'Salvando...' : `Salvar ${resultado.sucesso} registros no banco`}
                  </button>
                </div>
              )}
            </div>
          </Card>
        )}

        <Card title="Modelos de Planilha">
          <div className="text-sm text-slate-600 space-y-3">
            {TIPOS.map((t) => (
              <div key={t.value} className="flex items-start gap-2">
                <Badge variant="info">{t.label}</Badge>
                <span className="text-xs mt-0.5">{COLUNAS[t.value]}</span>
              </div>
            ))}
            <p className="text-xs text-slate-500 mt-2">
              A primeira linha da planilha deve conter os nomes das colunas exatamente como listado acima.
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
