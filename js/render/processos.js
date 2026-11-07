import { state, getCase, findStatusMarco } from '../state.js';
import { MARCO_DEFS, STATUS_OPTIONS, STATUS_ICONS, STATUS_TONES, MARCO_TONES, RECURSO_TIPOS, RECURSO_STATUS_GATILHO, VISA_GROUPS, DEFAULT_VISA_TIPO, CASE_LIST_LIMIT, visaLabel, visaTemFluxo } from '../constants.js';
import { isEtapaDone, caseFullyDone, caseOverallStatus, currentEtapa, prazoInfo, agruparPorFase, faseDaEtapa, orderCasesByDate } from '../domain.js';
import { isConcluido } from '../dashboard.js';
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
        ${state.editingCaseId ? renderCaseForm(getCase(state.editingCaseId)) : ''}
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
  // Do mais antigo para o mais recente (data de cadastro)
  const ordered = orderCasesByDate(state.data.cases);
  const filtered = query ? ordered.filter(c => c.nome.toLowerCase().includes(query)) : ordered;

  if(state.data.cases.length === 0){
    return '<div class="empty-sidebar">Nenhum processo cadastrado ainda. Clique em "Novo processo" para começar.</div>';
  }
  if(filtered.length === 0){
    return `<div class="empty-sidebar">Nenhum processo encontrado para "${escapeHtml(state.caseSearchQuery)}".</div>`;
  }
  const temMais = filtered.length > CASE_LIST_LIMIT;
  const visiveis = (temMais && !state.casesExpanded) ? filtered.slice(0, CASE_LIST_LIMIT) : filtered;
  const toggle = !temMais ? '' : (state.casesExpanded
    ? '<button type="button" class="list-toggle" id="btn-cases-toggle">VER MENOS <i class="pi pi-minus-circle" aria-hidden="true"></i></button>'
    : '<button type="button" class="list-toggle" id="btn-cases-toggle">VER MAIS <i class="pi pi-plus-circle" aria-hidden="true"></i></button>');
  return visiveis.map(c => renderCaseCard(c)).join('') + toggle;
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

