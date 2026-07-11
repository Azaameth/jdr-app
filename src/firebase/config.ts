import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

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
  analyticsInstance = getAnalytics(app)
  googleProviderInstance = new GoogleAuthProvider()
}

export const auth = authInstance
export const db = dbInstance
export const analytics = analyticsInstance
export const googleProvider = googleProviderInstance
export const isFirebaseConfigured = hasRequiredConfig
