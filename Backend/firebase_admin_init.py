
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import os

# --- IMPORTANT ---
# The path to your Firebase service account private key file.
# This is now set to use the Backend/firebase-service-account.json file by default.
# You can override this with an environment variable if needed.
SERVICE_ACCOUNT_KEY_PATH = os.environ.get(
    'FIREBASE_SERVICE_ACCOUNT_KEY_PATH', 
    os.path.join(os.path.dirname(__file__), 'firebase-service-account.json')
)


# Initialize Firebase Admin SDK
db = None # Initialize db to None
try:
    if not firebase_admin._apps:
        # Check if the resolved SERVICE_ACCOUNT_KEY_PATH actually exists
        if not os.path.exists(SERVICE_ACCOUNT_KEY_PATH):
            print(f"Error: Service account key file not found at the resolved path: {os.path.abspath(SERVICE_ACCOUNT_KEY_PATH)}")
            print("Please ensure 'Backend/firebase-service-account.json' exists or set FIREBASE_SERVICE_ACCOUNT_KEY_PATH environment variable correctly.")
            # Allow to proceed, credentials.Certificate will raise FileNotFoundError
            
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully.")
        db = firestore.client()
except FileNotFoundError:
    print(f"Error: Service account key file not found at {SERVICE_ACCOUNT_KEY_PATH}")
    print("Please ensure 'Backend/firebase-service-account.json' exists or set FIREBASE_SERVICE_ACCOUNT_KEY_PATH environment variable correctly.")
except Exception as e:
    print(f"Error initializing Firebase Admin SDK or getting Firestore client: {e}")

# You can now use 'db' to interact with your Firestore database.
# Example usage will be in main.py
# Ensure that any code using 'db' checks if it's None first, especially if initialization might fail.

