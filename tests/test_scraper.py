import unittest
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../src'))

from scraper import setup_driver, get_latest_post_image_url, download_image

class TestScraper(unittest.TestCase):
    def setUp(self):
        self.driver = setup_driver()

    def tearDown(self):
        self.driver.quit()

    def test_get_latest_post_image_url(self):
        # This test actually hits Instagram. 
        image_url = get_latest_post_image_url(self.driver)
        self.assertIsNotNone(image_url)
        self.assertTrue(image_url.startswith('http'))
        print(f"Test successful, got URL: {image_url}")
        
        # Save image for verification
        save_path = os.path.join(os.path.dirname(__file__), '../data/test_image.jpg')
        download_image(image_url, save_path)
        print(f"Saved test image to: {save_path}")

if __name__ == '__main__':
    unittest.main()
