/* ============================================================
   Test Yourself — a compact MCQ quiz auto-appended to any screen
   that has a bank in IV.QuestionBank. Grades inline, shows
   explanations, persists best score per screen.
   ============================================================ */
(function () {
  'use strict';
  const IV = (window.IcebergViz = window.IcebergViz || {});

  function bestKey(id) { return 'iv-quiz-' + id; }
  function getBest(id) { try { return parseInt(localStorage.getItem(bestKey(id)) || '', 10); } catch (e) { return NaN; } }
  function setBest(id, pct) {
    const prev = getBest(id);
    if (Number.isNaN(prev) || pct > prev) { try { localStorage.setItem(bestKey(id), String(pct)); } catch (e) {} }
  }

  function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  function build(id) {
    const container = document.getElementById('module-container');
    if (!container) return;
    container.querySelector('.iv-ty')?.remove();

    const bank = (IV.QuestionBank && IV.QuestionBank[id]) || [];
    if (!bank.length) return;

    const host = container.firstElementChild || container;
    const section = document.createElement('section');
    section.className = 'iv-ty';
    const best = getBest(id);
    section.innerHTML = `
      <div class="iv-ty__head">
        <h2 class="iv-ty__title">Test Yourself</h2>
        <span class="iv-ty__best" ${Number.isNaN(best) ? 'hidden' : ''}>Best: ${Number.isNaN(best) ? '' : best}%</span>
      </div>
      <div class="iv-ty__score" aria-live="polite"></div>
      <ol class="iv-ty__list"></ol>
      <div class="iv-ty__foot"><button class="iv-ty__reset btn-secondary" type="button" hidden>Try again</button></div>`;

    const list = section.querySelector('.iv-ty__list');
    let answered = 0, correct = 0;

    bank.forEach((qq, qi) => {
      const li = document.createElement('li');
      li.className = 'iv-ty__q';
      li.innerHTML = `
        <div class="iv-ty__prompt"><span class="iv-ty__diff iv-ty__diff--${qq.difficulty}">${qq.difficulty}</span>${esc(qq.q)}</div>
        <div class="iv-ty__opts" role="group"></div>
        <div class="iv-ty__exp" hidden></div>`;
      const opts = li.querySelector('.iv-ty__opts');
      qq.options.forEach((opt, oi) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'iv-ty__opt';
        b.innerHTML = `<span class="iv-ty__mark"></span><span>${esc(opt)}</span>`;
        b.addEventListener('click', () => {
          if (li.dataset.done) return;
          li.dataset.done = '1';
          answered++;
          const right = oi === qq.correct;
          if (right) correct++;
          opts.querySelectorAll('.iv-ty__opt').forEach((btn, bi) => {
            btn.disabled = true;
            if (bi === qq.correct) btn.classList.add('is-correct');
            if (bi === oi && !right) btn.classList.add('is-wrong');
          });
          const exp = li.querySelector('.iv-ty__exp');
          exp.innerHTML = `<strong>${right ? 'Correct.' : 'Not quite.'}</strong> ${esc(qq.explanation)}`;
          exp.hidden = false;
          if (answered === bank.length) finish();
        });
        opts.appendChild(b);
      });
      list.appendChild(li);
    });

    const scoreEl = section.querySelector('.iv-ty__score');
    const resetBtn = section.querySelector('.iv-ty__reset');
    function finish() {
      const pct = Math.round((correct / bank.length) * 100);
      setBest(id, pct);
      scoreEl.textContent = `You scored ${correct} / ${bank.length} (${pct}%)`;
      scoreEl.classList.add('is-shown');
      const bestEl = section.querySelector('.iv-ty__best');
      const nb = getBest(id);
      if (bestEl && !Number.isNaN(nb)) { bestEl.hidden = false; bestEl.textContent = `Best: ${nb}%`; }
      resetBtn.hidden = false;
    }
    resetBtn.addEventListener('click', () => build(id));

    // Keep the pager last if it's already there.
    const pager = host.querySelector(':scope > .iv-pager');
    if (pager) host.insertBefore(section, pager);
    else host.appendChild(section);
  }

  function init() {
    document.addEventListener('app:navigate', (e) => build(e.detail && e.detail.id));
    if (IV.currentScreenId && IV.currentScreenId()) build(IV.currentScreenId());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
