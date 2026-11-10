// Toda a comunicação com o Supabase (CRUD). Nenhuma outra parte do app
// deve chamar `sb.from(...)` diretamente — sempre passar por aqui.
import { sb } from './config.js';
import { DEFAULT_TEMPLATE, DEFAULT_VISA_TIPO, DOC_BUCKET } from './constants.js';
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

  // Documentos por processo (IMF-007): se a migração ainda não foi rodada, o resto do app segue funcionando
  let arquivosPorCaso = {}, documentosErro = null;
  if(caseRows.length && !('doc_status' in caseRows[0])){
    documentosErro = 'colunas doc_status e doc_prazo não encontradas em cases';
  } else {
    try{ arquivosPorCaso = await dbFetchDocFiles(orgId); }
    catch(err){ console.error(err); documentosErro = err && err.message ? err.message : 'erro desconhecido'; }
  }

  const cases = caseRows.map(c => ({
    id: c.id, nome: c.nome, numero: c.numero || '', cliente: c.cliente || '',
    nvcAosChoice: c.nvc_aos_choice,
    tipoVisto: c.tipo_visto || DEFAULT_VISA_TIPO,
    createdAt: c.created_at || '',
    docStatus: c.doc_status || 'pendente',
    docPrazo: c.doc_prazo || null,
    docArquivos: arquivosPorCaso[c.id] || [],
    etapas: etapaRows.filter(e => e.case_id === c.id).map(etapaRowToLocal)
  }));

  const template = templateRows.map(t => ({
    id: t.id, titulo: t.titulo, tipo: t.tipo, marcoTipo: t.marco_tipo, reminderDays: t.reminder_days, _ordem: t.ordem
  }));

  const eventos = eventoRows.map(ev => ({ id: ev.id, tipo: ev.tipo, data: ev.data, caso: ev.caso || '' }));

  return { cases, template, eventos, documentosErro };
}

// ---------- Aba Documentos: um item por processo (status, prazo e arquivos no Storage) ----------
const docFileRowToLocal = f => ({ id: f.id, nome: f.nome, path: f.path, tamanho: f.tamanho, tipo: f.tipo || '', createdAt: f.created_at || '' });

/** Arquivos enviados de todos os processos da organização, agrupados por case_id */
export async function dbFetchDocFiles(orgId){
  const { data: rows, error } = await sb.from('case_document_files').select('*').eq('organization_id', orgId).order('created_at', { ascending: true });
  if(error) throw error;
  const porCaso = {};
  rows.forEach(r => { (porCaso[r.case_id] = porCaso[r.case_id] || []).push(docFileRowToLocal(r)); });
  return porCaso;
}

export async function dbUpdateCaseDocStatus(caseId, status){
  const { error } = await sb.from('cases').update({ doc_status: status }).eq('id', caseId);
  if(error) throw error;
}

function nomeSeguro(nome){
  return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_');
}

/** Envia os arquivos para o Storage ({orgId}/{caseId}/...) e registra cada um. Se algo falhar, desfaz o que subiu. */
export async function dbUploadDocFiles(orgId, caseId, files){
  const enviados = [];
  try{
    for(let i = 0; i < files.length; i++){
      const f = files[i];
      const path = `${orgId}/${caseId}/${Date.now()}-${i}-${nomeSeguro(f.name)}`;
      const { error } = await sb.storage.from(DOC_BUCKET).upload(path, f, { contentType: f.type || undefined, upsert: false });
      if(error) throw error;
      enviados.push({ path, nome: f.name, tamanho: f.size, tipo: f.type || null });
    }
    const { data: rows, error: insErr } = await sb.from('case_document_files')
      .insert(enviados.map(a => ({ case_id: caseId, organization_id: orgId, nome: a.nome, path: a.path, tamanho: a.tamanho, tipo: a.tipo })))
      .select();
    if(insErr) throw insErr;
    return rows.map(docFileRowToLocal);
  }catch(err){
    if(enviados.length) await sb.storage.from(DOC_BUCKET).remove(enviados.map(a => a.path));
    throw err;
  }
}

/** Link temporário (bucket privado) para abrir um documento */
export async function dbSignedDocUrl(path){
  const { data, error } = await sb.storage.from(DOC_BUCKET).createSignedUrl(path, 300);
  if(error) throw error;
  return data.signedUrl;
}

export async function dbInsertCase(orgId, nome, numero, cliente, tipoVisto){
  const { data: row, error } = await sb.from('cases').insert({ organization_id: orgId, nome, numero: numero || null, cliente: cliente || null, tipo_visto: tipoVisto }).select().single();
  if(error) throw error;
  return row;
}
export async function dbUpdateCase(caseId, fields){ const { error } = await sb.from('cases').update(fields).eq('id', caseId); if(error) throw error; }
/** Exclui o processo (etapas e registros de arquivos saem em cascata) e os arquivos dele no Storage */
export async function dbDeleteCase(caseId, paths = []){
  if(paths.length){
    const { error: rmErr } = await sb.storage.from(DOC_BUCKET).remove(paths);
    if(rmErr) throw rmErr;
  }
  const { error } = await sb.from('cases').delete().eq('id', caseId);
  if(error) throw error;
}

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
