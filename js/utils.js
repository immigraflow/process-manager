// Funções utilitárias puras (datas, formatação, escape de HTML)
export function todayISO(){ return new Date().toISOString().slice(0,10); }
export function fmtDate(iso){ if(!iso) return ''; const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`; }
export function daysBetween(isoFrom, isoTo){ const a = new Date(isoFrom+'T00:00:00'); const b = new Date(isoTo+'T00:00:00'); return Math.round((b-a)/86400000); }
export function daysUntil(iso){ if(!iso) return null; return daysBetween(todayISO(), iso); }
export function escapeHtml(str){ const div = document.createElement('div'); div.textContent = str || ''; return div.innerHTML; }
