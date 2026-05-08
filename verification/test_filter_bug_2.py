
from playwright.sync_api import sync_playwright, expect

def test_multi_area_filter_2(page):
    page.goto("http://localhost:3000")
    page.wait_for_selector(".audit-table tbody tr")

    # 1. Manually set a row to have multiple areas
    # We'll use criterion 1.1.1 (first row)
    page.evaluate("""
        const app = window.WCAG_AUDIT_APP;
        const id = app.definitions.criteria[0].id;
        app.state.criteria[id] = app.state.criteria[id] || {};
        app.state.criteria[id].areas = ['development', 'design'];
        window.refreshUI();
    """)

    first_row = page.locator(".audit-table tbody tr").first
    print(f"Row 1.1.1 visible: {not first_row.is_hidden()}")

    # 2. Filter by 'Content' (include)
    content_filter = page.locator("input[name='filter-area'][value='content']").locator("..")
    content_filter.click() # Include
    print("Filter: Include 'content'")
    page.wait_for_timeout(500)

    # Expect 1.1.1 to be HIDDEN because it only has development/design, and we are ONLY including content
    visible = not first_row.is_hidden()
    print(f"Row 1.1.1 visible: {visible}")
    if visible:
        print("FAIL: Row 1.1.1 should be hidden if only 'content' is included")
    else:
        print("PASS: Row 1.1.1 hidden (Correct)")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_multi_area_filter_2(page)
        finally:
            browser.close()
