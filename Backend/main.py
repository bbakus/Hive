
from flask import Flask, request
from flask_restful import Api, Resource
from flask_cors import CORS
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models import Base, User, Event, Personnel, Shot, Project, Organization, Shot_Request
from datetime import datetime
import os

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Database configuration
database_url = os.environ.get('DATABASE_URL', 'sqlite:///hive.db')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-here')

# Initialize SQLAlchemy engine and session
engine = create_engine(database_url)
Session = sessionmaker(bind=engine)

# Import database initialization functions
from models import create_database, seed_database

# Create database and tables if they don't exist
create_database()

# Initialize Flask-RESTful
api = Api(app)

# Helper function to convert date strings
def parse_date(date_string):
    if isinstance(date_string, str):
        # Parse the date string and create a date object without timezone conversion
        year, month, day = map(int, date_string.split('-'))
        return datetime(year, month, day).date()
    return date_string

# ==================== USER RESOURCES ====================

class UserListResource(Resource):
    def get(self):
        """Get all users"""
        session = Session()
        try:
            users = session.query(User).all()
            return [{
                'id': user.id,
                'email': user.email
            } for user in users], 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

    def post(self):
        """Create a new user"""
        session = Session()
        try:
            data = request.get_json()
            
            if not data or 'email' not in data or 'password' not in data:
                return {'error': 'Email and password are required'}, 400
            
            # Check if user already exists
            existing_user = session.query(User).filter_by(email=data['email']).first()
            if existing_user:
                return {'error': 'User with this email already exists'}, 400
            
            # Create new user
            user = User(email=data['email'])
            user.set_password(data['password'])
            
            session.add(user)
            session.commit()
            
            return {
                'id': user.id,
                'email': user.email,
                'message': 'User created successfully'
            }, 201
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

class UserResource(Resource):
    def get(self, user_id):
        """Get a specific user"""
        session = Session()
        try:
            user = session.query(User).filter_by(id=user_id).first()
            if not user:
                return {'error': 'User not found'}, 404
            
            return {
                'id': user.id,
                'email': user.email
            }, 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

    def put(self, user_id):
        """Update a user"""
        session = Session()
        try:
            user = session.query(User).filter_by(id=user_id).first()
            if not user:
                return {'error': 'User not found'}, 404
            
            data = request.get_json()
            
            if 'email' in data:
                # Check if email is already taken by another user
                existing_user = session.query(User).filter_by(email=data['email']).first()
                if existing_user and existing_user.id != user_id:
                    return {'error': 'Email already taken'}, 400
                user.email = data['email']
            
            if 'password' in data:
                user.set_password(data['password'])
            
            session.commit()
            
            return {
                'id': user.id,
                'email': user.email,
                'message': 'User updated successfully'
            }, 200
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

    def delete(self, user_id):
        """Delete a user"""
        session = Session()
        try:
            user = session.query(User).filter_by(id=user_id).first()
            if not user:
                return {'error': 'User not found'}, 404
            
            session.delete(user)
            session.commit()
            
            return {'message': 'User deleted successfully'}, 200
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

# ==================== EVENT RESOURCES ====================

class EventListResource(Resource):
    def get(self):
        """Get all events"""
        session = Session()
        try:
            events = session.query(Event).all()
            events_data = []
            
            for event in events:
                # Get personnel for this event
                personnel = event.personnel
                assigned_personnel_ids = [str(p.id) for p in personnel]
                
                # Get shots for this event
                shots = event.shots
                
                event_data = {
                    'id': str(event.id),
                    'name': event.name,
                    'date': str(event.date),
                    'startTime': event.start_time or '',
                    'endTime': event.end_time or '',
                    'location': event.location or '',
                    'status': event.status or 'Upcoming',
                    'description': event.description or '',
                    'assignedPersonnelIds': assigned_personnel_ids,
                    'isQuickTurnaround': event.is_quick_turnaround or False,
                    'standardShotPackage': event.standard_shot_package,
                    'deadline': event.deadline,
                    'organizationId': str(event.organization_id),
                    'discipline': event.discipline or 'Photography',
                    'isCovered': event.is_covered if event.is_covered is not None else True,
                    'processPoint': event.process_point,
                    'personnelActivity': {},  # Default empty object
                    'projectId': str(event.project_id) if event.project_id else None,
                    'shots': [{
                        'id': str(shot.id),
                        'eventId': str(shot.event_id),
                        'description': shot.filename,
                        'priority': 'Medium',
                        'status': 'Completed'
                    } for shot in shots]
                }
                events_data.append(event_data)
            
            # Return in the format frontend expects
            return {'events': events_data}, 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

    def post(self):
        """Create a new event"""
        session = Session()
        try:
            data = request.get_json()
            
            if not data or 'name' not in data or 'date' not in data:
                return {'error': 'Name and date are required'}, 400
            
            # Get organization_id from request or use default
            organization_id = data.get('organizationId')
            if not organization_id:
                # Try to get the first available organization as default
                default_org = session.query(Organization).first()
                if default_org:
                    organization_id = default_org.id
                else:
                    return {'error': 'No organization available. Please create an organization first.'}, 400
            
            event = Event(
                name=data['name'],
                date=parse_date(data['date']),
                start_time=data.get('startTime', ''),
                end_time=data.get('endTime', ''),
                location=data.get('location'),
                status=data.get('status'),
                description=data.get('description'),
                project_id=data.get('projectId'),
                organization_id=organization_id,
                discipline=data.get('discipline', 'Photography'),
                standard_shot_package=data.get('standardShotPackage', True),
                is_quick_turnaround=data.get('isQuickTurnaround', False),
                is_covered=data.get('isCovered', True),
                process_point=data.get('processPoint'),
                deadline=data.get('deadline')
            )
            
            session.add(event)
            session.commit()
            
            return {
                'id': str(event.id),
                'name': event.name,
                'date': str(event.date),
                'startTime': event.start_time or '',
                'endTime': event.end_time or '',
                'location': event.location or '',
                'status': event.status or 'Upcoming',
                'description': event.description or '',
                'projectId': event.project_id or 'default_project',
                'organizationId': event.organization_id or '',
                'discipline': event.discipline or 'Photography',
                'standardShotPackage': event.standard_shot_package,
                'isQuickTurnaround': event.is_quick_turnaround or False,
                'isCovered': event.is_covered if event.is_covered is not None else True,
                'deadline': event.deadline,
                'processPoint': event.process_point,
                'message': 'Event created successfully'
            }, 201
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

