<script setup lang="ts">
import SettingsForm from '@/components/SettingsForm.vue';
import LanguageSelect from '@/components/LanguageSelect.vue';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();
</script>

<template>
  <main class="max-w-xl mx-auto p-8 min-h-screen space-y-5">
    <header class="flex items-center justify-between border-b border-border pb-4">
      <div class="flex items-center gap-3">
        <img src="/icon/48.png" alt="" class="w-8 h-8 rounded-lg" />
        <h1 class="text-xl font-semibold tracking-tight text-text">{{ t('appTitle') }}</h1>
      </div>
      <LanguageSelect />
    </header>
    <SettingsForm />
  </main>
</template>
