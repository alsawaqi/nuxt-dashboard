import axios from 'axios'
import { useRuntimeConfig } from '#app'

export default () => {
  const config = useRuntimeConfig()

  return axios.create({
    baseURL: (config.public.apiBase as string) 
  })
}
