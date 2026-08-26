import { state } from '../state.js';
import { WEEKDAYS } from '../constants.js';
import { isEtapaDone, nextOccurrence } from '../domain.js';
import { escapeHtml, daysUntil, fmtDate } from '../utils.js';

export function renderLembretesView(){
  const recorrentes = [];
  const cobrancas = [];
  state.data.cases.forEach(c => {
    c.etapas.forEach(e => {
      const gate = e.tipo === 'normal' && !isEtapaDone(e) && e.reminderDays && (!e.reminderRequiresConfeccao || e.status === 'confeccao');
      if(gate){
        const nxt = nextOccurrence(e);
        recorrentes.push({ c, e, nxt, weekday: new Date(nxt+'T00:00:00').getDay(), due: daysUntil(nxt) === 0 });
      }
      if(e.tipo === 'normal' && !isEtapaDone(e) && e.prazo && daysUntil(e.prazo) < 0){
        cobrancas.push({ c, titulo: e.titulo, dias: Math.abs(daysUntil(e.prazo)) });
      }
      if(e.tipo === 'marco' && e.marcoTipo === 'pwd' && e.marco.houveRfi && e.status !== 'emitido' && e.marco.rfiPrazo && daysUntil(e.marco.rfiPrazo) < 0){
        cobrancas.push({ c, titulo: 'Resposta ao RFI do PWD', dias: Math.abs(daysUntil(e.marco.rfiPrazo)) });
      }
    });
  });

  return `
    <div class="lembrete-section">
      <h3>Lembretes recorrentes por dia da semana</h3>
      ${recorrentes.length === 0 ? '<div class="kanban-empty">Nenhuma etapa com revisão periódica no momento.</div>' :
        WEEKDAYS.map(w => {
          const items = recorrentes.filter(r => r.weekday === w.idx);
          if(!items.length) return '';
          return `
            <div style="margin-bottom:16px;">
              <div class="section-label">${w.label}</div>
              ${items.map(r => `
                <div class="lembrete-row ${r.due ? 'due' : ''}">
                  <div><div class="lr-caso">${escapeHtml(r.c.nome)}</div><div class="lr-nome">${escapeHtml(r.e.titulo)}</div></div>
                  <span class="stamp ${r.due ? 'proximo' : 'neutro'}">${r.due ? 'Revisar hoje' : fmtDate(r.nxt)}</span>
                </div>
              `).join('')}
            </div>
          `;
        }).join('')
      }
    </div>
    <div class="lembrete-section" style="margin-top:12px;">
      <h3>Cobranças pendentes</h3>
      ${cobrancas.length === 0 ? '<div class="kanban-empty">Nada vencido no momento.</div>' :
        cobrancas.map(cb => `
          <div class="lembrete-row overdue">
            <div><div class="lr-caso">${escapeHtml(cb.c.nome)}</div><div class="lr-nome">Cobrar responsável: ${escapeHtml(cb.titulo)}</div></div>
            <span class="stamp vencido">Vencido há ${cb.dias}d</span>
          </div>
        `).join('')}
    </div>
  `;
}
