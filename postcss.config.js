import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import postcssHoverGate from './scripts/lib/postcssHoverGate.mjs';

// Order matters: Tailwind first, so its output (already hover-gated by
// `future.hoverOnlyWhenSupported`) exists before the gate runs and is skipped
// by it; the gate then wraps every hand-written :hover (see the plugin for why).
export default {
    plugins: [
      tailwindcss(),
      postcssHoverGate(),
      autoprefixer(),
    ],
  }
