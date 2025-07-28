#!/usr/bin/env python3
"""
Database initialization script for Hive application.
This script creates the database tables and seeds them with sample data.
"""

from models import init_database

if __name__ == '__main__':
    print("Initializing Hive database...")
    init_database()
    print("Database initialization complete!")
    print("\nSample data created:")
    print("- 5 Events")
    print("- 4 Personnel members")
    print("- 2 Users (admin@company.com / admin123, user@company.com / user123)")
    print("- 3 Sample shots")
    print("- Personnel assignments to events") 