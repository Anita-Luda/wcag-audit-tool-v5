
from playwright.sync_api import sync_playwright, expect

def test_multi_area_filter(page):
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

    # Verify the row has multiple areas in dataset
    first_row = page.locator(".audit-table tbody tr").first
    areas = first_row.get_attribute("data-areas")
    print(f"Row areas: {areas}")

    # 2. Filter by 'Dev' (development)
    dev_filter = page.locator("input[name='filter-area'][value='development']").locator("..")
    dev_filter.click() # Set to include

    page.wait_for_timeout(500)

    # Expect 1.1.1 to be VISIBLE
    expect(first_row).not_to_have_attribute("hidden", "")
    print("Row 1.1.1 visible when 'development' included (Correct)")

    # 3. Filter by 'Design' (design) - BOTH development and design included
    design_filter = page.locator("input[name='filter-area'][value='design']").locator("..")
    design_filter.click() # Set to include

    page.wait_for_timeout(500)
    expect(first_row).not_to_have_attribute("hidden", "")
    print("Row 1.1.1 visible when both 'development' and 'design' included (Correct)")

    # 4. Set 'Design' to exclude
    design_filter.click() # Now it should be 'exclude'
    page.wait_for_timeout(500)

    # Expect 1.1.1 to be HIDDEN because design is excluded and the row HAS design
    expect(first_row).to_have_attribute("hidden", "")
    print("Row 1.1.1 hidden when 'design' excluded (Correct)")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_multi_area_filter(page)
        finally:
            browser.close()
