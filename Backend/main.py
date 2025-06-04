
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
