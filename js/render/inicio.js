// Aba "Início": visão geral da carteira (indicadores + gráficos calculados em dashboard.js)
import { state } from '../state.js';
import { KANBAN_COLUMNS } from '../constants.js';
import { computeDashboard, FASES, TIPOS_BONUS, DECISOES } from '../dashboard.js';
import { escapeHtml, fmtDate, daysUntil } from '../utils.js';

// Cor semântica -> token de css/styles.scss
const COR = { ok: '--done', warn: '--warning', bad: '--urgent', accent: '--accent', purple: '--purple', info: '--marco-eta9089', pink: '--marco-i140', neutral: '--gray-badge' };
const cor = k => `var(${COR[k] || COR.accent})`;
const pct = (n, total) => total ? Math.round(n / total * 100) : 0;

function card(titulo, subtitulo, corpo, { full = false, head = '' } = {}){
  return `
    <section class="dash-card${full ? ' dash-card--full' : ''}">
      <div class="dash-card__head"><div><h3>${titulo}</h3><p>${subtitulo}</p></div>${head}</div>
      ${corpo}
    </section>`;
}

function donut(partes, centro, legendaCentro){
  const total = partes.reduce((s, p) => s + p.v, 0);
  if(!total) return '<div class="kanban-empty">Sem processos para exibir.</div>';
  const r = 64, C = 2 * Math.PI * r;
  let acumulado = 0;
  const arcos = partes.filter(p => p.v).map(p => {
    const len = p.v / total * C;
    const svg = `<circle cx="85" cy="85" r="${r}" fill="none" stroke-width="22" style="stroke:${cor(p.c)}" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-acumulado}" transform="rotate(-90 85 85)"><title>${escapeHtml(p.l)}: ${p.v}</title></circle>`;
    acumulado += len;
    return svg;
  }).join('');
  return `
    <div class="dash-donut">
      <svg viewBox="0 0 170 170" role="img" aria-label="${escapeHtml(legendaCentro)}: ${centro}">
        <circle cx="85" cy="85" r="${r}" fill="none" stroke-width="22" style="stroke:var(--surface-soft)"/>
        ${arcos}
        <text x="85" y="89" text-anchor="middle" class="dash-donut__num">${centro}</text>
        <text x="85" y="107" text-anchor="middle" class="dash-donut__sub">${escapeHtml(legendaCentro)}</text>
      </svg>
      <ul class="dash-legend">
        ${partes.map(p => `<li><span class="dash-legend__sw" style="background:${cor(p.c)}"></span>${escapeHtml(p.l)}: <b>${p.v}</b> <span class="dash-muted">(${pct(p.v, total)}%)</span></li>`).join('')}
      </ul>
    </div>`;
}

function barrasH(itens, vazio){
  if(!itens.some(i => i.v)) return `<div class="kanban-empty">${vazio}</div>`;
  const max = Math.max(1, ...itens.map(i => i.v));
  return `<div class="dash-hbars">${itens.map(i => `
    <div class="dash-hbars__lab" title="${escapeHtml(i.l)}">${escapeHtml(i.l)}</div>
    <div class="dash-hbars__track"><div class="dash-hbars__bar" style="width:${i.v / max * 100}%; background:${cor(i.c)}"></div></div>
    <div class="dash-hbars__val">${i.v}</div>`).join('')}</div>`;
}

function legendaSeries(series){
  return `<div class="dash-leg2">${series.map(s => `<span><i style="background:${cor(s.c)}"></i>${s.n}</span>`).join('')}</div>`;
}

function barrasAgrupadas(rotulos, series){
  if(!series.some(s => s.v.some(x => x))) return '<div class="kanban-empty">Nenhum protocolo no período.</div>';
  const max = Math.max(1, ...series.flatMap(s => s.v));
  return `
    <div class="dash-vc" role="img" aria-label="Protocolos por mês">
      ${rotulos.map((l, i) => `<div class="dash-vc__g" title="${escapeHtml(l)}: ${series.map(s => `${s.n} ${s.v[i]}`).join(', ')}">
        ${series.map(s => `<div class="dash-vc__b" style="height:${s.v[i] / max * 92}%; background:${cor(s.c)}">${s.v[i] ? `<em>${s.v[i]}</em>` : ''}</div>`).join('')}
      </div>`).join('')}
    </div>
    <div class="dash-vl">${rotulos.map(l => `<span>${l}</span>`).join('')}</div>
    ${legendaSeries(series)}`;
}

