<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRuntimeConfig } from '#app'

const props = defineProps<{
  lat: number | null | undefined
  lng: number | null | undefined
  address?: string
}>()

const mapElement = ref<HTMLElement | null>(null)
const mapLoaded = ref(false)

const config = useRuntimeConfig()

// Dynamically load Google Maps JS
const loadGoogleMaps = () => {
  return new Promise<void>((resolve, reject) => {
    if (mapLoaded.value) {
      return resolve()
    }

    // If script already exists
    if (document.getElementById('google-maps-script')) {
      mapLoaded.value = true
      return resolve()
    }

    const apiKey = config.public.googleMapsApiKey
    if (!apiKey) {
      console.warn('Missing GOOGLE_MAPS_API_KEY')
      return reject(new Error('Missing Google Maps API key'))
    }

    const script = document.createElement('script')
    script.id = 'google-maps-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.defer = true
    script.onload = () => {
      mapLoaded.value = true
      resolve()
    }
    script.onerror = (err) => reject(err)

    document.head.appendChild(script)
  })
}

onMounted(async () => {
  if (!props.lat || !props.lng) return
  if (!mapElement.value) return

  try {
    await loadGoogleMaps()

    // @ts-ignore - global google from Maps script
    const center = new google.maps.LatLng(props.lat, props.lng)

    // @ts-ignore
    const map = new google.maps.Map(mapElement.value, {
      center,
      zoom: 16,
      mapTypeId: 'roadmap',
    })

    // @ts-ignore
    new google.maps.Marker({
      position: center,
      map,
      title: props.address || 'Device Location',
    })
  } catch (e) {
    console.error('Error loading Google Maps:', e)
  }
})
</script>

<template>
  <div class="device-map-wrapper">
    <div
      ref="mapElement"
      class="device-map"
    ></div>
    <p v-if="address" class="mt-2 small text-muted">
      {{ address }}
    </p>
  </div>
</template>

<style scoped>
.device-map {
  width: 100%;
  height: 300px;
  border-radius: 8px;
  overflow: hidden;
}
</style>
