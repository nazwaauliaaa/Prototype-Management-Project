import { BaseModal } from '../../core/BaseModal.js';

/**
 * PdfViewerModal - Single Responsibility Principle (SRP)
 * Provides interactive PDF reader preview with zoom, multi-page tabs, print, and official stamps.
 */
export class PdfViewerModal extends BaseModal {
  constructor(container) {
    super(container, 'pdf-viewer');
    this.documentService = container.resolve('DocumentService');
    this.notificationService = container.resolve('NotificationService');
    this.modalManager = container.resolve('ModalManager');
    this.currentDocId = 'doc-dishub';
    this.currentPage = 1;
    this.zoomLevel = 100;
  }

  render(data) {
    if (data && data.docId) {
      this.currentDocId = data.docId;
    }
    if (data && data.page) {
      this.currentPage = data.page;
    }

    const doc = this.documentService.getDocument(this.currentDocId) || this.documentService.getDocuments()[0];
    const pageHtml = this.documentService.renderDocumentPage(doc.id, this.currentPage);

    return `
      <div class="relative w-full max-w-5xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-border overflow-hidden my-auto flex flex-col h-[92vh] modal-content-box">
        
        <!-- Viewer Topbar -->
        <div class="px-spacing-md py-2.5 bg-surface-container-lowest border-b border-surface-border flex items-center justify-between gap-spacing-sm shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-lg bg-error-container text-on-error-container flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[22px]">picture_as_pdf</span>
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-body-medium text-[13px] text-text-primary font-bold truncate">${doc.title}.pdf</span>
                <span class="px-2 py-0.5 rounded bg-status-success/15 text-status-success font-badge-micro text-[10px] font-bold flex items-center gap-1 shrink-0">
                  <span class="material-symbols-outlined text-[12px]">verified</span>Terverifikasi Digital
                </span>
              </div>
              <span class="font-caption-meta text-[11px] text-text-muted truncate">
                ${doc.fileSize} • Halaman ${this.currentPage} dari ${doc.pages} • QR Valid: ${doc.qrId}
              </span>
            </div>
          </div>

          <!-- Controls: Zoom, Print, Download, Close -->
          <div class="flex items-center gap-1.5 shrink-0">
            <!-- Zoom Controls -->
            <div class="hidden md:flex items-center bg-surface-container-low rounded-lg p-0.5 border border-surface-border">
              <button id="btn-zoom-out" class="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-md hover:bg-surface-container transition-colors" title="Perkecil">
                <span class="material-symbols-outlined text-[16px]">zoom_out</span>
              </button>
              <span id="zoom-label" class="px-2 font-mono text-[11px] text-text-primary font-semibold">${this.zoomLevel}%</span>
              <button id="btn-zoom-in" class="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary rounded-md hover:bg-surface-container transition-colors" title="Perbesar">
                <span class="material-symbols-outlined text-[16px]">zoom_in</span>
              </button>
            </div>

            <button id="btn-pdf-print" class="w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors border border-surface-border" title="Cetak Dokumen">
              <span class="material-symbols-outlined text-[18px]">print</span>
            </button>
            
            <button id="btn-pdf-download" class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-brand-accent transition-colors font-caption-meta text-[12px] font-medium shadow-xs" title="Unduh PDF">
              <span class="material-symbols-outlined text-[15px]">download</span>
              <span class="hidden sm:inline">Unduh</span>
            </button>

            <button id="btn-close-pdf" aria-label="Tutup Pratinjau PDF" class="w-8 h-8 rounded-lg bg-surface-container hover:bg-error-container hover:text-on-error-container text-text-muted flex items-center justify-center transition-colors ml-1">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        <!-- Page Switcher Bar -->
        <div class="px-spacing-md py-1 bg-surface-container-low border-b border-surface-border flex items-center justify-between text-[11px]">
          <div class="flex items-center gap-2">
            <span class="text-text-muted font-medium">Halaman:</span>
            ${Array.from({ length: doc.pages }, (_, i) => i + 1).map(p => `
              <button 
                class="pdf-page-btn px-2.5 py-0.5 rounded-md font-mono font-bold transition-all ${this.currentPage === p ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container text-text-secondary hover:bg-surface-container-high'}"
                data-page="${p}"
              >
                Hal ${p}
              </button>
            `).join('')}
          </div>

          <div class="flex items-center gap-2 text-text-muted font-mono text-[10px]">
            <span>Format: Dokumen Resmi Pemprov DKI Jakarta</span>
          </div>
        </div>

        <!-- Document Sheet Area -->
        <div class="flex-1 overflow-y-auto bg-surface-tint p-spacing-md md:p-spacing-xl flex justify-center">
          <div 
            id="pdf-printable-area" 
            class="w-full max-w-3xl bg-white rounded-lg shadow-xl border border-surface-border p-8 md:p-12 flex flex-col text-[#0f172a] min-h-[850px] transition-transform origin-top"
            style="transform: scale(${this.zoomLevel / 100});"
          >
            ${pageHtml}
          </div>
        </div>

        <!-- Bottom Verification Status Bar -->
        <div class="px-spacing-md py-2.5 bg-surface-container-low border-t border-surface-border flex flex-wrap items-center justify-between gap-spacing-sm shrink-0">
          <div class="flex items-center gap-2 text-caption-meta text-[11px]">
            <span class="flex items-center gap-1 text-status-success font-semibold">
              <span class="material-symbols-outlined text-[15px]">lock</span> Status: Asli & Terverifikasi di Database Otoritas
            </span>
            <span class="text-text-muted hidden sm:inline">•</span>
            <span class="text-text-secondary hidden sm:inline">SK: ${doc.skNumber}</span>
          </div>

          <div class="flex items-center gap-2">
            <button id="btn-copy-doc-link" class="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-text-primary text-[11px] transition-colors flex items-center gap-1 border border-surface-border">
              <span class="material-symbols-outlined text-[14px]">content_copy</span>
              <span>Salin Tautan Dokumen</span>
            </button>
            <button id="btn-back-to-task" class="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container text-text-primary text-[11px] font-semibold transition-colors flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">arrow_back</span>
              <span>Kembali ke Kartu #RK-304</span>
            </button>
          </div>
        </div>

      </div>
    `;
  }