function barrasEmpilhadas(rotulos, series){
  const totais = rotulos.map((_, i) => series.reduce((s, x) => s + x.v[i], 0));
  if(!totais.some(Boolean)) return '<div class="kanban-empty">Nenhum evento no período.</div>';
  const max = Math.max(1, ...totais);
  return `
    <div class="dash-vc" role="img" aria-label="Eventos bônus por mês">
      ${rotulos.map((l, i) => `<div class="dash-vc__g" title="${escapeHtml(l)}: ${series.map(s => `${s.n} ${s.v[i]}`).join(', ')}">
        <div class="dash-vc__stack">${series.map(s => s.v[i] ? `<div style="height:${s.v[i] / max * 92}%; background:${cor(s.c)}"></div>` : '').join('')}</div>
      </div>`).join('')}
    </div>
    <div class="dash-vl">${rotulos.map(l => `<span>${l}</span>`).join('')}</div>
    ${legendaSeries(series)}`;
}

export function renderInicioView(){
  if(!state.data.cases.length){
    return `<div class="empty-state"><div class="big">Nenhum processo cadastrado</div><p>Assim que você cadastrar processos na aba Processos, o painel com a visão geral da carteira aparece aqui.</p></div>`;
  }
  const d = computeDashboard(state.data, state.inicioPeriodo);
  const rotulos = d.meses.map(m => m.label);

  const kpis = [
    { l: 'Total de processos', v: d.total, icon: 'pi-briefcase', p: '100% da carteira' },
    { l: 'Em andamento', v: d.andamento, icon: 'pi-sync', p: `${pct(d.andamento, d.total)}% do total` },
    { l: 'Em fase final', v: d.faseFinal, icon: 'pi-flag', p: `${pct(d.faseFinal, d.total)}% do total` },
    { l: 'Fora do prazo', v: d.foraPrazo, icon: 'pi-exclamation-triangle', p: `${pct(d.foraPrazo, d.total)}% do total`, alerta: d.foraPrazo > 0 },
    { l: 'Concluídos', v: d.concluidos, icon: 'pi-check-circle', p: `${pct(d.concluidos, d.total)}% do total` }
  ];

  const situacao = [
    { l: 'Em dia', v: d.situacao.emdia, c: 'ok' },
    { l: 'Próximo do prazo', v: d.situacao.proximo, c: 'warn' },
    { l: 'Fora do prazo', v: d.situacao.fora, c: 'bad' },
    { l: 'Concluídos', v: d.situacao.concluido, c: 'accent' }
  ];
  // Mesmas cores dos cabeçalhos das colunas da aba Acompanhamento dos casos (.kanban-col.* em styles.scss)
  const corColuna = { urgente: 'bad', revisao: 'purple', liberada: 'ok', andamento: 'warn' };
  const trabalho = KANBAN_COLUMNS.map(col => ({ l: col.label, v: d.trabalho[col.key] || 0, c: corColuna[col.key] || 'accent' }));
  const corDecisao = { aprovado: 'ok', negado: 'bad', rfe: 'warn', rejeitado: 'neutral' };

  const seletorPeriodo = `
    <div class="dash-period"><label for="inicio-periodo">Período</label>
      <select id="inicio-periodo" class="status-select">
        <option value="6" ${state.inicioPeriodo === '6' ? 'selected' : ''}>Últimos 6 meses</option>
        <option value="12" ${state.inicioPeriodo === '12' ? 'selected' : ''}>Últimos 12 meses</option>
        <option value="ano" ${state.inicioPeriodo === 'ano' ? 'selected' : ''}>Ano atual</option>
      </select>
    </div>`;

  const proximos = d.proximos.length ? `<div class="dash-deadlines">${d.proximos.map((x, i) => {
    const dias = daysUntil(x.nearest.date);
    const cls = dias < 0 ? 'urgente' : dias <= 7 ? 'proximo' : '';
    const stampCls = dias < 0 ? 'vencido' : dias <= 7 ? 'proximo' : 'neutro';
    const txt = dias < 0 ? `vencido há ${Math.abs(dias)}d` : dias === 0 ? 'vence hoje' : `em ${dias}d`;
    return `
      <button class="dash-deadline ${cls}" data-inicio-open="${x.c.id}">
        <span class="dash-deadline__rank">${i + 1}</span>
        <span class="dash-deadline__body"><span class="dash-deadline__nome">${escapeHtml(x.c.nome)}</span><span class="dash-deadline__motivo">${escapeHtml(x.nearest.label)}</span></span>
        <span class="stamp ${stampCls}">${fmtDate(x.nearest.date)} · ${txt}</span>
      </button>`;
  }).join('')}</div>` : '<div class="kanban-empty">Nenhum prazo cadastrado nos processos em andamento.</div>';

  return `
    <div class="dash-kpis">
      ${kpis.map(k => `
        <div class="dash-kpi${k.alerta ? ' dash-kpi--alerta' : ''}">
          <div class="dash-kpi__label"><i class="pi ${k.icon}"></i>${k.l}</div>
          <div class="dash-kpi__value">${k.v}</div>
          <div class="dash-kpi__pct">${k.p}</div>
        </div>`).join('')}
    </div>
    <div class="dash-grid">
      ${card('Situação dos processos', 'Prazo de cada processo em relação a hoje.', donut(situacao, d.total, 'processos'))}
      ${card('Processos por fase', 'Fase atual dos processos em andamento.', barrasH(FASES.map(f => ({ l: f, v: d.fases[f] || 0, c: 'accent' })), 'Nenhum processo em andamento.'))}
      ${card('Situação do trabalho', 'Mesmas colunas da aba Acompanhamento dos casos.', barrasH(trabalho, 'Nenhum processo em andamento.'))}
      ${card('Gargalos', 'Etapas que mais concentram processos travados ou atrasados.', barrasH(d.gargalos.map(g => ({ l: g.titulo, v: g.n, c: 'bad' })), 'Nenhum processo travado ou atrasado.'))}
      ${card('Protocolos por mês', 'PWD, ETA 9089 e I-140 protocolados.', barrasAgrupadas(rotulos, [
        { n: 'PWD', c: 'purple', v: d.meses.map(m => m.pwd) },
        { n: 'ETA 9089', c: 'info', v: d.meses.map(m => m.eta9089) },
        { n: 'I-140', c: 'pink', v: d.meses.map(m => m.i140) }
      ]), { full: true, head: seletorPeriodo })}
      ${card('Eventos bônus por mês', 'RFE, NPT, MOTION e Appeal registrados na aba Resultados.', barrasEmpilhadas(rotulos, TIPOS_BONUS.map((t, i) => ({ n: t, c: ['warn', 'info', 'purple', 'bad'][i], v: d.meses.map(m => m.bonus[t]) }))), { full: true })}
      ${card('Desfecho das decisões', 'Marcos de decisão de AOS e de recursos.', barrasH(DECISOES.map(x => ({ l: x.label, v: d.decisoes[x.key], c: corDecisao[x.key] })), 'Nenhuma decisão registrada.'))}
      ${card('Aguardando Priority Date', 'I-140 protocolados, por ano da data de prioridade.', barrasH(d.prioridadePorAno.map(x => ({ l: x.ano, v: x.n, c: 'info' })), 'Nenhum I-140 protocolado com data de prioridade.'))}
      ${card('Próximos prazos', 'Os 5 processos com o prazo mais próximo. Clique para abrir.', proximos, { full: true })}
    </div>
  `;
}
