import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getDatabase(app)

/**
 * Resolves with the current player's stable uid (from anonymous auth).
 * We use Firebase Anonymous Auth (no email/password, no signup UI) purely
 * so each browser gets a stable, persistent identity (auth.uid) that
 * survives refreshes, and so Realtime Database security rules can
 * restrict who is allowed to read a given player's secret word.
 */
export function waitForAuthUser(): Promise<User> {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsub()
          resolve(user)
        }
      },
      reject
    )
    signInAnonymously(auth).catch((err) => {
      unsub()
      reject(err)
    })
  })
}
