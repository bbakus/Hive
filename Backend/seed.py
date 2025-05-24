# seed.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from models import Event

app = Flask(__name__)
# Configure your database URI
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://user:password@host:port/database_name'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Sample initial event data from src/app/(app)/events/page.tsx
initialEvents = [
  {
    "id": "1",
    "name": "Company Annual Meeting",
    "date": "2023-10-26T10:00:00Z",
    "location": "Conference Hall A",
    "status": "Upcoming",
    "description": "Annual meeting for all employees to discuss company performance and future plans.",
    "shots": 15
  },
  {
    "id": "2",
    "name": "Product Launch Party",
    "date": "2023-11-15T19:00:00Z",
    "location": "Event Space Downtown",
    "status": "Upcoming",
    "description": "Celebrating the launch of our new product line.",
    "shots": 25
  },
  {
    "id": "3",
    "name": "Team Building Workshop",
    "date": "2023-12-01T09:00:00Z",
    "location": "Outdoor Retreat Center",
    "status": "Upcoming",
    "description": "Interactive workshop to enhance team collaboration and communication.",
    "shots": 10
  },
  {
    "id": "4",
    "name": "Holiday Gala",
    "date": "2023-12-20T18:30:00Z",
    "location": "Grand Ballroom",
    "status": "Upcoming",
    "description": "An evening of celebration and appreciation for all staff.",
    "shots": 30
  },
  {
    "id": "5",
    "name": "Q1 2024 Planning Session",
    "date": "2024-01-10T10:00:00Z",
    "location": "Meeting Room 3B",
    "status": "Upcoming",
    "description": "Planning and strategy session for the first quarter of 2024.",
    "shots": 12
  },
  {
    "id": "6",
    "name": "Marketing Strategy Review",
    "date": "2024-02-05T14:00:00Z",
    "location": "Marketing Department Office",
    "status": "Upcoming",
    "description": "Review of current marketing strategies and future campaigns.",
    "shots": 8
  },
  {
    "id": "7",
    "name": "Annual Shareholder Meeting",
    "date": "2024-03-15T11:00:00Z",
    "location": "Online (Virtual Event)",
    "status": "Upcoming",
    "description": "Meeting with shareholders to discuss financial performance and future outlook.",
    "shots": 5
  },
  {
    "id": "8",
    "name": "Spring Networking Event",
    "date": "2024-04-22T17:00:00Z",
    "location": "Rooftop Terrace",
    "status": "Upcoming",
    "description": "Networking opportunity for industry professionals.",
    "shots": 20
  }
]


def seed_database():
    """Populates the database with initial event data."""
    with app.app_context():
        db.create_all()  # Create tables if they don't exist

        for event_data in initialEvents:
            # Convert date string to datetime object
            event_date = datetime.strptime(event_data["date"], "%Y-%m-%dT%H:%M:%SZ")
            event = Event(
                id=event_data["id"],
                name=event_data["name"],
                date=event_date,
                location=event_data.get("location"),
                status=event_data["status"],
                description=event_data.get("description"),
                shots=event_data.get("shots", 0)
            )
            db.session.add(event)

        db.session.commit()
        print("Database seeded successfully!")

if __name__ == '__main__':
    seed_database()