// Estado global da aplicação (em memória) e helpers de leitura
export const state = {
  data: { cases: [], template: [], eventos: [], documentosErro: null },
  currentUser: null,
  orgId: null,
  authError: null,
  authInfo: null,
  authLoading: false,
  authView: 'login',
  showProfileMenu: false,
  showChangePasswordForm: false,
  changePasswordError: null,
  confirmDialog: null, // { title, message, onConfirm, busyLabel }

  selectedCaseId: null,
  showNewCaseForm: false,
  newCaseTipo: '', // tipo de visto escolhido no modal "Novo processo"
  newCaseDraft: null, // { nome, numero, cliente } preservado quando o select re-renderiza o modal
  editingCaseId: null,
  showEtapaFormFor: null,
  editingEtapaId: null,
  showTemplateManager: false,
  currentView: 'inicio',
  casesExpanded: false, // lista lateral de processos: false = só os 10 mais importantes ("VER MAIS")
  fasesAbertas: {}, // { 'caseId:faseKey': true|false } — sobrescreve a abertura padrão (fase da etapa atual)
  expandedEtapaId: null, // etapa (não atual) aberta na linha do tempo
  docExpandedId: null, // aba Documentos: processo com o painel de ações aberto
  docModal: null, // aba Documentos: { id, tipo: 'enviados' | 'lembrete' | 'trilha' } — modal aberto para um processo
  docSearchQuery: '',
  docListExpanded: false, // aba Documentos: false = só os 10 primeiros ("VER MAIS")
  docStatusFilter: 'todos', // 'todos' | 'pendente' | 'enviado'
  inicioPeriodo: '12', // período dos gráficos mensais da aba Início: '6' | '12' | 'ano'
  resultMonth: new Date().toISOString().slice(0,7),
  priorityDateQuery: '',
  storageReady: false,
  loadError: null,
  busy: false,
  busyLabel: null,

  caseSearchQuery: '',
  kanbanSearchQuery: '',
  kanbanStatusFilter: 'todos',
  resultadosFilterTipo: 'todos',
  resultadosFilterData: '',
  resultadosFilterCaso: ''
};

export function getCase(id){ return state.data.cases.find(c => c.id === id); }
export function findI140Marco(c){ return c.etapas.find(e => e.tipo === 'marco' && e.marcoTipo === 'i140'); }
export function findStatusMarco(c){ return c.etapas.find(e => e.tipo === 'marco' && e.marcoTipo === 'status'); }
