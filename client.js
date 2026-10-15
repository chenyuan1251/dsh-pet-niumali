/**
 * dsh-pet-niumali · 客户端半边（常驻浮球）
 * ────────────────────────────────────────────────────────────
 * 宿主半边（index.mjs）只挂了一条静态资源路由 /pet-niumali，因此插件以前
 * "看不见" —— 没有 dsh.client，就没有任何 GUI 集成点。
 *
 * 这里补上客户端半边：在 shell.overlay 槽位注册一个常驻浮球。浮球可拖动、
 * 位置持久化，点一下就在当前 DSH 页面里以浮窗打开牛马力（iframe 同源），
 * 并在球上实时显示存档里的路费与今日闭环状态。
 *
 * 写法约束（照抄 dsh-enhance，无构建步骤、无 JSX）：
 *   - 必须用 window.__ModuleLoader__.load({ id, factory }) 外壳；
 *   - react 从平台种子 require，不进 dsh.client.inject；
 *   - 服务依赖写 exports.inject = ["slots"]，否则 slots 未就绪时整段 UI 静默失效；
 *   - 一切订阅/监听/定时器都挂到插件 fiber 的 ctx.effect 上，供热重载与卸载回收。
 */
window.__ModuleLoader__.load({
  id: "dsh-pet-niumali",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

    /* ══ 常量 ══════════════════════════════════════════════ */

    const PLUGIN_ID = "dsh-pet-niumali";
    /** 宿主半边 index.mjs 挂载的静态路由前缀，两边必须一致。 */
    const PET_PATH = "/pet-niumali";
    // The pet page loads its assets relatively ("assets/style.css"), so the document
    // URL must end in a slash -- at "/pet-niumali" they resolve against the site root,
    // 404, and the whole page renders unstyled with broken images.
    const PET_PAGE = PET_PATH + "/";
    /** 浮球头像取面子包里的表情包；显式 encodeURIComponent，避开中文文件名的编码差异。 */
    const AVATAR_URL = PET_PATH + "/assets/images/" + encodeURIComponent("小牛表情包_开心微笑.jpg");
    /** 桌宠存档在 localStorage 的键（web/assets/app.js 里的 const KEY）。 */
    const PET_STATE_KEY = "niumali.v9";

    /** 浮球与浮窗的位置/开关都落在 localStorage，刷新与重启都不丢。 */
    const LS_BALL = PLUGIN_ID + ":ball";
    const LS_PANEL = PLUGIN_ID + ":panel";
    const LS_VISIBLE = PLUGIN_ID + ":visible";
    const LS_PIN = PLUGIN_ID + ":pin";

    const BALL_SIZE = 62;
    const PANEL_W = 400;
    const EDGE = 8;
    /** 拖动判定的死区：小于这个位移算点击，不算拖动。 */
    const DRAG_SLOP = 4;

    /* ══ 样式 ══════════════════════════════════════════════ */

    const CSS = `
/* 我的根层铺满视口但不吃事件，只有球/窗/菜单自己 pointer-events:auto —— 绝不能挡住 DSH 的界面。
   静止元素里只放 position:fixed 的子节点时，根层自身在文档流里高度为 0，
   所以连 slots 宿主那层包装 div 也不会变成整屏的点击拦截层，不依赖宿主容器的样式。 */
.nml-root{position:fixed;inset:0;z-index:900;pointer-events:none}

.nml-ball{
  position:fixed;pointer-events:auto;width:${BALL_SIZE}px;height:${BALL_SIZE}px;
  border-radius:50%;border:none;padding:0;cursor:grab;overflow:visible;
  background:var(--dsw-alias-bg-layer-1,#fff);
  box-shadow:0 6px 20px rgba(0,0,0,.28),0 0 0 2px rgba(201,168,76,.55);
  transition:box-shadow .2s ease,transform .12s ease;
  -webkit-user-select:none;user-select:none;touch-action:none;
}
.nml-ball:hover{transform:scale(1.06);box-shadow:0 10px 26px rgba(0,0,0,.34),0 0 0 2px rgba(201,168,76,.9)}
.nml-ball.nml-dragging{cursor:grabbing;transform:scale(1.08);transition:none}
.nml-ball.nml-open{box-shadow:0 10px 26px rgba(0,0,0,.34),0 0 0 2px rgba(201,168,76,1)}
/* 今日双打卡闭环完成 → 环变绿，一眼看出"今天已经活的明白了" */
.nml-ball.nml-done{box-shadow:0 6px 20px rgba(0,0,0,.28),0 0 0 2px rgba(86,168,124,.95)}

.nml-face{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;pointer-events:none}
.nml-face-fallback{width:100%;height:100%;display:block;pointer-events:none}

/* 球下方的小徽标：显示存档里的路费 */
.nml-badge{
  position:absolute;left:50%;bottom:-7px;transform:translateX(-50%);
  pointer-events:none;white-space:nowrap;
  font-size:10px;line-height:1;font-weight:600;letter-spacing:.2px;
  padding:3px 7px;border-radius:999px;
  background:rgba(24,20,16,.9);color:#F0DFC0;
  box-shadow:0 1px 5px rgba(0,0,0,.35);border:1px solid rgba(201,168,76,.45);
}
.nml-badge.nml-badge-done{background:rgba(24,64,44,.92);color:#CDEBD8;border-color:rgba(86,168,124,.6)}

/* 悬停时从球左侧滑出的名字 */
.nml-tip{
  position:absolute;right:calc(100% + 10px);top:50%;transform:translateY(-50%) scale(.96);
  pointer-events:none;opacity:0;transition:opacity .18s ease,transform .18s ease;
  white-space:nowrap;font-size:11.5px;line-height:1;padding:6px 9px;border-radius:8px;
  background:rgba(24,20,16,.94);color:#F5EAD6;border:1px solid rgba(201,168,76,.4);
  box-shadow:0 4px 14px rgba(0,0,0,.3);
}
.nml-ball:hover .nml-tip{opacity:1;transform:translateY(-50%) scale(1)}

/* ── 浮窗 ── */
.nml-panel{
  position:fixed;pointer-events:auto;display:flex;flex-direction:column;
  width:${PANEL_W}px;border-radius:16px;overflow:hidden;
  background:var(--dsw-alias-bg-layer-1,#fff);
  border:1px solid var(--dsw-alias-border-l3,rgba(201,168,76,.35));
  box-shadow:0 20px 60px rgba(0,0,0,.42);
}
.nml-head{
  display:flex;align-items:center;gap:8px;flex:0 0 auto;
  padding:9px 10px;cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none;
  background:var(--dsw-alias-bg-module-platform,rgba(127,127,127,.08));
  border-bottom:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.2));
  color:var(--dsw-alias-label-primary,currentColor);font-size:12.5px;
}
.nml-head.nml-dragging{cursor:grabbing}
.nml-title{font-weight:600;letter-spacing:.2px}
.nml-chip{
  font-size:10.5px;line-height:1;padding:3px 7px;border-radius:999px;
  background:rgba(201,168,76,.16);color:#B08A2E;border:1px solid rgba(201,168,76,.4);
}
.nml-spacer{flex:1 1 auto}
.nml-btn{
  flex:0 0 auto;width:24px;height:24px;border-radius:7px;cursor:pointer;
  display:grid;place-items:center;font-size:13px;line-height:1;padding:0;
  background:transparent;color:var(--dsw-alias-label-secondary,currentColor);
  border:1px solid transparent;transition:background .15s ease,color .15s ease;
}
.nml-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));color:var(--dsw-alias-label-primary,currentColor)}
.nml-btn.nml-close:hover{background:rgba(220,80,80,.9);color:#fff}
/* 📌：默认是拖动把手（光标 grab），点一下则钉住位置，钉住后整条标题栏都拖不动。
   钉住 / 没钉住的差别必须一眼可见，所以做三重区分：
   斜着的灰钉子 → 正过来的彩钉子。只换 emoji 不够 —— 📌 和 📍 在 12px 上
   本来就有点像，朝向、饱和度、底色一起变才认得出来。 */
.nml-btn.nml-pin{cursor:grab;font-size:12px;opacity:.6;transform:rotate(-22deg);
  transition:transform .28s cubic-bezier(.34,1.56,.64,1),opacity .22s,background .22s,border-color .22s}
.nml-head.nml-dragging .nml-btn.nml-pin{cursor:grabbing}
.nml-btn.nml-pin.nml-on{opacity:1;transform:rotate(0deg) scale(1.18);
  background:rgba(201,168,76,.24);border-color:rgba(201,168,76,.6);color:#B08A2E}
.nml-head.nml-pinned{cursor:default}
.nml-head.nml-pinned .nml-btn.nml-pin{cursor:pointer}
.nml-body{flex:1 1 auto;min-height:0;background:var(--dsw-alias-bg-base,#fff)}
.nml-frame{width:100%;height:100%;border:0;display:block}
/* 关掉但保持挂载时只隐藏，不打碎 iframe —— 桌宠的专注计时不能因为收起浮窗就断掉 */
.nml-body.nml-hidden{display:none}

/* ── 右键菜单 ── */
.nml-menu{
  position:fixed;pointer-events:auto;z-index:901;min-width:158px;padding:5px;
  border-radius:10px;font-size:12.5px;
  background:var(--dsw-alias-bg-layer-1,#fff);
  border:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.3));
  box-shadow:0 12px 34px rgba(0,0,0,.34);
}
.nml-mi{
  display:block;width:100%;text-align:left;padding:7px 9px;border-radius:7px;cursor:pointer;
  background:transparent;border:none;font:inherit;font-size:12.5px;
  color:var(--dsw-alias-label-primary,currentColor);
}
.nml-mi:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14))}
.nml-sep{height:1px;margin:4px 6px;background:var(--dsw-alias-border-l2,rgba(127,127,127,.22))}

/* ── 设置页 ── */
.nml-set{display:flex;flex-direction:column;gap:14px;padding:2px 0}
.nml-row{display:flex;align-items:flex-start;gap:12px}
.nml-row-t{display:flex;flex-direction:column;gap:3px;flex:1 1 auto}
.nml-row-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary,currentColor)}
.nml-row-desc{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary,currentColor)}
.nml-sw{
  flex:0 0 auto;width:38px;height:22px;border-radius:999px;cursor:pointer;
  border:1px solid var(--dsw-alias-border-l4,rgba(127,127,127,.4));
  background:var(--dsw-alias-interactive-bg-hover-solid,rgba(127,127,127,.25));
  position:relative;transition:background .18s ease,border-color .18s ease;padding:0;
}
.nml-sw.nml-on{background:var(--dsw-alias-brand-primary,#4B7BEC);border-color:transparent}
.nml-knob{
  position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;
  background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .18s ease;
}
.nml-sw.nml-on .nml-knob{transform:translateX(16px)}
.nml-link{
  color:var(--dsw-alias-brand-primary,#4B7BEC);cursor:pointer;text-decoration:none;
  border-bottom:1px dashed currentColor;
}
`;

    const STYLE_SELECTOR = 'style[data-plugin-css="' + PLUGIN_ID + '"]';

    /** 幂等 upsert：热重载时不会叠出第二份样式表；卸载时按 data-plugin 归属被清掉。 */
    function upsertStyle() {
      let el = document.querySelector(STYLE_SELECTOR);
      if (!el) {
        el = document.createElement("style");
        el.dataset.plugin = PLUGIN_ID;
        el.dataset.pluginCss = PLUGIN_ID;
        el.textContent = CSS;
        document.head.appendChild(el);
      }
      return el;
    }

    function removeStyle() {
      const el = document.querySelector(STYLE_SELECTOR);
      if (el) el.remove();
    }

    /* ══ 小工具 ════════════════════════════════════════════ */

    function lsGet(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : raw;
      } catch (_) {
        return fallback;
      }
    }

    function lsSet(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (_) {}
    }

    function readJSON(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const v = JSON.parse(raw);
        return v === null || v === undefined ? fallback : v;
      } catch (_) {
        return fallback;
      }
    }

    /** 把浮球/浮窗夹在视口内；窗口缩放或从旧分辨率恢复时用。 */
    function clampToViewport(pos, w, h) {
      const maxX = Math.max(EDGE, window.innerWidth - w - EDGE);
      const maxY = Math.max(EDGE, window.innerHeight - h - EDGE);
      return {
        x: Math.min(Math.max(EDGE, Math.round(pos.x)), maxX),
        y: Math.min(Math.max(EDGE, Math.round(pos.y)), maxY),
      };
    }

    function defaultBallPos() {
      return clampToViewport(
        { x: window.innerWidth - BALL_SIZE - 22, y: window.innerHeight - BALL_SIZE - 100 },
        BALL_SIZE,
        BALL_SIZE,
      );
    }

    function panelHeight() {
      return Math.max(420, Math.min(660, window.innerHeight - 120));
    }

    function defaultPanelPos() {
      const h = panelHeight();
      return clampToViewport(
        { x: window.innerWidth - PANEL_W - 104, y: window.innerHeight - h - 64 },
        PANEL_W,
        h,
      );
    }

    function today() {
      const d = new Date();
      return (
        d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(d.getDate()).padStart(2, "0")
      );
    }

    /* ══ 极简可订阅 store ══════════════════════════════════ */

    function createStore(initial) {
      let state = initial;
      const listeners = new Set();
      return {
        get() {
          return state;
        },
        set(patch) {
          state = Object.assign({}, state, patch);
          for (const l of Array.from(listeners)) {
            try {
              l();
            } catch (_) {}
          }
        },
        subscribe(l) {
          listeners.add(l);
          return () => {
            listeners.delete(l);
          };
        },
      };
    }

    function useStore(store) {
      return React.useSyncExternalStore(store.subscribe, store.get, store.get);
    }

    /* ══ 拖拽（浮球与浮窗共用）═════════════════════════════
     * 点击与拖动共用一条指针通路：位移没超过死区就算点击，超过就只算拖动。
     * 这样不会出现"拖完手一松顺手把面板开关一次"的经典毛病。
     */
    function useDrag(cfg) {
      const ref = React.useRef(null);
      const cfgRef = React.useRef(cfg);
      cfgRef.current = cfg;

      return React.useMemo(() => {
        function finish(e, allowTap) {
          const s = ref.current;
          ref.current = null;
          if (!s) return;
          try {
            e.currentTarget.releasePointerCapture(s.id);
          } catch (_) {}
          if (s.moved) {
            if (cfgRef.current.onDrop) cfgRef.current.onDrop();
          } else if (allowTap && cfgRef.current.onTap) {
            cfgRef.current.onTap(e);
          }
        }
        return {
          onPointerDown(e) {
            // 只认左键；右键留给 contextmenu
            if (e.pointerType === "mouse" && e.button !== 0) return;
            // 钉住时整块都拖不动：不是拖到一半才拒绝，而是压根不开始。
            if (cfgRef.current.canStart && !cfgRef.current.canStart()) return;
            const start = cfgRef.current.getStart();
            ref.current = { px: e.clientX, py: e.clientY, start, moved: false, id: e.pointerId };
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch (_) {}
          },
          onPointerMove(e) {
            const s = ref.current;
            if (!s) return;
            const dx = e.clientX - s.px;
            const dy = e.clientY - s.py;
            if (!s.moved) {
              if (Math.abs(dx) + Math.abs(dy) < DRAG_SLOP) return;
              s.moved = true;
            }
            if (cfgRef.current.onMove) cfgRef.current.onMove({ dx, dy, start: s.start });
          },
          onPointerUp(e) {
            finish(e, true);
          },
          onPointerCancel(e) {
            finish(e, false);
          },
        };
      }, []);
    }

    /* ══ 读桌宠存档（同源 localStorage）═════════════════════
     * iframe 与 DSH 界面同源，所以父页面能直接读桌宠的状态：
     *   - storage 事件负责实时性（桌宠每次 save() 都会派发到其它同源文档）；
     *   - 5 秒轮询兜底，防止事件在某些浏览器下被节流掉。
     */
    function readPet() {
      return readJSON(PET_STATE_KEY, null);
    }

    function usePetState() {
      const [pet, setPet] = React.useState(readPet);
      React.useEffect(() => {
        function onStorage(e) {
          if (!e.key || e.key === PET_STATE_KEY) setPet(readPet());
        }
        window.addEventListener("storage", onStorage);
        const timer = setInterval(() => setPet(readPet()), 5000);
        return () => {
          window.removeEventListener("storage", onStorage);
          clearInterval(timer);
        };
      }, []);
      return pet;
    }

    /** 今日闭环：开工与收工都打过卡。 */
    function loopDone(pet) {
      if (!pet || !pet.checkin) return false;
      const t = today();
      return pet.checkin.workDate === t && pet.checkin.offDate === t;
    }

    /* ══ 头像 ══════════════════════════════════════════════ */

    const FALLBACK_FACE = React.createElement(
      "svg",
      { className: "nml-face-fallback", viewBox: "0 0 64 64", "aria-hidden": "true" },
      React.createElement(
        "defs",
        null,
        React.createElement(
          "linearGradient",
          { id: "nmlFaceGrad", x1: "0", y1: "0", x2: "1", y2: "1" },
          React.createElement("stop", { offset: "0%", stopColor: "#C9A84C" }),
          React.createElement("stop", { offset: "60%", stopColor: "#D4866F" }),
          React.createElement("stop", { offset: "100%", stopColor: "#8FBCA8" }),
        ),
      ),
      React.createElement("circle", { cx: "32", cy: "32", r: "32", fill: "url(#nmlFaceGrad)" }),
      // 耳朵
      React.createElement("ellipse", { cx: "13", cy: "24", rx: "7", ry: "5", fill: "#8A6F4A", opacity: ".9" }),
      React.createElement("ellipse", { cx: "51", cy: "24", rx: "7", ry: "5", fill: "#8A6F4A", opacity: ".9" }),
      // 口鼻
      React.createElement("ellipse", { cx: "32", cy: "43", rx: "15", ry: "10", fill: "#FBF3E6" }),
      // 眼睛
      React.createElement("circle", { cx: "24", cy: "33", r: "3", fill: "#2B2118" }),
      React.createElement("circle", { cx: "40", cy: "33", r: "3", fill: "#2B2118" }),
      // 鼻孔
      React.createElement("ellipse", { cx: "28", cy: "43", rx: "1.8", ry: "2.4", fill: "#8A6F4A" }),
      React.createElement("ellipse", { cx: "36", cy: "43", rx: "1.8", ry: "2.4", fill: "#8A6F4A" }),
    );

    function Avatar() {
      const [failed, setFailed] = React.useState(false);
      if (failed) return FALLBACK_FACE;
      return React.createElement("img", {
        className: "nml-face",
        src: AVATAR_URL,
        alt: "牛马力",
        draggable: false,
        onError: () => setFailed(true),
      });
    }

    /* ══ 浮球 ══════════════════════════════════════════════ */

    function Ball(props) {
      const store = props.store;
      const s = useStore(store);
      const pet = usePetState();
      const done = loopDone(pet);
      const pos = s.ball;

      const handlers = useDrag({
        getStart: () => store.get().ball,
        onMove: ({ dx, dy, start }) =>
          store.set({
            ball: clampToViewport({ x: start.x + dx, y: start.y + dy }, BALL_SIZE, BALL_SIZE),
            ballDragging: true,
          }),
        onDrop: () => {
          store.set({ ballDragging: false });
          localStorage_set(LS_BALL, store.get().ball);
        },
        onTap: () => props.onToggle(),
      });

      const cls = ["nml-ball"];
      if (s.ballDragging) cls.push("nml-dragging");
      if (s.open) cls.push("nml-open");
      if (done) cls.push("nml-done");

      const badgeCls = done ? "nml-badge nml-badge-done" : "nml-badge";
      const fare = pet && typeof pet.fare === "number" ? pet.fare : null;

      return React.createElement(
        "button",
        Object.assign(
          {
            type: "button",
            className: cls.join(" "),
            style: { left: pos.x + "px", top: pos.y + "px" },
            title: "牛马力 · 替你活（拖动可换位置，右键更多）",
            onContextMenu: (e) => {
              e.preventDefault();
              props.onMenu({ x: e.clientX, y: e.clientY });
            },
          },
          handlers,
        ),
        React.createElement(Avatar, null),
        React.createElement("span", { className: "nml-tip" }, done ? "牛马力 · 今天闭环了" : "牛马力 · 替你活"),
        fare !== null
          ? React.createElement("span", { className: badgeCls }, done ? "✓ 闭环" : "路费 " + fare)
          : null,
      );
    }

    // localStorage 的 JSON 存取单独包一层，名字直白些
    function localStorage_set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (_) {}
    }

    /* ══ 浮窗（内嵌桌宠页面）═══════════════════════════════ */

    function Panel(props) {
      const store = props.store;
      const s = useStore(store);
      const pet = usePetState();
      // 首次打开才挂 iframe；之后收起只是 display:none，保住桌宠的运行状态。
      const [everOpened, setEverOpened] = React.useState(s.open);
      React.useEffect(() => {
        if (s.open && !everOpened) setEverOpened(true);
      }, [s.open, everOpened]);

      // 刚拖完的那一下别再当成「点击」：松手后浏览器还会补一个 click，
      // 不拦的话拖完浮窗会顺手把钉子按反。
      const dragEndAt = React.useRef(0);

      const handlers = useDrag({
        // 钉住 = 位置锁死，整块标题栏都不再响应拖动。
        canStart: () => !store.get().panelPinned,
        getStart: () => store.get().panel,
        onMove: ({ dx, dy, start }) =>
          store.set({
            panel: clampToViewport(
              { x: start.x + dx, y: start.y + dy },
              PANEL_W,
              panelHeight(),
            ),
            panelDragging: true,
          }),
        onDrop: () => {
          dragEndAt.current = Date.now();
          store.set({ panelDragging: false });
          localStorage_set(LS_PANEL, store.get().panel);
        },
      });

      // 这一下到底是「点钉子」还是「拖浮窗」收尾？位移算过拖动，就用时间戳挡掉随后的 click。
      function togglePin() {
        if (Date.now() - dragEndAt.current < 300) return;
        const next = !store.get().panelPinned;
        store.set({ panelPinned: next });
        lsSet(LS_PIN, next ? "1" : "0");
      }

      const h = panelHeight();
      const headCls =
        "nml-head" +
        (s.panelDragging ? " nml-dragging" : "") +
        (s.panelPinned ? " nml-pinned" : "");
      const streak = pet && pet.checkin && pet.checkin.streak ? pet.checkin.streak : 0;

      return React.createElement(
        "div",
        {
          className: "nml-panel",
          style: {
            left: s.panel.x + "px",
            top: s.panel.y + "px",
            height: h + "px",
            display: s.open ? "flex" : "none",
          },
        },
        React.createElement(
          "div",
          Object.assign({ className: headCls }, handlers),
          React.createElement("span", { className: "nml-title" }, "牛马力 · 替你活"),
          streak > 0
            ? React.createElement("span", { className: "nml-chip" }, "连续 " + streak + " 天")
            : null,
          React.createElement("span", { className: "nml-spacer" }),
          // 📌 是浮窗的把手，也是一个开关：按住能拖，点一下钉住位置。
          // 这里刻意不 stopPropagation —— 指针要能冒泡到标题栏，拖动才接得上；
          // 是「点」还是「拖」由 useDrag 的位移死区决定，拖动收尾的那次 click
          // 再用 dragEndAt 挡掉，所以不会拖完顺手把钉子按反。
          // 老版本把它做成了一个 <a href target="_blank"> 的 ↗：DSH 桌面端没人接管
          // 新窗口请求，点了没反应，还让人以为这一块不能拖。
          React.createElement(
            "button",
            {
              type: "button",
              className: s.panelPinned ? "nml-btn nml-pin nml-on" : "nml-btn nml-pin",
              title: s.panelPinned
                ? "已钉住 · 位置锁死，再点一下解除"
                : "点一下钉住位置 · 按住可拖动浮窗",
              "aria-pressed": s.panelPinned ? "true" : "false",
              "aria-label": s.panelPinned ? "已钉住，点击解除" : "钉住浮窗位置",
              onClick: togglePin,
            },
            // 斜着的 📌 = 还没钉；正插着的 📍 = 钉住了。图标自己会说状态。
            s.panelPinned ? "📍" : "📌",
          ),
          React.createElement(
            "button",
            {
              type: "button",
              className: "nml-btn nml-close",
              title: "收起浮窗",
              onPointerDown: (e) => e.stopPropagation(),
              onClick: props.onClose,
            },
            "×",
          ),
        ),
        React.createElement(
          "div",
          { className: "nml-body" + (s.open ? "" : " nml-hidden") },
          everOpened
            ? React.createElement("iframe", {
                className: "nml-frame",
                src: PET_PAGE,
                title: "牛马力 · 替你活",
                allow: "clipboard-write; autoplay",
              })
            : null,
        ),
      );
    }

    /* ══ 右键菜单 ══════════════════════════════════════════ */

    function Menu(props) {
      const store = props.store;
      const s = useStore(store);
      const pet = usePetState();
      const done = loopDone(pet);
      const items = [
        {
          label: s.open ? "收起浮窗" : "打开桌宠",
          run: () => store.set({ open: !s.open }),
        },
        { sep: true },
        {
          label: "重置浮球位置",
          run: () => {
            const p = defaultBallPos();
            store.set({ ball: p });
            localStorage_set(LS_BALL, p);
          },
        },
        {
          label: "隐藏浮球（设置里可再打开）",
          run: () => {
            store.set({ visible: false });
            lsSet(LS_VISIBLE, "0");
          },
        },
      ];

      // 菜单贴着鼠标，但不许溢出视口
      const x = Math.min(props.at.x, Math.max(EDGE, window.innerWidth - 180));
      const y = Math.min(props.at.y, Math.max(EDGE, window.innerHeight - 150));

      return React.createElement(
        "div",
        { className: "nml-menu", style: { left: x + "px", top: y + "px" } },
        React.createElement(
          "div",
          { className: "nml-mi", style: { cursor: "default", opacity: ".65" } },
          done ? "今日闭环 · 已完成" : "今日闭环 · 未完成",
        ),
        React.createElement("div", { className: "nml-sep" }),
        items.map((it, i) =>
          it.sep
            ? React.createElement("div", { className: "nml-sep", key: "sep" + i })
            : React.createElement(
                "button",
                {
                  type: "button",
                  className: "nml-mi",
                  key: it.label,
                  onClick: () => {
                    it.run();
                    props.onClose();
                  },
                },
                it.label,
              ),
        ),
      );
    }

    /* ══ 根组件 ════════════════════════════════════════════ */

    function FloatingPet(props) {
      const store = props.store;
      const s = useStore(store);
      const [menuAt, setMenuAt] = React.useState(null);

      // 打开状态持久化：重启 DSH 后浮窗还是开着的
      React.useEffect(() => {
        lsSet(LS_PANEL_OPEN_FLAG, s.open ? "1" : "0");
      }, [s.open]);

      // 视口变化时把球和窗重新夹回来
      React.useEffect(() => {
        function onResize() {
          store.set({
            ball: clampToViewport(store.get().ball, BALL_SIZE, BALL_SIZE),
            panel: clampToViewport(store.get().panel, PANEL_W, panelHeight()),
          });
        }
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
      }, [store]);

      // 点空白处/按 Esc 关掉右键菜单
      React.useEffect(() => {
        if (!menuAt) return;
        function close() {
          setMenuAt(null);
        }
        function onKey(e) {
          if (e.key === "Escape") close();
        }
        window.addEventListener("pointerdown", close, true);
        window.addEventListener("keydown", onKey);
        return () => {
          window.removeEventListener("pointerdown", close, true);
          window.removeEventListener("keydown", onKey);
        };
      }, [menuAt]);

      if (!s.visible) return null;

      return React.createElement(
        "div",
        { className: "nml-root" },
        React.createElement(Panel, {
          store: store,
          onClose: () => store.set({ open: false }),
        }),
        React.createElement(Ball, {
          store: store,
          onToggle: () => store.set({ open: !store.get().open }),
          onMenu: setMenuAt,
        }),
        menuAt
          ? React.createElement(Menu, { store: store, at: menuAt, onClose: () => setMenuAt(null) })
          : null,
      );
    }

    const LS_PANEL_OPEN_FLAG = PLUGIN_ID + ":open";

    /* ══ 设置页 ════════════════════════════════════════════ */

    function SettingsSection(props) {
      const store = props.store;
      const s = useStore(store);
      const pet = usePetState();

      function Row(title, desc, control) {
        return React.createElement(
          "div",
          { className: "nml-row", key: title },
          React.createElement(
            "div",
            { className: "nml-row-t" },
            React.createElement("span", { className: "nml-row-title" }, title),
            React.createElement("span", { className: "nml-row-desc" }, desc),
          ),
          control,
        );
      }

      function Switch(on, onClick, key) {
        return React.createElement(
          "button",
          {
            type: "button",
            key: key,
            className: "nml-sw" + (on ? " nml-on" : ""),
            role: "switch",
            "aria-checked": on ? "true" : "false",
            onClick: onClick,
          },
          React.createElement("span", { className: "nml-knob" }),
        );
      }

      const fare = pet && typeof pet.fare === "number" ? pet.fare : "—";

      return React.createElement(
        "div",
        { className: "nml-set" },
        Row(
          "常驻浮球",
          "在界面右下角显示一个可拖动的桌宠浮球。点一下就在当前页面浮窗打开牛马力，右键有更多操作。关掉后只能用这里再打开。",
          Switch(s.visible, () => {
            const next = !s.visible;
            store.set({ visible: next });
            lsSet(LS_VISIBLE, next ? "1" : "0");
          }, "visible"),
        ),
        Row(
          "重置浮球位置",
          "把浮球放回右下角默认位置（拖动后跑偏了可以用）。",
          React.createElement(
            "button",
            {
              type: "button",
              className: "nml-mi",
              style: { flex: "0 0 auto", width: "auto", padding: "6px 12px" },
              onClick: () => {
                const p = defaultBallPos();
                store.set({ ball: p });
                localStorage_set(LS_BALL, p);
              },
            },
            "重置",
          ),
        ),
        Row(
          "当前存档",
          "路费 " + fare + " · 浮球徽标读的就是这份存档（同源 localStorage）。",
          React.createElement(
            "a",
            {
              className: "nml-btn",
              href: PET_PAGE,
              target: "_blank",
              rel: "noreferrer",
              title: "在新标签页打开牛马力",
              style: { width: "auto", padding: "6px 12px" },
            },
            "打开 ↗",
          ),
        ),
      );
    }

    /* ══ 注册 ══════════════════════════════════════════════ */

    /** 浮球与设置页共享的状态；在 factory 里建一次，热重载时整体重建。 */
    const store = createStore({
      ball: defaultBallPos(),
      panel: defaultPanelPos(),
      open: lsGet(LS_PANEL_OPEN_FLAG, "0") === "1",
      visible: lsGet(LS_VISIBLE, "1") !== "0",
      /** 钉住：浮窗位置锁死，标题栏不再响应拖动。 */
      panelPinned: lsGet(LS_PIN, "0") === "1",
      ballDragging: false,
      panelDragging: false,
    });

    // 恢复上次的浮球/浮窗坐标
    (function restorePositions() {
      const b = readJSON(LS_BALL, null);
      if (b && typeof b.x === "number" && typeof b.y === "number") {
        store.set({ ball: clampToViewport(b, BALL_SIZE, BALL_SIZE) });
      }
      const p = readJSON(LS_PANEL, null);
      if (p && typeof p.x === "number" && typeof p.y === "number") {
        store.set({ panel: clampToViewport(p, PANEL_W, panelHeight()) });
      }
    })();

    function apply(ctx) {
      const disposers = [];
      upsertStyle();
      disposers.push(removeStyle);

      // 必须挂在插件 fiber 上：否则客户端热重载每轮都会再叠一份。
      ctx.effect(
        () => () => {
          for (const dispose of disposers.reverse()) {
            try {
              dispose();
            } catch (_) {}
          }
        },
        "dsh-pet-niumali: runtime lifecycle",
      );

      const slots = ctx.get("slots");
      if (slots === undefined) return;

      // 浮球：整壳覆盖层，order 排在 dsh-enhance 的两个 overlay(10/11) 之后。
      slots.inject("shell.overlay", () =>
        slots.register({ name: "shell.overlay", id: "dsh-pet-niumali-ball", order: 12 }, () =>
          React.createElement(FloatingPet, { store: store }),
        ),
      );

      // 设置页一格：浮球藏起来之后，这是唯一的找回入口。
      slots.inject("settings.section", () =>
        slots.register(
          { name: "settings.section", id: "dsh-pet-niumali", order: 31, label: "牛马力桌宠" },
          () => React.createElement(SettingsSection, { store: store }),
        ),
      );
    }

    exports.apply = apply;
    // 客户端服务依赖：slots 由 ui-renderer 的客户端半边 provide。
    // 不声明会在 slots 就绪前 apply，此时 ctx.get("slots") 为 undefined 而整段 UI 静默失效。
    exports.inject = ["slots"];

    return module.exports;
  },
});