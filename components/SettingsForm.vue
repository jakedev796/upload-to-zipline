<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  loadSettings,
  notifyMenusToRebuild,
  saveSettings,
} from '@/composables/useSettings';
import {
  DEFAULT_SETTINGS,
  EXPIRY_PRESETS,
  type Settings,
} from '@/types/settings';
import ToggleSwitch from './ToggleSwitch.vue';
import StatusMessage from './StatusMessage.vue';

const settings = ref<Settings>({ ...DEFAULT_SETTINGS });
const customExpiryOption = ref<{ value: string; label: string } | null>(null);
const status = ref<{ message: string; variant: 'success' | 'error' | 'idle' }>({
  message: '',
  variant: 'idle',
});

onMounted(async () => {
  const loaded = await loadSettings();
  settings.value = loaded;
  const inPresets = EXPIRY_PRESETS.some((p) => p.value === loaded.expiryTime);
  if (loaded.expiryTime && !inPresets) {
    customExpiryOption.value = {
      value: loaded.expiryTime,
      label: `${loaded.expiryTime} (custom)`,
    };
  }
});

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
    setStatus('Max views must be a number greater than or equal to 1.', 'error');
    return;
  }
  await saveSettings(settings.value);
  await notifyMenusToRebuild();
  setStatus('Settings saved!', 'success');
}
</script>

<template>
  <form class="space-y-3" novalidate @submit.prevent="onSave">
    <section class="bg-panel border border-border rounded-card p-4 space-y-3">
      <h2 class="text-[10.5px] tracking-[0.07em] uppercase font-semibold text-text-muted">
        Connection
      </h2>
      <div>
        <label for="requestURL" class="block text-xs text-text-muted mb-1">Request URL</label>
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
        <label for="authToken" class="block text-xs text-text-muted mb-1">Authorization token</label>
        <input
          id="authToken"
          v-model="settings.authToken"
          type="password"
          autocomplete="off"
          spellcheck="false"
          placeholder="Paste your token"
          class="w-full bg-[#0a0a0c] border border-border rounded-md px-3 py-2 text-sm
                 focus:outline-none focus:border-accent"
        />
      </div>
    </section>

    <section class="bg-panel border border-border rounded-card p-4 space-y-3">
      <h2 class="text-[10.5px] tracking-[0.07em] uppercase font-semibold text-text-muted">
        Upload Options
      </h2>
      <ToggleSwitch
        id="expiryEnabled"
        v-model="settings.expiryEnabled"
        label="Auto-delete after expiry"
      />
      <div v-show="settings.expiryEnabled">
        <label for="expiryTime" class="block text-xs text-text-muted mb-1">Expiry time</label>
        <select
          id="expiryTime"
          v-model="settings.expiryTime"
          class="w-full bg-[#0a0a0c] border border-border rounded-md px-3 py-2 text-sm
                 focus:outline-none focus:border-accent appearance-none"
        >
          <option v-for="preset in EXPIRY_PRESETS" :key="preset.value" :value="preset.value">
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
        label="Max view count limit"
      />
      <div v-show="settings.maxViewsEnabled">
        <label for="maxViews" class="block text-xs text-text-muted mb-1">Max views before deletion</label>
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

    <section class="bg-panel border border-border rounded-card p-4">
      <h2 class="text-[10.5px] tracking-[0.07em] uppercase font-semibold text-text-muted mb-3">
        Context Menu
      </h2>
      <ToggleSwitch
        id="shortenEnabled"
        v-model="settings.shortenEnabled"
        label="Right-click URL shortening"
      />
    </section>

    <button
      type="submit"
      class="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-medium
             active:translate-y-px transition-colors"
    >
      Save Settings
    </button>

    <StatusMessage :message="status.message" :variant="status.variant" />
  </form>
</template>
