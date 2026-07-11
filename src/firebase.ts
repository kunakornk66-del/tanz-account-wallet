import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  writeBatch,
  orderBy,
  deleteDoc
} from 'firebase/firestore';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

export { db, auth };

// Helper to generate a random cute sync key (e.g., PAW-1234-5678)
export function generateSyncKey(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'KUMA-';
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  result += '-';
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Check if a sync key exists on Firestore
export async function verifySyncKey(syncKey: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'sync_profiles', syncKey.toUpperCase());
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error("Error verifying sync key:", error);
    return false;
  }
}

// Upload transactions to Cloud under a specific Sync Key
export async function uploadTransactionsToCloud(syncKey: string, transactions: any[]): Promise<boolean> {
  try {
    const key = syncKey.toUpperCase();
    
    // Write profile document
    const profileRef = doc(db, 'sync_profiles', key);
    await setDoc(profileRef, {
      syncKey: key,
      lastSyncedAt: Date.now(),
      transactionCount: transactions.length
    }, { merge: true });

    // Write transactions in batches (max 500 per batch)
    // First clear existing transactions on cloud to ensure absolute parity
    const transCollectionRef = collection(db, 'sync_profiles', key, 'transactions');
    const existingDocs = await getDocs(transCollectionRef);
    
    // Delete existing
    const deleteBatch = writeBatch(db);
    existingDocs.docs.forEach((doc) => {
      deleteBatch.delete(doc.ref);
    });
    await deleteBatch.commit();

    // Upload new
    if (transactions.length > 0) {
      // Chunk transactions into batches of 400
      const chunks = [];
      for (let i = 0; i < transactions.length; i += 400) {
        chunks.push(transactions.slice(i, i + 400));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((tx) => {
          const txRef = doc(db, 'sync_profiles', key, 'transactions', tx.id);
          // Sanitize: remove undefined values by serializing/deserializing via JSON
          const sanitizedTx = JSON.parse(JSON.stringify(tx));
          batch.set(txRef, sanitizedTx);
        });
        await batch.commit();
      }
    }
    return true;
  } catch (error) {
    console.error("Error uploading transactions:", error);
    return false;
  }
}

