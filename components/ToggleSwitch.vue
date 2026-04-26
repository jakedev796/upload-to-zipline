<script setup lang="ts">
const model = defineModel<boolean>({ required: true });
defineProps<{ id: string; label: string }>();
</script>

<template>
  <label class="flex items-center justify-between gap-3 cursor-pointer select-none">
    <span class="text-sm text-text">{{ label }}</span>
    <span class="relative inline-block w-9 h-5 shrink-0">
      <input
        :id="id"
        v-model="model"
        type="checkbox"
        class="peer absolute opacity-0 w-0 h-0"
      />
      <span
        class="absolute inset-0 rounded-full bg-border transition-colors
               peer-checked:bg-accent
               peer-focus-visible:ring-2 peer-focus-visible:ring-accent
               before:content-[''] before:absolute before:top-0.5 before:left-0.5
               before:w-4 before:h-4 before:rounded-full before:bg-zinc-200
               before:transition-transform peer-checked:before:translate-x-3.5"
      />
    </span>
  </label>
</template>
