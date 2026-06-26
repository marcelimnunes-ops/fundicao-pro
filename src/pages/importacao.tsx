import { useState, useRef } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import {
  importarApontamentos,
  importarFuncionarios,
  importarProdutos,
  importarClientes,
  importarPlanilhaCompleta,
  listarAbas,
  type ApontamentoImportado,
  type FuncionarioImportado,
  type ProdutoImportado,
  type ClienteImportado,
  type ImportacaoResult,
  type ImportacaoTodosResult,
} from '@/lib/importacao-excel';

type TipoImportacao = 'tudo' | 'apontamentos' | 'funcionarios' | 'produtos' | 'clientes';

const TIPOS: { value: TipoImportacao; label: string; descricao: string }[] = [
  { value: 'tudo', label: '📦 Importar Planilha Completa', descricao: 'Lê todas as abas: Profissionais, Produtos, Clientes e Produção de uma vez' },
  { value: 'apontamentos', label: 'Apontamentos de Produção', descricao: 'Data | Moldador | Produto | Caixas | Alumínio Bruto | Peso Retorno | Perdas | Óleo | Horas' },
  { value: 'funcionarios', label: 'Funcionários', descricao: 'Nome | Função | Salário | Cartão | Custo/h' },
  { value: 'produtos', label: 'Produtos', descricao: 'Código | Nome | Qtde Pçs/Placa | Peso Pç | Peso Galho | Machos | Tipo Material | Usinagem' },
  { value: 'clientes', label: 'Clientes', descricao: 'Nome | CNPJ | Email | Telefone | Cidade | Estado' },
];

interface ResumoTodos {
  funcionarios: { sucesso: number; erros: number };
  clientes: { sucesso: number; erros: number };
  produtos: { sucesso: number; erros: number };
  apontamentos: { sucesso: number; erros: number };
}

