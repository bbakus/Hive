import { useParams } from "react-router-dom"
import { Nav } from "./Nav"
import { useState, useEffect } from "react"
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import '../styles/home.css'

// Register ChartJS components
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export const Home = ({liftUserId}) => {

    const { userId } = useParams()
    const [projects, setProjects] = useState([])
    const [organizations, setOrganizations] = useState([])
    const [events, setEvents] = useState([])
    const [currentUser, setCurrentUser] = useState(null)
    const [selectedProject, setSelectedProject] = useState(null)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [showEventModal, setShowEventModal] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState(null)
    
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

    // Update current time every minute for live status tracking
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 60000) // Update every minute
        
        return () => clearInterval(timer)
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

    // Get today's events (all events for today)
    const getTodaysEvents = () => {
        const today = new Date()
        const todayString = today.toISOString().split('T')[0] // YYYY-MM-DD format
        
        return events.filter(event => {
            // Only events for today
            if (event.date !== todayString) return false
            
            // Include all events for today, regardless of time
            return true
        }).sort((a, b) => {
            // Sort by start time
            const [aHour, aMinute] = a.startTime.split(':').map(Number)
            const [bHour, bMinute] = b.startTime.split(':').map(Number)
            return (aHour * 60 + aMinute) - (bHour * 60 + bMinute)
        })
    }

    const todaysEvents = getTodaysEvents()

    // Get process points data for pie chart
    const getProcessPointsData = () => {
        if (!selectedProject) return null
        
        // Filter events for the selected project
        const projectEvents = events.filter(event => 
            String(event.projectId) === String(selectedProject.id)
        )
        
        // Count events by process point
        const processPointCounts = {}
        projectEvents.forEach(event => {
            const processPoint = event.processPoint || 'idle'
            const normalizedPoint = processPoint.toLowerCase()
            processPointCounts[normalizedPoint] = (processPointCounts[normalizedPoint] || 0) + 1
        })
        
        // Define all possible process points
        const allProcessPoints = ['idle', 'ingest', 'cull', 'color', 'delivered']
        const labels = allProcessPoints.map(point => point.charAt(0).toUpperCase() + point.slice(1))
        const data = allProcessPoints.map(point => processPointCounts[point] || 0)
        const backgroundColors = allProcessPoints.map(point => getProcessPointColor(point))
        
        return {
            labels: labels,
            datasets: [
                {
                    data: data,
                    backgroundColor: backgroundColors,
                    borderWidth: 0
                }
            ]
        }
    }

    // Helper function for process point colors
    const getProcessPointColor = (processPoint) => {
        const point = processPoint?.toLowerCase()
        switch (point) {
            case 'idle': return '#6ED8CA' // Match EventPlanner teal color
            case 'ingest': return '#2196F3'
            case 'cull': return '#FF9800'
            case 'color': return '#DC3545'
            case 'delivered': return '#4CAF50'
            default: return '#757575'
        }
    }

    const pieChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    color: '#ffffff',
                    font: {
                        size: 16
                    },
                    padding: 15,
                    usePointStyle: true
                }
            },
            tooltip: {
                backgroundColor: '#2a2a2a',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: '#444',
                borderWidth: 1,
                cornerRadius: 6,
                callbacks: {
                    label: function(context) {
                        const label = context.label || ''
                        const value = context.parsed
                        const total = context.dataset.data.reduce((a, b) => a + b, 0)
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
                        return `${label}: ${value} (${percentage}%)`
                    }
                }
            }
        }
    }

    // Handle event click to open modal
    const handleEventClick = (event) => {
        setSelectedEvent(event)
        setShowEventModal(true)
    }

    // Get process point color class (matching EventPlanner)
    const getProcessPointClass = (processPoint) => {
        switch (processPoint?.toLowerCase()) {
            case 'idle':
                return 'process-idle'
            case 'ingest':
                return 'process-ingest'
            case 'cull':
                return 'process-cull'
            case 'color':
                return 'process-color'
            case 'delivered':
                return 'process-delivered'
            default:
                return 'process-default'
        }
    }

    return(
        <>
        <Nav/>
        <div className='content-area'>
            
            <div className='dashboard-grid'>
                <div className='dashboard-card'>
                    <h3>Project Status</h3>
                    {selectedProject ? (
                        <div className='project-status-layout'>
                            <div className='project-status-info'>
                                <h4 className='project-status-title'>{selectedProject.name}</h4>
                                <p className='project-status-text'>
                                    <strong>Status:</strong> 
                                    <span className={`project-status-value status-${selectedProject.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                                        {selectedProject.status}
                                    </span>
                                </p>
                                <p className='project-status-text'>
                                    <strong>Client:</strong> {selectedProject.client || 'Not specified'}
                                </p>
                                <p className='project-status-text'>
                                    <strong>Location:</strong> {selectedProject.location || 'Not specified'}
                                </p>
                                {selectedProject.startDate && (
                                    <p className='project-status-text'>
                                        <strong>Start Date:</strong> {new Date(selectedProject.startDate).toLocaleDateString()}
                                    </p>
                                )}
                                {selectedProject.endDate && (
                                    <p className='project-status-text'>
                                        <strong>End Date:</strong> {new Date(selectedProject.endDate).toLocaleDateString()}
                                    </p>
                                )}
                                {selectedProject.description && (
                                    <p className='project-status-text'>
                                        <strong>Description:</strong> {selectedProject.description}
                                    </p>
                                )}
                            </div>
                            
                            {/* Process Points Pie Chart */}
                            <div className='event-progress-container'>
                                <h5 className='event-progress-title'>Event Progress</h5>
                                <div className='event-progress-chart'>
                                    {getProcessPointsData() ? (
                                        <Pie data={getProcessPointsData()} options={pieChartOptions} />
                                    ) : (
                                        <div className='event-progress-empty'>
                                            No events found for this project
                                        </div>
                                    )}
                                </div>
                            </div>
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
                    <h3>Today's Events</h3>
                    <p>All events scheduled for today</p>
                    {todaysEvents.length > 0 ? (
                        <div className='events-list-scrollable'>
                            {todaysEvents.map((event, index) => {
                                // Calculate accurate time-based status (matching EventPlanner logic)
                                let status = 'Scheduled'
                                
                                if (event.startTime && event.endTime) {
                                    const [year, month, day] = event.date.split('-').map(Number)
                                    const [startHour, startMinute] = event.startTime.split(':').map(Number)
                                    const [endHour, endMinute] = event.endTime.split(':').map(Number)
                                    
                                    const startTime = new Date(year, month - 1, day, startHour, startMinute, 0, 0)
                                    const endTime = new Date(year, month - 1, day, endHour, endMinute, 0, 0)
                                    
                                    const timeUntilStart = startTime.getTime() - currentTime.getTime()
                                    const timeUntilEnd = endTime.getTime() - currentTime.getTime()
                                    
                                    // Convert to minutes
                                    const minutesUntilStart = timeUntilStart / (1000 * 60)
                                    const minutesUntilEnd = timeUntilEnd / (1000 * 60)
                                    
                                    if (minutesUntilEnd <= 0) {
                                        status = 'Done'
                                    } else if (minutesUntilStart <= 0 && minutesUntilEnd > 0) {
                                        status = 'Ongoing'
                                    } else if (minutesUntilStart <= 15 && minutesUntilStart > 0) {
                                        status = 'Starting Soon'
                                    } else if (minutesUntilStart <= 60 && minutesUntilStart > 15) {
                                        status = 'Upcoming'
                                    } else {
                                        status = 'Scheduled'
                                    }
                                }
                                
                                return (
                                    <div 
                                        key={event.id || index} 
                                        className={`event-item clickable ${getProcessPointClass(event.processPoint)}`}
                                        onClick={() => handleEventClick(event)}
                                    >
                                        <div className='event-info'>
                                            <h4>{event.name}</h4>
                                            <p><strong>Time:</strong> {event.startTime} - {event.endTime}</p>
                                            {event.location && (
                                                <p><strong>Location:</strong> {event.location}</p>
                                            )}
                                            <p><strong>Status:</strong> <span className={`status-badge status-${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</span></p>
                                            <p><strong>Process Point:</strong> {event.processPoint || 'Idle'}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p style={{color: '#b0b0b0', fontStyle: 'italic'}}>No events scheduled for today</p>
                    )}
                </div>
                <div className='dashboard-card'>
                    <h3>Quick Access</h3>
                    <p>Go to <strong>Settings</strong> to create new projects, events, and organizations.</p>
                    <p>Total Organizations: {organizations.length}</p>
                </div>
            </div>

            {/* Event Details Modal */}
            {showEventModal && selectedEvent && (
                <div className='modal-overlay'>
                    <div className='modal-content'>
                        <div className='modal-header'>
                            <h2>Event Details</h2>
                            <button 
                                className='modal-close-btn'
                                onClick={() => {
                                    setShowEventModal(false)
                                    setSelectedEvent(null)
                                }}
                            >
                                ×
                            </button>
                        </div>
                        <div className='event-details-content'>
                            <div className='event-detail-section'>
                                <h3>{selectedEvent.name}</h3>
                                <div className='event-detail-grid'>
                                    <div className='event-detail-item'>
                                        <label>Date:</label>
                                        <span>{new Date(selectedEvent.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className='event-detail-item'>
                                        <label>Time:</label>
                                        <span>{selectedEvent.startTime} - {selectedEvent.endTime}</span>
                                    </div>
                                    {selectedEvent.location && (
                                        <div className='event-detail-item'>
                                            <label>Location:</label>
                                            <span>{selectedEvent.location}</span>
                                        </div>
                                    )}
                                    <div className='event-detail-item'>
                                        <label>Process Point:</label>
                                        <span className={`process-point-badge ${getProcessPointClass(selectedEvent.processPoint)}`}>
                                            {selectedEvent.processPoint || 'Idle'}
                                        </span>
                                    </div>
                                    {selectedEvent.description && (
                                        <div className='event-detail-item'>
                                            <label>Description:</label>
                                            <span>{selectedEvent.description}</span>
                                        </div>
                                    )}
                                    {selectedEvent.discipline && (
                                        <div className='event-detail-item'>
                                            <label>Discipline:</label>
                                            <span>{selectedEvent.discipline}</span>
                                        </div>
                                    )}
                                    {selectedEvent.isQuickTurnaround && (
                                        <div className='event-detail-item'>
                                            <label>Quick Turnaround:</label>
                                            <span>Yes</span>
                                        </div>
                                    )}
                                    {selectedEvent.deadline && (
                                        <div className='event-detail-item'>
                                            <label>Deadline:</label>
                                            <span>{selectedEvent.deadline}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    )

}











