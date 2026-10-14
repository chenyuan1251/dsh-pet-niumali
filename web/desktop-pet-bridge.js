/**
 * 桌面宠物模式桥接脚本
 * 当牛马力在 Electron 透明小窗内运行时，自动加上拖拽区和窗口控制按钮。
 */
(function () {
  if (!window.niumaliPet) return;

  const style = document.createElement("style");
  style.textContent = `
    .pet-dragbar {
      position: fixed;
      top: 6px;
      left: 6px;
      right: 6px;
      height: 28px;
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: space-between;
      -webkit-app-region: drag;
      user-select: none;
      pointer-events: auto;
      border-radius: 6px;
      background: rgba(0,0,0,0.12);
      opacity: 0;
      transition: opacity .25s ease;
    }
    .pet-dragbar:hover, .pet-dragbar.active { opacity: 1; }
    .pet-dragbar .title { color: #fff7ec; font-size: 12px; padding: 0 8px; text-shadow: 0 1px 2px rgba(0,0,0,.5); }
    .pet-controls { display: flex; gap: 6px; padding-right: 4px; -webkit-app-region: no-drag; }
    .pet-controls button {
      width: 22px; height: 22px; border-radius: 50%;
      border: none; cursor: pointer; display: grid; place-items: center;
      font-size: 11px; line-height: 1;
      background: rgba(255,255,255,.12); color: #fff7ec;
      transition: background .15s;
    }
    .pet-controls button:hover { background: rgba(255,255,255,.28); }
    .pet-controls .close:hover { background: rgba(220,80,80,.9); }
  `;
  document.head.appendChild(style);

  const bar = document.createElement("div");
  bar.className = "pet-dragbar";
  bar.innerHTML = `
    <span class="title">🐮 牛马力</span>
    <div class="pet-controls">
      <button title="置顶/取消置顶" id="petPin"></button>
      <button title="最小化" id="petMin">─</button>
      <button class="close" title="关闭" id="petClose">×</button>
    </div>
  `;
  document.body.appendChild(bar);

  let hoverTimer;
  function showBriefly() {
    bar.classList.add("active");
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => bar.classList.remove("active"), 1500);
  }

  // 鼠标移到顶部区域时显示控制栏
  document.addEventListener("mousemove", (e) => {
    if (e.clientY < 40) showBriefly();
  });

  document.getElementById("petPin").addEventListener("click", () => {
    window.niumaliPet.setAlwaysOnTop(true);
  });
  document.getElementById("petMin").addEventListener("click", () => {
    window.niumaliPet.minimize();
  });
  document.getElementById("petClose").addEventListener("click", () => {
    window.niumaliPet.close();
  });
})();
