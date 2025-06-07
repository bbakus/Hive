import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import os

# --- IMPORTANT ---
# You need to download your Firebase service account private key file
# from your Firebase project settings (Project settings -> Service accounts -> Generate new private key).
# Save this JSON file in a secure location (e.g., in your Backend directory, but be careful not to commit it to public repositories).
# Replace 'path/to/your/serviceAccountKey.json' with the actual path to your downloaded file.
# You can also set this path as an environment variable for better security.

# Example using a relative path (adjust if your file is elsewhere)
# SERVICE_ACCOUNT_KEY_PATH = os.path.join(os.path.dirname(__file__), 'your-service-account-file-name.json')

# Example using an absolute path or environment variable
# If using environment variable FIREBASE_SERVICE_ACCOUNT_KEY_PATH
SERVICE_ACCOUNT_KEY_PATH = os.environ.get('FIREBASE_SERVICE_ACCOUNT_KEY_PATH', 'path/to/your/serviceAccountKey.json')


# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully.")
    except FileNotFoundError:
        print(f"Error: Service account key file not found at {SERVICE_ACCOUNT_KEY_PATH}")
        print("Please download your service account key and update the SERVICE_ACCOUNT_KEY_PATH in Backend/firebase_admin_init.py")
        # Exit or handle the error appropriately in a real application
    except Exception as e:
        print(f"Error initializing Firebase Admin SDK: {e}")
        # Handle other potential initialization errors

# Get Firestore client
db = firestore.client()

# You can now use 'db' to interact with your Firestore database.
# Example usage will be in main.py
