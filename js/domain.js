// Regras de domínio: status de etapas/marcos, prazos, urgência, categoria kanban
import { MARCO_DEFS } from './constants.js';
import { daysUntil } from './utils.js';

export function newMarcoFields(tipo){
  if(tipo === 'pwd') return { houveRfi:false, rfiData:'', rfiPrazo:'', dataEmissao:'', validade:'' };
  if(tipo === 'eta9089') return { dataEmissao:'', validade:'' };
  if(tipo === 'i140') return { dataProtocolo:'', dataPrioridade:'', validade:'', prazoAlvo:'' };
  if(tipo === 'recurso_decisao') return { recursoTipo:'', recursoAplicadoPara:'' };
  return {};
}

export function isEtapaDone(e){
  if(e.tipo === 'marco'){
    const def = MARCO_DEFS[e.marcoTipo];
    const doneKeys = def.doneKeys || [def.doneKey];
    return doneKeys.includes(e.status);
  }
  return e.status === 'concluido';
}

export function caseFullyDone(c){ return c.etapas.length > 0 && c.etapas.every(isEtapaDone); }

export function deadlineStatus(etapa){
  if(isEtapaDone(etapa)) return 'done';
  if(!etapa.prazo) return 'neutro';
  const diff = daysUntil(etapa.prazo);
  if(diff < 0) return 'vencido';
  if(diff <= 7) return 'proximo';
  return 'ok';
}

function labelPrazo(iso){
  const diff = daysUntil(iso);
  if(diff < 0) return `Vencido há ${Math.abs(diff)}d`;
  if(diff === 0) return 'Vence hoje';
  return `${diff}d restantes`;
}

export function deadlineLabel(etapa){
  if(!etapa.prazo) return null;
  return labelPrazo(etapa.prazo);
}

/** Selo de prazo de uma etapa ou marco pendente: { status: 'vencido'|'proximo'|'ok', label } ou null */
export function prazoInfo(e){
  if(isEtapaDone(e)) return null;
  if(e.tipo === 'marco'){
    const alvo = e.marco.prazoAlvo || (e.marcoTipo === 'pwd' && e.marco.houveRfi ? e.marco.rfiPrazo : null);
    if(!alvo) return null;
    return { status: urgencyOf(e), label: labelPrazo(alvo) };
  }
  if(!e.prazo) return null;
  return { status: deadlineStatus(e), label: labelPrazo(e.prazo) };
}

export function urgencyOf(e){
  if(e.tipo === 'marco'){
    const def = MARCO_DEFS[e.marcoTipo];
    const doneKeys = def.doneKeys || [def.doneKey];
    if(doneKeys.includes(e.status)) return 'done';
    const alvo = e.marco.prazoAlvo || (e.marcoTipo === 'pwd' && e.marco.houveRfi ? e.marco.rfiPrazo : null);
    if(!alvo) return 'neutro';
    const diff = daysUntil(alvo);
    if(diff < 0) return 'vencido';
    if(diff <= 7) return 'proximo';
    return 'ok';
  }
  return deadlineStatus(e);
}

export function caseOverallStatus(c){
  if(!c.etapas.length) return 'neutro';
  const pendentes = c.etapas.filter(e => !isEtapaDone(e));
  if(!pendentes.length) return 'ok';
  const statuses = pendentes.map(urgencyOf);
  if(statuses.includes('vencido')) return 'vencido';
  if(statuses.includes('proximo')) return 'proximo';
  return 'ok';
}

export function computeCategory(e){
  if(e.tipo === 'marco'){
    const def = MARCO_DEFS[e.marcoTipo];
    const doneKeys = def.doneKeys || [def.doneKey];
    if(doneKeys.includes(e.status)) return 'liberada';
    if(e.marcoTipo === 'pwd' && e.marco.houveRfi && e.status === 'rfi' && e.marco.rfiPrazo && daysUntil(e.marco.rfiPrazo) < 0) return 'urgente';
    if(e.marco.prazoAlvo && daysUntil(e.marco.prazoAlvo) < 0) return 'urgente';
    if(e.marcoTipo === 'pwd' && e.status === 'rfi') return 'revisao';
    return 'andamento';
  }
  if(e.status === 'concluido') return null;
  if(e.prazo && daysUntil(e.prazo) < 0) return 'urgente';
  if(e.status === 'pendencia') return 'urgente';
  if(e.status === 'revisao') return 'revisao';
  if(e.status === 'confeccao') return 'andamento';
  return 'liberada';
}

export function currentEtapa(c){ return c.etapas.find(e => !isEtapaDone(e)) || null; }

/**
 * Fases do fluxo principal (colecao 'padrao'), delimitadas pela posição dos marcos PWD e ETA 9089:
 * PWD (até o marco PWD), Recrutamento e ETA 9089 (até o marco ETA) e I-140 (o resto).
 * Mesma regra de dashboard.faseAtual. Sem nenhum desses marcos (template customizado), vira uma fase única.
 */
