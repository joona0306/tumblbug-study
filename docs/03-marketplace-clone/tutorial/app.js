/* ==========================================================================
   교재 공용 스크립트 (0단계, 1단계 … 모든 교재가 같은 파일을 복사해서 사용)
   - 체크박스/회고 메모를 브라우저(localStorage)에 저장해 새로고침해도 유지
   - 전체 진행률 바, 주차 탭별 진행 상황, "지금 할 차례" 표시
   - 코드 블록 복사 버튼, 라이트/다크 모드 전환
   ========================================================================== */
(function () {
  "use strict";

  // 아래 목록은 tools/sync-tutorial-code.mjs 가 HTML의 data-task 를 모아서 자동으로 채운다.
  // (직접 고치지 말 것 — 스크립트를 다시 실행하면 덮어써짐)
  /* TASKS:START */
  var TASKS = {
    "index": [
      "m-idx-stage12",
      "m-idx-read"
    ],
    "week1": [
      "m1-compete",
      "m1-scope",
      "m1-wire",
      "m1-erd",
      "m1-design",
      "m1-copy",
      "m1-ts-install",
      "m1-ts-fix",
      "m1-ts-check",
      "m1-contact",
      "m1-contact-check",
      "m1-retro"
    ],
    "week2": [
      "m2-s1-table",
      "m2-s2-blob",
      "m2-s2-code",
      "m2-s2-check",
      "m2-s3-code",
      "m2-s3-check",
      "m2-s4-code",
      "m2-s4-check",
      "m2-s4-blob",
      "m2-retro"
    ],
    "week3": [
      "m3-s1-code",
      "m3-s1-check",
      "m3-s2-code",
      "m3-s2-check",
      "m3-s3-code",
      "m3-s3-check",
      "m3-s4-code",
      "m3-s4-check",
      "m3-s5-code",
      "m3-retro"
    ],
    "week4": [
      "m4-s1-github",
      "m4-s1-blob",
      "m4-s2-deploy",
      "m4-s2-phone",
      "m4-s3-metric",
      "m4-s4-script",
      "m4-s4-usage",
      "m4-s5-usability",
      "m4-s5-a11y",
      "m4-s6-cycle",
      "m4-s6-next",
      "mdod-upload",
      "mdod-status",
      "mdod-owner",
      "mdod-contact",
      "mdod-blob",
      "mdod-a11y",
      "m4-retro"
    ]
  };
  /* TASKS:END */

  // 페이지 순서 = TASKS 에 적힌 순서 (index, week1, week2 ...)
  var PAGE_ORDER = Object.keys(TASKS);
  // 과정마다 저장 공간을 따로 쓴다. <html data-course="..."> 로 지정 (기본값 linktree)
  var COURSE = document.documentElement.getAttribute("data-course") || "linktree";
  var STORAGE_KEY = COURSE + "-tutorial:v1";
  var THEME_KEY = "tutorial:theme";

  // ---------- 저장소 (브라우저가 막아도 페이지는 정상 동작하도록 try/catch) ----------
  function loadState() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object") {
        return { tasks: parsed.tasks || {}, notes: parsed.notes || {} };
      }
    } catch (e) {
      /* 저장소를 쓸 수 없는 환경 */
    }
    return { tasks: {}, notes: {} };
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* 저장 실패해도 화면은 계속 동작 */
    }
  }

  var state = loadState();

  // ---------- 테마 ----------
  function applyTheme(theme) {
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  function currentTheme() {
    var set = document.documentElement.getAttribute("data-theme");
    if (set) return set;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  try {
    applyTheme(window.localStorage.getItem(THEME_KEY));
  } catch (e) {
    /* 무시 */
  }

  function setupThemeToggle() {
    var button = document.getElementById("theme-toggle");
    if (!button) return;
    function label() {
      button.textContent = currentTheme() === "dark" ? "☀ 라이트" : "☾ 다크";
    }
    label();
    button.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch (e) {
        /* 무시 */
      }
      label();
    });
  }

  // ---------- 진행률 계산 ----------
  function countFor(page) {
    var ids = TASKS[page] || [];
    var done = 0;
    for (var i = 0; i < ids.length; i++) {
      if (state.tasks[ids[i]]) done++;
    }
    return { done: done, total: ids.length };
  }

  function currentWorkPage() {
    // 순서대로 봤을 때 아직 다 끝내지 못한 첫 페이지 = 지금 할 차례
    for (var i = 0; i < PAGE_ORDER.length; i++) {
      var c = countFor(PAGE_ORDER[i]);
      if (c.total > 0 && c.done < c.total) return PAGE_ORDER[i];
    }
    return null;
  }

  function renderProgress() {
    var done = 0;
    var total = 0;
    for (var i = 0; i < PAGE_ORDER.length; i++) {
      var c = countFor(PAGE_ORDER[i]);
      done += c.done;
      total += c.total;
    }
    var percent = total ? Math.round((done / total) * 100) : 0;

    var fill = document.getElementById("progress-fill");
    var text = document.getElementById("progress-text");
    var track = document.getElementById("progress-track");
    if (fill) fill.style.width = percent + "%";
    if (text) text.textContent = done + " / " + total + " 완료 (" + percent + "%)";
    if (track) track.setAttribute("aria-valuenow", String(percent));

    var now = currentWorkPage();

    // 상단 주차 탭
    var tabs = document.querySelectorAll(".week-tabs a[data-page]");
    for (var t = 0; t < tabs.length; t++) {
      var page = tabs[t].getAttribute("data-page");
      var pc = countFor(page);
      var countEl = tabs[t].querySelector(".tab-count");
      if (countEl) countEl.textContent = pc.done + "/" + pc.total;
      tabs[t].classList.toggle("is-done", pc.total > 0 && pc.done === pc.total);
      tabs[t].classList.toggle("is-now", page === now);
      tabs[t].title = page === now ? "지금 할 차례" : "";
    }

    // 첫 화면의 주차 카드
    var cards = document.querySelectorAll("[data-week-card]");
    for (var k = 0; k < cards.length; k++) {
      var cardPage = cards[k].getAttribute("data-week-card");
      var cc = countFor(cardPage);
      var cp = cc.total ? Math.round((cc.done / cc.total) * 100) : 0;
      var mini = cards[k].querySelector(".mini-fill");
      var miniText = cards[k].querySelector(".mini-text");
      if (mini) mini.style.width = cp + "%";
      if (miniText) miniText.textContent = cc.done + " / " + cc.total + " 완료";
      cards[k].classList.toggle("is-now", cardPage === now);
    }

    // 단계(아코디언) 안의 체크박스를 모두 끝냈으면 번호를 초록색으로
    var steps = document.querySelectorAll("details.step");
    for (var s = 0; s < steps.length; s++) {
      var boxes = steps[s].querySelectorAll("input[type=checkbox][data-task]");
      var all = boxes.length > 0;
      for (var b = 0; b < boxes.length; b++) {
        if (!boxes[b].checked) {
          all = false;
          break;
        }
      }
      steps[s].classList.toggle("is-complete", all);
    }
  }

  // ---------- 체크박스 ----------
  function setupCheckboxes() {
    var boxes = document.querySelectorAll("input[type=checkbox][data-task]");
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      box.checked = Boolean(state.tasks[box.getAttribute("data-task")]);
      box.addEventListener("change", function (event) {
        var id = event.target.getAttribute("data-task");
        if (event.target.checked) {
          state.tasks[id] = true;
        } else {
          delete state.tasks[id];
        }
        saveState();
        renderProgress();
      });
    }
  }

  // ---------- 회고 메모 ----------
  function setupNotes() {
    var notes = document.querySelectorAll("textarea[data-note]");
    for (var i = 0; i < notes.length; i++) {
      var area = notes[i];
      area.value = state.notes[area.getAttribute("data-note")] || "";
      area.addEventListener("input", function (event) {
        state.notes[event.target.getAttribute("data-note")] = event.target.value;
        saveState();
      });
    }
  }

  // ---------- 초기화 ----------
  function setupReset() {
    var button = document.getElementById("reset-progress");
    if (!button) return;
    button.addEventListener("click", function () {
      if (!window.confirm("체크 표시와 회고 메모를 모두 지울까요? 되돌릴 수 없습니다.")) return;
      state = { tasks: {}, notes: {} };
      saveState();
      var boxes = document.querySelectorAll("input[type=checkbox][data-task]");
      for (var i = 0; i < boxes.length; i++) boxes[i].checked = false;
      var notes = document.querySelectorAll("textarea[data-note]");
      for (var j = 0; j < notes.length; j++) notes[j].value = "";
      renderProgress();
    });
  }

  // ---------- 코드 복사 ----------
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    // 예전 방식 (일부 환경에서 clipboard API를 못 쓸 때)
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy") ? resolve() : reject(new Error("copy failed"));
      } catch (e) {
        reject(e);
      } finally {
        document.body.removeChild(area);
      }
    });
  }

  function setupCopyButtons() {
    var figures = document.querySelectorAll("figure.code");
    for (var i = 0; i < figures.length; i++) {
      (function (figure) {
        var caption = figure.querySelector("figcaption");
        var code = figure.querySelector("pre code");
        if (!caption || !code) return;
        var button = document.createElement("button");
        button.type = "button";
        button.className = "copy-button";
        button.textContent = "복사";
        button.setAttribute("aria-label", "코드 복사");
        button.addEventListener("click", function () {
          copyText(code.textContent.replace(/\n$/, "")).then(
            function () {
              button.textContent = "복사됨 ✓";
              button.classList.add("is-copied");
              setTimeout(function () {
                button.textContent = "복사";
                button.classList.remove("is-copied");
              }, 1500);
            },
            function () {
              button.textContent = "직접 선택해 복사하세요";
            }
          );
        });
        caption.appendChild(button);
      })(figures[i]);
    }
  }

  // ---------- 주소의 #앵커로 들어오면 해당 단계를 펼치기 ----------
  function openFromHash() {
    if (!location.hash) return;
    var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!target) return;
    var details = target.closest ? target.closest("details") : null;
    if (target.tagName === "DETAILS") details = target;
    if (details) details.open = true;
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupThemeToggle();
    setupCheckboxes();
    setupNotes();
    setupReset();
    setupCopyButtons();
    openFromHash();
    renderProgress();
  });
  window.addEventListener("hashchange", openFromHash);
})();
