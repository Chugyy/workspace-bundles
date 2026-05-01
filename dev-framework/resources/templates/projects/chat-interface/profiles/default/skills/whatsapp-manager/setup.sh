#!/bin/bash

# WhatsApp Manager Skill Setup Script

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Setting up WhatsApp Manager skill..."

# Create virtual environment if it doesn't exist
if [ ! -d "$SKILL_DIR/.venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$SKILL_DIR/.venv"
else
    echo "Virtual environment already exists."
fi

# Activate virtual environment
source "$SKILL_DIR/.venv/bin/activate"

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install httpx

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit assets/config.json with your Unipile credentials"
echo "2. Activate the virtual environment:"
echo "   source .venv/bin/activate"
echo "3. Use the skill to send WhatsApp messages!"
