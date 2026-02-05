export default function PageHeader({ title, onRefresh }) {
  return (
    <header className="flex-none bg-white dark:bg-background-dark border-b border-slate-100 dark:border-slate-800 z-30">
      <div className="h-[56px] px-4 flex items-center justify-between">
        <div className="w-10">
          <button
            type="button"
            onClick={onRefresh}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
            aria-label="重新整理"
          >
            <span className="material-symbols-outlined text-[24px]">refresh</span>
          </button>
        </div>
        <h1 className="text-[17px] font-bold text-slate-900 dark:text-white text-center flex-1">{title}</h1>
        <div className="w-10" />
      </div>
    </header>
  )
}
