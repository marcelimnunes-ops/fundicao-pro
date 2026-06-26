/**
 * Cálculos para sistema de produção de fundição
 * Todos os valores seguem as regras de negócio definidas
 */

export interface ParametrosSistema {
  ENCARGOS_TRABALHISTAS: number; // 1.45
  HORAS_UTEIS_MES: number; // 180
  MARKUP_CUSTO: number; // 1.05
  MARGEM_ALUMINIO: number; // 1.055
  APROVEIT_RETORNO: number; // 0.90
  RENDIMENTO_LINGOTE: number; // 0.90
  RENDIMENTO_SUCATA: number; // 0.65
  OLEO_POR_KG: number; // 2.38
  CUSTO_OLEO_LITRO: number; // 2.50
}

export interface ProdutoData {
  peso_peca: number; // em gramas
  peso_galho: number; // em gramas
  qtd_pecas_placa: number;
  preco_venda: number;
}

export interface FuncionarioData {
  salario: number;
  vale: number;
  cartao_custo: number;
}

export interface ApontamentoData {
  qtde_caixas: number;
  tempo_horas: number;
  perdas_peca: number;
  peso_retorno: number;
  custo_medio_aluminio: number;
}

// ============================================================================
// CÁLCULOS BÁSICOS
// ============================================================================

/**
 * Calcula o custo hora do funcionário
 */
export function calcularCustoHora(
  funcData: FuncionarioData,
  params: ParametrosSistema
): number {
  const custoPor = (funcData.salario * params.ENCARGOS_TRABALHISTAS + funcData.vale + funcData.cartao_custo) / params.HORAS_UTEIS_MES;
  return parseFloat((custoPor * params.MARKUP_CUSTO).toFixed(2));
}

/**
 * Calcula alumínio útil (peças efetivas)
 * Al. Útil = peso_peça × qtd_peça_placa × caixas
 */
export function calcularAluminioUtil(
  prodData: ProdutoData,
  qtdCaixas: number
): number {
  const peso_peca_kg = prodData.peso_peca / 1000;
  const alUtil = peso_peca_kg * prodData.qtd_pecas_placa * qtdCaixas;
  return parseFloat(alUtil.toFixed(2));
}

/**
 * Calcula alumínio bruto (com margem)
 * Al. Bruto = peso_galho × caixas × MARGEM
 */
export function calcularAluminioBruto(
  prodData: ProdutoData,
  qtdCaixas: number,
  params: ParametrosSistema
): number {
  const peso_galho_kg = prodData.peso_galho / 1000;
  const alBruto = peso_galho_kg * qtdCaixas * params.MARGEM_ALUMINIO;
  return parseFloat(alBruto.toFixed(2));
}

/**
 * Calcula retorno (galhos e canais)
 * Retorno = (peso_galho - peso_util) × caixas × APROVEIT
 */
export function calcularRetorno(
  prodData: ProdutoData,
  qtdCaixas: number,
  params: ParametrosSistema
): number {
  const peso_galho_kg = prodData.peso_galho / 1000;
  const peso_util_kg = (prodData.peso_peca * prodData.qtd_pecas_placa) / 1000;
  const retorno = (peso_galho_kg - peso_util_kg) * qtdCaixas * params.APROVEIT_RETORNO;
  return parseFloat(retorno.toFixed(2));
}

/**
 * Calcula consumo de óleo
 * Consumo = al_bruto / LITROS_POR_KG
 */
export function calcularConsumoOleo(
  alBruto: number,
  params: ParametrosSistema
): number {
  const consumo = alBruto / params.OLEO_POR_KG;
  return parseFloat(consumo.toFixed(2));
}

/**
 * Calcula custo de mão de obra
 * Custo M.O. = custo_hora × tempo_horas
 */
export function calcularCustoMO(
  custoHora: number,
  tempoHoras: number
): number {
  const custo = custoHora * tempoHoras;
  return parseFloat(custo.toFixed(2));
}

/**
 * Calcula custo de alumínio
 * Custo Al. = al_bruto × custo_medio
 */
export function calcularCustoAluminio(
  alBruto: number,
  custoMedioAluminio: number
): number {
  const custo = alBruto * custoMedioAluminio;
  return parseFloat(custo.toFixed(2));
}

/**
 * Calcula custo de óleo
 * Custo Óleo = consumo_oleo × custo_litro
 */
export function calcularCustoOleo(
  consumoOleo: number,
  params: ParametrosSistema
): number {
  const custo = consumoOleo * params.CUSTO_OLEO_LITRO;
  return parseFloat(custo.toFixed(2));
}

