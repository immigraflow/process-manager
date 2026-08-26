import { state, getCase, findI140Marco } from '../state.js';
import { MARCO_DEFS, STATUS_OPTIONS } from '../constants.js';
import { isEtapaDone, caseFullyDone, caseOverallStatus, deadlineStatus, deadlineLabel } from '../domain.js';
import { escapeHtml, fmtDate, todayISO } from '../utils.js';

export function renderProcessosView(){
  const selected = getCase(state.selectedCaseId);
  return `
    <div class="layout">
      <div class="sidebar">
        <h2>Seus processos (${state.data.cases.length})</h2>
        <div class="sidebar__actions">
          <button class="new-case-btn" id="btn-new-case"><i class="pi pi-plus-circle"></i>Novo processo</button>
          <button class="icon-btn" id="btn-template" title="Etapas padrão"><i class="pi pi-cog"></i></button>
        </div>
        ${state.showTemplateManager ? renderTemplateManager() : ''}
        ${state.showNewCaseForm ? renderNewCaseForm() : ''}
        <div class="search-field">
          <i class="pi pi-search"></i>
          <input type="text" id="case-search-input" placeholder="Buscar processo pelo nome..." value="${escapeHtml(state.caseSearchQuery)}">
        </div>
        <div class="case-list">
          ${renderCaseListItems()}
        </div>
      </div>
      <div class="main-panel">${selected ? renderCaseDetail(selected) : renderEmptyState()}</div>
    </div>
  `;
}

function renderCaseListItems(){
  const query = state.caseSearchQuery.trim().toLowerCase();
  const filtered = query ? state.data.cases.filter(c => c.nome.toLowerCase().includes(query)) : state.data.cases;

  if(state.data.cases.length === 0 && !state.showNewCaseForm){
    return '<div class="empty-sidebar">Nenhum processo cadastrado ainda. Clique em "Novo processo" para começar.</div>';
  }
  if(filtered.length === 0){
    return `<div class="empty-sidebar">Nenhum processo encontrado para "${escapeHtml(state.caseSearchQuery)}".</div>`;
  }
  return filtered.map(c => renderCaseCard(c)).join('');
}

function renderEmptyState(){
  return `<div class="empty-state"><div class="big">Nenhum processo selecionado</div><p>Escolha um processo na lista ao lado ou crie um novo para começar a acompanhar suas etapas e prazos.</p></div>`;
}

function renderTemplateManager(){
  return `
    <div class="form-card" id="template-manager">
      <div style="font-weight:500; font-size:13px; margin-bottom:2px;">Etapas padrão</div>
      <div style="font-size:12px; color:var(--ink-soft); margin-bottom:12px; line-height:1.5;">Adicionadas automaticamente a cada novo processo, na ordem abaixo.</div>
      <div style="font-size:11px; color:var(--ink-faint); margin-bottom:8px;"><i class="pi pi-arrows-alt"></i> Arraste pelo ícone para reordenar</div>
      <div id="tpl-list">
        ${state.data.template.length === 0 ? '<div style="font-size:12.5px;color:var(--ink-faint); margin-bottom:10px;">Nenhuma etapa padrão cadastrada.</div>' : ''}
        ${state.data.template.map((t,i) => `
          <div class="template-item" draggable="true" data-tpl-drag="${t.id}" data-tpl-index="${i}">
            <i class="pi pi-bars template-item__handle"></i>
            <span class="num">${i+1}.</span>
            <span class="txt">${escapeHtml(t.titulo)}</span>
            ${t.tipo === 'marco' ? `<span class="tag">marco · ${MARCO_DEFS[t.marcoTipo].label}</span>` : ''}
            ${t.reminderDays ? `<span class="tag" style="color:var(--warning); background:var(--warning-soft);">${t.reminderDays}d</span>` : ''}
            <button class="mini-btn danger" data-tpl-delete="${t.id}" title="Remover"><i class="pi pi-times-circle"></i></button>
          </div>
        `).join('')}
      </div>
      <div class="form-row" style="margin-top:8px;"><div class="form-field"><input type="text" id="tpl-new-input" placeholder="Ex: Protocolar petição inicial"></div></div>
      <div class="form-actions" style="justify-content:space-between;">
        <button class="btn text" id="tpl-close">Fechar</button>
        <button class="btn primary" id="tpl-add"><i class="pi pi-plus-circle"></i>Adicionar</button>
      </div>
    </div>
  `;
}