class EventResource(Resource):
    def get(self, event_id):
        """Get a specific event"""
        session = Session()
        try:
            event = session.query(Event).filter_by(id=event_id).first()
            if not event:
                return {'error': 'Event not found'}, 404
            
            return {
                'id': str(event.id),
                'name': event.name,
                'date': str(event.date),
                'startTime': event.start_time or '',
                'endTime': event.end_time or '',
                'location': event.location or '',
                'status': event.status or 'Upcoming',
                'description': event.description or '',
                'projectId': event.project_id or 'default_project',
                'organizationId': event.organization_id or '',
                'discipline': event.discipline or 'Photography',
                'standardShotPackage': event.standard_shot_package,
                'isQuickTurnaround': event.is_quick_turnaround or False,
                'isCovered': event.is_covered if event.is_covered is not None else True,
                'deadline': event.deadline,
                'processPoint': event.process_point
            }, 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

    def put(self, event_id):
        """Update an event"""
        session = Session()
        try:
            event = session.query(Event).filter_by(id=event_id).first()
            if not event:
                return {'error': 'Event not found'}, 404
            
            data = request.get_json()
            
            if 'name' in data:
                event.name = data['name']
            if 'date' in data:
                event.date = parse_date(data['date'])
            if 'startTime' in data:
                event.start_time = data['startTime']
            if 'endTime' in data:
                event.end_time = data['endTime']
            if 'location' in data:
                event.location = data['location']
            if 'status' in data:
                event.status = data['status']
            if 'description' in data:
                event.description = data['description']
            if 'projectId' in data:
                event.project_id = data['projectId']
            if 'organizationId' in data:
                event.organization_id = data['organizationId']
            if 'discipline' in data:
                event.discipline = data['discipline']
            if 'standardShotPackage' in data:
                event.standard_shot_package = data['standardShotPackage']
            if 'isQuickTurnaround' in data:
                event.is_quick_turnaround = data['isQuickTurnaround']
            if 'isCovered' in data:
                event.is_covered = data['isCovered']
            if 'deadline' in data:
                event.deadline = data['deadline']
            if 'processPoint' in data:
                event.process_point = data['processPoint']
            
            session.commit()
            
            return {
                'id': str(event.id),
                'name': event.name,
                'date': str(event.date),
                'startTime': event.start_time or '',
                'endTime': event.end_time or '',
                'location': event.location or '',
                'status': event.status or 'Upcoming',
                'description': event.description or '',
                'projectId': event.project_id or 'default_project',
                'organizationId': event.organization_id or '',
                'discipline': event.discipline or 'Photography',
                'standardShotPackage': event.standard_shot_package,
                'isQuickTurnaround': event.is_quick_turnaround or False,
                'isCovered': event.is_covered if event.is_covered is not None else True,
                'deadline': event.deadline,
                'processPoint': event.process_point,
                'message': 'Event updated successfully'
            }, 200
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

    def delete(self, event_id):
        """Delete an event"""
        session = Session()
        try:
            event = session.query(Event).filter_by(id=event_id).first()
            if not event:
                return {'error': 'Event not found'}, 404
            
            session.delete(event)
            session.commit()
            
            return {'message': 'Event deleted successfully'}, 200
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

# ==================== PERSONNEL RESOURCES ====================

class PersonnelListResource(Resource):
    def get(self):
        """Get all personnel"""
        session = Session()
        try:
            personnel = session.query(Personnel).all()
            personnel_data = []
            
            for person in personnel:
                person_data = {
                    'id': str(person.id),
                    'personnelId': str(person.id),  # Frontend expects both id and personnelId
                    'name': person.name,
                    'role': person.role,
                    'status': 'Available',  # Default status
                    'avatar': None,  # Default avatar
                    'cameraSerials': [],  # Default empty array
                    'contact': person.email,  # Use email as contact
                    'phone': person.phone,
                    'email': person.email
                }
                personnel_data.append(person_data)
            
            return personnel_data, 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

