// Conversão entre linhas do Supabase (snake_case) e o modelo local (camelCase)
import { MARCO_DEFS } from './constants.js';
import { newMarcoFields } from './domain.js';
import { todayISO } from './utils.js';

export function etapaRowToLocal(row){
  const isMarco = row.tipo === 'marco';
  return {
    id: row.id,
    titulo: row.titulo,
    data: row.data || '',
    prazo: row.prazo || '',
    obs: row.obs || '',
    status: row.status,
    tipo: row.tipo,
    marcoTipo: row.marco_tipo,
    reminderDays: row.reminder_days,
    reminderRequiresConfeccao: row.reminder_requires_confeccao,
    reminderStart: row.reminder_start || row.data || todayISO(),
    colecao: row.colecao || 'padrao',
    marco: isMarco ? (row.marco || newMarcoFields(row.marco_tipo)) : undefined,
    _ordem: row.ordem
  };
}

export function etapaPayloadFromTemplateItem(t, ordem){
  const isMarco = t.tipo === 'marco';
  return {
    titulo: t.titulo,
    tipo: isMarco ? 'marco' : 'normal',
    marco_tipo: isMarco ? t.marcoTipo : null,
    status: isMarco ? MARCO_DEFS[t.marcoTipo].statusOptions[0].key : 'nao_iniciado',
    data: null, prazo: null, obs: '',
    colecao: t.colecao || 'padrao',
    reminder_days: t.reminderDays || null,
    reminder_requires_confeccao: !!t.reminderRequiresConfeccao,
    reminder_start: todayISO(),
    marco: isMarco ? newMarcoFields(t.marcoTipo) : {},
    ordem
  };
}
