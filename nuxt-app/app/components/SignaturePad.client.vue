<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import SignaturePad from 'signature_pad'

const props = withDefaults(
  defineProps<{
    modelValue: string | null
    height?: number
    disabled?: boolean
  }>(),
  { height: 160, disabled: false }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let pad: SignaturePad | null = null

const resizeCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ratio = Math.max(window.devicePixelRatio || 1, 1)
  const width = canvas.offsetWidth
  const height = props.height

  canvas.width = Math.floor(width * ratio)
  canvas.height = Math.floor(height * ratio)

  const ctx = canvas.getContext('2d')
  if (ctx) ctx.scale(ratio, ratio)

  if (pad && props.modelValue) {
    try { pad.fromDataURL(props.modelValue) } catch {}
  }
}

const clear = () => {
  pad?.clear()
  emit('update:modelValue', null)
}

const isEmpty = () => pad?.isEmpty() ?? true
defineExpose({ clear, isEmpty })

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  pad = new SignaturePad(canvas, { backgroundColor: 'rgba(255,255,255,1)' })
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  pad.addEventListener('endStroke', () => {
    if (!pad) return
    emit('update:modelValue', pad.isEmpty() ? null : pad.toDataURL('image/png'))
  })

  if (props.modelValue) {
    try { pad.fromDataURL(props.modelValue) } catch {}
  }

  if (props.disabled) pad.off()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCanvas)
  pad = null
})

watch(() => props.modelValue, (v) => {
  if (!pad) return
  if (!v) return pad.clear()
  try { pad.fromDataURL(v) } catch {}
})

watch(() => props.disabled, (v) => {
  if (!pad) return
  v ? pad.off() : pad.on()
})
</script>

<template>
  <div class="border rounded p-2 bg-white">
    <div class="w-100" :style="{ height: height + 'px' }">
      <canvas ref="canvasRef" class="w-100 h-100" :style="{ touchAction: 'none' }" />
    </div>

    <div class="d-flex justify-content-end gap-2 mt-2">
      <button type="button" class="btn btn-sm btn-outline-secondary" @click="clear" :disabled="disabled">
        Clear
      </button>
    </div>
  </div>
</template>