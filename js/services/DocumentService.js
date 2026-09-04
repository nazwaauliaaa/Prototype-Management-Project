import { LegalDocument } from '../models/LegalDocument.js';

/**
 * DocumentService - Single Responsibility Principle (SRP)
 * Manages legal permits, construction SLF certificates, and official government document renderings.
 */
export class DocumentService {
  /**
   * @param {EventBus} eventBus
   * @param {NotificationService} notificationService
   */
  constructor(eventBus, notificationService) {
    this.eventBus = eventBus;
    this.notifications = notificationService;
    this.documents = [];
    this.initDefaultDocuments();
  }

  initDefaultDocuments() {
    this.documents = [
      new LegalDocument({
        id: 'doc-dishub',
        title: 'Surat Rekomendasi Penyelenggaraan Reklame LED OOH',
        issuer: 'Dinas Perhubungan (Dishub) Provinsi DKI Jakarta',
        skNumber: 'SK-Dishub/8812/Reklame/VIII/2024',
        fileType: 'PDF',
        fileSize: '3.8 MB',
        status: 'Valid & Terverifikasi',
        expiry: '31 Agustus 2024',
        officer: 'Bpk. Hendro Wibowo, S.T., M.T. (Staf Teknis Dishub)',
        qrId: 'GOV-DKI-99214A',
        icon: 'description',
        pages: 2
      }),
      new LegalDocument({
        id: 'doc-satpol-pp',
        title: 'Izin Penataan & Keamanan Lokasi Titik Ruang Terbuka',
        issuer: 'Satuan Polisi Pamong Praja (Satpol PP) DKI Jakarta',
        skNumber: 'SPP-DKI/B-409/VIII/2024',
        fileType: 'PDF',
        fileSize: '2.4 MB',
        status: 'Valid & Terverifikasi',
        expiry: '31 Agustus 2024',
        officer: 'Bpk. Rizal Fahreza, S.Sos (Kasi Operasional)',
        qrId: 'SATPOL-DKI-88219B',
        icon: 'security',
        pages: 2
      }),
      new LegalDocument({
        id: 'doc-slf',
        title: 'Sertifikat Kelayakan Konstruksi & Rangka LED (SLF)',
        issuer: 'Dinas Cipta Karya, Tata Ruang & Pertanahan & Balai Uji Independen',
        skNumber: 'SLF-DKI/RANGKA-BAJA/2024/099',
        fileType: 'PDF',
        fileSize: '5.1 MB',
        status: 'Aktif s/d 2025',
        expiry: '28 Februari 2025',
        officer: 'Ir. Danang Prasetyo, IPM (Konsultan Struktur)',
        qrId: 'SLF-BKG-2024-4411',
        icon: 'construction',
        pages: 3
      }),
      new LegalDocument({
        id: 'doc-asuransi',
        title: 'Polis Asuransi Tanggung Gugat Pihak Ketiga (Public Liability)',
        issuer: 'PT Asuransi Mega Pratama Tbk',
        skNumber: 'POL-PL-OOH-2024-8831',
        fileType: 'PDF',
        fileSize: '1.9 MB',
        status: 'Tertanggung Aktif',
        expiry: '31 Desember 2024',
        officer: 'Dewi Anggraini (Underwriting Manager)',
        qrId: 'INS-MEGA-77123P',
        icon: 'assured_workload',
        pages: 2
      })
    ];
  }

  getDocuments() {
    return this.documents;
  }

  getDocument(id) {
    return this.documents.find(d => d.id === id);
  }

  /**
   * Generates authentic government document layout for official viewer preview
   * @param {string} docId
   * @param {number} pageNum
   * @returns {string} HTML markup of document
   */
  renderDocumentPage(docId, pageNum = 1) {
    switch (docId) {
      case 'doc-dishub':
        return this.renderDishubDocument(pageNum);
      case 'doc-satpol-pp':
        return this.renderSatpolPPDocument(pageNum);
      case 'doc-slf':
        return this.renderSLFDocument(pageNum);
      case 'doc-asuransi':
        return this.renderAsuransiDocument(pageNum);
      default:
        return this.renderDishubDocument(1);
    }
  }

