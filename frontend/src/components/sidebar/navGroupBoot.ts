// frontend/src/components/sidebar/navGroupBoot.ts
//
// Applies each sidebar group's remembered open or folded state before the first paint.
//
// The server cannot read localStorage, so it renders every group in its default state and the stored
// choice only lands after hydration: a group the visitor folded flashed open first, then snapped shut on
// every reload. This blocking script (see `app/[locale]/layout.tsx`) injects a style that already holds the
// stored state, so frame one is correct. `SidebarNavGroup` removes the style once React agrees with it.
// The injected values mirror what `Collapsible` sets for open and closed; change them together.

export const NAV_GROUP_STORAGE_PREFIX = 'lemon-sidebar-group-';
const NAV_GROUP_BOOT_STYLE_ID = 'lemon-nav-group-boot';
/** Class of the folding body; the injected rules target it inside `[data-nav-group="<id>"]`. */
export const NAV_GROUP_BODY_CLASS = 'lemon-nav-group-body';

export const NAV_GROUP_BOOT_SCRIPT = `try{var p='${NAV_GROUP_STORAGE_PREFIX}',c='';for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf(p)===0){var n=k.slice(p.length);if(/^[0-9A-Za-z_-]+$/.test(n)){var o=localStorage.getItem(k)==='true';c+='[data-nav-group="'+n+'"] .${NAV_GROUP_BODY_CLASS}{grid-template-rows:'+(o?'1fr':'0fr')+';opacity:'+(o?'1':'0')+'}'}}}if(c){var s=document.createElement('style');s.id='${NAV_GROUP_BOOT_STYLE_ID}';s.textContent=c;document.head.appendChild(s)}}catch(e){}`;

/** Drops the pre-paint style so React's own state drives the group again. */
export function releaseNavGroupBoot(): void {
  document.getElementById(NAV_GROUP_BOOT_STYLE_ID)?.remove();
}
