import {
  APPEARANCE_STATE_STORAGE_KEY,
  COLOR_MODE_STORAGE_KEY,
} from '#/lib/settings/appearance-preference'

/**
 * Runs before React hydrates so `data-theme` matches the saved preference
 * and theme tokens paint correctly on first paint.
 */
export const COLOR_MODE_BOOTSTRAP_SCRIPT = `(function(){try{var mode;var legacyKey=${JSON.stringify(COLOR_MODE_STORAGE_KEY)};var stateKey=${JSON.stringify(APPEARANCE_STATE_STORAGE_KEY)};var raw=localStorage.getItem(stateKey);if(raw){try{var p=JSON.parse(raw);if(p&&p.colorMode)mode=p.colorMode;}catch(e){}}if(!mode){var leg=localStorage.getItem(legacyKey);if(leg==='light'||leg==='dark'||leg==='system')mode=leg;}if(mode==='light'||mode==='dark')document.documentElement.setAttribute('data-theme',mode);}catch(e){}})();`
