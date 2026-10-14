// frontend/src/__tests__/unit/structureGuards.test.ts
//
// App Router structure, server/client boundaries and bundle hygiene.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ts } from 'ts-morph';
import { codeModules, scanLines, isEntry, loadModules, staticReach } from '../helpers/sourceGraph';

const mods = loadModules();
const files = new Set(mods.map((m) => m.file));
const pages = mods.map((m) => m.file).filter((f) => /^app\/\[locale\]\/(.*\/)?page\.tsx$/.test(f));

/**
 * Static content pages that render instantly and need no route-level loading UI. Everything
 * else must be covered by a loading.tsx on its own segment or an ancestor segment.
 */
const STATIC_PAGES = new Set([
  'app/[locale]/page.tsx',
  'app/[locale]/[...rest]/page.tsx',
  'app/[locale]/about/page.tsx',
  'app/[locale]/blocked/page.tsx',
  'app/[locale]/forbidden/page.tsx',
  'app/[locale]/privacy-policy/page.tsx',
  'app/[locale]/reset-password/page.tsx',
  'app/[locale]/rules/page.tsx',
  'app/[locale]/terms-of-service/page.tsx',
]);

describe('structure: route-level loading UI', () => {
  it('every data-driven page is covered by a loading.tsx (own segment or an ancestor)', () => {
    const uncovered = pages.filter((p) => {
      if (STATIC_PAGES.has(p)) return false;
      let d = p.replace(/\/page\.tsx$/, '');
      while (d.startsWith('app/[locale]')) {
        if (files.has(`${d}/loading.tsx`)) return false;
        d = d.replace(/\/[^/]+$/, '');
      }
      return !files.has('app/[locale]/loading.tsx');
    });
    assert.deepEqual(uncovered, [], `Pages with no loading.tsx (add one, or list the page as static above):\n${uncovered.join('\n')}`);
  });

  it('the static-page allowlist only names pages that exist', () => {
    const missing = [...STATIC_PAGES].filter((p) => !files.has(p));
    assert.deepEqual(missing, [], `Stale STATIC_PAGES entries:\n${missing.join('\n')}`);
  });
});