class PhotographersResource(Resource):
    def get(self):
        """Get all personnel with photographer roles"""
        session = Session()
        try:
            photographers = session.query(Personnel).filter(
                Personnel.role.ilike('%photographer%')
            ).all()
            photographers_data = []
            
            for person in photographers:
                person_data = {
                    'id': str(person.id),
                    'personnelId': str(person.id),  # Frontend expects both id and personnelId
                    'name': person.name,
                    'role': person.role,
                    'status': 'Available',  # Default status
                    'avatar': None,  # Default avatar
                    'cameraSerials': [],  # Default empty array
                    'contact': person.email,  # Use email as contact
                    'phone': person.phone,
                    'email': person.email
                }
                photographers_data.append(person_data)
            
            return photographers_data, 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

    def post(self):
        """Create new personnel"""
        session = Session()
        try:
            data = request.get_json()
            
            if not data or 'name' not in data or 'role' not in data or 'phone' not in data or 'email' not in data:
                return {'error': 'Name, role, phone, and email are required'}, 400
            
            personnel = Personnel(
                name=data['name'],
                role=data['role'],
                phone=data['phone'],
                email=data['email']
            )
            
            session.add(personnel)
            session.commit()
            
            return {
                'id': personnel.id,
                'name': personnel.name,
                'role': personnel.role,
                'phone': personnel.phone,
                'email': personnel.email,
                'message': 'Personnel created successfully'
            }, 201
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

class PersonnelResource(Resource):
    def get(self, personnel_id):
        """Get a specific personnel member"""
        session = Session()
        try:
            personnel = session.query(Personnel).filter_by(id=personnel_id).first()
            if not personnel:
                return {'error': 'Personnel not found'}, 404
            
            return {
                'id': personnel.id,
                'name': personnel.name,
                'role': personnel.role,
                'phone': personnel.phone,
                'email': personnel.email
            }, 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

    def put(self, personnel_id):
        """Update personnel"""
        session = Session()
        try:
            personnel = session.query(Personnel).filter_by(id=personnel_id).first()
            if not personnel:
                return {'error': 'Personnel not found'}, 404
            
            data = request.get_json()
            
            if 'name' in data:
                personnel.name = data['name']
            if 'role' in data:
                personnel.role = data['role']
            if 'phone' in data:
                personnel.phone = data['phone']
            if 'email' in data:
                personnel.email = data['email']
            
            session.commit()
            
            return {
                'id': personnel.id,
                'name': personnel.name,
                'role': personnel.role,
                'phone': personnel.phone,
                'email': personnel.email,
                'message': 'Personnel updated successfully'
            }, 200
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

    def delete(self, personnel_id):
        """Delete personnel"""
        session = Session()
        try:
            personnel = session.query(Personnel).filter_by(id=personnel_id).first()
            if not personnel:
                return {'error': 'Personnel not found'}, 404
            
            session.delete(personnel)
            session.commit()
            
            return {'message': 'Personnel deleted successfully'}, 200
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

# ==================== SHOT RESOURCES ====================

class ShotListResource(Resource):
    def get(self):
        """Get all shots"""
        session = Session()
        try:
            shots = session.query(Shot).all()
            return [{
                'id': shot.id,
                'image': shot.image,
                'date_created': str(shot.date_created),
                'camera': shot.camera,
                'filename': shot.filename,
                'event_id': shot.event_id,
                'photographer_id': shot.photographer_id
            } for shot in shots], 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

    def post(self):
        """Create a new shot"""
        session = Session()
        try:
            data = request.get_json()
            
            if not data or 'image' not in data or 'date_created' not in data or 'camera' not in data or 'filename' not in data:
                return {'error': 'Image, date_created, camera, and filename are required'}, 400
            
            if 'event_id' not in data or 'photographer_id' not in data:
                return {'error': 'event_id and photographer_id are required'}, 400
            
            # Verify event and photographer exist
            event = session.query(Event).filter_by(id=data['event_id']).first()
            if not event:
                return {'error': 'Event not found'}, 404
            
            photographer = session.query(Personnel).filter_by(id=data['photographer_id']).first()
            if not photographer:
                return {'error': 'Photographer not found'}, 404
            
            # Verify the personnel has a photographer role
            if not photographer.is_photographer():
                return {'error': 'Personnel must have a photographer role to be assigned as photographer'}, 400
            
            shot = Shot(
                image=data['image'],
                date_created=parse_date(data['date_created']),
                camera=data['camera'],
                filename=data['filename'],
                event_id=data['event_id'],
                photographer_id=data['photographer_id']
            )
            
            session.add(shot)
            session.commit()
            
            return {
                'id': shot.id,
                'image': shot.image,
                'date_created': str(shot.date_created),
                'camera': shot.camera,
                'filename': shot.filename,
                'event_id': shot.event_id,
                'photographer_id': shot.photographer_id,
                'message': 'Shot created successfully'
            }, 201
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

