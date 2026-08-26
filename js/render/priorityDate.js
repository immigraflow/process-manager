import { state, findI140Marco } from '../state.js';
import { escapeHtml, fmtDate } from '../utils.js';
import { renderNvcAosBlock } from './processos.js';

export function renderPriorityDateView(){
  const withI140 = state.data.cases.map(c => ({ c, i140: findI140Marco(c) })).filter(x => x.i140 && x.i140.status === 'protocolado' && x.i140.marco.dataPrioridade);

  let body = '';
  if(!state.priorityDateQuery){
    body = `<div class="empty-state"><div class="big">Digite a data do Visa Bulletin</div><p>Informe a data de corte para separar os casos entre "Aguardando" e "Liberados".</p></div>`;
  } else {
    const aguardando = withI140.filter(x => x.i140.marco.dataPrioridade > state.priorityDateQuery);
    const liberados = withI140.filter(x => x.i140.marco.dataPrioridade <= state.priorityDateQuery);
    body = `
      <div class="section-label">Liberados (${liberados.length})</div>
      ${liberados.length===0 ? '<div class="kanban-empty">Nenhum caso liberado com essa data.</div>' : liberados.map(x => `
        <div class="form-card" style="margin-bottom:14px;">
          <div style="font-weight:600; font-family:var(--font-display); font-size:16px;">${escapeHtml(x.c.nome)}</div>
          <div class="etapa-dates" style="margin:4px 0 10px;"><span>Data de prioridade: ${fmtDate(x.i140.marco.dataPrioridade)}</span></div>
          ${renderNvcAosBlock(x.c)}
        </div>
      `).join('')}
      <div class="section-label" style="margin-top:24px;">Aguardando (${aguardando.length})</div>
      ${aguardando.length===0 ? '<div class="kanban-empty">Nenhum caso aguardando.</div>' : aguardando.map(x => `
        <div class="lembrete-row"><div><div class="lr-nome">${escapeHtml(x.c.nome)}</div></div><span class="stamp neutro">${fmtDate(x.i140.marco.dataPrioridade)}</span></div>
      `).join('')}
    `;
  }
  return `<div class="form-row" style="max-width:260px; margin-bottom:22px;"><div class="form-field"><label>Data do Visa Bulletin</label><input type="date" id="pd-query" value="${state.priorityDateQuery}"></div></div>${body}`;
}
