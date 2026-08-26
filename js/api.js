// Toda a comunicação com o Supabase (CRUD). Nenhuma outra parte do app
// deve chamar `sb.from(...)` diretamente — sempre passar por aqui.
import { sb } from './config.js';
import { DEFAULT_TEMPLATE } from './constants.js';
import { MARCO_DEFS } from './constants.js';
import { isEtapaDone } from './domain.js';
import { etapaRowToLocal } from './mappers.js';

export async function dbGetOrgId(userId){
  const { data: rows, error } = await sb.from('organization_members').select('organization_id, role').eq('user_id', userId);
  if(error) throw error;
  if(!rows || !rows.length) throw new Error('Sua conta não está associada a nenhum workspace. Peça para o admin te adicionar.');
  return rows[0].organization_id;
}

export async function dbSeedDefaultTemplateIfEmpty(orgId){
  const { data: rows, error } = await sb.from('templates').select('*').eq('organization_id', orgId).order('ordem', { ascending: true });
  if(error) throw error;
  if(rows.length > 0) return rows;
  const payload = DEFAULT_TEMPLATE.map((t, i) => ({
    organization_id: orgId, titulo: t.titulo, tipo: t.tipo || 'normal',
    marco_tipo: t.marcoTipo || null, reminder_days: t.reminderDays || null, ordem: i
  }));
  const { data: inserted, error: insErr } = await sb.from('templates').insert(payload).select();
  if(insErr) throw insErr;
  return inserted.sort((a,b) => a.ordem - b.ordem);
}

export async function dbFetchAll(orgId){
  const { data: caseRows, error: caseErr } = await sb.from('cases').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
  if(caseErr) throw caseErr;

  let etapaRows = [];
  if(caseRows.length){
    const ids = caseRows.map(c => c.id);
    const { data: eRows, error: eErr } = await sb.from('etapas').select('*').in('case_id', ids).order('ordem', { ascending: true });
    if(eErr) throw eErr;
    etapaRows = eRows;
  }

  const templateRows = await dbSeedDefaultTemplateIfEmpty(orgId);

  const { data: eventoRows, error: evErr } = await sb.from('eventos').select('*').eq('organization_id', orgId).order('data', { ascending: false });
  if(evErr) throw evErr;

  const cases = caseRows.map(c => ({
    id: c.id, nome: c.nome, numero: c.numero || '', cliente: c.cliente || '',
    nvcAosChoice: c.nvc_aos_choice,
    etapas: etapaRows.filter(e => e.case_id === c.id).map(etapaRowToLocal)
  }));

  const template = templateRows.map(t => ({
    id: t.id, titulo: t.titulo, tipo: t.tipo, marcoTipo: t.marco_tipo, reminderDays: t.reminder_days, _ordem: t.ordem
  }));

  const eventos = eventoRows.map(ev => ({ id: ev.id, tipo: ev.tipo, data: ev.data, caso: ev.caso || '' }));

  return { cases, template, eventos };
}

export async function dbInsertCase(orgId, nome, numero, cliente){
  const { data: row, error } = await sb.from('cases').insert({ organization_id: orgId, nome, numero: numero || null, cliente: cliente || null }).select().single();
  if(error) throw error;
  return row;
}
export async function dbUpdateCase(caseId, fields){ const { error } = await sb.from('cases').update(fields).eq('id', caseId); if(error) throw error; }
export async function dbDeleteCase(caseId){ const { error } = await sb.from('cases').delete().eq('id', caseId); if(error) throw error; }

export async function dbInsertEtapa(payload){
  const { data: row, error } = await sb.from('etapas').insert(payload).select().single();
  if(error) throw error;
  return row;
}
/** Insere várias etapas de uma vez (1 requisição em vez de N) */
export async function dbInsertEtapasBulk(payloads){
  if(!payloads.length) return [];
  const { data: rows, error } = await sb.from('etapas').insert(payloads).select();
  if(error) throw error;
  return rows;
}
export async function dbUpdateEtapa(etapaId, fields){ const { error } = await sb.from('etapas').update(fields).eq('id', etapaId); if(error) throw error; }
export async function dbDeleteEtapa(etapaId){ const { error } = await sb.from('etapas').delete().eq('id', etapaId); if(error) throw error; }

export async function dbInsertTemplateItem(orgId, titulo, ordem){
  const { data: row, error } = await sb.from('templates').insert({ organization_id: orgId, titulo, tipo: 'normal', marco_tipo: null, reminder_days: null, ordem }).select().single();
  if(error) throw error;
  return row;
}
export async function dbUpdateTemplateOrdem(id, ordem){ const { error } = await sb.from('templates').update({ ordem }).eq('id', id); if(error) throw error; }
export async function dbDeleteTemplateItem(id){ const { error } = await sb.from('templates').delete().eq('id', id); if(error) throw error; }

export async function dbInsertEvento(orgId, tipo, dataVal, caso){
  const { data: row, error } = await sb.from('eventos').insert({ organization_id: orgId, tipo, data: dataVal, caso: caso || null }).select().single();
  if(error) throw error;
  return row;
}
export async function dbDeleteEvento(id){ const { error } = await sb.from('eventos').delete().eq('id', id); if(error) throw error; }

/** Completa (no banco + no objeto local) todas as etapas anteriores a etapaId */
export async function completeUpToDb(c, etapaId){
  const idx = c.etapas.findIndex(x => x.id === etapaId);
  if(idx < 0) return;
  for(let i = 0; i < idx; i++){
    const e = c.etapas[i];
    if(!isEtapaDone(e)){
      const newStatus = e.tipo === 'marco' ? MARCO_DEFS[e.marcoTipo].doneKey : 'concluido';
      await dbUpdateEtapa(e.id, { status: newStatus });
      e.status = newStatus;
    }
  }
}
