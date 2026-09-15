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
  status: { label: 'STATUS', statusOptions: [{key:'pendente',label:'Pendente'},{key:'sim',label:'Sim'},{key:'nao',label:'Não'}], doneKey: 'sim', doneKeys: ['sim','nao'] }
};

export const KANBAN_COLUMNS = [
  { key: 'urgente', label: 'Urgente' },
  { key: 'revisao', label: 'Em revisão' },
  { key: 'liberada', label: 'Liberadas para trabalhar' },
  { key: 'andamento', label: 'Em andamento' }
];

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
  { titulo: 'Protocolo realizado', colecao: 'aos' }
];

export const WEEKDAYS = [
  {idx:1, label:'Segunda-feira'}, {idx:2, label:'Terça-feira'}, {idx:3, label:'Quarta-feira'},
  {idx:4, label:'Quinta-feira'}, {idx:5, label:'Sexta-feira'}, {idx:6, label:'Sábado'}, {idx:0, label:'Domingo'}
];
