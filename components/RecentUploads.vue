<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { clearUploadHistory, getUploadHistory } from '@/composables/useHistory';
import { type UploadHistoryItem } from '@/types/settings';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();
const history = ref<UploadHistoryItem[]>([]);
const copiedId = ref<string | null>(null);

async function refreshHistory() {
  history.value = await getUploadHistory();
}

onMounted(() => {
  void refreshHistory();
});

defineExpose({
  refresh: refreshHistory,
});

async function onCopy(item: UploadHistoryItem) {
  try {
    await navigator.clipboard.writeText(item.url);
    copiedId.value = item.id;
    setTimeout(() => {
      if (copiedId.value === item.id) {
        copiedId.value = null;
      }
    }, 2000);
  } catch (err) {
    console.error('Failed to copy URL:', err);
  }
}

async function onClear() {
  await clearUploadHistory();
  history.value = [];
}

function formatTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return t('justNow');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t('minutesAgo', { m: diffMin });
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t('hoursAgo', { h: diffHour });
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
</script>

<template>
  <div v-if="history.length > 0" class="space-y-2">
    <div class="flex items-center justify-between">
      <h3 class="text-[10.5px] tracking-[0.07em] uppercase font-semibold text-text-muted">
        {{ t('recentTitle', { count: history.length, max: 5 }) }}
      </h3>
      <button
        type="button"
        class="text-[11px] text-text-muted hover:text-danger transition cursor-pointer"
        :title="t('clearHistory')"
        @click="onClear"
      >
        {{ t('clearHistory') }}
      </button>
    </div>

    <div class="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5">
      <div
        v-for="item in history"
        :key="item.id"
        class="flex items-center justify-between gap-2.5 p-2 rounded-card bg-panel border border-border hover:border-border/80 transition"
      >
        <div class="flex items-center gap-2 min-w-0">
          <div
            class="w-8 h-8 rounded bg-[#0a0a0c] border border-border flex items-center justify-center overflow-hidden shrink-0"
          >
            <img
              v-if="item.thumbnail"
              :src="item.thumbnail"
              alt=""
              class="w-full h-full object-cover"
            />
            <span v-else class="text-xs">🖼️</span>
          </div>

          <div class="min-w-0">
            <p class="text-xs font-medium text-text truncate max-w-[170px]" :title="item.filename">
              {{ item.filename }}
            </p>
            <p class="text-[10px] text-text-muted">
              {{ formatTime(item.timestamp) }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <button
            type="button"
            class="px-2 py-1 text-[11px] font-medium rounded transition cursor-pointer"
            :class="[
              copiedId === item.id
                ? 'bg-success/20 text-success'
                : 'bg-[#202025] hover:bg-accent hover:text-white text-text-muted',
            ]"
            @click="onCopy(item)"
          >
            {{ copiedId === item.id ? t('copied') : t('copy') }}
          </button>

          <a
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="p-1 text-text-muted hover:text-accent transition text-xs"
            :title="t('openInNewTab')"
          >
            ↗
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
