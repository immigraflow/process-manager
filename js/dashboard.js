// Cálculos do dashboard da aba Início. Funções puras: recebem os dados e devolvem números,
// reaproveitando as regras de domain.js (urgência, categoria do Kanban, prazos, resultados).
import { KANBAN_COLUMNS, AOS_TEMPLATE, RECURSO_STEPS, RECURSO_MARCO } from './constants.js';
import { caseFullyDone, caseOverallStatus, currentEtapa, computeCategory, computeResultados, nearestDeadline } from './domain.js';
import { findI140Marco } from './state.js';
import { todayISO } from './utils.js';

export const FASES = ['PWD', 'Recrutamento e ETA 9089', 'I-140', 'AOS e recursos'];
export const TIPOS_BONUS = ['RFE', 'NPT', 'MOTION', 'Appeal'];
export const DECISOES = [
  { key: 'aprovado', label: 'Aprovado' },
  { key: 'negado', label: 'Negado' },
  { key: 'rfe', label: 'RFE' },
  { key: 'rejeitado', label: 'Rejeitado' }
];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const norm = s => (s || '').trim().toLowerCase();

// "Fase final" do fluxo principal: a partir da liberação dos documentos para assinatura do empregador.
const TITULO_INICIO_FASE_FINAL = 'liberar docs para assinatura do empregador';
// "Fase final" de AOS e de recursos: da montagem do package em diante (índice 4 das duas listas).
const TITULOS_FASE_FINAL_AOS = new Set(
  [...AOS_TEMPLATE.slice(4), ...RECURSO_STEPS.slice(4), RECURSO_MARCO].map(t => norm(t.titulo))
);

/** Concluído = todas as etapas concluídas, ou via NVC ("atuação finalizada"). */
export function isConcluido(c){ return caseFullyDone(c) || c.nvcAosChoice === 'nvc'; }

/** 'concluido' | 'fora' | 'proximo' | 'emdia' (sem prazo definido conta como em dia) */
export function situacaoDoCaso(c){
  if(isConcluido(c)) return 'concluido';
  const s = caseOverallStatus(c);
  if(s === 'vencido') return 'fora';
  if(s === 'proximo') return 'proximo';
  return 'emdia';
}

/** Fase em que o processo está, pela posição da etapa atual em relação aos marcos PWD e ETA 9089. */
export function faseAtual(c){
  const cur = currentEtapa(c);
  if(!cur) return null;
  if(cur.colecao === 'aos') return 'AOS e recursos';
  const principais = c.etapas.filter(e => e.colecao !== 'aos');
  const idx = principais.indexOf(cur);
  const iPwd = principais.findIndex(e => e.tipo === 'marco' && e.marcoTipo === 'pwd');
  const iEta = principais.findIndex(e => e.tipo === 'marco' && e.marcoTipo === 'eta9089');
  if(iPwd >= 0 && idx <= iPwd) return 'PWD';
  if(iEta >= 0 && idx <= iEta) return 'Recrutamento e ETA 9089';
  return 'I-140';
}

export function emFaseFinal(c){
  if(isConcluido(c)) return false;
  const cur = currentEtapa(c);
  if(!cur) return false;
  if(cur.colecao === 'aos') return TITULOS_FASE_FINAL_AOS.has(norm(cur.titulo));
  const principais = c.etapas.filter(e => e.colecao !== 'aos');
  const iFinal = principais.findIndex(e => norm(e.titulo) === TITULO_INICIO_FASE_FINAL);
  return iFinal >= 0 && principais.indexOf(cur) >= iFinal;
}

/** Lista de meses 'AAAA-MM' do período: '6' e '12' = últimos N meses (incluindo o atual); 'ano' = janeiro até o mês atual. */
export function listarMeses(periodo, hojeISO = todayISO()){
  const [y, m] = hojeISO.slice(0, 7).split('-').map(Number);
  const out = [];
  if(periodo === 'ano'){
    for(let i = 1; i <= m; i++) out.push(`${y}-${String(i).padStart(2, '0')}`);
    return out;
  }
  const n = Number(periodo) || 12;
  for(let k = n - 1; k >= 0; k--){
    const d = new Date(Date.UTC(y, m - 1 - k, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

/** Rótulo curto do mês; mostra o ano (2 dígitos) no primeiro mês da série e em janeiro. */
export function rotuloMes(key, i){
  const [y, m] = key.split('-').map(Number);
  return MESES[m - 1] + (i === 0 || m === 1 ? `’${String(y).slice(2)}` : '');
}

export function computeDashboard(data, periodo = '12', hojeISO = todayISO()){
  const cases = data.cases || [];
  const total = cases.length;
  const abertos = cases.filter(c => !isConcluido(c));

  const situacao = { emdia: 0, proximo: 0, fora: 0, concluido: 0 };
  cases.forEach(c => { situacao[situacaoDoCaso(c)]++; });

  const fases = Object.fromEntries(FASES.map(f => [f, 0]));
  const trabalho = Object.fromEntries(KANBAN_COLUMNS.map(col => [col.key, 0]));
  const travadas = {};
  abertos.forEach(c => {
    const cur = currentEtapa(c);
    if(!cur) return;
    const fase = faseAtual(c);
    if(fase) fases[fase]++;
    const cat = computeCategory(cur);
    if(cat && trabalho[cat] !== undefined) trabalho[cat]++;
    if(cat === 'urgente') travadas[cur.titulo] = (travadas[cur.titulo] || 0) + 1;
  });
  const gargalos = Object.entries(travadas).map(([titulo, n]) => ({ titulo, n })).sort((a, b) => b.n - a.n || a.titulo.localeCompare(b.titulo)).slice(0, 5);

  const meses = listarMeses(periodo, hojeISO).map((key, i) => {
    const r = computeResultados(data, key);
    return { key, label: rotuloMes(key, i), pwd: r.pwd, eta9089: r.eta9089, i140: r.i140, bonus: r.bonus };
  });

  const decisoes = Object.fromEntries(DECISOES.map(d => [d.key, 0]));
  cases.forEach(c => c.etapas.forEach(e => {
    if(e.tipo === 'marco' && e.marcoTipo === 'recurso_decisao' && decisoes[e.status] !== undefined) decisoes[e.status]++;
  }));

  const porAno = {};
  cases.forEach(c => {
    const m = findI140Marco(c);
    if(m && m.status === 'protocolado' && m.marco && m.marco.dataPrioridade){
      const ano = m.marco.dataPrioridade.slice(0, 4);
      porAno[ano] = (porAno[ano] || 0) + 1;
    }
  });
  const prioridadePorAno = Object.keys(porAno).sort().map(ano => ({ ano, n: porAno[ano] }));

  const proximos = abertos
    .map(c => ({ c, nearest: nearestDeadline(c) }))
    .filter(x => x.nearest)
    .sort((a, b) => a.nearest.date.localeCompare(b.nearest.date))
    .slice(0, 5);

  return {
    total,
    concluidos: situacao.concluido,
    andamento: abertos.length,
    faseFinal: abertos.filter(emFaseFinal).length,
    foraPrazo: situacao.fora,
    situacao, fases, trabalho, gargalos, meses, decisoes, prioridadePorAno, proximos
  };
}
