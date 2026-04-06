'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface FlipbookViewerProps {
  pdfUrl: string;
  catalogName: string;
  pageCount: number | null;
}

export default function FlipbookViewer({ pdfUrl, catalogName, pageCount }: FlipbookViewerProps) {
  const flipbookRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(pageCount || 0);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const turnInitialized = useRef(false);
  const pagesRendered = useRef(0);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate flipbook dimensions
  const calculateDimensions = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight - 140; // space for header + controls
    
    if (isMobile) {
      // Single page mode on mobile
      const pageW = Math.min(vw - 32, 500);
      const pageH = pageW * 1.414; // A4 ratio
      return { width: pageW, height: Math.min(pageH, vh) };
    }
    
    // Double page mode on desktop
    const maxW = Math.min(vw - 80, 1200);
    const pageH = (maxW / 2) * 1.414;
    const finalH = Math.min(pageH, vh);
    const finalW = (finalH / 1.414) * 2;
    
    return { width: Math.round(finalW), height: Math.round(finalH) };
  }, [isMobile]);

  // Initialize PDF rendering and turn.js
  useEffect(() => {
    if (turnInitialized.current) return;
    
    let cancelled = false;

    const init = async () => {
      try {
        setLoading(true);
        setLoadingProgress(5);

        // Load jQuery 3.x (turn.js requires 3.x, not 4.x)
        if (!(window as any).jQuery) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://code.jquery.com/jquery-3.7.1.min.js';
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('jQuery load failed'));
            document.head.appendChild(s);
          });
        }

        // Load turn.js
        await import('@/lib/vendor/turn.min.js');

        setLoadingProgress(10);

        // Load pdf.js
        const pdfjsLib = await import('pdfjs-dist');

        // Use unpkg CDN — always mirrors npm, works for any version
        const pdfjsVersion = pdfjsLib.version;
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;
        
        setLoadingProgress(15);
        
        // Load PDF document
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        
        if (cancelled) return;
        
        const numPages = pdf.numPages;
        setTotalPages(numPages);
        setLoadingProgress(20);
        
        // Calculate dimensions based on first page
        const firstPage = await pdf.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });
        const pageAspect = viewport.height / viewport.width;
        
        // Calculate sizes
        const dims = calculateDimensions();
        const pageWidth = isMobile ? dims.width : dims.width / 2;
        const pageHeight = pageWidth * pageAspect;
        const finalDims = {
          width: isMobile ? pageWidth : pageWidth * 2,
          height: Math.round(Math.min(pageHeight, dims.height)),
        };
        setDimensions(finalDims);

        // Render all pages to images
        const pageImages: string[] = [];
        const scale = Math.min(2, (pageWidth * 2) / viewport.width); // High quality but capped at 2x
        
        for (let i = 1; i <= numPages; i++) {
          if (cancelled) return;
          
          const page = await pdf.getPage(i);
          const scaledViewport = page.getViewport({ scale });
          
          const canvas = document.createElement('canvas');
          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;
          
          const ctx = canvas.getContext('2d')!;
          await page.render({
            canvasContext: ctx,
            canvas,
            viewport: scaledViewport,
          } as any).promise;
          
          pageImages.push(canvas.toDataURL('image/jpeg', 0.92));
          pagesRendered.current = i;
          setLoadingProgress(20 + Math.round((i / numPages) * 75));
          
          // Clean up canvas
          canvas.width = 0;
          canvas.height = 0;
        }
        
        if (cancelled || !flipbookRef.current) return;
        
        setLoadingProgress(97);
        
        // Build page elements
        const flipbookEl = flipbookRef.current;
        flipbookEl.innerHTML = '';
        
        pageImages.forEach((imgSrc, idx) => {
          const pageDiv = document.createElement('div');
          pageDiv.className = 'flipbook-page';
          
          const img = document.createElement('img');
          img.src = imgSrc;
          img.alt = `Strona ${idx + 1}`;
          img.draggable = false;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'contain';
          img.style.display = 'block';
          
          pageDiv.appendChild(img);
          flipbookEl.appendChild(pageDiv);
        });
        
        // Initialize turn.js
        const $ = (window as any).jQuery;
        const $flipbook = $(flipbookEl);
        
        $flipbook.turn({
          width: finalDims.width,
          height: finalDims.height,
          display: isMobile ? 'single' : 'double',
          acceleration: true,
          gradients: true,
          elevation: 50,
          duration: 1000,
          when: {
            turned: function(_e: any, page: number) {
              setCurrentPage(page);
            },
          },
        });
        
        turnInitialized.current = true;
        setLoadingProgress(100);
        
        // Small delay to let turn.js settle
        setTimeout(() => {
          setLoading(false);
        }, 300);
        
      } catch (err) {
        console.error('Flipbook init error:', err);
        if (!cancelled) {
          setError('Nie udało się załadować katalogu. Spróbuj odświeżyć stronę.');
          setLoading(false);
        }
      }
    };
    
    init();
    
    return () => {
      cancelled = true;
    };
  }, [pdfUrl, isMobile, calculateDimensions]);

  // Handle resize
  useEffect(() => {
    if (!turnInitialized.current) return;
    
    const handleResize = () => {
      const dims = calculateDimensions();
      setDimensions(dims);
      
      const $ = (window as any).jQuery;
      if ($ && flipbookRef.current) {
        const newDisplay = window.innerWidth < 768 ? 'single' : 'double';
        $(flipbookRef.current).turn('size', dims.width, dims.height);
        $(flipbookRef.current).turn('display', newDisplay);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateDimensions]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!turnInitialized.current || !flipbookRef.current) return;
      const $ = (window as any).jQuery;
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        $(flipbookRef.current).turn('next');
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        $(flipbookRef.current).turn('previous');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigation functions
  const goToPage = (page: number) => {
    if (!turnInitialized.current || !flipbookRef.current) return;
    const $ = (window as any).jQuery;
    $(flipbookRef.current).turn('page', page);
  };

  const nextPage = () => {
    if (!turnInitialized.current || !flipbookRef.current) return;
    const $ = (window as any).jQuery;
    $(flipbookRef.current).turn('next');
  };

  const prevPage = () => {
    if (!turnInitialized.current || !flipbookRef.current) return;
    const $ = (window as any).jQuery;
    $(flipbookRef.current).turn('previous');
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen not supported
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div ref={containerRef} className={`flipbook-container ${isFullscreen ? 'is-fullscreen' : ''}`}>
      {/* Header */}
      <header className="flipbook-header">
        <div className="flipbook-header-inner">
          <div className="flipbook-brand">
            <span className="flipbook-logo">Il Buon Caffè</span>
          </div>
          <h1 className="flipbook-title">{catalogName}</h1>
          <div className="flipbook-header-spacer" />
        </div>
      </header>

      {/* Flipbook Area */}
      <div className="flipbook-stage">
        {loading && (
          <div className="flipbook-loading">
            <div className="flipbook-loading-inner">
              <div className="flipbook-loading-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
              </div>
              <div className="flipbook-loading-text">
                Przygotowywanie katalogu...
              </div>
              <div className="flipbook-progress-bar">
                <div
                  className="flipbook-progress-fill"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <div className="flipbook-progress-label">
                {loadingProgress < 20
                  ? 'Ładowanie PDF...'
                  : loadingProgress < 95
                  ? `Renderowanie stron (${pagesRendered.current}/${totalPages})...`
                  : 'Prawie gotowe...'}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flipbook-error">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="flipbook-retry-btn">
              Odśwież stronę
            </button>
          </div>
        )}
        
        {/* Navigation arrows */}
        {!loading && !error && (
          <>
            <button
              className="flipbook-nav-arrow flipbook-nav-prev"
              onClick={prevPage}
              disabled={currentPage <= 1}
              aria-label="Poprzednia strona"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              className="flipbook-nav-arrow flipbook-nav-next"
              onClick={nextPage}
              disabled={currentPage >= totalPages}
              aria-label="Następna strona"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}

        <div
          ref={flipbookRef}
          className="flipbook"
          style={{
            width: dimensions.width || undefined,
            height: dimensions.height || undefined,
            opacity: loading ? 0 : 1,
            transition: 'opacity 0.5s ease',
          }}
        />
      </div>

      {/* Bottom Controls */}
      {!loading && !error && (
        <div className="flipbook-controls">
          <div className="flipbook-controls-inner">
            {/* Page navigation */}
            <div className="flipbook-controls-group">
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage <= 1}
                className="flipbook-ctrl-btn"
                title="Pierwsza strona"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="11 17 6 12 11 7" />
                  <polyline points="18 17 13 12 18 7" />
                </svg>
              </button>
              <button
                onClick={prevPage}
                disabled={currentPage <= 1}
                className="flipbook-ctrl-btn"
                title="Poprzednia"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            </div>

            {/* Page indicator */}
            <div className="flipbook-page-info">
              <span className="flipbook-page-current">{currentPage}</span>
              <span className="flipbook-page-sep">/</span>
              <span className="flipbook-page-total">{totalPages}</span>
            </div>

            <div className="flipbook-controls-group">
              <button
                onClick={nextPage}
                disabled={currentPage >= totalPages}
                className="flipbook-ctrl-btn"
                title="Następna"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="flipbook-ctrl-btn"
                title="Ostatnia strona"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="13 17 18 12 13 7" />
                  <polyline points="6 17 11 12 6 7" />
                </svg>
              </button>

              <div className="flipbook-controls-divider" />

              <button
                onClick={toggleFullscreen}
                className="flipbook-ctrl-btn"
                title={isFullscreen ? 'Zamknij pełny ekran' : 'Pełny ekran'}
              >
                {isFullscreen ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="4 14 10 14 10 20" />
                    <polyline points="20 10 14 10 14 4" />
                    <line x1="14" y1="10" x2="21" y2="3" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Touch hint on mobile */}
      {!loading && !error && isMobile && currentPage === 1 && (
        <div className="flipbook-touch-hint">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8" />
            <path d="m15 12 5 5-5 5" />
          </svg>
          <span>Przeciągnij aby przewrócić stronę</span>
        </div>
      )}
    </div>
  );
}
