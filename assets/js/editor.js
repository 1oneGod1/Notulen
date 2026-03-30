const DEFAULT_DOCUMENT = {
    meta: {
        judul: '',
        subjudul: '',
        tgl: '',
        waktuMulai: '',
        waktuSelesai: '',
        notulis: '',
        lokasi: '',
        createdAt: '',
        updatedAt: ''
    },
    peserta: ['Pak Andi'],
    agenda: ['Follow up hasil kegiatan'],
    blocks: [
        { type: 'text', title: 'RINGKASAN RAPAT', content: '' }
    ]
};

const ALLOWED_HTML_TAGS = new Set([
    'div', 'p', 'span', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'br', 'hr',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'img', 'iframe', 'h1', 'h2', 'h3', 'h4'
]);

const ALLOWED_ATTRS = new Set([
    'href', 'src', 'alt', 'title', 'width', 'height', 'target', 'rel', 'class',
    'frameborder', 'allow', 'allowfullscreen', 'loading', 'referrerpolicy'
]);

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function createEmptyDocument() {
    return JSON.parse(JSON.stringify(DEFAULT_DOCUMENT));
}

export function normalizeDocumentData(document) {
    const fallback = createEmptyDocument();
    const source = document || fallback;
    return {
        meta: { ...fallback.meta, ...(source.meta || {}) },
        peserta: Array.isArray(source.peserta) && source.peserta.length ? source.peserta : fallback.peserta,
        agenda: Array.isArray(source.agenda) && source.agenda.length ? source.agenda : fallback.agenda,
        blocks: Array.isArray(source.blocks) && source.blocks.length ? source.blocks : fallback.blocks
    };
}

export function adjustTextareaHeight(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
}

function createDeleteButton() {
    return `
        <button type="button" data-action="delete-block" class="no-print absolute -top-3 -right-3 w-8 h-8 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition shadow border border-rose-200 z-10">
            <i class="fas fa-trash-alt text-[10px]"></i>
        </button>`;
}

function createListItemHtml(val = '') {
    return `
        <div class="flex items-center gap-2 animate-fade-in list-row">
            <i class="fas fa-circle text-[6px] text-slate-400"></i>
            <input type="text" value="${escapeHtml(val)}" placeholder="Isi poin..." class="list-input flex-1 border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-emerald-500 transition shadow-sm">
            <button type="button" data-action="delete-row" class="no-print text-slate-300 hover:text-rose-500 font-bold px-2"><i class="fas fa-times"></i></button>
        </div>`;
}

function createKeyValueItemHtml(k = '', v = '') {
    return `
        <div class="flex flex-col sm:flex-row gap-2 items-start sm:items-center animate-fade-in kv-row">
            <input type="text" value="${escapeHtml(k)}" placeholder="Nama / PIC" class="kv-key w-full sm:w-1/3 border border-slate-200 rounded px-2 py-1.5 text-sm font-semibold focus:outline-none focus:border-emerald-500 shadow-sm">
            <span class="hidden sm:inline text-slate-300"><i class="fas fa-arrow-right"></i></span>
            <input type="text" value="${escapeHtml(v)}" placeholder="Keterangan / Deadline" class="kv-val flex-1 w-full border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500 shadow-sm">
            <button type="button" data-action="delete-row" class="no-print text-slate-300 hover:text-rose-500 font-bold px-2"><i class="fas fa-times"></i></button>
        </div>`;
}

function createTableRowHtml(cells = ['', '']) {
    const columns = cells.map((value) => `
        <td class="border border-slate-200 p-2">
            <input type="text" value="${escapeHtml(value)}" class="table-cell w-full bg-transparent outline-none text-slate-600">
        </td>`).join('');

    return `
        <tr class="animate-fade-in group/row table-row-data">
            ${columns}
            <td class="text-center w-10"><button type="button" data-action="delete-row" class="no-print text-slate-200 hover:text-rose-500 opacity-0 group-hover/row:opacity-100"><i class="fas fa-trash"></i></button></td>
        </tr>`;
}

function sanitizeNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        return document.createTextNode(node.textContent || '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return document.createDocumentFragment();
    }

    const tagName = node.tagName.toLowerCase();
    if (!ALLOWED_HTML_TAGS.has(tagName)) {
        const fragment = document.createDocumentFragment();
        Array.from(node.childNodes).forEach((child) => {
            fragment.appendChild(sanitizeNode(child));
        });
        return fragment;
    }

    const cleanEl = document.createElement(tagName);
    Array.from(node.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value;
        if (!ALLOWED_ATTRS.has(name)) return;
        if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(value)) return;
        if ((name === 'href' || name === 'src') && /^\s*data:/i.test(value) && tagName !== 'img') return;
        cleanEl.setAttribute(name, value);
    });

    if (tagName === 'a' && !cleanEl.getAttribute('rel')) {
        cleanEl.setAttribute('rel', 'noopener noreferrer');
    }
    if (tagName === 'a' && !cleanEl.getAttribute('target')) {
        cleanEl.setAttribute('target', '_blank');
    }
    if (tagName === 'iframe' && !cleanEl.getAttribute('sandbox')) {
        cleanEl.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups');
    }

    Array.from(node.childNodes).forEach((child) => {
        cleanEl.appendChild(sanitizeNode(child));
    });

    return cleanEl;
}

