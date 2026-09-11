import { BaseView } from '../core/BaseView.js';
import { getAllProjects, getProjectById } from '../data/projectDocsData.js';

/**
 * DocsSheetsView - Single Responsibility Principle (SRP)
 * Manages the Document & Sheet Hub for the Manager role with functional
 * project-based filtering across all 5 official projects, document switching,
 * and dynamic multi-sheet inspection.
 */
export class DocsSheetsView extends BaseView {
  constructor(container) {
    super(container);
    this.notificationService = container ? container.resolve('NotificationService') : null;

    // View state
    this.activeSubTab = 'docs'; // 'docs' | 'sheets'

    // Manager Project selection state (Default: PRJ-RK01)
    const savedProjectId = localStorage.getItem('manager_active_project_id');
    const validProjectIds = ['PRJ-RK01', 'PRJ-LB02', 'PRJ-IA03', 'PRJ-PK04', 'PRJ-SH05'];
    this.selectedProjectId = validProjectIds.includes(savedProjectId) ? savedProjectId : 'PRJ-RK01';

    // Sub-item selection states
    this.selectedDocumentId = null;
    this.selectedSheetId = null;
  }

  /**
   * Returns all available projects from the projectDocsData store
   */
  getProjects() {
    return getAllProjects();
  }

  /**
   * Returns current active project with safe fallback to PRJ-RK01
   */
  getCurrentProject() {
    return getProjectById(this.selectedProjectId);
  }

  render() {
    const projects = this.getProjects();
    const currentProject = this.getCurrentProject();

    return `
      <div class="flex flex-col w-full px-4 sm:px-6 md:px-spacing-2xl pt-4 pb-spacing-3xl">
        
        <!-- Header -->
        <div class="flex flex-col gap-2 mb-4">
          <div class="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
            <div class="min-w-0">
              <h1 class="font-headline-lg text-[18px] sm:text-[20px] text-on-surface font-bold tracking-tight">
                Pusat Dokumen &amp; Lembar Kerja
              </h1>
              <p class="font-caption-meta text-[11px] text-text-secondary">
                Kanvas SOP teknis, inventaris hardware Novastar, dan lembar kalkulasi budget terpusat berdampingan dengan tugas aktual.
              </p>
            </div>

            <!-- Controls: Project Selector & Hub Mode Switcher -->
            <div class="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
              
              <!-- Project Selector for Manager Role -->
              <div class="flex items-center bg-surface-container-low px-2 sm:px-2.5 py-1 rounded-xl border border-surface-border gap-1.5 shadow-2xs">
                <span class="material-symbols-outlined text-[16px] text-primary shrink-0">folder_open</span>
                <label for="select-doc-project" class="text-[11px] font-bold text-text-secondary whitespace-nowrap hidden xs:inline">Proyek:</label>
                <select 
                  id="select-doc-project" 
                  class="bg-surface-container-lowest border border-surface-border text-text-primary text-[11px] sm:text-[12px] font-semibold rounded-lg px-2 py-1 focus:outline-none focus:border-primary cursor-pointer max-w-[170px] sm:max-w-[240px] truncate"
                  title="Pilih Proyek"
                >
                  ${projects.map(p => `
                    <option value="${p.id}" ${p.id === currentProject.id ? 'selected' : ''}>
                      ${p.id} — ${p.name}
                    </option>
                  `).join('')}
                </select>
              </div>

              <!-- Hub Mode Switcher (SOP vs Lembar Kerja) -->
              <div class="flex items-center bg-surface-container-low p-1 rounded-xl border border-surface-border shrink-0">
                <button 
                  class="subtab-btn px-2 sm:px-3 py-1.5 rounded-lg font-body-medium text-[12px] flex items-center gap-1 sm:gap-1.5 transition-all ${this.activeSubTab === 'docs' ? 'bg-primary-container text-on-primary font-bold shadow-xs' : 'text-text-secondary hover:text-text-primary'}" 
                  data-subtab="docs"
                  type="button"
                  title="Dokumen SOP & Regulasi"
                >
                  <span class="material-symbols-outlined text-[16px]">menu_book</span>
                  <span class="hidden sm:inline">Dokumen SOP</span>
                  <span class="sm:hidden text-[11px] font-semibold">SOP</span>
                </button>

                <button 
                  class="subtab-btn px-2 sm:px-3 py-1.5 rounded-lg font-body-medium text-[12px] flex items-center gap-1 sm:gap-1.5 transition-all ${this.activeSubTab === 'sheets' ? 'bg-primary-container text-on-primary font-bold shadow-xs' : 'text-text-secondary hover:text-text-primary'}" 
                  data-subtab="sheets"
                  type="button"
                  title="Lembar Kerja (Sheets Grid)"
                >
                  <span class="material-symbols-outlined text-[16px]">grid_on</span>
                  <span class="hidden sm:inline">Lembar Kerja</span>
                  <span class="sm:hidden text-[11px] font-semibold">Sheet</span>
                </button>
              </div>

            </div>
          </div>
        </div>

        <!-- Main Workspace Area -->
        ${this.activeSubTab === 'docs' ? this.renderDocsView(currentProject) : this.renderSheetsView(currentProject)}

      </div>
    `;
  }

