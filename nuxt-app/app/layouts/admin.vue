<script setup lang="ts">
import Aside from './inc/aside.vue'
import Navbar from './inc/navbar.vue'
import Footer from './inc/footer.vue'

</script>
<template>
    <Aside />
    <main class="dashboard-main">
        <Navbar />
        <slot />
        <Footer />
    </main>

</template>