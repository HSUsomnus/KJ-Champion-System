import { useCallback, useEffect, useState } from 'react'
import { getAdminMembers } from '../../../services/surveyApi'

// 草稿預覽（十二節 12.3）與 member-sourced 欄位設定共用：loading/error/empty/retry 四態，
// 供之後的獨立互動預覽（20.44）與建立器（20.41）直接消費，不用各自重寫抓資料邏輯。
export default function useAdminMembers() {
  const [members, setMembers] = useState([])
  const [status, setStatus] = useState('loading') // loading | error | empty | ready
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setStatus('loading')
    setError('')
    getAdminMembers()
      .then((res) => {
        const data = res.data || []
        setMembers(data)
        setStatus(data.length === 0 ? 'empty' : 'ready')
      })
      .catch((err) => {
        setError(err.message || '載入成員名單失敗')
        setStatus('error')
      })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { members, status, error, retry: load }
}
