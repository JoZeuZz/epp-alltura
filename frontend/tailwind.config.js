/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    // Breakpoints personalizados (mantiene defaults de Tailwind + xs adicional)
    screens: {
      'xs': '480px',   // Extra small devices (grandes smartphones landscape)
      'sm': '640px',   // Small devices (tablets pequeñas)
      'md': '768px',   // Medium devices (tablets)
      'lg': '1024px',  // Large devices (laptops)
      'xl': '1280px',  // Extra large (desktops)
      '2xl': '1536px', // 2X Extra large (grandes pantallas)
    },
    extend: {
      colors: {
        'primary-blue': '#2A64A4', // Azul Primario (Acciones)
        'dark-blue': '#1E2A4A',    // Azul Oscuro (Fondos/Texto)
        'neutral-gray': '#6B7280', // Gris Neutro (Secundario)
        'light-gray-bg': '#F9FAFB' // Fondo Principal Claro
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
      },
      spacing: {
        // Safe area insets para dispositivos con notch
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
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
        'auto-fit': 'repeat(auto-fit, minmax(250px, 1fr))',
        'auto-fit-sm': 'repeat(auto-fit, minmax(150px, 1fr))',
        'auto-fit-lg': 'repeat(auto-fit, minmax(350px, 1fr))',
      },
    },
  },
  plugins: [],
}
