#!/bin/bash

# Email Manager Setup Script
# Creates virtual environment and installs dependencies

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"

echo "📧 Email Manager - Setup"
echo "========================"

# Check if .venv exists
if [ -d "$VENV_DIR" ]; then
    echo "✓ Virtual environment already exists"
else
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
    echo "✓ Virtual environment created"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip -q
pip install simplegmail -q

echo ""
echo "✓ Setup complete!"
echo ""
echo "To use the email manager:"
echo "  source .venv/bin/activate"
echo ""