// Upload customized categories to Cloud under a specific Sync Key
export async function uploadCategoriesToCloud(
  syncKey: string,
  incomeCategories: any[],
  expenseCategories: any[]
): Promise<boolean> {
  try {
    const key = syncKey.toUpperCase();
    const profileRef = doc(db, 'sync_profiles', key);
    
    // Sanitize values
    const sanitizedIncome = JSON.parse(JSON.stringify(incomeCategories));
    const sanitizedExpense = JSON.parse(JSON.stringify(expenseCategories));
    
    await setDoc(profileRef, {
      incomeCategories: sanitizedIncome,
      expenseCategories: sanitizedExpense,
      lastSyncedAt: Date.now()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error uploading categories:", error);
    return false;
  }
}

// Download customized categories from Cloud under a specific Sync Key
export async function downloadCategoriesFromCloud(syncKey: string): Promise<{ incomeCategories: any[], expenseCategories: any[] } | null> {
  try {
    const key = syncKey.toUpperCase();
    const profileRef = doc(db, 'sync_profiles', key);
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.incomeCategories && data.expenseCategories) {
        return {
          incomeCategories: data.incomeCategories,
          expenseCategories: data.expenseCategories
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Error downloading categories:", error);
    return null;
  }
}

// Download transactions from Cloud under a specific Sync Key
export async function downloadTransactionsFromCloud(syncKey: string): Promise<any[] | null> {
  try {
    const key = syncKey.toUpperCase();
    const profileRef = doc(db, 'sync_profiles', key);
    const profileSnap = await getDoc(profileRef);
    
    if (!profileSnap.exists()) {
      return null;
    }

    const transCollectionRef = collection(db, 'sync_profiles', key, 'transactions');
    const q = query(transCollectionRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const transactions: any[] = [];
    querySnapshot.forEach((doc) => {
      transactions.push(doc.data());
    });
    
    return transactions;
  } catch (error) {
    console.error("Error downloading transactions:", error);
    return null;
  }
}

// --- Custom Username & Password Authentication Helpers ---

export interface AuthResult {
  success: boolean;
  message: string;
  syncKey?: string;
  username?: string;
}

/**
 * Validates a username.
 * Must be 3-20 characters and contain only alphanumeric characters or underscores.
 */
export function validateUsername(username: string): { isValid: boolean; message: string } {
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return { isValid: false, message: 'Username ต้องมีความยาวอย่างน้อย 3 ตัวอักษรครับ 🧸' };
  }
  if (trimmed.length > 20) {
    return { isValid: false, message: 'Username ต้องมีความยาวไม่เกิน 20 ตัวอักษรครับ 🧸' };
  }
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(trimmed)) {
    return { isValid: false, message: 'Username ต้องเป็นภาษาอังกฤษ ตัวเลข หรือเครื่องหมาย _ เท่านั้นครับ 🧸' };
  }
  return { isValid: true, message: '' };
}

/**
 * Sign Up a new user with Username and Password.
 * If successful, links the user's account to their current syncKey.
 */
export async function signUpUser(username: string, password: string, syncKey: string): Promise<AuthResult> {
  try {
    const validation = validateUsername(username);
    if (!validation.isValid) {
      return { success: false, message: validation.message };
    }

    if (!password || password.length < 4) {
      return { success: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษรครับ 🔑' };
    }

    const cleanUsername = username.trim().toLowerCase();
    const userRef = doc(db, 'kuma_users', cleanUsername);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return { success: false, message: `ขออภัยครับ Username "${username}" นี้ถูกใช้งานไปแล้วน้า 🥺` };
    }

    // Check if the current syncKey is already owned/claimed by another user
    const q = query(collection(db, 'kuma_users'), where('syncKey', '==', syncKey.toUpperCase()));
    const querySnapshot = await getDocs(q);
    
    let finalSyncKey = syncKey.toUpperCase();
    let isNewKey = false;
    
    if (!querySnapshot.empty) {
      // This sync key is already registered to someone else! We must generate a brand new unique key for safety.
      finalSyncKey = generateSyncKey();
      isNewKey = true;
    }

    // Save user profile with associated sync key
    await setDoc(userRef, {
      username: cleanUsername,
      displayName: username.trim(),
      password: password, // For simple template auth, we store/compare plaintext or basic encoding.
      syncKey: finalSyncKey,
      createdAt: Date.now()
    });

    return { 
      success: true, 
      message: isNewKey
        ? 'สมัครสมาชิกสำเร็จ! คุมะคุงสร้างรหัสบัญชีส่วนตัวใหม่ให้เพื่อความปลอดภัยแล้วครับ 🎉🧸'
        : 'สมัครสมาชิกและเชื่อมต่อบัญชีสำเร็จแล้วครับ! 🎉🧸', 
      syncKey: finalSyncKey,
      username: username.trim()
    };
  } catch (error) {
    console.error("Error signing up user:", error);
    return { success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้งครับ 🥺' };
  }
}

/**
 * Log In an existing user with Username and Password.
 */
export async function loginUser(username: string, password: string): Promise<AuthResult> {
  try {
    if (!username || !password) {
      return { success: false, message: 'กรุณากรอก Username และรหัสผ่านให้ครบถ้วนครับ 🔑' };
    }

    const cleanUsername = username.trim().toLowerCase();
    const userRef = doc(db, 'kuma_users', cleanUsername);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: false, message: 'ไม่พบ Username นี้ในระบบครับ กรุณาตรวจสอบหรือสมัครสมาชิกใหม่น้า 🧸' };
    }

    const userData = userSnap.data();
    if (userData.password !== password) {
      return { success: false, message: 'รหัสผ่านไม่ถูกต้องครับ กรุณาลองใหม่อีกครั้งนะคุมะ 🥺🔑' };
    }

    return {
      success: true,
      message: `ยินดีต้อนรับกลับมาครับคุณ ${userData.displayName || username}! 🧸✨`,
      syncKey: userData.syncKey,
      username: userData.displayName || username
    };
  } catch (error) {
    console.error("Error logging in user:", error);
    return { success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้งครับ 🥺' };
  }
}

/**
 * Log in / Sign up using Google Provider.
 */
export async function loginWithGoogle(syncKey: string): Promise<AuthResult> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    if (!user || !user.email) {
      return { success: false, message: 'ไม่สามารถรับข้อมูลอีเมลจาก Google ได้ครับ 🥺' };
    }

    const email = user.email.toLowerCase();
    const cleanUsername = email.replace(/[@.]/g, '_');
    const userRef = doc(db, 'kuma_users', cleanUsername);
    const userSnap = await getDoc(userRef);

    let finalSyncKey = syncKey.toUpperCase();

    if (userSnap.exists()) {
      const userData = userSnap.data();
      finalSyncKey = userData.syncKey;
    } else {
      const q = query(collection(db, 'kuma_users'), where('syncKey', '==', syncKey.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      let isNewKey = false;
      if (!querySnapshot.empty) {
        finalSyncKey = generateSyncKey();
        isNewKey = true;
      }

      await setDoc(userRef, {
        username: cleanUsername,
        displayName: user.displayName || email.split('@')[0],
        syncKey: finalSyncKey,
        email: email,
        photoURL: user.photoURL || '',
        createdAt: Date.now()
      });
    }

    return {
      success: true,
      message: `ยินดีต้อนรับครับคุณ ${user.displayName || email.split('@')[0]}! 🧸✨`,
      syncKey: finalSyncKey,
      username: user.displayName || email.split('@')[0]
    };
  } catch (error: any) {
    console.error("Error signing in with Google:", error);
    if (error.code === 'auth/popup-blocked') {
      return { success: false, message: 'หน้าต่างป๊อปอัพถูกบล็อก กรุณาอนุญาตป๊อปอัพในเบราว์เซอร์แล้วลองใหม่อีกครั้งนะคุมะ 🥺' };
    }
    if (error.code === 'auth/popup-closed-by-user') {
      return { success: false, message: 'หน้าต่างป๊อปอัพถูกปิดโดยผู้ใช้ กรุณาลองใหม่อีกครั้งน้า 🧸' };
    }
    return { success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ Google Auth กรุณาเปิดแอปในแท็บใหม่เพื่อแก้ปัญหาป๊อปอัพบน iFrame หรือใช้ Username/Password ครับ 🥺' };
  }
}
