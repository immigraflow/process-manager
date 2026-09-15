// Liga os elementos renderizados na tela às ações (CRUD via api.js) e re-renderiza
import { state, getCase } from './state.js';
import { doLogout, doLogin, doForgotPassword, doChangePassword } from './auth.js';
import * as api from './api.js';
import { etapaPayloadFromTemplateItem, etapaRowToLocal } from './mappers.js';
import { AOS_TEMPLATE, MARCO_DEFS, RECURSO_STEPS, RECURSO_MARCO, RECURSO_STATUS_GATILHO } from './constants.js';
import { todayISO } from './utils.js';
import { showToast } from './toast.js';

async function withBusy(render, fn, label = 'Salvando...'){
  if(state.busy) return;
  state.busy = true;
  state.busyLabel = label;
  render(); // mostra o spinner/label e desabilita o botão imediatamente, antes de esperar o servidor
  try{ await fn(); }
  catch(err){ console.error(err); showToast('Erro: ' + (err && err.message ? err.message : 'algo deu errado.'), 'error'); }
  finally{ state.busy = false; state.busyLabel = null; render(); }
}

// IMPORTANTE: como withBusy() já chama render() antes de aguardar o resultado,
// qualquer leitura de campo do formulário (document.getElementById(...).value)
// precisa acontecer ANTES de chamar withBusy — nunca dentro do callback async
// passado pra ele, porque nesse ponto o DOM antigo já foi substituído por um
// formulário em branco (e a leitura retornaria vazio).

export function attachLoginEvents(render){
  if(state.authView === 'forgot'){
    const back = document.getElementById('forgot-back');
    if(back) back.onclick = () => { state.authView = 'login'; state.authError = null; state.authInfo = null; render(); };
    const send = document.getElementById('forgot-send');
    if(send) send.onclick = () => {
      const email = document.getElementById('forgot-email').value.trim();
      if(!email){ state.authError = 'Digite seu e-mail.'; render(); return; }
      state.authError = null;
      withBusy(render, async () => {
        try{
          await doForgotPassword(email);
          state.authInfo = 'Link enviado! Confira sua caixa de entrada (e o spam).';
        }catch(err){
          state.authError = err.message;
        }
      }, 'Enviando...');
    };
    return;
  }

  const toggleBtn = document.getElementById('login-senha-toggle');
  if(toggleBtn) toggleBtn.onclick = () => {
    const input = document.getElementById('login-senha');
    const icon = toggleBtn.querySelector('i');
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    icon.className = isHidden ? 'pi pi-eye-slash' : 'pi pi-eye';
  };

  const linkForgot = document.getElementById('link-forgot');
  if(linkForgot) linkForgot.onclick = () => { state.authView = 'forgot'; state.authError = null; state.authInfo = null; render(); };

  const btn = document.getElementById('login-btn');
  const submit = () => {
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;
    const remember = document.getElementById('login-remember').checked;
    if(!email || !senha){ state.authError = 'Preencha e-mail e senha.'; render(); return; }
    doLogin(email, senha, remember, render);
  };
  if(btn) btn.onclick = submit;
  ['login-email','login-senha'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.onkeydown = (ev) => { if(ev.key === 'Enter') submit(); };
  });
}

