/**
 * 頁面標題列
 * 與舊版 .page-header-fixed 一致：置中標題、選用重新整理按鈕
 */

export default function PageHeader({ title, onRefresh }) {
  return (
    <div className="sticky top-0 z-[100] bg-[#F5F5F5] -mx-4 -mt-3 pt-4 pb-3 px-4 mb-3 min-h-[52px] flex items-center justify-between">
      {onRefresh ? (
        <>
          <button
            type="button"
            onClick={onRefresh}
            className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#E0E0E0] bg-white text-[#333] hover:bg-[#F5F5F5] transition-colors shrink-0"
            title="清除快取並重新整理"
            aria-label="清除快取並重新整理"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold text-[#333] text-center max-w-[calc(100%-100px)]">
            {title}
          </h1>
          <div className="w-10 shrink-0" />
        </>
      ) : (
        <h1 className="text-lg font-bold text-[#333]">{title}</h1>
      )}
    </div>
  );
}
