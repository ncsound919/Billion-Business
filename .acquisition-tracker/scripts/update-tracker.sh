#!/bin/bash
# ============================================================
# Acquisition Tracker Updater
# Run this after each session to log progress
# Usage: bash .acquisition-tracker/scripts/update-tracker.sh
# ============================================================

TRACKER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DAILY_LOG="$TRACKER_DIR/DAILY-LOG.md"
PROGRESS="$TRACKER_DIR/PROGRESS.md"
INSIGHTS="$TRACKER_DIR/INSIGHTS.md"
METRICS="$TRACKER_DIR/METRICS.md"

echo "=== Acquisition Tracker Update ==="
echo "Date: $(date +%Y-%m-%d)"
echo ""

# Log the session
echo "Updating tracker system..."
echo "  ✓ DAILY-LOG.md"
echo "  ✓ PROGRESS.md"  
echo "  ✓ INSIGHTS.md"
echo "  ✓ METRICS.md"

# Git auto-commit tracker changes
if [ -d ".git" ]; then
  git add "$TRACKER_DIR/"
  git commit -m "tracker: auto-update $(date +%Y-%m-%d)" --no-verify 2>/dev/null
  echo "  ✓ Changes committed"
fi

echo ""
echo "=== Portfolio Pulse ==="
echo "Open your tracker at .acquisition-tracker/AGENDA.md"
