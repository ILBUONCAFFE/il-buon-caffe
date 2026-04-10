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

  const [numPages, setNumPages] = useState(0);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState('');
  const [pageWidth, setPageWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  // Pan state ref (single pointer)
  const panRef = useRef({ active: false, mx: 0, my: 0, px: 0, py: 0 });

  // Pinch-to-zoom state ref (two pointers)
  const pinchRef = useRef<{ active: boolean; dist: number; midX: number; midY: number; baseZoom: number; basePanX: number; basePanY: number }>({
    active: false, dist: 0, midX: 0, midY: 0, baseZoom: 1, basePanX: 0, basePanY: 0,
  });
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());

  useEffect(() => {
    if (!bookRef.current) return;
    const mountEl = bookRef.current;
    let cancelled = false;

    async function load() {
      try {
        // pdfjs-dist v4 (legacy build) — wide browser support including Safari, Samsung Internet
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

        const firstPage = await doc.getPage(1);
        const baseVp = firstPage.getViewport({ scale: 1 });
        const aspect = (baseVp.width - CROP * 2) / (baseVp.height - CROP * 2);

        let dispW: number;
        let dispH: number;

        if (mobile) {
          // Single page, full width
          const headerH = 52; // header height
          const controlsH = 56; // controls height
          const availH = vh - headerH - controlsH - 8;
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
        dispW = Math.floor(dispW);
        dispH = Math.floor(dispH);
        setPageWidth(dispW);

        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        const renderScale = (dispW / baseVp.width) * dpr;
        const textScale = dispW / baseVp.width;

        for (let i = 1; i <= total; i++) {
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
          // v4 render API uses canvasContext (2D context), not canvas element
          await page.render({ canvasContext: ctx, viewport: renderVp }).promise;

          const cropW = fw - CROP * 2 * dpr;
          const cropH = fh - CROP * 2 * dpr;
          const cropped = document.createElement('canvas');
          cropped.width = cropW;
          cropped.height = cropH;
          cropped.getContext('2d', { alpha: false })!.drawImage(full, -CROP * dpr, -CROP * dpr);

          cropped.style.cssText = `position:absolute;top:0;left:0;width:${dispW}px;height:${dispH}px;`;
          cropped.style.pointerEvents = 'none';
          cropped.setAttribute('draggable', 'false');

          const textDiv = document.createElement('div');
          textDiv.className = 'textLayer';
          textDiv.style.cssText = `position:absolute;top:0;left:0;width:${dispW}px;height:${dispH}px;`;
          textDiv.style.setProperty('--total-scale-factor', String(textScale));

          const wrapper = document.createElement('div');
          wrapper.className = 'pf-page';
          wrapper.style.cssText = `position:relative;width:${dispW}px;height:${dispH}px;overflow:hidden;background:#fff;`;
          wrapper.setAttribute('draggable', 'false');
          wrapper.appendChild(cropped);
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

  const goNext = useCallback(() => { if (zoom <= 1) flipRef.current?.flipNext(); }, [zoom]);
  const goPrev = useCallback(() => { if (zoom <= 1) flipRef.current?.flipPrev(); }, [zoom]);

  // Keyboard navigation (desktop)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') { setZoom(1); setPan({ x: 0, y: 0 }); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [goNext, goPrev]);

  // Desktop wheel zoom
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setZoom((z) => {
        const n = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * f));
        if (n <= 1) setPan({ x: 0, y: 0 });
        return n;
      });
    };
    window.addEventListener('wheel', handler, { passive: false });
    return () => window.removeEventListener('wheel', handler);
  }, []);

  // ── Pointer events: pan (1 pointer) + pinch (2 pointers) ──────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    if (activePointers.current.size === 2) {
      // Start pinch
      pinchRef.current.active = true;
      panRef.current.active = false;
      setDragging(false);
      const pts = [...activePointers.current.values()];
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      pinchRef.current.dist = Math.hypot(dx, dy);
      pinchRef.current.midX = (pts[0].x + pts[1].x) / 2;
      pinchRef.current.midY = (pts[0].y + pts[1].y) / 2;
      setZoom((z) => { pinchRef.current.baseZoom = z; return z; });
      setPan((p) => { pinchRef.current.basePanX = p.x; pinchRef.current.basePanY = p.y; return p; });
    } else if (activePointers.current.size === 1 && zoom > 1) {
      // Start pan
      panRef.current = { active: true, mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
      setDragging(true);
    }
  }, [zoom, pan]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinchRef.current.active && activePointers.current.size === 2) {
      e.preventDefault();
      const pts = [...activePointers.current.values()];
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const newDist = Math.hypot(dx, dy);
      const scale = newDist / pinchRef.current.dist;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchRef.current.baseZoom * scale));
      setZoom(newZoom);
      if (newZoom <= 1) setPan({ x: 0, y: 0 });
    } else if (panRef.current.active) {
      e.preventDefault();
      setPan({
        x: panRef.current.px + e.clientX - panRef.current.mx,
        y: panRef.current.py + e.clientY - panRef.current.my,
      });
    }
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) {
      pinchRef.current.active = false;
    }
    if (activePointers.current.size === 0) {
      panRef.current.active = false;
      setDragging(false);
    }
  }, []);

  const onDblClick = useCallback(() => {
    setZoom((z) => { if (z > 1) { setPan({ x: 0, y: 0 }); return 1; } return 2.5; });
  }, []);

  // shiftX only applies in desktop two-page mode
  let shiftX = 0;
  if (ready && !isMobile && numPages > 0 && pageWidth > 0) {
    if (currentPage === 0) shiftX = -pageWidth / 2;
    else if (currentPage === numPages - 1 && numPages % 2 === 0) shiftX = pageWidth / 2;
  }

  // Page progress for visual indicator
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
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            </div>
            <div className="flipbook-loading-text">Przygotowywanie katalogu…</div>
            <div className="flipbook-progress-bar">
              <div className="flipbook-progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <div className="flipbook-progress-label">{Math.round(progress * 100)}%</div>
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
        className="flipbook-stage"
        onDoubleClick={onDblClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ touchAction: 'none' }}
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
        {/* Overlay blocks page-flip touch events when zoomed in */}
        {zoom > 1 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 200,
              touchAction: 'none',
              cursor: dragging ? 'grabbing' : 'grab',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        )}
      </div>

      {/* Controls */}
      {ready && (
        <div className="flipbook-controls">
          {/* Page progress bar at top of controls */}
          <div style={{
            height: '2px',
            background: 'rgba(163, 127, 91, 0.06)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${pageProgress}%`,
              background: 'linear-gradient(90deg, rgba(163, 127, 91, 0.3), rgba(163, 127, 91, 0.6))',
              transition: 'width 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
              borderRadius: '0 2px 2px 0',
            }} />
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
                <button onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.3))} className="flipbook-ctrl-btn" title="Powiększ">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                </button>
              )}
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} disabled={zoom <= 1} className="flipbook-ctrl-btn" title="Reset zoom">
                {Math.round(zoom * 100)}%
              </button>
              {!isMobile && (
                <button onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.3))} disabled={zoom <= 1} className="flipbook-ctrl-btn" title="Pomniejsz">
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
