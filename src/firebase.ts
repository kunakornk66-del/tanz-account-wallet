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
  deleteDoc,
  onSnapshot
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

// Real-time listener for transactions
export function subscribeToTransactions(
  syncKey: string,
  onData: (transactions: any[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!syncKey) return () => {};
  try {
    const key = syncKey.toUpperCase();
    const transCollectionRef = collection(db, 'sync_profiles', key, 'transactions');
    const q = query(transCollectionRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const transactions: any[] = [];
      snapshot.forEach((docSnap) => {
        transactions.push(docSnap.data());
      });
      onData(transactions);
    }, (error) => {
      console.error("Error listening to transactions:", error);
      if (onError) onError(error);
    });
  } catch (err) {
    console.error("Error setting up subscribeToTransactions:", err);
    return () => {};
  }
}

// Real-time listener for profile (theme, categories, budgets & goals)
export function subscribeToProfile(
  syncKey: string,
  onData: (data: { 
    incomeCategories?: any[]; 
    expenseCategories?: any[]; 
    themeId?: string;
    monthlyBudgets?: Record<string, number>;
    savingsGoals?: any[];
  }) => void,
  onError?: (err: any) => void
): () => void {
  if (!syncKey) return () => {};
  try {
    const key = syncKey.toUpperCase();
    const profileRef = doc(db, 'sync_profiles', key);

    return onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        onData(snap.data() as any);
      }
    }, (error) => {
      console.error("Error listening to profile:", error);
      if (onError) onError(error);
    });
  } catch (err) {
    console.error("Error setting up subscribeToProfile:", err);
    return () => {};
  }
}

// Save or update a single transaction in Cloud
export async function saveTransactionToCloud(syncKey: string, tx: any): Promise<boolean> {
  try {
    if (!syncKey || !tx || !tx.id) return false;
    const key = syncKey.toUpperCase();
    const txRef = doc(db, 'sync_profiles', key, 'transactions', tx.id);
    const sanitizedTx = JSON.parse(JSON.stringify(tx));
    await setDoc(txRef, sanitizedTx);

    // Update profile metadata
    const profileRef = doc(db, 'sync_profiles', key);
    await setDoc(profileRef, {
      lastSyncedAt: Date.now()
    }, { merge: true });

    return true;
  } catch (error) {
    console.error("Error saving transaction to cloud:", error);
    return false;
  }
}

// Delete a single transaction from Cloud
export async function deleteTransactionFromCloud(syncKey: string, txId: string): Promise<boolean> {
  try {
    if (!syncKey || !txId) return false;
    const key = syncKey.toUpperCase();
    const txRef = doc(db, 'sync_profiles', key, 'transactions', txId);
    await deleteDoc(txRef);

    // Update profile metadata
    const transCollectionRef = collection(db, 'sync_profiles', key, 'transactions');
    const snap = await getDocs(transCollectionRef);
    const profileRef = doc(db, 'sync_profiles', key);
    await setDoc(profileRef, {
      lastSyncedAt: Date.now(),
      transactionCount: snap.size
    }, { merge: true });

    return true;
  } catch (error) {
    console.error("Error deleting transaction from cloud:", error);
    return false;
  }
}

