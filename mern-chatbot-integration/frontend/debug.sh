

echo "=== Checking Frontend Setup ==="

# Check Node.js version
echo "1. Node.js version: $(node --version)"

# Check npm version
echo "2. npm version: $(npm --version)"

# Check directory structure
echo "3. Current directory: $(pwd)"
echo "4. Files in src/:"
ls -la src/

# Check if index.html exists
echo "5. Checking public/index.html:"
if [ -f "public/index.html" ]; then
  echo "   ✓ index.html exists"
else
  echo "   ✗ index.html missing"
fi

# Check React installation
echo "6. React in package.json:"
grep -i react package.json

# Check running processes
echo "7. Processes on port 3000:"
lsof -i :3000 2>/dev/null || echo "   No processes found on port 3000"

# Check if build files exist
echo "8. Build directory:"
if [ -d "build" ]; then
  echo "   ✓ build/ directory exists"
else
  echo "   ✗ build/ directory doesn't exist (run npm run build)"
fi

echo "=== Debug Complete ==="



