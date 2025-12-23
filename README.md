# Elderly Friendly Bookmarks for Youtube

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A simple, high-contrast, and intuitive Chrome extension designed specifically for elderly users to easily bookmark their favorite YouTube videos and channels with a single click.

## ✨ Features

- **One-Click Bookmarking**: Adds a prominent "Bookmark" button directly next to the YouTube Subscribe button.
- **Timestamp Support**: Automatically captures the current playback time when bookmarking a video, so you can resume exactly where you left off.
- **Channel Bookmarks**: Support for bookmarking entire YouTube channels from their homepages.
- **Elderly-Friendly Design**: 
  - High-contrast colors for better visibility.
  - Large, clear text labels.
  - Intuitive feedback (button changes to "Bookmarked").
- **Smart Internationalization**: Supports **English** and **Chinese**, with an "Auto" mode that detects your browser settings.
- **Organized Storage**: All bookmarks are saved in a dedicated "Elderly Friendly Bookmarks for Youtube" folder in your browser's bookmark bar.

## 🚀 Installation

1. Download or clone this repository to your local machine.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **"Developer mode"** (top right corner).
4. Click **"Load unpacked"** and select the `YTEasyBookmark` folder.

## 🛠️ Usage

1. **In the Popup**: Click the extension icon to open the settings and choose your preferred language.
2. **On YouTube**:
   - Open any video or channel page.
   - Click the **Bookmark** button next to the YouTube channel name/subscribe button.
   - The button will turn grey and show **Bookmarked** to confirm.
   - To remove, just click the button again.

## 🔧 Technical Highlights

- **Lightweight & Efficient**: Uses a optimized `MutationObserver` to inject the button only when necessary, minimizing CPU usage.
- **Robust Communication**: Implements safe message passing between content scripts and background scripts with comprehensive error handling.
- **SPA Compatibility**: Listens to YouTube's internal navigation events (`yt-navigate-finish`) to ensure the button is always correctly injected on Single Page Application transitions.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---
*Created with ❤️ for a better accessibility experience on YouTube.*
