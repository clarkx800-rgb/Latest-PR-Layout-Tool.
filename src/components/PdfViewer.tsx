import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure the worker to use local url through vite.
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfViewerProps {
  pdfData: string;
}

export function PdfViewer({ pdfData }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        // give a little margin to the width
        setContainerWidth(entry.contentRect.width - 32);
      }
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto bg-zinc-200">
      <div className="flex flex-col items-center gap-6 py-8 w-full">
      <Document
        file={pdfData}
        onLoadSuccess={onDocumentLoadSuccess}
        className="flex flex-col items-center gap-6"
        loading={<div className="text-zinc-500 py-20">Loading PDF Document...</div>}
        error={<div className="text-red-500 py-20 bg-white px-8 rounded shadow">Failed to load PDF. Please try exporting directly.</div>}
      >
        {numPages ? (
          Array.from(new Array(numPages), (el, index) => (
            <div key={`page_${index + 1}`} className="shadow-lg rounded overflow-hidden">
              <Page
                pageNumber={index + 1}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                width={containerWidth}
                className="max-w-full"
              />
            </div>
          ))
        ) : null}
      </Document>
      </div>
    </div>
  );
}
