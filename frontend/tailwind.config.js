/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@jozeuZz/alltura-ui/src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    // Breakpoints personalizados (mantiene defaults de Tailwind + xs adicional)
    screens: {
      'xs':  '480px',   // Extra small devices (grandes smartphones landscape)
      'sm':  '640px',   // Small devices (tablets pequeñas)
      'md':  '768px',   // Medium devices (tablets)
      'lg':  '1024px',  // Large devices (laptops)
      'xl':  '1280px',  // Extra large (desktops)
      '2xl': '1536px',  // 2X Extra large (grandes pantallas)
    },
    extend: {
      colors: {
        // ── Legacy tokens — backward-compat, keep existing class names working ─
        'primary-blue':  '#1E2A4A',
        'dark-blue':     '#1E2A4A',
        'neutral-gray':  '#6B7280',
        'light-gray-bg': '#F9FAFB',

        // ── Semantic: Primary ─────────────────────────────────────────────────
        // bg-primary · text-primary · border-primary
        // bg-primary-hover · bg-primary-light · bg-primary-dark
        primary: {
          DEFAULT: 'var(--c-primary)',        // #1E2A4A — brand navy, 13.0:1 on white ✓ AAA
          hover:   'var(--c-primary-hover)',  // #2A3C66 — lighter navy hover/pressed
          light:   'var(--c-primary-light)',  // #EBF3FC — selections, highlights
          dark:    'var(--c-primary-dark)',   // #141E34 — deeper navy, hover text
        },

        // ── Semantic: Surfaces ────────────────────────────────────────────────
        // bg-surface · bg-surface-muted · bg-surface-overlay
        surface: {
          DEFAULT: 'var(--c-surface)',          // #FFFFFF — base card/panel
          muted:   'var(--c-surface-muted)',    // #F9FAFB — page / section bg
          overlay: 'var(--c-surface-overlay)', // #F3F4F6 — hover rows, input bg
        },

        // ── Semantic: Text ────────────────────────────────────────────────────
        // text-content-primary · text-content-secondary · text-content-muted
        // text-content-disabled · text-content-inverse
        content: {
          primary:   'var(--c-text-primary)',   // #1E2A4A — 13.0:1 ✓ AAA headings
          secondary: 'var(--c-text-secondary)', // #374151 — 10.7:1 ✓ AAA body
          muted:     'var(--c-text-muted)',     // #6B7280 —  4.99:1 ✓ AA secondary
          disabled:  'var(--c-text-disabled)',  // #9CA3AF — decorative only
          inverse:   'var(--c-text-inverse)',   // #FFFFFF — text on dark/colored bg
        },

        // ── Semantic: Borders ─────────────────────────────────────────────────
        // border-edge · border-edge-subtle · border-edge-strong · border-edge-focus
        edge: {
          DEFAULT: 'var(--c-border)',         // #E5E7EB — default dividers
          subtle:  'var(--c-border-subtle)',  // #F3F4F6 — very soft separation
          strong:  'var(--c-border-strong)',  // #D1D5DB — strong/active borders
          focus:   'var(--c-border-focus)',   // #1E2A4A — focus indicator border
        },

        // ── Semantic: Feedback states ─────────────────────────────────────────
        // Each state provides four tokens:
        //   DEFAULT  — solid color for icons, large elements (use .text token for body text)
        //   subtle   — very light bg for badges / alert panels
        //   border   — light stroke for badge / card borders
        //   text     — AA-verified dark shade for readable text on white
        //
        // Usage example:  bg-success-subtle text-success-text border border-success-border
        success: {
          DEFAULT: 'var(--c-success)',        // #16A34A — icons / large elements
          subtle:  'var(--c-success-subtle)', // #F0FDF4 — badge bg
          border:  'var(--c-success-border)', // #86EFAC — badge border
          text:    'var(--c-success-text)',   // #15803D — 5.01:1 on white ✓ AA
        },
        warning: {
          DEFAULT: 'var(--c-warning)',        // #D97706 — icons / large elements
          subtle:  'var(--c-warning-subtle)', // #FFFBEB — badge bg
          border:  'var(--c-warning-border)', // #FCD34D — badge border
          text:    'var(--c-warning-text)',   // #92400E — 7.08:1 on white ✓ AAA
        },
        danger: {
          DEFAULT: 'var(--c-danger)',         // #DC2626 — 4.83:1 on white ✓ AA
          subtle:  'var(--c-danger-subtle)',  // #FEF2F2 — badge bg
          border:  'var(--c-danger-border)',  // #FECACA — badge border
          text:    'var(--c-danger-text)',    // #991B1B — 8.32:1 on white ✓ AAA
        },
        info: {
          DEFAULT: 'var(--c-info)',           // #0369A1 — 5.92:1 on white ✓ AA
          subtle:  'var(--c-info-subtle)',    // #F0F9FF — badge bg
          border:  'var(--c-info-border)',    // #BAE6FD — badge border
          text:    'var(--c-info-text)',      // #075985 — 7.56:1 on white ✓ AAA
        },
      },

      fontFamily: {
        sans: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      // ── Semantic elevation scale ─────────────────────────────────────────────
      // Replaces ad-hoc shadow-sm/md/lg usage with intent-named shadows.
      boxShadow: {
        'card':       '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.12), 0 2px 4px -1px rgb(0 0 0 / 0.07)',
        'dropdown':   '0 4px 16px 0 rgb(0 0 0 / 0.12), 0 1px 4px -1px rgb(0 0 0 / 0.08)',
        'modal':      '0 20px 60px -8px rgb(0 0 0 / 0.22), 0 8px 20px -4px rgb(0 0 0 / 0.12)',
      },

      spacing: {
        // Safe area insets para dispositivos con notch
        'safe-top':    'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left':   'env(safe-area-inset-left)',
        'safe-right':  'env(safe-area-inset-right)',
      },

      minHeight: {
        // Touch targets mínimos para accesibilidad móvil (44px según WCAG)
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },

      gridTemplateColumns: {
        // Grid auto-fit para columnas que se ajustan automáticamente
        'auto-fit':    'repeat(auto-fit, minmax(250px, 1fr))',
        'auto-fit-sm': 'repeat(auto-fit, minmax(150px, 1fr))',
        'auto-fit-lg': 'repeat(auto-fit, minmax(350px, 1fr))',
      },

      // ── Transition tokens ────────────────────────────────────────────────────
      transitionDuration: {
        'fast': '100ms', // micro-interactions (icon swaps, checkbox ticks)
        'base': '150ms', // standard UI (buttons, hovers, inputs)
        // 'slow' → use Tailwind default 300ms
      },
      transitionTimingFunction: {
        'ui': 'cubic-bezier(0.4, 0, 0.2, 1)', // matches Tailwind ease-in-out but named for intent
      },
    },
  },
  plugins: [],
}
