<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  loadSettings,
  notifyMenusToRebuild,
  saveSettings,
} from '@/composables/useSettings';
import { useI18n, type TranslationKey } from '@/composables/useI18n';
import {
  DEFAULT_SETTINGS,
  EXPIRY_PRESETS,
  IMAGE_FORMATS,
  LOCALE_OPTIONS,
  type Locale,
  type Settings,
} from '@/types/settings';
import ToggleSwitch from './ToggleSwitch.vue';
import StatusMessage from './StatusMessage.vue';

const { t, locale, setLocale } = useI18n();
const settings = ref<Settings>({ ...DEFAULT_SETTINGS });
const customExpiryOption = ref<{ value: string; label: string } | null>(null);
const status = ref<{ message: string; variant: 'success' | 'error' | 'idle' }>({
  message: '',
  variant: 'idle',
});

const localizedExpiryPresets = computed(() => {
  return EXPIRY_PRESETS.map((preset) => ({
    value: preset.value,
    label: t(`expiry_${preset.value}` as TranslationKey),
  }));
});

onMounted(async () => {
  const loaded = await loadSettings();
  settings.value = loaded;
  if (loaded.locale && loaded.locale !== locale.value) {
    void setLocale(loaded.locale);
  }
  const inPresets = EXPIRY_PRESETS.some((p) => p.value === loaded.expiryTime);
  if (loaded.expiryTime && !inPresets) {
    customExpiryOption.value = {
      value: loaded.expiryTime,
      label: t('expiry_custom', { time: loaded.expiryTime }),
    };
  }
});

function onLocaleChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  const newLocale = target.value as Locale;
  settings.value.locale = newLocale;
  void setLocale(newLocale);
}

function setStatus(message: string, variant: 'success' | 'error') {
  status.value = { message, variant };
  setTimeout(() => {
    status.value = { message: '', variant: 'idle' };
  }, 3000);
}

async function onSave() {
  if (
    settings.value.maxViewsEnabled &&
    (!Number.isFinite(settings.value.maxViews) || settings.value.maxViews < 1)
  ) {
    setStatus(t('errMaxViews'), 'error');
    return;
  }
  if (
    settings.value.imageConversionEnabled &&
    (!Number.isFinite(settings.value.imageConversionQuality) ||
      settings.value.imageConversionQuality < 1 ||
      settings.value.imageConversionQuality > 100)
  ) {
    setStatus(t('errConversionQuality'), 'error');
    return;
  }
  if (
    settings.value.imageCompressionEnabled &&
    (!Number.isFinite(settings.value.imageCompressionQuality) ||
      settings.value.imageCompressionQuality < 1 ||
      settings.value.imageCompressionQuality > 100)
  ) {
    setStatus(t('errCompressionQuality'), 'error');
    return;
  }
  const toSave: Settings = {
    ...settings.value,
    locale: locale.value,
    requestURL: settings.value.requestURL.trim(),
    authToken: settings.value.authToken.trim(),
  };
  settings.value = toSave;
  await saveSettings(toSave);
  await notifyMenusToRebuild();
  setStatus(t('settingsSaved'), 'success');
}
</script>

