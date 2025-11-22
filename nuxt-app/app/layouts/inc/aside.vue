<script setup lang="ts">
import { computed } from 'vue'

// Nuxt 3 auto-imports useRoute()
const route = useRoute()

const isActive = (path: string) => route.path === path

const statusGroupRoutes = [
  '/dashboard/search',
  '/dashboard/status',
  '/dashboard/locations',
  '/dashboard/ai',
]

const isStatusGroupActive = computed(() =>
  statusGroupRoutes.includes(route.path)
)
</script>

<template>
  <aside class="sidebar">
    <!-- Close button -->
    <button type="button" class="sidebar-close-btn">
      <iconify-icon icon="radix-icons:cross-2"></iconify-icon>
    </button>

    <!-- Logo -->
    <div>
      <NuxtLink to="/dashboard" class="sidebar-logo">
        <img src="https://admin.mithqal.net/logos.png" alt="site logo" class="light-logo">
        <img src="https://admin.mithqal.net/logos.png" alt="site logo" class="dark-logo">
        <img src="https://admin.mithqal.net/logos.png" alt="site logo" class="logo-icon">
      </NuxtLink>
    </div>

    <!-- Menu -->
    <div class="sidebar-menu-area">
      <ul class="sidebar-menu" id="sidebar-menu">
        <!-- Dashboard -->
        <li :class="{ active: isActive('/dashboard') }">
          <NuxtLink to="/dashboard">
            <iconify-icon icon="solar:home-smile-angle-outline" class="menu-icon"></iconify-icon>
            <span>Dashboard</span>
          </NuxtLink>
        </li>

        <!-- Section title -->
        <li class="sidebar-menu-group-title">Application</li>

        <!-- Devices -->
        <li :class="{ active: isActive('/dashboard/devices') }">
          <NuxtLink to="/dashboard/devices">
            <iconify-icon icon="mdi:devices" class="menu-icon"></iconify-icon>
            <span>Devices</span>
          </NuxtLink>
        </li>

        <!-- Charities -->
        <li :class="{ active: isActive('/dashboard/charity') }">
          <NuxtLink to="/dashboard/charity">
            <iconify-icon icon="mdi:hand-heart-outline" class="menu-icon"></iconify-icon>
            <span>Charities</span>
          </NuxtLink>
        </li>

        <!-- Status dropdown -->
        <li
          class="dropdown"
          :class="{ active: isStatusGroupActive }"
        >
          <a href="javascript:void(0)">
            <!-- Main Status icon: analytics/overview -->
            <iconify-icon icon="mdi:chart-box-outline" class="menu-icon"></iconify-icon>
            <span>Status</span>
          </a>
          <ul class="sidebar-submenu">
            <!-- Charity Status (overall) -->
            <li :class="{ active: isActive('/dashboard/search') }">
              <NuxtLink to="/dashboard/search">
                <iconify-icon icon="mdi:checkbox-marked-circle-outline" class="menu-icon"></iconify-icon>
                <span>Charity Status</span>
              </NuxtLink>
            </li>

            <!-- Status by Device -->
            <li :class="{ active: isActive('/dashboard/status') }">
              <NuxtLink to="/dashboard/status">
                <iconify-icon icon="mdi:devices" class="menu-icon"></iconify-icon>
                <span>Status by Device</span>
              </NuxtLink>
            </li>

            <!-- Status by Location -->
            <li :class="{ active: isActive('/dashboard/locations') }">
              <NuxtLink to="/dashboard/locations">
                <iconify-icon icon="material-symbols:map-outline" class="menu-icon"></iconify-icon>
                <span>Status by Location</span>
              </NuxtLink>
            </li>

            <!-- AI Analysis -->
            <li :class="{ active: isActive('/dashboard/ai') }">
              <NuxtLink to="/dashboard/ai">
                <iconify-icon icon="ri:robot-2-line" class="menu-icon"></iconify-icon>
                <span>AI Analysis</span>
              </NuxtLink>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </aside>
</template>
