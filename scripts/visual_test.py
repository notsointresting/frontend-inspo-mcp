import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

async def run_visual_tests():
    cwd = Path("C:/Users/Institue/subs/frontend-inspo-mcp")
    demo_url = (cwd / "demo" / "index.html").as_uri()
    print(f"Opening {demo_url}...")

    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="msedge", headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        errors = []
        page.on("pageerror", lambda err: errors.append(f"Page error: {err}"))
        page.on("console", lambda msg: errors.append(f"Console error: {msg.text}") if msg.type == "error" else None)

        await page.goto(demo_url, wait_until="networkidle")
        await asyncio.sleep(1.5)

        # 1. Desktop Baseline Hero
        await page.screenshot(path=str(cwd / "visual_1_hero.png"))
        print("Captured visual_1_hero.png")

        # 2. Scroll to Studio & Capture Marquee Tab
        await page.locator("#studio").scroll_into_view_if_needed()
        await asyncio.sleep(0.5)
        await page.screenshot(path=str(cwd / "visual_2_studio_marquee.png"))
        print("Captured visual_2_studio_marquee.png")

        # 3. Switch to Button Suite Tab
        await page.click('[data-studio="shadcn"]')
        await asyncio.sleep(0.5)
        await page.click('.var-btn[data-var="destructive"]')
        await asyncio.sleep(0.5)
        await page.screenshot(path=str(cwd / "visual_3_studio_buttons.png"))
        print("Captured visual_3_studio_buttons.png")

        # 4. Switch to 3D Tilt Card Tab
        await page.click('[data-studio="tilt"]')
        await asyncio.sleep(0.5)
        await page.hover("#interactive-tilt-card")
        await asyncio.sleep(0.5)
        await page.screenshot(path=str(cwd / "visual_4_studio_tilt.png"))
        print("Captured visual_4_studio_tilt.png")

        # 5. Switch to Radix Palette Tab
        await page.click('[data-studio="palette"]')
        await asyncio.sleep(0.5)
        await page.screenshot(path=str(cwd / "visual_5_studio_palette.png"))
        print("Captured visual_5_studio_palette.png")

        # 6. Switch to Live Sandbox Runner Tab (New Feature!)
        await page.click('[data-studio="sandbox"]')
        await asyncio.sleep(0.5)
        await page.click("#sandbox-card-cta")
        await asyncio.sleep(0.5)
        await page.screenshot(path=str(cwd / "visual_6_studio_sandbox_deal.png"))
        print("Captured visual_6_studio_sandbox_deal.png")

        # 7. Switch Sandbox Component to Verified Badge & cycle variant
        await page.select_option("#sandbox-component-select", "badge")
        await asyncio.sleep(0.5)
        await page.click("#sandbox-interact-btn")
        await asyncio.sleep(0.5)
        await page.click("#sandbox-theme-toggle")
        await asyncio.sleep(0.5)
        await page.screenshot(path=str(cwd / "visual_7_sandbox_badge_light.png"))
        print("Captured visual_7_sandbox_badge_light.png")

        # 8. Test Viewport Mode: Mobile Frame (360px) in Sandbox
        await page.click('.viewport-btn[data-viewport="mobile"]')
        await asyncio.sleep(0.5)
        await page.screenshot(path=str(cwd / "visual_8_sandbox_mobile_frame.png"))
        print("Captured visual_8_sandbox_mobile_frame.png")

        # 9. Scroll to Atlas & Test Instant Filter Search
        await page.locator("#atlas").scroll_into_view_if_needed()
        await asyncio.sleep(0.5)
        await page.fill("#q", "shader")
        await asyncio.sleep(0.5)
        await page.screenshot(path=str(cwd / "visual_9_atlas_filtered.png"))
        print("Captured visual_9_atlas_filtered.png")

        # 10. Mobile Responsive Viewport (Full Page mobile emulation 390x844)
        await page.set_viewport_size({"width": 390, "height": 844})
        await page.goto(demo_url, wait_until="networkidle")
        await asyncio.sleep(1)
        await page.screenshot(path=str(cwd / "visual_10_mobile_full.png"))
        print("Captured visual_10_mobile_full.png")

        print("Visual Test Run Complete. Errors:", errors)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_visual_tests())
