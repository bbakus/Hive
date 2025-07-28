# Hive Backend

A Flask-RESTful API backend for the Hive photography management system using SQLAlchemy and SQLite.

## Setup

### Prerequisites
- Python 3.7+
- pip

### Installation
1. Install dependencies:
```bash
pip install flask flask-restful flask-cors sqlalchemy sqlalchemy-serializer werkzeug
```

### Database Setup
The database is automatically created when you run the application, but you can also initialize it manually:

#### Option 1: Run the initialization script
```bash
python init_db.py
```

#### Option 2: Use the API endpoint
```bash
curl -X POST http://localhost:5000/init-db
```

#### Option 3: Run models directly
```bash
python models.py
```

## Running the Application

```bash
python main.py
```

The server will start on `http://localhost:5000`

## API Endpoints

### Users
- `GET /users` - Get all users
- `POST /users` - Create user
- `GET /users/<id>` - Get specific user
- `PUT /users/<id>` - Update user
- `DELETE /users/<id>` - Delete user

### Events
- `GET /events` - Get all events (returns `{events: [...]}` format)
- `POST /events` - Create event
- `GET /events/<id>` - Get specific event
- `PUT /events/<id>` - Update event
- `DELETE /events/<id>` - Delete event

### Personnel
- `GET /personnel` - Get all personnel (includes `personnelId` field)
- `POST /personnel` - Create personnel
- `GET /personnel/<id>` - Get specific personnel
- `PUT /personnel/<id>` - Update personnel
- `DELETE /personnel/<id>` - Delete personnel
- `GET /photographers` - Get only personnel with photographer roles

### Shots
- `GET /shots` - Get all shots
- `POST /shots` - Create shot
- `GET /shots/<id>` - Get specific shot
- `PUT /shots/<id>` - Update shot
- `DELETE /shots/<id>` - Delete shot

### Relationships
- `GET /events/<id>/personnel` - Get personnel for event
- `POST /events/<id>/personnel/<personnel_id>` - Add personnel to event
- `DELETE /events/<id>/personnel/<personnel_id>` - Remove personnel from event
- `GET /events/<id>/shots` - Get shots for event

### Database Management
- `POST /init-db` - Initialize database with sample data

## Sample Data

The database comes pre-seeded with:

### Users
- `admin@company.com` / `admin123`
- `user@company.com` / `user123`

### Events
- Company Annual Meeting
- Product Launch Party
- Team Building Workshop
- Holiday Gala
- Q1 2024 Planning Session

### Personnel
- John Smith (Lead Photographer)
- Sarah Johnson (Assistant Photographer)
- Mike Davis (Event Coordinator)
- Lisa Wilson (Photographer)

### Sample Shots
- 3 sample shots with different cameras and events
- Only personnel with "photographer" in their role can be assigned as photographers

### Role Validation
- The `photographer_id` field in shots only accepts personnel with roles containing "photographer"
- Use `/photographers` endpoint to get only photographer personnel
- API will return 400 error if trying to assign non-photographer personnel as photographer

## Data Structure Alignment

The backend API has been updated to match the frontend TypeScript expectations:

### Event Structure
Events now include all fields expected by the frontend:
- `id`: Event ID (string)
- `name`: Event name
- `date`: Event date (YYYY-MM-DD format)
- `time`: Event time (HH:MM - HH:MM format)
- `location`: Event location
- `status`: Event status
- `description`: Event description
- `projectId`: Associated project ID
- `organizationId`: Associated organization ID
- `discipline`: Event discipline (default: "Photography")
- `isQuickTurnaround`: Quick turnaround flag
- `isCovered`: Coverage status
- `deadline`: Event deadline
- `assignedPersonnelIds`: Array of assigned personnel IDs
- `personnelActivity`: Personnel activity tracking
- `shots`: Array of associated shots

### Personnel Structure
Personnel includes both `id` and `personnelId` fields for frontend compatibility:
- `id`: Personnel ID (string)
- `personnelId`: Same as id (for frontend compatibility)
- `name`: Personnel name
- `role`: Personnel role
- `status`: Availability status
- `avatar`: Avatar URL
- `cameraSerials`: Array of camera serial numbers
- `contact`: Contact information
- `phone`: Phone number
- `email`: Email address

### API Response Format
- Events endpoint returns `{events: [...]}` format
- Personnel endpoints include both `id` and `personnelId` fields
- All IDs are returned as strings for frontend compatibility

## Database

- **Type**: SQLite
- **File**: `hive.db` (created automatically)
- **Location**: Backend directory

## Environment Variables

- `DATABASE_URL`: Database connection string (default: `sqlite:///hive.db`)
- `SECRET_KEY`: Flask secret key (default: `your-secret-key-here`)

## Testing the API

You can test the API using curl or any API client:

```bash
# Get all events
curl http://localhost:5000/events

# Create a new event
curl -X POST http://localhost:5000/events \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Event","date":"2024-01-15","location":"Test Location","status":"Upcoming","description":"Test description"}'

# Get all personnel
curl http://localhost:5000/personnel

# Get only photographers
curl http://localhost:5000/photographers

# Create a shot (only with photographer personnel)
curl -X POST http://localhost:5000/shots \
  -H "Content-Type: application/json" \
  -d '{"image":"/images/test.jpg","date_created":"2024-01-15","camera":"Canon EOS R5","filename":"test_001.jpg","event_id":1,"photographer_id":1}'
```

### API Alignment Testing

Run the test script to verify that your backend API matches frontend expectations:

```bash
# Install requests if not already installed
pip install requests

# Run the alignment test
python test_api_alignment.py
```

This test script will verify:
- Events endpoint returns `{events: [...]}` format
- Personnel includes both `id` and `personnelId` fields
- Photographers endpoint returns only personnel with photographer roles
- Event creation accepts and returns all expected fields 