export function attachProfileMenuEvents(render){
  const profileBtn = document.getElementById('btn-profile');
  if(profileBtn) profileBtn.onclick = (ev) => { ev.stopPropagation(); state.showProfileMenu = !state.showProfileMenu; render(); };

  if(state.showProfileMenu){
    // fecha o menu ao clicar fora dele
    setTimeout(() => { document.addEventListener('click', closeOnce, { once: true }); }, 0);
    function closeOnce(){ if(state.showProfileMenu){ state.showProfileMenu = false; render(); } }
  }

  const itemChangePwd = document.getElementById('menu-change-password');
  if(itemChangePwd) itemChangePwd.onclick = (ev) => { ev.stopPropagation(); state.showProfileMenu = false; state.showChangePasswordForm = true; state.changePasswordError = null; render(); };

  const itemLogout = document.getElementById('menu-logout');
  if(itemLogout) itemLogout.onclick = (ev) => { ev.stopPropagation(); withBusy(render, () => doLogout(render), 'Saindo...'); };

  const cpCancel = document.getElementById('cp-cancel');
  if(cpCancel) cpCancel.onclick = () => { state.showChangePasswordForm = false; render(); };
  const cpSave = document.getElementById('cp-save');
  if(cpSave) cpSave.onclick = () => {
    const nova = document.getElementById('cp-nova').value;
    const confirmar = document.getElementById('cp-confirmar').value;
    if(!nova || nova.length < 6){ state.changePasswordError = 'A senha precisa ter pelo menos 6 caracteres.'; render(); return; }
    if(nova !== confirmar){ state.changePasswordError = 'As senhas não coincidem.'; render(); return; }
    state.changePasswordError = null;
    withBusy(render, async () => {
      await doChangePassword(nova);
      state.showChangePasswordForm = false;
    });
  };
}

/** Modal de confirmação genérico (substitui os confirm()/alert() nativos) */
export function attachConfirmDialogEvents(render){
  const overlay = document.getElementById('confirm-overlay');
  if(!overlay) return;
  const cancelBtn = document.getElementById('confirm-cancel');
  if(cancelBtn) cancelBtn.onclick = () => { state.confirmDialog = null; render(); };
  const okBtn = document.getElementById('confirm-ok');
  if(okBtn) okBtn.onclick = () => {
    const dialog = state.confirmDialog;
    if(!dialog) return;
    withBusy(render, async () => {
      await dialog.onConfirm();
      state.confirmDialog = null;
    }, dialog.busyLabel || 'Excluindo...');
  };
}

