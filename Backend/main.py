
# Import the initialized Firestore client
from firebase_admin_init import db as firestore_db # Renamed to avoid conflict with SQLAlchemy db
from typing import Dict, List, Any

# --- Example Firestore Operations ---

def create_project(project_data: Dict[str, Any]) -> str:
    """Adds a new project document to the 'projects' collection."""
    try:
        # Add a new document with an auto-generated ID
        doc_ref = firestore_db.collection('projects').add(project_data)
        project_id = doc_ref[1].id # doc_ref is a tuple (timestamp, document_reference)
        print(f"Successfully created project with ID: {project_id}")
        return project_id
    except Exception as e:
        print(f"Error creating project: {e}")
        return None

def get_project(project_id: str) -> Dict[str, Any] | None:
    """Retrieves a project document by its ID."""
    try:
        doc_ref = firestore_db.collection('projects').document(project_id)
        doc = doc_ref.get()
        if doc.exists:
            print(f"Successfully retrieved project: {doc.id}")
            return doc.to_dict()
        else:
            print(f"Project with ID {project_id} not found.")
            return None
    except Exception as e:
        print(f"Error getting project: {e}")
        return None

def update_project(project_id: str, update_data: Dict[str, Any]) -> bool:
    """Updates an existing project document."""
    try:
        doc_ref = firestore_db.collection('projects').document(project_id)
        doc_ref.update(update_data)
        print(f"Successfully updated project with ID: {project_id}")
        return True
    except Exception as e:
        print(f"Error updating project: {e}")
        return False

def delete_project(project_id: str) -> bool:
    """Deletes a project document by its ID."""
    try:
        firestore_db.collection('projects').document(project_id).delete()
        print(f"Successfully deleted project with ID: {project_id}")
        return True
    except Exception as e:
        print(f"Error deleting project: {e}")
        return False

def list_all_projects() -> List[Dict[str, Any]]:
    """Retrieves all project documents from the 'projects' collection."""
    try:
        projects = []
        docs = firestore_db.collection('projects').stream() # stream() is good for potentially large collections
        for doc in docs:
            project_data = doc.to_dict()
            project_data['id'] = doc.id # Include the document ID in the data
            projects.append(project_data)
        print(f"Successfully listed {len(projects)} projects.")
        return projects
    except Exception as e:
        print(f"Error listing projects: {e}")
        return []

# --- Example Usage (for testing Firestore) ---
# if __name__ == "__main__":
    # Example data for a new project
    # new_project_data = {
    #     'name': 'My Awesome Project Firestore',
    #     'organization_id': 'some_org_id_456',
    #     'status': 'Planning',
    #     'createdAt': firestore.SERVER_TIMESTAMP, 
    #     'updatedAt': firestore.SERVER_TIMESTAMP
    # }
    # project_id = create_project(new_project_data)
    # ... (rest of Firestore example usage)

import os
from flask import Flask, request
from flask_restful import Resource, Api
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
# Use DATABASE_URL from environment variables, with a fallback for local development
# Default to an in-memory SQLite database for easier startup if DATABASE_URL is not set
DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///:memory:')
# For a file-based SQLite DB (persists across runs if desired):
# DATABASE_URI = os.environ.get('DATABASE_URL', f"sqlite:///{os.path.join(os.path.dirname(__file__), 'app.db')}")
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # Recommended to set explicitly
db = SQLAlchemy(app) # This is the SQLAlchemy db instance
api = Api(app)

from models import Event  # Import the Event model

class EventListResource(Resource):
    def get(self):
        # This part is for the SQLAlchemy Event model
        events_query_result = Event.query.all()
        event_list = []
        for event_model_instance in events_query_result:
            event_list.append({
                'id': str(event_model_instance.id), 
                'name': event_model_instance.name,
                'date': str(event_model_instance.date), 
                'location': event_model_instance.location,
                'status': event_model_instance.status,
                'description': event_model_instance.description,
                'shots': event_model_instance.shots or [] 
            })
        return {'events': event_list}

    def post(self):
        new_event_data = request.get_json()
        # This part is for the SQLAlchemy Event model
        new_event_model_instance = Event(
            name=new_event_data['name'],
            date=new_event_data['date'], 
            location=new_event_data['location'],
            status=new_event_data['status'],
            description=new_event_data.get('description'), 
            shots=new_event_data.get('shots', []) 
        )
        db.session.add(new_event_model_instance)
        db.session.commit()
        return {'message': 'Event created successfully', 'event': {
            'id': str(new_event_model_instance.id),
            'name': new_event_model_instance.name,
            'date': str(new_event_model_instance.date),
            'location': new_event_model_instance.location,
            'status': new_event_model_instance.status,
            'description': new_event_model_instance.description,
            'shots': new_event_model_instance.shots
        }}, 201

api.add_resource(EventListResource, '/events')

if __name__ == '__main__':
    with app.app_context():
        db.create_all() # Create tables before running the app for SQLAlchemy
    app.run(debug=True, port=5000) # Specify port for Flask dev server
