<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();

const emit = defineEmits<{
  (e: 'uploadSuccess', url: string): void;
  (e: 'uploadError', err: string): void;
  (e: 'uploadStart'): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const isDraggingOver = ref(false);
const isUploading = ref(false);
const uploadStatusText = ref('');

onMounted(() => {
  window.addEventListener('paste', onWindowPaste);
});

onBeforeUnmount(() => {
  window.removeEventListener('paste', onWindowPaste);
});

async function onWindowPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items;
  if (!items || items.length === 0) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        await handleUploadFile(file, `paste-${Date.now()}.${file.type.split('/')[1] || 'png'}`);
        return;
      }
    }
  }
}

function onClickBox() {
  if (isUploading.value) return;
  fileInput.value?.click();
}

function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;
  const file = files[0];
  void handleUploadFile(file, file.name);
  target.value = '';
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  isDraggingOver.value = true;
}

function onDragLeave() {
  isDraggingOver.value = false;
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  isDraggingOver.value = false;
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;
  const file = files[0];
  void handleUploadFile(file, file.name);
}

async function handleUploadFile(file: File, filename: string) {
  if (isUploading.value) return;
  isUploading.value = true;
  uploadStatusText.value = t('readingFile');
  emit('uploadStart');

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    uploadStatusText.value = t('uploading');
    const res = (await browser.runtime.sendMessage({
      action: 'uploadBlob',
      dataUrl,
      filename,
    })) as { success: boolean; url?: string; error?: string };

    if (res?.success && res.url) {
      emit('uploadSuccess', res.url);
    } else {
      emit('uploadError', res?.error || t('uploadFailed', { msg: '' }));
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    emit('uploadError', t('uploadFailed', { msg }));
  } finally {
    isUploading.value = false;
    uploadStatusText.value = '';
  }
}
</script>

<template>
  <div
    class="relative border-2 border-dashed rounded-card p-4 text-center transition-colors cursor-pointer select-none"
    :class="[
      isDraggingOver
        ? 'border-accent bg-accent/10'
        : 'border-border bg-panel hover:border-accent/60 hover:bg-[#1c1c20]',
      isUploading ? 'opacity-80 pointer-events-none' : '',
    ]"
    @click="onClickBox"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <input
      ref="fileInput"
      type="file"
      accept="image/*,video/*,audio/*"
      class="hidden"
      @change="onFileSelected"
    />

    <div v-if="isUploading" class="py-3 flex flex-col items-center justify-center gap-2">
      <div class="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs text-text-muted">{{ uploadStatusText }}</p>
    </div>

    <div v-else class="py-2 flex flex-col items-center justify-center gap-1.5">
      <div class="text-2xl opacity-80">📁</div>
      <p class="text-xs font-medium text-text">
        {{ t('dropPrompt') }}
      </p>
      <p class="text-[11px] text-text-muted flex items-center justify-center gap-1">
        <span>{{ t('pastePrompt', { key: '' }).split('{key}')[0] }}</span>
        <kbd class="px-1.5 py-0.5 rounded bg-[#202025] border border-border text-[10px]">Ctrl+V</kbd>
        <span>{{ t('pastePrompt', { key: '' }).split('{key}')[1] }}</span>
      </p>
    </div>
  </div>
</template>
