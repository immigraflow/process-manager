import { state } from '../state.js';
import { escapeHtml } from '../utils.js';

export function renderLogin(){
  if(state.authView === 'forgot') return renderForgotPassword();

  return `
    <div class="login-wrap">
      <div class="login-card">
        <img src="assets/logo.svg" alt="ImmigraFlow" class="login-card__logo">
        <div class="form-row"><div class="form-field"><label>E-mail</label><input type="email" id="login-email" placeholder="voce@escritorio.com"></div></div>
        <div class="form-row">
          <div class="form-field">
            <label>Senha</label>
            <div class="password-field">
              <input type="password" id="login-senha" placeholder="••••••••">
              <button type="button" class="password-field__toggle" id="login-senha-toggle" tabindex="-1" title="Mostrar/ocultar senha"><i class="pi pi-eye"></i></button>
            </div>
          </div>
        </div>
        <div class="login-row-between">
          <label class="checkbox-field">
            <input type="checkbox" id="login-remember">
            <span>Permanecer conectado</span>
          </label>
          <button type="button" class="link-btn" id="link-forgot">Esqueci a senha</button>
        </div>
        ${state.authError ? `<div class="field-error">${escapeHtml(state.authError)}</div>` : ''}
        <button class="btn primary" id="login-btn" style="width:100%; margin-top:14px;" ${state.authLoading ? 'disabled' : ''}>
          ${state.authLoading ? '<i class="pi pi-spinner pi-spin"></i> Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  `;
}

function renderForgotPassword(){
  return `
    <div class="login-wrap">
      <div class="login-card">
        <img src="assets/logo.svg" alt="ImmigraFlow" class="login-card__logo">
        <div class="login-sub">Informe seu e-mail. Vamos te enviar um link para redefinir a senha.</div>
        <div class="form-row"><div class="form-field"><label>E-mail</label><input type="email" id="forgot-email" placeholder="voce@escritorio.com"></div></div>
        ${state.authError ? `<div class="field-error">${escapeHtml(state.authError)}</div>` : ''}
        ${state.authInfo ? `<div class="field-hint" style="color:var(--done);">${escapeHtml(state.authInfo)}</div>` : ''}
        <div class="form-actions" style="justify-content:space-between; margin-top:10px;">
          <button class="btn text" id="forgot-back">Voltar ao login</button>
          <button class="btn primary" id="forgot-send" ${state.authLoading ? 'disabled' : ''}>${state.authLoading ? '<i class="pi pi-spinner pi-spin"></i> Enviando...' : 'Enviar link'}</button>
        </div>
      </div>
    </div>
  `;
}