export function attachEvents(render){
  attachProfileMenuEvents(render);
  attachConfirmDialogEvents(render);

  document.querySelectorAll('[data-view]').forEach(el => { el.onclick = () => { state.currentView = el.getAttribute('data-view'); render(); }; });

  const caseSearch = document.getElementById('case-search-input');
  if(caseSearch){
    caseSearch.oninput = () => {
      state.caseSearchQuery = caseSearch.value;
      const cursorPos = caseSearch.selectionStart;
      render();
      const newInput = document.getElementById('case-search-input');
      if(newInput){ newInput.focus(); newInput.setSelectionRange(cursorPos, cursorPos); }
    };
  }

  const btnNewCase = document.getElementById('btn-new-case');
  if(btnNewCase) btnNewCase.onclick = () => { state.editingCaseId = null; state.showNewCaseForm = !state.showNewCaseForm; render(); };
  const ncCancel = document.getElementById('nc-cancel');
  if(ncCancel) ncCancel.onclick = () => { state.showNewCaseForm = false; state.editingCaseId = null; render(); };
  const ncSave = document.getElementById('nc-save');
  if(ncSave) ncSave.onclick = () => {
    const nome = document.getElementById('nc-nome').value.trim();
    const numero = document.getElementById('nc-numero').value.trim();
    const cliente = document.getElementById('nc-cliente').value.trim();
    if(!nome){ document.getElementById('nc-error').style.display = 'block'; return; }
    const editCaseId = ncSave.getAttribute('data-case');
    withBusy(render, async () => {
      if(editCaseId){
        await api.dbUpdateCase(editCaseId, { nome, numero: numero || null, cliente: cliente || null });
        const c = getCase(editCaseId);
        if(c){ c.nome = nome; c.numero = numero; c.cliente = cliente; }
        state.editingCaseId = null;
        showToast('Processo atualizado com sucesso!');
      } else {
        const row = await api.dbInsertCase(state.orgId, nome, numero, cliente);
        // 1 única requisição para inserir todas as etapas padrão de uma vez
        const payloads = state.data.template.map((t, i) => {
          const p = etapaPayloadFromTemplateItem(t, i);
          p.case_id = row.id;
          return p;
        });
        const etapaRows = await api.dbInsertEtapasBulk(payloads);
        etapaRows.sort((a,b) => a.ordem - b.ordem);
        const newCase = { id: row.id, nome: row.nome, numero: row.numero||'', cliente: row.cliente||'', nvcAosChoice: null, etapas: etapaRows.map(etapaRowToLocal) };
        state.data.cases.unshift(newCase);
        state.selectedCaseId = newCase.id;
        state.showNewCaseForm = false;
        showToast('Processo incluído com sucesso!');
      }
    });
  };

  document.querySelectorAll('[data-edit-case]').forEach(el => { el.onclick = (ev) => { ev.stopPropagation(); state.editingCaseId = el.getAttribute('data-edit-case'); state.showNewCaseForm = false; render(); }; });

  document.querySelectorAll('[data-case-id]').forEach(el => { el.onclick = () => { state.selectedCaseId = el.getAttribute('data-case-id'); state.showEtapaFormFor = null; state.editingEtapaId = null; render(); }; });

  const btnDeleteCase = document.getElementById('btn-delete-case');
  if(btnDeleteCase) btnDeleteCase.onclick = () => {
    state.confirmDialog = {
      title: 'Excluir processo',
      message: 'Tem certeza que deseja excluir este processo e todas as suas etapas? Esta ação não poderá ser desfeita.',
      busyLabel: 'Excluindo...',
      onConfirm: async () => {
        await api.dbDeleteCase(state.selectedCaseId);
        state.data.cases = state.data.cases.filter(c => c.id !== state.selectedCaseId);
        state.selectedCaseId = state.data.cases.length ? state.data.cases[0].id : null;
        showToast('Processo excluído.');
      }
    };
    render();
  };

  const btnAddEtapa = document.getElementById('btn-add-etapa');
  if(btnAddEtapa) btnAddEtapa.onclick = () => { state.showEtapaFormFor = state.selectedCaseId; render(); };

  const btnApplyTemplate = document.getElementById('btn-apply-template');
  if(btnApplyTemplate) btnApplyTemplate.onclick = () => {
    const caseId = btnApplyTemplate.getAttribute('data-case');
    withBusy(render, async () => {
      const c = getCase(caseId);
      const existingTitles = c.etapas.map(e => e.titulo.trim().toLowerCase());
      const toAdd = state.data.template.filter(t => !existingTitles.includes(t.titulo.trim().toLowerCase()));
      if(toAdd.length === 0){ showToast('Todas as etapas padrão já estão presentes neste processo.', 'info'); return; }
      let ordem = c.etapas.length;
      const payloads = toAdd.map(t => { const p = etapaPayloadFromTemplateItem(t, ordem++); p.case_id = c.id; return p; });
      const rows = await api.dbInsertEtapasBulk(payloads);
      rows.sort((a,b) => a.ordem - b.ordem);
      rows.forEach(row => c.etapas.push(etapaRowToLocal(row)));
      showToast('Etapas padrão aplicadas!');
    });
  };

  const btnTemplate = document.getElementById('btn-template');
  if(btnTemplate) btnTemplate.onclick = () => { state.showTemplateManager = !state.showTemplateManager; state.showNewCaseForm = false; render(); };
  const tplClose = document.getElementById('tpl-close');
  if(tplClose) tplClose.onclick = () => { state.showTemplateManager = false; render(); };
  const tplAdd = document.getElementById('tpl-add');
  if(tplAdd) tplAdd.onclick = () => {
    const titulo = document.getElementById('tpl-new-input').value.trim();
    if(!titulo) return;
    withBusy(render, async () => {
      const row = await api.dbInsertTemplateItem(state.orgId, titulo, state.data.template.length);
      state.data.template.push({ id: row.id, titulo: row.titulo, tipo: row.tipo, marcoTipo: row.marco_tipo, reminderDays: row.reminder_days });
      showToast('Etapa padrão adicionada.');
    });
  };
  wireTemplateDragAndDrop(render);
  document.querySelectorAll('[data-tpl-delete]').forEach(el => { el.onclick = () => withBusy(render, async () => {
    const id = el.getAttribute('data-tpl-delete');
    await api.dbDeleteTemplateItem(id);
    state.data.template = state.data.template.filter(t => t.id !== id);
    showToast('Etapa padrão removida.');
  }, 'Excluindo...'); });

  wireEtapaForm('ne', render);
  wireEtapaForm('ee', render);

  // Mostra/esconde o campo de recurso conforme o status selecionado no formulário do marco
  const marcoStatusSelect = document.getElementById('ee-m-status');
  const recursoWrap = document.getElementById('ee-m-recurso-wrap');
  if(marcoStatusSelect && recursoWrap){
    marcoStatusSelect.onchange = () => {
      recursoWrap.style.display = RECURSO_STATUS_GATILHO.includes(marcoStatusSelect.value) ? '' : 'none';
    };
  }

  const saveMarcoBtn = document.getElementById('ee-save-marco');
  if(saveMarcoBtn) saveMarcoBtn.onclick = () => {
    const c = getCase(saveMarcoBtn.getAttribute('data-case'));
    const e = c.etapas.find(x => x.id === saveMarcoBtn.getAttribute('data-etapa'));
    const def = MARCO_DEFS[e.marcoTipo];
    const titulo = document.getElementById('ee-titulo').value.trim() || e.titulo;
    const obs = document.getElementById('ee-obs').value.trim();
    const status = document.getElementById('ee-m-status').value;
    let marco = { ...e.marco };

    if(e.marcoTipo === 'pwd'){
      marco.houveRfi = document.getElementById('ee-m-houverfi').value === 'sim';
      marco.rfiData = document.getElementById('ee-m-rfidata').value;
      marco.rfiPrazo = document.getElementById('ee-m-rfiprazo').value;
      marco.dataEmissao = document.getElementById('ee-m-emissao').value;
      marco.validade = document.getElementById('ee-m-validade').value;
    } else if(e.marcoTipo === 'eta9089'){
      marco.dataEmissao = document.getElementById('ee-m-emissao').value;
      marco.validade = document.getElementById('ee-m-validade').value;
    } else if(e.marcoTipo === 'i140'){
      marco.dataProtocolo = document.getElementById('ee-m-protocolo').value;
      marco.dataPrioridade = document.getElementById('ee-m-prioridade').value;
      marco.validade = document.getElementById('ee-m-validade').value;
    } else if(e.marcoTipo === 'recurso_decisao'){
      const recursoEl = document.getElementById('ee-m-recurso');
      marco.recursoTipo = recursoEl ? recursoEl.value : (marco.recursoTipo || '');
    }

    withBusy(render, async () => {
      await api.dbUpdateEtapa(e.id, { titulo, obs, status, marco });
      e.titulo = titulo; e.obs = obs; e.status = status; e.marco = marco;

      if(status === 'emitido' && marco.validade){
        const alvo = c.etapas.find(x => x.tipo === 'normal' && (x.titulo||'').trim().toLowerCase() === 'protocolar o eta 9089');
        if(alvo){ await api.dbUpdateEtapa(alvo.id, { prazo: marco.validade }); alvo.prazo = marco.validade; }
      }
      if(status === 'certificado' && marco.validade){
        const alvo = c.etapas.find(x => x.tipo === 'marco' && x.marcoTipo === 'i140');
        if(alvo){ const novoMarco = { ...alvo.marco, prazoAlvo: marco.validade }; await api.dbUpdateEtapa(alvo.id, { marco: novoMarco }); alvo.marco = novoMarco; }
      }

      // Recurso (L3): sempre que uma decisão vem negada/RFE/rejeitada e um recurso é
      // selecionado, gera uma nova rodada de etapas + um novo marco de decisão ao final
      // — que pode, por sua vez, disparar outra rodada (loop), pois usa o mesmo tipo de marco.
      if(e.marcoTipo === 'recurso_decisao' && RECURSO_STATUS_GATILHO.includes(status) && marco.recursoTipo && marco.recursoTipo !== marco.recursoAplicadoPara){
        let ordem = c.etapas.length;
        const payloads = RECURSO_STEPS.map(t => { const p = etapaPayloadFromTemplateItem(t, ordem++); p.case_id = c.id; return p; });
        const marcoPayload = etapaPayloadFromTemplateItem(RECURSO_MARCO, ordem++);
        marcoPayload.case_id = c.id;
        payloads.push(marcoPayload);
        const rows = await api.dbInsertEtapasBulk(payloads);
        rows.sort((a,b) => a.ordem - b.ordem);
        rows.forEach(row => c.etapas.push(etapaRowToLocal(row)));
        marco.recursoAplicadoPara = marco.recursoTipo;
        await api.dbUpdateEtapa(e.id, { marco });
        e.marco = marco;
        showToast('Nova lista de etapas de recurso adicionada à linha do tempo!');
      }

      const doneKeys = def.doneKeys || [def.doneKey];
      if(doneKeys.includes(status)) await api.completeUpToDb(c, e.id);
      state.editingEtapaId = null;
      showToast('Marco atualizado com sucesso!');
    });
  };

  document.querySelectorAll('[data-status-etapa]').forEach(el => {
    el.onchange = () => withBusy(render, async () => {
      const c = getCase(el.getAttribute('data-case'));
      const e = c.etapas.find(x => x.id === el.getAttribute('data-status-etapa'));
      const novoStatus = el.value;
      await api.dbUpdateEtapa(e.id, { status: novoStatus });
      e.status = novoStatus;
      if(novoStatus === 'concluido') await api.completeUpToDb(c, e.id);
    });
  });

  document.querySelectorAll('[data-edit-etapa]').forEach(el => { el.onclick = () => { state.editingEtapaId = el.getAttribute('data-edit-etapa'); state.showEtapaFormFor = null; render(); }; });
  document.querySelectorAll('[data-delete-etapa]').forEach(el => {
    el.onclick = () => {
      const caseId = el.getAttribute('data-case');
      const etapaId = el.getAttribute('data-delete-etapa');
      state.confirmDialog = {
        title: 'Excluir etapa',
        message: 'Tem certeza que deseja excluir esta etapa? Esta ação não poderá ser desfeita.',
        busyLabel: 'Excluindo...',
        onConfirm: async () => {
          const c = getCase(caseId);
          await api.dbDeleteEtapa(etapaId);
          c.etapas = c.etapas.filter(x => x.id !== etapaId);
          showToast('Etapa excluída.');
        }
      };
      render();
    };
  });

  document.querySelectorAll('[data-nvc-aos]').forEach(el => {
    el.onclick = () => withBusy(render, async () => {
      const c = getCase(el.getAttribute('data-case'));
      const choice = el.getAttribute('data-nvc-aos');
      await api.dbUpdateCase(c.id, { nvc_aos_choice: choice });
      c.nvcAosChoice = choice;
      if(choice === 'aos' && !c.etapas.some(e => e.colecao === 'aos')){
        let ordem = c.etapas.length;
        const payloads = AOS_TEMPLATE.map(t => { const p = etapaPayloadFromTemplateItem(t, ordem++); p.case_id = c.id; return p; });
        const rows = await api.dbInsertEtapasBulk(payloads);
        rows.sort((a,b) => a.ordem - b.ordem);
        rows.forEach(row => c.etapas.push(etapaRowToLocal(row)));
      }
    });
  });

  const resultMonthInput = document.getElementById('result-month');
  if(resultMonthInput) resultMonthInput.onchange = () => { state.resultMonth = resultMonthInput.value; render(); };
  const evAdd = document.getElementById('ev-add');
  if(evAdd) evAdd.onclick = () => {
    const tipo = document.getElementById('ev-tipo').value;
    const dataVal = document.getElementById('ev-data').value;
    const caso = document.getElementById('ev-caso').value.trim();
    if(!dataVal) return;
    withBusy(render, async () => {
      const row = await api.dbInsertEvento(state.orgId, tipo, dataVal, caso);
      state.data.eventos.unshift({ id: row.id, tipo: row.tipo, data: row.data, caso: row.caso || '' });
      showToast('Evento registrado com sucesso!');
    });
  };
  document.querySelectorAll('[data-del-evento]').forEach(el => { el.onclick = () => withBusy(render, async () => {
    const id = el.getAttribute('data-del-evento');
    await api.dbDeleteEvento(id);
    state.data.eventos = state.data.eventos.filter(ev => ev.id !== id);
    showToast('Evento removido.');
  }, 'Excluindo...'); });

  const pdQuery = document.getElementById('pd-query');
  if(pdQuery) pdQuery.onchange = () => { state.priorityDateQuery = pdQuery.value; render(); };

  const kanbanSearch = document.getElementById('kanban-search-input');
  if(kanbanSearch) kanbanSearch.oninput = () => {
    state.kanbanSearchQuery = kanbanSearch.value;
    const cursorPos = kanbanSearch.selectionStart;
    render();
    const newInput = document.getElementById('kanban-search-input');
    if(newInput){ newInput.focus(); newInput.setSelectionRange(cursorPos, cursorPos); }
  };
  const kanbanStatusFilter = document.getElementById('kanban-status-filter');
  if(kanbanStatusFilter) kanbanStatusFilter.onchange = () => { state.kanbanStatusFilter = kanbanStatusFilter.value; render(); };
  wireKanbanDragAndDrop(render);

  const resTipo = document.getElementById('res-filter-tipo');
  if(resTipo) resTipo.onchange = () => { state.resultadosFilterTipo = resTipo.value; render(); };
  const resData = document.getElementById('res-filter-data');
  if(resData) resData.onchange = () => { state.resultadosFilterData = resData.value; render(); };
  const resCaso = document.getElementById('res-filter-caso');
  if(resCaso) resCaso.oninput = () => {
    state.resultadosFilterCaso = resCaso.value;
    const cursorPos = resCaso.selectionStart;
    render();
    const newInput = document.getElementById('res-filter-caso');
    if(newInput){ newInput.focus(); newInput.setSelectionRange(cursorPos, cursorPos); }
  };
}

