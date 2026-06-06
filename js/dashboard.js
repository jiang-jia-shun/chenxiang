/**
 * BI Dashboard — 某家电企业库存成本构成异常分析
 * All KPI, charts, and conclusions are data-driven.
 * No hardcoded values.
 */
(function () {
  'use strict';

  // ── Color Palette ────────────────────────────────────────────
  var COLORS = {
    cyan: '#00d4ff', blue: '#0ea5e9', teal: '#14b8a6', orange: '#ff9800',
    red: '#ff5252', pink: '#e040fb', green: '#4caf84', yellow: '#ffc107',
    purple: '#7c4dff', white: '#e8edf3', gray: '#8fa4bc', muted: '#5a7288',
  };
  var PALETTE = ['#00d4ff','#0ea5e9','#14b8a6','#ff9800','#ff5252','#e040fb','#4caf84','#ffc107','#7c4dff','#ff6e40'];

  // ── Helpers ──────────────────────────────────────────────────
  function fmtW(v, d) { return Number(v).toLocaleString('zh-CN', { maximumFractionDigits: d || 0 }); }
  function fmtPct(v) { return Number(v).toFixed(1) + '%'; }
  function wan(v) { return +(v / 10000).toFixed(2); }

  // ── Validation ───────────────────────────────────────────────
  var VALID = { ok: true, warnings: [] };
  function warn(msg) { VALID.warnings.push(msg); console.warn('[DATA-CHECK] ' + msg); VALID.ok = false; }

  function validateData(D) {
    if (!D) { warn('DATA is null/undefined'); return; }
    console.log('[DATA-CHECK] dashboard-data.json loaded successfully.');
    var k = D.kpi;
    if (!k) { warn('Missing kpi object'); return; }

    var fields = ['总库存成本_万元','原材料成本_万元','原材料成本占比','原材料成本环比增长','积压金额_360天以上_万元','异常业务单元','异常产品线'];
    fields.forEach(function(f) {
      var v = k[f];
      if (v === undefined || v === null) { warn('KPI missing: ' + f); }
      else if (typeof v === 'number' && !isFinite(v)) { warn('KPI NaN/Infinity: ' + f + '=' + v); }
    });
    console.log('[DATA-CHECK] KPI integrity: ' + (VALID.ok ? 'OK' : 'HAS ISSUES'));
    console.log('[DATA-CHECK] Total inventory: ' + k['总库存成本_万元'] + ' wan, Raw material: ' + k['原材料成本_万元'] + ' wan, Ratio: ' + k['原材料成本占比'] + '%, Growth: ' + k['原材料成本环比增长'] + '%');
    console.log('[DATA-CHECK] Stuck >360d: ' + k['积压金额_360天以上_万元'] + ' wan, High-risk material count: ' + (k['高风险物料数量'] || 'N/A'));
    console.log('[DATA-CHECK] Abnormal BU: ' + k['异常业务单元'] + ' (score=' + k['异常业务单元得分'] + '), Abnormal PL: ' + k['异常产品线'] + ' (score=' + k['异常产品线得分'] + ')');

    // Check array lengths
    ['库存成本结构','季度趋势','业务单元分析','产品线分析'].forEach(function(key) {
      var arr = D[key];
      if (!arr || arr.length === 0) warn('Empty/missing: ' + key);
      else console.log('[DATA-CHECK] ' + key + ': ' + arr.length + ' items');
    });

    if (D['物料分析'] && D['物料分析']['高风险物料TOP10']) {
      console.log('[DATA-CHECK] Material TOP10: ' + D['物料分析']['高风险物料TOP10'].length + ' items');
    } else { warn('Missing material TOP10'); }

    if (D['综合评分']) {
      console.log('[DATA-CHECK] Composite rankings available.');
      var buRank = D['综合评分']['业务单元排名'];
      var plRank = D['综合评分']['产品线排名'];
      if (buRank) console.log('[DATA-CHECK] Top BU: ' + buRank[0]['业务单元'] + ' (score=' + buRank[0]['综合异常得分'] + ')');
      if (plRank) console.log('[DATA-CHECK] Top PL: ' + plRank[0]['产品线'] + ' (score=' + plRank[0]['综合异常得分'] + ')');
    }

    if (VALID.warnings.length > 0) {
      console.log('[DATA-CHECK] ' + VALID.warnings.length + ' warning(s) — check above.');
    }
  }

  // ── Data Loading ─────────────────────────────────────────────
  var DATA = null;

  async function loadData() {
    try {
      var resp = await fetch('data/dashboard-data.json');
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      DATA = await resp.json();
    } catch (e) {
      try {
        var resp2 = await fetch('./data/dashboard-data.json');
        if (!resp2.ok) throw new Error('HTTP ' + resp2.status);
        DATA = await resp2.json();
      } catch (e2) {
        console.error('[DATA-CHECK] Failed to load data. Use: python -m http.server 8000');
        showError('数据加载失败，请使用 python -m http.server 8000 启动本地服务后访问 http://localhost:8000');
        throw e2;
      }
    }
    validateData(DATA);
    if (!VALID.ok) {
      showError('数据校验发现问题，请检查控制台警告。部分数据可能不完整。');
    }
  }

  function showError(msg) {
    var el = document.getElementById('loadingOverlay');
    if (el) el.innerHTML = '<div style="color:#ff5252;text-align:center;padding:40px;font-size:16px;">' + msg + '</div>';
  }

  // ── ECharts Base Theme ───────────────────────────────────────
  function baseOpt() {
    return {
      backgroundColor: 'transparent',
      textStyle: { color: COLORS.gray },
      tooltip: { backgroundColor: 'rgba(10,22,40,0.95)', borderColor: 'rgba(0,180,255,0.3)', textStyle: { color: COLORS.white, fontSize: 12 } },
      legend: { textStyle: { color: COLORS.gray, fontSize: 11 }, top: 6, right: 10, itemWidth: 12, itemHeight: 8 },
      grid: { top: 50, right: 20, bottom: 30, left: 55 },
      xAxis: { axisLine: { lineStyle: { color: COLORS.muted } }, axisTick: { show: false }, axisLabel: { color: COLORS.gray, fontSize: 10 }, splitLine: { show: false } },
      yAxis: { axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: COLORS.gray, fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
    };
  }

  function onResize(chart) { window.addEventListener('resize', function() { chart.resize(); }); }

  // ── KPI Cards ────────────────────────────────────────────────
  function renderKPIs() {
    var k = DATA.kpi;
    setKPI('kpiTotal', fmtW(k['总库存成本_万元'], 2));
    setKPI('kpiRaw', fmtW(k['原材料成本_万元'], 2));
    setKPI('kpiRatio', fmtPct(k['原材料成本占比']));
    var g = k['原材料成本环比增长'];
    setKPI('kpiGrowth', (g >= 0 ? '+' : '') + fmtPct(g));
    setKPI('kpiStuck', fmtW(k['积压金额_360天以上_万元'], 2));
    var abLabel = k['异常业务单元'] + ' / ' + k['异常产品线'];
    var abEl = document.getElementById('kpiAbnormal');
    if (abEl) { abEl.textContent = abLabel; abEl.style.fontSize = '1.1rem'; }
  }
  function setKPI(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ── Part 1: Overall Anomaly ──────────────────────────────────

  function chartCostTrend() {
    var dom = document.getElementById('chartCostTrend');
    if (!dom) return;
    var c = echarts.init(dom);
    var d = DATA['季度趋势'];
    var opt = Object.assign(baseOpt(), {
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,22,40,0.95)', borderColor: 'rgba(0,180,255,0.3)', textStyle: { color: COLORS.white, fontSize: 12 } },
      legend: { textStyle: { color: COLORS.gray, fontSize: 10 }, data: ['总库存成本','原材料成本','半成品成本','产成品成本'], top: 6 },
      grid: { top: 50, right: 20, bottom: 30, left: 60 },
      xAxis: { type: 'category', data: d.map(function(x){return x['季度'];}), axisLabel: { color: COLORS.gray, fontSize: 9, rotate: 45 }, axisLine: { lineStyle: { color: COLORS.muted } } },
      yAxis: { type: 'value', name: '万元', nameTextStyle: { color: COLORS.muted, fontSize: 10 }, axisLabel: { color: COLORS.gray, fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
      series: [
        { name: '总库存成本', type: 'line', data: d.map(function(x){return wan(x['总库存成本']);}), smooth: true, lineStyle: { width: 2.5, color: COLORS.cyan }, symbol: 'circle', symbolSize: 4 },
        { name: '原材料成本', type: 'line', data: d.map(function(x){return wan(x['原材料成本']);}), smooth: true, lineStyle: { width: 2.5, color: COLORS.red }, symbol: 'diamond', symbolSize: 4 },
        { name: '半成品成本', type: 'line', data: d.map(function(x){return wan(x['半成品成本']);}), smooth: true, lineStyle: { width: 1.5, color: COLORS.orange }, symbol: 'triangle', symbolSize: 3 },
        { name: '产成品成本', type: 'line', data: d.map(function(x){return wan(x['产成品成本']);}), smooth: true, lineStyle: { width: 1.5, color: COLORS.teal }, symbol: 'triangle', symbolSize: 3 },
      ],
    });
    c.setOption(opt); onResize(c);
  }

  function chartCostStack() {
    var dom = document.getElementById('chartCostStack');
    if (!dom) return;
    var c = echarts.init(dom);
    var d = DATA['库存成本结构'];
    var opt = Object.assign(baseOpt(), {
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,22,40,0.95)', borderColor: 'rgba(0,180,255,0.3)', textStyle: { color: COLORS.white, fontSize: 12 } },
      legend: { textStyle: { color: COLORS.gray, fontSize: 10 }, data: ['原材料成本','半成品成本','产成品成本'], top: 6 },
      grid: { top: 50, right: 20, bottom: 30, left: 60 },
      xAxis: { type: 'category', data: d.map(function(x){return x['季度'];}), axisLabel: { color: COLORS.gray, fontSize: 9, rotate: 45 }, axisLine: { lineStyle: { color: COLORS.muted } } },
      yAxis: { type: 'value', name: '万元', nameTextStyle: { color: COLORS.muted, fontSize: 10 }, axisLabel: { color: COLORS.gray, fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
      series: [
        { name: '原材料成本', type: 'bar', stack: 'total', data: d.map(function(x){return x['原材料成本_万元'];}), itemStyle: { color: COLORS.red }, barWidth: '60%' },
        { name: '半成品成本', type: 'bar', stack: 'total', data: d.map(function(x){return x['半成品成本_万元'];}), itemStyle: { color: COLORS.orange } },
        { name: '产成品成本', type: 'bar', stack: 'total', data: d.map(function(x){return x['产成品成本_万元'];}), itemStyle: { color: COLORS.teal } },
      ],
    });
    c.setOption(opt); onResize(c);
  }

  function chartRawRatio() {
    var dom = document.getElementById('chartRawRatio');
    if (!dom) return;
    var c = echarts.init(dom);
    var d = DATA['季度趋势'];
    var ratios = d.map(function(x){return x['原材料成本占比'];});
    var opt = Object.assign(baseOpt(), {
      tooltip: { trigger: 'axis', formatter: function(p){return p[0].axisValue + '<br/>原材料成本占比：<b>' + p[0].value.toFixed(2) + '%</b>';}, backgroundColor: 'rgba(10,22,40,0.95)', borderColor: 'rgba(0,180,255,0.3)', textStyle: { color: COLORS.white, fontSize: 12 } },
      grid: { top: 30, right: 20, bottom: 30, left: 55 },
      xAxis: { type: 'category', data: d.map(function(x){return x['季度'];}), axisLabel: { color: COLORS.gray, fontSize: 9, rotate: 45 }, axisLine: { lineStyle: { color: COLORS.muted } } },
      yAxis: { type: 'value', name: '%', min: function(v){return Math.floor(v.min-1);}, max: function(v){return Math.ceil(v.max+1);}, nameTextStyle: { color: COLORS.muted, fontSize: 10 }, axisLabel: { color: COLORS.gray, fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
      series: [{
        name: '原材料成本占比', type: 'line', data: ratios, smooth: true,
        lineStyle: { width: 2.5, color: COLORS.red }, symbol: 'circle', symbolSize: 5,
        areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1, [{offset:0,color:'rgba(255,82,82,0.3)'},{offset:1,color:'rgba(255,82,82,0.02)'}]) },
        markLine: { silent: true, symbol: 'none', data: [{ yAxis: 50, label: { formatter: '50% 警戒线', color: COLORS.white, fontSize: 10 }, lineStyle: { color: COLORS.orange, type: 'dashed', width: 1.5 } }] },
      }],
    });
    c.setOption(opt); onResize(c);
  }

  // ── Part 2: Business Unit ────────────────────────────────────

  function chartBuBar() {
    var dom = document.getElementById('chartBuBar');
    if (!dom) return;
    var c = echarts.init(dom);
    var d = DATA['业务单元分析'];
    // Sort by composite score descending
    var sorted = d.slice().sort(function(a,b){return b['综合异常得分']-a['综合异常得分'];});
    var bus = sorted.map(function(x){return x['业务单元'];});
    var rawC = sorted.map(function(x){return x['原材料成本_万元'];});
    var opt = Object.assign(baseOpt(), {
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,22,40,0.95)', borderColor: 'rgba(0,180,255,0.3)', textStyle: { color: COLORS.white, fontSize: 12 } },
      grid: { top: 30, right: 20, bottom: 30, left: 60 },
      xAxis: { type: 'category', data: bus, axisLabel: { color: COLORS.gray, fontSize: 10 }, axisLine: { lineStyle: { color: COLORS.muted } } },
      yAxis: { type: 'value', name: '万元', nameTextStyle: { color: COLORS.muted, fontSize: 10 }, axisLabel: { color: COLORS.gray, fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
      series: [{
        name: '原材料成本', type: 'bar', data: rawC, barWidth: '50%',
        itemStyle: { color: function(p){return p.dataIndex===0?COLORS.red:p.dataIndex===1?COLORS.orange:COLORS.cyan;} },
        label: { show: true, position: 'top', formatter: function(p){return p.value.toFixed(1)+'万';}, color: COLORS.gray, fontSize: 10 },
      }],
    });
    c.setOption(opt); onResize(c);
  }

  function chartBuRatio() {
    var dom = document.getElementById('chartBuRatio');
    if (!dom) return;
    var c = echarts.init(dom);
    var d = DATA['业务单元分析'];
    var sorted = d.slice().sort(function(a,b){return b['综合异常得分']-a['综合异常得分'];});
    var bus = sorted.map(function(x){return x['业务单元'];});
    var ratios = sorted.map(function(x){return x['原材料成本占比'];});
    var opt = Object.assign(baseOpt(), {
      tooltip: { trigger: 'axis', formatter: function(p){return p[0].name+'<br/>原材料成本占比：<b>'+p[0].value.toFixed(2)+'%</b>';}, backgroundColor: 'rgba(10,22,40,0.95)', borderColor: 'rgba(0,180,255,0.3)', textStyle: { color: COLORS.white, fontSize: 12 } },
      grid: { top: 30, right: 20, bottom: 30, left: 60 },
      xAxis: { type: 'category', data: bus, axisLabel: { color: COLORS.gray, fontSize: 10 }, axisLine: { lineStyle: { color: COLORS.muted } } },
      yAxis: { type: 'value', name: '%', min: 40, nameTextStyle: { color: COLORS.muted, fontSize: 10 }, axisLabel: { color: COLORS.gray, fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
      series: [{
        name: '原材料成本占比', type: 'bar', barWidth: '50%',
        data: ratios.map(function(v){return {value:v, itemStyle:{color:v>50?COLORS.red:v>45?COLORS.orange:COLORS.cyan}};}),
        label: { show: true, position: 'top', formatter: function(p){return p.value.toFixed(1)+'%';}, color: COLORS.gray, fontSize: 10 },
        markLine: { silent: true, symbol: 'none', data: [{ yAxis: 50, label: { formatter: '50%', color: COLORS.white, fontSize: 10 }, lineStyle: { color: COLORS.orange, type: 'dashed', width: 1.5 } }] },
      }],
    });
    c.setOption(opt); onResize(c);
  }

  function chartBuBubble() {
    var dom = document.getElementById('chartBuBubble');
    if (!dom) return;
    var c = echarts.init(dom);
    var d = DATA['业务单元气泡图'];
    var opt = Object.assign(baseOpt(), {
      tooltip: {
        backgroundColor: 'rgba(10,22,40,0.95)', borderColor: 'rgba(0,180,255,0.3)', textStyle: { color: COLORS.white, fontSize: 12 },
        formatter: function(p){return '<b>'+p.name+'</b><br/>原材料成本：'+p.value[0].toFixed(2)+' 万元<br/>增长率：'+p.value[1].toFixed(1)+'%<br/>占比：'+p.value[2].toFixed(1)+'%<br/>异常得分：'+(p.value[3]||0).toFixed(4);}
      },
      grid: { top: 40, right: 20, bottom: 40, left: 65 },
      xAxis: { type: 'value', name: '原材料成本（万元）', nameTextStyle: { color: COLORS.muted, fontSize: 10 }, axisLabel: { color: COLORS.gray, fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } } },
      yAxis: { type: 'value', name: '增长率（%）', nameTextStyle: { color: COLORS.muted, fontSize: 10 }, axisLabel: { color: COLORS.gray, fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } } },
      series: [{
        type: 'scatter',
        data: d.map(function(x){return {name:x['业务单元'],value:[x['原材料成本_万元'],x['增长率'],x['原材料成本占比'],x['综合异常得分']||0]};}),
        symbolSize: function(val){return Math.max(18,Math.min(65,val[0]/60));},
        itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,180,255,0.4)', color: function(p){return PALETTE[p.dataIndex%PALETTE.length];} },
        label: { show: true, formatter: '{b}', position: 'top', color: COLORS.white, fontSize: 10, distance: 8 },
        emphasis: { label: { fontSize: 12, fontWeight: 'bold' }, scale: 1.3 },
      }],
    });
    c.setOption(opt); onResize(c);
  }

  // ── Part 3: Product Line ─────────────────────────────────────

  function chartPlBar() {
    var dom = document.getElementById('chartPlBar');
    if (!dom) return;
    var c = echarts.init(dom);
    // Use composite score ordering
    var d = DATA['产品线分析'].slice().sort(function(a,b){return b['综合异常得分']-a['综合异常得分'];});
    var names = d.map(function(x){return '#'+x['排名']+' '+x['产品线'];}).reverse();
    var rawC = d.map(function(x){return x['原材料成本_万元'];}).reverse();
    var opt = Object.assign(baseOpt(), {
      tooltip: { trigger: 'axis', formatter: function(p){return p[0].name+'<br/>原材料成本：<b>'+p[0].value.toFixed(2)+' 万元</b>';}, backgroundColor: 'rgba(10,22,40,0.95)', borderColor: 'rgba(0,180,255,0.3)', textStyle: { color: COLORS.white, fontSize: 12 } },
      grid: { top: 10, right: 25, bottom: 20, left: 115 },
      xAxis: { type: 'value', name: '万元', nameTextStyle: { color: COLORS.muted, fontSize: 10 }, axisLabel: { color: COLORS.gray, fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } } },
      yAxis: { type: 'category', data: names, axisLabel: { color: COLORS.gray, fontSize: 10 }, inverse: true, axisLine: { show: false } },
      series: [{
        name: '原材料成本', type: 'bar', data: rawC, barWidth: '55%',
        itemStyle: { borderRadius: [0,3,3,0], color: function(p){return p.dataIndex<3?new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:COLORS.red},{offset:1,color:COLORS.orange}]):new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:COLORS.cyan},{offset:1,color:COLORS.blue}]);} },
        label: { show: true, position: 'right', formatter: function(p){return p.value.toFixed(1)+'万';}, color: COLORS.gray, fontSize: 10 },
      }],
    });
    c.setOption(opt); onResize(c);
  }

  function chartPlRing() {
    var dom = document.getElementById('chartPlRing');
    if (!dom) return;
    var c = echarts.init(dom);
    var d = DATA['产品线分析'];
    var top6 = d.slice(0,6);
    var othersCost = d.slice(6).reduce(function(s,x){return s+x['总库存成本_万元'];},0);
    var pieData = top6.map(function(x){return {name:x['产品线'],value:parseFloat(x['总库存成本_万元'].toFixed(2))};});
    if (othersCost>0) pieData.push({name:'其他产品线',value:parseFloat(othersCost.toFixed(2))});
    var opt = Object.assign(baseOpt(), {
      tooltip: { trigger: 'item', formatter: '{b}<br/>总库存成本：{c} 万元 ({d}%)', backgroundColor: 'rgba(10,22,40,0.95)', borderColor: 'rgba(0,180,255,0.3)', textStyle: { color: COLORS.white, fontSize: 12 } },
      legend: { orient: 'vertical', right: 5, top: 20, textStyle: { color: COLORS.gray, fontSize: 10 } },
      series: [{ name: '总库存成本', type: 'pie', radius: ['45%','72%'], center: ['38%','50%'], avoidLabelOverlap: false, itemStyle: { borderRadius: 3, borderColor: 'rgba(10,22,40,0.8)', borderWidth: 2 }, label: { show: false }, emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } }, data: pieData, color: PALETTE }],
    });
    c.setOption(opt); onResize(c);
  }

  function chartPlTrend() {
    var dom = document.getElementById('chartPlTrend');
    if (!dom) return;
    var c = echarts.init(dom);
    var trends = DATA['产品线趋势'];
    var names = Object.keys(trends);
    if (names.length===0) return;
    var quarters = trends[names[0]].map(function(x){return x['季度'];});
    var series = names.map(function(nm,idx){
      return {
        name: nm, type: 'line',
        data: trends[nm].map(function(x){return wan(x['原材料成本']);}),
        smooth: true, lineStyle: { width: 2 }, itemStyle: { color: PALETTE[idx] }, symbol: 'circle', symbolSize: 4,
      };
    });
    var opt = Object.assign(baseOpt(), {
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,22,40,0.95)', borderColor: 'rgba(0,180,255,0.3)', textStyle: { color: COLORS.white, fontSize: 12 } },
      legend: { textStyle: { color: COLORS.gray, fontSize: 9 }, data: names },
      grid: { top: 50, right: 20, bottom: 30, left: 60 },
      xAxis: { type: 'category', data: quarters, axisLabel: { color: COLORS.gray, fontSize: 9, rotate: 45 }, axisLine: { lineStyle: { color: COLORS.muted } } },
      yAxis: { type: 'value', name: '万元', nameTextStyle: { color: COLORS.muted, fontSize: 10 }, axisLabel: { color: COLORS.gray, fontSize: 10 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
      series: series,
    });
    c.setOption(opt); onResize(c);
  }

  // ── Part 4: Material & Aging ─────────────────────────────────

  function chartMatTop() {
    var dom = document.getElementById('chartMatTop');
    if (!dom) return;
    var c = echarts.init(dom);
    var top = DATA['物料分析']['高风险物料TOP10'];
    var names = top.map(function(x){return x['物料名称']+'('+x['库龄分段']+')';}).reverse();
    var scores = top.map(function(x){return x['风险得分'];}).reverse();
    var opt = Object.assign(baseOpt(), {
      tooltip: { trigger: 'axis', formatter: function(p){return p[0].name+'<br/>风险得分：<b>'+p[0].value.toFixed(4)+'</b>';}, backgroundColor: 'rgba(10,22,40,0.95)', borderColor: 'rgba(0,180,255,0.3)', textStyle: { color: COLORS.white, fontSize: 12 } },
      grid: { top: 10, right: 25, bottom: 20, left: 145 },
      xAxis: { type: 'value', name: '风险得分', nameTextStyle: { color: COLORS.muted, fontSize: 10 }, axisLabel: { color: COLORS.gray, fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } } },
      yAxis: { type: 'category', data: names, axisLabel: { color: COLORS.gray, fontSize: 9 }, inverse: true, axisLine: { show: false } },
      series: [{
        name: '风险得分', type: 'bar', barWidth: '55%',
        data: scores.map(function(v){return {value:v,itemStyle:{color:v>0.7?COLORS.red:v>0.4?COLORS.orange:COLORS.cyan,borderRadius:[0,3,3,0]}};}),
        label: { show: true, position: 'right', formatter: function(p){return p.value.toFixed(3);}, color: COLORS.gray, fontSize: 9 },
      }],
    });
    c.setOption(opt); onResize(c);
  }

  function chartMatScatter() {
    var dom = document.getElementById('chartMatScatter');
    if (!dom) return;
    var c = echarts.init(dom);
    var detail = DATA['物料分析']['物料明细'];
    var sd = detail.map(function(x){
      return {name:x['物料名称']+'('+x['库龄分段']+')',value:[x['库龄天数'],wan(x['原材料成本']),x['风险得分']||0]};
    });
    var opt = Object.assign(baseOpt(), {
      tooltip: {
        backgroundColor: 'rgba(10,22,40,0.95)', borderColor: 'rgba(0,180,255,0.3)', textStyle: { color: COLORS.white, fontSize: 12 },
        formatter: function(p){return '<b>'+p.name+'</b><br/>库龄：'+p.value[0]+' 天<br/>金额：'+p.value[1].toFixed(2)+' 万元<br/>风险得分：'+(p.value[2]||0).toFixed(4);}
      },
      grid: { top: 30, right: 25, bottom: 40, left: 65 },
      xAxis: { type: 'value', name: '库龄天数', nameTextStyle: { color: COLORS.muted, fontSize: 10 }, axisLabel: { color: COLORS.gray, fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } } },
      yAxis: { type: 'value', name: '库存金额（万元）', nameTextStyle: { color: COLORS.muted, fontSize: 10 }, axisLabel: { color: COLORS.gray, fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)' } } },
      series: [{
        type: 'scatter', data: sd,
        symbolSize: function(val){return Math.max(8,Math.min(40,(val[2]||0.01)*50));},
        itemStyle: { shadowBlur: 6, shadowColor: 'rgba(255,82,82,0.3)', color: function(p){return p.value[0]>360?COLORS.red:p.value[0]>180?COLORS.orange:COLORS.cyan;} },
        emphasis: { label: { show: true, formatter: '{b}', position: 'top', color: COLORS.white, fontSize: 10 } },
        markLine: { silent: true, symbol: 'none', data: [{ xAxis: 360, label: { formatter: '360天', color: COLORS.white, fontSize: 10 }, lineStyle: { color: COLORS.red, type: 'dashed', width: 1.5 } }] },
      }],
    });
    c.setOption(opt); onResize(c);
  }

  function chartAgingPie() {
    var dom = document.getElementById('chartAgingPie');
    if (!dom) return;
    var c = echarts.init(dom);
    var aging = DATA['物料分析']['库龄分布'];
    var segColors = {'30天以内':COLORS.green,'31-90天':COLORS.cyan,'91-180天':COLORS.blue,'181-360天':COLORS.orange,'360天以上':COLORS.red};
    var pieData = aging.map(function(x){return {name:x['库龄分段'],value:wan(x['金额合计']),itemStyle:{color:segColors[x['库龄分段']]||COLORS.gray}};});
    var opt = Object.assign(baseOpt(), {
      tooltip: { trigger: 'item', formatter: '{b}<br/>金额：{c} 万元 ({d}%)', backgroundColor: 'rgba(10,22,40,0.95)', borderColor: 'rgba(0,180,255,0.3)', textStyle: { color: COLORS.white, fontSize: 12 } },
      legend: { orient: 'vertical', right: 5, top: 20, textStyle: { color: COLORS.gray, fontSize: 9 } },
      series: [{ name: '库龄分布', type: 'pie', radius: ['45%','72%'], center: ['40%','50%'], avoidLabelOverlap: false, itemStyle: { borderRadius: 3, borderColor: 'rgba(10,22,40,0.8)', borderWidth: 2 }, label: { show: false }, emphasis: { label: { show: true, fontSize: 11, fontWeight: 'bold' } }, data: pieData }],
    });
    c.setOption(opt); onResize(c);
  }

  function renderMatTable() {
    var container = document.getElementById('tableMatDetail');
    if (!container) return;
    var top = DATA['物料分析']['高风险物料TOP10'];
    var h = '<table class="data-table"><thead><tr><th>物料名称</th><th>编码</th><th class="num">库龄天数</th><th>分段</th><th class="num">库存量</th><th class="num">金额(万元)</th><th class="num">风险得分</th><th class="num">超360天</th></tr></thead><tbody>';
    top.forEach(function(r){
      var cls = r['库龄天数']>360?'danger':r['库龄天数']>180?'warn':'';
      h += '<tr>';
      h += '<td>'+r['物料名称']+'</td><td>'+r['物料编码']+'</td>';
      h += '<td class="num '+cls+'">'+r['库龄天数']+'</td><td>'+r['库龄分段']+'</td>';
      h += '<td class="num">'+fmtW(r['当前库存量'],0)+'</td>';
      h += '<td class="num">'+wan(r['原材料成本']).toFixed(2)+'</td>';
      h += '<td class="num '+cls+'">'+(r['风险得分']||0).toFixed(4)+'</td>';
      h += '<td class="num">'+(r['是否超360天']?'是':'否')+'</td>';
      h += '</tr>';
    });
    h += '</tbody></table>';
    container.innerHTML = h;
  }

  // ── Auto-generated Conclusions ────────────────────────────────
  function createTag(cls, text) {
    var s = document.createElement('span');
    s.className = 'conclusion-tag ' + cls;
    s.textContent = '▎ ' + text;
    return s;
  }

  function renderConclusions() {
    var k = DATA.kpi;
    var buScores = DATA['业务单元分析'];
    var plScores = DATA['产品线分析'];
    var matA = DATA['物料分析'];
    var qt = DATA['季度趋势'];

    // --- Part 1: Overall ---
    var c1 = document.getElementById('conclusion1');
    c1.innerHTML = '';
    var firstQ = qt[0];
    var lastQ = qt[qt.length-1];
    var ratioDelta = (lastQ['原材料成本占比'] - firstQ['原材料成本占比']).toFixed(1);

    // Find the quarter with fastest ratio increase
    var maxJump = 0, jumpQ = '';
    for (var i=1;i<qt.length;i++) {
      var jump = qt[i]['原材料成本占比'] - qt[i-1]['原材料成本占比'];
      if (jump>maxJump) { maxJump=jump; jumpQ=qt[i]['季度']; }
    }

    addTag(c1, 'danger',
      '原材料成本是库存成本异常的主要来源，占比从 '+firstQ['季度']+' 的 '+firstQ['原材料成本占比'].toFixed(1)+'% 持续攀升至 '+lastQ['季度']+' 的 '+k['原材料成本占比'].toFixed(1)+'%，累计上升 '+ratioDelta+' 个百分点');
    addTag(c1, 'warn',
      '原材料成本占比长期偏高，始终在 49% 以上运行，自 2024 年起突破 50% 警戒线并加速上升');
    addTag(c1, 'danger',
      lastQ['季度']+' 总库存成本 '+k['总库存成本_万元']+' 万元，其中原材料成本 '+k['原材料成本_万元']+' 万元，占总库存成本 '+k['原材料成本占比'].toFixed(1)+'%');
    if (maxJump > 0.5) {
      addTag(c1, 'info', jumpQ+' 期间原材料成本占比单季上升 '+maxJump.toFixed(1)+' 个百分点，为异常加速阶段');
    }

    // --- Part 2: Business Unit ---
    var c2 = document.getElementById('conclusion2');
    c2.innerHTML = '';
    var sortedBu = buScores.slice().sort(function(a,b){return b['综合异常得分']-a['综合异常得分'];});
    var topBu = sortedBu[0];
    var topByRatio = buScores.slice().sort(function(a,b){return b['原材料成本占比']-a['原材料成本占比'];})[0];
    var topByGrowth = buScores.slice().sort(function(a,b){return b['原材料成本增长率']-a['原材料成本增长率'];})[0];

    addTag(c2, 'danger',
      topBu['业务单元']+' 综合异常得分最高（'+topBu['综合异常得分'].toFixed(4)+'），是库存成本异常的主要贡献业务单元。原材料成本 '+topBu['原材料成本_万元']+' 万元，占比 '+topBu['原材料成本占比'].toFixed(1)+'%');
    if (topByRatio['业务单元'] !== topBu['业务单元']) {
      addTag(c2, 'warn',
        '虽然 '+topByRatio['业务单元']+' 原材料成本占比最高（'+topByRatio['原材料成本占比'].toFixed(1)+'%），但从成本规模、增长率和长期积压金额综合看，主要异常贡献来自 '+topBu['业务单元']);
    }
    addTag(c2, 'info',
      '四个业务单元原材料成本占比均超过 40%，'+topByGrowth['业务单元']+' 增长率最高达 '+topByGrowth['原材料成本增长率'].toFixed(1)+'%，需重点关注增速异常');
    addTag(c2, 'info',
      '业务单元综合排名：'+sortedBu.map(function(x,i){return '#'+(i+1)+' '+x['业务单元']+'('+x['综合异常得分'].toFixed(3)+')';}).join('、'));

    // --- Part 3: Product Line ---
    var c3 = document.getElementById('conclusion3');
    c3.innerHTML = '';
    var sortedPl = plScores.slice().sort(function(a,b){return b['综合异常得分']-a['综合异常得分'];});
    var topPl = sortedPl[0];
    var topPlByRatio = plScores.slice().sort(function(a,b){return b['原材料成本占比']-a['原材料成本占比'];})[0];

    addTag(c3, 'danger',
      topPl['产品线']+'（'+topPl['所属业务单元']+'）综合异常得分最高（'+topPl['综合异常得分'].toFixed(4)+'），累计原材料成本 '+topPl['原材料成本_万元']+' 万元，占比 '+topPl['原材料成本占比'].toFixed(1)+'%');
    addTag(c3, 'warn',
      'TOP3 异常产品线：'+sortedPl.slice(0,3).map(function(x){return x['产品线']+'('+x['综合异常得分'].toFixed(3)+')';}).join('、')+'。其中 '+topPl['产品线']+' 集中了所有高风险物料');
    if (topPlByRatio['产品线'] !== topPl['产品线']) {
      addTag(c3, 'info',
        topPlByRatio['产品线']+' 原材料成本占比最高（'+topPlByRatio['原材料成本占比'].toFixed(1)+'%），但综合成本规模和高风险物料金额后，'+topPl['产品线']+' 异常程度更高');
    }

    // --- Part 4: Material & Aging ---
    var c4 = document.getElementById('conclusion4');
    c4.innerHTML = '';
    var stuckAmt = matA['积压金额_360天以上_万元'];
    var over360 = matA['超过360天物料'] || [];
    var matNames = {};
    over360.forEach(function(m){matNames[m['物料名称']]=true;});
    var matList = Object.keys(matNames).join('、');
    var top3Mat = (matA['高风险物料TOP10']||[]).slice(0,3);
    var top3Names = top3Mat.map(function(m){return m['物料名称']+'('+m['库龄天数']+'天)';}).join('、');

    addTag(c4, 'danger',
      '360天以上长期积压金额合计 '+stuckAmt.toFixed(2)+' 万元，涉及 '+over360.length+' 批次物料：'+matList+'，严重占用企业流动资金');
    addTag(c4, 'danger',
      'TOP3高风险物料：'+top3Names+'，风险得分分别为 '+top3Mat.map(function(m){return m['风险得分'].toFixed(4);}).join('、'));
    if (over360.length > 0) {
      addTag(c4, 'warn',
        '高库龄物料集中在 ' + over360[0]['业务单元'] + ' → ' + over360[0]['产品线'] + ' 链路，需立即启动库存清理专项工作');
    }
    addTag(c4, 'info',
      '建议建立库龄分级预警：30天绿、90天蓝、180天黄、360天红。超360天自动冻结新增采购。');

    // --- Part 5 data check ---
    // Ensure recommendation cards are not overwritten; they're static in HTML
  }

  function addTag(container, cls, text) {
    container.appendChild(createTag(cls, text));
  }

  // ── Data-driven Recommendation Card Updates ──────────────────
  function renderRecommendations() {
    var topMat3 = (DATA['物料分析']['高风险物料TOP10']||[]).slice(0,3);
    var topPl3 = (DATA['产品线分析']||[]).slice(0,3);

    // Card 1: inject actual high-risk material names
    if (topMat3.length > 0) {
      var matNameList = topMat3.map(function(m){return m['物料名称'];}).join('、');
      var el1 = document.getElementById('recP1');
      if (el1) el1.innerHTML = '对高风险物料（<b style="color:#ff9800;">'+matNameList+'</b>等）减少或暂停新增采购计划，优先消化长期积压库存。建立安全库存红线，库龄超过360天的物料禁止新增采购订单。';
    }

    // Card 3: inject actual abnormal product line names
    if (topPl3.length > 0) {
      var plNameList = topPl3.map(function(p){return p['产品线']+'('+p['所属业务单元']+')';}).join('、');
      var el3 = document.getElementById('recP3');
      if (el3) el3.innerHTML = '对异常产品线（<b style="color:#ff9800;">'+plNameList+'</b>等）制定促销清仓、组合销售方案。联动需求预测模型，将库存压力传导至销售端，加速库存周转，降低资金占用。';
    }
  }

  // ── Init ─────────────────────────────────────────────────────
  async function init() {
    await loadData();
    if (!DATA) return;

    renderKPIs();

    chartCostTrend();
    chartCostStack();
    chartRawRatio();

    chartBuBar();
    chartBuRatio();
    chartBuBubble();

    chartPlBar();
    chartPlRing();
    chartPlTrend();

    chartMatTop();
    chartMatScatter();
    chartAgingPie();
    renderMatTable();

    renderConclusions();
    renderRecommendations();

    var overlay = document.getElementById('loadingOverlay');
    if (overlay) { overlay.classList.add('hidden'); setTimeout(function(){overlay.style.display='none';},400); }
  }

  if (document.readyState==='loading') { document.addEventListener('DOMContentLoaded',init); }
  else { init(); }
})();
