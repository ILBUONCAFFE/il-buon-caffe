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
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const panRef = useRef({ active: false, mx: 0, my: 0, px: 0, py: 0 });

  useEffect(() => {
    if (!bookRef.current) return;
    const mountEl = bookRef.current;
    let cancelled = false;

    async function load() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfjs = (await import('pdfjs-dist/build/pdf.mjs')) as any;
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const doc = await pdfjs.getDocument(pdfUrl).promise;
        if (cancelled) return;

        const total = doc.numPages;
        setNumPages(total);

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const firstPage = await doc.getPage(1);
        const baseVp = firstPage.getViewport({ scale: 1 });
        const aspect = (baseVp.width - CROP * 2) / (baseVp.height - CROP * 2);

        const pad = 0.88;
        let dispH = (vh - 100) * pad;
        let dispW = dispH * aspect;
        if (dispW * 2 > vw * pad) {
          dispW = (vw * pad) / 2;
          dispH = dispW / aspect;
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
          flippingTime: 600,
          usePortrait: false,
          showCover: true,
          maxShadowOpacity: 0.5,
          showPageCorners: true,
          disableFlipByClick: false,
          swipeDistance: 25,
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

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') { setZoom(1); setPan({ x: 0, y: 0 }); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [goNext, goPrev]);

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

  const onDown = useCallback((e: React.PointerEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setDragging(true);
    panRef.current = { active: true, mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [zoom, pan]);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!panRef.current.active) return;
    e.preventDefault();
    setPan({ x: panRef.current.px + e.clientX - panRef.current.mx, y: panRef.current.py + e.clientY - panRef.current.my });
  }, []);

  const onUp = useCallback(() => { panRef.current.active = false; setDragging(false); }, []);

  const onDblClick = useCallback(() => {
    setZoom((z) => { if (z > 1) { setPan({ x: 0, y: 0 }); return 1; } return 2.5; });
  }, []);

  let shiftX = 0;
  if (ready && numPages > 0 && pageWidth > 0) {
    if (currentPage === 0) shiftX = -pageWidth / 2;
    else if (currentPage === numPages - 1 && numPages % 2 === 0) shiftX = pageWidth / 2;
  }

  return (
    <div className="flipbook-container">
      {/* Header */}
      <header className="flipbook-header">
        <div className="flipbook-header-inner">
          <span className="flipbook-logo">Il Buon Caffè</span>
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
          <p>Nie udało się załadować katalogu.</p>
          <pre style={{ fontSize: 12, opacity: 0.6, maxWidth: 400, overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>{error}</pre>
          <button onClick={() => window.location.reload()} className="flipbook-retry-btn">Odśwież stronę</button>
        </div>
      )}

      {/* Flipbook stage */}
      <div
        className="flipbook-stage"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
        onDoubleClick={onDblClick}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        <div
          ref={bookRef}
          className={`flipbook${ready ? ' visible' : ''}`}
          style={{ transform: ready ? `translateX(${shiftX}px)` : 'none', transition: 'transform 400ms ease, opacity 0.5s ease', opacity: ready ? 1 : 0 }}
        />
      </div>

      {/* Controls */}
      {ready && (
        <div className="flipbook-controls">
          <div className="flipbook-controls-inner">
            <div className="flipbook-controls-group">
              <button onClick={() => { flipRef.current?.flip(0); }} disabled={zoom > 1} className="flipbook-ctrl-btn" title="Pierwsza strona">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></svg>
              </button>
              <button onClick={goPrev} disabled={zoom > 1} className="flipbook-ctrl-btn" title="Poprzednia">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
            </div>
            <div className="flipbook-page-info">
              <span className="flipbook-page-current">{currentPage + 1}</span>
              <span className="flipbook-page-sep">/</span>
              <span className="flipbook-page-total">{numPages}</span>
            </div>
            <div className="flipbook-controls-group">
              <button onClick={goNext} disabled={zoom > 1} className="flipbook-ctrl-btn" title="Następna">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
              <button onClick={() => { flipRef.current?.flip(numPages - 1); }} disabled={zoom > 1} className="flipbook-ctrl-btn" title="Ostatnia strona">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></svg>
              </button>
              <div className="flipbook-controls-divider" />
              <button onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.3))} className="flipbook-ctrl-btn" title="Powiększ">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
              </button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} disabled={zoom <= 1} className="flipbook-ctrl-btn" title="Reset zoom">
                {Math.round(zoom * 100)}%
              </button>
              <button onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.3))} disabled={zoom <= 1} className="flipbook-ctrl-btn" title="Pomniejsz">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
