import { addDoc, collection } from 'firebase/firestore'
import { db } from './config'

export async function testFirebaseConnection(timeoutMs = 8000) {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Timeout après ${timeoutMs} ms`))
    }, timeoutMs)
  })

  try {
    const docRef = await Promise.race([
      addDoc(collection(db, 'healthcheck'), {
        message: 'Test depuis l’app',
        createdAt: new Date().toISOString(),
      }),
      timeoutPromise,
    ])

    return {
      success: true,
      id: docRef.id,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Firebase test failed:', error)

    return {
      success: false,
      error: message,
    }
  }
}
