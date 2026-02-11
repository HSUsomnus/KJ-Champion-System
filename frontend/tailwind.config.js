/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // 沿用舊前端的色彩系統（LINE 品牌綠）
      colors: {
        primary: '#06C755',
        'primary-dark': '#00B900',
        'text-main': '#333333',
        'text-light': '#666666',
        'bg-page': '#F5F5F5',
        'card-bg': '#FFFFFF',
        border: '#E0E0E0',
        // 行程類型色
        'type-class': { bg: '#FFF9C4', text: '#F57F17' },
        'type-event': { bg: '#FFEBEE', text: '#C62828' },
        'type-consult': { bg: '#E8F5E9', text: '#2E7D32' },
        // 星等
        'star-white': '#E0E0E0',
        'star-green': '#4CAF50',
        'star-orange': '#FF9800',
        'star-red': '#F44336',
        'star-purple': '#9C27B0',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          "'Segoe UI'",
          "'Microsoft JhengHei'",
          '微軟正黑體',
          'Arial',
          'sans-serif',
        ],
      },
      // 底部導航欄高度
      spacing: {
        'nav-bottom': '54px',
      },
    },
  },
  plugins: [],
};
