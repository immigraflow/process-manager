// Sistema simples de notificações (toast), independente de framework.
// Cria/usa um container fixo no <body> (fora do #app, então sobrevive aos re-renders).

let container = null;

function ensureContainer(){
  if(container) return container;
  container = document.createElement('div');
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

/**
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
export function showToast(message, type = 'success'){
  const c = ensureContainer();
  const icon = type === 'success' ? 'pi-check-circle' : type === 'error' ? 'pi-times-circle' : 'pi-info-circle';
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.innerHTML = `<i class="pi ${icon}"></i><span>${message}</span>`;
  c.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast--visible'));
  setTimeout(() => {
    el.classList.remove('toast--visible');
    setTimeout(() => el.remove(), 250);
  }, 3200);
}
