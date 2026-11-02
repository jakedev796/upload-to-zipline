<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import SettingsForm from '@/components/SettingsForm.vue';
import QuickActions from '@/components/QuickActions.vue';
import DropZone from '@/components/DropZone.vue';
import RecentUploads from '@/components/RecentUploads.vue';
import StatusMessage from '@/components/StatusMessage.vue';
import LanguageSelect from '@/components/LanguageSelect.vue';
import { loadSettings } from '@/composables/useSettings';
import { useI18n } from '@/composables/useI18n';
import { type Settings } from '@/types/settings';

const { t } = useI18n();
const activeTab = ref<'upload' | 'settings'>('upload');
const settings = ref<Settings | null>(null);
const recentUploadsRef = ref<InstanceType<typeof RecentUploads> | null>(null);

const status = ref<{ message: string; variant: 'success' | 'error' | 'idle' }>({
  message: '',
  variant: 'idle',
});

const isConfigured = computed(() => {
  return Boolean(settings.value?.requestURL && settings.value?.authToken);
});

onMounted(async () => {
  settings.value = await loadSettings();
  if (!isConfigured.value) {
    activeTab.value = 'settings';
  }
});

function setStatus(message: string, variant: 'success' | 'error') {
  status.value = { message, variant };
  setTimeout(() => {
    status.value = { message: '', variant: 'idle' };
  }, 4000);
}

function onUploadStart() {
  status.value = { message: '', variant: 'idle' };
}

function onUploadSuccess(url: string) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).catch(() => {});
  }
  setStatus(t('uploadSuccessClipboard'), 'success');
  recentUploadsRef.value?.refresh();
}

function onUploadError(err: string) {
  setStatus(err, 'error');
}
</script>

<template>
  <main class="p-3.5 space-y-3.5">
    <header class="flex items-center justify-between border-b border-border pb-2.5">
      <div class="flex items-center gap-2">
        <img src="/icon/48.png" alt="Zipline Logo" class="w-5 h-5 rounded" />
        <h1 class="text-sm font-semibold tracking-tight text-text">{{ t('appTitle') }}</h1>
      </div>

      <div class="flex items-center gap-1.5">
        <LanguageSelect />

        <div class="flex items-center gap-1 border-l border-border pl-1.5">
          <button
            type="button"
            class="px-2 py-1 rounded text-xs font-medium transition cursor-pointer"
            :class="[
              activeTab === 'upload'
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text hover:bg-panel',
            ]"
            @click="activeTab = 'upload'"
          >
            {{ t('tabUpload') }}
          </button>
          <button
            type="button"
            class="px-2 py-1 rounded text-xs font-medium transition cursor-pointer flex items-center gap-1"
            :class="[
              activeTab === 'settings'
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text hover:bg-panel',
            ]"
            :title="t('tabSettings')"
            @click="activeTab = 'settings'"
          >
            <span>{{ t('tabSettings') }}</span>
            <span>⚙️</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Missing config warning -->
    <div
      v-if="!isConfigured && activeTab === 'upload'"
      class="p-2.5 rounded-card bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2"
    >
      <span>{{ t('missingConfig') }}</span>
      <button
        type="button"
        class="underline font-semibold hover:text-amber-200 cursor-pointer"
        @click="activeTab = 'settings'"
      >
        {{ t('goToSettings') }}
      </button>
    </div>

    <!-- Status message banner -->
    <StatusMessage :message="status.message" :variant="status.variant" />

    <!-- Upload Hub Tab -->
    <section v-if="activeTab === 'upload'" class="space-y-3">
      <!-- Quick Action Buttons: Area Snip, Visible, Clipboard -->
      <QuickActions
        @upload-start="onUploadStart"
        @upload-success="onUploadSuccess"
        @upload-error="onUploadError"
      />

      <!-- Drag & Drop / File select / Paste zone -->
      <DropZone
        @upload-start="onUploadStart"
        @upload-success="onUploadSuccess"
        @upload-error="onUploadError"
      />

      <!-- Recent 5 Uploads -->
      <RecentUploads ref="recentUploadsRef" />
    </section>

    <!-- Settings Tab -->
    <section v-else class="space-y-3">
      <SettingsForm />
    </section>
  </main>
</template>
