<script setup lang="ts">
defineProps<{
  message: string;
  variant: 'success' | 'error' | 'idle';
}>();
</script>

<template>
  <div
    class="text-xs text-center min-h-[18px] mt-2"
    :class="{
      'text-success': variant === 'success',
      'text-danger': variant === 'error',
      'text-text-muted': variant === 'idle',
    }"
  >
    {{ message }}
  </div>
</template>