/** Modal "Novo processo": select de tipo de visto (agrupado) + o card de cadastro do caso */
export function renderNewCaseModal(){
  if(!state.showNewCaseForm) return '';
  const tipo = state.newCaseTipo;
  let aviso = '';
  if(tipo && visaTemFluxo(tipo)){
    aviso = `<div class="field-hint" style="margin-bottom:12px;">O processo será criado com o fluxo padrão do ${escapeHtml(visaLabel(tipo))} (${state.data.template.length} etapas).</div>`;
  } else if(tipo){
    aviso = `<div class="flow-pending flow-pending--compact"><i class="pi pi-clock"></i> Fluxo a ser implementado</div>`;
  }
  return `
    <div class="modal-overlay" id="nc-overlay">
      <div class="modal-card modal-card--wide">
        <div style="font-weight:600; font-size:14.5px; margin-bottom:12px; font-family: var(--font-display);">Novo processo</div>
        <div class="form-row"><div class="form-field">
          <label for="nc-tipo">Tipo de visto</label>
          <select id="nc-tipo">
            <option value="" ${tipo ? '' : 'selected'} disabled>Selecione o tipo de visto</option>
            ${VISA_GROUPS.map(g => `<optgroup label="${escapeHtml(g.label)}">${g.options.map(o => `<option value="${o.key}" ${tipo === o.key ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}</optgroup>`).join('')}
          </select>
        </div></div>
        <div id="nc-tipo-error" class="field-error" style="display:none;">Selecione o tipo de visto.</div>
        ${aviso}
        ${renderCaseForm(null)}
      </div>
    </div>
  `;
}

function renderCaseForm(existing){
  const isEdit = !!existing;
  const draft = (!isEdit && state.newCaseDraft) ? state.newCaseDraft : { nome: '', numero: '', cliente: '' };
  return `
    <div class="form-card" id="new-case-form">
      <div class="form-row"><div class="form-field" style="flex: 2;"><label>Nome do caso</label><input type="text" id="nc-nome" placeholder="Ex: Ação trabalhista - Silva" value="${isEdit ? escapeHtml(existing.nome) : escapeHtml(draft.nome)}"></div></div>
      <div class="form-row">
        <div class="form-field"><label>Nº do processo (opcional)</label><input type="text" id="nc-numero" placeholder="0001234-56.2026.8.19.0001" value="${isEdit ? escapeHtml(existing.numero || '') : escapeHtml(draft.numero)}"></div>
        <div class="form-field"><label>Cliente (opcional)</label><input type="text" id="nc-cliente" placeholder="Nome do cliente" value="${isEdit ? escapeHtml(existing.cliente || '') : escapeHtml(draft.cliente)}"></div>
      </div>
      <div id="nc-error" class="field-error" style="display:none;">Digite um nome para o caso.</div>
      <div class="form-actions"><button class="btn text" id="nc-cancel">Cancelar</button><button class="btn primary" id="nc-save" ${isEdit ? `data-case="${existing.id}"` : ''} ${state.busy?'disabled':''}>${state.busy ? `<i class="pi pi-spinner pi-spin"></i> ${state.busyLabel || 'Salvando...'}` : (isEdit ? 'Alterar' : 'Salvar')}</button></div>
    </div>
  `;
}

function renderCaseCard(c){
  const status = caseOverallStatus(c);
  const pendentes = c.etapas.filter(e => !isEtapaDone(e)).length;
  const done = caseFullyDone(c);
  return `
    <div class="case-card status-${status} ${c.id === state.selectedCaseId ? 'selected' : ''}" data-case-id="${c.id}">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:6px;">
        <div style="flex:1; min-width:0;">
          ${c.numero ? `<div class="numero">${escapeHtml(c.numero)}</div>` : ''}
          <div class="nome">${escapeHtml(c.nome)}${done ? '<span class="done-check" title="Processo concluído">✓</span>' : ''}</div>
        </div>
        <button class="mini-btn" data-edit-case="${c.id}" title="Editar processo" style="flex-shrink:0;"><i class="pi pi-pencil"></i></button>
      </div>
      ${c.cliente ? `<div class="cliente">${escapeHtml(c.cliente)}</div>` : ''}
      <div class="meta-row">
        <span class="etapa-count">${c.etapas.length} etapa${c.etapas.length === 1 ? '' : 's'} · ${pendentes} pendente${pendentes === 1 ? '' : 's'}</span>
        ${!done && status !== 'neutro' ? `<span class="stamp ${status}">${status === 'vencido' ? 'Vencido' : status === 'proximo' ? 'Próximo' : 'Em dia'}</span>` : ''}
      </div>
    </div>
  `;
}

export function renderCaseDetail(c){
  if(!visaTemFluxo(c.tipoVisto || DEFAULT_VISA_TIPO)) return renderCaseDetailSemFluxo(c);
  const principais = c.etapas.filter(e => e.colecao !== 'aos');
  const aosEtapas = c.etapas.filter(e => e.colecao === 'aos');
  const cur = currentEtapa(c);
  const fases = agruparPorFase(principais);
  const done = caseFullyDone(c);
  return `
    <div class="case-header">
      <div>
        ${c.numero ? `<div class="numero">${escapeHtml(c.numero)}</div>` : ''}
        <h2>${escapeHtml(c.nome)}${done ? '<span class="done-check" title="Processo concluído">✓</span>' : ''}</h2>
        <div class="cliente"><span class="tag tag--visa">${escapeHtml(visaLabel(c.tipoVisto || DEFAULT_VISA_TIPO))}</span>${c.cliente ? ` ${escapeHtml(c.cliente)}` : ''}</div>
      </div>
      <div class="actions"><button class="icon-btn danger" id="btn-delete-case" title="Excluir processo"><i class="pi pi-times-circle"></i></button></div>
    </div>
    ${renderResumoCaso(c, cur)}
    <div class="section-label">Linha do tempo (${principais.length})</div>
    ${principais.length === 0 ? '<div class="empty-etapas">Nenhuma etapa cadastrada. Adicione a primeira etapa abaixo.</div>' : `
      <div class="fase-actions">
        <button type="button" class="small-btn" data-fases-all="open" data-case="${c.id}"><i class="pi pi-angle-double-down" aria-hidden="true"></i> Expandir tudo</button>
        <button type="button" class="small-btn" data-fases-all="close" data-case="${c.id}"><i class="pi pi-angle-double-up" aria-hidden="true"></i> Recolher tudo</button>
      </div>`}
    ${fases.map(f => renderFase(c, f, cur)).join('')}
    ${state.showEtapaFormFor === c.id ? renderEtapaForm(c, null) : `<button class="add-etapa-toggle" id="btn-add-etapa"><i class="pi pi-plus-circle"></i>Adicionar etapa</button>`}
    ${state.data.template.length > 0 ? `<button class="apply-template-btn" id="btn-apply-template" data-case="${c.id}"><i class="pi pi-refresh"></i>Aplicar etapas padrão a este processo</button>` : ''}
    ${renderNvcAosBlock(c, aosEtapas)}
  `;
}

/** Tipos de visto sem fluxo implementado: cabeçalho do caso + aviso no lugar da linha do tempo */
function renderCaseDetailSemFluxo(c){
  return `
    <div class="case-header">
      <div>
        ${c.numero ? `<div class="numero">${escapeHtml(c.numero)}</div>` : ''}
        <h2>${escapeHtml(c.nome)}</h2>
        <div class="cliente"><span class="tag tag--visa">${escapeHtml(visaLabel(c.tipoVisto))}</span>${c.cliente ? ` ${escapeHtml(c.cliente)}` : ''}</div>
      </div>
      <div class="actions"><button class="icon-btn danger" id="btn-delete-case" title="Excluir processo"><i class="pi pi-times-circle"></i></button></div>
    </div>
    <div class="section-label">Linha do tempo</div>
    <div class="flow-pending"><i class="pi pi-clock"></i> Fluxo a ser implementado</div>
  `;
}

/** Resumo do caso: etapa atual, fase, selo de prazo e barra de progresso geral */
function renderResumoCaso(c, cur){
  const total = c.etapas.length;
  if(total === 0) return '';
  const feitas = c.etapas.filter(isEtapaDone).length;
  const pct = Math.round(feitas / total * 100);
  let linha;
  if(c.nvcAosChoice === 'nvc'){
    linha = '<span class="chip tone-ok">✓ Atuação finalizada (via NVC)</span>';
  } else if(!cur){
    linha = '<span class="chip tone-ok">✓ Processo concluído</span>';
  } else {
    const fase = faseDaEtapa(c, cur);
    const prazo = prazoInfo(cur);
    linha = `<b>Etapa atual:</b> <span>${escapeHtml(cur.titulo)}</span>${fase ? `<span class="resumo__fase">· Fase ${escapeHtml(fase.nome)}</span>` : ''}${prazo ? `<span class="stamp ${prazo.status}">${prazo.label}</span>` : ''}`;
  }
  return `
    <div class="resumo">
      <div class="resumo__linha">${linha}</div>
      <div class="prog" role="progressbar" aria-valuenow="${feitas}" aria-valuemin="0" aria-valuemax="${total}" aria-label="Progresso geral"><i style="width:${pct}%"></i></div>
      <div class="resumo__hint">${feitas} de ${total} etapas concluídas</div>
    </div>
  `;
}

/** Fase do fluxo (PWD, Recrutamento e ETA 9089, I-140) como acordeão. Abre por padrão a que contém a etapa atual. */
function renderFase(c, fase, cur){
  const key = `${c.id}:${fase.key}`;
  const total = fase.etapas.length;
  const feitas = fase.etapas.filter(isEtapaDone).length;
  const temAtual = !!cur && fase.etapas.includes(cur);
  const open = key in state.fasesAbertas ? state.fasesAbertas[key] : temAtual;
  const cls = feitas === total ? 'done' : temAtual ? '' : 'future';
  return `
    <section class="fase ${open ? 'open' : ''} ${cls}">
      <button type="button" class="fase__head" data-fase-toggle="${key}" aria-expanded="${open}">
        <i class="pi pi-chevron-right fase__chev" aria-hidden="true"></i>
        <span class="fase__nome">${escapeHtml(fase.nome)}${feitas === total ? ' <span class="tick">✓</span>' : ''}</span>
        <span class="fase__cnt">${feitas} de ${total} concluídas</span>
        <span class="fase__mini"><i style="width:${Math.round(feitas / total * 100)}%"></i></span>
      </button>
      ${open ? `<div class="fase__body">${fase.etapas.map(e => renderEtapaRow(c, e, cur)).join('')}</div>` : ''}
    </section>
  `;
}

export function renderNvcAosBlock(c, aosEtapasParam){
  const statusMarco = findStatusMarco(c);
  if(!statusMarco || statusMarco.status !== 'sim') return '';
  const aosEtapas = aosEtapasParam || c.etapas.filter(e => e.colecao === 'aos');
  const cur = currentEtapa(c);
  return `
    <div class="separator-line"><span>Pós I-140</span></div>
    <div class="nvc-aos-choice">
      <button class="choice-btn ${c.nvcAosChoice==='nvc'?'active':''}" data-nvc-aos="nvc" data-case="${c.id}">NVC</button>
      <button class="choice-btn ${c.nvcAosChoice==='aos'?'active':''}" data-nvc-aos="aos" data-case="${c.id}">AOS</button>
    </div>
    ${c.nvcAosChoice==='aos' ? `
      <div class="section-label">Etapas AOS (${aosEtapas.length})</div>
      <section class="fase open fase--fixa"><div class="fase__body fase__body--solta">${aosEtapas.map(e => renderEtapaRow(c, e, cur)).join('')}</div></section>
    ` : ''}
    ${c.nvcAosChoice==='nvc' ? `
      <div style="display:flex; align-items:center; gap:12px; padding:16px 18px; border-radius:var(--radius); border:1px solid var(--done); background:var(--done-soft, #e6f7ec);">
        <i class="pi pi-check-circle" style="font-size:22px; color:var(--done);"></i>
        <div>
          <div style="font-weight:700; font-family:var(--font-display); color:var(--done); letter-spacing:0.04em; font-size:13.5px;">ATUAÇÃO FINALIZADA</div>
          <div style="font-size:13px; color:var(--ink-soft); margin-top:2px;">Caso segue via NVC — nenhuma etapa adicional necessária neste escritório.</div>
        </div>
      </div>
    ` : ''}
  `;
}

/** Cor do marco: PWD/ETA/I-140 têm cor própria; STATUS e decisão seguem o tom do status */
function marcoCor(e){
  return ['pwd', 'eta9089', 'i140'].includes(e.marcoTipo) ? `cor-${e.marcoTipo}` : `tone-${MARCO_TONES[e.status] || 'neutral'}`;
}

function renderStatusChip(e){
  if(e.tipo === 'marco'){
    const def = MARCO_DEFS[e.marcoTipo];
    const opt = def.statusOptions.find(s => s.key === e.status);
    const feito = isEtapaDone(e);
    return `<span class="chip tone-${MARCO_TONES[e.status] || 'neutral'}">${feito ? '✓ ' : ''}${escapeHtml(opt ? opt.label : e.status)}</span>`;
  }
  const opt = STATUS_OPTIONS.find(s => s.key === e.status);
  return `<span class="chip tone-${STATUS_TONES[e.status] || 'neutral'}">${STATUS_ICONS[e.status] || ''} ${escapeHtml(opt ? opt.label : e.status)}</span>`;
}

/**
 * Uma etapa na linha do tempo: a etapa atual vem sempre aberta (com a tag AGORA);
 * as demais são uma linha compacta que abre o card completo ao clicar.
 */
function renderEtapaRow(c, e, cur){
  if(e === cur || state.editingEtapaId === e.id) return renderEtapaDetalhe(c, e, e === cur);
  const expanded = state.expandedEtapaId === e.id;
  const prazo = prazoInfo(e);
  const dot = e.tipo === 'marco'
    ? `<span class="dot dot--marco ${marcoCor(e)}" aria-hidden="true"></span>`
    : `<span class="dot tone-${STATUS_TONES[e.status] || 'neutral'}" aria-hidden="true">${STATUS_ICONS[e.status] || ''}</span>`;
  return `
    <button type="button" class="etapa-row ${isEtapaDone(e) ? 'isdone' : ''}" data-etapa-exp="${e.id}" aria-expanded="${expanded}">
      ${dot}
      <span class="etapa-row__tt">${e.tipo === 'marco' ? `<span class="chip chip--marco ${marcoCor(e)}">Marco</span>` : ''}${escapeHtml(e.titulo)}</span>
      <span class="etapa-row__rt">${renderStatusChip(e)}${prazo ? `<span class="stamp ${prazo.status}">${prazo.label}</span>` : ''}</span>
    </button>
    ${expanded ? renderEtapaDetalhe(c, e, false) : ''}
  `;
}

/** Conteúdo aberto de uma etapa/marco: card com os controles, ou o formulário de edição */
function renderEtapaDetalhe(c, e, isCur){
  const editando = state.editingEtapaId === e.id;
  let inner;
  if(e.tipo === 'marco') inner = editando ? renderMarcoForm(c, e) : renderMarcoCard(c, e);
  else inner = editando ? renderEtapaForm(c, e) : renderEtapaCard(c, e);
  return `<div class="etapa-detail ${isCur ? 'etapa-detail--agora' : ''}">${isCur ? '<span class="agora-tag">AGORA</span>' : ''}${inner}</div>`;
}

function renderEtapaCard(c, e){
  const prazo = prazoInfo(e);
  return `
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
        ${prazo ? `<span class="stamp ${prazo.status}">${prazo.label}</span>` : ''}
      </div>
      <div style="display:flex; gap:10px; margin-top:10px; align-items:center; flex-wrap:wrap;">
        <select class="status-select st-${e.status}" data-status-etapa="${e.id}" data-case="${c.id}">
          ${STATUS_OPTIONS.map(s => `<option value="${s.key}" ${s.key === e.status ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
        <button class="mini-btn" data-edit-etapa="${e.id}" data-case="${c.id}"><i class="pi pi-pencil"></i> Editar</button>
        <button class="mini-btn danger" data-delete-etapa="${e.id}" data-case="${c.id}"><i class="pi pi-times-circle"></i> Excluir</button>
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
  } else if(e.marcoTipo === 'recurso_decisao' && m.recursoTipo){
    const rt = RECURSO_TIPOS.find(r => r.key === m.recursoTipo);
    extra = `<span>Recurso: ${rt ? rt.label : m.recursoTipo}</span>`;
  }
  const statusModifier = (e.marcoTipo === 'status' || e.marcoTipo === 'recurso_decisao') ? ` marco-card-status-${e.status}` : '';
  return `
    <div class="etapa-card marco-card marco-card-${e.marcoTipo}${statusModifier}">
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
  } else if(e.marcoTipo === 'recurso_decisao'){
    const mostrarRecurso = RECURSO_STATUS_GATILHO.includes(e.status);
    extraFields = `
      <div class="form-row" id="ee-m-recurso-wrap" style="${mostrarRecurso ? '' : 'display:none;'}">
        <div class="form-field">
          <label>Recurso a interpor</label>
          <select id="ee-m-recurso">
            <option value="">Selecione...</option>
            ${RECURSO_TIPOS.map(r => `<option value="${r.key}" ${m.recursoTipo===r.key?'selected':''}>${r.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field-hint">Ao selecionar um recurso e salvar, uma nova lista de etapas de recurso é adicionada automaticamente à linha do tempo (e pode se repetir, se houver nova decisão negativa depois).</div>
    `;
  }
  return `
    <div class="form-card">
      <div class="form-row"><div class="form-field" style="flex:2;"><label>Título</label><input type="text" id="ee-titulo" value="${escapeHtml(e.titulo)}"></div></div>
      <div class="form-row"><div class="form-field"><label>Status do marco</label><select id="ee-m-status">${def.statusOptions.map(s => `<option value="${s.key}" ${e.status===s.key?'selected':''}>${s.label}</option>`).join('')}</select></div></div>
      ${extraFields}
      <div class="form-row"><div class="form-field"><label>Observações</label><textarea id="ee-obs">${escapeHtml(e.obs||'')}</textarea></div></div>
      <div class="form-actions"><button class="btn text" id="ee-cancel">Cancelar</button><button class="btn primary" id="ee-save-marco" data-case="${c.id}" data-etapa="${e.id}" ${state.busy?'disabled':''}>${state.busy ? `<i class="pi pi-spinner pi-spin"></i> ${state.busyLabel || 'Salvando...'}` : 'Salvar'}</button></div>
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
