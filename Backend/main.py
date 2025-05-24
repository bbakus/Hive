from flask import Flask, request
from flask_restful import Resource, Api
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://user:password@host:port/database'  # Replace with your database URI
db = SQLAlchemy(app)
api = Api(app)

from models import Event  # Import the Event model

class EventListResource(Resource):
    def get(self):
        events = Event.query.all()
        event_list = []
        for event in events:
            event_list.append({
                'id': event.id,
                'name': event.name,
                'date': str(event.date), # Convert date to string for JSON
                'location': event.location,
                'status': event.status,
                'description': event.description,
                'shots': event.shots
            })
        return {'events': event_list}

    def post(self):
        new_event_data = request.get_json()
        new_event = Event(
            name=new_event_data['name'],
            date=new_event_data['date'],
            location=new_event_data['location'],
            status=new_event_data['status'],
            description=new_event_data.get('description'), # description can be optional
            shots=new_event_data.get('shots', []) # shots can be optional, default to empty list
        )
        db.session.add(new_event)
        db.session.commit()
        return {'message': 'Event created successfully', 'event': {
            'id': new_event.id,
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