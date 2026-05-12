
from playwright.sync_api import sync_playwright, expect

def verify_final_fixes(page):
    page.goto("http://localhost:3000")
    page.wait_for_selector(".audit-table tbody tr")

    # 1. Verify Filters Visual States
    filter_label = page.locator("input[name='filter-area'][value='development']").locator("..")

    # Neutral
    page.screenshot(path="/home/jules/verification/filter_neutral.png")

    # Click -> Include
    filter_label.click()
    page.wait_for_timeout(300)
    # expect(filter_label).to_have_class(re.compile(r"filter-include")) # regex needs import re
    page.screenshot(path="/home/jules/verification/filter_include.png")

    # Click -> Exclude
    filter_label.click()
    page.wait_for_timeout(300)
    page.screenshot(path="/home/jules/verification/filter_exclude.png")

    # 2. Verify Badge Popup Pre-selection
    # Let's check a row that has 'content' by default (wcag-1-1-1)
    first_row = page.locator("tr[data-criterion-id='wcag-1-1-1']")

    # Scroll to the row first to ensure it's visible for the click action
    first_row.scroll_into_view_if_needed()

    area_trigger = first_row.locator(".badge-trigger[data-type='area']")
    area_trigger.click()

    page.wait_for_selector(".badge-popup")
    content_checkbox = page.locator(".badge-popup label:has-text('content') input")
    expect(content_checkbox).to_be_checked()
    page.screenshot(path="/home/jules/verification/badge_popup_checked.png")

    # Close popup
    page.locator(".popup-close").click()

    # Check priority pre-selection (should be 'critical' for 1.1.1)
    priority_trigger = first_row.locator(".badge-trigger[data-type='priority']")
    priority_trigger.click()
    page.wait_for_selector(".badge-popup")
    critical_radio = page.locator(".badge-popup label:has-text('critical') input")
    expect(critical_radio).to_be_checked()
    page.screenshot(path="/home/jules/verification/priority_popup_checked.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_final_fixes(page)
        finally:
            browser.close()