  /**
   * Render Dokumen SOP View based on selected Project
   */
  renderDocsView(project) {
    const docs = project.documents || [];

    // Empty state if project has no documents
    if (docs.length === 0) {
      return `
        <div class="w-full bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-border p-12 flex flex-col items-center justify-center text-center gap-3">
          <div class="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-text-muted">
            <span class="material-symbols-outlined text-[28px]">description</span>
          </div>
          <h3 class="font-headline-md text-[16px] font-bold text-text-primary">Tidak Ada Dokumen SOP</h3>
          <p class="font-caption-meta text-xs text-text-secondary max-w-sm">
            Proyek <strong>${project.name}</strong> belum memiliki berkas dokumen SOP terdaftar.
          </p>
        </div>
      `;
    }

    // Resolve active document
    const activeDoc = docs.find(d => d.id === this.selectedDocumentId) || docs[0];

    return `
      <div class="flex flex-col gap-3 w-full">
        
        <!-- Document Switcher Pills (If project has multiple documents) -->
        ${docs.length > 1 ? `
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span class="text-[11px] font-bold text-text-secondary uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
              <span class="material-symbols-outlined text-[14px] text-primary">description</span>
              <span>Dokumen Proyek:</span>
            </span>
            ${docs.map(doc => `
              <button 
                class="btn-select-doc px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${doc.id === activeDoc.id ? 'bg-primary-container text-on-primary shadow-2xs' : 'bg-surface-container hover:bg-surface-container-high text-text-secondary hover:text-text-primary'}"
                data-doc-id="${doc.id}"
                type="button"
                title="${doc.title}"
              >
                <span>${doc.title.split(':')[0]}</span>
                <span class="text-[10px] opacity-80 font-mono">(${doc.version})</span>
              </button>
            `).join('')}
          </div>
        ` : ''}

        <!-- Main Document Card -->
        <div class="w-full bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-border p-6 md:p-8 flex flex-col gap-6">
          
          <!-- Header Dokumen -->
          <div class="flex items-center justify-between pb-4 border-b border-surface-border">
            <div class="min-w-0 pr-2">
              <span class="font-mono text-[11px] text-primary font-bold">${activeDoc.documentNumber}</span>
              <h2 class="font-headline-lg text-[18px] font-bold text-text-primary mt-0.5 leading-snug">
                ${activeDoc.title}
              </h2>
            </div>
            <span class="px-2.5 py-1 rounded-full ${activeDoc.badgeColor || 'bg-status-success/15 text-status-success'} font-badge-micro text-[10px] font-bold whitespace-nowrap shrink-0">
              ${activeDoc.badge || activeDoc.version}
            </span>
          </div>

          <!-- Manager Metadata Bar: Project, Versi, Tanggal Update, Pembuat Dokumen -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-surface-container-low rounded-xl border border-surface-border text-xs">
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px] text-primary">folder</span>
                Proyek
              </span>
              <span class="font-bold text-text-primary truncate" title="${project.name}">${project.name}</span>
            </div>

            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px] text-primary">verified</span>
                Versi
              </span>
              <span class="font-bold text-text-primary truncate">${activeDoc.version}</span>
            </div>

            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px] text-primary">calendar_today</span>
                Tanggal Update
              </span>
              <span class="font-bold text-text-primary truncate">${activeDoc.updatedAt}</span>
            </div>

            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px] text-primary">person</span>
                Pembuat Dokumen
              </span>
              <span class="font-bold text-text-primary truncate" title="${activeDoc.author}">${activeDoc.author}</span>
            </div>
          </div>

          <!-- Document Structured Sections -->
          <div class="flex flex-col gap-5 text-[13px] text-text-secondary leading-relaxed max-w-4xl">
            ${(activeDoc.sections || []).map(sec => `
              <section class="flex flex-col gap-2">
                <h3 class="font-headline-md text-[15px] font-bold text-text-primary flex items-center gap-2">
                  <span class="w-6 h-6 rounded-md bg-primary-container text-on-primary flex items-center justify-center text-[12px] shrink-0 font-bold">${sec.number}</span>
                  <span>${sec.title}</span>
                </h3>
                <div class="text-[13px] text-text-secondary leading-relaxed space-y-2">
                  ${sec.contentHtml}
                </div>
              </section>
            `).join('')}
          </div>

        </div>

      </div>
    `;
  }

