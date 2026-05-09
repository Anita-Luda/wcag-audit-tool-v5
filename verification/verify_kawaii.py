
from playwright.sync_api import sync_playwright, expect

def verify_kawaii_violet_edition(page):
    # 1. Navigate to the app
    page.goto("http://localhost:3000")

    # 2. Wait for criteria to load
    page.wait_for_selector(".audit-table tbody tr")

    # 3. Test Search
    search_input = page.locator("#criteria-search")
    search_input.fill("1.1.1")
    page.wait_for_timeout(500) # wait for filter

    # Take screenshot of search results
    page.screenshot(path="/home/jules/verification/kawaii_search_111.png")

    # 4. Clear search and test Multi-Badge
    search_input.fill("")
    page.wait_for_timeout(500)

    # Open badge popup for the first row (1.1.1)
    # Find the first area badge trigger
    first_row = page.locator(".audit-table tbody tr").first
    area_trigger = first_row.locator(".badge-trigger[data-type='area']")
    area_trigger.click()

    # Ensure popup is visible
    page.wait_for_selector(".badge-popup")

    # Check 'development' and 'design'
    page.locator(".badge-popup label:has-text('development') input").check()
    page.locator(".badge-popup label:has-text('design') input").check()

    # Close popup
    page.locator(".popup-close").click()
    page.wait_for_timeout(500)

    # Take screenshot of multiple badges
    page.screenshot(path="/home/jules/verification/kawaii_multi_badges.png")

    # 5. Global View - Summary Footer
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.wait_for_timeout(500)
    page.screenshot(path="/home/jules/verification/kawaii_footer_summary.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_kawaii_violet_edition(page)
        finally:
            browser.close()
