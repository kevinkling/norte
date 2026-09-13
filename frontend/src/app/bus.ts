import { ref } from 'vue'

export const dataTick = ref(0)

export function notifyDataChanged(): void {
  dataTick.value += 1
}