/**
 * Calcula custo total de produção
 * Custo Total = Custo M.O. + Custo Alumínio + Custo Óleo
 */
export function calcularCustoTotal(
  custoMO: number,
  custoAluminio: number,
  custoOleo: number
): number {
  const total = custoMO + custoAluminio + custoOleo;
  return parseFloat(total.toFixed(2));
}

/**
 * Calcula custo por peça
 * Custo/Peça = custo_total / peças_úteis
 */
export function calcularCustoPorPeca(
  custoTotal: number,
  prodData: ProdutoData,
  qtdCaixas: number,
  perdas: number
): number {
  const pecasUteis = qtdCaixas * prodData.qtd_pecas_placa - perdas;
  if (pecasUteis <= 0) return 0;
  return parseFloat((custoTotal / pecasUteis).toFixed(2));
}

/**
 * Calcula taxa de perda %
 * Taxa Perda % = (perdas / total_pecas) × 100
 */
export function calcularTaxaPerda(
  perdas: number,
  prodData: ProdutoData,
  qtdCaixas: number
): number {
  const totalPecas = qtdCaixas * prodData.qtd_pecas_placa;
  if (totalPecas <= 0) return 0;
  return parseFloat(((perdas / totalPecas) * 100).toFixed(2));
}

/**
 * Calcula eficiência %
 * Eficiência = (peças_úteis / peças_produzidas) × 100
 */
export function calcularEficiencia(
  prodData: ProdutoData,
  qtdCaixas: number,
  perdas: number
): number {
  const totalPecas = qtdCaixas * prodData.qtd_pecas_placa;
  const pecasUteis = totalPecas - perdas;
  if (totalPecas <= 0) return 0;
  return parseFloat(((pecasUteis / totalPecas) * 100).toFixed(2));
}

/**
 * Calcula caixas por hora
 * Caixas/hora = qtd_caixas / tempo_horas
 */
export function calcularCaixasPorHora(
  qtdCaixas: number,
  tempoHoras: number
): number {
  if (tempoHoras <= 0) return 0;
  return parseFloat((qtdCaixas / tempoHoras).toFixed(2));
}

// ============================================================================
// CÁLCULO COMPLETO
// ============================================================================

/**
 * Função principal que calcula todos os valores de um apontamento
 */
export function calcularApontamentoCompleto(
  prodData: ProdutoData,
  funcData: FuncionarioData,
  apontData: ApontamentoData,
  params: ParametrosSistema
) {
  const custoHora = calcularCustoHora(funcData, params);
  const alUtil = calcularAluminioUtil(prodData, apontData.qtde_caixas);
  const alBruto = calcularAluminioBruto(prodData, apontData.qtde_caixas, params);
  const retorno = calcularRetorno(prodData, apontData.qtde_caixas, params);
  const consumoOleo = calcularConsumoOleo(alBruto, params);
  const custoMO = calcularCustoMO(custoHora, apontData.tempo_horas);
  const custoAluminio = calcularCustoAluminio(alBruto, apontData.custo_medio_aluminio);
  const custoOleo = calcularCustoOleo(consumoOleo, params);
  const custoTotal = calcularCustoTotal(custoMO, custoAluminio, custoOleo);
  const custoPorPeca = calcularCustoPorPeca(custoTotal, prodData, apontData.qtde_caixas, apontData.perdas_peca);
  const taxaPerda = calcularTaxaPerda(apontData.perdas_peca, prodData, apontData.qtde_caixas);
  const eficiencia = calcularEficiencia(prodData, apontData.qtde_caixas, apontData.perdas_peca);
  const caixasPorHora = calcularCaixasPorHora(apontData.qtde_caixas, apontData.tempo_horas);

  return {
    aluminio_util: alUtil,
    aluminio_bruto: alBruto,
    retorno_calculado: retorno,
    consumo_oleo: consumoOleo,
    custo_mo: custoMO,
    custo_aluminio: custoAluminio,
    custo_oleo: custoOleo,
    custo_total: custoTotal,
    custo_por_peca: custoPorPeca,
    taxa_perda: taxaPerda,
    eficiencia: eficiencia,
    caixas_por_hora: caixasPorHora,
  };
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Formata valor monetário para BRL
 */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Formata percentual
 */
export function formatarPercentual(valor: number, casasDecimais: number = 2): string {
  return `${valor.toFixed(casasDecimais)}%`;
}

/**
 * Formata peso em kg
 */
export function formatarPeso(valor: number): string {
  return `${valor.toFixed(2)} kg`;
}

/**
 * Formata volume em litros
 */
export function formatarVolume(valor: number): string {
  return `${valor.toFixed(2)} L`;
}
