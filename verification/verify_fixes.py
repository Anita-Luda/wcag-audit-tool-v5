from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_fixes(page: Page):
    page.goto("http://localhost:3000")

    # Wait for the app to be ready
    page.wait_for_selector("#app-name")

    # 1. Verify Three-State Filters
    # Get the first filter label in the 'Poziom' group
    filter_label = page.locator(".filter-group:has(legend:text('Poziom')) label").first
    filter_input = filter_label.locator("input")

    # Neutral state
    expect(filter_label).not_to_have_class(r"filter-include")
    expect(filter_label).not_to_have_class(r"filter-exclude")

    # Click -> Include
    filter_input.click()
    expect(filter_label).to_have_class(r"filter-include")

    # Click -> Exclude
    filter_input.click()
    expect(filter_label).to_have_class(r"filter-exclude")

    # Click -> Neutral
    filter_input.click()
    expect(filter_label).not_to_have_class(r"filter-include")
    expect(filter_label).not_to_have_class(r"filter-exclude")

    # 2. Verify Save Version Button (Alert for default project)
    def handle_dialog(dialog):
        assert "Najpierw wybierz lub utwórz projekt" in dialog.message
        dialog.dismiss()

    page.on("dialog", handle_dialog)
    page.click("#save-version-btn")

    # 3. Verify App Name sync
    page.fill("#app-name", "Kawaii App Test")
    # Verify it stays there
    expect(page.locator("#app-name")).to_have_value("Kawaii App Test")

    page.screenshot(path="verification/fix_verification_final.png", full_page=True)
    print("Verification successful!")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_fixes(page)
        finally:
            browser.close()
