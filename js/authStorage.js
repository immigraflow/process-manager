// Adaptador de storage para o Supabase Auth: decide, em tempo real, se o
// token de sessão vai para localStorage (persiste após fechar o navegador)
// ou sessionStorage (encerra a sessão ao fechar a aba/janela).
//
// A preferência em si ("lembrar de mim?") precisa sobreviver a reloads
// para sabermos onde procurar o token, então ela mesma fica em localStorage.

const REMEMBER_FLAG = 'immigraflow-remember';

export function getRemember(){
  return localStorage.getItem(REMEMBER_FLAG) === '1';
}

export function setRemember(value){
  if(value) localStorage.setItem(REMEMBER_FLAG, '1');
  else localStorage.removeItem(REMEMBER_FLAG);
}

export const authStorage = {
  getItem(key){
    return (getRemember() ? localStorage : sessionStorage).getItem(key);
  },
  setItem(key, value){
    (getRemember() ? localStorage : sessionStorage).setItem(key, value);
  },
  removeItem(key){
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};
