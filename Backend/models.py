
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import Column, Integer, String, Boolean, Float, Date, JSON, ForeignKey, Table, create_engine
from sqlalchemy_serializer import SerializerMixin
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime
import os

Base = declarative_base()

database_url = os.environ.get('DATABASE_URL', 'sqlite:///hive.db')

# Association tables for many-to-many relationships
event_personnel = Table('event_personnel', Base.metadata,
    Column('event_id', Integer, ForeignKey('events.id'), primary_key=True),
    Column('personnel_id', Integer, ForeignKey('personnel.id'), primary_key=True)
)

event_users = Table('event_users', Base.metadata,
    Column('event_id', Integer, ForeignKey('events.id'), primary_key=True),
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True)
)

# Association table for project key personnel (many-to-many with role)
project_key_personnel = Table('project_key_personnel', Base.metadata,
    Column('project_id', Integer, ForeignKey('projects.id'), primary_key=True),
    Column('personnel_id', Integer, ForeignKey('personnel.id'), primary_key=True),
    Column('role', String(100), nullable=False)  # Store the role for this personnel in this project
)

class Event(Base, SerializerMixin):
    __tablename__ = 'events'

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(String(50), nullable=False) 
    end_time = Column(String(50), nullable=False)
    event_type = Column(String, nullable=True)
    standard_shot_package = Column(Boolean, nullable=False)
    location = Column(String(255), nullable=True)
    status = Column(String(50), nullable=True)
    description = Column(String, nullable=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=True)  # Foreign key to projects table
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False)  # Foreign key to organizations table
    discipline = Column(String(50), nullable=True, default='Photography')
    is_quick_turnaround = Column(Boolean, default=False)
    is_covered = Column(Boolean, default=False)
    deadline = Column(String)
    process_point = Column(String)
    
    # Many-to-many relationships
    personnel = relationship('Personnel', secondary=event_personnel, back_populates='events')
    users = relationship('User', secondary=event_users, back_populates='events')
    
    # One-to-many relationship with shots
    shots = relationship('Shot', back_populates='event', cascade='all, delete-orphan')
    shot_requests = relationship('Shot_Request', back_populates='event', cascade='all, delete-orphan')
    
    # Many-to-one relationship with project
    project = relationship('Project', back_populates='events')
    # Many-to-one relationship with organization
    organization = relationship('Organization')

class Personnel(Base, SerializerMixin):
    __tablename__ = 'personnel'

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=False)

    # Many-to-many relationships
    events = relationship('Event', secondary=event_personnel, back_populates='personnel')
    projects = relationship('Project', secondary=project_key_personnel, back_populates='key_personnel')
    
    # One-to-many relationship with shots (as photographer)
    shots = relationship('Shot', back_populates='photographer')
    
    def is_photographer(self):
        """Check if this personnel member has a photographer role"""
        return 'photographer' in self.role.lower()

class User(Base, SerializerMixin):
    __tablename__='users'

    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False)

    def set_password(self, password):
        """Hash and set the user's password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check if the provided password matches the stored hash"""
        return check_password_hash(self.password_hash, password)
    
    # Many-to-one relationship with organization
    organization = relationship('Organization', back_populates='users')
    # Many-to-many relationship with events
    events = relationship('Event', secondary=event_users, back_populates='users')

class Shot(Base, SerializerMixin):
    __tablename__='shots'

    id = Column(Integer, primary_key=True)
    image = Column(String, nullable=False)
    date_created = Column(Date, nullable=False)
    camera = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    photographer = Column(String)
    
    # Foreign keys
    event_id = Column(Integer, ForeignKey('events.id'), nullable=False)
    photographer_id = Column(Integer, ForeignKey('personnel.id'), nullable=False)
    
    # Relationships
    event = relationship('Event', back_populates='shots')
    photographer = relationship('Personnel', back_populates='shots')

class Shot_Request(Base, SerializerMixin):
    __tablename__='shot_requests'

    id = Column(Integer, primary_key=True)
    shot_description = Column(String, nullable=False)
    start_time = Column(String)
    end_time = Column(String)
    stakeholder = Column(String)
    quick_turn = Column(Boolean, nullable=False)
    deadline = Column(String)
    key_sponsor = Column(String)
    status = Column(String)
    event_id = Column(Integer, ForeignKey('events.id'), nullable=True)

    event = relationship('Event', back_populates='shot_requests')


class Organization(Base, SerializerMixin):
    __tablename__ = 'organizations'

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    signup_code = Column(String(50), nullable=False, unique=True)  # Unique code for user signup
    
    # One-to-many relationship with projects
    projects = relationship('Project', back_populates='organization')
    # One-to-many relationship with users
    users = relationship('User', back_populates='organization')

class Project(Base, SerializerMixin):
    __tablename__ = 'projects'

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    client = Column(String(255), nullable=True)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=False)
    status = Column(String(50), nullable=True, default='In Planning')
    description = Column(String, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    location = Column(String(255), nullable=True)
    
    # Many-to-one relationship with organization
    organization = relationship('Organization', back_populates='projects')
    # One-to-many relationship with events
    events = relationship('Event', back_populates='project')
    # Many-to-many relationship with key personnel (with role)
    key_personnel = relationship('Personnel', secondary=project_key_personnel, back_populates='projects')


# ==================== DATABASE CREATION AND SEEDING ====================

def create_database():
    """Create the database and all tables"""
    engine = create_engine(database_url)
    Base.metadata.create_all(engine)
    print("Database and tables created successfully!")

def seed_database():
    """Seed the database with sample data"""
    engine = create_engine(database_url)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    
    try:    
        # Sample users data
        initial_users = [
            {
                "name": "Admin User",
                "email": "admin@hiveproductions.com",
                "password": "admin123",
                "organization_id": 1  # Will reference HIVE Productions
            }
        ]
        
        # Sample organizations data
        initial_organizations = [
            {
                "name": "HIVE Productions",
                "description": "Professional event photography and videography company specializing in corporate events, conferences, and brand activations.",
                "signup_code": "HIVE2024"
            }
        ]
        
        
        # Create organizations first
        organizations = []
        for org_data in initial_organizations:
            organization = Organization(
                name=org_data["name"],
                description=org_data["description"],
                signup_code=org_data["signup_code"]
            )
            organizations.append(organization)
            session.add(organization)
        
        # Commit organizations first to get their IDs
        session.commit()
        
        
        # Create users
        for user_data in initial_users:
            user = User(
                name=user_data["name"],
                email=user_data["email"],
                organization_id=user_data["organization_id"]
            )
            user.set_password(user_data["password"])
            session.add(user)
        
        session.commit()
        
        
        
        session.commit()
        print("Database seeded successfully with sample data!")
        
    except Exception as e:
        session.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        session.close()

def init_database():
    """Initialize database with tables and sample data"""
    create_database()
    seed_database()

if __name__ == '__main__':
    init_database()