export function sanitizeHtml(html = '') {
    const template = document.createElement('template');
    template.innerHTML = html;
    const wrapper = document.createElement('div');

    Array.from(template.content.childNodes).forEach((child) => {
        wrapper.appendChild(sanitizeNode(child));
    });

    return wrapper.innerHTML;
}

function textBlockHtml(block = {}) {
    return `
        <div data-type="text" class="dynamic-block bg-white border border-slate-200 rounded-xl shadow-sm relative group animate-fade-in transition-all">
            ${createDeleteButton()}
            <div class="px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                <input type="text" value="${escapeHtml(block.title || '')}" placeholder="JUDUL PARAGRAF" class="block-title w-full font-bold text-slate-800 bg-transparent outline-none uppercase text-sm tracking-wide focus:text-emerald-700">
            </div>
            <div class="p-4">
                <textarea placeholder="Ketik catatan di sini..." class="block-content w-full auto-resize bg-transparent outline-none text-slate-700 text-sm min-h-[60px] leading-relaxed border border-transparent focus:border-slate-200 rounded-md p-2 hover:bg-slate-50 transition">${escapeHtml(block.content || '')}</textarea>
            </div>
        </div>`;
}

function listBlockHtml(block = {}) {
    const items = Array.isArray(block.content) && block.content.length ? block.content : [''];
    return `
        <div data-type="list" class="dynamic-block bg-white border border-slate-200 rounded-xl shadow-sm relative group animate-fade-in transition-all">
            ${createDeleteButton()}
            <div class="px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                <input type="text" value="${escapeHtml(block.title || '')}" placeholder="JUDUL DAFTAR" class="block-title w-full font-bold text-slate-800 bg-transparent outline-none uppercase text-sm tracking-wide focus:text-emerald-700">
            </div>
            <div class="p-4 space-y-2 list-container">${items.map((value) => createListItemHtml(value)).join('')}</div>
            <div class="px-4 pb-4"><button type="button" data-action="append-list-item" class="no-print text-xs font-semibold text-emerald-600 hover:text-emerald-800">+ Tambah Poin</button></div>
        </div>`;
}

function kvBlockHtml(block = {}) {
    const pairs = Array.isArray(block.content) && block.content.length ? block.content : [{ k: '', v: '' }];
    return `
        <div data-type="kv" class="dynamic-block bg-white border border-slate-200 rounded-xl shadow-sm relative group animate-fade-in transition-all">
            ${createDeleteButton()}
            <div class="px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                <input type="text" value="${escapeHtml(block.title || '')}" placeholder="TIMELINE / PENUGASAN" class="block-title w-full font-bold text-slate-800 bg-transparent outline-none uppercase text-sm tracking-wide focus:text-emerald-700">
            </div>
            <div class="p-4 space-y-2 kv-container">${pairs.map((pair) => createKeyValueItemHtml(pair.k, pair.v)).join('')}</div>
            <div class="px-4 pb-4"><button type="button" data-action="append-kv-item" class="no-print text-xs font-semibold text-emerald-600 hover:text-emerald-800">+ Tambah Baris Penugasan</button></div>
        </div>`;
}

function tableBlockHtml(block = {}) {
    const content = block.content || {};
    const headers = Array.isArray(content.headers) && content.headers.length ? content.headers : ['Kolom 1', 'Kolom 2'];
    const rows = Array.isArray(content.rows) && content.rows.length ? content.rows : [['', '']];

    const headHtml = headers.map((header) => `
        <th class="border border-slate-200 bg-slate-50 p-2">
            <input type="text" value="${escapeHtml(header)}" class="table-head w-full bg-transparent font-bold outline-none text-slate-700">
        </th>`).join('');

    return `
        <div data-type="table" class="dynamic-block bg-white border border-slate-200 rounded-xl shadow-sm relative group animate-fade-in transition-all">
            ${createDeleteButton()}
            <div class="px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                <input type="text" value="${escapeHtml(block.title || '')}" placeholder="JUDUL TABEL DATA" class="block-title w-full font-bold text-slate-800 bg-transparent outline-none uppercase text-sm tracking-wide focus:text-emerald-700">
            </div>
            <div class="p-4 overflow-x-auto">
                <table class="w-full text-left text-sm border-collapse">
                    <thead><tr>${headHtml}<th class="w-10"></th></tr></thead>
                    <tbody class="tbody-container">${rows.map((row) => createTableRowHtml(row)).join('')}</tbody>
                </table>
                <button type="button" data-action="append-table-row" class="no-print text-xs font-semibold text-emerald-600 hover:text-emerald-800 mt-3">+ Tambah Baris Tabel</button>
            </div>
        </div>`;
}

