/**
 * LegalDocument Model - Enkapsulasi dokumen perizinan, sertifikat SLF, izin Dishub/Satpol PP, dan asuransi
 */
export class LegalDocument {
  constructor({
    id,
    title,
    issuer,
    skNumber,
    fileType = 'PDF',
    fileSize = '3.8 MB',
    status = 'Valid & Terverifikasi',
    expiry = '31 Agustus 2024',
    officer = '',
    qrId = 'GOV-DKI-99214A',
    icon = 'description',
    pages = 2,
    previewHtml = null
  }) {
    this.id = id;
    this.title = title;
    this.issuer = issuer;
    this.skNumber = skNumber;
    this.fileType = fileType;
    this.fileSize = fileSize;
    this.status = status;
    this.expiry = expiry;
    this.officer = officer;
    this.qrId = qrId;
    this.icon = icon;
    this.pages = pages;
    this.previewHtml = previewHtml;
  }
}
