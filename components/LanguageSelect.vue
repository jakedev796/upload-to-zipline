<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { LOCALE_OPTIONS, type Locale } from '@/types/settings';

const { locale, setLocale, t } = useI18n();

function onChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  if (target?.value) {
    void setLocale(target.value as Locale);
  }
}
</script>

<template>
  <div class="relative inline-flex items-center">
    <span class="absolute left-2 text-xs pointer-events-none opacity-70">🌐</span>
    <select
      :value="locale"
      class="bg-panel hover:bg-[#202025] text-text-muted hover:text-text border border-border rounded px-2.5 py-1 pl-6 text-xs
             focus:outline-none focus:border-accent cursor-pointer transition appearance-none pr-5"
      :title="t('language')"
      @change="onChange"
    >
      <option
        v-for="opt in LOCALE_OPTIONS"
        :key="opt.value"
        :value="opt.value"
        class="bg-[#121215] text-text"
      >
        {{ opt.label }}
      </option>
    </select>
    <span class="absolute right-1.5 text-[9px] text-text-muted pointer-events-none">▼</span>
  </div>
</template>

