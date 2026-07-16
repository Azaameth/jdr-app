import './assets/main.css'
import './firebase/config'

import { createApp, nextTick } from 'vue'

import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')

// Révèle le contenu une fois monté
nextTick(() => {
  const el = document.getElementById('app')
  if (el) el.style.visibility = 'visible'
})