export default function ImportacaoPage() {
  const { funcionarios, produtos } = useProducao();
  const [tipo, setTipo] = useState<TipoImportacao>('tudo');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [abasDetectadas, setAbasDetectadas] = useState<string[]>([]);
  const [processando, setProcessando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<ImportacaoResult<unknown> | null>(null);
  const [resultadoTodos, setResultadoTodos] = useState<ImportacaoTodosResult | null>(null);
  const [msgSalvo, setMsgSalvo] = useState('');
  const [erroMsg, setErroMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleArquivo = async (file: File) => {
    setArquivo(file);
    setResultado(null);
    setResultadoTodos(null);
    setMsgSalvo('');
    setErroMsg('');
    try {
      const abas = await listarAbas(file);
      setAbasDetectadas(abas);
      // Auto-processar
      await processarArquivo(file, tipo);
    } catch {
      setErroMsg('Erro ao ler arquivo. Verifique se é um arquivo Excel válido (.xlsx, .xls).');
    }
  };

  const processarArquivo = async (file: File, tipoAtual: TipoImportacao) => {
    setProcessando(true);
    setResultado(null);
    setResultadoTodos(null);
    setMsgSalvo('');
    setErroMsg('');

    try {
      if (tipoAtual === 'tudo') {
        const res = await importarPlanilhaCompleta(file);
        setResultadoTodos(res);
      } else {
        let res: ImportacaoResult<unknown>;
        if (tipoAtual === 'apontamentos') res = await importarApontamentos(file);
        else if (tipoAtual === 'funcionarios') res = await importarFuncionarios(file);
        else if (tipoAtual === 'produtos') res = await importarProdutos(file);
        else res = await importarClientes(file);
        setResultado(res);
      }
    } catch (err) {
      setErroMsg(`Erro ao processar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setProcessando(false);
    }
  };

  const handleTipoChange = async (novoTipo: TipoImportacao) => {
    setTipo(novoTipo);
    setResultado(null);
    setResultadoTodos(null);
    setMsgSalvo('');
    setErroMsg('');
    if (arquivo) {
      await processarArquivo(arquivo, novoTipo);
    }
  };

  const handleSalvarSimples = async () => {
    if (!resultado || resultado.dados.length === 0) return;
    setSalvando(true);
    setMsgSalvo('');
    setErroMsg('');

    try {
      if (tipo === 'funcionarios') {
        const rows = (resultado as ImportacaoResult<FuncionarioImportado>).dados;
        const { error } = await supabase.from('funcionarios').insert(
          rows.map((r) => ({ nome: r.nome, funcao: r.funcao, salario: r.salario, cartao_beneficio: r.cartao_beneficio, ativo: true }))
        );
        if (error) throw error;
        setMsgSalvo(`✅ ${rows.length} funcionários importados com sucesso.`);
      } else if (tipo === 'produtos') {
        const rows = (resultado as ImportacaoResult<ProdutoImportado>).dados;
        const { error } = await supabase.from('produtos').insert(
          rows.map((r) => ({ ...r, ativo: true }))
        );
        if (error) throw error;
        setMsgSalvo(`✅ ${rows.length} produtos importados com sucesso.`);
      } else if (tipo === 'clientes') {
        const rows = (resultado as ImportacaoResult<ClienteImportado>).dados;
        const { error } = await supabase.from('clientes').insert(
          rows.map((r) => ({ razao_social: r.razao_social, nome_fantasia: r.nome_fantasia, cnpj: r.cnpj, email: r.email, telefone: r.telefone, cidade: r.cidade, uf: r.uf, ativo: true }))
        );
        if (error) throw error;
        setMsgSalvo(`✅ ${rows.length} clientes importados com sucesso.`);
      } else if (tipo === 'apontamentos') {
        const rows = (resultado as ImportacaoResult<ApontamentoImportado>).dados;
        let salvoCount = 0;
        const erros: string[] = [];

        for (const row of rows) {
          const moldador = funcionarios.find(
            (f) => f.nome.toLowerCase() === row.moldador_nome.toLowerCase()
          );
          const produto = produtos.find(
            (p) => p.codigo.toLowerCase() === row.produto_codigo.toLowerCase() ||
                   p.nome.toLowerCase().includes(row.produto_codigo.toLowerCase())
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
        const msg = `✅ ${salvoCount} apontamentos salvos.`;
        setMsgSalvo(erros.length > 0 ? `${msg}\n⚠️ ${erros.length} erros: ${erros.slice(0, 3).join('; ')}${erros.length > 3 ? '...' : ''}` : msg);
      }
      setResultado(null);
      setArquivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setErroMsg(`Erro ao salvar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvarTodos = async () => {
    if (!resultadoTodos) return;
    setSalvando(true);
    setMsgSalvo('');
    setErroMsg('');
    const resumo: ResumoTodos = {
      funcionarios: { sucesso: 0, erros: 0 },
      clientes: { sucesso: 0, erros: 0 },
      produtos: { sucesso: 0, erros: 0 },
      apontamentos: { sucesso: 0, erros: 0 },
    };

    try {
      // 1. Funcionários
      if (resultadoTodos.funcionarios.dados.length > 0) {
        const { error } = await supabase.from('funcionarios').insert(
          resultadoTodos.funcionarios.dados.map((r) => ({
            nome: r.nome, funcao: r.funcao, salario: r.salario,
            cartao_beneficio: r.cartao_beneficio, ativo: true,
          }))
        );
        if (error) resumo.funcionarios.erros = resultadoTodos.funcionarios.dados.length;
        else resumo.funcionarios.sucesso = resultadoTodos.funcionarios.dados.length;
      }

      // 2. Clientes
      if (resultadoTodos.clientes.dados.length > 0) {
        const { error } = await supabase.from('clientes').insert(
          resultadoTodos.clientes.dados.map((r) => ({
            razao_social: r.razao_social, nome_fantasia: r.nome_fantasia, ativo: true,
          }))
        );
        if (error) resumo.clientes.erros = resultadoTodos.clientes.dados.length;
        else resumo.clientes.sucesso = resultadoTodos.clientes.dados.length;
      }

      // 3. Produtos
      if (resultadoTodos.produtos.dados.length > 0) {
        const { error } = await supabase.from('produtos').insert(
          resultadoTodos.produtos.dados.map((r) => ({ ...r, ativo: true }))
        );
        if (error) resumo.produtos.erros = resultadoTodos.produtos.dados.length;
        else resumo.produtos.sucesso = resultadoTodos.produtos.dados.length;
      }

      // 4. Apontamentos (busca IDs dos funcionários/produtos recém-importados)
      if (resultadoTodos.apontamentos.dados.length > 0) {
        const [{ data: funcs }, { data: prods }] = await Promise.all([
          supabase.from('funcionarios').select('id, nome'),
          supabase.from('produtos').select('id, codigo, nome'),
        ]);
        const funcMap = new Map((funcs ?? []).map((f: { id: string; nome: string }) => [f.nome.toLowerCase(), f.id]));
        const prodMap = new Map((prods ?? []).map((p: { id: string; codigo: string; nome: string }) => [p.codigo.toLowerCase(), p.id]));

        const apontamentosValidos = resultadoTodos.apontamentos.dados
          .filter((row) => {
            const mId = funcMap.get(row.moldador_nome.toLowerCase());
            const pId = prodMap.get(row.produto_codigo.toLowerCase()) ??
              [...prodMap.entries()].find(([, ]) => row.produto_codigo.toLowerCase().includes(row.produto_codigo.toLowerCase().split(' ')[0]))?.[1];
            return mId && pId;
          })
          .map((row) => ({
            data: row.data,
            moldador_id: funcMap.get(row.moldador_nome.toLowerCase())!,
            produto_id: prodMap.get(row.produto_codigo.toLowerCase())!,
            qtde_caixas: row.qtde_caixas,
            aluminio_bruto: row.aluminio_bruto,
            peso_retorno: row.peso_retorno,
            perdas_peca: row.perdas_peca,
            consumo_oleo: row.consumo_oleo,
            tempo_horas: row.tempo_horas,
          }));

        if (apontamentosValidos.length > 0) {
          const { error } = await supabase.from('producao').insert(apontamentosValidos);
          if (error) resumo.apontamentos.erros = apontamentosValidos.length;
          else resumo.apontamentos.sucesso = apontamentosValidos.length;
        }
        resumo.apontamentos.erros += resultadoTodos.apontamentos.dados.length - apontamentosValidos.length;
      }

      setMsgSalvo(
        `✅ Importação concluída!\n` +
        `👥 Funcionários: ${resumo.funcionarios.sucesso} salvos, ${resumo.funcionarios.erros} erros\n` +
        `🤝 Clientes: ${resumo.clientes.sucesso} salvos, ${resumo.clientes.erros} erros\n` +
        `📦 Produtos: ${resumo.produtos.sucesso} salvos, ${resumo.produtos.erros} erros\n` +
        `📝 Apontamentos: ${resumo.apontamentos.sucesso} salvos, ${resumo.apontamentos.erros} erros`
      );
      setResultadoTodos(null);
      setArquivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setErroMsg(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSalvando(false);
    }
  };

  const resumoTodos: ResumoTodos | null = resultadoTodos
    ? {
        funcionarios: { sucesso: resultadoTodos.funcionarios.sucesso, erros: resultadoTodos.funcionarios.erros.length },
        clientes: { sucesso: resultadoTodos.clientes.sucesso, erros: resultadoTodos.clientes.erros.length },
        produtos: { sucesso: resultadoTodos.produtos.sucesso, erros: resultadoTodos.produtos.erros.length },
        apontamentos: { sucesso: resultadoTodos.apontamentos.sucesso, erros: resultadoTodos.apontamentos.erros.length },
      }
    : null;

  return (
    <Layout title="Importação de Dados">
      <div className="space-y-6 max-w-4xl">
        {msgSalvo && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-semibold whitespace-pre-line">
            {msgSalvo}
          </div>
        )}
        {erroMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {erroMsg}
          </div>
        )}

        <Card title="Importar Dados do Excel">
          <div className="space-y-4">
            {/* Tipo de importação */}
            <div className="grid grid-cols-1 gap-2">
              {TIPOS.map((t) => (
                <label
                  key={t.value}
                  className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    tipo === t.value
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="tipo"
                    value={t.value}
                    checked={tipo === t.value}
                    onChange={() => handleTipoChange(t.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-semibold text-sm">{t.label}</p>
                    <p className="text-xs text-slate-500">{t.descricao}</p>
                  </div>
                </label>
              ))}
            </div>

            {/* Upload */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Arquivo Excel (.xlsx, .xls)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="form-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleArquivo(f);
                }}
              />
              {arquivo && (
                <p className="text-xs text-green-600 mt-1 font-semibold">
                  📄 {arquivo.name}
                  {abasDetectadas.length > 0 && (
                    <span className="text-slate-500 font-normal ml-2">
                      — Abas: {abasDetectadas.join(', ')}
                    </span>
                  )}
                </p>
              )}
            </div>

            {processando && (
              <div className="flex items-center gap-2 text-orange-600 text-sm">
                <div className="spinner w-4 h-4"></div>
                Processando arquivo...
              </div>
            )}
          </div>
        </Card>

        {/* Resultado: Importar Tudo */}
        {resultadoTodos && resumoTodos && (
          <Card title="Resultado da Leitura — Planilha Completa">
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(
                  [
                    { label: '👥 Funcionários', ...resumoTodos.funcionarios },
                    { label: '🤝 Clientes', ...resumoTodos.clientes },
                    { label: '📦 Produtos', ...resumoTodos.produtos },
                    { label: '📝 Apontamentos', ...resumoTodos.apontamentos },
                  ] as Array<{ label: string; sucesso: number; erros: number }>
                ).map((item) => (
                  <div key={item.label} className="p-3 bg-slate-50 rounded-lg text-center">
                    <p className="text-xs font-semibold text-slate-600">{item.label}</p>
                    <p className="text-2xl font-bold text-green-700">{item.sucesso}</p>
                    {item.erros > 0 && (
                      <p className="text-xs text-red-500">{item.erros} com erro</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Erros detalhados */}
              {Object.entries(resultadoTodos).some(([, v]) => (v as ImportacaoResult<unknown>).erros.length > 0) && (
                <div>
                  <p className="text-sm font-semibold text-red-700 mb-2">Erros encontrados:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {Object.entries(resultadoTodos).flatMap(([modulo, v]) =>
                      (v as ImportacaoResult<unknown>).erros.map((e, i) => (
                        <div key={`${modulo}-${i}`} className="text-xs text-red-600 p-2 bg-red-50 rounded">
                          <span className="font-semibold">[{modulo}] Linha {e.linha}:</span> {e.erro}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {(resumoTodos.funcionarios.sucesso + resumoTodos.clientes.sucesso + resumoTodos.produtos.sucesso + resumoTodos.apontamentos.sucesso) > 0 && (
                <button
                  className="btn-primary w-full"
                  onClick={handleSalvarTodos}
                  disabled={salvando}
                >
                  {salvando
                    ? 'Salvando no banco de dados...'
                    : `Salvar tudo (${resumoTodos.funcionarios.sucesso + resumoTodos.clientes.sucesso + resumoTodos.produtos.sucesso + resumoTodos.apontamentos.sucesso} registros)`}
                </button>
              )}
            </div>
          </Card>
        )}

        {/* Resultado: Importação simples */}
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
                    className="btn-primary mt-4 w-full"
                    onClick={handleSalvarSimples}
                    disabled={salvando}
                  >
                    {salvando ? 'Salvando...' : `Salvar ${resultado.sucesso} registros no banco`}
                  </button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Guia de colunas */}
        <Card title="Formato das Colunas por Tipo">
          <div className="text-sm text-slate-600 space-y-3">
            {TIPOS.filter((t) => t.value !== 'tudo').map((t) => (
              <div key={t.value} className="flex items-start gap-2">
                <Badge variant="info">{t.label}</Badge>
                <span className="text-xs mt-0.5">{t.descricao}</span>
              </div>
            ))}
            <p className="text-xs text-slate-500 mt-2 p-2 bg-slate-50 rounded">
              💡 A primeira linha deve conter os nomes das colunas. Datas aceitam formato DD/MM/YYYY, YYYY-MM-DD ou número serial do Excel.
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