  renderDishubDocument(page) {
    if (page === 2) {
      return `
        <div class="flex items-center justify-between pb-4 border-b-2 border-[#0f172a] relative">
          <div class="text-left">
            <span class="font-mono text-[11px] font-bold text-text-muted">LAMPIRAN TEKNIS • SK-Dishub/8812/Reklame/VIII/2024</span>
            <h2 class="text-[14px] font-bold font-serif text-[#0b1c30] mt-1">LEMBAR PENGESAHAN TTE BSrE & STEMPEL DIGITAL OTORITAS</h2>
          </div>
          <div class="px-2 py-1 bg-surface-container rounded text-status-success font-mono text-[10px] font-bold">
            HALAMAN 2 DARI 2
          </div>
        </div>

        <div class="mt-6 flex flex-col gap-4 text-[12px] font-serif leading-relaxed text-[#1e293b]">
          <div class="p-4 rounded-xl bg-surface-container-low border border-surface-border flex flex-col gap-2 font-sans">
            <span class="font-bold text-[#0f172a] uppercase text-[11px] tracking-wider">Spesifikasi Display LED Rekomendasi:</span>
            <div class="grid grid-cols-2 gap-2 text-[11.5px]">
              <div><strong>Dimensi Konstruksi:</strong> 24m x 13.5m (Safe Aspect 16:9)</div>
              <div><strong>Tipe Pitch:</strong> Novastar P4 Outdoor High-Nits</div>
              <div><strong>Maksimal Nits:</strong> 7,500 nits (Siang) / 4,500 nits (Malam)</div>
              <div><strong>Sensor Ambience:</strong> Otomatis kalibrasi lux cuaca Jakarta</div>
            </div>
          </div>

          <div class="mt-4 p-5 rounded-xl border-2 border-dashed border-[#1d4ed8]/40 bg-blue-50/40 flex flex-col items-center text-center">
            <div class="w-16 h-16 rounded-xl bg-blue-100 p-2 flex items-center justify-center text-[#1d4ed8] mb-2">
              <span class="material-symbols-outlined text-[36px]">verified_user</span>
            </div>
            <h3 class="font-bold text-[#1e3a8a] text-[13px] font-sans uppercase">Sertifikat Tanda Tangan Elektronik (TTE) Tersertifikasi BSrE</h3>
            <p class="text-[11px] font-sans text-text-secondary max-w-md mt-1">
              Dokumen ini telah ditandatangani secara digital oleh Balai Sertifikasi Elektronik (BSrE), Badan Siber dan Sandi Negara (BSSN) sesuai UU ITE No. 11 Tahun 2008.
            </p>
            <div class="mt-3 flex items-center gap-4 text-[10px] font-mono text-text-muted">
              <span>Serial: 8F9B-CC10-AA94-2024</span>
              <span>•</span>
              <span>Timestamp: 15-08-2024 14:22:09 WIB</span>
            </div>
          </div>

          <div class="mt-8 pt-4 border-t border-surface-border flex items-center justify-between text-[11px] font-serif">
            <div>
              <p class="font-bold text-text-primary">Dinas Perhubungan Provinsi DKI Jakarta</p>
              <p class="text-text-muted">Unit Pengelola Manajemen Reklame & Fasilitas Jalan</p>
            </div>
            <div class="text-right">
              <span class="font-mono text-status-success font-bold">DIGITALLY SEALED</span>
            </div>
          </div>
        </div>
      `;
    }

    // Page 1
    return `
      <div class="flex items-center justify-between pb-4 border-b-2 border-[#0f172a] relative">
        <div class="w-16 h-16 shrink-0 flex items-center justify-center p-1">
          <svg class="w-14 h-14" viewBox="0 0 100 110">
            <polygon fill="#d97706" points="50,5 90,25 90,80 50,105 10,80 10,25" stroke="#78350f" stroke-width="2"></polygon>
            <polygon fill="#fef3c7" points="50,12 82,28 82,75 50,96 18,75 18,28" stroke="#b45309" stroke-width="1.5"></polygon>
            <circle cx="50" cy="50" fill="#dc2626" r="22"></circle>
            <polygon fill="#fbbf24" points="50,32 55,44 67,44 58,52 61,64 50,56 39,64 42,52 33,44 45,44"></polygon>
            <text fill="#1e3a8a" font-family="sans-serif" font-size="8" font-weight="bold" text-anchor="middle" x="50" y="86">JAYA RAYA</text>
          </svg>
        </div>
        <div class="flex-1 text-center px-3">
          <h2 class="text-[13px] md:text-[15px] font-bold tracking-wide uppercase leading-tight font-serif text-[#0b1c30]">PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA</h2>
          <h1 class="text-[15px] md:text-[18px] font-extrabold tracking-wider uppercase leading-snug font-serif text-[#0b1c30]">DINAS PERHUBUNGAN</h1>
          <p class="text-[10px] leading-tight text-text-secondary mt-1">Jl. Taman Jatibaru No. 1, Gambir, Jakarta Pusat 10150 • Telepon: (021) 3865888</p>
          <p class="text-[10px] leading-tight text-text-secondary">Laman: dishub.jakarta.go.id • Pos-el: info.dishub@jakarta.go.id • Kode Pos: 10150</p>
        </div>
        <div class="w-16 shrink-0 flex flex-col items-center justify-center">
          <div class="w-12 h-12 bg-surface-container p-1 rounded border border-surface-border flex items-center justify-center">
            <svg class="w-full h-full text-text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm10 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2zm-2-2h2v2h-2v-2zm-4-4h2v2h-2v-2zm6-4h2v2h-2V6zm-2 2h2v2h-2V8zm-2 4h2v2h-2v-2z"></path>
            </svg>
          </div>
          <span class="text-[8px] font-mono text-text-muted mt-1">VERIFIED-QR</span>
        </div>
      </div>

      <div class="text-center mt-5 mb-3">
        <h3 class="text-[12px] md:text-[13px] font-bold uppercase underline tracking-wider font-serif text-text-primary">
          SURAT REKOMENDASI TEKNIS PENYELENGGARAAN REKLAME / MEDIA LUAR RUANG (OOH) DIGITAL
        </h3>
        <p class="font-mono text-[11px] font-semibold text-text-secondary mt-0.5">Nomor: SK-Dishub/8812/Reklame/VIII/2024</p>
      </div>

      <div class="text-[11.5px] leading-relaxed text-[#1e293b] flex flex-col gap-2.5 font-serif">
        <div class="text-justify">
          <span class="font-bold">Membaca & Menimbang:</span> Permohonan Pengesahan Teknis Penyelenggaraan Reklame Elektronik LED Billboard Megatron Nomor Permohonan: <span class="font-mono font-semibold">SKT-OOH/RK-304/2024</span> tertanggal 10 Agustus 2024 oleh PT Sampulkreativ Technology.
        </div>
        
        <div class="text-center font-bold tracking-widest text-[11px] uppercase py-1 my-1 bg-[#f8fafc] border-y border-dashed border-[#cbd5e1]">
          MEMBERIKAN REKOMENDASI TEKNIS KEPADA:
        </div>

        <div class="bg-surface-container-low/60 p-3 rounded-lg border border-surface-border text-[11px] grid grid-cols-1 md:grid-cols-2 gap-y-1 gap-x-4 font-sans">
          <div class="flex justify-between"><span class="text-text-secondary">Nama Badan Usaha:</span><span class="font-bold text-text-primary">PT Sampulkreativ Technology</span></div>
          <div class="flex justify-between"><span class="text-text-secondary">Pilar Kerja:</span><span class="font-semibold text-primary">RuangKreasi (Sprint 14)</span></div>
          <div class="flex justify-between"><span class="text-text-secondary">Titik Lokasi OOH:</span><span class="font-bold text-text-primary">Bundaran Hotel Indonesia (Slot #02)</span></div>
          <div class="flex justify-between"><span class="text-text-secondary">Area Pendukung:</span><span class="font-medium text-text-primary">Flyover Pangeran Antasari</span></div>
          <div class="flex justify-between"><span class="text-text-secondary">Resolusi & Rasio:</span><span class="font-mono font-bold text-text-primary">3840 x 2160 (16:9 UHD)</span></div>
          <div class="flex justify-between"><span class="text-text-secondary">Batas Luminansi Siang:</span><span class="font-bold text-status-success">Maks. 7.500 Nits (06.00 - 18.00)</span></div>
          <div class="flex justify-between"><span class="text-text-secondary">Batas Luminansi Malam:</span><span class="font-bold text-status-warning">Maks. 4.500 Nits (18.00 - 06.00)</span></div>
          <div class="flex justify-between"><span class="text-text-secondary">Masa Berlaku Izin:</span><span class="font-bold text-primary">15 Ags 2024 s/d 31 Ags 2024</span></div>
        </div>

        <div class="text-justify text-[11px]">
          <span class="font-bold">Ketentuan Keselamatan Lalu Lintas:</span> Pemegang rekomendasi diwajibkan menjamin stabilitas siaran tanpa efek kedipan mendadak, mematuhi batas pencahayaan malam, serta menghentikan siaran apabila terjadi kendala teknis pada sensor lingkungan.
        </div>
      </div>

      <div class="mt-6 pt-3 flex items-end justify-between gap-4 font-serif text-[11px]">
        <div class="flex flex-col items-center p-2 rounded-lg bg-surface-container-low border border-surface-border text-center w-44">
          <span class="text-[9px] font-mono text-text-muted">BSrE Certified Signature</span>
          <span class="text-[9px] font-semibold text-status-success mt-0.5">Valid Electronic Seal</span>
        </div>
        <div class="flex flex-col items-center text-center relative w-60">
          <p class="text-text-secondary">Jakarta, <span class="font-semibold text-text-primary">15 Agustus 2024</span></p>
          <p class="mt-0.5 font-bold text-text-primary">a.n. KEPALA DINAS PERHUBUNGAN<br/><span class="font-normal text-[10px] text-text-secondary">Kepala Bidang Reklame & Fasilitas Jalan</span></p>
          <div class="relative my-1.5 h-12 w-40 flex items-center justify-center">
            <div class="absolute inset-0 flex items-center justify-center opacity-85 rotate-[-8deg] pointer-events-none">
              <div class="w-20 h-20 rounded-full border-2 border-dashed border-[#1d4ed8] flex flex-col items-center justify-center text-[#1d4ed8] p-1 text-[7px] font-bold leading-none">
                <span>★ DISHUB ★</span>
                <span class="my-0.5">DKI JAKARTA</span>
              </div>
            </div>
            <div class="font-serif italic text-[16px] text-[#1e3a8a] font-bold tracking-wider underline select-none relative z-10">Hendro Wibowo, M.T.</div>
          </div>
          <p class="font-bold text-text-primary text-[10.5px]">HENDRO WIBOWO, S.T., M.T.</p>
          <p class="font-mono text-[9px] text-text-secondary">NIP. 19780412 200312 1 004</p>
        </div>
      </div>
    `;
  }

