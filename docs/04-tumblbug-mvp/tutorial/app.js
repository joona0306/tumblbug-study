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
      "t-idx-stages",
      "t-idx-picture",
      "t-idx-accounts"
    ],
    "week1": [
      "t1-s1-compare",
      "t1-s1-summary",
      "t1-s2-guide",
      "t1-s2-recruit",
      "t1-s3-interview",
      "t1-s4-cluster",
      "t1-s4-insight",
      "t1-retro"
    ],
    "week10": [
      "t10-s1-code",
      "t10-s1-test",
      "t10-s2-code",
      "t10-s2-check",
      "t10-s3-code",
      "t10-s3-test",
      "t10-s4-e2e",
      "t10-retro"
    ],
    "week11": [
      "t11-s1-code",
      "t11-s1-check",
      "t11-s2-code",
      "t11-s2-test",
      "t11-s2-pay",
      "t11-s3-code",
      "t11-s3-test",
      "t11-s4-code",
      "t11-s5-e2e",
      "t11-retro"
    ],
    "week12": [
      "t12-s1-api",
      "t12-s2-code",
      "t12-s2-check",
      "t12-s3-code",
      "t12-s4-code",
      "t12-s5-e2e",
      "t12-retro"
    ],
    "week13": [
      "t13-s1-code",
      "t13-s1-check",
      "t13-s2-code",
      "t13-s2-check",
      "t13-s3-code",
      "t13-s3-test",
      "t13-s4-code",
      "t13-s5-e2e",
      "t13-retro"
    ],
    "week14": [
      "t14-s1-prep",
      "t14-s2-read",
      "t14-s3-neon",
      "t14-s3-vercel",
      "t14-s4-github",
      "t14-s5-preview",
      "t14-s5-prod",
      "t14-retro"
    ],
    "week15": [
      "t15-s1-funnel",
      "t15-s2-check",
      "t15-s3-ops",
      "t15-s4-alert",
      "t15-s4-test",
      "t15-s5-uptime",
      "t15-s6-restore",
      "t15-s7-webhook",
      "t15-retro"
    ],
    "week16": [
      "t16-s1-wsl",
      "t16-s1-docker",
      "t16-s2-files",
      "t16-s3-up",
      "t16-s4-mfa",
      "t16-s4-budget",
      "t16-s4-iam",
      "t16-s5-ec2",
      "t16-s5-eip",
      "t16-s6-setup",
      "t16-s7-secrets",
      "t16-s7-deploy",
      "t16-s8-rollback",
      "t16-s9-local",
      "t16-s9-ec2",
      "t16-c-instance",
      "t16-c-eip",
      "t16-c-rest",
      "t16-c-github",
      "t16-c-bill",
      "t16-retro"
    ],
    "week17": [
      "t17-s1-code",
      "t17-s2-form",
      "t17-s3-admin",
      "t17-s3-hide",
      "t17-s3-alerts",
      "t17-s3-dryrun",
      "t17-s4-sim",
      "t17-s4-log",
      "t17-retro"
    ],
    "week18": [
      "t18-s1-sql",
      "t18-s2-group",
      "t18-s3-rank",
      "t18-s4-incident",
      "t18-retro"
    ],
    "week19": [
      "t19-s1-test",
      "t19-s2-fix",
      "t19-s3-pass",
      "t19-s4-pr",
      "t19-s4-measure",
      "t19-retro"
    ],
    "week2": [
      "t2-s1-prd",
      "t2-s2-adr",
      "t2-s3-erd",
      "t2-s4-state",
      "t2-retro"
    ],
    "week20": [
      "t20-s1-lh",
      "t20-s1-kbd",
      "t20-s2-dry",
      "t20-s2-real",
      "t20-s3-dod",
      "t20-s4-case",
      "t20-retro"
    ],
    "week3": [
      "t3-s1-flow",
      "t3-s2-wire",
      "t3-s2-states",
      "t3-s3-map",
      "t3-retro"
    ],
    "week4": [
      "t4-s1-tokens",
      "t4-s1-contrast",
      "t4-s2-components",
      "t4-s3-screens",
      "t4-s4-proto",
      "t4-s4-test",
      "t4-retro"
    ],
    "week5": [
      "t5-s1-create",
      "t5-s1-tokens",
      "t5-s2-ui",
      "t5-s3-zod",
      "t5-s3-tokens",
      "t5-s4-e2e",
      "t5-s5-ci",
      "t5-s6-sentry",
      "t5-s6-env",
      "t5-s7-map",
      "t5-s8-font",
      "t5-retro"
    ],
    "week6": [
      "t6-s1-db",
      "t6-s1-ci",
      "t6-s2-schema",
      "t6-s3-test",
      "t6-s4-seed",
      "t6-s5-sql",
      "t6-s5-code",
      "t6-s6-explain",
      "t6-s7-tx",
      "t6-retro"
    ],
    "week7": [
      "t7-s1-auth",
      "t7-s1-redirect",
      "t7-s2-proxy",
      "t7-s3-create",
      "t7-s3-edit",
      "t7-s4-e2e",
      "t7-retro"
    ],
    "week8": [
      "t8-s1-status",
      "t8-s2-reward",
      "t8-s3-query",
      "t8-s4-pages",
      "t8-s5-e2e",
      "t8-retro"
    ],
    "week9": [
      "t9-s1-api",
      "t9-s2-rate",
      "t9-s3-infinite",
      "t9-s4-e2e",
      "t9-retro"
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

  // 주차 탭이 많으면(4단계 21개) 지금 주차 탭이 화면 밖에 있을 수 있다 → 메뉴를 옆으로 밀어 가운데에 보이게
  function centerCurrentTab() {
    var nav = document.querySelector(".week-tabs");
    var current = nav && nav.querySelector('[aria-current="page"]');
    if (!current) return;
    var navBox = nav.getBoundingClientRect();
    var tabBox = current.getBoundingClientRect();
    var left = nav.scrollLeft + (tabBox.left - navBox.left) - (navBox.width - tabBox.width) / 2;
    nav.scrollTo({ left: left, behavior: "instant" }); // 부드럽게 움직이면 처음 열 때 어지럽다
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupThemeToggle();
    setupCheckboxes();
    setupNotes();
    setupReset();
    setupCopyButtons();
    openFromHash();
    renderProgress();
    centerCurrentTab(); // 탭마다 진행 개수("0/7")가 채워진 뒤에 — 먼저 맞추면 폭이 늘어나 위치가 밀린다
  });
  window.addEventListener("load", centerCurrentTab); // 글꼴이 늦게 들어와 폭이 바뀌는 경우까지
  window.addEventListener("hashchange", openFromHash);
})();
