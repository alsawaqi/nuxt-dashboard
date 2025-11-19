<script setup lang="ts">
import { useFlashStore } from '~/stores/flash'

const flash = useFlashStore()
</script>

<template>
  <!-- Put directly under <body> so it really covers everything -->
  <Teleport to="body">
    <Transition name="flash-fade">
      <div v-if="flash.visible" class="flash-overlay">
        <div class="flash-card">
          <div class="flash-glow flash-glow-1"></div>
          <div class="flash-glow flash-glow-2"></div>

          <div class="flash-content">
            <div class="flash-icon-wrapper">
              <span class="flash-icon">✨</span>
            </div>

            <h1 class="flash-title">
              {{ flash.title || 'Welcome!' }}
            </h1>
            <p class="flash-subtitle">
              {{ flash.subtitle || 'Preparing your dashboard...' }}
            </p>

            <div class="flash-redirect-label">
              <span class="flash-line"></span>
              <span>Redirecting</span>
              <span class="flash-line"></span>
            </div>

            <div class="flash-dots">
              <span class="dot dot-1"></span>
              <span class="dot dot-2"></span>
              <span class="dot dot-3"></span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.flash-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.9); /* dark with opacity */
  backdrop-filter: blur(10px);
}

.flash-card {
  position: relative;
  max-width: 420px;
  width: 90%;
  border-radius: 24px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.92), rgba(14, 165, 233, 0.92), rgba(16, 185, 129, 0.92));
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
}

.flash-glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(40px);
  opacity: 0.35;
  pointer-events: none;
}

.flash-glow-1 {
  width: 180px;
  height: 180px;
  top: -60px;
  right: -40px;
  background: rgba(255, 255, 255, 0.7);
}

.flash-glow-2 {
  width: 220px;
  height: 220px;
  bottom: -80px;
  left: -40px;
  background: rgba(125, 211, 252, 0.9);
}

.flash-content {
  position: relative;
  padding: 40px 32px 32px;
  text-align: center;
  color: #fff;
}

.flash-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.flash-icon-wrapper::before {
  content: "";
  position: absolute;
  width: 140px;
  height: 140px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255,255,255,0.4), transparent 60%);
  opacity: 0.5;
}

.flash-icon {
  position: relative;
  font-size: 32px;
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(15, 23, 42, 0.3);
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.4);
}

.flash-title {
  font-size: 24px;
  line-height: 1.2;
  font-weight: 600;
  margin-bottom: 8px;
}

.flash-subtitle {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 18px;
}

.flash-redirect-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  opacity: 0.85;
}

.flash-line {
  display: inline-block;
  width: 32px;
  height: 1px;
  background: rgba(255, 255, 255, 0.7);
}

.flash-dots {
  margin-top: 10px;
  display: flex;
  justify-content: center;
  gap: 6px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  animation: dot-bounce 0.9s infinite ease-in-out;
}

.dot-1 {
  animation-delay: -0.18s;
}
.dot-2 {
  animation-delay: 0s;
}
.dot-3 {
  animation-delay: 0.18s;
}

@keyframes dot-bounce {
  0%, 80%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  40% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

/* Fade + scale transition */
.flash-fade-enter-active,
.flash-fade-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.flash-fade-enter-from,
.flash-fade-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}
</style>
