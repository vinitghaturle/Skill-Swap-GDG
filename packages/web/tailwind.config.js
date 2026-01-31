/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Warm primary color palette - orange tones
                primary: {
                    50: '#fef6ee',
                    100: '#fdebd6',
                    200: '#fbd4ac',
                    300: '#f8b877',
                    400: '#F3B46F', // Soft warm orange
                    500: '#E3500D', // Deep vivid orange
                    600: '#c23d08',
                    700: '#a12e09',
                    800: '#83240f',
                    900: '#6c1f0f',
                    950: '#3a0c04',
                },
                // Warm secondary palette - brown tones
                secondary: {
                    50: '#faf7f5',
                    100: '#ECE9E7', // Off-white neutral
                    200: '#E7BDA9', // Supporting warm tone
                    300: '#d9a68a',
                    400: '#c88a6b',
                    500: '#AB6C91', // Supporting accent
                    600: '#B0411C', // Supporting warm brown
                    700: '#622814', // Dark burnt brown
                    800: '#4a1d0f',
                    900: '#3d1a0e',
                    950: '#180805', // Very dark almost black
                },
                // Warm accent colors
                warm: {
                    50: '#fef6ee',
                    100: '#fdebd6',
                    200: '#fbd4ac',
                    300: '#f8b877',
                    400: '#F3B46F',
                    500: '#E3500D',
                    600: '#c23d08',
                    700: '#622814',
                    800: '#3d1a0e',
                    900: '#180805',
                    950: '#0a0402',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
