import { state } from '../state.js';
import { computeResultados } from '../domain.js';
import { escapeHtml, fmtDate, todayISO } from '../utils.js';

function filteredEventos(eventos){
  return eventos.filter(ev => {
    if(state.resultadosFilterTipo !== 'todos' && ev.tipo !== state.resultadosFilterTipo) return false;
    if(state.resultadosFilterData && ev.data !== state.resultadosFilterData) return false;
    if(state.resultadosFilterCaso.trim() && !(ev.caso||'').toLowerCase().includes(state.resultadosFilterCaso.trim().toLowerCase())) return false;
    return true;
  });
}

export function renderResultadosView(){
  const r = computeResultados(state.data, state.resultMonth);
  const eventosFiltrados = filteredEventos(r.eventos);

  return `
    <div class="form-row" style="max-width:220px; margin-bottom:22px;"><div class="form-field"><label>Mês</label><input type="month" id="result-month" value="${state.resultMonth}"></div></div>
    <div class="kanban-board" style="grid-template-columns:repeat(3,1fr); margin-bottom:26px;">
      <div class="kanban-col"><div class="kanban-col-head"><span class="title">I-140 protocolados</span></div><div class="stat-num">${r.i140}</div></div>
      <div class="kanban-col"><div class="kanban-col-head"><span class="title">ETA 9089 protocolados</span></div><div class="stat-num">${r.eta9089}</div></div>
      <div class="kanban-col"><div class="kanban-col-head"><span class="title">PWD protocolados</span></div><div class="stat-num">${r.pwd}</div></div>
    </div>
    <div class="section-label">Bônus do mês</div>
    <div class="kanban-board" style="grid-template-columns:repeat(4,1fr); margin-bottom:20px;">
      ${['RFE','NPT','MOTION','Appeal'].map(t => `<div class="kanban-col"><div class="kanban-col-head"><span class="title">${t}</span></div><div class="stat-num small">${r.bonus[t]}</div></div>`).join('')}
    </div>
    <div class="form-card">
      <div style="font-weight:500; font-size:13px; margin-bottom:10px;">Registrar evento bônus</div>
      <div class="form-row">
        <div class="form-field"><label>Tipo</label><select id="ev-tipo"><option>RFE</option><option>NPT</option><option>MOTION</option><option>Appeal</option></select></div>
        <div class="form-field"><label>Data</label><input type="date" id="ev-data" value="${todayISO()}"></div>
        <div class="form-field"><label>Caso (opcional)</label><input type="text" id="ev-caso" placeholder="Nome do caso"></div>
      </div>
      <div class="form-actions"><button class="btn primary" id="ev-add" ${state.busy?'disabled':''}>${state.busy ? `<i class="pi pi-spinner pi-spin"></i> ${state.busyLabel || 'Salvando...'}` : '<i class="pi pi-plus-circle"></i>Registrar'}</button></div>
    </div>

    <div class="section-label" style="margin-top:24px;">Eventos registrados neste mês</div>
    <div class="form-row" style="margin-bottom:16px;">
      <div class="form-field">
        <label>Tipo</label>
        <select id="res-filter-tipo">
          <option value="todos" ${state.resultadosFilterTipo==='todos'?'selected':''}>Todos</option>
          ${['RFE','NPT','MOTION','Appeal'].map(t => `<option value="${t}" ${state.resultadosFilterTipo===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-field"><label>Data</label><input type="date" id="res-filter-data" value="${state.resultadosFilterData}"></div>
      <div class="form-field"><label>Caso</label><input type="text" id="res-filter-caso" placeholder="Buscar por caso..." value="${escapeHtml(state.resultadosFilterCaso)}"></div>
    </div>
    ${eventosFiltrados.length ? eventosFiltrados.map(ev => `
        <div class="lembrete-row">
          <div><div class="lr-caso">${ev.tipo} · ${fmtDate(ev.data)}</div><div class="lr-nome">${escapeHtml(ev.caso||'—')}</div></div>
          <button class="mini-btn danger" data-del-evento="${ev.id}"><i class="pi pi-times-circle"></i></button>
        </div>
      `).join('') : '<div class="kanban-empty">Nenhum evento encontrado com esses filtros.</div>'}
  `;
}
