<script setup lang="ts">
import type { WeatherIcon } from '../utils/weather'

defineProps<{ name: WeatherIcon }>()
</script>

<template>
  <svg
    class="flex-none"
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'sun'">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </template>
    <template v-else-if="name === 'cloud-sun'">
      <circle cx="8.5" cy="8.5" r="3" />
      <path d="M8.5 3.6v1.2M3.6 8.5h1.2M5 5l.9.9M12 5l-.9.9" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 .3-7 4.5 4.5 0 0 0-8.5-1A3.2 3.2 0 0 0 9 19Z" />
    </template>
    <template v-else-if="name === 'cloud'">
      <path d="M6.5 18.5h11a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.2A3.4 3.4 0 0 0 6.5 18.5Z" />
    </template>
    <template v-else-if="name === 'fog'">
      <path d="M6.5 14.5h11a3.5 3.5 0 0 0-1-6.9 5 5 0 0 0-9.4 1.3A3.4 3.4 0 0 0 6.5 14.5Z" />
      <path d="M4 18h16M6 21h12" />
    </template>
    <template v-else-if="name === 'drizzle'">
      <path d="M6.5 14.5h11a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.2A3.4 3.4 0 0 0 6.5 14.5Z" />
      <path d="M9 18v1.5M15 18v1.5" />
    </template>
    <template v-else-if="name === 'rain'">
      <path d="M6.5 14.5h11a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.2A3.4 3.4 0 0 0 6.5 14.5Z" />
      <path d="M9 17.5 8 21M12.5 17.5 11.5 21M16 17.5 15 21" />
    </template>
    <template v-else-if="name === 'snow'">
      <path d="M6.5 14h11a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.2A3.4 3.4 0 0 0 6.5 14Z" />
      <path d="M9 18.5h.01M12.5 20h.01M16 18.5h.01" />
    </template>
    <template v-else>
      <path d="M6.5 14h11a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6-1.2A3.4 3.4 0 0 0 6.5 14Z" />
      <path d="m13 16.5-2.4 3.6h3l-2 3" />
    </template>
  </svg>
</template>
