// Regras de domínio: status de etapas/marcos, prazos, urgência, categoria kanban
import { MARCO_DEFS } from './constants.js';
import { daysUntil } from './utils.js';

export function newMarcoFields(tipo){
  if(tipo === 'pwd') return { houveRfi:false, rfiData:'', rfiPrazo:'', dataEmissao:'', validade:'' };
  if(tipo === 'eta9089') return { dataEmissao:'', validade:'' };
  if(tipo === 'i140') return { dataProtocolo:'', dataPrioridade:'', validade:'', prazoAlvo:'' };
  return {};
}

export function isEtapaDone(e){
  if(e.tipo === 'marco') return e.status === MARCO_DEFS[e.marcoTipo].doneKey;
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

export function deadlineLabel(etapa){
  if(!etapa.prazo) return null;
  const diff = daysUntil(etapa.prazo);
  if(diff < 0) return `Vencido há ${Math.abs(diff)}d`;
  if(diff === 0) return 'Vence hoje';
  return `${diff}d restantes`;
}

export function urgencyOf(e){
  if(e.tipo === 'marco'){
    const def = MARCO_DEFS[e.marcoTipo];
    if(e.status === def.doneKey) return 'done';
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
    if(e.status === def.doneKey) return 'liberada';
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

export function nearestDeadline(c){
  let candidates = [];
  c.etapas.forEach(e => {
    if(e.tipo === 'marco'){
      const def = MARCO_DEFS[e.marcoTipo];
      const done = e.status === def.doneKey;
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
