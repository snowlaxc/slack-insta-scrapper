#!/bin/bash

echo "Installing system dependencies..."
sudo apt-get update

# Install Python 3, pip, and venv
sudo apt-get install -y python3 python3-pip python3-venv

# Install Google Chrome (for Selenium)
echo "Installing Google Chrome..."
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Create virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv

# Activate and install dependencies
echo "Installing Python dependencies in virtual environment..."
source venv/bin/activate
pip install selenium webdriver-manager requests

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

echo "Setup complete! Virtual environment created in 'venv'."
