/* 单选题刷题 · 逻辑 */
(function () {
  'use strict';

  var DATA = window.APP_DATA.quiz;
  var CH = DATA.chapters;
  var ALL = [];
  var BY_ID = {};
  CH.forEach(function (c, ci) {
    c.questions.forEach(function (q) {
      var item = {
        id: ci + '-' + q.no, ci: ci, chapter: c.name, no: q.no,
        stem: q.stem, options: q.options, answer: q.answer
      };
      ALL.push(item);
      BY_ID[item.id] = item;
    });
  });

  var LS_ANS = 'xigai.quiz.answers.v1';
  var LS_SET = 'xigai.quiz.settings.v1';
  var LS_POS = 'xigai.quiz.pos.v1';

  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var answers = load(LS_ANS, {});
  var settings = load(LS_SET, { mode: 'all', chapter: 'all', shuffle: false });
  if (!settings || typeof settings !== 'object') settings = { mode: 'all', chapter: 'all', shuffle: false };
  var pool = [], pos = 0, selected = null;
  var view = { choice: null, showAnswer: false, reveal: false };

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function buildPool() {
    var list = ALL.filter(function (q) {
      if (settings.chapter !== 'all' && String(q.ci) !== String(settings.chapter)) return false;
      var r = answers[q.id];
      if (settings.mode === 'undone') return !r;
      if (settings.mode === 'wrong') return !!r && !r.correct;
      return true;
    });
    if (settings.shuffle) shuffle(list);
    return list;
  }

  function firstUndone() {
    for (var i = 0; i < pool.length; i++) if (!answers[pool[i].id]) return i;
    return -1;
  }

  function syncChips() {
    var chips = document.querySelectorAll('#modeRow .chip');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('on', chips[i].getAttribute('data-mode') === settings.mode);
    }
    var sc = document.getElementById('shuffleChip');
    sc.textContent = '🔀 随机顺序：' + (settings.shuffle ? '开' : '关');
    sc.classList.toggle('on', settings.shuffle);
    document.getElementById('chapterSel').value = settings.chapter;
  }

  function applySettings(reset) {
    save(LS_SET, settings);
    syncChips();
    pool = buildPool();
    if (reset) { pos = 0; save(LS_POS, 0); }
    else {
      var s = load(LS_POS, null);
      if (typeof s === 'number' && s > 0 && s < pool.length) pos = s;
      else { var f = firstUndone(); pos = f >= 0 ? f : 0; }
    }
    selected = null;
    view = { choice: null, showAnswer: false, reveal: false };
    render();
  }

  function goto(i) {
    if (i < 0 || i >= pool.length) return;
    pos = i;
    save(LS_POS, pos);
    selected = null;
    view = { choice: null, showAnswer: false, reveal: false };
    render();
    var card = document.getElementById('questionCard');
    if (card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function counts() {
    var done = 0, ok = 0;
    for (var k in answers) if (Object.prototype.hasOwnProperty.call(answers, k)) {
      done++; if (answers[k].correct) ok++;
    }
    return { done: done, ok: ok, wrong: done - ok };
  }

  function answerHtml(q, choice, status, isReveal) {
    var h = '<div class="answer-panel ' + status + '">';
    var icon = status === 'ok' ? '✓' : (status === 'no' ? '✕' : '📖');
    var title = status === 'ok' ? '回答正确' : (status === 'no' ? '回答错误' : '已显示答案');
    h += '<div class="ans-title ' + status + '"><span>' + icon + '</span> ' + title + '</div>';
    h += '<div class="ans-line">正确答案：<b class="ans-correct">' + q.answer + '．' + esc(q.options[q.answer]) + '</b></div>';
    if (choice && choice !== q.answer) {
      h += '<div class="ans-line">你的选择：<b class="ans-mine">' + choice + '．' + esc(q.options[choice]) + '</b></div>';
    } else if (isReveal) {
      h += '<div class="ans-line tiny" style="margin-top:6px">本题未作答，已记入错题，可在「只做错题」里重练。</div>';
    }
    h += '<div class="ans-actions">';
    h += '<button class="btn btn-primary" id="nextBtn">' + (pos >= pool.length - 1 ? '完成练习 ✓' : '下一题 →') + '</button>';
    h += '<button class="btn btn-ghost btn-sm" id="againBtn">重做本题</button>';
    h += '</div></div>';
    return h;
  }

  function emptyHtml() {
    var c = counts();
    var h = '<div style="text-align:center;padding:18px 6px">';
    h += '<div style="font-size:40px">🎉</div>';
    h += '<h3 style="margin:8px 0 6px">这个范围已经做完啦</h3>';
    h += '<p class="muted" style="font-size:14.5px">累计已答 ' + c.done + ' 题，答对 ' + c.ok + ' 题' +
         (c.done ? '，正确率 ' + Math.round(c.ok / c.done * 100) + '%' : '') + '。</p>';
    h += '<div class="btn-row" style="justify-content:center;margin-top:16px">';
    h += '<button class="btn btn-primary btn-sm" id="finishRestart">再练一遍</button>';
    h += '<button class="btn btn-soft btn-sm" id="finishWrong">只做错题</button>';
    h += '<a class="btn btn-ghost btn-sm" href="index.html">返回首页</a>';
    h += '</div></div>';
    return h;
  }

  function render() {
    var body = document.getElementById('qBody');
    var q = pool[pos];
    if (!q) { body.innerHTML = emptyHtml(); updateChrome(); return; }

    var rec = answers[q.id];
    var choice = view.choice !== null ? view.choice : (rec ? rec.choice : null);
    var show = view.showAnswer || !!rec;
    var isReveal = !!(rec && rec.revealed) || view.reveal;
    var status = isReveal ? 'reveal' : (rec ? (rec.correct ? 'ok' : 'no') : 'reveal');

    var h = '';
    h += '<div class="q-head"><span class="q-no">' + q.no + '</span><span class="q-chapter">' + esc(q.chapter) + '</span></div>';
    h += '<div class="q-stem">' + esc(q.stem).replace(/（　）/g, '<span class="blank">（　）</span>') + '</div>';
    h += '<div class="options">';
    ['A', 'B', 'C', 'D'].forEach(function (k) {
      var cls = 'option';
      if (show) {
        cls += ' locked';
        if (k === q.answer) cls += ' correct';
        else if (choice === k) cls += ' wrong';
        else cls += ' dim';
      } else if (choice === k) cls += ' sel';
      h += '<button class="' + cls + '" data-k="' + k + '"><span class="letter">' + k +
           '</span><span class="otext">' + esc(q.options[k]) + '</span></button>';
    });
    h += '</div>';
    if (!show) {
      h += '<div class="btn-row" style="margin-top:16px">';
      h += '<button class="btn btn-primary" id="submitBtn" style="flex:2" ' + (selected ? '' : 'disabled') + '>提交答案</button>';
      h += '<button class="btn btn-ghost" id="revealBtn" style="flex:1">直接看答案</button>';
      h += '</div>';
      h += '<div class="tiny" style="margin-top:10px">选好选项后点「提交答案」，正确答案会立刻显示在这道题下方。</div>';
    } else if (status) {
      h += answerHtml(q, choice, status, isReveal);
    }
    body.innerHTML = h;
    updateChrome();
  }

  function renderHistory() {
    var box = document.getElementById('historyList');
    var list = [];
    for (var id in answers) if (Object.prototype.hasOwnProperty.call(answers, id)) {
      list.push({ id: id, r: answers[id] });
    }
    list.sort(function (a, b) { return (b.r.ts || 0) - (a.r.ts || 0); });
    if (!list.length) { box.innerHTML = '<div class="empty">还没有作答记录，做一道题试试吧。</div>'; return; }
    var h = '';
    list.slice(0, 80).forEach(function (it) {
      var q = BY_ID[it.id]; if (!q) return;
      var r = it.r;
      var stem = q.stem.length > 54 ? q.stem.slice(0, 54) + '…' : q.stem;
      h += '<div class="history-item" data-id="' + it.id + '" style="cursor:pointer">';
      h += '<div class="history-q">' + esc(stem) + '</div>';
      h += '<div class="history-meta">';
      h += '<span class="pill ' + (r.correct ? 'ok' : 'no') + '">' + (r.correct ? '✓ 正确' : (r.revealed ? '看了答案' : '✕ 错误')) + '</span>';
      h += '<span>你选：' + (r.choice || '—') + '</span>';
      h += '<span style="color:var(--ok);font-weight:700">答案：' + q.answer + '</span>';
      h += '<span class="tiny">' + esc(q.chapter) + ' · 第' + q.no + '题</span>';
      h += '</div></div>';
    });
    box.innerHTML = h;
  }

  function updateChrome() {
    var c = counts();
    document.getElementById('statDone').textContent = c.done;
    document.getElementById('statOk').textContent = c.ok;
    document.getElementById('statWrong').textContent = c.wrong;
    var pct = pool.length ? ((pos + 1) / pool.length * 100) : 0;
    document.getElementById('progressBar').style.width = pct + '%';
    document.getElementById('progressText').textContent = pool.length ? ('第 ' + (pos + 1) + ' / ' + pool.length + ' 题') : '暂无题目';
    document.getElementById('prevBtn').disabled = pos <= 0;
    renderHistory();
  }

  function scrollToAnswer() {
    setTimeout(function () {
      var p = document.querySelector('#qBody .answer-panel');
      if (p && p.scrollIntoView) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  }

  function submit() {
    var q = pool[pos]; if (!q || answers[q.id] || view.showAnswer || !selected) return;
    var ok = selected === q.answer;
    answers[q.id] = { choice: selected, correct: ok, revealed: false, ts: Date.now() };
    save(LS_ANS, answers);
    view.choice = selected; view.showAnswer = true;
    render();
    scrollToAnswer();
  }

  function reveal() {
    var q = pool[pos]; if (!q || answers[q.id] || view.showAnswer) return;
    answers[q.id] = { choice: null, correct: false, revealed: true, ts: Date.now() };
    save(LS_ANS, answers);
    view.reveal = true; view.showAnswer = true; view.choice = null;
    render();
    scrollToAnswer();
  }

  function again() {
    var q = pool[pos]; if (!q) return;
    delete answers[q.id]; save(LS_ANS, answers);
    selected = null; view = { choice: null, showAnswer: false, reveal: false };
    render();
  }

  function next() {
    if (pos >= pool.length - 1) { document.getElementById('qBody').innerHTML = emptyHtml(); return; }
    goto(pos + 1);
  }

  function jumpUndone() {
    if (!pool.length) return;
    for (var s = 1; s <= pool.length; s++) {
      var i = (pos + s) % pool.length;
      if (!answers[pool[i].id]) { goto(i); return; }
    }
    alert('当前范围里已经没有未做的题目了。');
  }

  function showQuestionById(id) {
    settings.mode = 'all'; settings.chapter = 'all'; settings.shuffle = false;
    save(LS_SET, settings); syncChips();
    pool = buildPool();
    var i = -1;
    for (var k = 0; k < pool.length; k++) if (pool[k].id === id) { i = k; break; }
    if (i >= 0) goto(i);
  }

  // ---------- 事件 ----------
  document.getElementById('questionCard').addEventListener('click', function (e) {
    var t = e.target;
    function hit(sel) { return t.closest ? t.closest(sel) : null; }

    var opt = hit('.option');
    if (opt && !answers[pool[pos].id] && !view.showAnswer) {
      selected = opt.getAttribute('data-k');
      var opts = document.querySelectorAll('#qBody .option');
      for (var i = 0; i < opts.length; i++) opts[i].classList.toggle('sel', opts[i] === opt);
      var sb = document.getElementById('submitBtn'); if (sb) sb.disabled = false;
      return;
    }
    if (hit('#submitBtn')) { submit(); return; }
    if (hit('#revealBtn')) { reveal(); return; }
    if (hit('#nextBtn')) { next(); return; }
    if (hit('#againBtn')) { again(); return; }
    if (hit('#finishRestart')) { pos = 0; save(LS_POS, 0); selected = null; view = { choice: null, showAnswer: false, reveal: false }; render(); return; }
    if (hit('#finishWrong')) { settings.mode = 'wrong'; applySettings(true); return; }
  });

  document.getElementById('historyList').addEventListener('click', function (e) {
    var it = e.target.closest ? e.target.closest('.history-item') : null;
    if (it) showQuestionById(it.getAttribute('data-id'));
  });

  document.getElementById('modeRow').addEventListener('click', function (e) {
    var c = e.target.closest ? e.target.closest('.chip') : null;
    if (!c) return;
    settings.mode = c.getAttribute('data-mode');
    applySettings(true);
  });

  document.getElementById('shuffleChip').addEventListener('click', function () {
    settings.shuffle = !settings.shuffle;
    applySettings(true);
  });

  document.getElementById('chapterSel').addEventListener('change', function (e) {
    settings.chapter = e.target.value;
    applySettings(true);
  });

  document.getElementById('prevBtn').addEventListener('click', function () { goto(pos - 1); });
  document.getElementById('jumpBtn').addEventListener('click', jumpUndone);
  document.getElementById('clearBtn').addEventListener('click', function () {
    if (!window.confirm('确定清空全部作答记录吗？此操作不可撤销。')) return;
    answers = {}; save(LS_ANS, answers); save(LS_POS, 0);
    applySettings(true);
  });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    var q = pool[pos];
    if (!q) return;
    var key = e.key;
    if (/^[1-4a-dA-D]$/.test(key) && !answers[q.id] && !view.showAnswer) {
      var map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
      selected = map[key] || key.toUpperCase();
      var opts = document.querySelectorAll('#qBody .option');
      for (var i = 0; i < opts.length; i++) opts[i].classList.toggle('sel', opts[i].getAttribute('data-k') === selected);
      var sb = document.getElementById('submitBtn'); if (sb) sb.disabled = false;
      e.preventDefault(); return;
    }
    if (key === 'Enter') {
      if (view.showAnswer || answers[q.id]) next(); else submit();
      e.preventDefault(); return;
    }
    if (key === 'ArrowRight') { next(); e.preventDefault(); }
    if (key === 'ArrowLeft') { goto(pos - 1); e.preventDefault(); }
  });

  // ---------- 初始化 ----------
  (function init() {
    var sel = document.getElementById('chapterSel');
    var h = '<option value="all">全部（' + ALL.length + ' 题）</option>';
    CH.forEach(function (c, i) {
      h += '<option value="' + i + '">' + esc(c.name) + '（' + c.questions.length + ' 题）</option>';
    });
    sel.innerHTML = h;
    applySettings(false);
  })();
})();