  renderSatpolPPDocument(page) {
    return `
      <div class="flex items-center justify-between pb-4 border-b-2 border-[#0f172a] relative">
        <div class="w-16 h-16 shrink-0 flex items-center justify-center p-1 bg-amber-50 rounded-lg border border-amber-200">
          <span class="material-symbols-outlined text-amber-700 text-[36px]">security</span>
        </div>
        <div class="flex-1 text-center px-3">
          <h2 class="text-[13px] font-bold uppercase leading-tight font-serif text-[#0b1c30]">PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA</h2>
          <h1 class="text-[16px] font-extrabold uppercase leading-snug font-serif text-[#0b1c30]">SATUAN POLISI PAMONG PRAJA (SATPOL PP)</h1>
          <p class="text-[10px] leading-tight text-text-secondary mt-1">Bidang Ketertiban Umum dan Ketenteraman Masyarakat • Kompleks Balai Kota DKI Jakarta</p>
        </div>
        <div class="w-16 shrink-0 text-center font-mono text-[9px] text-status-success font-bold">
          TERDAFTAR
        </div>
      </div>

      <div class="text-center mt-5 mb-3">
        <h3 class="text-[13px] font-bold uppercase underline font-serif text-text-primary">
          SURAT IZIN PENATAAN & KEAMANAN LOKASI RUANG PUBLIK
        </h3>
        <p class="font-mono text-[11px] font-semibold text-text-secondary mt-0.5">Nomor: SPP-DKI/B-409/VIII/2024</p>
      </div>

      <div class="text-[11.5px] leading-relaxed text-[#1e293b] flex flex-col gap-3 font-serif">
        <p class="text-justify">
          Berdasarkan hasil inspeksi lapangan bersama tim teknis dan petugas pengawas ketertiban ruang publik pada tanggal 15 Agustus 2024, Satpol PP Provinsi DKI Jakarta memberikan izin operasional penataan teknis lokasi kepada:
        </p>

        <div class="bg-surface-container-low p-3.5 rounded-lg border border-surface-border text-[11.5px] grid grid-cols-2 gap-2 font-sans">
          <div><strong>Pemohon:</strong> PT Sampulkreativ Technology</div>
          <div><strong>Penanggung Jawab:</strong> Sari Rahmawati (Creative Lead)</div>
          <div><strong>Lokasi:</strong> Titik Bundaran HI & Koridor Flyover Antasari</div>
          <div><strong>Durasi:</strong> 15 Agustus 2024 - 31 Agustus 2024</div>
        </div>

        <p class="text-justify">
          <strong>Kewajiban Pengelola:</strong> Menjaga ketertiban area pedestarian, memastikan kabel jalur transmisi terlindungi pipa conduit tahan api, serta menyediakan hotline darurat 24 jam.
        </p>
      </div>

      <div class="mt-8 pt-4 border-t border-surface-border flex items-end justify-between font-serif text-[11px]">
        <div>
          <span class="text-status-success font-bold flex items-center gap-1">
            <span class="material-symbols-outlined text-[16px]">verified</span> Terverifikasi Resmi
          </span>
        </div>
        <div class="text-center">
          <p>Kepala Satuan Polisi Pamong Praja DKI</p>
          <div class="my-2 font-serif italic text-[16px] text-blue-900 font-bold underline">Rizal Fahreza, S.Sos</div>
          <p class="font-bold">RIZAL FAHREZA, S.Sos</p>
          <p class="font-mono text-[9px] text-text-muted">NIP. 19820515 200604 1 008</p>
        </div>
      </div>
    `;
  }

