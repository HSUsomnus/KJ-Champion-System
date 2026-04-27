import { test, expect } from '@playwright/test'

/**
 * Feedback 套件 E2E
 *
 * 涵蓋手動驗證清單 5.x 的核心點位：
 *   - 5.3 ProfileEdit 4 欄空送出 → 4 個 FieldError + 第一欄 focus
 *   - 5.5 ConfirmDialog danger variant 視覺（紅色按鈕）
 *
 * 不涵蓋（保留手動）：
 *   - 5.6 PWA install standalone 模式
 *   - 真實 navigator.share Web Share API（jsdom/Playwright 桌面瀏覽器無此 API）
 *   - 真實視覺感受（顏色協調、字體渲染、動畫流暢度）
 *
 * 依賴：
 *   - 本機 vite dev server（playwright.config.js 自動 spawn）
 *   - page.route 攔截所有 /api/*，不依賴本機後端
 */

const fullUser = {
  lineId: 'U_test_e2e',
  realName: '測試用戶',
  email: 'test@example.com',
  phone: '0912345678',
  birthday: '1990-01-01',
  displayName: 'Tester',
  pictureUrl: '',
  role: '一般人',
  starLevel: '白星',
  courseRecord: '正式金流課',
  teslaFranchisee: '',
  teamResponsibilities: '',
  volunteerRecords: null,
  financialAmount: '',
}

async function setupAuth(page, user = fullUser) {
  await page.addInitScript(({ lineId, displayName }) => {
    localStorage.setItem('lineUserId', lineId)
    localStorage.setItem('lineDisplayName', displayName)
  }, { lineId: user.lineId, displayName: user.displayName })

  // 統一 mock：所有 /api/** 攔截，依 path 分流
  // 主要 endpoint：/api/profile（AuthContext.useEffect 會打）→ 回完整 user
  // 其他 endpoint：回 success + 空陣列
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    const pathname = url.pathname

    if (pathname === '/api/profile' || pathname.startsWith('/api/profile/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        // mapMember 會用 m.name → realName，所以同時提供 name 與 realName 雙保險
        body: JSON.stringify({
          success: true,
          data: { ...user, name: user.realName },
        }),
      })
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
}

/** 點 FAB 主按鈕展開後，點指定 label 的子項按鈕 */
async function clickFabAction(page, label) {
  await page.getByLabel('操作選單').click()
  // 等展開動畫
  await page.waitForTimeout(250)
  // span(label) 的下一個 sibling 是 button
  await page.locator(`xpath=//span[text()="${label}"]/following-sibling::button`).click()
}

test.describe('feedback E2E', () => {
  test('5.3 ProfileEdit 4 欄都空送出 → 4 個 FieldError + 第一欄 focus', async ({ page }) => {
    await setupAuth(page, fullUser)
    await page.goto('/profile/edit')

    // 等到 ProtectedRoute 通過、頁面標題出現
    await expect(page.getByRole('heading', { name: '編輯資料' })).toBeVisible()

    // 4 個輸入框（依 fields 順序：真實姓名 / Email / 電話 / 生日）
    const inputs = page.locator('main input')
    await expect(inputs).toHaveCount(4)

    // 全部清空
    await inputs.nth(0).fill('')
    await inputs.nth(1).fill('')
    await inputs.nth(2).fill('')
    await inputs.nth(3).fill('')

    // 點 FAB「確認/儲存」
    await clickFabAction(page, '確認/儲存')

    // 4 個 FieldError 全部出現
    await expect(page.getByText('請輸入真實姓名')).toBeVisible()
    await expect(page.getByText('請輸入 Email')).toBeVisible()
    await expect(page.getByText('請輸入電話號碼')).toBeVisible()
    await expect(page.getByText('請選擇生日')).toBeVisible()

    // 第一欄（真實姓名）自動 focus
    await expect(inputs.nth(0)).toBeFocused()

    // 第一欄邊框變紅（#C0392B）— 抽 inline style 驗
    const firstBorder = await inputs.nth(0).evaluate(el => el.style.border)
    expect(firstBorder).toContain('rgb(192, 57, 43)')

    // 在第一欄輸入字 → 對應 FieldError 立即消失
    await inputs.nth(0).fill('王小明')
    await expect(page.getByText('請輸入真實姓名')).not.toBeVisible()
    // 其他三個還在
    await expect(page.getByText('請輸入 Email')).toBeVisible()
  })

  test('5.5 ProfileEdit 未儲存按 FAB 取消 → ConfirmLeaveDialog danger 樣式', async ({ page }) => {
    await setupAuth(page, fullUser)
    await page.goto('/profile/edit')
    await expect(page.getByRole('heading', { name: '編輯資料' })).toBeVisible()

    // 動一下表單（讓 useLeaveGuard 認為有未儲存改動）
    const inputs = page.locator('main input')
    await inputs.nth(0).fill('改一下')

    // 點 FAB「取消」（離開頁面）
    await clickFabAction(page, '取消')

    // ConfirmLeaveDialog 跳出（這就是 ConfirmDialog danger variant 的視覺驗證）
    await expect(page.getByText('尚未儲存資料，確認離開？')).toBeVisible()

    // 「確認離開」按鈕應有 danger variant 樣式：#FDECEA 底 + #C0392B 字 + #C0392B 邊框
    const dangerBtn = page.getByRole('button', { name: '確認離開' })
    await expect(dangerBtn).toBeVisible()

    const styles = await dangerBtn.evaluate(el => ({
      background: el.style.background,
      color: el.style.color,
      border: el.style.border,
    }))
    expect(styles.background).toContain('rgb(253, 236, 234)') // #FDECEA
    expect(styles.color).toContain('rgb(192, 57, 43)') // #C0392B
    expect(styles.border).toContain('rgb(192, 57, 43)')

    // 「取消」按鈕應為 muted 樣式：#EFEDE9 底 + #8A8680 字
    const cancelBtn = page.getByRole('button', { name: '取消' }).last()
    const cancelStyles = await cancelBtn.evaluate(el => ({
      background: el.style.background,
      color: el.style.color,
    }))
    expect(cancelStyles.background).toContain('rgb(239, 237, 233)') // #EFEDE9
    expect(cancelStyles.color).toContain('rgb(138, 134, 128)') // #8A8680

    // 點「取消」→ 對話框關閉，留在頁面
    await cancelBtn.click()
    await expect(page.getByText('尚未儲存資料，確認離開？')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: '編輯資料' })).toBeVisible()
  })
})
