/* Digitaliza — interface do aplicativo */
'use strict';
(() => {
  const native = window.Android || null;
  const $ = (s, r = document) => r.querySelector(s);
  const el = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const frame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

  const ICONS = {
    camera: '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.6l1.2-1.8a1.5 1.5 0 0 1 1.3-.7h4.8a1.5 1.5 0 0 1 1.3.7L16.9 6h1.6A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="12.6" r="3.6"/>',
    upload: '<path d="M12 15V3.8M7.5 8.2 12 3.8l4.5 4.4"/><path d="M4 14.5v3A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-3"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M4 12h16"/>',
    folder: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4.8a.8.8 0 0 1 .8-.8h4.4a.8.8 0 0 1 .8.8V7M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12"/>',
    tune: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    left: '<path d="m14.5 6-6 6 6 6"/>',
    right: '<path d="m9.5 6 6 6-6 6"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    rotate: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    crop: '<path d="M6 2.5V16a2 2 0 0 0 2 2h13.5"/><path d="M18 21.5V8a2 2 0 0 0-2-2H2.5"/>',
    magic: '<path d="m4 20 10-10M14.5 4.5 15.5 2l1 2.5L19 5.5l-2.5 1-1 2.5-1-2.5L12 5.5zM19.5 12l.6-1.4 1.4-.6-1.4-.6-.6-1.4-.6 1.4-1.4.6 1.4.6z"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
    save: '<path d="M12 3.5V15M7.5 10.5 12 15l4.5-4.5"/><path d="M4 17.5v.5a2.5 2.5 0 0 0 2.5 2.5h11A2.5 2.5 0 0 0 20 18v-.5"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    bolt: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    pdf: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    more: '<circle cx="12" cy="5.5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="18.5" r="1.3"/>',
  };
  const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;
  const LOGO = `<svg viewBox="27 25 54 58"><path fill="#F4EFE6" d="M42 34h18l8 8v30a2 2 0 0 1-2 2H42a2 2 0 0 1-2-2V36a2 2 0 0 1 2-2z"/><path fill="#D9B26A" d="M60 34l8 8h-8z"/><path fill="#9AA0AC" d="M45 48h16v2.4H45zM45 54h18v2.4H45zM45 60h12v2.4H45z"/><path fill="none" stroke="#D9B26A" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" d="M31 36v-7h7M70 29h7v7M77 72v7h-7M38 79h-7v-7"/></svg>`;

  const FILTERS = [
    { id: 'original', label: 'Original' },
    { id: 'enhanced', label: 'Aprimorado' },
    { id: 'document', label: 'Documento' },
    { id: 'gray', label: 'Cinza' },
    { id: 'bw', label: 'P&B' },
  ];
  const filterLabel = id => (FILTERS.find(f => f.id === id) || FILTERS[0]).label;

  const PAGE_SIZES = {
    A4: { w: 595.28, h: 841.89, label: 'A4', sub: '210 × 297 mm' },
    LETTER: { w: 612, h: 792, label: 'Carta', sub: '216 × 279 mm' },
    FIT: { w: 0, h: 0, label: 'Original', sub: 'Proporção da imagem' },
  };
  const LEVELS = {
    off: { dpi: 300, q: 0.92, bwDpi: 300 },
    light: { dpi: 250, q: 0.85, bwDpi: 300, label: 'Leve', sub: 'Mais qualidade' },
    balanced: { dpi: 200, q: 0.74, bwDpi: 250, label: 'Equilibrado', sub: 'Recomendado' },
    max: { dpi: 150, q: 0.58, bwDpi: 200, label: 'Máximo', sub: 'Menor arquivo' },
  };

  const state = {
    tab: 'scan',
    pages: [],
    docs: [],
    webDocs: [],
    exportOpts: { size: 'A4', optimize: true, level: 'balanced' },
    lastDoc: null,
  };
  let uid = 0;
  const overlays = []; // pilha de funções para fechar (botão voltar)

  // ================================================================ utilidades de UI
  function toast(msg) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const t = el(`<div class="toast">${esc(msg)}</div>`);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2700);
  }

  const busy = {
    node: null,
    show(title, sub = '', frac = null) {
      if (!this.node) {
        this.node = el(`<div class="busy"><div class="busy-card"><div class="spinner"></div><div class="busy-title"></div><div class="busy-sub"></div><div class="bar"><i></i></div></div></div>`);
        document.body.appendChild(this.node);
      }
      $('.busy-title', this.node).textContent = title;
      $('.busy-sub', this.node).textContent = sub;
      const bar = $('.bar', this.node);
      bar.style.display = frac == null ? 'none' : '';
      if (frac != null) $('.bar i', this.node).style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%';
    },
    hide() { if (this.node) { this.node.remove(); this.node = null; } },
  };

  function fmtSize(b) {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
    return (b / 1024 / 1024).toFixed(b < 10 * 1024 * 1024 ? 1 : 0).replace('.', ',') + ' MB';
  }
  function fmtDate(ms) {
    const d = new Date(ms), now = new Date();
    const hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return 'Hoje, ' + hm;
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Ontem, ' + hm;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + hm;
  }
  function defaultName() {
    const d = new Date(), p = v => String(v).padStart(2, '0');
    return `Digitalizacao ${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}h${p(d.getMinutes())}`;
  }
  function revoke(u) { if (u && u.startsWith('blob:')) URL.revokeObjectURL(u); }

  function openSheet(html, { onClose } = {}) {
    const scrim = el('<div class="scrim"></div>');
    const sheet = el(`<div class="sheet"><div class="grabber"></div>${html}</div>`);
    document.body.append(scrim, sheet);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      scrim.remove(); sheet.remove();
      const i = overlays.indexOf(close);
      if (i >= 0) overlays.splice(i, 1);
      onClose && onClose();
    };
    scrim.addEventListener('click', close);
    overlays.push(close);
    return { sheet, close };
  }

  function confirmSheet(title, text, okLabel, danger = true) {
    return new Promise(resolve => {
      let result = false;
      const { sheet, close } = openSheet(`
        <h3>${esc(title)}</h3><p class="sub">${esc(text)}</p>
        <div class="opts" style="margin-top:8px">
          <button class="btn btn-ghost" data-a="no" style="flex:1">Cancelar</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-a="yes" style="flex:1">${esc(okLabel)}</button>
        </div>`, { onClose: () => resolve(result) });
      sheet.addEventListener('click', e => {
        const b = e.target.closest('[data-a]');
        if (!b) return;
        result = b.dataset.a === 'yes';
        close();
      });
    });
  }

  // ================================================================ renderização principal
  const app = $('#app');

  function render() {
    const n = state.pages.length;
    app.innerHTML = `
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark">${LOGO}</div>
          <div><div class="brand-name">Digitaliza<i>.</i></div><div class="brand-sub">Scanner de documentos</div></div>
        </div>
        <div class="spacer"></div>
        ${state.tab === 'scan' && n ? `<span class="chip-count">${n} ${n === 1 ? 'página' : 'páginas'}</span>` : ''}
      </header>
      <main class="content" id="content"></main>
      ${state.tab === 'scan' && n ? `
        <div class="actionbar">
          <button class="btn btn-ghost" data-act="add" aria-label="Adicionar páginas">${icon('plus')}</button>
          <button class="btn btn-primary" data-act="export">${icon('pdf', 'sm')} Gerar PDF</button>
        </div>` : ''}
      <nav class="tabbar">
        <button class="tab ${state.tab === 'scan' ? 'on' : ''}" data-tab="scan">${icon('scan')}Digitalizar${n && state.tab !== 'scan' ? '<span class="dot"></span>' : ''}</button>
        <button class="tab ${state.tab === 'docs' ? 'on' : ''}" data-tab="docs">${icon('folder')}Documentos</button>
      </nav>`;
    if (state.tab === 'scan') renderScan(); else renderDocs();
  }

  function renderScan() {
    const c = $('#content');
    if (!state.pages.length) {
      c.innerHTML = `
        <section class="hero">
          <svg class="hero-art" viewBox="0 0 120 120" aria-hidden="true">
            <rect x="30" y="18" width="60" height="80" rx="4" fill="#F4EFE6" transform="rotate(-6 60 58)"/>
            <rect x="34" y="22" width="58" height="80" rx="4" fill="#ECE5D8" opacity=".0"/>
            <g transform="rotate(-6 60 58)"><path d="M40 38h36M40 46h40M40 54h30M40 62h38M40 70h22" stroke="#B8BDC7" stroke-width="3" stroke-linecap="round"/><path d="M68 18h22v22" fill="#D9B26A" opacity=".9"/></g>
            <path d="M18 30v-12h12M90 18h12v12M102 90v12H90M30 102H18V90" fill="none" stroke="#D9B26A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h1>Documentos com acabamento de <em>escâner</em>.</h1>
          <p>Fotografe ou importe fotos e PDFs. O Digitaliza recorta as bordas, corrige a perspectiva, limpa o fundo e gera um PDF otimizado.</p>
          <div class="hero-actions">
            <button class="btn btn-primary" data-act="camera">${icon('camera', 'sm')} Câmera</button>
            <button class="btn btn-ghost" data-act="import">${icon('upload', 'sm')} Importar</button>
          </div>
        </section>
        <div class="features">
          <div class="feature">${icon('crop')}<b>Recorte automático</b><span>Detecta as bordas da folha</span></div>
          <div class="feature">${icon('scan')}<b>Perspectiva</b><span>Endireita fotos tortas</span></div>
          <div class="feature">${icon('sparkle')}<b>Filtros de scanner</b><span>Fundo branco, texto nítido</span></div>
          <div class="feature">${icon('bolt')}<b>PDF otimizado</b><span>Arquivos leves e legíveis</span></div>
        </div>`;
      return;
    }
    c.innerHTML = `
      <div class="section-head">
        <div><h2>Seu documento</h2><p>Toque em uma página para recortar e ajustar</p></div>
        <button class="link-btn" data-act="clear">${icon('trash', 'sm')} Limpar</button>
      </div>
      <div class="grid">
        ${state.pages.map((p, i) => `
          <div class="page-card" data-id="${p.id}">
            <button class="page-thumb" data-act="edit" aria-label="Editar página ${i + 1}">
              <img src="${p.thumbUrl}" alt="">
              <span class="page-num">${i + 1}</span>
              <span class="page-filter">${filterLabel(p.filter)}</span>
            </button>
            <div class="page-tools">
              <button class="icon-btn" data-act="left" ${i === 0 ? 'disabled' : ''} aria-label="Mover para trás">${icon('left', 'sm')}</button>
              <button class="icon-btn" data-act="edit" aria-label="Ajustar">${icon('tune', 'sm')}</button>
              <button class="icon-btn" data-act="right" ${i === state.pages.length - 1 ? 'disabled' : ''} aria-label="Mover para frente">${icon('right', 'sm')}</button>
              <button class="icon-btn danger" data-act="del" aria-label="Excluir">${icon('trash', 'sm')}</button>
            </div>
          </div>`).join('')}
        <button class="add-card" data-act="add"><span class="ring">${icon('plus')}</span>Adicionar página</button>
      </div>`;
  }

  function refreshDocs() {
    if (native) {
      try { state.docs = JSON.parse(native.listDocs()); } catch (e) { state.docs = []; }
    } else {
      state.docs = state.webDocs.slice();
    }
  }

  function renderDocs() {
    refreshDocs();
    const c = $('#content');
    if (!state.docs.length) {
      c.innerHTML = `
        <div class="empty">
          <div class="badge">${icon('folder', 'lg')}</div>
          <h3>Nenhum PDF ainda</h3>
          <p>Os documentos que você gerar ficam guardados aqui para abrir, compartilhar ou salvar no aparelho.</p>
          <button class="btn btn-primary" data-act="goscan" style="margin-top:22px">${icon('scan', 'sm')} Digitalizar agora</button>
        </div>`;
      return;
    }
    c.innerHTML = `
      <div class="section-head"><div><h2>Documentos</h2><p>${state.docs.length} ${state.docs.length === 1 ? 'arquivo' : 'arquivos'} gerados</p></div></div>
      <div class="doc-list">
        ${state.docs.map((d, i) => `
          <div class="doc" data-i="${i}">
            <div class="doc-ico"><span>PDF</span></div>
            <button class="doc-meta" data-act="docopen" style="text-align:left">
              <div class="doc-name">${esc(d.name.replace(/\.pdf$/i, ''))}</div>
              <div class="doc-sub">${fmtSize(d.size)} · ${fmtDate(d.mtime)}</div>
            </button>
            <div class="doc-actions">
              <button class="icon-btn" data-act="docshare" aria-label="Compartilhar">${icon('share', 'sm')}</button>
              <button class="icon-btn" data-act="docmore" aria-label="Mais opções">${icon('more', 'sm')}</button>
            </div>
          </div>`).join('')}
      </div>`;
  }

  // ================================================================ eventos principais
  app.addEventListener('click', async e => {
    const tab = e.target.closest('[data-tab]');
    if (tab) { state.tab = tab.dataset.tab; render(); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    const card = b.closest('[data-id]');
    const page = card ? state.pages.find(p => p.id === +card.dataset.id) : null;
    const docRow = b.closest('[data-i]');
    const doc = docRow ? state.docs[+docRow.dataset.i] : null;
    switch (act) {
      case 'camera': startCamera(); break;
      case 'import': startImport(); break;
      case 'add': addSheet(); break;
      case 'export': exportSheet(); break;
      case 'goscan': state.tab = 'scan'; render(); break;
      case 'clear':
        if (await confirmSheet('Limpar páginas?', 'Todas as páginas desta digitalização serão removidas. Os PDFs já gerados não serão afetados.', 'Limpar')) clearPages();
        break;
      case 'edit': if (page) openEditor(page); break;
      case 'left': case 'right': {
        const i = state.pages.indexOf(page), j = act === 'left' ? i - 1 : i + 1;
        if (j >= 0 && j < state.pages.length) {
          [state.pages[i], state.pages[j]] = [state.pages[j], state.pages[i]];
          renderScan();
        }
        break;
      }
      case 'del':
        if (page && await confirmSheet('Excluir página?', `A página ${state.pages.indexOf(page) + 1} será removida do documento.`, 'Excluir')) {
          removePage(page); render();
        }
        break;
      case 'docopen': if (doc) docAction('open', doc); break;
      case 'docshare': if (doc) docAction('share', doc); break;
      case 'docmore': if (doc) docMenu(doc); break;
    }
  });

  function removePage(p) {
    state.pages = state.pages.filter(x => x !== p);
    [p.resultUrl, p.thumbUrl, p.src].forEach(revoke);
    if (native && p.file) native.deleteWork(p.file);
  }
  function clearPages() {
    state.pages.slice().forEach(removePage);
    render();
  }

  function addSheet() {
    const { sheet, close } = openSheet(`
      <h3>Adicionar páginas</h3><p class="sub">Fotografe um documento ou importe imagens e PDFs.</p>
      <div class="sheet-list">
        <button class="sheet-item" data-a="camera"><span class="ring">${icon('camera')}</span><div><b>Câmera</b><span>Fotografar um documento agora</span></div></button>
        <button class="sheet-item" data-a="import"><span class="ring">${icon('upload')}</span><div><b>Importar arquivos</b><span>Fotos da galeria ou documentos PDF</span></div></button>
      </div>`);
    sheet.addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (!b) return;
      close();
      b.dataset.a === 'camera' ? startCamera() : startImport();
    });
  }

  // ================================================================ importação
  function startCamera() {
    if (native) { native.openCamera(); return; }
    const inp = $('#webFile');
    inp.setAttribute('capture', 'environment');
    inp.click();
  }
  function startImport() {
    if (native) { native.pickFiles(); return; }
    const inp = $('#webFile');
    inp.removeAttribute('capture');
    inp.click();
  }
  // modo navegador (para testes): lê imagens diretamente
  $('#webFile').addEventListener('change', async e => {
    const files = [...e.target.files];
    e.target.value = '';
    const items = [], errors = [];
    for (const f of files) {
      if (f.type === 'application/pdf') { errors.push(`${f.name}: importação de PDF disponível no app Android`); continue; }
      const url = URL.createObjectURL(f);
      try {
        const im = await IP.loadImage(url);
        items.push({ url, w: im.naturalWidth, h: im.naturalHeight, origin: 'image', name: f.name, page: 0 });
      } catch (err) { errors.push(`${f.name}: formato não suportado`); }
    }
    App.onPagesAdded(items, errors);
  });

  async function processNewPages(items) {
    const total = items.length;
    let added = 0;
    for (let i = 0; i < total; i++) {
      const it = items[i];
      busy.show('Ajustando páginas', `Página ${i + 1} de ${total}`, i / total);
      await frame();
      try {
        const img = await IP.loadImage(it.url);
        const w = img.naturalWidth, h = img.naturalHeight;
        let quad = null, auto = false;
        if (it.origin !== 'pdf') {
          try { quad = IP.detectQuad(img); auto = !!quad; } catch (err) { quad = null; }
        }
        const p = {
          id: ++uid, src: it.url, file: it.file || null, w, h, origin: it.origin, name: it.name,
          quad: quad || IP.fullQuad(w, h), auto,
          filter: 'document', adj: { brightness: 0, contrast: 0 },
          resultUrl: null, thumbUrl: null, resultW: 0, resultH: 0,
        };
        await renderPage(p, img);
        state.pages.push(p);
        added++;
      } catch (err) {
        console.error(err);
      }
    }
    busy.hide();
    state.tab = 'scan';
    render();
    return added;
  }

  async function renderPage(p, img) {
    img = img || await IP.loadImage(p.src);
    const src = IP.imageData(img);
    const warped = IP.warp(src, p.quad, 3000);
    const out = IP.applyFilter(warped, p.filter, p.adj);
    const c = IP.dataToCanvas(out);
    const blob = await IP.toBlob(c, 'image/jpeg', 0.93);
    const thumb = await IP.toBlob(IP.scaleCanvas(c, 440), 'image/jpeg', 0.85);
    revoke(p.resultUrl); revoke(p.thumbUrl);
    p.resultUrl = URL.createObjectURL(blob);
    p.thumbUrl = URL.createObjectURL(thumb);
    p.resultW = c.width; p.resultH = c.height;
    c.width = c.height = 0;
  }

  // ================================================================ editor
  let ed = null;

  async function openEditor(page) {
    busy.show('Abrindo página');
    let img;
    try { img = await IP.loadImage(page.src); } catch (e) { busy.hide(); toast('Não foi possível abrir a página'); return; }
    busy.hide();
    const idx = state.pages.indexOf(page);
    ed = {
      page, img, src: page.src, w: img.naturalWidth, h: img.naturalHeight,
      quad: page.quad.map(p => p.slice()), filter: page.filter, adj: { ...page.adj },
      tab: 'crop', rotated: false, applyAll: false, preview: null, thumbs: {},
    };
    const node = el(`
      <div class="editor">
        <div class="ed-top">
          <button class="icon-btn" data-e="cancel" aria-label="Cancelar">${icon('close')}</button>
          <div class="ed-title">Página <b>${idx + 1}</b> de ${state.pages.length}</div>
          <button class="ed-done" data-e="done">${icon('check', 'sm')} Concluir</button>
        </div>
        <div class="ed-stage" id="stage"></div>
        <div class="ed-bottom">
          <div class="seg">
            <button data-e="tab-crop" class="on">${icon('crop', 'sm')} Recortar</button>
            <button data-e="tab-adjust">${icon('sparkle', 'sm')} Filtros</button>
          </div>
          <div id="edPanel"></div>
        </div>
      </div>`);
    document.body.appendChild(node);
    ed.node = node;
    const closeFn = () => closeEditor(false);
    ed.closeFn = closeFn;
    overlays.push(closeFn);
    node.addEventListener('click', onEditorClick);
    window.addEventListener('resize', layoutEditor);
    showEditorTab('crop');
  }

  function closeEditor(commit) {
    if (!ed) return;
    const i = overlays.indexOf(ed.closeFn);
    if (i >= 0) overlays.splice(i, 1);
    window.removeEventListener('resize', layoutEditor);
    if (!commit && ed.rotated) revoke(ed.src);
    ed.node.remove();
    ed = null;
  }

  async function onEditorClick(e) {
    const b = e.target.closest('[data-e]');
    if (!b || !ed) return;
    const a = b.dataset.e;
    if (a === 'cancel') closeEditor(false);
    else if (a === 'done') commitEditor();
    else if (a === 'tab-crop') showEditorTab('crop');
    else if (a === 'tab-adjust') showEditorTab('adjust');
    else if (a === 'auto') {
      const q = IP.detectQuad(ed.img);
      if (q) { ed.quad = q; drawQuad(); toast('Bordas detectadas'); }
      else toast('Não foi possível detectar as bordas — ajuste manualmente');
    } else if (a === 'full') { ed.quad = IP.fullQuad(ed.w, ed.h); drawQuad(); }
    else if (a === 'rotate') rotateEditor();
    else if (a.startsWith('f-')) { ed.filter = a.slice(2); updateFilterUI(); drawPreview(); }
    else if (a === 'all') { ed.applyAll = !ed.applyAll; b.classList.toggle('on', ed.applyAll); }
    else if (a === 'reset') { ed.adj = { brightness: 0, contrast: 0 }; showEditorTab('adjust'); }
  }

  function showEditorTab(tab) {
    ed.tab = tab;
    ed.node.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.e === 'tab-' + tab));
    const panel = $('#edPanel', ed.node), stage = $('#stage', ed.node);
    if (tab === 'crop') {
      panel.innerHTML = `
        <div class="tool-row">
          <button class="tool" data-e="auto">${icon('magic')}Detectar bordas</button>
          <button class="tool" data-e="full">${icon('expand')}Página inteira</button>
          <button class="tool" data-e="rotate">${icon('rotate')}Girar</button>
        </div>`;
      stage.innerHTML = `
        <img class="src" src="${ed.src}" alt="">
        <svg class="overlay"><path class="shade" fill="rgba(4,5,7,.62)" fill-rule="evenodd"/><polygon class="edge" fill="none" stroke="#D9B26A" stroke-width="2" stroke-linejoin="round"/></svg>
        ${[0, 1, 2, 3].map(i => `<div class="handle" data-h="${i}"></div>`).join('')}
        <div class="loupe"><canvas width="232" height="232"></canvas></div>
        <div class="ed-hint">Arraste os cantos até as bordas do documento</div>`;
      bindHandles();
      layoutEditor();
    } else {
      stage.innerHTML = `<div class="preview-wrap"><canvas id="pv"></canvas></div>`;
      panel.innerHTML = `
        <div class="filters">
          ${FILTERS.map(f => `<button class="filter ${ed.filter === f.id ? 'on' : ''}" data-e="f-${f.id}"><span class="fthumb" data-ft="${f.id}"></span>${f.label}</button>`).join('')}
        </div>
        <div class="sliders">
          <label class="slider">Brilho<input type="range" min="-50" max="50" step="1" value="${ed.adj.brightness}" data-s="brightness"><output>${ed.adj.brightness}</output></label>
          <label class="slider">Contraste<input type="range" min="-50" max="50" step="1" value="${ed.adj.contrast}" data-s="contrast"><output>${ed.adj.contrast}</output></label>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <button class="check ${ed.applyAll ? 'on' : ''}" data-e="all"><span class="box">${icon('check', 'sm')}</span>Aplicar a todas as páginas</button>
          <button class="link-btn" data-e="reset">Redefinir</button>
        </div>`;
      panel.querySelectorAll('input[type=range]').forEach(r => {
        r.addEventListener('input', () => {
          ed.adj[r.dataset.s] = +r.value;
          r.nextElementSibling.textContent = r.value;
          schedulePreview();
        });
      });
      buildPreview();
    }
  }

  // ---------- recorte
  function layoutEditor() {
    if (!ed || ed.tab !== 'crop') return;
    const stage = $('#stage', ed.node);
    const sw = stage.clientWidth, sh = stage.clientHeight, pad = 26;
    const s = Math.min((sw - pad * 2) / ed.w, (sh - pad * 2) / ed.h);
    const dw = ed.w * s, dh = ed.h * s;
    ed.view = { x: (sw - dw) / 2, y: (sh - dh) / 2, s };
    const img = $('.src', stage), svg = $('svg.overlay', stage);
    Object.assign(img.style, { left: ed.view.x + 'px', top: ed.view.y + 'px', width: dw + 'px', height: dh + 'px' });
    Object.assign(svg.style, { left: ed.view.x + 'px', top: ed.view.y + 'px', width: dw + 'px', height: dh + 'px' });
    svg.setAttribute('viewBox', `0 0 ${ed.w} ${ed.h}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    $('.edge', svg).setAttribute('stroke-width', 2 / s);
    drawQuad();
  }

  function drawQuad() {
    if (!ed || ed.tab !== 'crop' || !ed.view) return;
    const stage = $('#stage', ed.node), q = ed.quad, v = ed.view;
    const pts = q.map(p => p.join(',')).join(' ');
    $('.edge', stage).setAttribute('points', pts);
    $('.shade', stage).setAttribute('d', `M0 0H${ed.w}V${ed.h}H0Z M${q.map(p => p.join(' ')).join(' L')} Z`);
    stage.querySelectorAll('.handle').forEach(hn => {
      const p = q[+hn.dataset.h];
      hn.style.left = v.x + p[0] * v.s + 'px';
      hn.style.top = v.y + p[1] * v.s + 'px';
    });
  }

  function bindHandles() {
    const stage = $('#stage', ed.node);
    const loupe = $('.loupe', stage), lc = $('canvas', loupe), lx = lc.getContext('2d');
    stage.querySelectorAll('.handle').forEach(hn => {
      hn.addEventListener('pointerdown', ev => {
        ev.preventDefault();
        const i = +hn.dataset.h;
        hn.setPointerCapture(ev.pointerId);
        hn.classList.add('active');
        const hint = $('.ed-hint', stage);
        if (hint) hint.remove();
        const rect = stage.getBoundingClientRect();
        const v = ed.view;
        const start = ed.quad[i].slice();
        const ox = ev.clientX, oy = ev.clientY;
        const move = e2 => {
          const nx = Math.max(0, Math.min(ed.w, start[0] + (e2.clientX - ox) / v.s));
          const ny = Math.max(0, Math.min(ed.h, start[1] + (e2.clientY - oy) / v.s));
          ed.quad[i] = [nx, ny];
          drawQuad();
          // lupa
          const px = v.x + nx * v.s;
          loupe.style.display = 'block';
          loupe.style.left = (px < rect.width / 2 ? rect.width - 132 : 16) + 'px';
          loupe.style.top = '16px';
          const zoom = 2.6, size = lc.width, srcSize = loupe.clientWidth / (v.s * zoom);
          lx.fillStyle = '#000'; lx.fillRect(0, 0, size, size);
          lx.drawImage(ed.img, nx - srcSize / 2, ny - srcSize / 2, srcSize, srcSize, 0, 0, size, size);
          // linhas da borda dentro da lupa
          lx.save();
          lx.translate(size / 2, size / 2);
          lx.scale(size / srcSize, size / srcSize);
          lx.translate(-nx, -ny);
          lx.strokeStyle = '#D9B26A'; lx.lineWidth = 2 * srcSize / size;
          lx.beginPath();
          ed.quad.forEach((p, k) => (k ? lx.lineTo(p[0], p[1]) : lx.moveTo(p[0], p[1])));
          lx.closePath(); lx.stroke();
          lx.restore();
        };
        const up = () => {
          hn.classList.remove('active');
          loupe.style.display = 'none';
          hn.removeEventListener('pointermove', move);
          hn.removeEventListener('pointerup', up);
          hn.removeEventListener('pointercancel', up);
          ed.preview = null;
        };
        hn.addEventListener('pointermove', move);
        hn.addEventListener('pointerup', up);
        hn.addEventListener('pointercancel', up);
      });
    });
  }

  async function rotateEditor() {
    busy.show('Girando');
    await frame();
    const c = IP.rotateImage(ed.img, true);
    const blob = await IP.toBlob(c, 'image/jpeg', 0.95);
    const url = URL.createObjectURL(blob);
    const img = await IP.loadImage(url);
    const oldH = ed.h;
    if (ed.rotated) revoke(ed.src);
    ed.quad = IP.orderQuad(ed.quad.map(([x, y]) => [oldH - y, x]));
    ed.img = img; ed.src = url; ed.w = img.naturalWidth; ed.h = img.naturalHeight; ed.rotated = true; ed.preview = null;
    busy.hide();
    showEditorTab(ed.tab);
  }

  // ---------- filtros / pré-visualização
  async function buildPreview() {
    const key = JSON.stringify(ed.quad) + ed.src;
    if (!ed.preview || ed.preview.key !== key) {
      const s = Math.min(1, 1500 / Math.max(ed.w, ed.h));
      const small = IP.imageData(ed.img, s);
      const quad = ed.quad.map(([x, y]) => [x * s, y * s]);
      const warped = IP.warp(small, quad, 1100);
      ed.preview = { key, data: warped };
      ed.thumbs = {};
      const tiny = IP.resizeData(warped, 150);
      for (const f of FILTERS) {
        const out = IP.applyFilter(tiny, f.id, null);
        ed.thumbs[f.id] = IP.dataToCanvas(out).toDataURL('image/jpeg', 0.8);
      }
    }
    if (!ed) return;
    ed.node.querySelectorAll('[data-ft]').forEach(t => { t.style.backgroundImage = `url(${ed.thumbs[t.dataset.ft]})`; });
    drawPreview();
  }
  let pvTimer = null;
  function schedulePreview() {
    clearTimeout(pvTimer);
    pvTimer = setTimeout(drawPreview, 60);
  }
  function drawPreview() {
    if (!ed || !ed.preview) return;
    const cv = $('#pv', ed.node);
    if (!cv) return;
    const out = IP.applyFilter(ed.preview.data, ed.filter, ed.adj);
    cv.width = out.width; cv.height = out.height;
    cv.getContext('2d').putImageData(out, 0, 0);
  }
  function updateFilterUI() {
    ed.node.querySelectorAll('.filter').forEach(f => f.classList.toggle('on', f.dataset.e === 'f-' + ed.filter));
  }

  async function commitEditor() {
    const e = ed;
    if (!IP.isConvex(e.quad)) e.quad = IP.orderQuad(e.quad);
    if (!IP.isConvex(e.quad) || IP.polyArea(e.quad) < 400) {
      toast('Recorte inválido — ajuste os cantos');
      return;
    }
    const p = e.page;
    if (e.rotated) {
      if (p.src !== e.src) revoke(p.src);
      p.src = e.src; p.w = e.w; p.h = e.h;
    }
    p.quad = e.quad.map(q => q.slice());
    p.filter = e.filter;
    p.adj = { ...e.adj };
    const targets = e.applyAll ? state.pages : [p];
    if (e.applyAll) state.pages.forEach(o => { o.filter = e.filter; o.adj = { ...e.adj }; });
    closeEditor(true);
    for (let i = 0; i < targets.length; i++) {
      busy.show('Aplicando ajustes', targets.length > 1 ? `Página ${i + 1} de ${targets.length}` : 'Corrigindo perspectiva e filtro', targets.length > 1 ? i / targets.length : null);
      await frame();
      try {
        await renderPage(targets[i], targets[i] === p && e.img ? e.img : null);
      } catch (err) { console.error(err); }
    }
    busy.hide();
    renderScan();
  }

  // ================================================================ exportação PDF
  function exportSheet() {
    const o = state.exportOpts;
    const { sheet, close } = openSheet(`
      <h3>Gerar PDF</h3>
      <p class="sub">${state.pages.length} ${state.pages.length === 1 ? 'página digitalizada' : 'páginas digitalizadas'}, prontas para virar um único documento.</p>
      <div class="field-label">Nome do arquivo</div>
      <input class="input" id="pdfName" value="${esc(defaultName())}" maxlength="80" autocomplete="off">
      <div class="field-label">Tamanho da página</div>
      <div class="opts" data-g="size">
        ${Object.entries(PAGE_SIZES).map(([k, v]) => `<button class="opt ${o.size === k ? 'on' : ''}" data-v="${k}">${v.label}<small>${v.sub}</small></button>`).join('')}
      </div>
      <div class="switch-row">
        ${icon('bolt')}
        <div class="txt"><b>Otimizar PDF</b><span>Reduz o tamanho mantendo o texto legível</span></div>
        <button class="switch ${o.optimize ? 'on' : ''}" id="optSwitch" aria-label="Otimizar PDF"></button>
      </div>
      <div id="levelBox" style="${o.optimize ? '' : 'display:none'}">
        <div class="field-label">Nível de otimização</div>
        <div class="opts" data-g="level">
          ${['light', 'balanced', 'max'].map(k => `<button class="opt ${o.level === k ? 'on' : ''}" data-v="${k}">${LEVELS[k].label}<small>${LEVELS[k].sub}</small></button>`).join('')}
        </div>
      </div>
      <button class="btn btn-primary block" id="doExport">${icon('pdf', 'sm')} Gerar PDF</button>`);
    sheet.addEventListener('click', ev => {
      const opt = ev.target.closest('.opt');
      if (opt) {
        const g = opt.parentElement.dataset.g;
        o[g] = opt.dataset.v;
        opt.parentElement.querySelectorAll('.opt').forEach(x => x.classList.toggle('on', x === opt));
        return;
      }
      if (ev.target.closest('#optSwitch')) {
        o.optimize = !o.optimize;
        $('#optSwitch', sheet).classList.toggle('on', o.optimize);
        $('#levelBox', sheet).style.display = o.optimize ? '' : 'none';
        return;
      }
      if (ev.target.closest('#doExport')) {
        const name = $('#pdfName', sheet).value.trim() || defaultName();
        close();
        generatePdf(name);
      }
    });
  }

  function deflate(u8) {
    const cs = new CompressionStream('deflate');
    const stream = new Blob([u8]).stream().pipeThrough(cs);
    return new Response(stream).arrayBuffer().then(b => new Uint8Array(b));
  }
  const canDeflate = typeof CompressionStream !== 'undefined';

  async function generatePdf(name) {
    const o = state.exportOpts;
    const lv = o.optimize ? LEVELS[o.level] : LEVELS.off;
    const pdf = new PDFWriter({ title: name });
    const n = state.pages.length;
    let rawBytes = 0;
    try {
      for (let i = 0; i < n; i++) {
        const p = state.pages[i];
        busy.show('Gerando PDF', `Página ${i + 1} de ${n}`, i / n);
        await frame();
        const img = await IP.loadImage(p.resultUrl);
        const iw = img.naturalWidth, ih = img.naturalHeight;
        rawBytes += iw * ih * 3;
        // página e caixa da imagem (pt)
        let pw, ph;
        if (o.size === 'FIT') {
          pw = 595.28; ph = pw * ih / iw;
        } else {
          const ps = PAGE_SIZES[o.size];
          const landscape = iw > ih;
          pw = landscape ? ps.h : ps.w; ph = landscape ? ps.w : ps.h;
        }
        const s = Math.min(pw / iw, ph / ih);
        const bw = iw * s, bh = ih * s;
        const box = { x: (pw - bw) / 2, y: (ph - bh) / 2, w: bw, h: bh };
        const isBW = p.filter === 'bw' && canDeflate;
        const dpi = isBW ? lv.bwDpi : lv.dpi;
        const tw = Math.max(1, Math.min(iw, Math.round(bw / 72 * dpi)));
        const th = Math.max(1, Math.round(tw * ih / iw));
        const c = IP.canvas(tw, th), x = c.getContext('2d', { willReadFrequently: true });
        x.fillStyle = '#fff'; x.fillRect(0, 0, tw, th);
        x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
        x.drawImage(img, 0, 0, tw, th);
        let entry;
        if (isBW) {
          entry = { kind: 'bw', w: tw, h: th, data: await deflate(IP.packBits(c)) };
        } else {
          const blob = await IP.toBlob(c, 'image/jpeg', lv.q);
          entry = { kind: 'jpeg', w: tw, h: th, data: new Uint8Array(await blob.arrayBuffer()) };
        }
        c.width = c.height = 0;
        pdf.addPage(pw, ph, entry, box);
      }
      busy.show('Salvando PDF', 'Finalizando o documento', 1);
      await frame();
      const bytes = pdf.finish();
      const info = await saveBytes(name, bytes);
      busy.hide();
      info.pages = n;
      info.raw = rawBytes;
      state.lastDoc = info;
      successSheet(info);
    } catch (err) {
      console.error(err);
      busy.hide();
      toast('Não foi possível gerar o PDF');
    }
  }

  async function saveBytes(name, bytes) {
    if (native) {
      const finalName = native.beginDoc(name);
      if (!finalName) throw new Error('Falha ao criar arquivo');
      const CH = 3 * 1024 * 256; // múltiplo de 3 => base64 sem preenchimento intermediário
      for (let off = 0; off < bytes.length; off += CH) {
        const part = bytes.subarray(off, Math.min(bytes.length, off + CH));
        let bin = '';
        for (let i = 0; i < part.length; i += 0x8000) bin += String.fromCharCode.apply(null, part.subarray(i, i + 0x8000));
        if (!native.appendDoc(btoa(bin))) throw new Error('Falha ao gravar');
        await frame();
      }
      const info = JSON.parse(native.finishDoc() || 'null');
      if (!info) throw new Error('Falha ao concluir');
      return info;
    }
    const finalName = (name.replace(/[\\/:*?"<>|]/g, '_') || 'Documento') + '.pdf';
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const info = { name: finalName, size: bytes.length, mtime: Date.now(), url };
    state.webDocs.unshift(info);
    window.__lastPdf = bytes; // usado em testes
    return info;
  }

  function successSheet(info) {
    const saved = info.raw ? Math.max(0, 1 - info.size / info.raw) : 0;
    const { sheet, close } = openSheet(`
      <div class="success">
        <div class="seal">${icon('check')}</div>
        <h3>PDF pronto</h3>
        <div class="fname">${esc(info.name)}</div>
        <div class="stats">
          <span class="stat"><b>${info.pages}</b> ${info.pages === 1 ? 'página' : 'páginas'}</span>
          <span class="stat"><b>${fmtSize(info.size)}</b></span>
          ${saved > 0.05 ? `<span class="stat good"><b>−${Math.round(saved * 100)}%</b> vs. sem compressão</span>` : ''}
        </div>
        <div class="action-grid">
          <button data-a="open">${icon('eye')}Abrir</button>
          <button data-a="share">${icon('share')}Compartilhar</button>
          <button data-a="save">${icon('save')}Salvar em…</button>
        </div>
        <div class="opts" style="margin-top:14px">
          <button class="btn btn-ghost" data-a="keep" style="flex:1">Continuar editando</button>
          <button class="btn btn-primary" data-a="new" style="flex:1">Nova digitalização</button>
        </div>
      </div>`);
    sheet.addEventListener('click', ev => {
      const b = ev.target.closest('[data-a]');
      if (!b) return;
      const a = b.dataset.a;
      if (a === 'open' || a === 'share' || a === 'save') { docAction(a, info); return; }
      close();
      if (a === 'new') clearPages();
    });
  }

  function docAction(a, doc) {
    if (native) {
      if (a === 'open') native.openDoc(doc.name);
      else if (a === 'share') native.shareDoc(doc.name);
      else if (a === 'save') native.exportDoc(doc.name);
      return;
    }
    const link = document.createElement('a');
    link.href = doc.url;
    if (a !== 'open') link.download = doc.name; else link.target = '_blank';
    link.click();
  }

  function docMenu(doc) {
    const { sheet, close } = openSheet(`
      <h3 style="word-break:break-all">${esc(doc.name.replace(/\.pdf$/i, ''))}</h3>
      <p class="sub">${fmtSize(doc.size)} · ${fmtDate(doc.mtime)}</p>
      <div class="sheet-list">
        <button class="sheet-item" data-a="open"><span class="ring">${icon('eye')}</span><div><b>Abrir</b><span>Visualizar no leitor de PDF</span></div></button>
        <button class="sheet-item" data-a="share"><span class="ring">${icon('share')}</span><div><b>Compartilhar</b><span>WhatsApp, e-mail, Drive…</span></div></button>
        <button class="sheet-item" data-a="save"><span class="ring">${icon('save')}</span><div><b>Salvar em…</b><span>Escolher uma pasta do aparelho</span></div></button>
        <button class="sheet-item danger" data-a="del"><span class="ring">${icon('trash')}</span><div><b>Excluir</b><span>Remover do aplicativo</span></div></button>
      </div>`);
    sheet.addEventListener('click', async ev => {
      const b = ev.target.closest('[data-a]');
      if (!b) return;
      const a = b.dataset.a;
      close();
      if (a === 'del') {
        if (await confirmSheet('Excluir PDF?', `“${doc.name}” será removido do aplicativo.`, 'Excluir')) {
          if (native) native.deleteDoc(doc.name);
          else state.webDocs = state.webDocs.filter(d => d !== doc);
          renderDocs();
          toast('PDF excluído');
        }
      } else docAction(a, doc);
    });
  }

  // ================================================================ API chamada pelo Android
  window.App = {
    onImportStart(total) { busy.show('Importando', total > 1 ? `${total} arquivos` : 'Preparando arquivo', 0); },
    onImportProgress(label, done, total) { busy.show('Importando', label, total ? done / total : null); },
    onImportCancel() { busy.hide(); },
    onImportError(msg) { busy.hide(); toast(msg); },
    async onPagesAdded(items, errors) {
      if (typeof items === 'string') items = JSON.parse(items);
      if (typeof errors === 'string') errors = JSON.parse(errors);
      busy.hide();
      const added = items.length ? await processNewPages(items) : 0;
      if (errors && errors.length) toast(errors[0]);
      else if (added) toast(added === 1 ? 'Página adicionada' : `${added} páginas adicionadas`);
    },
    onBack() {
      if (busy.node) return true;
      if (overlays.length) { overlays[overlays.length - 1](); return true; }
      if (state.tab !== 'scan') { state.tab = 'scan'; render(); return true; }
      return false;
    },
    _state: state,
  };

  render();
  if (native && native.ready) native.ready();
})();
