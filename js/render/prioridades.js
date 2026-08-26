import { state } from '../state.js';
import { caseFullyDone, nearestDeadline } from '../domain.js';
import { escapeHtml, fmtDate, daysUntil } from '../utils.js';

export function renderPrioridadesView(){
  const ranked = state.data.cases.filter(c => !caseFullyDone(c))
    .map(c => ({ c, nearest: nearestDeadline(c) }))
    .filter(x => x.nearest)
    .sort((a,b) => a.nearest.date.localeCompare(b.nearest.date))
    .slice(0, 10);
  const semPrazo = state.data.cases.filter(c => !caseFullyDone(c) && !nearestDeadline(c));

  if(ranked.length === 0){
    return `<div class="empty-state"><div class="big">Nenhum prazo cadastrado</div><p>Assim que você definir prazos nas etapas ou marcos dos seus processos, a ordem de prioridade aparece aqui.</p></div>`;
  }
  return `
    <div class="priority-list">
      ${ranked.map((r,i) => {
        const diff = daysUntil(r.nearest.date);
        const cls = diff < 0 ? 'urgente' : diff <= 7 ? 'proximo' : '';
        const diasTxt = diff < 0 ? `vencido há ${Math.abs(diff)}d` : diff === 0 ? 'vence hoje' : `em ${diff}d`;
        return `
          <div class="priority-row ${cls}">
            <div class="priority-rank">${i+1}</div>
            <div class="priority-body"><div class="nome">${escapeHtml(r.c.nome)}</div><div class="motivo">${escapeHtml(r.nearest.label)} · ${fmtDate(r.nearest.date)} (${diasTxt})</div></div>
          </div>
        `;
      }).join('')}
    </div>
    ${semPrazo.length ? `<div class="priority-noprazo">${semPrazo.length} processo${semPrazo.length===1?'':'s'} sem prazo definido: ${semPrazo.map(c=>escapeHtml(c.nome)).join(', ')}</div>` : ''}
  `;
}
