from pathlib import Path

from playwright.sync_api import sync_playwright


ARTIFACTS = Path(__file__).parent / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    errors = []
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(str(error)))

    page.goto("http://127.0.0.1:4173")
    page.wait_for_load_state("networkidle")
    assert page.locator("[data-page='dashboard']").is_visible()
    assert "当前净资产" in page.locator("#dashboard-content").inner_text()

    page.locator("[data-action='new-transaction']").click()
    page.locator("#transaction-form [name='amount']").fill("42.60")
    page.locator("#transaction-form [name='merchant']").fill("回归测试咖啡")
    page.locator("#transaction-form button[type='submit']").click()
    page.locator("#toast", has_text="记录已保存").wait_for(state="visible")
    assert page.locator("#dashboard-content").get_by_text("回归测试咖啡", exact=True).is_visible()

    page.locator("[data-route='transactions']").first.click()
    page.locator("#transaction-search").fill("回归测试咖啡")
    assert page.locator("#transaction-list").get_by_text("回归测试咖啡", exact=True).is_visible()
    page.locator("[data-filter='income']").click()
    assert "没有符合条件的交易" in page.locator("#transaction-list").inner_text()

    page.locator("[data-route='budgets']").first.click()
    page.locator("[data-action='new-budget']").click()
    page.locator("#budget-form [name='category']").select_option(label="医疗")
    page.locator("#budget-form [name='amount']").fill("500")
    page.locator("#budget-form button[type='submit']").click()
    assert page.locator("#budget-list").get_by_text("医疗", exact=True).is_visible()

    page.locator("[data-route='dashboard']").first.click()
    page.screenshot(path=str(ARTIFACTS / "dashboard-desktop.png"), full_page=True)
    page.set_viewport_size({"width": 390, "height": 844})
    page.screenshot(path=str(ARTIFACTS / "dashboard-mobile.png"), full_page=True)

    assert errors == [], f"Browser errors: {errors}"
    browser.close()

print("Browser smoke test passed: dashboard, transaction, filter, budget, responsive layout")
