import PageHeader from '../components/PageHeader'

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="個人檔案" onRefresh={() => window.location.reload()} />
      <div className="flex-1 overflow-y-auto p-6 pb-24">
        <p className="text-slate-500 dark:text-gray-400 text-center">此為設計稿預覽，個人檔案頁面可依設計稿擴充。</p>
      </div>
    </>
  )
}
