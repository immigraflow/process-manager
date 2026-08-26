// Ponto de entrada: monta o shell da página e delega cada view ao seu módulo
import { state } from './state.js';
import { boot } from './auth.js';
import { escapeHtml, fmtDate, todayISO } from './utils.js';
import { attachEvents, attachLoginEvents } from './events.js';
import { renderLogin } from './render/login.js';
import { renderProcessosView } from './render/processos.js';
import { renderKanbanView } from './render/kanban.js';
import { renderPrioridadesView } from './render/prioridades.js';
import { renderResultadosView } from './render/resultados.js';
import { renderPriorityDateView } from './render/priorityDate.js';
import { renderLembretesView } from './render/lembretes.js';

const TABS = [
  { key: 'processos', label: 'Processos', icon: 'pi-briefcase' },
  { key: 'kanban', label: 'Acompanhamento dos casos', icon: 'pi-th-large' },
  { key: 'prioridades', label: 'Prioridades', icon: 'pi-flag' },
  { key: 'resultados', label: 'Resultados', icon: 'pi-chart-bar' },
  { key: 'prioritydate', label: 'Priority Date', icon: 'pi-calendar' },
  { key: 'lembretes', label: 'Lembretes', icon: 'pi-bell' }
];

function renderChangePasswordModal(){
  if(!state.showChangePasswordForm) return '';
  return `
    <div class="modal-overlay" id="cp-overlay">
      <div class="form-card modal-card">
        <div style="font-weight:500; font-size:14px; margin-bottom:12px;">Trocar senha</div>
        <div class="form-row"><div class="form-field"><label>Nova senha</label><input type="password" id="cp-nova" placeholder="Mínimo 6 caracteres"></div></div>
        <div class="form-row"><div class="form-field"><label>Confirmar nova senha</label><input type="password" id="cp-confirmar" placeholder="Repita a nova senha"></div></div>
        ${state.changePasswordError ? `<div class="field-error">${escapeHtml(state.changePasswordError)}</div>` : ''}
        <div class="form-actions">
          <button class="btn text" id="cp-cancel">Cancelar</button>
          <button class="btn primary" id="cp-save" ${state.busy?'disabled':''}>${state.busy ? '<i class="pi pi-spinner pi-spin"></i> Salvando...' : 'Salvar nova senha'}</button>
        </div>
      </div>
    </div>
  `;
}

function renderConfirmModal(){
  if(!state.confirmDialog) return '';
  const d = state.confirmDialog;
  return `
    <div class="modal-overlay" id="confirm-overlay">
      <div class="form-card modal-card">
        <div style="font-weight:600; font-size:14.5px; margin-bottom:8px; font-family: var(--font-display);">${escapeHtml(d.title)}</div>
        <div style="font-size:13.5px; color:var(--ink-soft); line-height:1.5; margin-bottom:16px;">${escapeHtml(d.message)}</div>
        <div class="form-actions">
          <button class="btn text" id="confirm-cancel" ${state.busy?'disabled':''}>Cancelar</button>
          <button class="btn danger" id="confirm-ok" ${state.busy?'disabled':''}>${state.busy ? `<i class="pi pi-spinner pi-spin"></i> ${state.busyLabel || 'Excluindo...'}` : 'Sim, excluir'}</button>
        </div>
      </div>
    </div>
  `;
}

function renderFooter(){
  return `
    <footer class="app-footer">
      <img src="assets/logo.svg" alt="ImmigraFlow" class="app-footer__logo">
      <div class="app-footer__line">Produção independente · Todos os direitos reservados</div>
      <div class="app-footer__line">Desenvolvido por <a href="https://www.linkedin.com/in/wellington-bonjardim/" target="_blank" rel="noopener">Wellington Bonjardim</a></div>
    </footer>
  `;
}

function render(){
  const app = document.getElementById('app');
  if(!state.storageReady){ app.innerHTML = '<div class="loading-msg"><i class="pi pi-spinner pi-spin"></i><br>Carregando...</div>'; return; }

  if(!state.currentUser){
    app.innerHTML = renderLogin();
    attachLoginEvents(render);
    return;
  }

  app.innerHTML = `
    <header class="top">
      <img src="assets/logo.svg" alt="ImmigraFlow" class="top__logo">
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="today-tag">Hoje · ${fmtDate(todayISO())}</div>
        <div class="profile-menu">
          <button class="icon-btn" id="btn-profile" title="${escapeHtml(state.currentUser.email)}"><i class="pi pi-user"></i></button>
          ${state.showProfileMenu ? `
            <div class="profile-menu__dropdown">
              <div class="profile-menu__email">${escapeHtml(state.currentUser.email)}</div>
              <button class="profile-menu__item" id="menu-change-password"><i class="pi pi-undo"></i> Trocar senha</button>
              <button class="profile-menu__item" id="menu-logout"><i class="pi pi-sign-out"></i> Sair</button>
            </div>
          ` : ''}
        </div>
      </div>
    </header>
    ${state.loadError ? `<div style="background:var(--urgent-soft); border:1px solid var(--urgent); color:var(--urgent); border-radius: var(--radius); padding:12px 16px; margin-bottom:18px; font-size:13px;">${escapeHtml(state.loadError)}</div>` : ''}
    <nav class="tabs">
      ${TABS.map(t => `<button class="tabs__btn ${state.currentView===t.key?'active':''}" data-view="${t.key}"><i class="pi ${t.icon}"></i>${t.label}</button>`).join('')}
    </nav>
    <div id="view-root">
      ${state.currentView === 'processos' ? renderProcessosView() : ''}
      ${state.currentView === 'kanban' ? renderKanbanView() : ''}
      ${state.currentView === 'prioridades' ? renderPrioridadesView() : ''}
      ${state.currentView === 'resultados' ? renderResultadosView() : ''}
      ${state.currentView === 'prioritydate' ? renderPriorityDateView() : ''}
      ${state.currentView === 'lembretes' ? renderLembretesView() : ''}
    </div>
    ${renderChangePasswordModal()}
    ${renderConfirmModal()}
    ${renderFooter()}
  `;
  attachEvents(render);
}

// --- Botão "voltar ao topo": vive fora do #app, então não é recriado a cada render ---
function setupScrollTopButton(){
  const btn = document.createElement('button');
  btn.id = 'scroll-top-btn';
  btn.className = 'scroll-top-btn';
  btn.title = 'Voltar ao topo';
  btn.innerHTML = '<i class="pi pi-arrow-up"></i>';
  document.body.appendChild(btn);
  btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  window.addEventListener('scroll', () => {
    btn.classList.toggle('scroll-top-btn--visible', window.scrollY > 400);
  });
}

setupScrollTopButton();
boot(render);
