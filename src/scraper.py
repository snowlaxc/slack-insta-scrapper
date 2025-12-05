import os
import requests
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

def setup_driver():
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1920,1080')
    # Add user agent to avoid immediate blocking
    options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    return driver

def get_latest_post_image_url(driver):
    print("Accessing Instagram...")
    driver.get("https://www.instagram.com/accounts/login/")
    wait = WebDriverWait(driver, 10)

    # Check if login is needed
    if "Login" in driver.title or "로그인" in driver.title:
        print("Login page detected.")
        username = os.getenv("INSTAGRAM_USERNAME")
        password = os.getenv("INSTAGRAM_PASSWORD")
        
        if not username or not password:
            print("Error: Instagram login required but credentials not found in .env")
            print("Please set INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD in .env")
            return None
            
        try:
            print(f"Attempting login as {username}...")
            username_input = wait.until(EC.presence_of_element_located((By.NAME, "username")))
            password_input = driver.find_element(By.NAME, "password")
            
            username_input.send_keys(username)
            password_input.send_keys(password)
            
            login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            login_button.click()
            
            # Wait for login to complete (check for profile icon or home)
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "svg[aria-label='Home']")))
            print("Login successful!")
        except Exception as e:
            print(f"Login failed: {e}")
            return None

    profile_url = os.getenv("INSTAGRAM_PROFILE_URL", "https://www.instagram.com/tsis_coys/")
    print(f"Accessing profile: {profile_url}")
    driver.get(profile_url)
    
    print("Waiting for posts...")
    try:
        # Find first post link
        # Instagram structure changes, try generic selector for post links
        first_post_link = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "a[href*='/p/']")))
        post_url = first_post_link.get_attribute('href')
        print(f"Found first post URL: {post_url}")
        
        # Navigate to post
        driver.get(post_url)
        
        print("Waiting for image...")
        # Find image with sizes attribute (usually the main post image)
        # Try multiple selectors for image
        try:
            image_element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "img[sizes]")))
        except:
            print("Standard image selector failed, trying fallback...")
            try:
                # Try finding image by style (common in Instagram posts)
                image_element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "img[style*='object-fit: cover']")))
            except:
                print("Fallback selector failed, trying generic img in div...")
                # Last resort: find the largest image or first image in a likely container
                image_element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div[role='button'] img")))

        image_url = image_element.get_attribute('src')
        print(f"Found image URL: {image_url}")
        
        return image_url
    except Exception as e:
        print(f"Error during scraping: {e}")
        print(f"Page Title: {driver.title}")
        with open("debug.html", "w") as f:
            f.write(driver.page_source)
        print("Saved debug.html")
        raise e

def download_image(url, save_path):
    response = requests.get(url)
    if response.status_code == 200:
        with open(save_path, 'wb') as f:
            f.write(response.content)
        print(f"Image saved to {save_path}")
        return True
    else:
        print("Failed to download image")
        return False

def main():
    driver = setup_driver()
    try:
        image_url = get_latest_post_image_url(driver)
        if image_url:
            data_dir = os.path.join(os.path.dirname(__file__), '../data')
            os.makedirs(data_dir, exist_ok=True)
            save_path = os.path.join(data_dir, 'latest.jpg')
            download_image(image_url, save_path)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    main()
