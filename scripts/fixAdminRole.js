/**
 * AdGPT - Fix Admin Role Script
 * This script lets you set ANY existing Firebase Auth user as admin
 * by providing their email + password, then writing role:'admin' to Firestore.
 *
 * Usage: node scripts/fixAdminRole.js
 */

// ─── Enter the admin's CURRENT working email + password ──────────────────────
const ADMIN_EMAIL    = 'adgpt.admin@gmail.com';
const ADMIN_PASSWORD = 'Admin@123456';   // ← Change this if the password was changed
const ADMIN_NAME     = 'Admin';
// ─────────────────────────────────────────────────────────────────────────────

const API_KEY    = 'AIzaSyC_K8YVpo5yguN2Z0eRA_mKCZlYfuOVjOc';
const PROJECT_ID = 'newadgpt-692fb';

const AUTH_BASE = `https://identitytoolkit.googleapis.com/v1/accounts`;
const FS_BASE   = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function post(url, body, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res  = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || JSON.stringify(json.error || json));
    return json;
}

async function main() {
    console.log('\n🔧 AdGPT - Fix Admin Role Tool');
    console.log('================================');
    console.log(`Email: ${ADMIN_EMAIL}\n`);

    let idToken, uid;

    // Try to sign up first (creates new account if it doesn't exist)
    console.log('Step 1: Attempting to create/sign-in Firebase Auth account...');
    try {
        const data = await post(`${AUTH_BASE}:signUp?key=${API_KEY}`, {
            email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true
        });
        idToken = data.idToken;
        uid     = data.localId;
        console.log('✅ New account created in Firebase Auth.');
    } catch (err) {
        if (err.message.includes('EMAIL_EXISTS')) {
            console.log('ℹ️  Account exists — signing in...');
            try {
                const data = await post(`${AUTH_BASE}:signInWithPassword?key=${API_KEY}`, {
                    email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true
                });
                idToken = data.idToken;
                uid     = data.localId;
                console.log('✅ Signed into existing account.');
            } catch (e2) {
                console.error('\n❌ Sign-in failed:', e2.message);
                console.log('\n🔧 The password for this email has been changed.');
                console.log('   Fix options:');
                console.log('   A) Go to http://localhost:5173/login → click "Forgot Password" to reset it,');
                console.log('      then update ADMIN_PASSWORD in this script and re-run.');
                console.log('   B) Go to Firebase Console → Authentication → find the user → delete it,');
                console.log('      then re-run this script to recreate fresh.');
                console.log('\n   Firebase Console: https://console.firebase.google.com/project/newadgpt-692fb/authentication/users');
                process.exit(1);
            }
        } else {
            throw err;
        }
    }

    // Write Firestore doc with role: 'admin'
    console.log('\nStep 2: Writing role:admin to Firestore...');
    const patchUrl = `${FS_BASE}/users/${uid}`;
    const res = await fetch(patchUrl, {
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

    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Firestore PATCH failed: ' + JSON.stringify(json));

    console.log('✅ Firestore doc updated with role: admin');
    console.log('\n════════════════════════════════════');
    console.log('🎉  ADMIN ACCOUNT READY!');
    console.log('════════════════════════════════════');
    console.log(`   Email    : ${ADMIN_EMAIL}`);
    console.log(`   Password : ${ADMIN_PASSWORD}`);
    console.log(`   UID      : ${uid}`);
    console.log('════════════════════════════════════');
    console.log('\n👉 Go to http://localhost:5173 → Login tab → use above credentials\n');
    process.exit(0);
}

main().catch(err => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
});
