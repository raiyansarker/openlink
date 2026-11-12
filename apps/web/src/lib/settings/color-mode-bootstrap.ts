import { COLOR_MODE_STORAGE_KEY } from '#/lib/settings/appearance-preference'

/**
 * Runs before React hydrates so `data-theme` matches the saved preference
 * and theme tokens paint correctly on first paint.
 */
export const COLOR_MODE_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(COLOR_MODE_STORAGE_KEY)};var m=localStorage.getItem(k);if(m==='light'||m==='dark')document.documentElement.setAttribute('data-theme',m);}catch(e){}})();`
