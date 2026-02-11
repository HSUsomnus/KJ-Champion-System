/**
 * 頁面標題列
 * 含選用的重新整理按鈕
 */

export default function PageHeader({ title, onRefresh }) {
  return (
    <div className="flex items-center justify-between mb-4">
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="p-2 -ml-2 text-text-light hover:text-primary transition-colors"
          title="清除快取並重新整理"
          aria-label="清除快取並重新整理"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <path d="M23 4v6h-6" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      )}
      <h1 className={`text-2xl font-bold text-text-main flex-1 ${onRefresh ? 'text-center' : ''}`}>
        {title}
      </h1>
      {onRefresh && <div className="w-9" />}
    </div>
  );
}
