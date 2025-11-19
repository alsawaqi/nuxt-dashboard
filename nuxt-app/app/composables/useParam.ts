import { useRoute } from 'vue-router'

export const useParam = (key: string) => {
  return useRoute().params[key]?.toString() || ''
}
