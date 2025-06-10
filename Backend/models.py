from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()

class Event(db.Model):
    __tablename__ = 'events'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    date = db.Column(db.Date, nullable=False)
    location = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(50), nullable=True)
    description = db.Column(db.Text, nullable=True)
    shots = db.Column(db.JSON, nullable=True) # Assuming shots will be stored as JSON

    def __repr__(self):
        return f"<Event {self.name}>"

class Personnel(db.model):
    __tablename__ = 'personnel'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    role = db.Column(db.String, nullable=False)
    phone = db.Column(db.String, nullable=False)
    email = db.Column(db.String, nullable=False)



class User(db.Model):

    __tablename__='users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False)
    password = db.Column(db.String(255), nullable=False)


class Metada(db.Model):

    __tablename__='metadatas'

    id = db.Column(db.Integer, primary_key=True)