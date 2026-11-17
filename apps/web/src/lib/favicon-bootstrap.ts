/**
 * Sets the tab icon from the browser's color scheme (black logo on light tabs,
 * white logo on dark tabs) and keeps it in sync when the scheme changes.
 * Done in script because browsers don't reliably switch SVG favicons or pick
 * between several `<link rel="icon">` tags by `prefers-color-scheme`.
 * Without script, browsers fall back to `/favicon.ico` (the black logo).
 */
export const FAVICON_BOOTSTRAP_SCRIPT = `(function(){try{var q=window.matchMedia('(prefers-color-scheme: dark)');function set(){var l=document.getElementById('theme-favicon');if(!l){l=document.createElement('link');l.id='theme-favicon';l.rel='icon';l.type='image/png';document.head.appendChild(l);}l.href=q.matches?'/favicon-white.png':'/favicon-black.png';}set();if(q.addEventListener)q.addEventListener('change',set);else if(q.addListener)q.addListener(set);}catch(e){}})();`