export function agruparPorFase(etapasPadrao){
  const iPwd = etapasPadrao.findIndex(e => e.tipo === 'marco' && e.marcoTipo === 'pwd');
  const iEta = etapasPadrao.findIndex(e => e.tipo === 'marco' && e.marcoTipo === 'eta9089');
  if(iPwd < 0 && iEta < 0) return etapasPadrao.length ? [{ key: 'etapas', nome: 'Etapas', etapas: etapasPadrao }] : [];
  const fases = [
    { key: 'pwd', nome: 'PWD', etapas: [] },
    { key: 'recrutamento', nome: 'Recrutamento e ETA 9089', etapas: [] },
    { key: 'i140', nome: 'I-140', etapas: [] }
  ];
  etapasPadrao.forEach((e, i) => {
    const idx = (iPwd >= 0 && i <= iPwd) ? 0 : (iEta >= 0 && i <= iEta) ? 1 : 2;
    fases[idx].etapas.push(e);
  });
  return fases.filter(f => f.etapas.length);
}

/** Fase { key, nome } a que a etapa pertence (etapas de AOS e recursos ficam em 'aos') */
export function faseDaEtapa(c, e){
  if(!e) return null;
  if(e.colecao === 'aos') return { key: 'aos', nome: 'AOS e recursos' };
  const fase = agruparPorFase(c.etapas.filter(x => x.colecao !== 'aos')).find(f => f.etapas.includes(e));
  return fase ? { key: fase.key, nome: fase.nome } : null;
}

/**
 * Ordena os processos por importância decrescente (mesmo critério da aba Prioridades):
 * 1º em andamento com prazo, do mais próximo/vencido ao mais distante; 2º em andamento sem prazo;
 * 3º concluídos (ou finalizados via NVC). Empates mantêm a ordem original.
 */
export function rankCasesByImportance(cases){
  const info = cases.map((c, i) => {
    const encerrado = caseFullyDone(c) || c.nvcAosChoice === 'nvc';
    const nearest = encerrado ? null : nearestDeadline(c);
    return { c, i, grupo: encerrado ? 2 : (nearest ? 0 : 1), date: nearest ? nearest.date : '' };
  });
  info.sort((a, b) => a.grupo - b.grupo || a.date.localeCompare(b.date) || a.i - b.i);
  return info.map(x => x.c);
}

export function nearestDeadline(c){
  let candidates = [];
  c.etapas.forEach(e => {
    if(e.tipo === 'marco'){
      const def = MARCO_DEFS[e.marcoTipo];
      const doneKeys = def.doneKeys || [def.doneKey];
      const done = doneKeys.includes(e.status);
      if(!done){
        if(e.marcoTipo === 'pwd' && e.marco.houveRfi && e.marco.rfiPrazo) candidates.push({ date: e.marco.rfiPrazo, label: `Responder RFI · ${def.label}` });
        if(e.marco.prazoAlvo) candidates.push({ date: e.marco.prazoAlvo, label: `Prazo para concluir marco ${def.label}` });
      } else if(e.marco.validade){
        const diff = daysUntil(e.marco.validade);
        if(diff <= 122) candidates.push({ date: e.marco.validade, label: `Validade do marco ${def.label} (planeje-se — janela de 4 meses)` });
      }
    } else if(!isEtapaDone(e) && e.prazo){
      candidates.push({ date: e.prazo, label: e.titulo });
    }
  });
  if(!candidates.length) return null;
  candidates.sort((a,b) => a.date.localeCompare(b.date));
  return candidates[0];
}

export function nextOccurrence(e){
  const start = e.reminderStart || e.data || new Date().toISOString().slice(0,10);
  const today = new Date().toISOString().slice(0,10);
  const since = Math.round((new Date(today+'T00:00:00') - new Date(start+'T00:00:00'))/86400000);
  if(since < 0) return start;
  const cycle = since % e.reminderDays;
  const addDays = cycle === 0 ? 0 : (e.reminderDays - cycle);
  const d = new Date(today+'T00:00:00');
  d.setDate(d.getDate() + addDays);
  return d.toISOString().slice(0,10);
}

export function computeResultados(data, month){
  let i140 = 0, eta9089 = 0, pwd = 0;
  data.cases.forEach(c => {
    c.etapas.forEach(e => {
      if(e.tipo === 'normal'){
        const low = (e.titulo||'').toLowerCase();
        if(low === 'protocolar o eta 9089' && e.status === 'concluido' && e.data && e.data.slice(0,7) === month) eta9089++;
        if(low === 'protocolar o pwd' && e.status === 'concluido' && e.data && e.data.slice(0,7) === month) pwd++;
      }
      if(e.tipo === 'marco' && e.marcoTipo === 'i140' && e.status === 'protocolado' && e.marco.dataProtocolo && e.marco.dataProtocolo.slice(0,7) === month) i140++;
    });
  });
  const eventos = (data.eventos||[]).filter(ev => ev.data && ev.data.slice(0,7) === month);
  const bonus = { RFE:0, NPT:0, MOTION:0, Appeal:0 };
  eventos.forEach(ev => { if(bonus[ev.tipo] !== undefined) bonus[ev.tipo]++; });
  return { i140, eta9089, pwd, bonus, eventos };
}
