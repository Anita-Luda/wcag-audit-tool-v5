from playwright.sync_api import Page, expect, sync_playwright
import time
import os

def verify_theme_improvements(page: Page):
    page.goto("http://localhost:3000")

    # Create verification directory
    v_dir = "verification/theme_check"
    if not os.path.exists(v_dir):
        os.makedirs(v_dir)

    # 1. Check Light Mode Header & Export Buttons
    page.wait_for_selector("#theme-toggle-btn")
    page.screenshot(path=os.path.join(v_dir, "light_mode_header.png"), full_page=False)

    # 2. Open a modal in Light Mode to see secondary buttons
    page.fill("#app-name", "Verification App")
    page.click('button:has-text("Nowy")')
    page.wait_for_selector(".modal-overlay")
    page.screenshot(path=os.path.join(v_dir, "light_mode_modal.png"))
    page.click("#modal-cancel")

    # 3. Switch to Dark Mode
    page.click("#theme-toggle-btn")
    time.sleep(0.5) # Wait for transition

    # 4. Check Dark Mode Header
    page.screenshot(path=os.path.join(v_dir, "dark_mode_header.png"), full_page=False)

    # 5. Check Summary in Dark Mode (Bright spot check)
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    time.sleep(0.3)
    page.screenshot(path=os.path.join(v_dir, "dark_mode_summary.png"))

    # 6. Check Modal in Dark Mode (White button check)
    page.evaluate("window.scrollTo(0, 0)")
    page.click('button:has-text("Nowy")')
    page.wait_for_selector(".modal-overlay")

    # Select an option to see the "selected" background
    page.click(".modal-option:first-child")

    page.screenshot(path=os.path.join(v_dir, "dark_mode_modal.png"))
    print("Theme verification screenshots generated in verification/theme_check/")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_theme_improvements(page)
        finally:
            browser.close()