// Upload transactions to Cloud under a specific Sync Key in safe chunks
export async function uploadTransactionsToCloud(syncKey: string, transactions: any[]): Promise<boolean> {
  try {
    if (!syncKey) return false;
    const key = syncKey.toUpperCase();
    
    // Write profile document metadata
    const profileRef = doc(db, 'sync_profiles', key);
    await setDoc(profileRef, {
      syncKey: key,
      lastSyncedAt: Date.now(),
      transactionCount: transactions.length
    }, { merge: true });

    const transCollectionRef = collection(db, 'sync_profiles', key, 'transactions');
    const existingDocs = await getDocs(transCollectionRef);
    
    const currentTxIds = new Set(transactions.map(t => t.id));
    
    // 1. Delete docs that are no longer present in transactions (in chunks of 400)
    const docsToDelete = existingDocs.docs.filter(docSnap => !currentTxIds.has(docSnap.id));
    for (let i = 0; i < docsToDelete.length; i += 400) {
      const chunk = docsToDelete.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach(docSnap => batch.delete(docSnap.ref));
      await batch.commit();
    }

    // 2. Set/Write current transactions (in chunks of 400)
    for (let i = 0; i < transactions.length; i += 400) {
      const chunk = transactions.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach(tx => {
        const txRef = doc(db, 'sync_profiles', key, 'transactions', tx.id);
        const sanitizedTx = JSON.parse(JSON.stringify(tx));
        batch.set(txRef, sanitizedTx);
      });
      await batch.commit();
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

// Upload selected theme to Cloud under a specific Sync Key
export async function uploadThemeToCloud(syncKey: string, themeId: string): Promise<boolean> {
  try {
    const key = syncKey.toUpperCase();
    const profileRef = doc(db, 'sync_profiles', key);
    await setDoc(profileRef, {
      themeId: themeId,
      lastSyncedAt: Date.now()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error uploading theme:", error);
    return false;
  }
}

// Upload full user profile data (theme, categories, budgets, goals) to Cloud
export async function uploadUserProfileToCloud(
  syncKey: string,
  profileData: {
    themeId?: string;
    incomeCategories?: any[];
    expenseCategories?: any[];
    monthlyBudgets?: Record<string, number>;
    savingsGoals?: any[];
  }
): Promise<boolean> {
  try {
    if (!syncKey) return false;
    const key = syncKey.toUpperCase();
    const profileRef = doc(db, 'sync_profiles', key);
    const sanitized = JSON.parse(JSON.stringify(profileData));
    sanitized.lastSyncedAt = Date.now();
    await setDoc(profileRef, sanitized, { merge: true });
    return true;
  } catch (error) {
    console.error("Error uploading profile data to cloud:", error);
    return false;
  }
}

// Download full user profile data from Cloud
export async function downloadUserProfileFromCloud(syncKey: string): Promise<{
  themeId?: string;
  incomeCategories?: any[];
  expenseCategories?: any[];
  monthlyBudgets?: Record<string, number>;
  savingsGoals?: any[];
} | null> {
  try {
    if (!syncKey) return null;
    const key = syncKey.toUpperCase();
    const profileRef = doc(db, 'sync_profiles', key);
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      return snap.data() as any;
    }
    return null;
  } catch (error) {
    console.error("Error downloading profile data from cloud:", error);
    return null;
  }
}

// Download selected theme from Cloud under a specific Sync Key
export async function downloadThemeFromCloud(syncKey: string): Promise<string | null> {
  try {
    const key = syncKey.toUpperCase();
    const profileRef = doc(db, 'sync_profiles', key);
    const snap = await getDoc(profileRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.themeId) {
        return data.themeId as string;
      }
    }
    return null;
  } catch (error) {
    console.error("Error downloading theme:", error);
    return null;
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

// Clear all cloud data (transactions & profile info) under a specific Sync Key
export async function clearAllCloudData(syncKey: string, defaultIncomeCats: any[], defaultExpenseCats: any[]): Promise<boolean> {
  try {
    if (!syncKey) return false;
    const key = syncKey.toUpperCase();

    // 1. Reset profile doc
    const profileRef = doc(db, 'sync_profiles', key);
    await setDoc(profileRef, {
      syncKey: key,
      lastSyncedAt: Date.now(),
      transactionCount: 0,
      monthlyBudgets: {},
      savingsGoals: [],
      incomeCategories: JSON.parse(JSON.stringify(defaultIncomeCats)),
      expenseCategories: JSON.parse(JSON.stringify(defaultExpenseCats))
    });

    // 2. Delete ALL transactions in subcollection in chunks of 400
    const transCollectionRef = collection(db, 'sync_profiles', key, 'transactions');
    const existingDocs = await getDocs(transCollectionRef);
    
    for (let i = 0; i < existingDocs.docs.length; i += 400) {
      const chunk = existingDocs.docs.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach(docSnap => batch.delete(docSnap.ref));
      await batch.commit();
    }

    return true;
  } catch (error) {
    console.error("Error clearing all cloud data:", error);
    return false;
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
 * Validates a username or email address.
 * Allows standard usernames or full Gmail/email addresses.
 */
export function validateUsername(username: string): { isValid: boolean; message: string } {
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return { isValid: false, message: 'กรุณากรอก Email หรือ Username อย่างน้อย 3 ตัวอักษรครับ 🧸' };
  }
  if (trimmed.length > 60) {
    return { isValid: false, message: 'Email หรือ Username ยาวเกินไปครับ 🧸' };
  }
  // Allow letters, numbers, @, ., _, -
  const emailOrUsernameRegex = /^[a-zA-Z0-9_@.-]+$/;
  if (!emailOrUsernameRegex.test(trimmed)) {
    return { isValid: false, message: 'กรุณากรอก Email หรือ Username ด้วยตัวอักษรภาษาอังกฤษ ตัวเลข @ . _ - เท่านั้นครับ 🧸' };
  }
  return { isValid: true, message: '' };
}

/**
 * Sign Up a new user with Gmail/Email or Username and Password.
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

    const rawInput = username.trim().toLowerCase();
    // Convert email characters like @ and . into safe firestore document ID
    const cleanUsername = rawInput.replace(/[@.]/g, '_');
    const userRef = doc(db, 'kuma_users', cleanUsername);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return { success: false, message: `ขออภัยครับ บัญชีหรืออีเมล "${username}" นี้มีในระบบแล้ว สามารถกดเข้าสู่ระบบได้เลยครับ 🧸` };
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

    // Save shopEmail in localStorage for quick reference
    if (rawInput.includes('@')) {
      try {
        localStorage.setItem('shopEmail', rawInput);
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
    }

    // Save user profile with associated sync key
    await setDoc(userRef, {
      username: cleanUsername,
      rawUsername: rawInput,
      email: rawInput.includes('@') ? rawInput : '',
      displayName: rawInput.includes('@') ? rawInput.split('@')[0] : username.trim(),
      password: password,
      syncKey: finalSyncKey,
      createdAt: Date.now()
    });

    return { 
      success: true, 
      message: isNewKey
        ? 'สมัครสมาชิกสำเร็จ! คุมะคุงสร้างรหัสบัญชีส่วนตัวใหม่ให้เพื่อความปลอดภัยแล้วครับ 🎉🧸'
        : 'สมัครสมาชิกและเชื่อมต่อบัญชีสำเร็จแล้วครับ! 🎉🧸', 
      syncKey: finalSyncKey,
      username: rawInput.includes('@') ? rawInput.split('@')[0] : username.trim()
    };
  } catch (error) {
    console.error("Error signing up user:", error);
    return { success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้งครับ 🥺' };
  }
}

/**
 * Log In an existing user with Gmail/Email or Username and Password.
 */
export async function loginUser(username: string, password: string): Promise<AuthResult> {
  try {
    if (!username || !password) {
      return { success: false, message: 'กรุณากรอก Email/Username และรหัสผ่านให้ครบถ้วนครับ 🔑' };
    }

    const rawInput = username.trim().toLowerCase();
    const cleanUsername = rawInput.replace(/[@.]/g, '_');
    
    // First try directly with document key
    let userRef = doc(db, 'kuma_users', cleanUsername);
    let userSnap = await getDoc(userRef);

    // If not found, try searching by rawUsername or email field
    if (!userSnap.exists()) {
      const q = query(collection(db, 'kuma_users'), where('rawUsername', '==', rawInput));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        userSnap = querySnapshot.docs[0];
      }
    }

    if (!userSnap.exists()) {
      return { success: false, message: 'ไม่เทียบบัญชีนี้ในระบบครับ กรุณาตรวจสอบ Email/Username หรือกดสมัครสมาชิกใหม่น้า 🧸' };
    }

    const userData = userSnap.data();
    if (userData.password !== password) {
      return { success: false, message: 'รหัสผ่านไม่ถูกต้องครับ กรุณาลองใหม่อีกครั้งนะคุมะ 🥺🔑' };
    }

    // Save shopEmail in localStorage if email exists
    if (userData.email || rawInput.includes('@')) {
      try {
        localStorage.setItem('shopEmail', userData.email || rawInput);
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
    }

    return {
      success: true,
      message: `ยินดีต้อนรับกลับมาครับคุณ ${userData.displayName || rawInput}! 🧸✨`,
      syncKey: userData.syncKey,
      username: userData.displayName || rawInput
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
    
    // Save shopEmail in localStorage as requested
    try {
      localStorage.setItem('shopEmail', email);
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }

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
    const code = error?.code || '';
    
    if (code === 'auth/operation-not-allowed') {
      return { 
        success: false, 
        message: 'ยังไม่ได้เปิดใช้งาน Google Sign-in ใน Firebase Console! กรุณาไปที่ Firebase Console > Authentication > Sign-in method > กด Enable Google และเลือก Project support email ครับ' 
      };
    }
    if (code === 'auth/unauthorized-domain') {
      return { 
        success: false, 
        message: `โดเมนนี้ยังไม่ได้อนุญาตใน Firebase! กรุณาไปที่ Firebase Console > Authentication > Settings > Authorized domains แล้วเพิ่มโดเมน (${typeof window !== 'undefined' ? window.location.hostname : 'แอปของคุณ'})` 
      };
    }
    if (code === 'auth/popup-blocked') {
      return { success: false, message: 'หน้าต่างป๊อปอัพถูกบล็อกโดยเบราว์เซอร์ กรุณาอนุญาตให้แสดง Pop-up แล้วลองใหม่อีกครั้งครับ 🥺' };
    }
    if (code === 'auth/popup-closed-by-user') {
      return { success: false, message: 'หน้าต่างเข้าสู่ระบบ Google ถูกปิดโดยผู้ใช้ 🧸' };
    }
    if (code === 'auth/cancelled-popup-request') {
      return { success: false, message: 'มีการเปิดป๊อปอัพซ้ำ กรุณากดลองอีกครั้งครับ' };
    }

    return { 
      success: false, 
      message: `เกิดข้อผิดพลาด Google Auth (${code}): ${error.message || 'ไม่สามารถเชื่อมต่อได้'} กรุณาลองเปิดแอปในแท็บใหม่ หรือลองใช้ Username/Password ครับ` 
    };
  }
}