function htmlBlockHtml(block = {}) {
    const value = typeof block.content === 'string' ? block.content : '';
    const safePreview = sanitizeHtml(value);
    const hasContent = value.trim().length > 0;
    return `
        <div data-type="html" class="dynamic-block bg-white border border-slate-200 rounded-xl shadow-sm relative group animate-fade-in transition-all">
            ${createDeleteButton()}
            <div class="px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl flex items-center gap-3 justify-between">
                <input type="text" value="${escapeHtml(block.title || '')}" placeholder="HTML CUSTOM" class="block-title w-full font-bold text-slate-800 bg-transparent outline-none uppercase text-sm tracking-wide focus:text-emerald-700">
                <button type="button" data-action="toggle-html-editor" class="no-print shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-900">
                    ${hasContent ? 'Edit HTML' : 'Tutup Editor'}
                </button>
            </div>
            <div class="p-4 html-block-layout grid grid-cols-1 ${hasContent ? '' : 'xl:grid-cols-2'} gap-4">
                <div class="html-editor-panel ${hasContent ? 'hidden' : ''}">
                    <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Editor HTML</label>
                    <textarea placeholder="Tulis HTML kustom di sini..." class="block-html-editor w-full min-h-[180px] auto-resize rounded-xl bg-slate-900 text-slate-100 p-4 font-mono text-xs outline-none border border-slate-800">${escapeHtml(value)}</textarea>
                </div>
                <div class="html-preview-panel">
                    <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Preview Aman</label>
                    <div class="html-preview min-h-[180px] rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 overflow-auto">${safePreview}</div>
                </div>
            </div>
        </div>`;
}

function renderBlockHtml(block) {
    switch (block.type) {
        case 'list': return listBlockHtml(block);
        case 'kv': return kvBlockHtml(block);
        case 'table': return tableBlockHtml(block);
        case 'html': return htmlBlockHtml(block);
        case 'text':
        default:
            return textBlockHtml(block);
    }
}

function createAgendaRowHtml(text = '') {
    return `
        <li class="flex items-start gap-2 text-sm animate-fade-in data-agenda-row">
            <i class="fas fa-caret-right text-slate-300 mt-1"></i>
            <input type="text" value="${escapeHtml(text)}" placeholder="Ketik agenda..." class="data-agenda-input flex-1 outline-none text-slate-700 border-b border-transparent focus:border-emerald-400 bg-transparent transition">
            <button type="button" data-action="delete-row" class="no-print text-slate-300 hover:text-rose-500"><i class="fas fa-times"></i></button>
        </li>`;
}

function createPesertaChipHtml(name = '') {
    return `
        <span class="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1 data-peserta">
            <span class="peserta-name">${escapeHtml(name)}</span>
            <button type="button" data-action="delete-chip" class="no-print text-emerald-400 hover:text-rose-500 ml-1"><i class="fas fa-times"></i></button>
        </span>`;
}

function renderReadonlyBlock(block) {
    if (block.type === 'list') {
        return `
            <div class="dynamic-block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div class="px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <h3 class="font-bold text-slate-800 uppercase text-sm tracking-wide">${escapeHtml(block.title || 'DAFTAR')}</h3>
                </div>
                <div class="p-4">
                    <ul class="space-y-2 text-sm text-slate-700 list-disc pl-5">${(block.content || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
                </div>
            </div>`;
    }
    if (block.type === 'kv') {
        return `
            <div class="dynamic-block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div class="px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <h3 class="font-bold text-slate-800 uppercase text-sm tracking-wide">${escapeHtml(block.title || 'PENUGASAN')}</h3>
                </div>
                <div class="p-4 space-y-3">${(block.content || []).map((row) => `
                    <div class="grid grid-cols-1 sm:grid-cols-[minmax(180px,1fr)_24px_2fr] gap-2 items-center text-sm">
                        <div class="font-semibold text-slate-800">${escapeHtml(row.k || '-')}</div>
                        <div class="text-slate-300 hidden sm:block"><i class="fas fa-arrow-right"></i></div>
                        <div class="text-slate-600">${escapeHtml(row.v || '-')}</div>
                    </div>`).join('')}
                </div>
            </div>`;
    }
    if (block.type === 'table') {
        const headers = block.content?.headers || [];
        const rows = block.content?.rows || [];
        return `
            <div class="dynamic-block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div class="px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <h3 class="font-bold text-slate-800 uppercase text-sm tracking-wide">${escapeHtml(block.title || 'TABEL DATA')}</h3>
                </div>
                <div class="p-4 overflow-x-auto">
                    <table class="w-full text-left text-sm border-collapse">
                        <thead><tr>${headers.map((header) => `<th class="border border-slate-200 bg-slate-50 p-2 font-bold text-slate-700">${escapeHtml(header)}</th>`).join('')}</tr></thead>
                        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td class="border border-slate-200 p-2 text-slate-600">${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
                    </table>
                </div>
            </div>`;
    }
    if (block.type === 'html') {
        return `
            <div class="dynamic-block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div class="px-5 py-3 border-b border-slate-100 bg-slate-50">
                    <h3 class="font-bold text-slate-800 uppercase text-sm tracking-wide">${escapeHtml(block.title || 'HTML CUSTOM')}</h3>
                </div>
                <div class="p-4">
                    <div class="html-preview min-h-[120px] rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 overflow-auto">${sanitizeHtml(block.content || '')}</div>
                </div>
            </div>`;
    }
    return `
        <div class="dynamic-block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-slate-100 bg-slate-50">
                <h3 class="font-bold text-slate-800 uppercase text-sm tracking-wide">${escapeHtml(block.title || 'PARAGRAF')}</h3>
            </div>
            <div class="p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">${escapeHtml(block.content || '')}</div>
        </div>`;
}

