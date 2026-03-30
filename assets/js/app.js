import { createDocument, getDocumentById, saveDocument, subscribeDocuments } from './storage.js';
import {
    bindEditorInteractions,
    createEmptyDocument,
    createPayload,
    normalizeDocumentData,
    renderEditor,
    renderPrintView
} from './editor.js';

const appRoot = document.getElementById('app');
const printRoot = document.getElementById('print-root');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

const state = {
    currentDocumentId: null,
    currentMeta: {},
    unsubscribeList: null,
    autosaveTimer: null,
    isSaving: false,
    listCache: [],
    currentMode: 'edit'
};

function setLoading(message, visible) {
    loadingText.textContent = message || 'Memuat aplikasi...';
    loadingOverlay.classList.toggle('hidden-overlay', !visible);
}

function debounceSave() {
    if (!state.currentDocumentId) return;
    clearTimeout(state.autosaveTimer);
    state.autosaveTimer = window.setTimeout(() => {
        handleSave(true);
    }, 1500);
}

function routeTo(hash) {
    window.location.hash = hash;
}

function formatDate(value) {
    if (!value) return 'Tanpa tanggal';
    try {
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }).format(new Date(value));
    } catch {
        return value;
    }
}

function renderListPage(documents = []) {
    printRoot.innerHTML = '';
    appRoot.innerHTML = `
        <div class="max-w-6xl mx-auto">
            <div class="bg-emerald-900 text-white px-6 py-5 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div>
                    <p class="text-emerald-300 text-sm font-medium mb-1">Mode Creator Modular</p>
                    <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight">E-Notulen Rapat</h1>
                    <p class="text-emerald-100/80 text-sm mt-2">Kelola banyak notulen rapat dengan Firebase Realtime Database.</p>
                </div>
                <button type="button" data-action="create-new" class="px-5 py-3 bg-white text-emerald-900 rounded-xl font-semibold shadow-md hover:bg-emerald-50 transition flex items-center gap-2">
                    <i class="fas fa-plus"></i> Buat Notulen Baru
                </button>
            </div>

            <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                    <div>
                        <h2 class="font-bold text-slate-800">Daftar Dokumen</h2>
                        <p class="text-sm text-slate-500">Pilih notulen yang ingin dibuka atau lanjutkan membuat dokumen baru.</p>
                    </div>
                    <span class="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">${documents.length} dokumen</span>
                </div>
                <div class="divide-y divide-slate-100">
                    ${documents.length ? documents.map((doc) => `
                        <button type="button" data-action="open-document" data-id="${doc.id}" class="w-full text-left px-6 py-5 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <h3 class="font-bold text-slate-800 text-lg">${doc.meta.judul || 'Tanpa Judul'}</h3>
                                <p class="text-sm text-slate-500 mt-1">${doc.meta.subjudul || 'Belum ada deskripsi dokumen.'}</p>
                                <div class="flex flex-wrap gap-2 mt-3 text-xs text-slate-500">
                                    <span class="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200"><i class="far fa-calendar-alt mr-1"></i>${formatDate(doc.meta.tgl)}</span>
                                    <span class="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200"><i class="fas fa-user-edit mr-1"></i>${doc.meta.notulis || 'Belum diisi'}</span>
                                    <span class="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200"><i class="fas fa-clock mr-1"></i>${doc.meta.updatedAt ? new Date(doc.meta.updatedAt).toLocaleString('id-ID') : '-'}</span>
                                </div>
                            </div>
                            <div class="text-emerald-700 font-semibold text-sm flex items-center gap-2">
                                Buka Editor <i class="fas fa-chevron-right"></i>
                            </div>
                        </button>`).join('') : `
                        <div class="px-6 py-16 text-center">
                            <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-2xl">
                                <i class="fas fa-file-alt"></i>
                            </div>
                            <h3 class="text-lg font-bold text-slate-800">Belum ada notulen</h3>
                            <p class="text-slate-500 text-sm mt-2">Mulai dari dokumen pertama Anda dan simpan ke Realtime Database.</p>
                        </div>`}
                </div>
            </div>
        </div>`;
}

function renderEditorPage(documentData, mode = state.currentMode) {
    const normalized = normalizeDocumentData(documentData);
    state.currentMeta = normalized.meta || {};
    state.currentMode = mode;
    appRoot.innerHTML = renderEditor(normalized, { readOnly: mode === 'view' });
    printRoot.innerHTML = renderPrintView(normalized);

    if (mode === 'view') {
        return;
    }

    bindEditorInteractions(appRoot, {
        onDirty: () => {
            printRoot.innerHTML = renderPrintView(createPayload(appRoot, state.currentMeta));
            debounceSave();
        }
    });
}

async function handleSave(isAutosave = false, saveButton = document.getElementById('save-button')) {
    if (state.isSaving) return;
    if (!appRoot.querySelector('#input-judul')) return;

    state.isSaving = true;
    const payload = createPayload(appRoot, state.currentMeta);
    const originalHtml = saveButton ? saveButton.innerHTML : '';

    if (saveButton && !isAutosave) {
        saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan ke Cloud...';
    }

    try {
        if (state.currentDocumentId) {
            await saveDocument(state.currentDocumentId, payload);
        } else {
            state.currentDocumentId = await createDocument(payload);
            routeTo(`#/edit/${state.currentDocumentId}`);
        }

        state.currentMeta = payload.meta;
        printRoot.innerHTML = renderPrintView(payload);

        if (saveButton && !isAutosave) {
            saveButton.innerHTML = '<i class="fas fa-check"></i> Tersimpan!';
            saveButton.classList.remove('bg-emerald-700');
            saveButton.classList.add('bg-teal-600');
            window.setTimeout(() => {
                saveButton.innerHTML = originalHtml;
                saveButton.classList.remove('bg-teal-600');
                saveButton.classList.add('bg-emerald-700');
            }, 2000);
        }
    } catch (error) {
        console.error(error);
        alert(error.message || 'Gagal menyimpan dokumen.');
        if (saveButton && !isAutosave) {
            saveButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Gagal Menyimpan';
            window.setTimeout(() => {
                saveButton.innerHTML = originalHtml;
            }, 2500);
        }
    } finally {
        state.isSaving = false;
    }
}

