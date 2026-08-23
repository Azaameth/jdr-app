import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

export interface FirebaseEnvLike {
  [key: string]: string | boolean | undefined
  VITE_FIREBASE_API_KEY?: string
  VITE_FIREBASE_AUTH_DOMAIN?: string
  VITE_FIREBASE_PROJECT_ID?: string
  VITE_FIREBASE_STORAGE_BUCKET?: string
  VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  VITE_FIREBASE_APP_ID?: string
  VITE_FIREBASE_MEASUREMENT_ID?: string
}

export function resolveFirebaseConfig(env: FirebaseEnvLike = import.meta.env as FirebaseEnvLike) {
  const config = {
    apiKey: (env.VITE_FIREBASE_API_KEY as string | undefined) ?? '',
    authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) ?? '',
    projectId: (env.VITE_FIREBASE_PROJECT_ID as string | undefined) ?? '',
    storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) ?? '',
    messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) ?? '',
    appId: (env.VITE_FIREBASE_APP_ID as string | undefined) ?? '',
    measurementId: (env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined) ?? '',
  }

  const hasRequiredConfig = Boolean(config.apiKey && config.authDomain && config.projectId)

  return { config, hasRequiredConfig }
}

const { config, hasRequiredConfig } = resolveFirebaseConfig()

let app: ReturnType<typeof initializeApp> | undefined
let authInstance: ReturnType<typeof getAuth> | undefined
let dbInstance: ReturnType<typeof getFirestore> | undefined
let analyticsInstance: ReturnType<typeof getAnalytics> | undefined
let googleProviderInstance: GoogleAuthProvider | undefined

if (hasRequiredConfig) {
  app = initializeApp(config)
  authInstance = getAuth(app)
  dbInstance = getFirestore(app)

  // Local verification only — point the client at the Firebase Local
  // Emulator Suite (see `firebase.json`, `npm run emulators`) instead of
  // the real project. Never on by default; opt in via .env.local.
  if ((import.meta.env as FirebaseEnvLike).VITE_USE_FIREBASE_EMULATOR === 'true') {
    try {
      connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true })
      connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080)
    } catch {
      // Vite HMR can re-run this module; the SDKs throw if you connect to
      // an emulator twice on the same instance. Safe to ignore.
    }
  }

  try {
    // getAnalytics() can throw in environments without the browser
    // capabilities it needs (no IndexedDB, insecure context, some
    // test/webview contexts) — that must not take Auth/Firestore down too.
    analyticsInstance = getAnalytics(app)
  } catch {
    analyticsInstance = undefined
  }
  googleProviderInstance = new GoogleAuthProvider()
}

export const auth = authInstance
export const db = dbInstance
export const analytics = analyticsInstance
export const googleProvider = googleProviderInstance
export const isFirebaseConfigured = hasRequiredConfig