class ShotResource(Resource):
    def get(self, shot_id):
        """Get a specific shot"""
        session = Session()
        try:
            shot = session.query(Shot).filter_by(id=shot_id).first()
            if not shot:
                return {'error': 'Shot not found'}, 404
            
            return {
                'id': shot.id,
                'image': shot.image,
                'date_created': str(shot.date_created),
                'camera': shot.camera,
                'filename': shot.filename,
                'event_id': shot.event_id,
                'photographer_id': shot.photographer_id
            }, 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

    def put(self, shot_id):
        """Update a shot"""
        session = Session()
        try:
            shot = session.query(Shot).filter_by(id=shot_id).first()
            if not shot:
                return {'error': 'Shot not found'}, 404
            
            data = request.get_json()
            
            if 'image' in data:
                shot.image = data['image']
            if 'date_created' in data:
                shot.date_created = parse_date(data['date_created'])
            if 'camera' in data:
                shot.camera = data['camera']
            if 'filename' in data:
                shot.filename = data['filename']
            if 'event_id' in data:
                # Verify event exists
                event = session.query(Event).filter_by(id=data['event_id']).first()
                if not event:
                    return {'error': 'Event not found'}, 404
                shot.event_id = data['event_id']
            if 'photographer_id' in data:
                # Verify photographer exists and has photographer role
                photographer = session.query(Personnel).filter_by(id=data['photographer_id']).first()
                if not photographer:
                    return {'error': 'Photographer not found'}, 404
                if not photographer.is_photographer():
                    return {'error': 'Personnel must have a photographer role to be assigned as photographer'}, 400
                shot.photographer_id = data['photographer_id']
            
            session.commit()
            
            return {
                'id': shot.id,
                'image': shot.image,
                'date_created': str(shot.date_created),
                'camera': shot.camera,
                'filename': shot.filename,
                'event_id': shot.event_id,
                'photographer_id': shot.photographer_id,
                'message': 'Shot updated successfully'
            }, 200
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

    def delete(self, shot_id):
        """Delete a shot"""
        session = Session()
        try:
            shot = session.query(Shot).filter_by(id=shot_id).first()
            if not shot:
                return {'error': 'Shot not found'}, 404
            
            session.delete(shot)
            session.commit()
            
            return {'message': 'Shot deleted successfully'}, 200
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

# ==================== RELATIONSHIP RESOURCES ====================

class EventPersonnelResource(Resource):
    def get(self, event_id):
        """Get all personnel for an event"""
        session = Session()
        try:
            event = session.query(Event).filter_by(id=event_id).first()
            if not event:
                return {'error': 'Event not found'}, 404
            
            personnel = event.personnel
            return [{
                'id': person.id,
                'name': person.name,
                'role': person.role,
                'phone': person.phone,
                'email': person.email
            } for person in personnel], 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

class EventPersonnelAssignmentResource(Resource):
    def post(self, event_id, personnel_id):
        """Add personnel to an event"""
        session = Session()
        try:
            event = session.query(Event).filter_by(id=event_id).first()
            if not event:
                return {'error': 'Event not found'}, 404
            
            personnel = session.query(Personnel).filter_by(id=personnel_id).first()
            if not personnel:
                return {'error': 'Personnel not found'}, 404
            
            if personnel in event.personnel:
                return {'error': 'Personnel already assigned to this event'}, 400
            
            event.personnel.append(personnel)
            session.commit()
            
            return {'message': 'Personnel added to event successfully'}, 200
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

class EventShotsResource(Resource):
    def get(self, event_id):
        """Get all shots for an event"""
        session = Session()
        try:
            event = session.query(Event).filter_by(id=event_id).first()
            if not event:
                return {'error': 'Event not found'}, 404
            
            shots = event.shots
            return [{
                'id': shot.id,
                'image': shot.image,
                'date_created': str(shot.date_created),
                'camera': shot.camera,
                'filename': shot.filename,
                'photographer_id': shot.photographer_id
            } for shot in shots], 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

# ==================== SHOT REQUEST RESOURCES ====================

class ShotRequestListResource(Resource):
    def get(self):
        """Get all shot requests"""
        session = Session()
        try:
            shot_requests = session.query(Shot_Request).all()
            shot_requests_data = []
            
            for shot_request in shot_requests:
                shot_request_data = {
                    'id': str(shot_request.id),
                    'shotDescription': shot_request.shot_description,
                    'startTime': shot_request.start_time,
                    'endTime': shot_request.end_time,
                    'stakeholder': shot_request.stakeholder,
                    'quickTurn': shot_request.quick_turn,
                    'deadline': shot_request.deadline,
                    'keySponsor': shot_request.key_sponsor,
                    'status': shot_request.status,
                    'eventId': shot_request.event_id
                }
                shot_requests_data.append(shot_request_data)
            
            return shot_requests_data, 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

    def post(self):
        """Create a new shot request"""
        session = Session()
        try:
            data = request.get_json()
            
            if not data or 'shotDescription' not in data:
                return {'error': 'Shot description is required'}, 400
            
            shot_request = Shot_Request(
                shot_description=data['shotDescription'],
                start_time=data.get('startTime', ''),
                end_time=data.get('endTime', ''),
                stakeholder=data.get('stakeholder', ''),
                quick_turn=data.get('quickTurn', False),
                deadline=data.get('deadline'),
                key_sponsor=data.get('keySponsor'),
                event_id=data.get('eventId')
            )
            
            session.add(shot_request)
            session.commit()
            
            return {
                'id': str(shot_request.id),
                'shotDescription': shot_request.shot_description,
                'startTime': shot_request.start_time,
                'endTime': shot_request.end_time,
                'stakeholder': shot_request.stakeholder,
                'quickTurn': shot_request.quick_turn,
                'deadline': shot_request.deadline,
                'keySponsor': shot_request.key_sponsor,
                'eventId': shot_request.event_id,
                'message': 'Shot request created successfully'
            }, 201
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

