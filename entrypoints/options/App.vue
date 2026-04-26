<script setup lang="ts">
import SettingsForm from '@/components/SettingsForm.vue';
</script>

<template>
  <main class="max-w-xl mx-auto p-8 min-h-screen space-y-5">
    <header class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-[#5b3df2]"></div>
      <h1 class="text-xl font-semibold tracking-tight text-text">Zipline Uploader</h1>
    </header>
    <SettingsForm />
  </main>
</template>
