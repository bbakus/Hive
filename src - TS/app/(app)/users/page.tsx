"use client";

import React, { useState, useEffect, FormEvent } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
}

function UserManagementPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [userIdToDelete, setUserIdToDelete] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<User | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  // Simulate fetching initial user list (replace with actual API call)
  useEffect(() => {
    // TODO: Call backend to get initial list of users
    const initialUsers = [
      { id: '1', username: 'user1', email: 'user1@example.com' },
      { id: '2', username: 'user2', email: 'user2@example.com' },
    ];
    setUsers(initialUsers);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    // TODO: Add email validation

    setError(null);
    setSuccess(null);

    try {
      // TODO: Call backend create-user API
      console.log('Creating user:', { username, email });
      // Replace with actual backend call to create user
      setUsername('');
      setEmail('');
    } catch (err) {
 if (err instanceof Error) {
 setError('Error creating user: ' + err.message);
 } else {
 setError('An unknown error occurred during user creation.');
 }
    }
  };

  const handleUserSelected = async (userId: string) => {
    setSelectedUserId(userId);
    setSelectedUserDetails(null); // Clear previous details
    setLoadingDetails(true);
    setDetailsError(null);

    try {
      // TODO: Call backend get-user API with userId
      console.log('Fetching details for user:', userId);
      // Simulate fetching user details
      const user = users.find(u => u.id === userId);
      setSelectedUserDetails(user || null);
      setLoadingDetails(false);
    } catch (err) {
 if (err instanceof Error) {
 setDetailsError('Error fetching user details: ' + err.message);
 } else {
 setDetailsError('An unknown error occurred while fetching user details.');
 }
 setLoadingDetails(false);
    }
  };

  return (
    <div>
      <h1>User Management</h1>

      {/* UserForm component */}
      <div>
        <h2>Create User</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Username:</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label>Email:</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button type="submit">Create</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {success && <p style={{ color: 'green' }}>{success}</p>}
        </form>
      </div>

      <hr />

      {/* UserList component */}
      <div>
        <h2>Users</h2>
        <ul>
          {users.map(user => (
            <li key={user.id} onClick={() => handleUserSelected(user.id)} style={{ cursor: 'pointer', textDecoration: selectedUserId === user.id ? 'underline' : 'none' }}>
              {user.username}
            </li>
          ))}
        </ul>
      </div>

      <hr />

      {/* UserDetails component */}
      <div>
        <h2>User Details</h2>
        {selectedUserId === null ? (
          <p>Select a user to view details.</p>
        ) : loadingDetails ? (
          <p>Loading user details...</p>
        ) : detailsError ? (
          <p style={{ color: 'red' }}>{detailsError}</p>
        ) : selectedUserDetails ? (
          <div>
            <p>ID: {selectedUserDetails.id}</p>
            <p>Username: {selectedUserDetails.username}</p>
            <p>Email: {selectedUserDetails.email}</p>
          </div>
        ) : (
          <p>User not found.</p>
        )}
      </div>
    </div>
  );
}

export default UserManagementPage;
