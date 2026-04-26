<script setup lang="ts">
import SettingsForm from '@/components/SettingsForm.vue';
</script>

<template>
  <main class="p-4 space-y-4">
    <header class="flex items-center gap-2.5">
      <img src="/icon/48.png" alt="" class="w-6 h-6 rounded-md" />
      <h1 class="text-[15px] font-semibold tracking-tight text-text">Zipline Uploader</h1>
    </header>
    <SettingsForm />
  </main>
</template>
