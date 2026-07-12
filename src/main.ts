import './assets/main.css'
import './firebase/config'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// Révèle le contenu une fois monté
const el = document.getElementById('app')
if (el) el.style.visibility = 'visible'
