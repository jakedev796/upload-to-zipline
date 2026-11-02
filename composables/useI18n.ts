import { ref, computed } from 'vue';
import { type Locale, DEFAULT_SETTINGS } from '@/types/settings';
import { notifyMenusToRebuild } from '@/composables/useSettings';

export const MESSAGES = {
  'zh-TW': {
    // Header & Tabs
    appTitle: 'Zipline Uploader',
    tabUpload: '上傳中心',
    tabSettings: '設定',
    missingConfig: '請先設定 Zipline 伺服器網址與 Token',
    goToSettings: '前往設定',
    language: '介面語言',

    // Quick Actions
    areaSnip: '區域截圖',
    areaSnipTitle: '框選網頁任意區域並上傳 (快捷鍵: Alt+Shift+S)',
    captureVisible: '可見畫面',
    capturing: '截圖中...',
    captureVisibleTitle: '一鍵擷取目前可見視窗並上傳 (快捷鍵: Alt+Shift+V)',
    clipboardUpload: '貼上剪貼簿',
    readingClipboard: '讀取中...',
    clipboardUploadTitle: '上傳剪貼簿中的截圖 (支援 Ctrl+V / 快捷鍵: Alt+Shift+U)',
    areaSnipTabError: '無法在當前分頁執行區域截圖。',
    areaSnipFailed: '啟動區域截圖失敗: {msg}',
    captureVisibleFailed: '可見畫面截圖失敗: {msg}',
    noImageInClipboard: '剪貼簿中未偵測到圖片，請先截圖或複製圖片！',
    clipboardUploadFailed: '上傳剪貼簿失敗: {msg}',
    uploadSuccessClipboard: '上傳成功！網址已複製到剪貼簿。',

    // DropZone
    dropPrompt: '點擊選擇檔案，或將圖片拖曳至此',
    pastePrompt: '支援按 {key} 直接貼上截圖',
    readingFile: '正在讀取與處理檔案...',
    uploading: '正在上傳至 Zipline...',
    uploadFailed: '上傳失敗: {msg}',

    // Recent Uploads
    recentTitle: '最近上傳 ({count}/{max})',
    clearHistory: '清除紀錄',
    copied: '已複製',
    copy: '複製',
    openInNewTab: '在新分頁開啟',
    justNow: '剛剛',
    minutesAgo: '{m} 分鐘前',
    hoursAgo: '{h} 小時前',

    // Settings Form
    sectionGeneral: '一般設定',
    sectionConnection: '連線設定',
    requestUrl: 'Request URL',
    authToken: 'Authorization Token',
    authTokenPlaceholder: '貼上您的 Token',
    sectionUploadOptions: '上傳選項',
    autoDelete: '到期後自動刪除',
    expiryTime: '到期時間',
    maxViewsLimit: '限制最大瀏覽次數',
    maxViews: '刪除前的最大瀏覽次數',
    sectionImageProcessing: '圖片處理',
    convertFormat: '上傳前轉換圖片格式',
    targetFormat: '目標格式',
    conversionQuality: '轉換品質 (1～100)',
    advanced: '進階設定',
    serverCompression: '伺服器端壓縮 (Zipline)',
    serverCompressionNotice: '啟用格式轉換時此設定無效 (避免重複壓縮)。',
    serverCompressionQuality: '壓縮品質 (1～100)',
    sectionContextMenu: '右鍵選單',
    menuScreenshots: '網頁截圖與剪貼簿右鍵選單',
    menuShorten: '右鍵縮短網址',
    saveSettings: '儲存設定',
    settingsSaved: '設定已儲存！',
    errMaxViews: '最大瀏覽次數必須大於或等於 1。',
    errConversionQuality: '轉換品質必須介於 1 至 100 之間。',
    errCompressionQuality: '壓縮品質必須介於 1 至 100 之間。',

    // Expiry presets
    expiry_1h: '1 小時',
    expiry_6h: '6 小時',
    expiry_1d: '1 天',
    expiry_3d: '3 天',
    expiry_7d: '7 天',
    expiry_14d: '14 天',
    expiry_30d: '30 天',
    expiry_90d: '90 天',
    expiry_1y: '1 年',
    expiry_custom: '{time} (自訂)',

    // Context Menu & Background
    menuUploadToZipline: '上傳至 Zipline',
    menuShortenURL: '使用 Zipline 縮短網址',
    menuSnipArea: '✂️ 選取區域截圖並上傳',
    menuCaptureVisible: '🖥️ 截取可見畫面並上傳',
    menuUploadClipboard: '📋 上傳剪貼簿圖片',
    notifyConfigRequiredTitle: '需要進行設定',
    notifyConfigRequiredMsg: '請在擴充功能設定中配置 Zipline 伺服器與 Token。',
    notifyUploadSuccessTitle: '上傳成功',
    notifyUploadSuccessMsg: '檔案已成功上傳，網址已複製至剪貼簿。',
    notifyUploadSuccessFallbackMsg: '檔案已成功上傳。網址: {url}',
    notifyActionFailedTitle: '操作失敗',
    notifyActionFailedMsg: '處理請求時發生錯誤，請檢查您的設定。',
    notifyScreenshotErrorTitle: '截圖錯誤',
    notifyNoActiveTab: '找不到可截圖的有效分頁。',
    notifyProtectedPageNoticeTitle: '提示',
    notifyProtectedPageNoticeMsg: '無法在瀏覽器保護的內建頁面上執行截圖。',
    notifyInjectFailed: '無法在此頁面上初始化區域截圖。',
    notifyClipboardTitle: '剪貼簿上傳',
    notifyNoImageInClipboard: '剪貼簿中未找到圖片。',
    notifyReadClipboardFailed: '讀取剪貼簿圖片失敗。',
    notifyUrlShortenedTitle: '網址已縮短',
    notifyUrlShortenedMsg: '短網址已複製到剪貼簿。',
    notifyUrlShortenedFallbackMsg: '短網址: {url}',

    // Area Snip Overlay
    areaSnipTip: '拖曳滑鼠選取截圖區域 ｜ 按 ESC 取消',
  },
  en: {
    // Header & Tabs
    appTitle: 'Zipline Uploader',
    tabUpload: 'Upload Hub',
    tabSettings: 'Settings',
    missingConfig: 'Please configure your Zipline URL and Token first',
    goToSettings: 'Go to Settings',
    language: 'Language',

    // Quick Actions
    areaSnip: 'Area Snip',
    areaSnipTitle: 'Select an area on the page to upload (Shortcut: Alt+Shift+S)',
    captureVisible: 'Visible Area',
    capturing: 'Capturing...',
    captureVisibleTitle: 'Capture visible tab area and upload (Shortcut: Alt+Shift+V)',
    clipboardUpload: 'From Clipboard',
    readingClipboard: 'Reading...',
    clipboardUploadTitle: 'Upload image from clipboard (Supports Ctrl+V / Shortcut: Alt+Shift+U)',
    areaSnipTabError: 'Cannot perform area screenshot on current tab.',
    areaSnipFailed: 'Failed to start area snip: {msg}',
    captureVisibleFailed: 'Visible screenshot failed: {msg}',
    noImageInClipboard: 'No image found in clipboard. Please copy an image first!',
    clipboardUploadFailed: 'Clipboard upload failed: {msg}',
    uploadSuccessClipboard: 'Upload successful! URL copied to clipboard.',

    // DropZone
    dropPrompt: 'Click to select or drag and drop files here',
    pastePrompt: 'Press {key} to paste screenshots directly',
    readingFile: 'Reading and processing file...',
    uploading: 'Uploading to Zipline...',
    uploadFailed: 'Upload failed: {msg}',

    // Recent Uploads
    recentTitle: 'Recent Uploads ({count}/{max})',
    clearHistory: 'Clear History',
    copied: 'Copied',
    copy: 'Copy',
    openInNewTab: 'Open in new tab',
    justNow: 'Just now',
    minutesAgo: '{m}m ago',
    hoursAgo: '{h}h ago',

    // Settings Form
    sectionGeneral: 'General Settings',
    sectionConnection: 'Connection',
    requestUrl: 'Request URL',
    authToken: 'Authorization Token',
    authTokenPlaceholder: 'Paste your token',
    sectionUploadOptions: 'Upload Options',
    autoDelete: 'Auto-delete after expiry',
    expiryTime: 'Expiry time',
    maxViewsLimit: 'Max view count limit',
    maxViews: 'Max views before deletion',
    sectionImageProcessing: 'Image Processing',
    convertFormat: 'Convert image format before upload',
    targetFormat: 'Target format',
    conversionQuality: 'Quality (1 - 100)',
    advanced: 'Advanced',
    serverCompression: 'Server-side compression (Zipline)',
    serverCompressionNotice: 'Has no effect on images when format conversion is enabled (prevents double compression).',
    serverCompressionQuality: 'Compression quality (1 - 100)',
    sectionContextMenu: 'Context Menu',
    menuScreenshots: 'Page screenshot & clipboard menus',
    menuShorten: 'Right-click URL shortening',
    saveSettings: 'Save Settings',
    settingsSaved: 'Settings saved!',
    errMaxViews: 'Max views must be a number greater than or equal to 1.',
    errConversionQuality: 'Conversion quality must be between 1 and 100.',
    errCompressionQuality: 'Compression quality must be between 1 and 100.',

    // Expiry presets
    expiry_1h: '1 hour',
    expiry_6h: '6 hours',
    expiry_1d: '1 day',
    expiry_3d: '3 days',
    expiry_7d: '7 days',
    expiry_14d: '14 days',
    expiry_30d: '30 days',
    expiry_90d: '90 days',
    expiry_1y: '1 year',
    expiry_custom: '{time} (custom)',

    // Context Menu & Background
    menuUploadToZipline: 'Upload to Zipline',
    menuShortenURL: 'Shorten URL with Zipline',
    menuSnipArea: '✂️ Capture Area and Upload',
    menuCaptureVisible: '🖥️ Capture Visible Tab and Upload',
    menuUploadClipboard: '📋 Upload Image from Clipboard',
    notifyConfigRequiredTitle: 'Configuration Required',
    notifyConfigRequiredMsg: 'Please configure your Zipline settings in the extension options.',
    notifyUploadSuccessTitle: 'Upload Successful',
    notifyUploadSuccessMsg: 'The file was uploaded successfully and the URL has been copied to your clipboard.',
    notifyUploadSuccessFallbackMsg: 'The file was uploaded successfully. URL: {url}',
    notifyActionFailedTitle: 'Action Failed',
    notifyActionFailedMsg: 'An error occurred while processing the request. Please check your settings.',
    notifyScreenshotErrorTitle: 'Screenshot Error',
    notifyNoActiveTab: 'No active tab found for area screenshot.',
    notifyProtectedPageNoticeTitle: 'Notice',
    notifyProtectedPageNoticeMsg: 'Cannot capture screenshots on protected browser internal pages.',
    notifyInjectFailed: 'Could not initialize area screenshot on this page.',
    notifyClipboardTitle: 'Clipboard Upload',
    notifyNoImageInClipboard: 'No image found in clipboard.',
    notifyReadClipboardFailed: 'Failed to read clipboard image.',
    notifyUrlShortenedTitle: 'URL Shortened',
    notifyUrlShortenedMsg: 'The shortened URL has been copied to your clipboard.',
    notifyUrlShortenedFallbackMsg: 'Shortened URL: {url}',

    // Area Snip Overlay
    areaSnipTip: 'Drag to select capture area | Press ESC to cancel',
  },
  ja: {
    // Header & Tabs
    appTitle: 'Zipline Uploader',
    tabUpload: 'アップロード',
    tabSettings: '設定',
    missingConfig: 'Zipline サーバーの URL と Token を設定してください',
    goToSettings: '設定へ移動',
    language: '表示言語',

    // Quick Actions
    areaSnip: '範囲キャプチャ',
    areaSnipTitle: 'ページ上の範囲を選択してアップロード (ショートカット: Alt+Shift+S)',
    captureVisible: '表示領域',
    capturing: 'キャプチャ中...',
    captureVisibleTitle: '現在の表示領域をキャプチャしてアップロード (ショートカット: Alt+Shift+V)',
    clipboardUpload: 'クリップボード',
    readingClipboard: '読み取り中...',
    clipboardUploadTitle: 'クリップボードの画像をアップロード (Ctrl+V / ショートカット: Alt+Shift+U 対応)',
    areaSnipTabError: '現在のタブで範囲キャプチャを実行できません。',
    areaSnipFailed: '範囲キャプチャの開始に失敗しました: {msg}',
    captureVisibleFailed: '表示領域キャプチャに失敗しました: {msg}',
    noImageInClipboard: 'クリップボードに画像が見つかりません。画像をコピーしてください！',
    clipboardUploadFailed: 'クリップボードのアップロードに失敗しました: {msg}',
    uploadSuccessClipboard: 'アップロード成功！URLをクリップボードにコピーしました。',

    // DropZone
    dropPrompt: 'クリックしてファイルを選択、またはドラッグ＆ドロップ',
    pastePrompt: '{key} でスクリーンショットを直接貼り付け可能',
    readingFile: 'ファイルを読み込み・処理中...',
    uploading: 'Zipline にアップロード中...',
    uploadFailed: 'アップロード失敗: {msg}',

    // Recent Uploads
    recentTitle: '最近のアップロード ({count}/{max})',
    clearHistory: '履歴を消去',
    copied: 'コピー完了',
    copy: 'コピー',
    openInNewTab: '新しいタブで開く',
    justNow: 'たった今',
    minutesAgo: '{m}分前',
    hoursAgo: '{h}時間前',

    // Settings Form
    sectionGeneral: '一般設定',
    sectionConnection: '接続設定',
    requestUrl: 'Request URL',
    authToken: 'Authorization Token',
    authTokenPlaceholder: 'Token を貼り付け',
    sectionUploadOptions: 'アップロード設定',
    autoDelete: '期限切れ後に自動削除',
    expiryTime: '有効期限',
    maxViewsLimit: '最大閲覧数の制限',
    maxViews: '削除までの最大閲覧数',
    sectionImageProcessing: '画像処理',
    convertFormat: 'アップロード前に画像形式を変換',
    targetFormat: '変換形式',
    conversionQuality: '品質 (1～100)',
    advanced: '高度な設定',
    serverCompression: 'サーバー側圧縮 (Zipline)',
    serverCompressionNotice: '形式変換が有効な場合、この設定は無効になります (二重圧縮の防止)。',
    serverCompressionQuality: '圧縮品質 (1～100)',
    sectionContextMenu: 'コンテキストメニュー',
    menuScreenshots: 'スクリーンショット・クリップボードメニュー',
    menuShorten: '右クリックでURL短縮',
    saveSettings: '設定を保存',
    settingsSaved: '設定を保存しました！',
    errMaxViews: '最大閲覧数は 1 以上の数値を指定してください。',
    errConversionQuality: '変換品質は 1 から 100 の間で指定してください。',
    errCompressionQuality: '圧縮品質は 1 から 100 の間で指定してください。',

    // Expiry presets
    expiry_1h: '1 時間',
    expiry_6h: '6 時間',
    expiry_1d: '1 日',
    expiry_3d: '3 日',
    expiry_7d: '7 日',
    expiry_14d: '14 日',
    expiry_30d: '30 日',
    expiry_90d: '90 日',
    expiry_1y: '1 年',
    expiry_custom: '{time} (カスタム)',

    // Context Menu & Background
    menuUploadToZipline: 'Zipline にアップロード',
    menuShortenURL: 'Zipline で URL を短縮',
    menuSnipArea: '✂️ 範囲を選択してキャプチャ＆アップロード',
    menuCaptureVisible: '🖥️ 表示領域をキャプチャ＆アップロード',
    menuUploadClipboard: '📋 クリップボードの画像をアップロード',
    notifyConfigRequiredTitle: '設定が必要です',
    notifyConfigRequiredMsg: '拡張機能の設定で Zipline の設定を行ってください。',
    notifyUploadSuccessTitle: 'アップロード成功',
    notifyUploadSuccessMsg: 'ファイルのアップロードが成功し、URLがクリップボードにコピーされました。',
    notifyUploadSuccessFallbackMsg: 'ファイルのアップロードが成功しました。URL: {url}',
    notifyActionFailedTitle: '操作に失敗しました',
    notifyActionFailedMsg: 'リクエストの処理中にエラーが発生しました。設定を確認してください。',
    notifyScreenshotErrorTitle: 'キャプチャエラー',
    notifyNoActiveTab: 'アクティブなタブが見つかりません。',
    notifyProtectedPageNoticeTitle: 'お知らせ',
    notifyProtectedPageNoticeMsg: 'ブラウザの保護された内部ページではキャプチャできません。',
    notifyInjectFailed: 'このページで範囲キャプチャを初期化できませんでした。',
    notifyClipboardTitle: 'クリップボードアップロード',
    notifyNoImageInClipboard: 'クリップボードに画像が見つかりません。',
    notifyReadClipboardFailed: 'クリップボードの画像読み取りに失敗しました。',
    notifyUrlShortenedTitle: 'URLを短縮しました',
    notifyUrlShortenedMsg: '短縮URLをクリップボードにコピーしました。',
    notifyUrlShortenedFallbackMsg: '短縮URL: {url}',

    // Area Snip Overlay
    areaSnipTip: 'ドラッグして範囲を選択 ｜ ESCキーでキャンセル',
  },
} as const;

