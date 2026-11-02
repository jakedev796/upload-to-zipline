export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_idle',
  main() {
    let overlay: HTMLDivElement | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentRect = { x: 0, y: 0, width: 0, height: 0 };

    browser.runtime.onMessage.addListener((msg: unknown) => {
      const message = msg as { action?: string; tipText?: string };
      if (message && message.action === 'startAreaSnip') {
        initOverlay(message.tipText);
      }
    });

    function initOverlay(tipText?: string) {
      cleanup();

      overlay = document.createElement('div');
      overlay.id = 'zipline-snip-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2147483647;
        cursor: crosshair;
        user-select: none;
        overflow: hidden;
      `;

      canvas = document.createElement('canvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      `;

      ctx = canvas.getContext('2d');
      if (ctx) {
        drawInitialMask();
      }

      // Tip bar
      const tip = document.createElement('div');
      tip.textContent = tipText || '拖曳滑鼠選取截圖區域 ｜ 按 ESC 取消';
      tip.style.cssText = `
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(24, 24, 27, 0.92);
        color: #ffffff;
        padding: 6px 16px;
        border-radius: 9999px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        border: 1px solid rgba(255, 255, 255, 0.15);
        pointer-events: none;
        letter-spacing: 0.02em;
      `;

      overlay.appendChild(canvas);
      overlay.appendChild(tip);
      document.documentElement.appendChild(overlay);

      // Event listeners
      window.addEventListener('keydown', onKeyDown, true);
      canvas.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('resize', onResize);
    }

    function drawInitialMask() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return; // Only left button
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      currentRect = { x: startX, y: startY, width: 0, height: 0 };
    }

    function onMouseMove(e: MouseEvent) {
      if (!isDragging || !ctx || !canvas) return;

      const x = Math.min(startX, e.clientX);
      const y = Math.min(startY, e.clientY);
      const width = Math.abs(e.clientX - startX);
      const height = Math.abs(e.clientY - startY);
      currentRect = { x, y, width, height };

      // Redraw mask and selection
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (width > 0 && height > 0) {
        ctx.clearRect(x, y, width, height);

        // Selection border
        ctx.strokeStyle = '#7c5cff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x, y, width, height);
        ctx.setLineDash([]);

        // Dimension badge
        const badgeText = `${Math.round(width)} × ${Math.round(height)} px`;
        ctx.font = '11px sans-serif';
        const textWidth = ctx.measureText(badgeText).width;
        const badgeX = x + width - textWidth - 14 > 10 ? x + width - textWidth - 14 : x;
        const badgeY = y + height + 24 < canvas.height ? y + height + 20 : y - 10;

        ctx.fillStyle = 'rgba(24, 24, 27, 0.9)';
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY - 14, textWidth + 12, 18, 4);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(badgeText, badgeX + 6, badgeY);
      }
    }

    function onMouseUp(e: MouseEvent) {
      if (!isDragging) return;
      isDragging = false;

      const { x, y, width, height } = currentRect;
      if (width >= 10 && height >= 10) {
        const payload = {
          action: 'areaSnipCompleted',
          rect: {
            x,
            y,
            width,
            height,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
          },
          dpr: window.devicePixelRatio || 1,
        };
        cleanup();
        void browser.runtime.sendMessage(payload);
      } else {
        // Reset if too small
        drawInitialMask();
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        cleanup();
      }
    }

    function onResize() {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        drawInitialMask();
      }
    }

    function cleanup() {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      overlay = null;
      canvas = null;
      ctx = null;
      isDragging = false;
    }
  },
});
