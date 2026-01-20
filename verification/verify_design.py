from playwright.sync_api import sync_playwright
import time
import os

def capture_screenshots():
    if not os.path.exists("verification/screenshots"):
        os.makedirs("verification/screenshots")

    viewports = {
        "desktop": {"width": 1920, "height": 1080},
        "laptop": {"width": 1366, "height": 768},
        "tablet": {"width": 768, "height": 1024},
        "mobile": {"width": 375, "height": 667}
    }

    pages = {
        "dashboard": "http://localhost:3000",
        "admin": "http://localhost:3000/admin"
    }

    with sync_playwright() as p:
        browser = p.chromium.launch()

        for vp_name, vp_dim in viewports.items():
            context = browser.new_context(viewport=vp_dim)
            page = context.new_page()

            for page_name, url in pages.items():
                print(f"Capturing {page_name} on {vp_name}...")
                try:
                    page.goto(url)
                    # Wait for animations or dynamic content
                    time.sleep(2)
                    filename = f"verification/screenshots/{page_name}_{vp_name}.png"
                    page.screenshot(path=filename, full_page=True)
                except Exception as e:
                    print(f"Failed to capture {page_name} on {vp_name}: {e}")

            context.close()

        browser.close()

if __name__ == "__main__":
    capture_screenshots()
