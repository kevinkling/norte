import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import { router } from './app/router'
import { useUiStore } from './stores/ui'
import { listenConnectivity, runSync } from './sync/runner'
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