function renderNewCaseForm(){
  return `
    <div class="form-card" id="new-case-form">
      <div class="form-row"><div class="form-field" style="flex: 2;"><label>Nome do caso</label><input type="text" id="nc-nome" placeholder="Ex: Ação trabalhista - Silva"></div></div>
      <div class="form-row">
        <div class="form-field"><label>Nº do processo (opcional)</label><input type="text" id="nc-numero" placeholder="0001234-56.2026.8.19.0001"></div>
        <div class="form-field"><label>Cliente (opcional)</label><input type="text" id="nc-cliente" placeholder="Nome do cliente"></div>
      </div>
      <div id="nc-error" class="field-error" style="display:none;">Digite um nome para o caso.</div>
      <div class="form-actions"><button class="btn text" id="nc-cancel">Cancelar</button><button class="btn primary" id="nc-save" ${state.busy?'disabled':''}>${state.busy ? `<i class="pi pi-spinner pi-spin"></i> ${state.busyLabel || 'Salvando...'}` : 'Salvar caso'}</button></div>
    </div>
  `;
}

function renderCaseCard(c){
  const status = caseOverallStatus(c);
  const pendentes = c.etapas.filter(e => !isEtapaDone(e)).length;
  const done = caseFullyDone(c);
  return `
    <div class="case-card status-${status} ${c.id === state.selectedCaseId ? 'selected' : ''}" data-case-id="${c.id}">
      ${c.numero ? `<div class="numero">${escapeHtml(c.numero)}</div>` : ''}
      <div class="nome">${escapeHtml(c.nome)}${done ? '<span class="done-check" title="Processo concluído">✓</span>' : ''}</div>
      ${c.cliente ? `<div class="cliente">${escapeHtml(c.cliente)}</div>` : ''}
      <div class="meta-row">
        <span class="etapa-count">${c.etapas.length} etapa${c.etapas.length === 1 ? '' : 's'} · ${pendentes} pendente${pendentes === 1 ? '' : 's'}</span>
        ${!done && status !== 'neutro' ? `<span class="stamp ${status}">${status === 'vencido' ? 'Vencido' : status === 'proximo' ? 'Próximo' : 'Em dia'}</span>` : ''}
      </div>
    </div>
  `;
}

export function renderCaseDetail(c){
  const sortedEtapas = c.etapas.filter(e => e.colecao !== 'aos');
  const aosEtapas = c.etapas.filter(e => e.colecao === 'aos');
  const done = caseFullyDone(c);
  return `
    <div class="case-header">
      <div>
        ${c.numero ? `<div class="numero">${escapeHtml(c.numero)}</div>` : ''}
        <h2>${escapeHtml(c.nome)}${done ? '<span class="done-check" title="Processo concluído">✓</span>' : ''}</h2>
        ${c.cliente ? `<div class="cliente">${escapeHtml(c.cliente)}</div>` : ''}
      </div>
      <div class="actions"><button class="icon-btn danger" id="btn-delete-case" title="Excluir processo"><i class="pi pi-times-circle"></i></button></div>
    </div>
    <div class="section-label">Linha do tempo (${sortedEtapas.length})</div>
    ${sortedEtapas.length === 0 ? '<div class="empty-etapas">Nenhuma etapa cadastrada. Adicione a primeira etapa abaixo.</div>' : ''}
    <div class="timeline">${sortedEtapas.map(e => renderEtapa(c, e)).join('')}</div>
    ${state.showEtapaFormFor === c.id ? renderEtapaForm(c, null) : `<button class="add-etapa-toggle" id="btn-add-etapa"><i class="pi pi-plus-circle"></i>Adicionar etapa</button>`}
    ${state.data.template.length > 0 ? `<button class="apply-template-btn" id="btn-apply-template" data-case="${c.id}"><i class="pi pi-refresh"></i>Aplicar etapas padrão a este processo</button>` : ''}
    ${renderNvcAosBlock(c, aosEtapas)}
  `;
}