export type TranslationKey = keyof (typeof MESSAGES)['zh-TW'];

// Helper to translate standalone
export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const dict = MESSAGES[locale] || MESSAGES['zh-TW'];
  let text: string = dict[key] || MESSAGES['zh-TW'][key] || key;
  if (params) {
    for (const [paramKey, paramVal] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
    }
  }
  return text;
}

// Global reactive locale for UI
const currentLocale = ref<Locale>(DEFAULT_SETTINGS.locale);
let isInitialized = false;

export function useI18n() {
  if (!isInitialized) {
    isInitialized = true;
    void (async () => {
      try {
        const stored = await browser.storage.sync.get(['locale']);
        if (stored.locale && (stored.locale === 'en' || stored.locale === 'zh-TW' || stored.locale === 'ja')) {
          currentLocale.value = stored.locale as Locale;
        } else {
          // Detect browser language
          const browserLang = (typeof navigator !== 'undefined' ? navigator.language : '').toLowerCase();
          if (browserLang.startsWith('ja')) {
            currentLocale.value = 'ja';
          } else if (browserLang.startsWith('zh')) {
            currentLocale.value = 'zh-TW';
          } else {
            currentLocale.value = 'en';
          }
        }
      } catch (err) {
        console.error('Failed to load locale:', err);
      }
    })();

    // Listen for storage changes across popup and options
    try {
      browser.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.locale?.newValue) {
          const newLoc = changes.locale.newValue;
          if (newLoc === 'en' || newLoc === 'zh-TW' || newLoc === 'ja') {
            currentLocale.value = newLoc;
          }
        }
      });
    } catch {
      // safe ignore in non-browser context
    }
  }

  async function setLocale(newLocale: Locale) {
    const changed = currentLocale.value !== newLocale;
    currentLocale.value = newLocale;
    try {
      const stored = await browser.storage.sync.get(['locale']);
      if (changed || stored.locale !== newLocale) {
        await browser.storage.sync.set({ locale: newLocale });
        await notifyMenusToRebuild();
      }
    } catch (err) {
      console.error('Failed to save locale:', err);
    }
  }

  function t(key: TranslationKey, params?: Record<string, string | number>): string {
    return translate(currentLocale.value, key, params);
  }

  return {
    locale: computed(() => currentLocale.value),
    setLocale,
    t,
  };
}