<template>
  <form class="space-y-3" novalidate @submit.prevent="onSave">
    <!-- General Settings / Language -->
    <section class="bg-panel border border-border rounded-card p-4 space-y-3">
      <h2 class="text-[10.5px] tracking-[0.07em] uppercase font-semibold text-text-muted">
        {{ t('sectionGeneral') }}
      </h2>
      <div>
        <label for="localeSelect" class="block text-xs text-text-muted mb-1">{{ t('language') }}</label>
        <select
          id="localeSelect"
          :value="locale"
          class="w-full bg-[#0a0a0c] border border-border rounded-md px-3 py-2 text-sm
                 focus:outline-none focus:border-accent appearance-none cursor-pointer"
          @change="onLocaleChange"
        >
          <option v-for="opt in LOCALE_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
    </section>

    <!-- Connection -->
    <section class="bg-panel border border-border rounded-card p-4 space-y-3">
      <h2 class="text-[10.5px] tracking-[0.07em] uppercase font-semibold text-text-muted">
        {{ t('sectionConnection') }}
      </h2>
      <div>
        <label for="requestURL" class="block text-xs text-text-muted mb-1">{{ t('requestUrl') }}</label>
        <input
          id="requestURL"
          v-model="settings.requestURL"
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="https://your-instance/api/upload"
          class="w-full bg-[#0a0a0c] border border-border rounded-md px-3 py-2 text-sm
                 focus:outline-none focus:border-accent"
        />
      </div>
      <div>
        <label for="authToken" class="block text-xs text-text-muted mb-1">{{ t('authToken') }}</label>
        <input
          id="authToken"
          v-model="settings.authToken"
          type="password"
          autocomplete="off"
          spellcheck="false"
          :placeholder="t('authTokenPlaceholder')"
          class="w-full bg-[#0a0a0c] border border-border rounded-md px-3 py-2 text-sm
                 focus:outline-none focus:border-accent"
        />
      </div>
    </section>

    <!-- Upload Options -->
    <section class="bg-panel border border-border rounded-card p-4 space-y-3">
      <h2 class="text-[10.5px] tracking-[0.07em] uppercase font-semibold text-text-muted">
        {{ t('sectionUploadOptions') }}
      </h2>
      <ToggleSwitch
        id="expiryEnabled"
        v-model="settings.expiryEnabled"
        :label="t('autoDelete')"
      />
      <div v-if="settings.expiryEnabled">
        <label for="expiryTime" class="block text-xs text-text-muted mb-1">{{ t('expiryTime') }}</label>
        <select
          id="expiryTime"
          v-model="settings.expiryTime"
          class="w-full bg-[#0a0a0c] border border-border rounded-md px-3 py-2 text-sm
          focus:outline-none focus:border-accent appearance-none cursor-pointer"
        >
          <option v-for="preset in localizedExpiryPresets" :key="preset.value" :value="preset.value">
            {{ preset.label }}
          </option>
          <option v-if="customExpiryOption" :value="customExpiryOption.value">
            {{ customExpiryOption.label }}
          </option>
        </select>
      </div>

      <hr class="border-border" />

      <ToggleSwitch
        id="maxViewsEnabled"
        v-model="settings.maxViewsEnabled"
        :label="t('maxViewsLimit')"
      />
      <div v-if="settings.maxViewsEnabled">
        <label for="maxViews" class="block text-xs text-text-muted mb-1">{{ t('maxViews') }}</label>
        <input
          id="maxViews"
          v-model.number="settings.maxViews"
          type="number"
          min="1"
          placeholder="100"
          class="w-full bg-[#0a0a0c] border border-border rounded-md px-3 py-2 text-sm
                 focus:outline-none focus:border-accent"
        />
      </div>
    </section>

    <!-- Image Processing -->
    <section class="bg-panel border border-border rounded-card p-4 space-y-3">
      <h2 class="text-[10.5px] tracking-[0.07em] uppercase font-semibold text-text-muted">
        {{ t('sectionImageProcessing') }}
      </h2>
      <ToggleSwitch
        id="imageConversionEnabled"
        v-model="settings.imageConversionEnabled"
        :label="t('convertFormat')"
      />
      <template v-if="settings.imageConversionEnabled">
        <div>
          <label for="imageConversionFormat" class="block text-xs text-text-muted mb-1">{{ t('targetFormat') }}</label>
          <select
            id="imageConversionFormat"
            v-model="settings.imageConversionFormat"
            class="w-full bg-[#0a0a0c] border border-border rounded-md px-3 py-2 text-sm
                   focus:outline-none focus:border-accent appearance-none cursor-pointer"
          >
            <option v-for="fmt in IMAGE_FORMATS" :key="fmt.value" :value="fmt.value">
              {{ fmt.label }}
            </option>
          </select>
        </div>
        <div>
          <label for="imageConversionQuality" class="block text-xs text-text-muted mb-1">{{ t('conversionQuality') }}</label>
          <input
            id="imageConversionQuality"
            v-model.number="settings.imageConversionQuality"
            type="number"
            min="1"
            max="100"
            placeholder="80"
            class="w-full bg-[#0a0a0c] border border-border rounded-md px-3 py-2 text-sm
                   focus:outline-none focus:border-accent"
          />
        </div>
      </template>

      <details class="group">
        <summary class="text-xs text-text-muted cursor-pointer select-none list-none flex items-center gap-1">
          <span class="transition-transform group-open:rotate-90">▶</span>
          {{ t('advanced') }}
        </summary>
        <div class="mt-3 space-y-3">
          <ToggleSwitch
            id="imageCompressionEnabled"
            v-model="settings.imageCompressionEnabled"
            :label="t('serverCompression')"
          />
          <template v-if="settings.imageCompressionEnabled">
            <p class="text-xs text-text-muted">
              {{ t('serverCompressionNotice') }}
            </p>
            <div>
              <label for="imageCompressionQuality" class="block text-xs text-text-muted mb-1">{{ t('serverCompressionQuality') }}</label>
              <input
                id="imageCompressionQuality"
                v-model.number="settings.imageCompressionQuality"
                type="number"
                min="1"
                max="100"
                placeholder="80"
                class="w-full bg-[#0a0a0c] border border-border rounded-md px-3 py-2 text-sm
                       focus:outline-none focus:border-accent"
              />
            </div>
          </template>
        </div>
      </details>
    </section>

    <!-- Context Menu -->
    <section class="bg-panel border border-border rounded-card p-4 space-y-3">
      <h2 class="text-[10.5px] tracking-[0.07em] uppercase font-semibold text-text-muted">
        {{ t('sectionContextMenu') }}
      </h2>
      <ToggleSwitch
        id="screenshotContextMenuEnabled"
        v-model="settings.screenshotContextMenuEnabled"
        :label="t('menuScreenshots')"
      />
      <ToggleSwitch
        id="shortenEnabled"
        v-model="settings.shortenEnabled"
        :label="t('menuShorten')"
      />
    </section>

    <button
      type="submit"
      class="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-medium
             active:translate-y-px transition-colors cursor-pointer"
    >
      {{ t('saveSettings') }}
    </button>

    <StatusMessage :message="status.message" :variant="status.variant" />
  </form>
</template>
