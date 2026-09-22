import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import { router } from './app/router'
import { useUiStore } from './stores/ui'
import { listenConnectivity, runSync } from './sync/runner'

// Fuentes Brújula + Bitácora
import '@fontsource/fraunces/400.css'
import '@fontsource/fraunces/400-italic.css'
import '@fontsource/fraunces/500.css'
import '@fontsource/fraunces/500-italic.css'
import '@fontsource/fraunces/600.css'
import '@fontsource/fraunces/600-italic.css'
import '@fontsource/fraunces/700.css'
import '@fontsource/fraunces/700-italic.css'
import '@fontsource/figtree/400.css'
import '@fontsource/figtree/500.css'
import '@fontsource/figtree/600.css'
import '@fontsource/figtree/700.css'

import './styles/main.css'

registerSW({ immediate: true })

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
useUiStore(pinia).applyTheme()
listenConnectivity()
void runSync()
app.mount('#app')
