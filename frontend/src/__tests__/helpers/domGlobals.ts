// frontend/src/__tests__/helpers/domGlobals.ts
//
// Installs happy-dom's window/document as globals. A module of its own, imported first by dom.ts:
// imports are evaluated in order, so the DOM exists before @testing-library loads (its `screen`
// binds to document.body when it is imported).
import { GlobalRegistrator } from '@happy-dom/global-registrator';

if (typeof document === 'undefined') {
  GlobalRegistrator.register({ url: 'http://localhost/en', width: 1280, height: 800 });
}
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Animations (framer-motion uses the Web Animations API) are cancelled when a test unmounts the
// component; happy-dom then rejects `finished` with an AbortError nobody awaits. Mark those promises
// handled so a normal unmount is not reported as an unhandled rejection.
const elementProto = (globalThis as unknown as { Element: { prototype: { animate?: (...args: unknown[]) => unknown } } }).Element.prototype;
const realAnimate = elementProto.animate;
if (realAnimate) {
  elementProto.animate = function animate(this: unknown, ...args: unknown[]) {
    const animation = realAnimate.apply(this, args) as { finished?: Promise<unknown>; ready?: Promise<unknown> };
    animation.finished?.catch(() => undefined);
    animation.ready?.catch(() => undefined);
    return animation;
  };
}
