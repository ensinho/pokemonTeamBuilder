// PostCSS plugin: hover only where hover exists, and a press where it does not.
//
// A phone has no hover, so the browser fakes one — the first tap applies
// `:hover` and leaves it applied until the next tap lands somewhere else. Every
// hand-written `:hover` in src/styles was therefore a state that stuck on after
// the finger left: a card stayed lit, a row stayed tinted, a button kept its
// hover fill as if still pressed. Tailwind's `hover:` utilities were already
// gated (`future.hoverOnlyWhenSupported`); the ~280 rules written by hand were
// not, and gating them one by one is exactly the kind of sweep that drifts.
//
// So the build does it. For every rule whose selector mentions `:hover`:
//
//   1. The hover selectors move into `@media (hover: hover) and (pointer: fine)`
//      — the same query Tailwind uses — placed where the rule was, so source
//      order (and therefore the cascade) is unchanged. Selectors in the same
//      list without `:hover` (`.x:hover, .x:focus-visible`) stay ungated.
//   2. On every other device, the rule's *fill and colour* declarations are
//      re-emitted on `:active`. On a phone, what used to be a stuck hover
//      becomes press feedback that lets go with the finger — the one feedback
//      touch actually needs. Layout, transform and opacity are deliberately
//      left out: a hover that lifts a card or reveals a hidden control is not
//      something a press should do.
//
// Rules already inside a hover media query are left alone, so Tailwind's
// output and anything gated by hand pass through untouched.

const HOVER_MEDIA = '(hover: hover) and (pointer: fine)';
// The exact complement of HOVER_MEDIA in the level-3 syntax every engine reads.
const PRESS_MEDIA = 'not all and (hover: hover) and (pointer: fine)';

const PRESS_PROPS = new Set([
    'background',
    'background-color',
    'color',
    'border-color',
    'box-shadow',
    'fill',
    'stroke',
    'outline-color',
    'text-decoration-color',
]);

const HOVER_RE = /:hover\b/;

function isInside(rule, test) {
    for (let node = rule.parent; node; node = node.parent) {
        if (node.type === 'atrule' && test(node)) return true;
    }
    return false;
}

const inKeyframes = (rule) => isInside(rule, (at) => /keyframes$/i.test(at.name));
const inHoverMedia = (rule) => isInside(rule, (at) => at.name === 'media' && /hover/.test(at.params));

export default function postcssHoverGate() {
    return {
        postcssPlugin: 'hover-gate',
        Once(root, { AtRule }) {
            const targets = [];
            root.walkRules((rule) => {
                if (!HOVER_RE.test(rule.selector)) return;
                if (inKeyframes(rule) || inHoverMedia(rule)) return;
                targets.push(rule);
            });

            for (const rule of targets) {
                const hoverSelectors = rule.selectors.filter((s) => HOVER_RE.test(s));
                const otherSelectors = rule.selectors.filter((s) => !HOVER_RE.test(s));

                const gate = new AtRule({ name: 'media', params: HOVER_MEDIA });
                gate.append(rule.clone({ selectors: hoverSelectors }));

                const pressDecls = rule.nodes.filter(
                    (node) => node.type === 'decl' && PRESS_PROPS.has(node.prop.toLowerCase())
                );
                let press = null;
                if (pressDecls.length) {
                    press = new AtRule({ name: 'media', params: PRESS_MEDIA });
                    const pressRule = rule.clone({
                        selectors: hoverSelectors.map((s) => s.replace(/:hover\b/g, ':active')),
                    });
                    pressRule.removeAll();
                    pressDecls.forEach((decl) => pressRule.append(decl.clone()));
                    press.append(pressRule);
                }

                if (otherSelectors.length) {
                    rule.selectors = otherSelectors;
                    rule.after(gate);
                } else {
                    rule.replaceWith(gate);
                }
                if (press) gate.after(press);
            }
        },
    };
}

postcssHoverGate.postcss = true;
