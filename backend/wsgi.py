import sys
import os

# Add backend directory to path explicitly
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# Force reload of app module
if 'app' in sys.modules:
    del sys.modules['app']

from app import create_app

app = create_app()
application = app

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
