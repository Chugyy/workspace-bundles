#!/bin/bash
# Setup script for tools-divers skill

set -e

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SKILL_DIR"

echo "Setting up tools-divers skill..."

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Upgrade pip
pip install --quiet --upgrade pip

# Install dependencies
pip install --quiet \
    openai \
    yt-dlp \
    httpx

# Check ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "Warning: ffmpeg not found. Install it with:"
    echo "  sudo apt install ffmpeg   (Debian/Ubuntu)"
    echo "  brew install ffmpeg        (macOS)"
else
    echo "ffmpeg: $(ffmpeg -version 2>&1 | head -1)"
fi

# Create downloads directory
mkdir -p downloads

echo ""
echo "Setup complete!"
echo ""
echo "Activate the environment:"
echo "  source .venv/bin/activate"
echo ""
echo "Usage:"
echo "  python utils/transcribe.py <file_or_url>"
echo "  python utils/transcribe.py --help"