  bindEvents(modalRoot) {
    const closeBtn = modalRoot.querySelector('#btn-close-pdf');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.modalManager.close(this.modalId));
    }

    const backBtn = modalRoot.querySelector('#btn-back-to-task');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.modalManager.open('task-detail', { tab: 'legal' });
      });
    }

    // Page switcher
    const pageButtons = modalRoot.querySelectorAll('.pdf-page-btn');
    pageButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.getAttribute('data-page'), 10);
        this.currentPage = page;
        this.modalManager.open(this.modalId, { docId: this.currentDocId, page });
      });
    });

    // Zoom buttons
    const zoomInBtn = modalRoot.querySelector('#btn-zoom-in');
    const zoomOutBtn = modalRoot.querySelector('#btn-zoom-out');
    const zoomLabel = modalRoot.querySelector('#zoom-label');
    const sheetArea = modalRoot.querySelector('#pdf-printable-area');

    if (zoomInBtn && zoomOutBtn && sheetArea) {
      zoomInBtn.addEventListener('click', () => {
        if (this.zoomLevel < 140) {
          this.zoomLevel += 10;
          sheetArea.style.transform = `scale(${this.zoomLevel / 100})`;
          if (zoomLabel) zoomLabel.textContent = `${this.zoomLevel}%`;
        }
      });

      zoomOutBtn.addEventListener('click', () => {
        if (this.zoomLevel > 70) {
          this.zoomLevel -= 10;
          sheetArea.style.transform = `scale(${this.zoomLevel / 100})`;
          if (zoomLabel) zoomLabel.textContent = `${this.zoomLevel}%`;
        }
      });
    }

    // Print button
    const printBtn = modalRoot.querySelector('#btn-pdf-print');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Download button
    const downloadBtn = modalRoot.querySelector('#btn-pdf-download');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        this.notificationService.success('Mengunduh berkas resmi PDF terverifikasi...');
      });
    }

    // Copy link button
    const copyBtn = modalRoot.querySelector('#btn-copy-doc-link');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(`https://creativeoffice.app/docs/${this.currentDocId}`);
        }
        this.notificationService.info('Tautan dokumen resmi berhasil disalin ke clipboard.');
      });
    }
  }
}
