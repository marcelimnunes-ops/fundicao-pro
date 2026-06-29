// Módulo singleton — o estado da importação sobrevive à navegação
// porque fica fora do ciclo de vida dos componentes React

export type LogLevel = 'info' | 'ok' | 'skip' | 'warn' | 'error' | 'section';

export interface LogEntry { nivel: LogLevel; msg: string }

export interface ProgressoImportacao {
  ativo: boolean;         // true = importação em andamento ou concluída mas não descartada
  total: number;
  atual: number;
  fase: string;
  log: LogEntry[];
  concluido: boolean;
  inseridos: number;
  pulados: number;
  erros: number;
  cancelado: boolean;
}

const ESTADO_INICIAL: ProgressoImportacao = {
  ativo: false,
  total: 0, atual: 0, fase: '',
  log: [], concluido: false,
  inseridos: 0, pulados: 0, erros: 0,
  cancelado: false,
};

let estado: ProgressoImportacao = { ...ESTADO_INICIAL };
const listeners = new Set<() => void>();

export const importacaoState = {
  get: () => estado,

  iniciar(total: number) {
    estado = { ...ESTADO_INICIAL, ativo: true, total, fase: 'Iniciando…' };
    notificar();
  },

  set(upd: Partial<ProgressoImportacao>) {
    estado = { ...estado, ...upd };
    notificar();
  },

  log(nivel: LogLevel, msg: string) {
    estado = { ...estado, log: [...estado.log, { nivel, msg }] };
    notificar();
  },

  cancelar() {
    estado = { ...estado, cancelado: true };
    notificar();
  },

  descartar() {
    estado = { ...ESTADO_INICIAL };
    notificar();
  },

  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

function notificar() {
  listeners.forEach((fn) => fn());
}