export function renderEditor(documentData, options = {}) {
    const data = normalizeDocumentData(documentData);
    const readOnly = Boolean(options.readOnly);

    return `
        <div class="max-w-5xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200">
            <div class="bg-emerald-900 text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 no-print">
                <div class="flex items-center gap-3">
                    <i class="fas fa-cloud text-2xl text-emerald-400"></i>
                    <div>
                        <h1 class="text-xl font-bold tracking-wide">E-Notulen <span class="text-emerald-300 text-sm font-normal ml-1">v.Cloud</span></h1>
                        <p class="text-xs text-emerald-100/80">${readOnly ? 'Mode Preview / Baca' : 'Mode Editor Modular'}</p>
                    </div>
                </div>
                <div class="flex gap-2 w-full sm:w-auto">
                    <button type="button" data-action="go-list" class="px-4 py-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-sm font-medium transition flex items-center gap-2 justify-center">
                        <i class="fas fa-arrow-left"></i> Daftar Notulen
                    </button>
                    <button type="button" data-action="${readOnly ? 'go-edit' : 'go-view'}" class="px-4 py-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-sm font-medium transition flex items-center gap-2 justify-center">
                        <i class="fas ${readOnly ? 'fa-pen-to-square' : 'fa-eye'}"></i> ${readOnly ? 'Mode Edit' : 'Mode Preview'}
                    </button>
                    <button type="button" data-action="print" class="px-4 py-2 rounded-lg border border-emerald-500/40 bg-emerald-700 hover:bg-emerald-600 text-sm font-medium transition flex items-center gap-2 justify-center">
                        <i class="fas fa-print"></i> Cetak
                    </button>
                </div>
            </div>

            <div class="p-6 md:p-10 space-y-10">
                <div class="text-center border-b-2 border-slate-100 pb-6">
                    ${readOnly
                        ? `<h2 class="w-full text-center text-3xl font-extrabold text-slate-900 mb-1 uppercase tracking-tight">${escapeHtml(data.meta.judul || 'JUDUL RAPAT')}</h2>
                           <p class="w-full text-center text-slate-500 font-medium text-sm">${escapeHtml(data.meta.subjudul || 'Sub-judul / Deskripsi dokumen')}</p>`
                        : `<input id="input-judul" type="text" value="${escapeHtml(data.meta.judul)}" placeholder="JUDUL RAPAT" class="w-full text-center text-3xl font-extrabold text-slate-900 mb-1 uppercase tracking-tight focus:outline-none focus:border-b focus:border-emerald-600 bg-transparent transition-colors">
                           <input id="input-subjudul" type="text" value="${escapeHtml(data.meta.subjudul)}" placeholder="Sub-judul / Deskripsi dokumen" class="w-full text-center text-slate-500 font-medium focus:outline-none bg-transparent text-sm">`}
                </div>

                <section class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-visible mt-4">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-emerald-600 rounded-l-xl"></div>
                    <h3 class="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <i class="fas fa-info-circle text-emerald-600"></i> Informasi Rapat
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 ml-2">
                        ${readOnly
                            ? `<div class="flex flex-col">
                                   <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tanggal & Waktu</label>
                                   <div class="flex items-center gap-2 border border-slate-200 rounded px-3 py-2 bg-slate-50 text-sm text-slate-700 shadow-sm">
                                       <i class="far fa-calendar-alt text-emerald-500"></i>
                                       <span>${escapeHtml(data.meta.tgl || '-')}</span>
                                       <span class="text-slate-300">|</span>
                                       <i class="far fa-clock text-emerald-500"></i>
                                       <span>${escapeHtml(data.meta.waktuMulai || '-')} - ${escapeHtml(data.meta.waktuSelesai || '-')}</span>
                                   </div>
                               </div>
                               <div class="flex flex-col">
                                   <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notulis</label>
                                   <div class="flex items-center gap-2 border border-slate-200 rounded px-3 py-2 bg-slate-50 text-sm text-slate-700 shadow-sm h-full">
                                       <i class="fas fa-user-edit text-emerald-500"></i>
                                       <span>${escapeHtml(data.meta.notulis || '-')}</span>
                                   </div>
                               </div>
                               <div class="flex flex-col md:col-span-2">
                                   <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lokasi Rapat</label>
                                   <div class="flex items-center gap-2 border border-slate-200 rounded px-3 py-2 bg-slate-50 text-sm text-slate-700 shadow-sm h-full">
                                       <i class="fas fa-map-marker-alt text-rose-400"></i>
                                       <span>${escapeHtml(data.meta.lokasi || '-')}</span>
                                   </div>
                               </div>
                               <div class="flex flex-col md:col-span-2">
                                   <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Peserta Rapat</label>
                                   <div class="flex flex-wrap gap-2 mt-1 items-center bg-slate-50 p-2 rounded border border-slate-200 min-h-[46px]">
                                       <div id="peserta-list" class="flex flex-wrap gap-2 items-center">${data.peserta.map((person) => `<span class="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-3 py-1.5 rounded-full font-medium">${escapeHtml(person)}</span>`).join('')}</div>
                                   </div>
                               </div>
                               <div class="md:col-span-2 mt-2">
                                   <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Agenda Rapat</label>
                                   <div class="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                       <ol id="agenda-list" class="space-y-2 list-decimal pl-5">${data.agenda.map((item) => `<li class="text-sm text-slate-700">${escapeHtml(item)}</li>`).join('')}</ol>
                                   </div>
                               </div>`
                            : `<div class="flex flex-col">
                                   <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tanggal & Waktu</label>
                                   <div class="flex items-center gap-2 border border-slate-200 rounded px-3 py-2 bg-white focus-within:border-emerald-500 transition shadow-sm">
                                       <i class="far fa-calendar-alt text-emerald-500"></i>
                                       <input id="input-tgl" type="date" value="${escapeHtml(data.meta.tgl)}" class="outline-none text-sm text-slate-700 w-auto bg-transparent">
                                       <span class="text-slate-300">|</span>
                                       <i class="far fa-clock text-emerald-500"></i>
                                       <input id="input-waktu-mulai" type="time" value="${escapeHtml(data.meta.waktuMulai)}" class="outline-none text-sm text-slate-700 w-20 bg-transparent">
                                       <span class="text-slate-400">-</span>
                                       <input id="input-waktu-selesai" type="time" value="${escapeHtml(data.meta.waktuSelesai)}" class="outline-none text-sm text-slate-700 w-20 bg-transparent">
                                   </div>
                               </div>
                               <div class="flex flex-col">
                                   <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notulis</label>
                                   <div class="flex items-center gap-2 border border-slate-200 rounded px-3 py-2 bg-white focus-within:border-emerald-500 transition shadow-sm h-full">
                                       <i class="fas fa-user-edit text-emerald-500"></i>
                                       <input id="input-notulis" type="text" value="${escapeHtml(data.meta.notulis)}" placeholder="Nama notulis..." class="w-full outline-none text-sm text-slate-700 bg-transparent">
                                   </div>
                               </div>
                               <div class="flex flex-col md:col-span-2">
                                   <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lokasi Rapat</label>
                                   <div class="flex items-center gap-2 border border-slate-200 rounded px-3 py-2 bg-white focus-within:border-emerald-500 transition shadow-sm h-full">
                                       <i class="fas fa-map-marker-alt text-rose-400"></i>
                                       <input id="input-lokasi" type="text" value="${escapeHtml(data.meta.lokasi)}" placeholder="Lokasi fisik atau Link Zoom/Meet..." class="w-full outline-none text-sm text-slate-700 bg-transparent">
                                   </div>
                               </div>
                               <div class="flex flex-col md:col-span-2">
                                   <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Peserta Rapat</label>
                                   <div class="flex flex-wrap gap-2 mt-1 items-center bg-slate-50 p-2 rounded border border-slate-200 min-h-[46px]">
                                       <div id="peserta-list" class="flex flex-wrap gap-2 items-center">${data.peserta.map((person) => createPesertaChipHtml(person)).join('')}</div>
                                       <input id="input-peserta-baru" type="text" placeholder="+ Tambah Peserta (Enter)..." class="text-xs outline-none bg-transparent ml-2 text-slate-600 placeholder-slate-400 border-b border-transparent focus:border-slate-300 py-1 flex-1 min-w-[150px]">
                                   </div>
                               </div>
                               <div class="md:col-span-2 mt-2">
                                   <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Agenda Rapat</label>
                                   <div class="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                                       <ol id="agenda-list" class="space-y-2">${data.agenda.map((item) => createAgendaRowHtml(item)).join('')}</ol>
                                       <button type="button" data-action="append-agenda" class="no-print mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition">+ Tambah Agenda</button>
                                   </div>
                               </div>`}
                    </div>
                </section>

                <section class="mt-8">
                    <div class="flex items-center gap-3 mb-6">
                        <i class="fas fa-stream text-emerald-800 text-xl"></i>
                        <h2 class="text-xl font-bold text-emerald-900">Isi Notulen</h2>
                    </div>
                    <div id="dynamic-blocks-container" class="space-y-8 pl-2">${data.blocks.map((block) => readOnly ? renderReadonlyBlock(block) : renderBlockHtml(block)).join('')}</div>
                </section>

                ${readOnly ? '' : `<section class="bg-emerald-50/50 border border-dashed border-emerald-300 rounded-xl p-6 text-center mt-8 no-print">
                    <p class="text-sm font-semibold text-emerald-900 mb-4">Tambahkan Bagian Baru:</p>
                    <div class="flex flex-wrap justify-center gap-3">
                        <button type="button" data-block-type="text" class="block-adder px-4 py-2 bg-white border border-emerald-200 text-emerald-800 rounded-lg hover:bg-emerald-50 transition font-medium text-sm shadow-sm flex items-center gap-2"><i class="fas fa-align-left text-emerald-600"></i> Paragraf Bebas</button>
                        <button type="button" data-block-type="list" class="block-adder px-4 py-2 bg-white border border-emerald-200 text-emerald-800 rounded-lg hover:bg-emerald-50 transition font-medium text-sm shadow-sm flex items-center gap-2"><i class="fas fa-list-ul text-emerald-600"></i> Daftar (Poin)</button>
                        <button type="button" data-block-type="kv" class="block-adder px-4 py-2 bg-white border border-emerald-200 text-emerald-800 rounded-lg hover:bg-emerald-50 transition font-medium text-sm shadow-sm flex items-center gap-2"><i class="fas fa-tasks text-emerald-600"></i> Penugasan</button>
                        <button type="button" data-block-type="table" class="block-adder px-4 py-2 bg-white border border-emerald-200 text-emerald-800 rounded-lg hover:bg-emerald-50 transition font-medium text-sm shadow-sm flex items-center gap-2"><i class="fas fa-table text-emerald-600"></i> Tabel Data</button>
                        <button type="button" data-block-type="html" class="block-adder px-4 py-2 bg-white border border-emerald-200 text-emerald-800 rounded-lg hover:bg-emerald-50 transition font-medium text-sm shadow-sm flex items-center gap-2"><i class="fas fa-code text-emerald-600"></i> HTML Custom</button>
                    </div>
                </section>`}
            </div>
        </div>

        ${readOnly ? '' : `<div class="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] p-4 flex justify-between items-center z-50 px-4 md:px-10 no-print">
            <div class="text-sm text-slate-500 hidden sm:block">
                <i class="fas fa-database text-emerald-500"></i> Tersambung ke Realtime Database
            </div>
            <div class="flex gap-3 w-full sm:w-auto justify-end">
                <button type="button" data-action="go-view" class="px-6 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 font-semibold transition flex items-center justify-center gap-2 w-full sm:w-auto">
                    <i class="fas fa-eye"></i> Preview
                </button>
                <button id="save-button" type="button" data-action="save-document" class="px-8 py-2.5 bg-emerald-700 border border-transparent rounded-lg shadow-md hover:bg-emerald-800 text-white font-semibold transition flex items-center justify-center gap-2 w-full sm:w-auto">
                    <i class="fas fa-cloud-upload-alt"></i> Simpan Dokumen
                </button>
            </div>
        </div>`}`;
}

