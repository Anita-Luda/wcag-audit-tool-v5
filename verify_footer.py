import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        path = "file://" + os.path.abspath("index.html")
        await page.goto(path)

        # Inject some data
        await page.evaluate("""
            const app = window.WCAG_AUDIT_APP;
            app.state.criteria['1.1.1'] = { status: 'pass', level: 'A', area: ['dev'], priority: 'high' };
            app.state.criteria['1.2.1'] = { status: 'fail', level: 'AA', area: ['design'], priority: 'medium' };
            app.state.criteria['1.3.1'] = { status: 'not-applicable', level: 'AAA', area: ['content'], priority: 'low' };
            app.state.criteria['1.4.1'] = { status: 'fail', level: 'A', area: ['dev'], priority: 'high' };

            window.refreshUI();
        """)

        # Scroll to footer
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await asyncio.sleep(1)

        await page.screenshot(path="verification/footer_design.png", full_page=True)
        await browser.close()

asyncio.run(run())
