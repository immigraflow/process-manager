import { state } from '../state.js';
import { KANBAN_COLUMNS } from '../constants.js';
import { currentEtapa, computeCategory } from '../domain.js';
import { escapeHtml, fmtDate } from '../utils.js';

export function renderKanbanView(){
  const items = [];
  state.data.cases.forEach(c => {
    const cur = currentEtapa(c);
    if(cur) items.push({ c, e: cur, cat: computeCategory(cur) });
  });

  const query = state.kanbanSearchQuery.trim().toLowerCase();
  const filtered = query ? items.filter(i => i.c.nome.toLowerCase().includes(query)) : items;

  const columnsToShow = state.kanbanStatusFilter === 'todos'
    ? KANBAN_COLUMNS
    : KANBAN_COLUMNS.filter(col => col.key === state.kanbanStatusFilter);

  return `
    <div class="kanban-filters">
      <div class="search-field" style="max-width:280px;">
        <i class="pi pi-search"></i>
        <input type="text" id="kanban-search-input" placeholder="Buscar processo pelo nome..." value="${escapeHtml(state.kanbanSearchQuery)}">
      </div>
      <select id="kanban-status-filter" class="status-select" style="border-radius:var(--radius);">
        <option value="todos" ${state.kanbanStatusFilter==='todos'?'selected':''}>Todos os status</option>
        ${KANBAN_COLUMNS.map(col => `<option value="${col.key}" ${state.kanbanStatusFilter===col.key?'selected':''}>${col.label}</option>`).join('')}
      </select>
    </div>
    <div class="kanban-board" style="${columnsToShow.length < 4 ? `grid-template-columns: repeat(${columnsToShow.length}, 1fr);` : ''}">
      ${columnsToShow.map(col => {
        const colItems = filtered.filter(i => i.cat === col.key);
        return `
          <div class="kanban-col ${col.key}" data-kanban-drop="${col.key}">
            <div class="kanban-col-head"><span class="title">${col.label}</span><span class="n">${colItems.length}</span></div>
            ${colItems.length === 0 ? '<div class="kanban-empty">Nada aqui.</div>' : colItems.map(i => renderKanbanCard(i)).join('')}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderKanbanCard(i){
  const e = i.e, c = i.c;
  let meta = '';
  if(e.tipo === 'marco'){
    meta = e.marco.prazoAlvo ? `Prazo-alvo: ${fmtDate(e.marco.prazoAlvo)}` : (e.marco.validade ? `Validade: ${fmtDate(e.marco.validade)}` : (e.marco.rfiPrazo ? `Resposta RFI: ${fmtDate(e.marco.rfiPrazo)}` : 'Sem data definida'));
  } else {
    meta = e.prazo ? `Prazo: ${fmtDate(e.prazo)}` : 'Sem prazo definido';
  }
  const draggable = e.tipo === 'normal';
  return `
    <div class="kanban-card" ${draggable ? `draggable="true" data-kanban-etapa="${e.id}" data-kanban-case="${c.id}"` : 'title="Marcos são movidos pela tela do processo"'}>
      <div class="kc-case">${escapeHtml(c.nome)}</div>
      <div class="kc-titulo">${escapeHtml(e.titulo)}</div>
      <div class="kc-meta">${meta}</div>
    </div>
  `;
}
