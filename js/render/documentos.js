// Aba "Documentos": um item por processo, com o status do envio de documentos (PENDENTE / ENVIADO),
// o prazo de envio (7 dias a partir da criação do processo) e a contagem regressiva
import { state } from '../state.js';
import { DOC_STATUS, CASE_LIST_LIMIT, DEFAULT_VISA_TIPO, visaLabel } from '../constants.js';
import { docStatusOf, listarDocumentos } from '../domain.js';
import { escapeHtml, fmtDate, daysUntil } from '../utils.js';
import { renderTrilhaProcesso } from './processos.js';

const plural = (n, um, varios) => n === 1 ? um : varios;

function fmtTamanho(bytes){
  if(!bytes && bytes !== 0) return '';
  if(bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}

/** Flag de status (ícone antes do texto), no mesmo estilo do chip "concluído" da linha do tempo */
function renderFlag(status){
  const s = DOC_STATUS[status] || DOC_STATUS.pendente;
  return `<span class="chip tone-${s.tone}"><i class="pi ${s.icon}" aria-hidden="true"></i> ${s.label}</span>`;
}

/** Contagem regressiva até o prazo de envio dos documentos */
function renderContagem(prazo){
  const dias = daysUntil(prazo);
  if(dias === null) return '';
  let tone, texto;
  if(dias < 0){ tone = 'bad'; texto = `Vencido há ${-dias} ${plural(-dias, 'dia', 'dias')}`; }
  else if(dias === 0){ tone = 'warn'; texto = 'Vence hoje'; }
  else { tone = dias <= 2 ? 'warn' : 'accent'; texto = `${dias} ${plural(dias, 'dia restante', 'dias restantes')}`; }
  return `<span class="chip chip--destaque tone-${tone}"><i class="pi pi-calendar-clock" aria-hidden="true"></i> ${texto}</span>`;
}

function renderPainel(c){
  const status = docStatusOf(c);
  const s = DOC_STATUS[status];
  const enviando = state.busy && state.busyLabel === 'Enviando...';
  const off = state.busy ? 'disabled' : '';
  return `
    <div class="doc-panel">
      <select class="status-select ${s.selectClass}" data-doc-status="${c.id}" aria-label="Status dos documentos" ${off}>
        ${Object.entries(DOC_STATUS).map(([key, o]) => `<option value="${key}" ${key === status ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>
      ${status === 'pendente' ? `
        <button type="button" class="mini-btn mini-btn--lembrar" data-doc-remind="${c.id}" ${off}><i class="pi pi-bell"></i> LEMBRAR CLIENTE</button>
        <button type="button" class="mini-btn mini-btn--upload" data-doc-upload="${c.id}" ${off}>
          ${enviando ? '<i class="pi pi-spinner pi-spin"></i> ENVIANDO...' : '<i class="pi pi-file-arrow-up"></i> ENVIAR DOCUMENTOS'}
        </button>
        <input type="file" id="doc-file-${c.id}" data-doc-file="${c.id}" multiple hidden>
      ` : `
        <button type="button" class="mini-btn mini-btn--ver" data-doc-view="${c.id}" ${off}><i class="pi pi-eye"></i> VER DOCUMENTOS</button>
      `}
      <button type="button" class="mini-btn" data-doc-trilha="${c.id}" ${off}><i class="pi pi-list"></i> VER PROCESSO</button>
      <button type="button" class="mini-btn danger" data-doc-delete="${c.id}" ${off}><i class="pi pi-times-circle"></i> EXCLUIR</button>
    </div>
  `;
}

function renderLinha(c){
  const status = docStatusOf(c);
  const aberto = state.docExpandedId === c.id;
  const n = (c.docArquivos || []).length;
  const pendente = status === 'pendente';
  return `
    <div class="doc-item ${status}">
      <div class="doc-row">
        <button type="button" class="doc-row__main" data-doc-main="${c.id}">
          <span class="doc-row__info">
            <span class="doc-row__nome">${escapeHtml(c.nome)}${c.cliente ? `<span class="doc-row__cliente"> · ${escapeHtml(c.cliente)}</span>` : ''}</span>
            <span class="doc-row__sub">${pendente ? 'Aguardando documentos' : `${n} ${plural(n, 'arquivo', 'arquivos')}`}</span>
            ${pendente && c.docPrazo ? `<span class="doc-row__prazo">Prazo: ${fmtDate(c.docPrazo)}</span>` : ''}
          </span>
          <span class="doc-row__meio">${pendente && c.docPrazo ? renderContagem(c.docPrazo) : ''}</span>
          ${renderFlag(status)}
        </button>
        <button type="button" class="doc-row__toggle" data-doc-toggle="${c.id}" aria-expanded="${aberto}" title="Gerenciar" aria-label="Gerenciar ${escapeHtml(c.nome)}">
          <i class="pi pi-chevron-${aberto ? 'up' : 'down'}" aria-hidden="true"></i>
        </button>
      </div>
      ${aberto ? renderPainel(c) : ''}
    </div>
  `;
}

export function renderDocumentosView(){
  if(state.data.documentosErro){
    return `
      <div class="lembrete-section">
        <h3>Documentos dos clientes</h3>
        <div class="kanban-empty" style="color:var(--urgent);">Não foi possível carregar os documentos (${escapeHtml(state.data.documentosErro)}). Verifique se a migração <b>db/migrations/IMF-007_documentos.sql</b> foi executada no Supabase.</div>
      </div>`;
  }
  const lista = listarDocumentos(state.data.cases, state.docSearchQuery, state.docStatusFilter);
  // Mesmo VER MAIS / VER MENOS da lista de processos: só os primeiros itens até expandir
  const temMais = lista.length > CASE_LIST_LIMIT;
  const visiveis = (temMais && !state.docListExpanded) ? lista.slice(0, CASE_LIST_LIMIT) : lista;
  const toggle = !temMais ? '' : (state.docListExpanded
    ? '<button type="button" class="list-toggle" id="btn-docs-toggle">VER MENOS <i class="pi pi-minus-circle" aria-hidden="true"></i></button>'
    : '<button type="button" class="list-toggle" id="btn-docs-toggle">VER MAIS <i class="pi pi-plus-circle" aria-hidden="true"></i></button>');

  return `
    <div class="kanban-filters">
      <div class="search-field">
        <i class="pi pi-search"></i>
        <input type="text" id="doc-search-input" placeholder="Buscar cliente pelo nome..." value="${escapeHtml(state.docSearchQuery)}">
      </div>
      <select id="doc-status-filter" class="kanban-status-filter" aria-label="Filtrar por status">
        <option value="todos" ${state.docStatusFilter === 'todos' ? 'selected' : ''}>Todos os status</option>
        ${Object.entries(DOC_STATUS).map(([key, o]) => `<option value="${key}" ${state.docStatusFilter === key ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>
    </div>
    <div class="lembrete-section">
      ${state.data.cases.length === 0
        ? '<div class="kanban-empty">Nenhum processo cadastrado ainda. Crie um processo na aba Processos.</div>'
        : lista.length === 0
          ? '<div class="kanban-empty">Nenhum cliente encontrado com esses filtros.</div>'
          : visiveis.map(renderLinha).join('') + toggle}
    </div>
  `;
}

/** Modais da aba Documentos: documentos enviados (VER DOCUMENTOS), aviso de documentação pendente (LEMBRAR CLIENTE) e trilha do processo (VER PROCESSO) */
export function renderDocumentoModal(){
  const m = state.docModal;
  const c = m ? state.data.cases.find(x => x.id === m.id) : null;
  if(!c) return '';
  if(m.tipo === 'trilha'){
    return `
      <div class="modal-overlay" id="doc-overlay">
        <div class="modal-card modal-card--wide modal-card--trilha">
          <div class="case-header">
            <div>
              ${c.numero ? `<div class="numero">${escapeHtml(c.numero)}</div>` : ''}
              <h2>${escapeHtml(c.nome)}</h2>
              <div class="cliente"><span class="tag tag--visa">${escapeHtml(visaLabel(c.tipoVisto || DEFAULT_VISA_TIPO))}</span>${c.cliente ? ` ${escapeHtml(c.cliente)}` : ''}</div>
            </div>
          </div>
          ${renderTrilhaProcesso(c, { editavel: false })}
          <div class="form-actions"><button type="button" class="btn text" id="doc-modal-close">Fechar</button></div>
        </div>
      </div>
    `;
  }
  if(m.tipo === 'enviados'){
    const arquivos = c.docArquivos || [];
    return `
      <div class="modal-overlay" id="doc-overlay">
        <div class="modal-card modal-card--wide">
          <div class="doc-modal__cliente">${escapeHtml(c.nome)}${c.cliente ? ` · ${escapeHtml(c.cliente)}` : ''}</div>
          <div class="doc-modal__titulo enviado"><i class="pi pi-check-circle" aria-hidden="true"></i> DOCUMENTAÇÃO ENVIADA</div>
          <div class="doc-modal__sub">Documentos enviados pelo cliente.</div>
          ${arquivos.length === 0
            ? '<div class="kanban-empty">Nenhum arquivo anexado a este processo.</div>'
            : `<div class="doc-files">${arquivos.map(a => `
                <div class="doc-file">
                  <i class="pi pi-file" aria-hidden="true"></i>
                  <div>
                    <div class="doc-file__nome">${escapeHtml(a.nome)}</div>
                    <div class="doc-file__meta">${[fmtTamanho(a.tamanho), a.createdAt ? fmtDate(a.createdAt.slice(0, 10)) : ''].filter(Boolean).join(' · ')}</div>
                  </div>
                  <button type="button" class="btn text" data-doc-open="${escapeHtml(a.path)}"><i class="pi pi-external-link"></i>Abrir</button>
                </div>`).join('')}</div>`}
          <div class="form-actions"><button type="button" class="btn text" id="doc-modal-close">Fechar</button></div>
        </div>
      </div>
    `;
  }
  return `
    <div class="modal-overlay" id="doc-overlay">
      <div class="modal-card modal-card--wide">
        <div class="doc-modal__cliente">${escapeHtml(c.nome)}${c.cliente ? ` · ${escapeHtml(c.cliente)}` : ''}</div>
        <div class="doc-modal__titulo pendente"><i class="pi pi-exclamation-triangle" aria-hidden="true"></i> DOCUMENTAÇÃO PENDENTE</div>
        <div class="doc-modal__sub">Este cliente ainda não nos enviou seus documentos</div>
        <div class="doc-modal__pergunta">Deseja enviar um lembrete ao cliente?</div>
        <div class="form-actions">
          <button type="button" class="btn text" id="doc-modal-close">Fechar</button>
          <button type="button" class="btn primary" id="doc-modal-send">Enviar</button>
        </div>
      </div>
    </div>
  `;
}