class ShotRequestResource(Resource):
    def get(self, shot_request_id):
        """Get a specific shot request"""
        session = Session()
        try:
            shot_request = session.query(Shot_Request).filter_by(id=shot_request_id).first()
            if not shot_request:
                return {'error': 'Shot request not found'}, 404
            
            return {
                'id': str(shot_request.id),
                'shotDescription': shot_request.shot_description,
                'startTime': shot_request.start_time,
                'endTime': shot_request.end_time,
                'stakeholder': shot_request.stakeholder,
                'quickTurn': shot_request.quick_turn,
                'deadline': shot_request.deadline,
                'keySponsor': shot_request.key_sponsor,
                'eventId': shot_request.event_id,
                'status': shot_request.status
            }, 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

    def put(self, shot_request_id):
        """Update a shot request"""
        session = Session()
        try:
            shot_request = session.query(Shot_Request).filter_by(id=shot_request_id).first()
            if not shot_request:
                return {'error': 'Shot request not found'}, 404
            
            data = request.get_json()
            
            if 'shotDescription' in data:
                shot_request.shot_description = data['shotDescription']
            if 'startTime' in data:
                shot_request.start_time = data['startTime']
            if 'endTime' in data:
                shot_request.end_time = data['endTime']
            if 'stakeholder' in data:
                shot_request.stakeholder = data['stakeholder']
            if 'quickTurn' in data:
                shot_request.quick_turn = data['quickTurn']
            if 'deadline' in data:
                shot_request.deadline = data['deadline']
            if 'keySponsor' in data:
                shot_request.key_sponsor = data['keySponsor']
            if 'eventId' in data:
                shot_request.event_id = data['eventId']
            
            session.commit()
            
            return {
                'id': str(shot_request.id),
                'shotDescription': shot_request.shot_description,
                'startTime': shot_request.start_time,
                'endTime': shot_request.end_time,
                'stakeholder': shot_request.stakeholder,
                'quickTurn': shot_request.quick_turn,
                'deadline': shot_request.deadline,
                'keySponsor': shot_request.key_sponsor,
                'eventId': shot_request.event_id,
                'message': 'Shot request updated successfully'
            }, 200
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

    def delete(self, shot_request_id):
        """Delete a shot request"""
        session = Session()
        try:
            shot_request = session.query(Shot_Request).filter_by(id=shot_request_id).first()
            if not shot_request:
                return {'error': 'Shot request not found'}, 404
            
            session.delete(shot_request)
            session.commit()
            
            return {'message': 'Shot request deleted successfully'}, 200
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

# ==================== PROJECT RESOURCES ====================