/** Mapa: coluna do kanban -> status a aplicar na etapa "normal" solta ali */
const KANBAN_COLUMN_TO_STATUS = {
  liberada: 'nao_iniciado',
  andamento: 'confeccao',
  revisao: 'revisao',
  urgente: 'pendencia'
};

function wireKanbanDragAndDrop(render){
  document.querySelectorAll('[data-kanban-etapa]').forEach(card => {
    card.ondragstart = (ev) => {
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('text/plain', JSON.stringify({
        etapaId: card.getAttribute('data-kanban-etapa'),
        caseId: card.getAttribute('data-kanban-case')
      }));
      card.classList.add('kanban-card--dragging');
    };
    card.ondragend = () => card.classList.remove('kanban-card--dragging');
  });

  document.querySelectorAll('[data-kanban-drop]').forEach(col => {
    col.ondragover = (ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; col.classList.add('kanban-col--drop-target'); };
    col.ondragleave = () => col.classList.remove('kanban-col--drop-target');
    col.ondrop = (ev) => {
      ev.preventDefault();
      col.classList.remove('kanban-col--drop-target');
      const targetCat = col.getAttribute('data-kanban-drop');
      const newStatus = KANBAN_COLUMN_TO_STATUS[targetCat];
      let payload;
      try{ payload = JSON.parse(ev.dataTransfer.getData('text/plain')); }catch(e){ return; }
      if(!payload || !newStatus) return;
      withBusy(render, async () => {
        const c = getCase(payload.caseId);
        const e = c.etapas.find(x => x.id === payload.etapaId);
        if(!e || e.status === newStatus) return;
        await api.dbUpdateEtapa(e.id, { status: newStatus });
        e.status = newStatus;
        showToast('Processo movido — linha do tempo atualizada.');
      });
    };
  });
}

