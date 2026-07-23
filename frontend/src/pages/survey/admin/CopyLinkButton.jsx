import { useState } from 'react'

export default function CopyLinkButton({ token }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!token) return
    const url = `${window.location.origin}/f/${token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!token}
      style={{
        padding: '8px 16px',
        borderRadius: 16,
        border: '1.5px solid #E2DED8',
        background: '#FFFFFF',
        color: '#2C2C2C',
        fontSize: 12,
        fontWeight: 500,
        cursor: token ? 'pointer' : 'default',
      }}
    >
      {copied ? '已複製' : '複製連結'}
    </button>
  )
}
