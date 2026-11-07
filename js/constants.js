// Constantes e dados estáticos de domínio (status, marcos, templates padrão)
export const STATUS_OPTIONS = [
  { key: 'nao_iniciado', label: 'Não iniciado' },
  { key: 'confeccao', label: 'Em confecção' },
  { key: 'revisao', label: 'Em revisão' },
  { key: 'pendencia', label: 'Pendência - travado' },
  { key: 'concluido', label: 'Concluído' }
];

export const MARCO_DEFS = {
  pwd: { label: 'PWD', statusOptions: [{key:'analise',label:'1. Em análise'},{key:'rfi',label:'2. RFI'},{key:'emitido',label:'3. Emitido'}], doneKey: 'emitido' },
  eta9089: { label: 'ETA 9089', statusOptions: [{key:'analise',label:'1. Em análise'},{key:'certificado',label:'2. Certificado'}], doneKey: 'certificado' },
  i140: { label: 'I-140', statusOptions: [{key:'pendente',label:'1. Pendente'},{key:'protocolado',label:'2. Protocolado'}], doneKey: 'protocolado' },
  status: { label: 'STATUS', statusOptions: [{key:'pendente',label:'Pendente'},{key:'sim',label:'Sim'},{key:'nao',label:'Não'}], doneKey: 'sim', doneKeys: ['sim','nao'] },
  recurso_decisao: {
    label: 'Decisão',
    statusOptions: [
      { key:'analise', label:'1. Em análise' },
      { key:'aprovado', label:'2. Aprovado' },
      { key:'negado', label:'3. Negado' },
      { key:'rfe', label:'4. RFE' },
      { key:'rejeitado', label:'5. Rejeitado' }
    ],
    doneKey: 'aprovado',
    doneKeys: ['aprovado','negado','rfe','rejeitado']
  }
};

/** Tipos de recurso selecionáveis quando uma decisão vem negada/RFE/rejeitada */
export const RECURSO_TIPOS = [
  { key: 'rfe_resposta', label: 'Resposta da RFE' },
  { key: 'npt', label: 'NPT' },
  { key: 'motion', label: 'MOTION' },
  { key: 'appeal', label: 'APPEAL' }
];

/** Status que, ao serem escolhidos numa decisão, liberam a seleção de um recurso */
export const RECURSO_STATUS_GATILHO = ['negado', 'rfe', 'rejeitado'];

/** L3: etapas geradas sempre que um recurso é selecionado (pode se repetir em looping) */
export const RECURSO_STEPS = [
  { titulo: 'Análise da Notice recebida', colecao: 'aos' },
  { titulo: 'Estabelecer estratégia', colecao: 'aos' },
  { titulo: 'Solicitar docs complementares', colecao: 'aos' },
  { titulo: 'Solicitar preenchimento de forms', colecao: 'aos' },
  { titulo: 'Montagem do Package', colecao: 'aos' },
  { titulo: 'Enviar para assinatura da Advogada', colecao: 'aos' },
  { titulo: 'Liberar para a equipe de envio', colecao: 'aos' },
  { titulo: 'Enviar o Tracking ao cliente', colecao: 'aos' }
];
export const RECURSO_MARCO = { titulo: 'O recurso foi aceito?', tipo: 'marco', marcoTipo: 'recurso_decisao', colecao: 'aos' };

export const KANBAN_COLUMNS = [
  { key: 'urgente', label: 'Urgente' },
  { key: 'revisao', label: 'Em revisão' },
  { key: 'liberada', label: 'Liberadas para trabalhar' },
  { key: 'andamento', label: 'Em andamento' }
];

/** Ordem de exibição dos processos na lista lateral da aba Processos (chaves de KANBAN_COLUMNS) */
export const SIDEBAR_STATUS_ORDER = ['urgente', 'revisao', 'andamento', 'liberada'];

