
from playwright.sync_api import sync_playwright, expect

def verify_dark_mode_and_modals(page):
    page.goto("http://localhost:3000")
    page.wait_for_selector(".audit-table tbody tr")

    # 1. Verify Dark Mode
    theme_btn = page.locator("#theme-toggle-btn")
    theme_btn.click() # Switch to Dark
    page.wait_for_timeout(500)
    page.screenshot(path="/home/jules/verification/dark_mode_witchy.png")

    # 2. Verify Custom Modals
    # Trigger an alert (click Save Version when auditId is default)
    # The current audit is 'default' which is blocked for versioning in my logic
    page.locator("#save-version-btn").click()
    page.wait_for_selector(".kawaii-modal", timeout=5000)
    page.screenshot(path="/home/jules/verification/custom_modal_alert.png")
    page.locator(".kawaii-modal button").click() # Close alert

    # Trigger a prompt (New Audit)
    page.locator("#app-name").fill("My Super App")
    page.locator("#create-audit-btn").click()
    page.wait_for_selector(".modal-content", timeout=5000) # This is the NEW AUDIT DIALOG
    page.screenshot(path="/home/jules/verification/new_audit_dialog.png")

    # Let's test the custom prompt directly by calling it in console
    page.evaluate("window.kawaii.prompt('Test Prompt', 'Initial Value')")
    page.wait_for_selector(".kawaii-modal", timeout=5000)
    page.locator("#kawaii-prompt-input").fill("Kawaii Value")
    page.screenshot(path="/home/jules/verification/custom_modal_prompt.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_dark_mode_and_modals(page)
        finally:
            browser.close()
