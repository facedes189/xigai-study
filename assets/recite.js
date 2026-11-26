/* 背书默写 · 逻辑：默写 → 对照 → 自评 */
(function () {
  'use strict';

  var R = window.APP_DATA.recite;
  var TYPES = ['short', 'essay', 'term'];
  var SRC = {
    short: { label: '简答题', unit: '题', items: R.short.map(function (x, i) { return { i: i, q: x.q, ref: x.a }; }) },
    essay: { label: '论述题', unit: '题', items: R.essay.map(function (x, i) { return { i: i, q: x.q, ref: '' }; }) },
    term:  { label: '核心术语', unit: '条', items: R.terms.map(function (x, i) { return { i: i, q: x.term, ref: x.def }; }) }
  };

  var LS_STATUS = 'xigai.recite.status.v1';
  var LS_DRAFT  = 'xigai.recite.draft.v1';
  var LS_POS    = 'xigai.recite.pos.v1';
  var LS_FILTER = 'xigai.recite.filter.v1';

  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var status = load(LS_STATUS, {}) || {};
  var draft  = load(LS_DRAFT, {}) || {};
  var pos    = load(LS_POS, {}) || {};
  var filter = load(LS_FILTER, {}) || {};
  var CURRENT = {};
  TYPES.forEach(function (t) {
    if (!status[t] || typeof status[t] !== 'object') status[t] = {};
    if (!draft[t] || typeof draft[t] !== 'object') draft[t] = {};
    if (typeof pos[t] !== 'number') pos[t] = 0;
    if (!filter[t]) filter[t] = 'all';
  });

  function persist() { save(LS_STATUS, status); save(LS_DRAFT, draft); save(LS_POS, pos); save(LS_FILTER, filter); }

  function pool(t) {
    var all = SRC[t].items;
    if (filter[t] === 'todo') return all.filter(function (x) { return status[t][x.i] !== 'ok'; });
    if (filter[t] === 'done') return all.filter(function (x) { return status[t][x.i] === 'ok'; });
    return all.slice();
  }

  function statusText(v) {
    return v === 'ok' ? '✓ 已掌握' : v === 'mid' ? '△ 模糊' : v === 'no' ? '✗ 不会' : '未自评';
  }

  function hint(t) {
    if (t === 'short') return '用 2-3 句话默写，写完再点「显示参考答案」对照。';
    if (t === 'essay') return '论述题重在思路，写下你自己的要点提纲即可（原指南未提供标准答案）。';
    return '先回想这个术语的定义并默写，再展开标准定义对照。';
  }

  function placeholder(t) {
    return t === 'term' ? '在这里默写该术语的定义…' : '在这里默写你的答案…';
  }

  function cardHtml(t, item, index) {
    var s = status[t][item.i] || '';
    var d = draft[t][item.i] || '';
    var hasRef = t !== 'essay';
    var h = '';
    h += '<div class="q-head">';
    h += '<span class="q-no">' + (index + 1) + '</span>';
    h += '<span class="q-chapter">' + SRC[t].label + '</span>';
    h += '<span class="chip js-status-chip">' + statusText(s) + '</span>';
    h += '</div>';
    if (t === 'term') {
      h += '<div class="term-word" style="margin:4px 0 12px">' + esc(item.q) + '</div>';
    } else {
      h += '<div class="recite-q">' + esc(item.q) + '</div>';
    }
    h += '<div class="hint">' + hint(t) + '</div>';
    h += '<textarea class="area js-area" data-type="' + t + '" placeholder="' + placeholder(t) + '">' + esc(d) + '</textarea>';
    h += '<div class="btn-row" style="margin-top:12px">';
    if (hasRef) {
      h += '<button class="btn btn-primary js-toggle-ref" data-type="' + t + '">显示' + (t === 'term' ? '标准定义' : '参考答案') + '</button>';
    } else {
      h += '<div class="tiny" style="align-self:center">✍️ 本题无标准答案，写出提纲即可</div>';
    }
    h += '</div>';
    if (hasRef) {
      h += '<div class="ref js-ref" style="display:none"><b>' + (t === 'term' ? '标准定义' : '参考答案') + '</b><br>' + esc(item.ref) + '</div>';
    }
    h += '<div class="section-title" style="margin:20px 2px 8px">背得怎么样？</div>';
    h += '<div class="self-rate">';
    [['ok', '✓ 熟练'], ['mid', '△ 模糊'], ['no', '✗ 不会']].forEach(function (p) {
      h += '<button class="rate-btn js-rate' + (s === p[0] ? ' on' : '') + '" data-type="' + t +
           '" data-i="' + item.i + '" data-v="' + p[0] + '">' + p[1] + '</button>';
    });
    h += '</div>';
    h += '<div class="tiny" style="margin-top:12px">默写内容自动保存；自评后可用上方筛选，只反复背没掌握的内容。</div>';
    return h;
  }

  function renderOverview() {
    var h = '<div class="section-title" style="margin:0 0 10px">掌握进度</div>';
    TYPES.forEach(function (t) {
      var all = SRC[t].items.length, ok = 0;
      for (var k in status[t]) if (Object.prototype.hasOwnProperty.call(status[t], k) && status[t][k] === 'ok') ok++;
      var pct = all ? Math.round(ok / all * 100) : 0;
      h += '<div style="display:flex;align-items:center;gap:10px;margin:9px 0">';
      h += '<span style="width:70px;flex:none;font-size:13.5px;font-weight:600">' + SRC[t].label + '</span>';
      h += '<div class="progress" style="flex:1"><i style="width:' + pct + '%"></i></div>';
      h += '<span class="progress-num">' + ok + ' / ' + all + '</span>';
      h += '</div>';
    });
    h += '<div class="tiny" style="margin-top:10px">自评为「✓ 熟练」才计入掌握进度。</div>';
    document.getElementById('overview').innerHTML = h;
  }

  function render(t) {
    var p = pool(t);
    var box = document.getElementById('body-' + t);
    if (!p.length) {
      CURRENT[t] = null;
      box.innerHTML = '<div class="empty">' +
        (filter[t] === 'done' ? '还没有标记为「熟练」的内容' : '这个筛选下没有内容了 🎉') +
        '<br><br><button class="btn btn-soft btn-sm js-reset-filter" data-type="' + t + '">查看全部</button></div>';
    } else {
      if (pos[t] >= p.length) pos[t] = 0;
      if (pos[t] < 0) pos[t] = p.length - 1;
      var item = p[pos[t]];
      CURRENT[t] = item.i;
      box.innerHTML = cardHtml(t, item, pos[t]);
    }
    var total = p.length;
    var pct = total ? ((pos[t] + 1) / total * 100) : 0;
    document.getElementById('bar-' + t).style.width = pct + '%';
    document.getElementById('num-' + t).textContent = total
      ? ('第 ' + (pos[t] + 1) + ' / ' + total + ' ' + SRC[t].unit) : '暂无内容';
    var chips = document.querySelectorAll('#filter-' + t + ' .chip');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('on', chips[i].getAttribute('data-f') === filter[t]);
    }
    renderOverview();
  }

  function go(t, delta) {
    var p = pool(t);
    if (!p.length) return;
    pos[t] = (pos[t] + delta + p.length) % p.length;
    persist(); render(t);
  }

  // ---------- 事件 ----------
  document.getElementById('tabbar').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.tab') : null;
    if (!b) return;
    var tabs = document.querySelectorAll('#tabbar .tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('on', tabs[i] === b);
    TYPES.forEach(function (t) { document.getElementById('pane-' + t).classList.toggle('on', t === b.getAttribute('data-tab')); });
  });

  document.addEventListener('click', function (e) {
    var t = e.target;
    function hit(s) { return t.closest ? t.closest(s) : null; }

    var ref = hit('.js-toggle-ref');
    if (ref) {
      var card = ref.closest('.card');
      var box = card ? card.querySelector('.js-ref') : null;
      if (box) {
        var showing = box.style.display !== 'none';
        box.style.display = showing ? 'none' : 'block';
        ref.textContent = (showing ? '显示' : '隐藏') + (ref.getAttribute('data-type') === 'term' ? '标准定义' : '参考答案');
        if (!showing) {
          setTimeout(function () {
            if (box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 80);
        }
      }
      return;
    }

    var rate = hit('.js-rate');
    if (rate) {
      var type = rate.getAttribute('data-type');
      var i = rate.getAttribute('data-i');
      var v = rate.getAttribute('data-v');
      status[type][i] = (status[type][i] === v ? '' : v);   // 再点一次可取消自评
      persist();
      var c = rate.closest('.card');
      var btns = c ? c.querySelectorAll('.js-rate') : [];
      for (var j = 0; j < btns.length; j++) btns[j].classList.toggle('on', btns[j].getAttribute('data-v') === status[type][i]);
      var chip = c ? c.querySelector('.js-status-chip') : null;
      if (chip) chip.textContent = statusText(status[type][i]);
      renderOverview();
      return;
    }

    var fc = hit('#filter-short .chip, #filter-essay .chip, #filter-term .chip');
    if (fc) {
      var ft = fc.parentNode.id.replace('filter-', '');
      filter[ft] = fc.getAttribute('data-f');
      pos[ft] = 0; persist(); render(ft);
      return;
    }

    var nav = hit('[data-nav]');
    if (nav) { go(nav.getAttribute('data-nav'), parseInt(nav.getAttribute('data-d'), 10)); return; }

    var rnd = hit('[data-rand]');
    if (rnd) {
      var rt = rnd.getAttribute('data-rand');
      var rp = pool(rt);
      if (rp.length) { pos[rt] = Math.floor(Math.random() * rp.length); persist(); render(rt); }
      return;
    }

    var clr = hit('[data-clear]');
    if (clr) {
      var ct = clr.getAttribute('data-clear');
      if (!window.confirm('确定清空「' + SRC[ct].label + '」的掌握标记吗？默写草稿会保留。')) return;
      status[ct] = {}; persist(); render(ct);
      return;
    }

    var rf = hit('.js-reset-filter');
    if (rf) {
      var rft = rf.getAttribute('data-type');
      filter[rft] = 'all'; pos[rft] = 0; persist(); render(rft);
      return;
    }
  });

  document.addEventListener('input', function (e) {
    if (!e.target.classList || !e.target.classList.contains('js-area')) return;
    var t = e.target.getAttribute('data-type');
    if (CURRENT[t] === null || CURRENT[t] === undefined) return;
    draft[t][CURRENT[t]] = e.target.value;
    save(LS_DRAFT, draft);
  });

  // ---------- 初始化 ----------
  TYPES.forEach(function (t) { render(t); });
})();