export const DEFAULT_TEMPLATE = [
  { titulo: 'Work session' },
  { titulo: 'Envio do Form de coleta de informações' },
  { titulo: 'Montagem do PWD' },
  { titulo: 'Validação do PWD pela empresa' },
  { titulo: 'Protocolar o PWD' },
  { titulo: 'PWD - Resultado (DOL)', tipo: 'marco', marcoTipo: 'pwd' },
  { titulo: 'Solicitar orçamento a Mary' },
  { titulo: 'Instruir ao empregador sobre a divulgação' },
  { titulo: 'Início da etapa de divulgação da vaga' },
  { titulo: 'Instruir o empregador sobre o recrutamento' },
  { titulo: 'Confecção da Notice of Filing' },
  { titulo: 'Recebimento dos docs de recrutamento' },
  { titulo: 'Confecção dos relatórios de recrutamento' },
  { titulo: 'Montar o ETA 9089' },
  { titulo: 'Enviar o ETA 9089 para validação do empregador' },
  { titulo: 'Protocolar o ETA 9089' },
  { titulo: 'ETA 9089 - Certificação (DOL)', tipo: 'marco', marcoTipo: 'eta9089' },
  { titulo: 'Instruir o empregador sobre o I-140' },
  { titulo: 'Liberar o ailaw para I-140 (revisar a cada 15 dias se todos os docs já estão lá — adicionar lembrete)', reminderDays: 15 },
  { titulo: 'Solicitar preenchimento dos forms (10 dias depois verificar se foi concluído; após isso, lembrete de pendência ou cobrança)', reminderDays: 10 },
  { titulo: 'Liberar docs para assinatura do empregador' },
  { titulo: 'Montar package (7 dias)' },
  { titulo: 'Em assinatura da advogada (dura 7 dias; após isso, lembrete de pendência ou cobrança)' },
  { titulo: 'Liberar para a equipe de envio' },
  { titulo: 'Protocolar o I-140', tipo: 'marco', marcoTipo: 'i140' },
  { titulo: 'Liberar tracking number ao empregador e encaminhar ao cliente support' },
  { titulo: 'O I-140 foi aprovado?', tipo: 'marco', marcoTipo: 'status' }
];

export const AOS_TEMPLATE = [
  { titulo: 'Informar ao cliente', colecao: 'aos' },
  { titulo: 'Liberar o ailaw de AOS', colecao: 'aos', reminderDays: 15, reminderRequiresConfeccao: true },
  { titulo: 'Confecção dos forms', colecao: 'aos' },
  { titulo: 'Solicitar assinatura dos forms', colecao: 'aos' },
  { titulo: 'Montagem do Package', colecao: 'aos' },
  { titulo: 'Assinatura da advogada', colecao: 'aos' },
  { titulo: 'Processo de envio', colecao: 'aos' },
  { titulo: 'Protocolo realizado', colecao: 'aos' },
  { titulo: 'Compartilhar o tracking com o cliente', colecao: 'aos' },
  { titulo: 'O AOS foi aprovado?', tipo: 'marco', marcoTipo: 'recurso_decisao', colecao: 'aos' }
];

/** Tipos de visto agrupados (alimenta o select do modal "Novo processo") */
export const VISA_GROUPS = [
  { label: 'TRABALHISTAS', options: [
    { key: 'eb1', label: 'EB-1' },
    { key: 'eb2nw', label: 'EB-2 NW' },
    { key: 'eb3', label: 'EB-3' },
    { key: 'l1', label: 'L-1' },
    { key: 'o1', label: 'O-1' }
  ] },
  { label: 'FAMILIARES', options: [
    { key: 'casamento', label: 'Casamento' },
    { key: 'parentesco', label: 'Parentesco' }
  ] },
  { label: 'HUMANITÁRIOS', options: [
    { key: 'vawa', label: 'Vawa' },
    { key: 'asilo', label: 'Asilo' }
  ] }
];

/** Tipo usado por processos criados antes da existência do campo tipo_visto */
export const DEFAULT_VISA_TIPO = 'eb3';

/** Tipos que já têm fluxo implementado. Os demais exibem "Fluxo a ser implementado". */
export const VISA_TIPOS_COM_FLUXO = ['eb3'];

export function visaLabel(key){
  for(const g of VISA_GROUPS){
    const o = g.options.find(x => x.key === key);
    if(o) return o.label;
  }
  return key || '';
}
export function visaTemFluxo(key){ return VISA_TIPOS_COM_FLUXO.includes(key); }

/** Quantos processos a lista lateral mostra antes do botão "VER MAIS" */
export const CASE_LIST_LIMIT = 10;

/** Ícone e tom de cor (classe .tone-*) de cada status de etapa normal */
export const STATUS_ICONS = { nao_iniciado: '○', confeccao: '◐', revisao: '◑', pendencia: '!', concluido: '✓' };
export const STATUS_TONES = { nao_iniciado: 'neutral', confeccao: 'warn', revisao: 'purple', pendencia: 'bad', concluido: 'ok' };
/** Tom de cor de cada status de marco */
export const MARCO_TONES = {
  pendente: 'warn', sim: 'ok', nao: 'bad',
  analise: 'neutral', rfi: 'purple', emitido: 'ok', certificado: 'ok', protocolado: 'ok',
  aprovado: 'ok', negado: 'bad', rfe: 'warn', rejeitado: 'bad'
};

export const WEEKDAYS = [
  {idx:1, label:'Segunda-feira'}, {idx:2, label:'Terça-feira'}, {idx:3, label:'Quarta-feira'},
  {idx:4, label:'Quinta-feira'}, {idx:5, label:'Sexta-feira'}, {idx:6, label:'Sábado'}, {idx:0, label:'Domingo'}
];
