/**
 * 星等徽章元件
 * 與舊版 .member-star 樣式一致：帶星星 SVG icon 的彩色標籤
 */

export default function StarBadge({ level = '白星', className = '' }) {
  // 星等對應的樣式
  const starStyles = {
    '白星': {
      bg: '#F5F5F5',
      color: '#666666',
      border: '#E0E0E0',
      starColor: '%23CCCCCC',
      opacity: 0.6,
    },
    '綠星': {
      bg: '#E8F5E9',
      color: '#2E7D32',
      border: '#4CAF50',
      starColor: '%234CAF50',
      opacity: 1,
    },
    '橙星': {
      bg: '#FFF3E0',
      color: '#E65100',
      border: '#FF9800',
      starColor: '%23FF9800',
      opacity: 1,
    },
    '紅星': {
      bg: '#FFEBEE',
      color: '#C62828',
      border: '#F44336',
      starColor: '%23F44336',
      opacity: 1,
    },
    '紫星': {
      bg: '#F3E5F5',
      color: '#6A1B9A',
      border: '#9C27B0',
      starColor: '%239C27B0',
      opacity: 1,
    },
  };

  const style = starStyles[level] || starStyles['白星'];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-[13px] font-medium leading-none ${className}`}
      style={{
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      {/* 星星 SVG icon */}
      <span
        style={{
          width: 18,
          height: 18,
          display: 'inline-block',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='${style.starColor}' d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'/%3E%3C/svg%3E")`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          opacity: style.opacity,
        }}
      />
      <span>{level}</span>
    </span>
  );
}
