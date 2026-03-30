import { getFirebaseDatabase } from './firebase.js';

const ROOT_PATH = 'notulen';

function notulenRef(path = '') {
    const db = getFirebaseDatabase();
    const fullPath = path ? `${ROOT_PATH}/${path}` : ROOT_PATH;
    return db.ref(fullPath);
}

function normalizeCollection(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);

    return Object.keys(value)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => value[key])
        .filter((item) => item !== null && item !== undefined);
}

function normalizeDocument(id, value) {
    const data = value || {};
    return {
        id,
        meta: {
            judul: '',
            subjudul: '',
            tgl: '',
            waktuMulai: '',
            waktuSelesai: '',
            notulis: '',
            lokasi: '',
            createdAt: '',
            updatedAt: '',
            ...data.meta
        },
        peserta: normalizeCollection(data.peserta),
        agenda: normalizeCollection(data.agenda),
        blocks: normalizeCollection(data.blocks)
    };
}

export async function listDocuments() {
    const snapshot = await notulenRef().get();
    if (!snapshot.exists()) return [];

    const value = snapshot.val();
    return Object.entries(value)
        .map(([id, doc]) => normalizeDocument(id, doc))
        .sort((a, b) => {
            const left = new Date(b.meta.updatedAt || b.meta.createdAt || 0).getTime();
            const right = new Date(a.meta.updatedAt || a.meta.createdAt || 0).getTime();
            return left - right;
        });
}

export async function getDocumentById(id) {
    const snapshot = await notulenRef(id).get();
    if (!snapshot.exists()) return null;
    return normalizeDocument(id, snapshot.val());
}

export async function createDocument(payload) {
    const reference = notulenRef().push();
    await reference.set(payload);
    return reference.key;
}

export async function saveDocument(id, payload) {
    await notulenRef(id).set(payload);
}

export function subscribeDocuments(callback, onError) {
    const reference = notulenRef();
    const listener = reference.on(
        'value',
        (snapshot) => {
            if (!snapshot.exists()) {
                callback([]);
                return;
            }

            const docs = Object.entries(snapshot.val())
                .map(([id, doc]) => normalizeDocument(id, doc))
                .sort((a, b) => {
                    const left = new Date(b.meta.updatedAt || b.meta.createdAt || 0).getTime();
                    const right = new Date(a.meta.updatedAt || a.meta.createdAt || 0).getTime();
                    return left - right;
                });
            callback(docs);
        },
        onError
    );

    return () => reference.off('value', listener);
}