async function loadListPage() {
    setLoading('Memuat daftar notulen...', true);
    state.currentDocumentId = null;
    state.currentMeta = {};
    state.currentMode = 'edit';
    clearTimeout(state.autosaveTimer);

    try {
        state.unsubscribeList?.();
        state.unsubscribeList = subscribeDocuments((documents) => {
            state.listCache = documents;
            renderListPage(documents);
        }, (error) => {
            console.error(error);
            alert(error.message || 'Gagal memuat daftar notulen.');
        });
        renderListPage(state.listCache || []);
    } catch (error) {
        console.error(error);
        appRoot.innerHTML = `
            <div class="max-w-xl mx-auto mt-20 bg-white rounded-2xl border border-rose-200 shadow-sm p-8 text-center">
                <div class="text-rose-500 text-4xl mb-4"><i class="fas fa-triangle-exclamation"></i></div>
                <h1 class="text-xl font-bold text-slate-800 mb-2">Gagal memuat daftar</h1>
                <p class="text-slate-500 mb-6">${error.message || 'Periksa konfigurasi Firebase Anda.'}</p>
                <button type="button" data-action="create-new" class="px-5 py-3 bg-emerald-700 text-white rounded-xl font-semibold hover:bg-emerald-800 transition">Buka editor kosong</button>
            </div>`;
    } finally {
        setLoading('', false);
    }
}

async function loadEditorPage(id = null, mode = 'edit') {
    setLoading(mode === 'view' ? 'Memuat preview notulen...' : 'Memuat editor notulen...', true);
    state.unsubscribeList?.();
    state.unsubscribeList = null;
    clearTimeout(state.autosaveTimer);

    try {
        if (!id) {
            state.currentDocumentId = null;
            renderEditorPage(createEmptyDocument(), 'edit');
            return;
        }

        const documentData = await getDocumentById(id);
        if (!documentData) {
            alert('Dokumen tidak ditemukan.');
            routeTo('#/');
            return;
        }

        state.listCache = state.listCache.filter((doc) => doc.id !== id);
        state.listCache.unshift(documentData);
        state.currentDocumentId = id;
        renderEditorPage(documentData, mode);
    } catch (error) {
        console.error(error);
        appRoot.innerHTML = `
            <div class="max-w-xl mx-auto mt-20 bg-white rounded-2xl border border-rose-200 shadow-sm p-8 text-center">
                <div class="text-rose-500 text-4xl mb-4"><i class="fas fa-triangle-exclamation"></i></div>
                <h1 class="text-xl font-bold text-slate-800 mb-2">Gagal memuat editor</h1>
                <p class="text-slate-500 mb-6">${error.message || 'Periksa konfigurasi Firebase Anda.'}</p>
                <button type="button" data-action="go-home" class="px-5 py-3 bg-emerald-700 text-white rounded-xl font-semibold hover:bg-emerald-800 transition">Kembali ke daftar</button>
            </div>`;
        appRoot.querySelector('[data-action="go-home"]')?.addEventListener('click', () => routeTo('#/'));
    } finally {
        setLoading('', false);
    }
}

async function router() {
    const hash = window.location.hash || '#/';
    if (hash === '#/' || hash === '#') {
        await loadListPage();
        return;
    }

    if (hash === '#/new') {
        await loadEditorPage(null, 'edit');
        return;
    }

    if (hash.startsWith('#/edit/')) {
        const id = hash.replace('#/edit/', '').trim();
        await loadEditorPage(id, 'edit');
        return;
    }

    if (hash.startsWith('#/view/')) {
        const id = hash.replace('#/view/', '').trim();
        await loadEditorPage(id, 'view');
        return;
    }

    routeTo('#/');
}

document.addEventListener('click', (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.getAttribute('data-action');
    if (action === 'create-new') {
        routeTo('#/new');
        return;
    }
    if (action === 'open-document') {
        routeTo(`#/edit/${actionEl.getAttribute('data-id')}`);
        return;
    }
    if (action === 'save-document') {
        handleSave(false, document.getElementById('save-button'));
        return;
    }
    if (action === 'go-list' || action === 'go-home') {
        routeTo('#/');
        return;
    }
    if (action === 'go-view') {
        if (state.currentDocumentId) {
            routeTo(`#/view/${state.currentDocumentId}`);
        }
        return;
    }
    if (action === 'go-edit') {
        if (state.currentDocumentId) {
            routeTo(`#/edit/${state.currentDocumentId}`);
        }
        return;
    }
    if (action === 'print') {
        if (state.currentMode === 'view') {
            const currentDoc = state.listCache.find((doc) => doc.id === state.currentDocumentId);
            if (currentDoc) {
                printRoot.innerHTML = renderPrintView(currentDoc);
            }
            window.print();
            return;
        }
        if (appRoot.querySelector('#input-judul')) {
            printRoot.innerHTML = renderPrintView(createPayload(appRoot, state.currentMeta));
            window.print();
        }
    }
});

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);