class ProjectListResource(Resource):
    def get(self):
        """Get all projects"""
        session = Session()
        try:
            projects = session.query(Project).all()
            projects_data = []
            
            for project in projects:
                # Get key personnel with their roles from the association table
                key_personnel_data = []
                for personnel in project.key_personnel:
                    # Get the role from the association table
                    role_query = session.execute(
                        text("SELECT role FROM project_key_personnel WHERE project_id = :project_id AND personnel_id = :personnel_id"),
                        {"project_id": project.id, "personnel_id": personnel.id}
                    ).fetchone()
                    role = role_query[0] if role_query else personnel.role
                    
                    key_personnel_data.append({
                        'personnelId': str(personnel.id),
                        'name': personnel.name,
                        'role': personnel.role,
                        'projectRole': role
                    })
                
                project_data = {
                    'id': str(project.id),
                    'name': project.name,
                    'client': project.client or '',
                    'organizationId': str(project.organization_id),
                    'status': project.status or 'In Planning',
                    'description': project.description or '',
                    'startDate': project.start_date.isoformat() if project.start_date else '',
                    'endDate': project.end_date.isoformat() if project.end_date else '',
                    'location': project.location or '',
                    'keyPersonnel': key_personnel_data
                }
                projects_data.append(project_data)
            
            return projects_data, 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

    def post(self):
        """Create a new project"""
        session = Session()
        try:
            from datetime import datetime
            
            data = request.get_json()
            
            if not data or 'name' not in data:
                return {'error': 'Name is required'}, 400
            
            project = Project(
                name=data['name'],
                client=data.get('client'),
                organization_id=data.get('organizationId'),
                status=data.get('status', 'In Planning'),
                description=data.get('description'),
                location=data.get('location')
            )
            
            if data.get('startDate'):
                project.start_date = datetime.strptime(data['startDate'], '%Y-%m-%d').date()
            if data.get('endDate'):
                project.end_date = datetime.strptime(data['endDate'], '%Y-%m-%d').date()
            
            session.add(project)
            session.flush()  # Get the project ID
            
            # Add key personnel if provided
            if 'keyPersonnel' in data and data['keyPersonnel']:
                for personnel_data in data['keyPersonnel']:
                    personnel_id = personnel_data.get('personnelId')
                    project_role = personnel_data.get('projectRole', 'Team Member')
                    
                    if personnel_id:
                        personnel = session.query(Personnel).filter_by(id=personnel_id).first()
                        if personnel:
                            # Insert directly into association table with role
                            session.execute(
                                text("INSERT INTO project_key_personnel (project_id, personnel_id, role) VALUES (:project_id, :personnel_id, :role)"),
                                {"project_id": project.id, "personnel_id": personnel.id, "role": project_role}
                            )
            
            session.commit()
            
            # Get key personnel data for response
            key_personnel_data = []
            for personnel in project.key_personnel:
                role_query = session.execute(
                    text("SELECT role FROM project_key_personnel WHERE project_id = :project_id AND personnel_id = :personnel_id"),
                    {"project_id": project.id, "personnel_id": personnel.id}
                ).fetchone()
                role = role_query[0] if role_query else personnel.role
                
                key_personnel_data.append({
                    'personnelId': str(personnel.id),
                    'name': personnel.name,
                    'role': personnel.role,
                    'projectRole': role
                })
            
            return {
                'id': str(project.id),
                'name': project.name,
                'client': project.client or '',
                'organizationId': str(project.organization_id),
                'status': project.status or 'Planning',
                'description': project.description or '',
                'startDate': project.start_date.isoformat() if project.start_date else '',
                'endDate': project.end_date.isoformat() if project.end_date else '',
                'location': project.location or '',
                'keyPersonnel': key_personnel_data,
                'message': 'Project created successfully'
            }, 201
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

class ProjectResource(Resource):
    def get(self, project_id):
        """Get a specific project"""
        session = Session()
        try:
            project = session.query(Project).filter_by(id=project_id).first()
            if not project:
                return {'error': 'Project not found'}, 404
            
            # Get key personnel with their roles from the association table
            key_personnel_data = []
            for personnel in project.key_personnel:
                # Get the role from the association table
                role_query = session.execute(
                    text("SELECT role FROM project_key_personnel WHERE project_id = :project_id AND personnel_id = :personnel_id"),
                    {"project_id": project.id, "personnel_id": personnel.id}
                ).fetchone()
                role = role_query[0] if role_query else personnel.role
                
                key_personnel_data.append({
                    'personnelId': str(personnel.id),
                    'name': personnel.name,
                    'role': personnel.role,
                    'projectRole': role
                })
            
            return {
                'id': str(project.id),
                'name': project.name,
                'client': project.client or '',
                'organizationId': str(project.organization_id),
                'status': project.status or 'Planning',
                'description': project.description or '',
                'startDate': project.start_date.isoformat() if project.start_date else '',
                'endDate': project.end_date.isoformat() if project.end_date else '',
                'location': project.location or '',
                'keyPersonnel': key_personnel_data
            }, 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

    def put(self, project_id):
        """Update a project"""
        session = Session()
        try:
            from datetime import datetime
            
            project = session.query(Project).filter_by(id=project_id).first()
            if not project:
                return {'error': 'Project not found'}, 404
            
            data = request.get_json()
            
            if 'name' in data:
                project.name = data['name']
            if 'client' in data:
                project.client = data['client']
            if 'organizationId' in data:
                project.organization_id = data['organizationId']
            if 'status' in data:
                project.status = data['status']
            if 'description' in data:
                project.description = data['description']
            if 'startDate' in data and data['startDate']:
                project.start_date = datetime.strptime(data['startDate'], '%Y-%m-%d').date()
            if 'endDate' in data and data['endDate']:
                project.end_date = datetime.strptime(data['endDate'], '%Y-%m-%d').date()
            if 'location' in data:
                project.location = data['location']
            if 'keyPersonnel' in data:
                # Clear existing key personnel - need to delete from association table directly
                session.execute(
                    text("DELETE FROM project_key_personnel WHERE project_id = :project_id"),
                    {"project_id": project.id}
                )
                
                # Add new key personnel with roles - insert directly into association table
                for personnel_data in data['keyPersonnel']:
                    personnel_id = personnel_data.get('personnelId')
                    project_role = personnel_data.get('projectRole', 'Team Member')
                    
                    if personnel_id:
                        personnel = session.query(Personnel).filter_by(id=personnel_id).first()
                        if personnel:
                            # Insert directly into association table with role
                            session.execute(
                                text("INSERT INTO project_key_personnel (project_id, personnel_id, role) VALUES (:project_id, :personnel_id, :role)"),
                                {"project_id": project.id, "personnel_id": personnel.id, "role": project_role}
                            )
            
            session.commit()
            
            # Get updated key personnel data
            key_personnel_data = []
            for personnel in project.key_personnel:
                role_query = session.execute(
                    text("SELECT role FROM project_key_personnel WHERE project_id = :project_id AND personnel_id = :personnel_id"),
                    {"project_id": project.id, "personnel_id": personnel.id}
                ).fetchone()
                role = role_query[0] if role_query else personnel.role
                
                key_personnel_data.append({
                    'personnelId': str(personnel.id),
                    'name': personnel.name,
                    'role': personnel.role,
                    'projectRole': role
                })
            
            return {
                'id': str(project.id),
                'name': project.name,
                'client': project.client or '',
                'organizationId': str(project.organization_id),
                'status': project.status or 'Planning',
                'description': project.description or '',
                'startDate': project.start_date.isoformat() if project.start_date else '',
                'endDate': project.end_date.isoformat() if project.end_date else '',
                'location': project.location or '',
                'keyPersonnel': key_personnel_data,
                'message': 'Project updated successfully'
            }, 200
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

    def delete(self, project_id):
        """Delete a project"""
        session = Session()
        try:
            project = session.query(Project).filter_by(id=project_id).first()
            if not project:
                return {'error': 'Project not found'}, 404
            
            session.delete(project)
            session.commit()
            
            return {'message': 'Project deleted successfully'}, 200
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

