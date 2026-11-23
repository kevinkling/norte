import { reactive } from 'vue'

/**
 * Confirmación propia de la app. `window.confirm()` no sirve: en algunos
 * navegadores embebidos (por ejemplo el panel del escritorio) devuelve `false`
 * al instante sin mostrar nada, y la acción parece "no hacer nada".
 */
export const confirmState = reactive({
  open: false,
  message: '',
  confirmLabel: 'Confirmar',
})

let resolver: ((ok: boolean) => void) | null = null

export function askConfirm(message: string, opts: { confirmLabel?: string } = {}): Promise<boolean> {
  resolver?.(false) // si había otra pregunta abierta, se cancela
  confirmState.message = message
  confirmState.confirmLabel = opts.confirmLabel ?? 'Confirmar'
  confirmState.open = true
  return new Promise((resolve) => {
    resolver = resolve
  })
}

export function answerConfirm(ok: boolean): void {
  confirmState.open = false
  resolver?.(ok)
  resolver = null
}