describe('structure: the page background belongs to AppBackground', () => {
  it('no page or component paints an opaque full-screen background over it', () => {
    // A full-height wrapper with an opaque bg-bg-primary / bg-bg-surface hides AppBackground.
    // (Translucent overlays such as bg-bg-primary/95 on the loading spinner are fine.)
    const bad = scanLines(/(min-h-screen|min-h-dvh|h-dvh)[^"'`]*\bbg-bg-(primary|surface)\b(?!\/)|\bbg-bg-(primary|surface)\b(?!\/)[^"'`]*(min-h-screen|min-h-dvh|h-dvh)/, (m) => m.file === 'components/common/Modal.tsx');
    assert.deepEqual(bad, [], `Opaque full-screen background:\n${bad.join('\n')}`);
  });
});

describe('structure: server / client boundary', () => {
  const SERVER_ONLY = /^(server-only|next\/headers|fs|node:fs|fs\/promises|node:fs\/promises|path|node:path|child_process|node:child_process)$/;
  it("a 'use client' module never imports a server-only package", () => {
    const bad = mods.filter((m) => m.isClient && m.packages.some((p) => SERVER_ONLY.test(p))).map((m) => m.file);
    assert.deepEqual(bad, [], `Client module importing a server-only package:\n${bad.join('\n')}`);
  });

  it('nothing a client module imports statically touches server-only packages or the async dictionary loader', () => {
    const serverFiles = new Set(
      mods.filter((m) => m.packages.some((p) => SERVER_ONLY.test(p)) || m.file === 'i18n/get-dictionary.ts').map((m) => m.file)
    );
    const reach = staticReach(mods.filter((m) => m.isClient).map((m) => m.file));
    const bad = [...reach].filter((f) => serverFiles.has(f));
    assert.deepEqual(bad, [], `Reachable from client code:\n${bad.join('\n')}`);
  });
});

describe('structure: heavy libraries stay out of the main bundle', () => {
  const HEAVY = /^(@tsparticles\/|lottie-web|@xenova\/transformers|canvas-confetti|framer-motion)$|^@tsparticles\//;
  // framer-motion and canvas-confetti are used broadly and are tree-shaken per import, so only the
  // genuinely heavy engines are held to "load on demand".
  const ON_DEMAND = /^(@tsparticles\/|lottie-web$|@xenova\/transformers$)/;

  it('tsparticles, lottie-web and transformers are never statically reachable from an App Router entry', () => {
    const reach = staticReach(mods.filter((m) => isEntry(m.file)).map((m) => m.file));
    const bad = codeModules()
      .filter((m) => m.packages.some((p) => ON_DEMAND.test(p)) && reach.has(m.file))
      .map((m) => `${m.file} imports ${m.packages.filter((p) => ON_DEMAND.test(p)).join(', ')} statically and is reachable without next/dynamic or import()`);
    assert.deepEqual(bad, [], bad.join('\n'));
    void HEAVY;
  });
});

describe('structure: directives', () => {
  it('"use client" is the first statement of its file (an import above it silently disables it and breaks the build)', () => {
    const bad = codeModules()
      .filter((m) => /^\s*['"]use client['"]/m.test(m.text))
      .filter((m) => {
        const code = m.text.replace(/^(\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*\s*/, '');
        return !/^['"]use client['"]/.test(code);
      })
      .map((m) => m.file);
    assert.deepEqual(bad, [], `"use client" must come before every import:\n${bad.join('\n')}`);
  });

  it('modules that call client hooks or dynamic({ ssr: false }) declare "use client"', () => {
    const CLIENT_HOOKS = new Set([
      'useState',
      'useEffect',
      'useContext',
      'useReducer',
      'useCallback',
      'useMemo',
      'useRef',
      'useImperativeHandle',
      'useLayoutEffect',
      'useInsertionEffect',
      'useTransition',
      'useDeferredValue',
      'useId',
      'useSyncExternalStore',
      'useActionState',
      'useOptimistic',
      'useRouter',
      'usePathname',
      'useSearchParams',
      'useParams',
      'useSelectedLayoutSegment',
      'useSelectedLayoutSegments',
      'useDictionary',
      'useTheme',
      'useLocale',
    ]);

    const bad = codeModules()
      .filter((m) => !m.isClient)
      .filter((m) => {
        let hasClientHook = false;
        const visit = (n: ts.Node) => {
          if (ts.isCallExpression(n)) {
            const expr = n.expression;
            if (ts.isIdentifier(expr) && CLIENT_HOOKS.has(expr.text)) {
              hasClientHook = true;
            } else if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.name) && CLIENT_HOOKS.has(expr.name.text)) {
              hasClientHook = true;
            } else if (ts.isIdentifier(expr) && expr.text === 'dynamic') {
              const arg = n.arguments[1];
              if (arg && ts.isObjectLiteralExpression(arg)) {
                for (const prop of arg.properties) {
                  if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && prop.name.text === 'ssr' && prop.initializer.kind === ts.SyntaxKind.FalseKeyword) {
                    hasClientHook = true;
                  }
                }
              }
            }
          }
          if (!hasClientHook) ts.forEachChild(n, visit);
        };
        visit(m.ast);
        return hasClientHook;
      })
      .map((m) => m.file);

    assert.deepEqual(bad, [], `Modules calling client hooks must have "use client":\n${bad.join('\n')}`);
  });
});

describe('structure: feature slice architecture & public barrels', () => {
  it('forbids deep imports matching @/features/*/*', () => {
    const bad = scanLines(/from\s+['"]@\/features\/[^'"]+\/[^'"]+['"]/);
    assert.deepEqual(bad, [], `Deep feature imports are forbidden (use public @/features/* barrels):\n${bad.join('\n')}`);
  });

  it('root layout app/[locale]/layout.tsx preserves bundle isolation and never imports feature barrels', () => {
    const layout = mods.find((m) => m.file === 'app/[locale]/layout.tsx');
    assert.ok(layout, 'app/[locale]/layout.tsx must exist');
    const barrelImports = layout.staticImports.filter((f) => f.startsWith('features/'));
    assert.deepEqual(
      barrelImports,
      [],
      `app/[locale]/layout.tsx wraps every route and must not import feature barrels (import providers directly):\n${barrelImports.join('\n')}`
    );
  });
});
