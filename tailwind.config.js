/** @type {import('tailwindcss').Config} */
module.exports = {
  // Lista de arquivos que o Tailwind deve escanear para encontrar classes
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // Configura a fonte Inter como a fonte sans-serif padrão
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      // Aqui você pode adicionar cores personalizadas
      colors: {
        'primary': '#059669', // emerald-600
        'secondary': '#facc15', // amber-400
      }
    },
  },
  plugins: [
    // Essencial para estilizar conteúdo gerado, como o Markdown do Gemini
    require('@tailwindcss/typography'),
  ],
}