export function createBlock(type) {
    const map = {
        text: { type: 'text', title: '', content: '' },
        list: { type: 'list', title: '', content: [''] },
        kv: { type: 'kv', title: '', content: [{ k: '', v: '' }] },
        table: { type: 'table', title: '', content: { headers: ['Kolom 1', 'Kolom 2'], rows: [['', '']] } },
        html: { type: 'html', title: '', content: '' }
    };
    return map[type] || map.text;
}

export function appendBlock(container, block) {
    if (!container) return;
    container.insertAdjacentHTML('beforeend', renderBlockHtml(block));
    container.querySelectorAll('textarea.auto-resize').forEach((textarea) => adjustTextareaHeight(textarea));
}

export function appendAgenda(list, text = '') {
    if (!list) return;
    list.insertAdjacentHTML('beforeend', createAgendaRowHtml(text));
}

export function appendPeserta(list, name) {
    if (!list || !name) return;
    list.insertAdjacentHTML('beforeend', createPesertaChipHtml(name));
}

export function serializeEditor(root) {
    const peserta = Array.from(root.querySelectorAll('.data-peserta .peserta-name')).map((el) => el.textContent.trim()).filter(Boolean);
    const agenda = Array.from(root.querySelectorAll('.data-agenda-input')).map((el) => el.value.trim()).filter(Boolean);

    const blocks = Array.from(root.querySelectorAll('.dynamic-block')).map((block) => {
        const type = block.getAttribute('data-type');
        const title = block.querySelector('.block-title')?.value || '';
        let content = '';

        if (type === 'text') {
            content = block.querySelector('.block-content')?.value || '';
        } else if (type === 'list') {
            content = Array.from(block.querySelectorAll('.list-input')).map((input) => input.value).filter((item) => item.trim() !== '');
        } else if (type === 'kv') {
            content = Array.from(block.querySelectorAll('.kv-row')).map((row) => ({
                k: row.querySelector('.kv-key')?.value || '',
                v: row.querySelector('.kv-val')?.value || ''
            })).filter((pair) => pair.k.trim() || pair.v.trim());
        } else if (type === 'table') {
            const headers = Array.from(block.querySelectorAll('.table-head')).map((input) => input.value);
            const rows = Array.from(block.querySelectorAll('.table-row-data')).map((row) =>
                Array.from(row.querySelectorAll('.table-cell')).map((input) => input.value)
            ).filter((row) => row.some((cell) => cell.trim() !== ''));
            content = { headers, rows: rows.length ? rows : [['', '']] };
        } else if (type === 'html') {
            content = block.querySelector('.block-html-editor')?.value || '';
        }

        return { type, title, content };
    });

    return {
        meta: {
            judul: root.querySelector('#input-judul')?.value || '',
            subjudul: root.querySelector('#input-subjudul')?.value || '',
            tgl: root.querySelector('#input-tgl')?.value || '',
            waktuMulai: root.querySelector('#input-waktu-mulai')?.value || '',
            waktuSelesai: root.querySelector('#input-waktu-selesai')?.value || '',
            notulis: root.querySelector('#input-notulis')?.value || '',
            lokasi: root.querySelector('#input-lokasi')?.value || ''
        },
        peserta,
        agenda,
        blocks
    };
}