  /**
   * Render Lembar Kerja (Sheets Grid) based on selected Project
   */
  renderSheetsView(project) {
    const sheets = project.sheets || [];

    // Empty state if project has no sheets
    if (sheets.length === 0) {
      return `
        <div class="w-full bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-border p-12 flex flex-col items-center justify-center text-center gap-3">
          <div class="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center text-text-muted">
            <span class="material-symbols-outlined text-[28px]">grid_off</span>
          </div>
          <h3 class="font-headline-md text-[16px] font-bold text-text-primary">Tidak Ada Lembar Kerja</h3>
          <p class="font-caption-meta text-xs text-text-secondary max-w-sm">
            Proyek <strong>${project.name}</strong> belum memiliki Sheet aktif yang terdaftar.
          </p>
        </div>
      `;
    }

    // Resolve active sheet
    const activeSheet = sheets.find(s => s.id === this.selectedSheetId) || sheets[0];

    return `
      <div class="w-full bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-border overflow-hidden flex flex-col gap-0">
        
        <!-- Sheet Header Bar -->
        <div class="px-3 pt-2.5 pb-2 bg-surface-container-low border-b border-surface-border flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <span class="text-[11px] font-bold text-text-secondary uppercase tracking-wider pl-1 mr-1 shrink-0 flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px] text-primary">table_chart</span>
              <span>Lembar Kerja:</span>
            </span>

            ${sheets.map(sheet => `
              <button 
                class="btn-select-sheet px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${sheet.id === activeSheet.id ? 'bg-primary-container text-on-primary shadow-xs' : 'bg-surface-container hover:bg-surface-container-high text-text-secondary hover:text-text-primary'}"
                data-sheet-id="${sheet.id}"
                type="button"
                title="Buka ${sheet.name}"
              >
                <span class="material-symbols-outlined text-[13px]">grid_on</span>
                <span>${sheet.name}</span>
              </button>
            `).join('')}
          </div>

          <div class="flex items-center gap-1 text-[11px] text-text-secondary bg-surface-container-lowest px-2 py-0.5 rounded-lg border border-surface-border shrink-0">
            <span class="material-symbols-outlined text-[14px] text-primary">folder</span>
            <span class="font-bold text-text-primary truncate max-w-[150px] sm:max-w-[200px]" title="${project.name}">${project.name}</span>
          </div>
        </div>

        <!-- Formula & Toolbar -->
        <div class="p-2.5 bg-surface-container-low border-b border-surface-border flex items-center gap-2 text-[12px]">
          <span class="font-mono font-bold text-text-muted px-2 py-0.5 rounded bg-surface-container">fx</span>
          <input 
            class="flex-1 px-3 py-1 rounded bg-surface-container-lowest border border-surface-border font-mono text-[11.5px] text-text-primary focus:outline-none focus:border-primary truncate" 
            value="${activeSheet.formula || '=SUM(A1:Z100)'}" 
            readonly
          />
          <button 
            id="btn-export-sheet-csv" 
            class="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-text-primary text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
            type="button"
            title="Ekspor data ${activeSheet.name} ke format CSV"
          >
            <span class="material-symbols-outlined text-[14px]">download</span>
            <span>Ekspor .CSV</span>
          </button>
        </div>

        <!-- Dynamic Spreadsheet Grid Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse font-sans text-[12px]" id="current-sheet-table">
            <thead>
              <tr class="bg-surface-container-low/70 border-b border-surface-border text-text-secondary font-mono text-[11px]">
                ${(activeSheet.columns || []).map(col => `
                  <th class="py-2 px-3 ${col.width || ''} ${col.minWidth || ''}">
                    ${col.label}
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-border">
              ${(activeSheet.rows || []).map((row, idx) => `
                <tr class="hover:bg-blue-50/50 transition-colors">
                  ${(activeSheet.columns || []).map(col => {
                    const val = row[col.key] !== undefined ? row[col.key] : '';

                    // 1. Column # Index
                    if (col.key === 'index') {
                      return `<td class="py-2 px-3 text-center bg-surface-container-low/40 font-mono text-[10px] text-text-muted">${val || (idx + 1)}</td>`;
                    }

                    // 2. Status Badge
                    if (col.isBadge) {
                      const colorClass = row.badgeColor || 'bg-status-success/15 text-status-success';
                      return `
                        <td class="py-2 px-3">
                          <span class="px-2 py-0.5 rounded font-badge-micro text-[10px] font-bold ${colorClass}">
                            ${val}
                          </span>
                        </td>
                      `;
                    }

                    // 3. Priority Badge
                    if (col.isPriorityBadge) {
                      const colorClass = val === 'Critical' ? 'bg-status-urgent/15 text-status-urgent' : (val === 'High' ? 'bg-status-warning/15 text-status-warning' : 'bg-status-planning/15 text-status-planning');
                      return `
                        <td class="py-2 px-3">
                          <span class="px-2 py-0.5 rounded font-badge-micro text-[10px] font-bold ${colorClass}">
                            ${val}
                          </span>
                        </td>
                      `;
                    }

                    // 4. Progress Bar
                    if (col.isProgress) {
                      const num = Number(val) || 0;
                      return `
                        <td class="py-2 px-3">
                          <div class="flex items-center gap-2">
                            <div class="flex-1 bg-surface-container h-2 rounded-full overflow-hidden min-w-[50px]">
                              <div class="bg-primary h-full rounded-full" style="width: ${num}%;"></div>
                            </div>
                            <span class="font-mono font-bold text-[11px] text-text-primary w-8 text-right">${num}%</span>
                          </div>
                        </td>
                      `;
                    }

                    // 5. Monospace formatting
                    if (col.mono) {
                      return `<td class="py-2 px-3 font-mono text-text-secondary">${val}</td>`;
                    }

                    // 6. Bold formatting
                    if (col.bold) {
                      return `<td class="py-2 px-3 font-semibold text-text-primary">${val}</td>`;
                    }

                    // Default cell
                    return `<td class="py-2 px-3 text-text-secondary">${val}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
            ${activeSheet.summary ? `
              <tfoot>
                <tr class="bg-surface-container font-bold text-[12px] border-t-2 border-surface-border">
                  <td colspan="${Math.max(1, (activeSheet.columns.length - 1))}" class="py-2.5 px-4 text-right">
                    ${activeSheet.summary.label}
                  </td>
                  <td class="py-2.5 px-3 text-right font-mono text-primary font-extrabold text-[13px]">
                    ${activeSheet.summary.value}
                  </td>
                </tr>
              </tfoot>
            ` : ''}
          </table>
        </div>

      </div>
    `;
  }

  /**
   * Export the currently displayed sheet to a genuine downloadable CSV file
   */
  exportCurrentSheetCSV() {
    const project = this.getCurrentProject();
    const sheets = project.sheets || [];
    const activeSheet = sheets.find(s => s.id === this.selectedSheetId) || sheets[0];

    if (!activeSheet) return;

    const filename = `${project.id}_${activeSheet.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;

    let csvContent = `data:text/csv;charset=utf-8,`;
    csvContent += `"Laporan Lembar Kerja - Creative Office"\n`;
    csvContent += `"Proyek","[${project.id}] ${project.name}"\n`;
    csvContent += `"Lembar Kerja","${activeSheet.name}"\n`;
    csvContent += `"Tanggal Ekspor","${new Date().toLocaleDateString('id-ID')}"\n\n`;

    const table = this.element.querySelector('#current-sheet-table');
    if (table) {
      const rows = table.querySelectorAll('tr');
      rows.forEach(row => {
        const cols = row.querySelectorAll('th, td');
        const rowData = [];
        cols.forEach(col => {
          let text = col.innerText.replace(/"/g, '""').trim();
          rowData.push(`"${text}"`);
        });
        csvContent += rowData.join(',') + '\n';
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (this.notificationService) {
      this.notificationService.success(`Berhasil mengunduh "${filename}".`);
    }
  }

  bindEvents() {
    // 1. Subtab Switcher: Dokumen SOP vs Lembar Kerja
    const subtabButtons = this.element.querySelectorAll('.subtab-btn');
    subtabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const newTab = btn.getAttribute('data-subtab');
        if (newTab !== this.activeSubTab) {
          this.activeSubTab = newTab;
          this.mount(this.element);
        }
      });
    });

    // 2. Manager Project Selector dropdown filter
    const projectSelect = this.element.querySelector('#select-doc-project');
    if (projectSelect) {
      projectSelect.addEventListener('change', (e) => {
        const newProjectId = e.target.value;
        if (newProjectId !== this.selectedProjectId) {
          this.selectedProjectId = newProjectId;
          localStorage.setItem('manager_active_project_id', this.selectedProjectId);

          // Reset sub-item selections to defaults for the new project
          this.selectedDocumentId = null;
          this.selectedSheetId = null;

          const currentProject = this.getCurrentProject();

          // Emit EventBus project:changed event
          if (this.eventBus) {
            this.eventBus.emit('project:changed', {
              projectId: this.selectedProjectId,
              project: currentProject
            });
          }

          if (this.notificationService) {
            this.notificationService.info(`Menampilkan data: [${currentProject.id}] ${currentProject.name}`);
          }

          // Re-render view seamlessly without full page reload
          this.mount(this.element);
        }
      });
    }

    // 3. Document selection buttons (within active project)
    const docButtons = this.element.querySelectorAll('.btn-select-doc');
    docButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const docId = btn.getAttribute('data-doc-id');
        if (docId !== this.selectedDocumentId) {
          this.selectedDocumentId = docId;

          if (this.eventBus) {
            this.eventBus.emit('document:changed', {
              projectId: this.selectedProjectId,
              documentId: docId
            });
          }

          this.mount(this.element);
        }
      });
    });

    // 4. Sheet selection buttons (within active project)
    const sheetButtons = this.element.querySelectorAll('.btn-select-sheet');
    sheetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const sheetId = btn.getAttribute('data-sheet-id');
        if (sheetId !== this.selectedSheetId) {
          this.selectedSheetId = sheetId;

          if (this.eventBus) {
            this.eventBus.emit('sheet:changed', {
              projectId: this.selectedProjectId,
              sheetId: sheetId
            });
          }

          this.mount(this.element);
        }
      });
    });

    // 5. Export CSV Toolbar button
    const exportBtn = this.element.querySelector('#btn-export-sheet-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportCurrentSheetCSV();
      });
    }
  }
}
