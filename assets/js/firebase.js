import { firebaseConfig } from '../../firebase-config.js';

let appInstance = null;
let dbInstance = null;

function validateConfig(config) {
    const requiredKeys = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'appId'];
    const missingKeys = requiredKeys.filter((key) => !config[key] || config[key].includes('YOUR_'));

    if (missingKeys.length) {
        throw new Error(`Firebase belum dikonfigurasi. Lengkapi: ${missingKeys.join(', ')}`);
    }
}

export function getFirebaseDatabase() {
    if (dbInstance) {
        return dbInstance;
    }

    if (!window.firebase) {
        throw new Error('Firebase SDK gagal dimuat dari CDN.');
    }

    validateConfig(firebaseConfig);

    appInstance = window.firebase.apps.length
        ? window.firebase.app()
        : window.firebase.initializeApp(firebaseConfig);

    dbInstance = window.firebase.database(appInstance);
    return dbInstance;
}