  renderSLFDocument(page) {
    return `
      <div class="flex items-center justify-between pb-4 border-b-2 border-[#0f172a] relative">
        <div class="w-16 h-16 shrink-0 flex items-center justify-center p-1 bg-purple-50 rounded-lg border border-purple-200">
          <span class="material-symbols-outlined text-purple-700 text-[36px]">architecture</span>
        </div>
        <div class="flex-1 text-center px-3">
          <h2 class="text-[13px] font-bold uppercase leading-tight font-serif text-[#0b1c30]">LEMBAGA UJI KELAYAKAN STRUKTUR & KESELAMATAN BANGUNAN</h2>
          <h1 class="text-[16px] font-extrabold uppercase leading-snug font-serif text-[#0b1c30]">SERTIFIKAT LAIK FUNGSI KONSTRUKSI (SLF)</h1>
          <p class="text-[10px] leading-tight text-text-secondary mt-1">Akreditasi Komite Akreditasi Nasional (KAN) • No. Sertifikasi: SLF-DKI/RANGKA-BAJA/2024/099</p>
        </div>
        <div class="w-16 shrink-0 text-center font-mono text-[9px] text-status-success font-bold">
          GRADE A
        </div>
      </div>

      <div class="mt-5 text-[11.5px] leading-relaxed text-[#1e293b] flex flex-col gap-3 font-serif">
        <div class="text-justify">
          Menyatakan bahwa rangka struktur baja penopang display billboard LED 4K outdoor pada titik Bundaran HI telah melalui uji beban statis, dinamis, dan uji las Non-Destructive Testing (NDT) ultrasonik dengan hasil:
        </div>

        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-[11px] grid grid-cols-2 gap-3">
          <div>• Beban Angin Desain: 120 km/jam (Pass)</div>
          <div>• Mutu Baja: ASTM A36 / SS400 Galvanis</div>
          <div>• Uji Las Sambungan: NDT 100% Penetration</div>
          <div>• Angkur Pondasi: M30 Chemical Anchor Grade 8.8</div>
        </div>

        <div class="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 font-sans text-[11px] font-medium">
          ✓ Kelaikan Struktur Rangka Konstruksi: 100% Aman dan Memenuhi Standar SNI 1729:2020.
        </div>
      </div>

      <div class="mt-8 pt-4 border-t border-surface-border flex items-end justify-between font-serif text-[11px]">
        <div>
          <p>Masa Berlaku: s/d 28 Februari 2025</p>
        </div>
        <div class="text-center">
          <p>Ketua Tim Ahli Struktur Bangunan</p>
          <div class="my-2 font-serif italic text-[16px] text-blue-900 font-bold underline">Ir. Danang Prasetyo, IPM</div>
          <p class="font-bold">Ir. DANANG PRASETYO, S.T., M.T., IPM</p>
          <p class="font-mono text-[9px] text-text-muted">No. Registrasi LPJK: 1.2.304.2.148.09</p>
        </div>
      </div>
    `;
  }