export function bindEditorInteractions(root, callbacks = {}) {
    const pesertaInput = root.querySelector('#input-peserta-baru');
    const pesertaList = root.querySelector('#peserta-list');
    const agendaList = root.querySelector('#agenda-list');
    const blocksContainer = root.querySelector('#dynamic-blocks-container');

    root.querySelectorAll('textarea.auto-resize').forEach((textarea) => adjustTextareaHeight(textarea));

    if (pesertaInput) {
        pesertaInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && pesertaInput.value.trim()) {
                appendPeserta(pesertaList, pesertaInput.value.trim());
                pesertaInput.value = '';
                callbacks.onDirty?.();
                event.preventDefault();
            }
        });
    }

    root.addEventListener('input', (event) => {
        if (event.target.matches('textarea.auto-resize')) {
            adjustTextareaHeight(event.target);
        }

        if (event.target.matches('.block-html-editor')) {
            adjustTextareaHeight(event.target);
            const block = event.target.closest('.dynamic-block');
            const preview = block?.querySelector('.html-preview');
            const editorPanel = block?.querySelector('.html-editor-panel');
            const toggleBtn = block?.querySelector('[data-action="toggle-html-editor"]');
            const layout = block?.querySelector('.html-block-layout');
            if (preview) {
                preview.innerHTML = sanitizeHtml(event.target.value);
            }
            if (event.target.value.trim()) {
                editorPanel?.classList.add('hidden');
                layout?.classList.remove('xl:grid-cols-2');
                if (toggleBtn) toggleBtn.textContent = 'Edit HTML';
            } else {
                editorPanel?.classList.remove('hidden');
                layout?.classList.add('xl:grid-cols-2');
                if (toggleBtn) toggleBtn.textContent = 'Tutup Editor';
            }
        }

        callbacks.onDirty?.();
    });

    root.addEventListener('click', (event) => {
        const actionEl = event.target.closest('[data-action], [data-block-type]');
        if (!actionEl) return;

        const action = actionEl.getAttribute('data-action');
        const blockType = actionEl.getAttribute('data-block-type');

        if (blockType) {
            appendBlock(blocksContainer, createBlock(blockType));
            callbacks.onDirty?.();
            return;
        }

        if (action === 'delete-chip') {
            actionEl.closest('.data-peserta')?.remove();
            callbacks.onDirty?.();
            return;
        }

        if (action === 'toggle-html-editor') {
            const block = actionEl.closest('.dynamic-block');
            const editorPanel = block?.querySelector('.html-editor-panel');
            const layout = block?.querySelector('.html-block-layout');
            const isHidden = editorPanel?.classList.contains('hidden');
            if (isHidden) {
                editorPanel?.classList.remove('hidden');
                layout?.classList.add('xl:grid-cols-2');
                actionEl.textContent = 'Tutup Editor';
                block?.querySelector('.block-html-editor')?.focus();
            } else {
                editorPanel?.classList.add('hidden');
                layout?.classList.remove('xl:grid-cols-2');
                actionEl.textContent = 'Edit HTML';
            }
            return;
        }

        if (action === 'append-agenda') {
            appendAgenda(agendaList, '');
            callbacks.onDirty?.();
            return;
        }

        if (action === 'append-list-item') {
            actionEl.closest('.dynamic-block')?.querySelector('.list-container')?.insertAdjacentHTML('beforeend', createListItemHtml(''));
            callbacks.onDirty?.();
            return;
        }

        if (action === 'append-kv-item') {
            actionEl.closest('.dynamic-block')?.querySelector('.kv-container')?.insertAdjacentHTML('beforeend', createKeyValueItemHtml('', ''));
            callbacks.onDirty?.();
            return;
        }

        if (action === 'append-table-row') {
            const block = actionEl.closest('.dynamic-block');
            const headerCount = block?.querySelectorAll('.table-head').length || 2;
            block?.querySelector('.tbody-container')?.insertAdjacentHTML('beforeend', createTableRowHtml(Array.from({ length: headerCount }, () => '')));
            callbacks.onDirty?.();
            return;
        }

        if (action === 'delete-block') {
            actionEl.closest('.dynamic-block')?.remove();
            callbacks.onDirty?.();
            return;
        }

        if (action === 'delete-row') {
            actionEl.closest('.list-row, .kv-row, .table-row-data, .data-agenda-row')?.remove();
            callbacks.onDirty?.();
        }
    });
}