class ProjectEventsResource(Resource):
    def get(self, project_id):
        """Get all events for a specific project"""
        session = Session()
        try:
            project = session.query(Project).filter_by(id=project_id).first()
            if not project:
                return {'error': 'Project not found'}, 404
            
            events = session.query(Event).filter_by(project_id=project_id).all()
            events_data = []
            
            for event in events:
                event_data = {
                    'id': str(event.id),
                    'name': event.name,
                    'date': str(event.date),
                    'startTime': event.start_time or '',
                    'endTime': event.end_time or '',
                    'location': event.location or '',
                    'status': event.status or 'Upcoming',
                    'description': event.description or '',
                    'projectId': str(event.project_id) if event.project_id else None,
                    'organizationId': event.organization_id or '',
                    'discipline': event.discipline or 'Photography',
                    'standardShotPackage': event.standard_shot_package,
                    'isQuickTurnaround': event.is_quick_turnaround or False,
                    'isCovered': event.is_covered if event.is_covered is not None else True,
                    'process_point': event.process_point or 'idle',
                    'deadline': event.deadline,
                    'assignedPersonnelIds': [str(p.id) for p in event.personnel],
                    'personnelActivity': {},
                    'shots': [{
                        'id': str(shot.id),
                        'eventId': str(shot.event_id),
                        'description': shot.filename,
                        'priority': shot.priority,
                        'status': shot.status,
                        'is_favorite': shot.is_favorite
                    } for shot in event.shots]
                }
                events_data.append(event_data)
            
            return {'events': events_data}, 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

# ==================== ORGANIZATION RESOURCES ====================

class OrganizationListResource(Resource):
    def get(self):
        """Get all organizations"""
        session = Session()
        try:
            organizations = session.query(Organization).all()
            organizations_data = []
            
            for org in organizations:
                org_data = {
                    'id': str(org.id),
                    'name': org.name,
                    'description': org.description or ''
                }
                organizations_data.append(org_data)
            
            return organizations_data, 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

    def post(self):
        """Create a new organization"""
        session = Session()
        try:
            data = request.get_json()
            
            if not data or 'name' not in data:
                return {'error': 'Organization name is required'}, 400
            
            if not data.get('signupCode'):
                return {'error': 'Signup code is required'}, 400
            
            # Check if signup code already exists
            existing_org = session.query(Organization).filter_by(signup_code=data['signupCode']).first()
            if existing_org:
                return {'error': 'Signup code already exists'}, 400
            
            organization = Organization(
                name=data['name'],
                description=data.get('description', ''),
                signup_code=data['signupCode']
            )
            
            session.add(organization)
            session.commit()
            
            return {
                'id': str(organization.id),
                'name': organization.name,
                'description': organization.description or '',
                'signupCode': organization.signup_code,
                'message': 'Organization created successfully'
            }, 201
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

class OrganizationResource(Resource):
    def get(self, organization_id):
        """Get a specific organization"""
        session = Session()
        try:
            organization = session.query(Organization).filter_by(id=organization_id).first()
            if not organization:
                return {'error': 'Organization not found'}, 404
            
            return {
                'id': str(organization.id),
                'name': organization.name,
                'description': organization.description or ''
            }, 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

    def put(self, organization_id):
        """Update an organization"""
        session = Session()
        try:
            organization = session.query(Organization).filter_by(id=organization_id).first()
            if not organization:
                return {'error': 'Organization not found'}, 404
            
            data = request.get_json()
            
            if 'name' in data:
                organization.name = data['name']
            if 'description' in data:
                organization.description = data['description']
            
            session.commit()
            
            return {
                'id': str(organization.id),
                'name': organization.name,
                'description': organization.description or '',
                'message': 'Organization updated successfully'
            }, 200
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

    def delete(self, organization_id):
        """Delete an organization"""
        session = Session()
        try:
            organization = session.query(Organization).filter_by(id=organization_id).first()
            if not organization:
                return {'error': 'Organization not found'}, 404
            
            # Check if organization has projects
            if organization.projects:
                return {'error': 'Cannot delete organization with existing projects'}, 400
            
            session.delete(organization)
            session.commit()
            
            return {'message': 'Organization deleted successfully'}, 200
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