  renderAsuransiDocument(page) {
    return `
      <div class="flex items-center justify-between pb-4 border-b-2 border-[#0f172a] relative">
        <div class="w-16 h-16 shrink-0 flex items-center justify-center p-1 bg-emerald-50 rounded-lg border border-emerald-200">
          <span class="material-symbols-outlined text-emerald-700 text-[36px]">shield_with_heart</span>
        </div>
        <div class="flex-1 text-center px-3">
          <h2 class="text-[13px] font-bold uppercase leading-tight font-serif text-[#0b1c30]">PT ASURANSI MEGA PRATAMA TBK</h2>
          <h1 class="text-[16px] font-extrabold uppercase leading-snug font-serif text-[#0b1c30]">POLIS ASURANSI PUBLIC LIABILITY</h1>
          <p class="text-[10px] leading-tight text-text-secondary mt-1">Terdaftar dan Diawasi oleh Otoritas Jasa Keuangan (OJK) • Izin OJK No: KEP-442/KMK.017/2021</p>
        </div>
        <div class="w-16 shrink-0 text-center font-mono text-[9px] text-status-success font-bold">
          ACTIVE
        </div>
      </div>

      <div class="mt-5 text-[11.5px] leading-relaxed text-[#1e293b] flex flex-col gap-3 font-serif">
        <div class="bg-surface-container-low p-3.5 rounded-lg border border-surface-border text-[11.5px] grid grid-cols-2 gap-2 font-sans">
          <div><strong>Nomor Polis:</strong> POL-PL-OOH-2024-8831</div>
          <div><strong>Tertanggung:</strong> PT Sampulkreativ Technology</div>
          <div><strong>Nilai Pertanggungan:</strong> Rp 5.000.000.000,- (5 Miliar)</div>
          <div><strong>Masa Pertanggungan:</strong> 01 Ags 2024 – 31 Des 2024</div>
        </div>

        <p class="text-justify">
          Polis ini menjamin ganti rugi terhadap tuntutan hukum pihak ketiga atas kerusakan fisik harta benda atau cedera badan yang timbul sehubungan dengan keberadaan atau pengoperasian media reklame luar ruang pada lokasi yang tercantum.
        </p>
      </div>

      <div class="mt-8 pt-4 border-t border-surface-border flex items-end justify-between font-serif text-[11px]">
        <div>
          <span class="text-status-success font-bold flex items-center gap-1 font-sans">
            <span class="material-symbols-outlined text-[16px]">verified</span> Klaim 24 Jam Siaga
          </span>
        </div>
        <div class="text-center">
          <p>PT Asuransi Mega Pratama Tbk</p>
          <div class="my-2 font-serif italic text-[16px] text-blue-900 font-bold underline">Dewi Anggraini</div>
          <p class="font-bold">DEWI ANGGRAINI, ANZIIF</p>
          <p class="font-mono text-[9px] text-text-muted">Head of Commercial Underwriting</p>
        </div>
      </div>
    `;
  }
}