export function createPayload(root, existingMeta = {}) {
    const serialized = serializeEditor(root);
    const now = new Date().toISOString();

    return {
        meta: {
            ...existingMeta,
            ...serialized.meta,
            createdAt: existingMeta.createdAt || now,
            updatedAt: now
        },
        peserta: serialized.peserta,
        agenda: serialized.agenda,
        blocks: serialized.blocks
    };
}

export function renderPrintView(documentData) {
    const data = normalizeDocumentData(documentData);
    const blockHtml = data.blocks.map((block) => {
        if (block.type === 'list') {
            return `
                <section class="print-section">
                    <h3>${escapeHtml(block.title || 'Daftar')}</h3>
                    <ul>${(block.content || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
                </section>`;
        }
        if (block.type === 'kv') {
            return `
                <section class="print-section">
                    <h3>${escapeHtml(block.title || 'Penugasan')}</h3>
                    <table class="print-table">
                        <tbody>${(block.content || []).map((row) => `<tr><td>${escapeHtml(row.k || '')}</td><td>${escapeHtml(row.v || '')}</td></tr>`).join('')}</tbody>
                    </table>
                </section>`;
        }
        if (block.type === 'table') {
            const headers = block.content?.headers || [];
            const rows = block.content?.rows || [];
            return `
                <section class="print-section">
                    <h3>${escapeHtml(block.title || 'Tabel')}</h3>
                    <table class="print-table">
                        <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
                        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
                    </table>
                </section>`;
        }
        if (block.type === 'html') {
            return `
                <section class="print-section">
                    <h3>${escapeHtml(block.title || 'HTML Custom')}</h3>
                    <div class="print-html-preview">${sanitizeHtml(block.content || '')}</div>
                </section>`;
        }
        return `
            <section class="print-section">
                <h3>${escapeHtml(block.title || 'Paragraf')}</h3>
                <p>${escapeHtml(block.content || '').replace(/\n/g, '<br>')}</p>
            </section>`;
    }).join('');

    return `
        <div class="print-sheet">
            <header class="print-section">
                <h1>${escapeHtml(data.meta.judul || 'Notulen Rapat')}</h1>
                <p>${escapeHtml(data.meta.subjudul || '')}</p>
            </header>

            <section class="print-section">
                <table class="print-table">
                    <tbody>
                        <tr><th>Tanggal</th><td>${escapeHtml(data.meta.tgl || '-')}</td><th>Waktu</th><td>${escapeHtml(data.meta.waktuMulai || '-')} - ${escapeHtml(data.meta.waktuSelesai || '-')}</td></tr>
                        <tr><th>Notulis</th><td>${escapeHtml(data.meta.notulis || '-')}</td><th>Lokasi</th><td>${escapeHtml(data.meta.lokasi || '-')}</td></tr>
                    </tbody>
                </table>
            </section>

            <section class="print-section">
                <h3>Peserta Rapat</h3>
                <p>${data.peserta.map((name) => escapeHtml(name)).join(', ') || '-'}</p>
            </section>

            <section class="print-section">
                <h3>Agenda Rapat</h3>
                <ol>${data.agenda.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
            </section>

            ${blockHtml}
        </div>`;
}
