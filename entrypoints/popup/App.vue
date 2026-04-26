<script setup lang="ts">
import SettingsForm from '@/components/SettingsForm.vue';
</script>

<template>
  <main class="p-4 space-y-4">
    <header class="flex items-center gap-2.5">
      <div class="w-6 h-6 rounded-md bg-gradient-to-br from-accent to-[#5b3df2]"></div>
      <h1 class="text-[15px] font-semibold tracking-tight text-text">Zipline Uploader</h1>
    </header>
    <SettingsForm />
  </main>
</template>
