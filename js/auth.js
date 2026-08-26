// Autenticação: login/logout, "esqueci minha senha" e troca de senha
import { sb } from './config.js';
import { state } from './state.js';
import { dbGetOrgId, dbFetchAll } from './api.js';
import { setRemember } from './authStorage.js';
import { showToast } from './toast.js';

export async function boot(render){
  const { data: sessionData } = await sb.auth.getSession();
  if(sessionData && sessionData.session){
    await afterLogin(sessionData.session.user, render);
  } else {
    state.storageReady = true;
    render();
  }
}

export async function afterLogin(user, render){
  state.currentUser = user;
  try{
    state.orgId = await dbGetOrgId(user.id);
    const fresh = await dbFetchAll(state.orgId);
    state.data = fresh;
    if(state.data.cases.length && !state.selectedCaseId) state.selectedCaseId = state.data.cases[0].id;
    state.loadError = null;
  }catch(err){
    console.error(err);
    state.loadError = 'Não foi possível carregar seus processos: ' + err.message;
  }
  state.storageReady = true;
  render();
}

export async function doLogin(email, senha, remember, render){
  state.authError = null; state.authLoading = true; render();
  setRemember(remember);
  const { data: signInData, error } = await sb.auth.signInWithPassword({ email, password: senha });
  state.authLoading = false;
  if(error){
    state.authError = error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message;
    render();
    return;
  }
  await afterLogin(signInData.user, render);
}

export async function doLogout(render){
  await sb.auth.signOut();
  state.currentUser = null; state.orgId = null; state.data = { cases: [], template: [], eventos: [] };
  state.selectedCaseId = null; state.currentView = 'processos'; state.showProfileMenu = false;
  render();
}

export async function doForgotPassword(email){
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if(error) throw error;
}

export async function doChangePassword(newPassword){
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if(error) throw error;
  showToast('Senha alterada com sucesso!');
}
