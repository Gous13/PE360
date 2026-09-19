import sys
import os

# Make sure the backend folder is in the path
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app

application = create_app()
app = application  # some WSGI servers look for 'app'

if __name__ == '__main__':
    application.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
