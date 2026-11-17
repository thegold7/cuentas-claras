(function(){
  const RMV = 1230, ASIG = RMV * 0.10;
  const fmt = new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN',minimumFractionDigits:2,maximumFractionDigits:2});
  const money = v => fmt.format(Math.round((v + Number.EPSILON) * 100) / 100);
  const $ = id => document.getElementById(id);
  const num = id => { const v = parseFloat($(id).value); return isFinite(v) && v > 0 ? v : 0; };
  const FACT = {general:1, pequena:0.5, micro:0};
  const MES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'];

  function boleta(el, o){
    let h = '<div class="top"><div class="k">' + o.label + '</div><div class="total">' + money(o.total) + '</div>';
    if (o.when) h += '<div class="when">' + o.when + '</div>';
    h += '</div><ul class="lines">';
    o.lines.forEach(l => { h += '<li><span>' + l[0] + (l[2] ? '<span class="d">' + l[2] + '</span>' : '') + '</span><span class="v">' + money(l[1]) + '</span></li>'; });
    h += '<li class="sum"><span>Total</span><span class="v">' + money(o.total) + '</span></li></ul>';
    (o.notes || []).forEach(n => { h += '<div class="notice' + (n.err ? ' err' : '') + '">' + n.t + '</div>'; });
    el.innerHTML = h;
  }

  /* ---------- Gratificación ---------- */
  function calcGrati(){
    const base = num('g-sueldo') + ($('g-asig').checked ? ASIG : 0) + num('g-extras');
    const meses = parseInt($('g-meses').value, 10);
    const f = FACT[$('g-reg').value];
    const tasa = $('g-salud').value === 'eps' ? 0.0675 : 0.09;
    const grati = base / 6 * meses * f;
    const bono = grati * tasa;
    const notes = [];
    if ($('g-reg').value === 'micro') notes.push({t:'En una microempresa no corresponde gratificación.'});
    if ($('g-reg').value === 'pequena') notes.push({t:'En una pequeña empresa la gratificación es la mitad de un sueldo por semestre.'});
    if (meses === 0) notes.push({t:'Necesitas al menos un mes completo trabajado en el semestre.'});
    boleta($('r-grati'), {
      label: 'Recibirías en ' + ($('g-periodo').value === 'dic' ? 'diciembre' : 'julio'),
      total: grati + bono,
      when: 'Pago hasta el 15 de ' + ($('g-periodo').value === 'dic' ? 'diciembre' : 'julio') + '. Sin descuento de AFP ni ONP.',
      lines: [
        ['Base de cálculo', base, 'Sueldo' + ($('g-asig').checked ? ' + asignación familiar' : '') + (num('g-extras') ? ' + extras' : '')],
        ['Gratificación', grati, money(base) + ' ÷ 6 × ' + meses + (meses === 1 ? ' mes' : ' meses') + (f === 0.5 ? ' × 50%' : '')],
        ['Bono extraordinario ' + (tasa === 0.09 ? '9%' : '6.75%'), bono, tasa === 0.09 ? 'Lo que la empresa pagaría a EsSalud' : 'Porque tienes EPS']
      ],
      notes
    });
  }

  /* ---------- CTS ---------- */
  function calcCTS(){
    const sueldo = num('c-sueldo') + ($('c-asig').checked ? ASIG : 0) + num('c-extras');
    const sexto = num('c-grati') / 6;
    const base = sueldo + sexto;
    const meses = parseInt($('c-meses').value, 10);
    const dias = Math.min(29, Math.floor(num('c-dias')));
    const f = FACT[$('c-reg').value];
    const pMes = base / 12 * meses * f, pDia = base / 360 * dias * f;
    const notes = [];
    if ($('c-reg').value === 'micro') notes.push({t:'En una microempresa no corresponde CTS.'});
    if ($('c-reg').value === 'pequena') notes.push({t:'En una pequeña empresa la CTS es la mitad: 15 días de sueldo por año.'});
    if (meses === 6 && dias > 0) notes.push({t:'Un semestre tiene como máximo 6 meses. Revisa los días extra.', err:true});
    const lines = [
      ['Base de cálculo', base, 'Sueldo ' + money(sueldo) + ' + 1/6 de gratificación ' + money(sexto)],
      ['Por meses', pMes, money(base) + ' ÷ 12 × ' + meses + (f === 0.5 ? ' × 50%' : '')]
    ];
    if (dias) lines.push(['Por días', pDia, money(base) + ' ÷ 360 × ' + dias + (f === 0.5 ? ' × 50%' : '')]);
    boleta($('r-cts'), {
      label: 'Depósito de ' + ($('c-periodo').value === 'nov' ? 'noviembre' : 'mayo'),
      total: pMes + pDia,
      when: 'Tu empresa debe depositarlo hasta el 15 de ' + ($('c-periodo').value === 'nov' ? 'noviembre' : 'mayo') + '.',
      lines, notes
    });
  }

  /* ---------- Fechas ---------- */
  const D = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
  const addDays = (dt, n) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + n);
  const lastDay = (y, m) => new Date(y, m + 1, 0);
  // Meses y días entre start y end, ambos inclusive.
  function mesesDias(start, end){
    if (end < start) return {m:0, d:0};
    const ex = addDays(end, 1);
    let m = (ex.getFullYear() - start.getFullYear()) * 12 + (ex.getMonth() - start.getMonth());
    let anchor = new Date(start.getFullYear(), start.getMonth() + m, start.getDate());
    if (anchor > ex) { m--; anchor = new Date(start.getFullYear(), start.getMonth() + m, start.getDate()); }
    const d = Math.round((ex - anchor) / 86400000);
    return {m, d};
  }
  const fechaTxt = dt => dt.getDate() + ' de ' + MES[dt.getMonth()] + ' de ' + dt.getFullYear();

  /* ---------- Liquidación ---------- */
  function calcLiq(){
    const el = $('r-liq');
    if (!$('l-ingreso').value || !$('l-cese').value){ boleta(el,{label:'Liquidación',total:0,lines:[],notes:[{t:'Completa las dos fechas.',err:true}]}); return; }
    const ing = D($('l-ingreso').value), ces = D($('l-cese').value);
    if (ces < ing){ boleta(el,{label:'Liquidación',total:0,lines:[],notes:[{t:'El último día de trabajo no puede ser antes de la fecha de ingreso.',err:true}]}); return; }
    const reg = $('l-reg').value, f = FACT[reg];
    const rem = num('l-sueldo') + ($('l-asig').checked ? ASIG : 0) + num('l-extras');
    const tasa = $('l-salud').value === 'eps' ? 0.0675 : 0.09;
    const y = ces.getFullYear(), mo = ces.getMonth(), day = ces.getDate();
    const lines = [], notes = [];

    // Gratificación trunca
    let semStart, semNombre, grati = 0, gMeses = 0;
    if (mo === 6 && day < 15){ semStart = new Date(y,0,1); semNombre = 'ene–jun'; }
    else if (mo === 11 && day >= 15){ semStart = null; }
    else if (mo < 6){ semStart = new Date(y,0,1); semNombre = 'ene–jun'; }
    else { semStart = new Date(y,6,1); semNombre = 'jul–dic'; }
    if (semStart){
      const st = ing > semStart ? ing : semStart;
      for (let i = 0; i < 6; i++){
        const first = new Date(semStart.getFullYear(), semStart.getMonth() + i, 1);
        const last = lastDay(first.getFullYear(), first.getMonth());
        if (st <= first && ces >= last) gMeses++;
      }
      grati = rem / 6 * gMeses * f;
      if (f > 0){
        lines.push(['Gratificación trunca', grati, gMeses + (gMeses === 1 ? ' mes completo' : ' meses completos') + ' (' + semNombre + ')' + (f === 0.5 ? ' × 50%' : '')]);
        lines.push(['Bono ' + (tasa === 0.09 ? '9%' : '6.75%'), grati * tasa, 'Sobre la gratificación trunca']);
      }
    } else {
      notes.push({t:'Saliste después del 15 de diciembre, así que la gratificación de diciembre ya debió pagarse completa.'});
    }

    // CTS trunca
    let pStart;
    if (mo >= 4 && mo <= 9) pStart = new Date(y,4,1);
    else if (mo >= 10) pStart = new Date(y,10,1);
    else pStart = new Date(y-1,10,1);
    const cSt = ing > pStart ? ing : pStart;
    const c = mesesDias(cSt, ces);
    const baseCTS = rem + num('l-grati') / 6;
    const cts = (baseCTS / 12 * c.m + baseCTS / 360 * c.d) * f;
    if (f > 0) lines.push(['CTS trunca', cts, c.m + (c.m === 1 ? ' mes' : ' meses') + ' y ' + c.d + (c.d === 1 ? ' día' : ' días') + ' desde el ' + fechaTxt(cSt) + (f === 0.5 ? ' × 50%' : '')]);

    // Vacaciones truncas
    let ann = new Date(y, ing.getMonth(), ing.getDate());
    if (ann > ces) ann = new Date(y - 1, ing.getMonth(), ing.getDate());
    if (ann < ing) ann = ing;
    const v = mesesDias(ann, ces);
    const vf = reg === 'general' ? 1 : 0.5;
    const total = mesesDias(ing, ces);
    let vac = 0;
    if (total.m >= 1){ vac = (rem / 12 * v.m + rem / 360 * v.d) * vf; }
    lines.push(['Vacaciones truncas', vac, v.m + (v.m === 1 ? ' mes' : ' meses') + ' y ' + v.d + (v.d === 1 ? ' día' : ' días') + ' desde tu último aniversario' + (vf === 0.5 ? ' (15 días por año)' : '') + '. Se descuenta AFP/ONP.']);

    // Vacaciones pendientes
    const pend = Math.floor(num('l-vacpend'));
    let vp = 0;
    if (pend){ vp = rem / 30 * pend; lines.push(['Vacaciones pendientes', vp, pend + ' días × ' + money(rem / 30) + ' por día']); }

    // Indemnización
    let ind = 0;
    if ($('l-despido').checked){
      const s = total, anios = Math.floor(s.m / 12) + (s.m % 12) / 12 + s.d / 360;
      if (reg === 'general'){ ind = Math.min(rem * 1.5 * anios, rem * 12); }
      else if (reg === 'pequena'){ ind = Math.min(rem / 30 * 20 * anios, rem / 30 * 120); }
      else { ind = Math.min(rem / 30 * 10 * anios, rem / 30 * 90); }
      lines.push(['Indemnización por despido', ind, reg === 'general' ? '1.5 sueldos por año, máximo 12' : (reg === 'pequena' ? '20 días de sueldo por año, máximo 120 días' : '10 días de sueldo por año, máximo 90 días')]);
    }

    if (reg === 'micro') notes.push({t:'En una microempresa no corresponden CTS ni gratificación. Sí te pagan vacaciones (15 días por año).'});
    if (total.m < 1) notes.push({t:'Trabajaste menos de un mes, así que no corresponden vacaciones truncas.'});
    notes.push({t:'Monto bruto. A las vacaciones truncas y pendientes les descuentan AFP u ONP.'});

    const sum = lines.reduce((a,l) => a + l[1], 0);
    boleta(el, {label:'Tu liquidación sería', total:sum, when:'Tu empresa debe pagarla dentro de las 48 horas después del ' + fechaTxt(ces) + '.', lines, notes});
  }

  // Mantener la gratificación de CTS/liquidación igual al sueldo mientras el usuario no la toque
  [['c-sueldo','c-grati'],['l-sueldo','l-grati']].forEach(([s,g]) => {
    let touched = false;
    $(g).addEventListener('input', () => touched = true);
    $(s).addEventListener('input', () => { if (!touched) $(g).value = $(s).value; });
  });

  $('f-grati').addEventListener('input', calcGrati);
  $('f-cts').addEventListener('input', calcCTS);
  $('f-liq').addEventListener('input', calcLiq);
  ['f-grati','f-cts','f-liq'].forEach(id => $(id).addEventListener('submit', e => e.preventDefault()));

  // Pestañas por hash
  const tabs = ['gratificacion','cts','liquidacion'];
  function show(){
    const h = location.hash.slice(1);
    const t = tabs.includes(h) ? h : 'gratificacion';
    tabs.forEach(x => {
      $('p-' + x).classList.toggle('active', x === t);
      const a = document.querySelector('[data-tab="' + x + '"]');
      if (x === t) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange', show);
  show(); calcGrati(); calcCTS(); calcLiq();
})();
