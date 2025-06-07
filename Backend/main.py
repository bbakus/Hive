# Import the initialized Firestore client
from firebase_admin_init import db
from typing import Dict, List, Any

# --- Example Firestore Operations ---

def create_project(project_data: Dict[str, Any]) -> str:
    """Adds a new project document to the 'projects' collection."""
    try:
        # Add a new document with an auto-generated ID
        doc_ref = db.collection('projects').add(project_data)
        project_id = doc_ref[1].id # doc_ref is a tuple (timestamp, document_reference)
        print(f"Successfully created project with ID: {project_id}")
        return project_id
    except Exception as e:
        print(f"Error creating project: {e}")
        return None

def get_project(project_id: str) -> Dict[str, Any] | None:
    """Retrieves a project document by its ID."""
    try:
        doc_ref = db.collection('projects').document(project_id)
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
        doc_ref = db.collection('projects').document(project_id)
        doc_ref.update(update_data)
        print(f"Successfully updated project with ID: {project_id}")
        return True
    except Exception as e:
        print(f"Error updating project: {e}")
        return False

def delete_project(project_id: str) -> bool:
    """Deletes a project document by its ID."""
    try:
        db.collection('projects').document(project_id).delete()
        print(f"Successfully deleted project with ID: {project_id}")
        return True
    except Exception as e:
        print(f"Error deleting project: {e}")
        return False

def list_all_projects() -> List[Dict[str, Any]]:
    """Retrieves all project documents from the 'projects' collection."""
    try:
        projects = []
        docs = db.collection('projects').stream() # stream() is good for potentially large collections
        for doc in docs:
            project_data = doc.to_dict()
            project_data['id'] = doc.id # Include the document ID in the data
            projects.append(project_data)
        print(f"Successfully listed {len(projects)} projects.")
        return projects
    except Exception as e:
        print(f"Error listing projects: {e}")
        return []

# --- Example Usage (for testing) ---
if __name__ == "__main__":
    # Example data for a new project
    new_project_data = {
        'name': 'My Awesome Project',
        'organization_id': 'some_org_id_123',
        'status': 'Planning',
        'createdAt': firestore.SERVER_TIMESTAMP, # Use server timestamp
        'updatedAt': firestore.SERVER_TIMESTAMP
    }

    # Create a new project
    project_id = create_project(new_project_data)

    if project_id:
        # Get the created project
        retrieved_project = get_project(project_id)
        if retrieved_project:
            print("\nRetrieved Project Details:")
            print(retrieved_project)

        # Update the project
        update_data = {
            'status': 'In Progress',
            'updatedAt': firestore.SERVER_TIMESTAMP
        }
        update_project(project_id, update_data)

        # Get the updated project
        retrieved_project_after_update = get_project(project_id)
        if retrieved_project_after_update:
             print("\nRetrieved Project Details After Update:")
             print(retrieved_project_after_update)

        # List all projects (will include the one we just created/updated)
        all_projects = list_all_projects()
        print("\nAll Projects:")
        for project in all_projects:
            print(f"- {project.get('name', 'Unnamed Project')} (ID: {project.get('id')})")

        # # Uncomment the line below to delete the project after testing
        # delete_project(project_id)

import os
from flask import Flask, request
from flask_restful import Resource, Api
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
# Use DATABASE_URL from environment variables, with a fallback for local development
DATABASE_URI = os.environ.get('DATABASE_URL', 'postgresql://user:password@host:port/database')
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URI
db = SQLAlchemy(app)
api = Api(app)

from models import Event  # Import the Event model

class EventListResource(Resource):
    def get(self):
        events = Event.query.all()
        event_list = []
        for event in events:
            event_list.append({
                'id': str(event.id), # Ensure ID is a string for frontend compatibility
                'name': event.name,
                'date': str(event.date), # Convert date to string for JSON
                'location': event.location,
                'status': event.status,
                'description': event.description,
                'shots': event.shots or [] # Ensure shots is an array, even if null in DB
            })
        return {'events': event_list}

    def post(self):
        new_event_data = request.get_json()
        new_event = Event(
            name=new_event_data['name'],
            date=new_event_data['date'], # Assuming date comes in 'YYYY-MM-DD'
            location=new_event_data['location'],
            status=new_event_data['status'],
            description=new_event_data.get('description'), # description can be optional
            shots=new_event_data.get('shots', []) # shots can be optional, default to empty list
        )
        db.session.add(new_event)
        db.session.commit()
        return {'message': 'Event created successfully', 'event': {
            'id': str(new_event.id),
            'name': new_event.name,
            'date': str(new_event.date),
            'location': new_event.location,
            'status': new_event.status,
            'description': new_event.description,
            'shots': new_event.shots
        }}, 201

api.add_resource(EventListResource, '/events')

if __name__ == '__main__':
    with app.app_context():
        db.create_all() # Create tables before running the app
    app.run(debug=True)
