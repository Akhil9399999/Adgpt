/**
 * AdGPT - Create Admin Account Script (REST API version)
 * Run: node scripts/createAdmin.js
 *
 * This creates a FRESH admin account. If the email already exists with a
 * different password, it will try to reset it or use a new email.
 */

// ─── Admin Credentials ────────────────────────────────────────────────────────
const ADMIN_NAME     = 'Admin';
const ADMIN_EMAIL    = 'adgpt.admin@gmail.com';   // using a fresh email to avoid conflicts
const ADMIN_PASSWORD = 'Admin@123456';
// ──────────────────────────────────────────────────────────────────────────────

// ─── Firebase Config ──────────────────────────────────────────────────────────
const API_KEY    = 'AIzaSyC_K8YVpo5yguN2Z0eRA_mKCZlYfuOVjOc';
const PROJECT_ID = 'newadgpt-692fb';
// ──────────────────────────────────────────────────────────────────────────────

const AUTH_BASE = `https://identitytoolkit.googleapis.com/v1/accounts`;
const FS_BASE   = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function restPost(url, body, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res  = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || JSON.stringify(json));
    return json;
}

async function createAdmin() {
    console.log('\n🚀 AdGPT - Creating Admin Account...');
    console.log(`   Email    : ${ADMIN_EMAIL}`);
    console.log(`   Password : ${ADMIN_PASSWORD}\n`);

    let idToken, uid;

    // Step 1: Try signup first
    try {
        const data = await restPost(`${AUTH_BASE}:signUp?key=${API_KEY}`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            returnSecureToken: true
        });
        idToken = data.idToken;
        uid     = data.localId;
        console.log('✅ New Firebase Auth account created!');

        // Set display name
        await restPost(`${AUTH_BASE}:update?key=${API_KEY}`, {
            idToken,
            displayName: ADMIN_NAME
        });

    } catch (err) {
        if (err.message.includes('EMAIL_EXISTS')) {
            // Try signing in
            console.log('ℹ️  Email already in Auth — signing in...');
            try {
                const data = await restPost(`${AUTH_BASE}:signInWithPassword?key=${API_KEY}`, {
                    email: ADMIN_EMAIL,
                    password: ADMIN_PASSWORD,
                    returnSecureToken: true
                });
                idToken = data.idToken;
                uid     = data.localId;
                console.log('✅ Signed into existing account.');
            } catch (e2) {
                console.error('\n❌ Login failed:', e2.message);
                console.log('\n💡 The email "' + ADMIN_EMAIL + '" exists with a DIFFERENT password.');
                console.log('   Options:');
                console.log('   1. Change ADMIN_EMAIL in scripts/createAdmin.js to a new email and re-run.');
                console.log('   2. Or go to Firebase Console → Authentication and delete the user, then re-run.');
                process.exit(1);
            }
        } else {
            throw err;
        }
    }

    // Step 2: Write Firestore doc with role: 'admin'
    console.log('⏳ Setting admin role in Firestore...');

    const patchUrl = `${FS_BASE}/users/${uid}`;
    const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
            fields: {
                name:        { stringValue: ADMIN_NAME },
                email:       { stringValue: ADMIN_EMAIL },
                role:        { stringValue: 'admin' },
                generations: { integerValue: '0' },
                status:      { stringValue: 'active' },
                createdAt:   { timestampValue: new Date().toISOString() },
                lastLogin:   { timestampValue: new Date().toISOString() }
            }
        })
    });

    const patchJson = await patchRes.json();
    if (!patchRes.ok) throw new Error(patchJson.error?.message || 'Firestore write failed');

    console.log('✅ Firestore document set with role: admin');
    console.log('\n════════════════════════════════════════════');
    console.log('🎉  ADMIN ACCOUNT READY!');
    console.log('════════════════════════════════════════════');
    console.log(`   Email    : ${ADMIN_EMAIL}`);
    console.log(`   Password : ${ADMIN_PASSWORD}`);
    console.log('════════════════════════════════════════════');
    console.log('\n👉 Open http://localhost:5173 → Login → Admin Dashboard\n');
    process.exit(0);
}

createAdmin().catch(err => {
    console.error('\n❌ Unexpected Error:', err.message);
    process.exit(1);
});
