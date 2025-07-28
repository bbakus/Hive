import { useParams } from "react-router-dom"
import { Nav } from "./Nav"
import { useState, useEffect } from "react"
import '../styles/home.css'

export const Home = ({liftUserId}) => {

    const { userId } = useParams()
    const [projects, setProjects] = useState([])
    const [organizations, setOrganizations] = useState([])
    const [events, setEvents] = useState([])
    const [currentUser, setCurrentUser] = useState(null)
    const [selectedProject, setSelectedProject] = useState(null)
    
    // Get current user from localStorage 
    useEffect(() => {
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
            const user = JSON.parse(storedUser)
            console.log('Current user from localStorage:', user)
            setCurrentUser(user)
        }
        
        // Get initial selected project from localStorage
        const storedProject = localStorage.getItem('selectedProject')
        if (storedProject) {
            try {
                const projectData = JSON.parse(storedProject)
                setSelectedProject(projectData)
                console.log('Initial selected project in Home:', projectData)
            } catch (error) {
                console.error('Error parsing stored project in Home:', error)
            }
        }
        
        // Listen for selected project changes
        const handleSelectedProjectChange = (event) => {
            console.log('Selected project changed in Home:', event.detail)
            setSelectedProject(event.detail)
        }
        
        window.addEventListener('selectedProjectChanged', handleSelectedProjectChange)
        
        return () => {
            window.removeEventListener('selectedProjectChanged', handleSelectedProjectChange)
        }
    }, [])

    // Pass userId up to parent component
    useEffect(() => {
        if (userId && liftUserId) {
            liftUserId(userId)
        }
    }, [userId, liftUserId])

    useEffect(() => {
        console.log('Fetching events...')
        fetch('http://localhost:5001/events')
        .then(res => res.json())
        .then(data => {
            console.log('Events fetched:', data)
            setEvents(data.events || data)
        })
        .catch(err => console.error('Error fetching events:', err))

    },[])

    useEffect(() => {
        console.log('Fetching projects...')
        fetch('http://localhost:5001/projects')
        .then(res => res.json())
        .then(data => {
            console.log('Projects fetched:', data)
            setProjects(data)
        })
        .catch(err => console.error('Error fetching projects:', err))
    },[])

    // Fetch organizations
    useEffect(() => {
        fetch('http://localhost:5001/organizations')
        .then(res => res.json())
        .then(data => {
            console.log('Organizations fetched:', data)
            setOrganizations(data)
        })
        .catch(err => console.error('Error fetching organizations:', err))
    },[])

    return(
        <>
        <Nav/>
        <div className='content-area'>
            
            <div className='dashboard-grid'>
                <div className='dashboard-card'>
                    <h3>Project Status</h3>
                    {selectedProject ? (
                        <div>
                            <h4 style={{color: '#f1c40f', marginBottom: '0.5rem'}}>{selectedProject.name}</h4>
                            <p><strong>Status:</strong> <span style={{
                                color: selectedProject.status === 'Active' ? '#2ecc71' : 
                                       selectedProject.status === 'Completed' ? '#3498db' :
                                       selectedProject.status === 'On Hold' ? '#e74c3c' : 
                                       selectedProject.status === 'In Planning' ? '#f39c12' : '#f39c12'
                            }}>{selectedProject.status}</span></p>
                            <p><strong>Client:</strong> {selectedProject.client || 'Not specified'}</p>
                            <p><strong>Location:</strong> {selectedProject.location || 'Not specified'}</p>
                            {selectedProject.startDate && (
                                <p><strong>Start Date:</strong> {new Date(selectedProject.startDate).toLocaleDateString()}</p>
                            )}
                            {selectedProject.endDate && (
                                <p><strong>End Date:</strong> {new Date(selectedProject.endDate).toLocaleDateString()}</p>
                            )}
                            {selectedProject.description && (
                                <p><strong>Description:</strong> {selectedProject.description}</p>
                            )}
                        </div>
                    ) : (
                        <div>
                            <p>No project selected</p>
                            <p>Select a project from the navigation above to view its status</p>
                            <p>Total Projects: {projects.length}</p>
                        </div>
                    )}
                </div>
                <div className='dashboard-card'>
                    <h3>Upcoming Events</h3>
                    <p>Next scheduled events and deadlines</p>
                    {events.length > 0 ? (
                        <div className='events-list'>
                            {events.slice(0, 5).map((event, index) => (
                                <div key={event.id || index} className='event-item'>
                                    <div className='event-info'>
                                        <h4>{event.name}</h4>
                                        <p><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
                                        {event.startTime && event.endTime && (
                                            <p><strong>Time:</strong> {event.startTime} - {event.endTime}</p>
                                        )}
                                        {event.location && (
                                            <p><strong>Location:</strong> {event.location}</p>
                                        )}
                                        <p><strong>Status:</strong> <span style={{
                                            color: event.status === 'Scheduled' ? '#2ecc71' : 
                                                   event.status === 'Completed' ? '#3498db' :
                                                   event.status === 'Cancelled' ? '#e74c3c' : '#f39c12'
                                        }}>{event.status}</span></p>
                                    </div>
                                </div>
                            ))}
                            {events.length > 5 && (
                                <p style={{color: '#b0b0b0', fontStyle: 'italic', marginTop: '1rem'}}>
                                    Showing 5 of {events.length} events
                                </p>
                            )}
                        </div>
                    ) : (
                        <p style={{color: '#b0b0b0', fontStyle: 'italic'}}>No upcoming events found</p>
                    )}
                </div>
                <div className='dashboard-card'>
                    <h3>Quick Access</h3>
                    <p>Go to <strong>Settings</strong> to create new projects, events, and organizations.</p>
                    <p>Total Organizations: {organizations.length}</p>
                </div>
            </div>
        </div>
        </>
    )

}