# ==================== AUTHENTICATION RESOURCES ====================

class AuthLoginResource(Resource):
    def post(self):
        """User login"""
        session = Session()
        try:
            data = request.get_json()
            
            if not data or 'email' not in data or 'password' not in data:
                return {'error': 'Email and password are required'}, 400
            
            # Find user by email
            user = session.query(User).filter_by(email=data['email']).first()
            if not user or not user.check_password(data['password']):
                return {'error': 'Invalid email or password'}, 401
            
            # Return user data with organization info
            return {
                'user': {
                    'id': str(user.id),
                    'name': user.name,
                    'email': user.email,
                    'organizationId': str(user.organization_id),
                    'organization': {
                        'id': str(user.organization.id),
                        'name': user.organization.name
                    }
                },
                'message': 'Login successful'
            }, 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

class AuthSignupResource(Resource):
    def post(self):
        """User signup with organization code"""
        session = Session()
        try:
            data = request.get_json()
            
            required_fields = ['name', 'email', 'password', 'signupCode']
            if not data or not all(field in data for field in required_fields):
                return {'error': 'Name, email, password, and signup code are required'}, 400
            
            # Check if user already exists
            existing_user = session.query(User).filter_by(email=data['email']).first()
            if existing_user:
                return {'error': 'User with this email already exists'}, 400
            
            # Find organization by signup code
            organization = session.query(Organization).filter_by(signup_code=data['signupCode']).first()
            if not organization:
                return {'error': 'Invalid signup code'}, 400
            
            # Create new user
            user = User(
                name=data['name'],
                email=data['email'],
                organization_id=organization.id
            )
            user.set_password(data['password'])
            
            session.add(user)
            session.commit()
            
            return {
                'user': {
                    'id': str(user.id),
                    'name': user.name,
                    'email': user.email,
                    'organizationId': str(user.organization_id),
                    'organization': {
                        'id': str(organization.id),
                        'name': organization.name
                    }
                },
                'message': 'User created successfully'
            }, 201
        except Exception as e:
            session.rollback()
            return {'error': str(e)}, 500
        finally:
            session.close()

class AuthVerifyCodeResource(Resource):
    def post(self):
        """Verify signup code"""
        session = Session()
        try:
            data = request.get_json()
            
            if not data or 'signupCode' not in data:
                return {'error': 'Signup code is required'}, 400
            
            # Find organization by signup code
            organization = session.query(Organization).filter_by(signup_code=data['signupCode']).first()
            if not organization:
                return {'error': 'Invalid signup code'}, 400
            
            return {
                'organization': {
                    'id': str(organization.id),
                    'name': organization.name,
                    'description': organization.description or ''
                },
                'message': 'Valid signup code'
            }, 200
        except Exception as e:
            return {'error': str(e)}, 500
        finally:
            session.close()

# ==================== API ROUTES ====================

# User routes
api.add_resource(UserListResource, '/users')
api.add_resource(UserResource, '/users/<int:user_id>')

# Authentication routes
api.add_resource(AuthLoginResource, '/auth/login')
api.add_resource(AuthSignupResource, '/auth/signup')
api.add_resource(AuthVerifyCodeResource, '/auth/verify-code')

# Organization routes
api.add_resource(OrganizationListResource, '/organizations')
api.add_resource(OrganizationResource, '/organizations/<int:organization_id>')

# Event routes
api.add_resource(EventListResource, '/events')
api.add_resource(EventResource, '/events/<int:event_id>')

# Personnel routes
api.add_resource(PersonnelListResource, '/personnel')
api.add_resource(PersonnelResource, '/personnel/<int:personnel_id>')
api.add_resource(PhotographersResource, '/photographers')

# Project routes
api.add_resource(ProjectListResource, '/projects')
api.add_resource(ProjectResource, '/projects/<int:project_id>')
api.add_resource(ProjectEventsResource, '/projects/<int:project_id>/events')

# Shot routes
api.add_resource(ShotListResource, '/shots')
api.add_resource(ShotResource, '/shots/<int:shot_id>')

api.add_resource(ShotRequestListResource, '/shot-requests')
api.add_resource(ShotRequestResource, '/shot-requests/<int:shot_request_id>')

# Relationship routes
api.add_resource(EventPersonnelResource, '/events/<int:event_id>/personnel')
api.add_resource(EventPersonnelAssignmentResource, '/events/<int:event_id>/personnel/<int:personnel_id>')
api.add_resource(EventShotsResource, '/events/<int:event_id>/shots')

# Database management routes
@app.route('/init-db', methods=['POST'])
def initialize_database():
    """Initialize database with sample data"""
    try:
        seed_database()
        return {'message': 'Database initialized with sample data successfully'}, 200
    except Exception as e:
        return {'error': str(e)}, 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)

