/* Digitaliza — gerador de PDF leve (imagens JPEG e 1-bit comprimidas) */
'use strict';
class PDFWriter {
  constructor(meta = {}) {
    this.meta = meta;
    this.enc = new TextEncoder();
    this.chunks = [];
    this.len = 0;
    this.offsets = [];
    this.pages = [];
    this.nextId = 3; // 1 = Catalog, 2 = Pages
    this._str('%PDF-1.5\n');
    this._bytes(new Uint8Array([37, 226, 227, 207, 211, 10]));
  }
  _str(s) { this._bytes(this.enc.encode(s)); }
  _bytes(b) { this.chunks.push(b); this.len += b.length; }
  _obj(id) { this.offsets[id] = this.len; this._str(`${id} 0 obj\n`); }
  static n(v) { return (Math.round(v * 100) / 100).toString(); }
  static textString(s) {
    let hex = 'FEFF';
    for (const ch of String(s)) {
      const cp = ch.codePointAt(0);
      if (cp > 0xffff) {
        const v = cp - 0x10000;
        hex += (0xd800 + (v >> 10)).toString(16).padStart(4, '0') + (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, '0');
      } else hex += cp.toString(16).padStart(4, '0');
    }
    return `<${hex.toUpperCase()}>`;
  }

  /**
   * @param {number} pw largura da página (pt)  @param {number} ph altura (pt)
   * @param {{kind:'jpeg'|'bw', w:number, h:number, data:Uint8Array}} img
   * @param {{x:number,y:number,w:number,h:number}} box posição da imagem (pt, origem inferior-esquerda)
   */
  addPage(pw, ph, img, box) {
    const N = PDFWriter.n;
    const imgId = this.nextId++, contId = this.nextId++, pageId = this.nextId++;
    this._obj(imgId);
    let dict = `<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} `;
    dict += img.kind === 'jpeg'
      ? '/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode'
      : '/ColorSpace /DeviceGray /BitsPerComponent 1 /Filter /FlateDecode';
    dict += ` /Length ${img.data.length} >>\nstream\n`;
    this._str(dict);
    this._bytes(img.data);
    this._str('\nendstream\nendobj\n');

    const content = `q ${N(box.w)} 0 0 ${N(box.h)} ${N(box.x)} ${N(box.y)} cm /Im0 Do Q\n`;
    this._obj(contId);
    this._str(`<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);

    this._obj(pageId);
    this._str(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${N(pw)} ${N(ph)}] ` +
      `/Resources << /XObject << /Im0 ${imgId} 0 R >> /ProcSet [/PDF /ImageB /ImageC] >> ` +
      `/Contents ${contId} 0 R >>\nendobj\n`);
    this.pages.push(pageId);
  }

  finish() {
    this._obj(1);
    this._str('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    this._obj(2);
    this._str(`<< /Type /Pages /Kids [${this.pages.map(p => p + ' 0 R').join(' ')}] /Count ${this.pages.length} >>\nendobj\n`);
    const infoId = this.nextId++;
    const dt = new Date(), p2 = v => String(v).padStart(2, '0');
    const date = `D:${dt.getFullYear()}${p2(dt.getMonth() + 1)}${p2(dt.getDate())}${p2(dt.getHours())}${p2(dt.getMinutes())}${p2(dt.getSeconds())}`;
    this._obj(infoId);
    this._str(`<< /Title ${PDFWriter.textString(this.meta.title || 'Documento')} /Producer (Digitaliza) ` +
      `/Creator (Digitaliza - Scanner de Documentos) /CreationDate (${date}) /ModDate (${date}) >>\nendobj\n`);
    const xref = this.len, size = this.nextId;
    let x = `xref\n0 ${size}\n0000000000 65535 f \n`;
    for (let id = 1; id < size; id++) x += String(this.offsets[id]).padStart(10, '0') + ' 00000 n \n';
    x += `trailer\n<< /Size ${size} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    this._str(x);
    const out = new Uint8Array(this.len);
    let o = 0;
    for (const c of this.chunks) { out.set(c, o); o += c.length; }
    this.chunks = [];
    return out;
  }
}
