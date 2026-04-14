'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const CROP = 1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

interface FlipbookViewerProps {
  pdfUrl: string;
  catalogName: string;
  pageCount: number | null;
}

export default function FlipbookViewer({ pdfUrl, catalogName }: FlipbookViewerProps) {
  const bookRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<any>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const [numPages, setNumPages] = useState(0);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState('');
  const [pageWidth, setPageWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Zoom/pan stored in refs for zero-lag rendering + mirrored to state for CSS transform
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const [zoom, setZoomState] = useState(1);
  const [pan, setPanState] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  // Helper that updates both ref and state
  const applyZoom = useCallback((z: number) => {
    zoomRef.current = z;
    setZoomState(z);
  }, []);
  const applyPan = useCallback((p: { x: number; y: number }) => {
    panRef.current = p;
    setPanState(p);
  }, []);

  // Pointer tracking
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());

  // Pinch state (all in refs — no async React state)
  const isPinchingRef = useRef(false);
  const pinchDistRef = useRef(0);
  const pinchBaseZoomRef = useRef(1);
  const pinchBasePanRef = useRef({ x: 0, y: 0 });

  // Single-pointer pan state
  const singlePanRef = useRef({ active: false, mx: 0, my: 0, px: 0, py: 0 });

  // Track mobile/desktop at init time for orientation-change reload
  const initMobileRef = useRef<boolean | null>(null);

  // ── PDF load & render ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!bookRef.current) return;
    const mountEl = bookRef.current;
    let cancelled = false;

    async function load() {
      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const doc = await pdfjs.getDocument(pdfUrl).promise;
        if (cancelled) return;

        const total = doc.numPages;
        setNumPages(total);

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const mobile = vw < 768;
        setIsMobile(mobile);
        initMobileRef.current = mobile;

        const firstPage = await doc.getPage(1);
        const baseVp = firstPage.getViewport({ scale: 1 });
        const aspect = (baseVp.width - CROP * 2) / (baseVp.height - CROP * 2);

        let dispW: number;
        let dispH: number;

        if (mobile) {
          const controlsH = 56;
          const availH = vh - controlsH - 8;
          const availW = vw - 8;
          dispW = Math.min(availW, availH * aspect);
          dispH = dispW / aspect;
        } else {
          const pad = 0.88;
          dispH = (vh - 100) * pad;
          dispW = dispH * aspect;
          if (dispW * 2 > vw * pad) {
            dispW = (vw * pad) / 2;
            dispH = dispW / aspect;
          }
        }
        dispW = Math.max(Math.floor(dispW), 200);
        dispH = Math.floor(dispW / aspect);
        setPageWidth(dispW);

        // On mobile, cap DPR at 1.5 — higher resolution gives no visible benefit
        // at catalog-reading distances and causes significant slowdowns on mid-range phones.
        const rawDpr = window.devicePixelRatio || 1;
        const dpr = mobile ? Math.min(rawDpr, 1.5) : Math.max(rawDpr, 2);
        const renderScale = (dispW / baseVp.width) * dpr;
        const textScale = dispW / baseVp.width;

        // Render pages sequentially, yielding to main thread between each page
        // so the browser can repaint/handle events (avoids "frozen" UI on mobile).
        for (let i = 1; i <= total; i++) {
          if (cancelled) return;

          // Yield to main thread before heavy work
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
          if (cancelled) return;

          const page = await doc.getPage(i);
          const renderVp = page.getViewport({ scale: renderScale });

          const fw = Math.ceil(renderVp.width);
          const fh = Math.ceil(renderVp.height);

          const full = document.createElement('canvas');
          full.width = fw;
          full.height = fh;
          const ctx = full.getContext('2d', { alpha: false })!;
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, fw, fh);
          await page.render({ canvasContext: ctx, viewport: renderVp }).promise;

          const cropW = fw - CROP * 2 * dpr;
          const cropH = fh - CROP * 2 * dpr;
          const cropped = document.createElement('canvas');
          cropped.width = cropW;
          cropped.height = cropH;
          cropped.getContext('2d', { alpha: false })!.drawImage(full, -CROP * dpr, -CROP * dpr);

          // JPEG quality: lower on mobile saves memory without visible difference
          const jpegQ = mobile ? 0.82 : 0.92;
          const img = document.createElement('img');
          img.src = cropped.toDataURL('image/jpeg', jpegQ);
          img.style.cssText = `position:absolute;top:0;left:0;width:${dispW}px;height:${dispH}px;`;
          img.style.pointerEvents = 'none';
          img.setAttribute('draggable', 'false');

          // Release intermediate canvas memory
          cropped.width = 0; cropped.height = 0;
          full.width = 0; full.height = 0;

          const textDiv = document.createElement('div');
          textDiv.className = 'textLayer';
          textDiv.style.cssText = `position:absolute;top:0;left:0;width:${dispW}px;height:${dispH}px;`;
          textDiv.style.setProperty('--total-scale-factor', String(textScale));

          const wrapper = document.createElement('div');
          wrapper.className = 'pf-page';
          wrapper.style.cssText = `position:relative;width:${dispW}px;height:${dispH}px;overflow:hidden;background:#fff;`;
          wrapper.setAttribute('draggable', 'false');
          wrapper.appendChild(img);
          wrapper.appendChild(textDiv);
          mountEl.appendChild(wrapper);

          if (cancelled) return;
          setProgress(i / total);
        }

        if (cancelled) return;

        const { PageFlip } = await import('page-flip');
        if (cancelled || flipRef.current) return;

        const pf = new PageFlip(mountEl, {
          width: dispW,
          height: dispH,
          size: 'fixed',
          drawShadow: true,
          flippingTime: mobile ? 400 : 600,
          usePortrait: mobile,
          showCover: true,
          maxShadowOpacity: 0.5,
          showPageCorners: true,
          disableFlipByClick: false,
          swipeDistance: mobile ? 20 : 25,
          useMouseEvents: true,
          mobileScrollSupport: false,
          autoSize: false,
          startZIndex: 100,
          clickEventForward: true,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pf.on('flip', (e: any) => setCurrentPage(e.data));
        pf.loadFromHTML(mountEl.querySelectorAll('.pf-page'));
        flipRef.current = pf;
        setReady(true);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }

    load();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  const goNext = useCallback(() => { if (zoomRef.current <= 1) flipRef.current?.flipNext(); }, []);
  const goPrev = useCallback(() => { if (zoomRef.current <= 1) flipRef.current?.flipPrev(); }, []);

  // Keyboard navigation (desktop)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') { applyZoom(1); applyPan({ x: 0, y: 0 }); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [goNext, goPrev, applyZoom, applyPan]);

  // Desktop wheel zoom
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const n = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * f));
      if (n <= 1) applyPan({ x: 0, y: 0 });
      applyZoom(n);
    };
    window.addEventListener('wheel', handler, { passive: false });
    return () => window.removeEventListener('wheel', handler);
  }, [applyZoom, applyPan]);

  // Reload page when orientation crosses the mobile↔desktop threshold
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (initMobileRef.current === null) return;
        const isNowMobile = window.innerWidth < 768;
        if (initMobileRef.current !== isNowMobile) window.location.reload();
      }, 300);
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); clearTimeout(timer); };
  }, []);

  // ── Page-flip event blocking (capture phase) ───────────────────────────────
  // Block page-flip's own listeners during pinch or when zoomed in.
  // Uses refs so the handler always reads fresh values with zero React overhead.
  useEffect(() => {
    const el = bookRef.current;
    if (!el || !ready) return;

    // Returns true if page-flip events should be suppressed
    const shouldBlock = () =>
      isPinchingRef.current || zoomRef.current > 1 || activePointers.current.size > 1;

    const onDown = (e: PointerEvent) => {
      if (shouldBlock()) e.stopImmediatePropagation();
    };
    const onMove = (e: PointerEvent) => {
      if (shouldBlock()) e.stopImmediatePropagation();
    };
    const onUp = (_e: PointerEvent) => { /* nothing needed */ };

    el.addEventListener('pointerdown', onDown, { capture: true });
    el.addEventListener('pointermove', onMove, { capture: true });
    el.addEventListener('pointerup', onUp, { capture: true });
    el.addEventListener('pointercancel', onUp, { capture: true });
    return () => {
      el.removeEventListener('pointerdown', onDown, { capture: true });
      el.removeEventListener('pointermove', onMove, { capture: true });
      el.removeEventListener('pointerup', onUp, { capture: true });
      el.removeEventListener('pointercancel', onUp, { capture: true });
    };
  }, [ready]);

  // ── Native touch events on stage for pinch + pan ───────────────────────────
  // Using native addEventListener (not React synthetic events) so we can call
  // preventDefault() to block browser page-zoom and page-flip touch bubbling.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        // Two fingers — start pinch
        isPinchingRef.current = true;
        singlePanRef.current.active = false;
        setDragging(false);

        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dx = t1.clientX - t0.clientX;
        const dy = t1.clientY - t0.clientY;
        pinchDistRef.current = Math.hypot(dx, dy);
        pinchBaseZoomRef.current = zoomRef.current;
        pinchBasePanRef.current = { ...panRef.current };
        e.preventDefault();
      } else if (e.touches.length === 1 && zoomRef.current > 1) {
        // Single finger pan while zoomed
        const t = e.touches[0];
        singlePanRef.current = {
          active: true,
          mx: t.clientX,
          my: t.clientY,
          px: panRef.current.x,
          py: panRef.current.y,
        };
        setDragging(true);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isPinchingRef.current && e.touches.length >= 2) {
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dx = t1.clientX - t0.clientX;
        const dy = t1.clientY - t0.clientY;
        const newDist = Math.hypot(dx, dy);
        if (pinchDistRef.current === 0) return;
        const scale = newDist / pinchDistRef.current;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchBaseZoomRef.current * scale));
        applyZoom(newZoom);
        if (newZoom <= 1) applyPan({ x: 0, y: 0 });
      } else if (singlePanRef.current.active && e.touches.length === 1) {
        e.preventDefault();
        const t = e.touches[0];
        applyPan({
          x: singlePanRef.current.px + t.clientX - singlePanRef.current.mx,
          y: singlePanRef.current.py + t.clientY - singlePanRef.current.my,
        });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isPinchingRef.current = false;
      }
      if (e.touches.length === 0) {
        singlePanRef.current.active = false;
        setDragging(false);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [applyZoom, applyPan]);

  // Desktop pointer events (mouse) — only for non-touch devices
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return; // handled by touch events above
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (zoomRef.current > 1) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      singlePanRef.current = {
        active: true,
        mx: e.clientX,
        my: e.clientY,
        px: panRef.current.x,
        py: panRef.current.y,
      };
      setDragging(true);
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (singlePanRef.current.active) {
      e.preventDefault();
      applyPan({
        x: singlePanRef.current.px + e.clientX - singlePanRef.current.mx,
        y: singlePanRef.current.py + e.clientY - singlePanRef.current.my,
      });
    }
  }, [applyPan]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    activePointers.current.delete(e.pointerId);
    singlePanRef.current.active = false;
    setDragging(false);
  }, []);

  const onDblClick = useCallback(() => {
    if (zoomRef.current > 1) {
      applyPan({ x: 0, y: 0 });
      applyZoom(1);
    } else {
      applyZoom(2.5);
    }
  }, [applyZoom, applyPan]);

  // shiftX only applies in desktop two-page mode
  let shiftX = 0;
  if (ready && !isMobile && numPages > 0 && pageWidth > 0) {
    if (currentPage === 0) shiftX = -pageWidth / 2;
    else if (currentPage === numPages - 1 && numPages % 2 === 0) shiftX = pageWidth / 2;
  }

  const pageProgress = numPages > 0 ? ((currentPage + 1) / numPages) * 100 : 0;

  return (
    <div className="flipbook-container">
      {/* Header */}
      <header className="flipbook-header">
        <div className="flipbook-header-inner">
          <div className="flipbook-header-spacer" />
          <h1 className="flipbook-title">{catalogName}</h1>
          <div className="flipbook-header-spacer" />
        </div>
      </header>

      {/* Loading */}
      {!ready && !error && (
        <div className="flipbook-loading">
          <div className="flipbook-loading-inner">
            <div className="flipbook-loading-icon">
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="22" stroke="rgba(163,127,91,0.1)" strokeWidth="1.5" />
                <circle
                  cx="28" cy="28" r="22"
                  stroke="rgba(163,127,91,0.6)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeDasharray="138.2 138.2"
                  strokeDashoffset="104"
                  className="flipbook-spinner-arc"
                />
              </svg>
            </div>
            <div className="flipbook-loading-number">{Math.round(progress * 100)}</div>
            <div className="flipbook-loading-bar">
              <div className="flipbook-loading-bar-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flipbook-error">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(163, 127, 91, 0.5)" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>Nie udało się załadować katalogu.</p>
          <pre style={{ fontSize: 11, opacity: 0.4, maxWidth: 400, overflowWrap: 'break-word', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{error}</pre>
          <button onClick={() => window.location.reload()} className="flipbook-retry-btn">Odśwież stronę</button>
        </div>
      )}

      {/* Flipbook stage */}
      <div
        ref={stageRef}
        className="flipbook-stage"
        onDoubleClick={onDblClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ touchAction: zoom > 1 ? 'none' : 'pan-x pan-y' }}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
            transition: dragging ? 'none' : 'transform 0.1s ease',
            willChange: 'transform',
          }}
        >
          <div
            ref={bookRef}
            className={`flipbook${ready ? ' visible' : ''}`}
            style={{
              transform: ready ? `translateX(${shiftX}px)` : 'none',
              transition: 'transform 400ms ease, opacity 0.5s ease',
              opacity: ready ? 1 : 0,
            }}
          />
        </div>
      </div>

      {/* Controls */}
      {ready && (
        <div className="flipbook-controls">
          <div className="flipbook-controls-progress">
            <div className="flipbook-controls-progress-fill" style={{ width: `${pageProgress}%` }} />
          </div>

          <div className="flipbook-controls-inner">
            <div className="flipbook-controls-group">
              {!isMobile && (
                <button onClick={() => { flipRef.current?.flip(0); }} disabled={zoom > 1} className="flipbook-ctrl-btn" title="Pierwsza strona">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></svg>
                </button>
              )}
              <button onClick={goPrev} disabled={zoom > 1} className="flipbook-ctrl-btn flipbook-ctrl-prev" title="Poprzednia">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
            </div>

            <div className="flipbook-page-info">
              <span className="flipbook-page-current">{currentPage + 1}</span>
              <span className="flipbook-page-sep">/</span>
              <span className="flipbook-page-total">{numPages}</span>
            </div>

            <div className="flipbook-controls-group">
              <button onClick={goNext} disabled={zoom > 1} className="flipbook-ctrl-btn flipbook-ctrl-next" title="Następna">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
              {!isMobile && (
                <button onClick={() => { flipRef.current?.flip(numPages - 1); }} disabled={zoom > 1} className="flipbook-ctrl-btn" title="Ostatnia strona">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></svg>
                </button>
              )}
              <div className="flipbook-controls-divider" />
              {!isMobile && (
                <button onClick={() => { const n = Math.min(MAX_ZOOM, zoomRef.current * 1.3); applyZoom(n); }} className="flipbook-ctrl-btn" title="Powiększ">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                </button>
              )}
              <button onClick={() => { applyZoom(1); applyPan({ x: 0, y: 0 }); }} disabled={zoom <= 1} className="flipbook-ctrl-btn" title="Reset zoom">
                {Math.round(zoom * 100)}%
              </button>
              {!isMobile && (
                <button onClick={() => { const n = Math.max(MIN_ZOOM, zoomRef.current / 1.3); applyZoom(n); if (n <= 1) applyPan({ x: 0, y: 0 }); }} disabled={zoom <= 1} className="flipbook-ctrl-btn" title="Pomniejsz">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                </button>
              )}
            </div>
          </div>
          {isMobile && zoom <= 1 && (
            <div className="flipbook-mobile-hint">Przesuń palcem aby przewrócić stronę • Rozsuń palce aby powiększyć</div>
          )}
        </div>
      )}
    </div>
  );
}