export function renderNvcAosBlock(c, aosEtapasParam){
  const i140 = findI140Marco(c);
  if(!i140 || i140.status !== 'protocolado') return '';
  const aosEtapas = aosEtapasParam || c.etapas.filter(e => e.colecao === 'aos');
  return `
    <div class="separator-line"><span>Pós I-140</span></div>
    <div class="form-row" style="margin-bottom:14px;">
      <button class="choice-btn ${c.nvcAosChoice==='nvc'?'active':''}" data-nvc-aos="nvc" data-case="${c.id}">NVC</button>
      <button class="choice-btn ${c.nvcAosChoice==='aos'?'active':''}" data-nvc-aos="aos" data-case="${c.id}">AOS</button>
    </div>
    ${c.nvcAosChoice==='aos' ? `
      <div class="section-label">Etapas AOS (${aosEtapas.length})</div>
      <div class="timeline">${aosEtapas.map(e => renderEtapa(c, e)).join('')}</div>
    ` : ''}
  `;
}

export function renderEtapa(c, e){
  const isEditing = state.editingEtapaId === e.id;
  if(e.tipo === 'marco'){
    if(isEditing) return `<div class="etapa marco marco-${e.marcoTipo}">${renderMarcoForm(c, e)}</div>`;
    return renderMarcoCard(c, e);
  }
  if(isEditing) return `<div class="etapa st-${e.status}">${renderEtapaForm(c, e)}</div>`;

  const prazoStatus = deadlineStatus(e);
  const prazoLabel = deadlineLabel(e);
  const showPrazoStamp = !isEtapaDone(e) && prazoLabel;

  return `
    <div class="etapa st-${e.status}">
      <div class="etapa-card">
        <div class="etapa-top">
          <div style="flex:1;">
            <div class="etapa-titulo">${escapeHtml(e.titulo)}</div>
            <div class="etapa-dates">
              ${e.data ? `<span>Data: ${fmtDate(e.data)}</span>` : ''}
              ${e.prazo ? `<span>Prazo: ${fmtDate(e.prazo)}</span>` : ''}
              ${e.reminderDays ? `<span>Lembrete a cada ${e.reminderDays}d</span>` : ''}
            </div>
            ${e.obs ? `<div class="etapa-obs">${escapeHtml(e.obs)}</div>` : ''}
          </div>
          ${showPrazoStamp ? `<span class="stamp ${prazoStatus}">${prazoLabel}</span>` : ''}
        </div>
        <div style="display:flex; gap:10px; margin-top:10px; align-items:center; flex-wrap:wrap;">
          <select class="status-select st-${e.status}" data-status-etapa="${e.id}" data-case="${c.id}">
            ${STATUS_OPTIONS.map(s => `<option value="${s.key}" ${s.key === e.status ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
          <button class="mini-btn" data-edit-etapa="${e.id}" data-case="${c.id}"><i class="pi pi-pencil"></i> Editar</button>
          <button class="mini-btn danger" data-delete-etapa="${e.id}" data-case="${c.id}"><i class="pi pi-times-circle"></i> Excluir</button>
        </div>
      </div>
    </div>
  `;
}

function renderMarcoCard(c, e){
  const def = MARCO_DEFS[e.marcoTipo];
  const statusLabel = def.statusOptions.find(s => s.key === e.status).label;
  const m = e.marco;
  let extra = '';
  if(e.marcoTipo === 'pwd'){
    extra = `${m.dataEmissao?`<span>Emissão: ${fmtDate(m.dataEmissao)}</span>`:''}${m.validade?`<span>Validade: ${fmtDate(m.validade)}</span>`:''}`;
    if(m.houveRfi) extra += `${m.rfiData?`<span>RFI recebido: ${fmtDate(m.rfiData)}</span>`:''}${m.rfiPrazo?`<span>Prazo resposta RFI: ${fmtDate(m.rfiPrazo)}</span>`:''}`;
  } else if(e.marcoTipo === 'eta9089'){
    extra = `${m.dataEmissao?`<span>Certificação: ${fmtDate(m.dataEmissao)}</span>`:''}${m.validade?`<span>Validade: ${fmtDate(m.validade)}</span>`:''}`;
  } else if(e.marcoTipo === 'i140'){
    extra = `${m.dataProtocolo?`<span>Protocolo: ${fmtDate(m.dataProtocolo)}</span>`:''}${m.dataPrioridade?`<span>Data de prioridade: ${fmtDate(m.dataPrioridade)}</span>`:''}${m.prazoAlvo?`<span>Prazo-alvo: ${fmtDate(m.prazoAlvo)}</span>`:''}`;
  }
  return `
    <div class="etapa marco marco-${e.marcoTipo}">
      <div class="etapa-card marco-card marco-card-${e.marcoTipo}">
        <div class="marco-label">Marco · ${def.label}</div>
        <div class="etapa-top">
          <div style="flex:1;">
            <div class="etapa-titulo">${escapeHtml(e.titulo)}</div>
            <div class="etapa-dates"><span>Status: ${statusLabel}</span>${extra}</div>
            ${e.obs ? `<div class="etapa-obs">${escapeHtml(e.obs)}</div>` : ''}
          </div>
        </div>
        <div style="display:flex; gap:10px; margin-top:10px;">
          <button class="mini-btn" data-edit-etapa="${e.id}" data-case="${c.id}"><i class="pi pi-pencil"></i> Editar</button>
          <button class="mini-btn danger" data-delete-etapa="${e.id}" data-case="${c.id}"><i class="pi pi-times-circle"></i> Excluir</button>
        </div>
      </div>
    </div>
  `;
}

function renderMarcoForm(c, e){
  const def = MARCO_DEFS[e.marcoTipo];
  const m = e.marco;
  let extraFields = '';
  if(e.marcoTipo === 'pwd'){
    extraFields = `
      <div class="form-row"><div class="form-field"><label>Houve RFI?</label><select id="ee-m-houverfi"><option value="nao" ${!m.houveRfi?'selected':''}>Não</option><option value="sim" ${m.houveRfi?'selected':''}>Sim</option></select></div></div>
      <div class="form-row">
        <div class="form-field"><label>Data de chegada do RFI</label><input type="date" id="ee-m-rfidata" value="${m.rfiData||''}"></div>
        <div class="form-field"><label>Prazo de resposta ao RFI</label><input type="date" id="ee-m-rfiprazo" value="${m.rfiPrazo||''}"></div>
      </div>
      <div class="field-hint">Preencha os dois campos acima apenas se houve RFI.</div>
      <div class="form-row">
        <div class="form-field"><label>Data de emissão</label><input type="date" id="ee-m-emissao" value="${m.dataEmissao||''}"></div>
        <div class="form-field"><label>Data de validade</label><input type="date" id="ee-m-validade" value="${m.validade||''}"></div>
      </div>
      <div class="field-hint">Ao marcar como "Emitido", a validade vira o prazo da etapa "Protocolar o ETA 9089".</div>
    `;
  } else if(e.marcoTipo === 'eta9089'){
    extraFields = `
      <div class="form-row">
        <div class="form-field"><label>Data de certificação</label><input type="date" id="ee-m-emissao" value="${m.dataEmissao||''}"></div>
        <div class="form-field"><label>Data de validade</label><input type="date" id="ee-m-validade" value="${m.validade||''}"></div>
      </div>
      <div class="field-hint">Ao marcar como "Certificado", a validade vira o prazo-alvo do marco I-140.</div>
    `;
  } else if(e.marcoTipo === 'i140'){
    extraFields = `
      <div class="form-row">
        <div class="form-field"><label>Data de protocolo</label><input type="date" id="ee-m-protocolo" value="${m.dataProtocolo||''}"></div>
        <div class="form-field"><label>Data de prioridade</label><input type="date" id="ee-m-prioridade" value="${m.dataPrioridade||''}"></div>
      </div>
      <div class="form-row"><div class="form-field"><label>Validade (opcional)</label><input type="date" id="ee-m-validade" value="${m.validade||''}"></div></div>
      ${m.prazoAlvo ? `<div class="field-hint">Prazo-alvo (definido pela validade do marco ETA 9089): ${fmtDate(m.prazoAlvo)}</div>` : ''}
    `;
  }
  return `
    <div class="form-card">
      <div class="form-row"><div class="form-field" style="flex:2;"><label>Título</label><input type="text" id="ee-titulo" value="${escapeHtml(e.titulo)}"></div></div>
      <div class="form-row"><div class="form-field"><label>Status do marco</label><select id="ee-m-status">${def.statusOptions.map(s => `<option value="${s.key}" ${e.status===s.key?'selected':''}>${s.label}</option>`).join('')}</select></div></div>
      ${extraFields}
      <div class="form-row"><div class="form-field"><label>Observações</label><textarea id="ee-obs">${escapeHtml(e.obs||'')}</textarea></div></div>
      <div class="form-actions"><button class="btn text" id="ee-cancel">Cancelar</button><button class="btn primary" id="ee-save-marco" data-case="${c.id}" data-etapa="${e.id}" ${state.busy?'disabled':''}>${state.busy ? `<i class="pi pi-spinner pi-spin"></i> ${state.busyLabel || 'Salvando...'}` : 'Salvar marco'}</button></div>
    </div>
  `;
}

export function renderEtapaForm(c, existing){
  const isEdit = !!existing;
  const idPrefix = isEdit ? 'ee' : 'ne';
  return `
    <div class="form-card" id="${idPrefix}-form" style="${isEdit ? 'margin-top:0;' : ''}">
      <div class="form-row"><div class="form-field" style="flex:2;"><label>Título da etapa</label><input type="text" id="${idPrefix}-titulo" placeholder="Ex: Protocolar contestação" value="${isEdit ? escapeHtml(existing.titulo) : ''}"></div></div>
      <div class="form-row">
        <div class="form-field"><label>Data</label><input type="date" id="${idPrefix}-data" value="${isEdit ? (existing.data || '') : todayISO()}"></div>
        <div class="form-field"><label>Prazo (opcional)</label><input type="date" id="${idPrefix}-prazo" value="${isEdit ? (existing.prazo || '') : ''}"></div>
      </div>
      <div class="form-row"><div class="form-field"><label>Observações (opcional)</label><textarea id="${idPrefix}-obs" placeholder="Notas sobre esta etapa">${isEdit ? escapeHtml(existing.obs || '') : ''}</textarea></div></div>
      <div class="form-row"><div class="form-field"><label>Status</label><select id="${idPrefix}-status">${STATUS_OPTIONS.map(s => `<option value="${s.key}" ${(isEdit ? existing.status : 'nao_iniciado') === s.key ? 'selected' : ''}>${s.label}</option>`).join('')}</select></div></div>
      <div id="${idPrefix}-error" class="field-error" style="display:none;">Digite um título para a etapa.</div>
      <div class="form-actions"><button class="btn text" id="${idPrefix}-cancel">Cancelar</button><button class="btn primary" id="${idPrefix}-save" data-case="${c.id}" ${isEdit ? `data-etapa="${existing.id}"` : ''} ${state.busy?'disabled':''}>${state.busy ? `<i class="pi pi-spinner pi-spin"></i> ${state.busyLabel || 'Salvando...'}` : (isEdit ? 'Salvar alterações' : 'Adicionar etapa')}</button></div>
    </div>
  `;
}
