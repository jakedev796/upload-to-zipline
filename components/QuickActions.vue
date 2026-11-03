<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { isProtectedUrl } from '@/utils/url';
import { MissingConfigError, uploadToZipline } from '@/utils/upload';

const { t } = useI18n();

const emit = defineEmits<{
  (e: 'uploadSuccess', url: string): void;
  (e: 'uploadError', err: string): void;
  (e: 'uploadStart'): void;
}>();

const isCapturingVisible = ref(false);
const isReadingClipboard = ref(false);

async function onAreaSnip() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      emit('uploadError', t('areaSnipTabError'));
      return;
    }
    if (isProtectedUrl(tab.url)) {
      emit('uploadError', t('notifyProtectedPageNoticeMsg'));
      return;
    }
    // Inform background to start area snip
    const res = (await browser.runtime.sendMessage({ action: 'startAreaSnip' })) as {
      success: boolean;
      error?: string;
    } | void;
    if (res && res.success === false) {
      emit('uploadError', res.error || t('areaSnipTabError'));
      return;
    }
    // Close popup so user can drag on the page
    window.close();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    emit('uploadError', t('areaSnipFailed', { msg }));
  }
}

async function onCaptureVisible() {
  if (isCapturingVisible.value) return;
  isCapturingVisible.value = true;
  emit('uploadStart');
  try {
    const res = (await browser.runtime.sendMessage({ action: 'captureVisible' })) as {
      success: boolean;
      url?: string;
      error?: string;
    };
    if (res?.success && res.url) {
      emit('uploadSuccess', res.url);
    } else {
      emit('uploadError', res?.error || t('captureVisibleFailed', { msg: '' }));
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    emit('uploadError', t('captureVisibleFailed', { msg }));
  } finally {
    isCapturingVisible.value = false;
  }
}

async function requestClipboardPermission(): Promise<boolean> {
  try {
    if (browser.permissions?.request) {
      return await browser.permissions.request({ permissions: ['clipboardRead'] });
    }
  } catch (err) {
    console.warn('Clipboard permission request failed:', err);
  }
  return true;
}

async function onUploadClipboard() {
  if (isReadingClipboard.value) return;
  isReadingClipboard.value = true;
  emit('uploadStart');

  try {
    const granted = await requestClipboardPermission();
    if (!granted) {
      emit('uploadError', t('clipboardPermissionDenied'));
      return;
    }

    let imageBlob: Blob | null = null;
    let filename = `clipboard-${Date.now()}.png`;

    if (navigator.clipboard?.read) {
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              imageBlob = await item.getType(type);
              filename = `clipboard-${Date.now()}.${type.split('/')[1] || 'png'}`;
              break;
            }
          }
          if (imageBlob) break;
        }
      } catch {
        // Permission denied or empty
      }
    }

    if (!imageBlob) {
      emit('uploadError', t('noImageInClipboard'));
      return;
    }

    const url = await uploadToZipline(imageBlob, filename);
    emit('uploadSuccess', url);
  } catch (err: unknown) {
    if (err instanceof MissingConfigError) {
      emit('uploadError', t('missingConfig'));
      return;
    }
    const msg = err instanceof Error ? err.message : String(err);
    emit('uploadError', t('clipboardUploadFailed', { msg }));
  } finally {
    isReadingClipboard.value = false;
  }
}
</script>

<template>
  <div class="grid grid-cols-3 gap-2">
    <button
      type="button"
      class="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-card bg-panel border border-border
             hover:border-accent hover:bg-[#202025] active:translate-y-px transition cursor-pointer group"
      :title="t('areaSnipTitle')"
      @click="onAreaSnip"
    >
      <span class="text-lg group-hover:scale-110 transition-transform">✂️</span>
      <span class="text-xs font-medium text-text group-hover:text-accent">{{ t('areaSnip') }}</span>
    </button>

    <button
      type="button"
      :disabled="isCapturingVisible"
      class="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-card bg-panel border border-border
             hover:border-accent hover:bg-[#202025] active:translate-y-px transition cursor-pointer group disabled:opacity-50"
      :title="t('captureVisibleTitle')"
      @click="onCaptureVisible"
    >
      <span class="text-lg group-hover:scale-110 transition-transform">
        {{ isCapturingVisible ? '⏳' : '🖥️' }}
      </span>
      <span class="text-xs font-medium text-text group-hover:text-accent">
        {{ isCapturingVisible ? t('capturing') : t('captureVisible') }}
      </span>
    </button>

    <button
      type="button"
      :disabled="isReadingClipboard"
      class="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-card bg-panel border border-border
             hover:border-accent hover:bg-[#202025] active:translate-y-px transition cursor-pointer group disabled:opacity-50"
      :title="t('clipboardUploadTitle')"
      @click="onUploadClipboard"
    >
      <span class="text-lg group-hover:scale-110 transition-transform">
        {{ isReadingClipboard ? '⏳' : '📋' }}
      </span>
      <span class="text-xs font-medium text-text group-hover:text-accent">
        {{ isReadingClipboard ? t('readingClipboard') : t('clipboardUpload') }}
      </span>
    </button>
  </div>
</template>
