 <script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from '#imports'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const route = useRoute()

/**
 * Active helper:
 * - Exact match: /dashboard/devices
 * - Or nested:   /dashboard/devices/123/edit
 */
const isActive = (path: string) =>
  route.path === path || route.path.startsWith(path + '/')

// ----- Group route lists -----
const statusGroupRoutes = [
  '/dashboard/search',
  '/dashboard/status',
  '/dashboard/locations',
  '/dashboard/ai',
  '/dashboard/ai/overview',
]

const adminGroupRoutes = [
  // Locations
  '/dashboard/countries',
  '/dashboard/regions',
  '/dashboard/cities',
  '/dashboard/organization',
  '/dashboard/main-locations',
  '/dashboard/charity-location',
  // Devices & finance
  '/dashboard/device-brands',
  '/dashboard/device-models',
  '/dashboard/banks',
  '/dashboard/commission-profiles',
  '/dashboard/devices',
]

// Reusable helper
const isInRoutes = (paths: string[]) =>
  paths.some(
    (p) => route.path === p || route.path.startsWith(p + '/')
  )

const isStatusGroupActive = computed(() => isInRoutes(statusGroupRoutes))
const isAdminGroupActive = computed(() => isInRoutes(adminGroupRoutes))
</script>

<template>
  <aside class="sidebar">
    <!-- Close button (handled by your layout JS/CSS) -->
    <button type="button" class="sidebar-close-btn">
      <iconify-icon icon="radix-icons:cross-2"></iconify-icon>
    </button>

    <!-- Logo -->
    <div>
      <NuxtLink to="/dashboard" class="sidebar-logo">
        <img src="https://admin.mithqal.net/logos.png" alt="site logo" class="light-logo" />
        <img src="https://admin.mithqal.net/logos.png" alt="site logo" class="dark-logo" />
        <img src="https://admin.mithqal.net/logos.png" alt="site logo" class="logo-icon" />
      </NuxtLink>
    </div>

    <!-- Menu -->
    <div class="sidebar-menu-area">
      <ul class="sidebar-menu" id="sidebar-menu">
        <!-- ===== Overview ===== -->
        <li class="sidebar-menu-group-title">Overview</li>

        <!-- Dashboard (super admin only) -->
        <li
          v-if="auth.user?.id == 1"
          :class="{ active: isActive('/dashboard') }"
        >
          <NuxtLink to="/dashboard">
            <iconify-icon
              icon="solar:home-smile-angle-outline"
              class="menu-icon"
            ></iconify-icon>
            <span>Dashboard</span>
          </NuxtLink>
        </li>

        <!-- ===== Application ===== -->
        <li class="sidebar-menu-group-title">Application</li>

        <!-- Devices (live kiosks) -->
        <li
          v-if="auth.user?.id == 1"
          :class="{ active: isActive('/dashboard/devices') }"
        >
          <NuxtLink to="/dashboard/devices">
            <iconify-icon icon="mdi:devices" class="menu-icon"></iconify-icon>
            <span>Devices</span>
          </NuxtLink>
        </li>

        <!-- Charities -->
        <li :class="{ active: isActive('/dashboard/charity') }">
          <NuxtLink to="/dashboard/charity">
            <iconify-icon
              icon="mdi:hand-heart-outline"
              class="menu-icon"
            ></iconify-icon>
            <span>Charities</span>
          </NuxtLink>
        </li>

        <!-- Status dropdown (analytics) -->
        <li
          v-show="auth.user?.id == 1"
          class="dropdown"
          :class="{ active: isStatusGroupActive, open: isStatusGroupActive }"
        >
          <a href="javascript:void(0)">
            <iconify-icon
              icon="mdi:chart-box-outline"
              class="menu-icon"
            ></iconify-icon>
            <span>Status</span>
          </a>
          <ul class="sidebar-submenu">
            <!-- Charity Status -->
            <li :class="{ active: isActive('/dashboard/search') }">
              <NuxtLink to="/dashboard/search">
                <iconify-icon
                  icon="mdi:checkbox-marked-circle-outline"
                  class="menu-icon"
                ></iconify-icon>
                <span>Charity Status</span>
              </NuxtLink>
            </li>

            <!-- Status by Device -->
            <li :class="{ active: isActive('/dashboard/status') }">
              <NuxtLink to="/dashboard/status">
                <iconify-icon
                  icon="mdi:devices"
                  class="menu-icon"
                ></iconify-icon>
                <span>Status by Device</span>
              </NuxtLink>
            </li>

            <!-- Status by Location -->
            <li :class="{ active: isActive('/dashboard/locations') }">
              <NuxtLink to="/dashboard/locations">
                <iconify-icon
                  icon="material-symbols:map-outline"
                  class="menu-icon"
                ></iconify-icon>
                <span>Status by Location</span>
              </NuxtLink>
            </li>

            <!-- AI Analysis -->
            <li :class="{ active: isActive('/dashboard/ai') }">
              <NuxtLink to="/dashboard/ai">
                <iconify-icon
                  icon="ri:robot-2-line"
                  class="menu-icon"
                ></iconify-icon>
                <span>AI Analysis</span>
              </NuxtLink>
            </li>

            <!-- AI Overview -->
            <li :class="{ active: isActive('/dashboard/ai/overview') }">
              <NuxtLink to="/dashboard/ai/overview">
                <iconify-icon
                  icon="ri:robot-2-line"
                  class="menu-icon"
                ></iconify-icon>
                <span>AI Overview</span>
              </NuxtLink>
            </li>
          </ul>
        </li>

        <!-- ===== Administration ===== -->
        <li
          v-show="auth.user?.id == 1"
          class="sidebar-menu-group-title"
        >
          Administration
        </li>

        <li
          v-show="auth.user?.id == 1"
          class="dropdown"
          :class="{ active: isAdminGroupActive, open: isAdminGroupActive }"
        >
          <a href="javascript:void(0)">
            <iconify-icon
              icon="mdi:account-cog-outline"
              class="menu-icon"
            ></iconify-icon>
            <span>Admin</span>
          </a>

          <ul class="sidebar-submenu">
            <!-- Locations group label (just visual) -->
            <li class="sidebar-menu-group-title small px-3 mt-2">
              Locations
            </li>

            <li :class="{ active: isActive('/dashboard/countries') }">
              <NuxtLink to="/dashboard/countries">
                <iconify-icon
                  icon="mdi:earth"
                  class="menu-icon"
                ></iconify-icon>
                <span>Countries</span>
              </NuxtLink>
            </li>

            <li :class="{ active: isActive('/dashboard/regions') }">
              <NuxtLink to="/dashboard/regions">
                <iconify-icon
                  icon="mdi:map-search-outline"
                  class="menu-icon"
                ></iconify-icon>
                <span>Regions</span>
              </NuxtLink>
            </li>


             <li :class="{ active: isActive('/dashboard/districts') }">
              <NuxtLink to="/dashboard/districts">
                <iconify-icon
                  icon="mdi:map-search-outline"
                  class="menu-icon"
                ></iconify-icon>
                <span>Districts</span>
              </NuxtLink>
            </li>

            <li :class="{ active: isActive('/dashboard/cities') }">
              <NuxtLink to="/dashboard/cities">
                <iconify-icon
                  icon="mdi:city-variant-outline"
                  class="menu-icon"
                ></iconify-icon>
                <span>Cities</span>
              </NuxtLink>
            </li>

            <li :class="{ active: isActive('/dashboard/organization') }">
              <NuxtLink to="/dashboard/organization">
                <iconify-icon
                  icon="mdi:office-building-outline"
                  class="menu-icon"
                ></iconify-icon>
                <span>Organization</span>
              </NuxtLink>
            </li>

            <li :class="{ active: isActive('/dashboard/main-locations') }">
              <NuxtLink to="/dashboard/main-locations">
                <iconify-icon
                  icon="mdi:map-marker-outline"
                  class="menu-icon"
                ></iconify-icon>
                <span>Main Locations</span>
              </NuxtLink>
            </li>

            <li :class="{ active: isActive('/dashboard/charity-location') }">
              <NuxtLink to="/dashboard/charity-location">
                <iconify-icon
                  icon="mdi:map-marker-radius-outline"
                  class="menu-icon"
                ></iconify-icon>
                <span>Charity Locations</span>
              </NuxtLink>
            </li>

            <!-- Devices & Banking group label -->
            <li class="sidebar-menu-group-title small px-3 mt-3">
              Devices &amp; Finance
            </li>

            <li :class="{ active: isActive('/dashboard/device-brands') }">
              <NuxtLink to="/dashboard/device-brands">
                <iconify-icon
                  icon="mdi:tablet-cellphone"
                  class="menu-icon"
                ></iconify-icon>
                <span>Device Brands</span>
              </NuxtLink>
            </li>

            <li :class="{ active: isActive('/dashboard/device-models') }">
              <NuxtLink to="/dashboard/device-models">
                <iconify-icon
                  icon="mdi:tablet-cellphone"
                  class="menu-icon"
                ></iconify-icon>
                <span>Device Models</span>
              </NuxtLink>
            </li>

            <li :class="{ active: isActive('/dashboard/banks') }">
              <NuxtLink to="/dashboard/banks">
                <iconify-icon
                  icon="mdi:bank-outline"
                  class="menu-icon"
                ></iconify-icon>
                <span>Banks</span>
              </NuxtLink>
            </li>

            <li :class="{ active: isActive('/dashboard/commission-profiles') }">
              <NuxtLink to="/dashboard/commission-profiles">
                <iconify-icon
                  icon="mdi:cash-multiple"
                  class="menu-icon"
                ></iconify-icon>
                <span>Commission Profiles</span>
              </NuxtLink>
            </li>

            <!-- If you want Devices also under Admin, uncomment this and
                 keep the same route so it's not broken:
                   -->
            <li :class="{ active: isActive('/dashboard/device') }">
              <NuxtLink to="/dashboard/device">
                <iconify-icon
                  icon="mdi:devices"
                  class="menu-icon"
                ></iconify-icon>
                <span>Devices</span>
              </NuxtLink>
            </li>
          
          </ul>
        </li>
      </ul>
    </div>
  </aside>
</template>
