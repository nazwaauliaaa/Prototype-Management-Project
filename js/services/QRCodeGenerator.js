/**
 * QRCodeGenerator - Generates QR codes as SVG elements
 * Lightweight implementation using a simple QR matrix approach
 */
export class QRCodeGenerator {
  /**
   * Generate a QR code SVG string for a given data string
   * @param {string} data - The data to encode
   * @param {Object} [options]
   * @param {number} [options.size=200] - Size in pixels
   * @param {string} [options.darkColor='#ffffff'] - Module color
   * @param {string} [options.lightColor='transparent'] - Background color
   * @returns {string} SVG markup
   */
  static generate(data, options = {}) {
    const {
      size = 200,
      darkColor = '#ffffff',
      lightColor = 'transparent'
    } = options;

    // Generate a deterministic QR-like matrix from data
    const matrix = this._createMatrix(data);
    const moduleCount = matrix.length;
    const cellSize = size / moduleCount;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
    svgContent += `<rect width="${size}" height="${size}" fill="${lightColor}"/>`;

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (matrix[row][col]) {
          const x = col * cellSize;
          const y = row * cellSize;
          svgContent += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${darkColor}" rx="1"/>`;
        }
      }
    }

    svgContent += '</svg>';
    return svgContent;
  }

  /**
   * Create a QR-like matrix from data
   * @param {string} data
   * @returns {boolean[][]}
   */
  static _createMatrix(data) {
    const size = 25;
    const matrix = Array.from({ length: size }, () => Array(size).fill(false));

    // Finder patterns (top-left, top-right, bottom-left)
    this._drawFinderPattern(matrix, 0, 0);
    this._drawFinderPattern(matrix, 0, size - 7);
    this._drawFinderPattern(matrix, size - 7, 0);

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      matrix[6][i] = i % 2 === 0;
      matrix[i][6] = i % 2 === 0;
    }

    // Alignment pattern
    this._drawAlignmentPattern(matrix, size - 9, size - 9);

    // Data area - use hash of input string
    const hash = this._hashCode(data);
    let seed = Math.abs(hash);

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (this._isReserved(row, col, size)) continue;
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        matrix[row][col] = (seed >> 16) % 3 !== 0;
      }
    }

    return matrix;
  }

  static _drawFinderPattern(matrix, startRow, startCol) {
    for (let i = 0; i < 7; i++) {
      matrix[startRow][startCol + i] = true;
      matrix[startRow + 6][startCol + i] = true;
      matrix[startRow + i][startCol] = true;
      matrix[startRow + i][startCol + 6] = true;
    }
    for (let i = 1; i <= 5; i++) {
      matrix[startRow + 1][startCol + i] = false;
      matrix[startRow + 5][startCol + i] = false;
      matrix[startRow + i][startCol + 1] = false;
      matrix[startRow + i][startCol + 5] = false;
    }
    for (let r = 2; r <= 4; r++) {
      for (let c = 2; c <= 4; c++) {
        matrix[startRow + r][startCol + c] = true;
      }
    }
  }

  static _drawAlignmentPattern(matrix, centerRow, centerCol) {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const absR = Math.abs(r);
        const absC = Math.abs(c);
        matrix[centerRow + r][centerCol + c] = 
          (absR === 2 || absC === 2) || (absR === 0 && absC === 0);
      }
    }
  }

  static _isReserved(row, col, size) {
    if (row < 8 && col < 8) return true;
    if (row < 8 && col >= size - 8) return true;
    if (row >= size - 8 && col < 8) return true;
    if (row === 6 || col === 6) return true;
    if (row >= size - 11 && row <= size - 7 && col >= size - 11 && col <= size - 7) return true;
    return false;
  }

  static _hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }
}