function wireTemplateDragAndDrop(render){
  const items = document.querySelectorAll('[data-tpl-drag]');
  let dragIndex = null;

  items.forEach(el => {
    el.ondragstart = (ev) => {
      dragIndex = Number(el.getAttribute('data-tpl-index'));
      ev.dataTransfer.effectAllowed = 'move';
      el.classList.add('template-item--dragging');
    };
    el.ondragend = () => el.classList.remove('template-item--dragging');
    el.ondragover = (ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; el.classList.add('template-item--drop-target'); };
    el.ondragleave = () => el.classList.remove('template-item--drop-target');
    el.ondrop = (ev) => {
      ev.preventDefault();
      el.classList.remove('template-item--drop-target');
      const dropIndex = Number(el.getAttribute('data-tpl-index'));
      if(dragIndex === null || dragIndex === dropIndex) return;
      withBusy(render, async () => {
        const list = state.data.template;
        const [moved] = list.splice(dragIndex, 1);
        list.splice(dropIndex, 0, moved);
        await Promise.all(list.map((t, i) => api.dbUpdateTemplateOrdem(t.id, i)));
        showToast('Ordem das etapas padrão atualizada.');
      });
    };
  });
}

function wireEtapaForm(prefix, render){
  const cancelBtn = document.getElementById(`${prefix}-cancel`);
  if(cancelBtn) cancelBtn.onclick = () => { state.showEtapaFormFor = null; state.editingEtapaId = null; render(); };

  const saveBtn = document.getElementById(`${prefix}-save`);
  if(saveBtn) saveBtn.onclick = () => {
    const tituloEl = document.getElementById(`${prefix}-titulo`);
    if(!tituloEl) return;
    const titulo = tituloEl.value.trim();
    if(!titulo){ document.getElementById(`${prefix}-error`).style.display = 'block'; return; }
    const dataVal = document.getElementById(`${prefix}-data`).value;
    const prazoVal = document.getElementById(`${prefix}-prazo`).value;
    const obsVal = document.getElementById(`${prefix}-obs`).value.trim();
    const statusVal = document.getElementById(`${prefix}-status`).value;
    const caseId = saveBtn.getAttribute('data-case');
    const etapaId = saveBtn.getAttribute('data-etapa');

    withBusy(render, async () => {
      const c = getCase(caseId);
      if(etapaId){
        await api.dbUpdateEtapa(etapaId, { titulo, data: dataVal || null, prazo: prazoVal || null, obs: obsVal, status: statusVal });
        const e = c.etapas.find(x => x.id === etapaId);
        e.titulo = titulo; e.data = dataVal; e.prazo = prazoVal; e.obs = obsVal; e.status = statusVal;
        if(statusVal === 'concluido') await api.completeUpToDb(c, e.id);
        state.editingEtapaId = null;
        showToast('Etapa atualizada com sucesso!');
      } else {
        const payload = {
          case_id: caseId, titulo, tipo: 'normal', marco_tipo: null, status: statusVal,
          data: dataVal || null, prazo: prazoVal || null, obs: obsVal, colecao: 'padrao',
          reminder_days: null, reminder_requires_confeccao: false, reminder_start: dataVal || todayISO(),
          marco: {}, ordem: c.etapas.length
        };
        const row = await api.dbInsertEtapa(payload);
        const newE = etapaRowToLocal(row);
        c.etapas.push(newE);
        if(statusVal === 'concluido') await api.completeUpToDb(c, newE.id);
        state.showEtapaFormFor = null;
        showToast('Etapa adicionada com sucesso!');
      }
    });
  };
}
