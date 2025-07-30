import { Nav } from "./Nav";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import '../styles/projects.css'

export const Projects = () => {
    const [selectedProject, setSelectedProject] = useState(null)
    const [projects, setProjects] = useState([])
    const [events, setEvents] = useState([])
    const [shotRequests, setShotRequests] = useState([])
    const [personnel, setPersonnel] = useState([])
    const [loading, setLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())

    // Get selected project from localStorage and listen for changes
    useEffect(() => {
        const storedProject = localStorage.getItem('selectedProject')
        if (storedProject) {
            try {
                const projectData = JSON.parse(storedProject)
                setSelectedProject(projectData)
            } catch (error) {
                console.error('Error parsing stored project:', error)
            }
        }
        
        const handleSelectedProjectChange = (event) => {
            setSelectedProject(event.detail)
        }
        
        window.addEventListener('selectedProjectChanged', handleSelectedProjectChange)
        
        return () => {
            window.removeEventListener('selectedProjectChanged', handleSelectedProjectChange)
        }
    }, [])

    // Fetch all data
    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true)
            try {
                const [projectsRes, eventsRes, shotRequestsRes, personnelRes] = await Promise.all([
                    fetch('http://localhost:5001/projects'),
                    fetch('http://localhost:5001/events'),
                    fetch('http://localhost:5001/shot-requests'),
                    fetch('http://localhost:5001/personnel')
                ])

                const [projectsData, eventsData, shotRequestsData, personnelData] = await Promise.all([
                    projectsRes.json(),
                    eventsRes.json(),
                    shotRequestsRes.json(),
                    personnelRes.json()
                ])

                setProjects(projectsData)
                setEvents(eventsData.events || eventsData)
                setShotRequests(shotRequestsData)
                setPersonnel(personnelData)
            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchAllData()
    }, [])

    // Update current time every minute
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 60000) // Update every minute

        return () => clearInterval(timer)
    }, [])

    // Calculate project statistics
    const getProjectStatistics = () => {
        if (!selectedProject) return null

        // Filter events for this project
        const projectEvents = events.filter(event => 
            String(event.projectId) === String(selectedProject.id)
        )

        // Filter shot requests for this project's events
        const projectEventIds = projectEvents.map(event => String(event.id))
        const projectShotRequests = shotRequests.filter(shotRequest =>
            projectEventIds.includes(String(shotRequest.eventId))
        )

        // Calculate event status distribution based on time (matching EventPlanner logic)
        const eventStatusCounts = {}
        
        projectEvents.forEach(event => {
            if (!event.startTime || !event.endTime) {
                const status = event.status || 'Scheduled'
                eventStatusCounts[status] = (eventStatusCounts[status] || 0) + 1
                return
            }
            
            // Create date objects for the event date (matching EventPlanner logic)
            const [year, month, day] = event.date.split('-').map(Number)
            const [startHour, startMinute] = event.startTime.split(':').map(Number)
            const [endHour, endMinute] = event.endTime.split(':').map(Number)
            
            const startTime = new Date(year, month - 1, day, startHour, startMinute, 0, 0)
            const endTime = new Date(year, month - 1, day, endHour, endMinute, 0, 0)
            
            const now = currentTime
            
            const timeUntilStart = startTime.getTime() - now.getTime()
            const timeUntilEnd = endTime.getTime() - now.getTime()
            
            // Convert to minutes
            const minutesUntilStart = timeUntilStart / (1000 * 60)
            const minutesUntilEnd = timeUntilEnd / (1000 * 60)
            
            let status
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
            
            eventStatusCounts[status] = (eventStatusCounts[status] || 0) + 1
        })

        // Calculate event process point distribution (normalized)
        const eventProcessPointCounts = {}
        projectEvents.forEach(event => {
            // Normalize process point to handle case differences
            let processPoint = event.processPoint || 'idle'
            processPoint = processPoint.toLowerCase() === 'idle' ? 'idle' : processPoint.toLowerCase()
            
            eventProcessPointCounts[processPoint] = (eventProcessPointCounts[processPoint] || 0) + 1
        })

        // Calculate completion percentage
        const completedEvents = projectEvents.filter(event => 
            event.processPoint?.toLowerCase() === 'delivered'
        ).length
        const completionPercentage = projectEvents.length > 0 
            ? Math.round((completedEvents / projectEvents.length) * 100)
            : 0

        // Calculate staff load percentage
        const totalPersonnel = personnel.length
        const assignedPersonnel = selectedProject.keyPersonnel?.length || 0
        const staffLoadPercentage = totalPersonnel > 0 
            ? Math.round((assignedPersonnel / totalPersonnel) * 100)
            : 0

        // Calculate most assigned member (only for events that are not done)
        const personnelEventCounts = {}
        projectEvents.forEach(event => {
            // Skip events that are done
            if (!event.startTime || !event.endTime) {
                // Include events without times (they're not done)
                const assignedPersonnelIds = event.assignedPersonnelIds || []
                assignedPersonnelIds.forEach(personnelId => {
                    const id = String(personnelId)
                    personnelEventCounts[id] = (personnelEventCounts[id] || 0) + 1
                })
                return
            }
            
            // Check if event is done based on time
            const [year, month, day] = event.date.split('-').map(Number)
            const [startHour, startMinute] = event.startTime.split(':').map(Number)
            const [endHour, endMinute] = event.endTime.split(':').map(Number)
            
            const startTime = new Date(year, month - 1, day, startHour, startMinute, 0, 0)
            const endTime = new Date(year, month - 1, day, endHour, endMinute, 0, 0)
            
            const now = currentTime
            const timeUntilEnd = endTime.getTime() - now.getTime()
            const minutesUntilEnd = timeUntilEnd / (1000 * 60)
            
            // Only count events that are not done
            if (minutesUntilEnd > 0) {
                const assignedPersonnelIds = event.assignedPersonnelIds || []
                assignedPersonnelIds.forEach(personnelId => {
                    const id = String(personnelId)
                    personnelEventCounts[id] = (personnelEventCounts[id] || 0) + 1
                })
            }
        })

        let mostAssignedMember = null
        let maxEventCount = 0
        
        Object.entries(personnelEventCounts).forEach(([personnelId, eventCount]) => {
            if (eventCount > maxEventCount) {
                maxEventCount = eventCount
                const staffMember = personnel.find(p => String(p.id) === personnelId)
                mostAssignedMember = staffMember ? { ...staffMember, eventCount } : null
            }
        })

        return {
            totalEvents: projectEvents.length,
            totalShotRequests: projectShotRequests.length,
            eventStatusCounts,
            eventProcessPointCounts,
            completionPercentage,
            staffLoadPercentage,
            assignedPersonnel,
            totalPersonnel,
            completedEvents,
            mostAssignedMember
        }
    }

    const statistics = getProjectStatistics()

    // Handle project status change
    const handleProjectStatusChange = async (newStatus) => {
        if (!selectedProject) return
        
        try {
            const response = await fetch(`http://localhost:5001/projects/${selectedProject.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: newStatus
                })
            })
            
            if (response.ok) {
                // Update the selected project with new status
                const updatedProject = { ...selectedProject, status: newStatus }
                setSelectedProject(updatedProject)
                
                // Update localStorage
                localStorage.setItem('selectedProject', JSON.stringify(updatedProject))
                
                // Dispatch event to notify other components
                window.dispatchEvent(new CustomEvent('selectedProjectChanged', { 
                    detail: updatedProject 
                }))
                
                console.log('Project status updated successfully')
            } else {
                const error = await response.json()
                console.error('Error updating project status:', error)
                alert('Failed to update project status')
            }
        } catch (error) {
            console.error('Error updating project status:', error)
            alert('Failed to update project status')
        }
    }

    if (loading) {
        return (
            <>
                <Nav />
                <div className='content-area'>
                    <div className='loading-state'>Loading project data...</div>
                </div>
            </>
        )
    }

    if (!selectedProject) {
        return (
            <>
                <Nav />
                <div className='content-area'>
                    <div className='empty-state'>
                        <h2>No Project Selected</h2>
                        <p>Select a project from the navigation to view its details and statistics.</p>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <Nav />
            <div className='content-area'>
                <div className='projects-dashboard'>
                    {/* Project Header */}
                    <div className='project-header-card'>
                        <div className='project-header-content'>
                            <div className='project-basic-info'>
                                <h1 className='project-title'>{selectedProject.name}</h1>
                                <div className='project-meta'>
                                    <span className='project-client'>{selectedProject.client}</span>
                                    <div className='project-status-container'>
                                        <select 
                                            className='project-status-dropdown'
                                            value={selectedProject.status || 'Planning'}
                                            data-status={selectedProject.status || 'Planning'}
                                            onChange={(e) => handleProjectStatusChange(e.target.value)}
                                        >
                                            <option value='Planning'>Planning</option>
                                            <option value='Prepped'>Prepped</option>
                                            <option value='Active'>Active</option>
                                            <option value='Wrapped'>Wrapped</option>
                                            <option value='Delivered'>Delivered</option>
                                        </select>
                                    </div>
                                </div>
                                <p className='project-description'>{selectedProject.description}</p>
                                <div className='project-details'>
                                    <div className='project-detail-item'>
                                        <strong>Location:</strong> {selectedProject.location || 'Not specified'}
                                    </div>
                                    <div className='project-detail-item'>
                                        <strong>Start Date:</strong> {selectedProject.startDate || 'Not set'}
                                    </div>
                                    <div className='project-detail-item'>
                                        <strong>End Date:</strong> {selectedProject.endDate || 'Not set'}
                                    </div>
                                </div>
                            </div>
                            <div className='project-completion-indicator'>
                                <div 
                                    className='completion-circle'
                                    style={{'--completion': statistics?.completionPercentage || 0}}
                                >
                                    <div className='completion-percentage'>{statistics?.completionPercentage || 0}%</div>
                                    <div className='completion-label'>Complete</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Statistics Grid */}
                    <div className='statistics-grid'>
                        {/* Key Metrics */}
                        <div className='stat-card'>
                            <h3>Project Metrics</h3>
                            <div className='metrics-list'>
                                <div className='metric-item'>
                                    <div className='metric-number'>{statistics?.totalEvents || 0}</div>
                                    <div className='metric-label'>Total Events</div>
                                </div>
                                <div className='metric-item'>
                                    <div className='metric-number'>{statistics?.totalShotRequests || 0}</div>
                                    <div className='metric-label'>Shot Requests</div>
                                </div>
                                <div className='metric-item'>
                                    <div className='metric-number'>{statistics?.completedEvents || 0}</div>
                                    <div className='metric-label'>Completed Events</div>
                                </div>
                            </div>
                        </div>

                        {/* Staff Load */}
                        <div className='stat-card'>
                            <h3>Staff Load</h3>
                            <div className='staff-load-container'>
                                <div className='staff-load-percentage'>
                                    <div className='percentage-number'>{statistics?.staffLoadPercentage || 0}%</div>
                                    <div className='percentage-label'>of available staff assigned</div>
                                </div>
                                <div className='staff-breakdown'>
                                    <div className='staff-item'>
                                        <strong>Assigned:</strong> {statistics?.assignedPersonnel || 0}
                                    </div>
                                    <div className='staff-item'>
                                        <strong>Available:</strong> {statistics?.totalPersonnel || 0}
                                    </div>
                                </div>
                                
                                {statistics?.mostAssignedMember && (
                                    <div className='most-assigned-member'>
                                        <div className='most-assigned-header'>
                                            <strong>Most Assigned Member</strong>
                                        </div>
                                        <div className='most-assigned-details'>
                                            <div className='member-name'>{statistics.mostAssignedMember.name}</div>
                                            <div className='member-role'>{statistics.mostAssignedMember.role}</div>
                                            <div className='member-event-count'>
                                                {statistics.mostAssignedMember.eventCount} event{statistics.mostAssignedMember.eventCount !== 1 ? 's' : ''} assigned
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Event Status Distribution */}
                        <div className='stat-card event-status-card'>
                            <h3>Event Status Distribution</h3>
                            <div className='event-status-list'>
                                {(() => {
                                    const allStatuses = ['Scheduled', 'Upcoming', 'Starting Soon', 'Ongoing', 'Done']
                                    const statusCounts = statistics?.eventStatusCounts || {}
                                    
                                    return allStatuses.map(status => {
                                        const count = statusCounts[status] || 0
                                        return (
                                            <div key={status} className='event-status-item'>
                                                <div className='event-status-info'>
                                                    <span className='event-status-name'>{status}</span>
                                                    <span className='event-status-count'>{count} event{count !== 1 ? 's' : ''}</span>
                                                </div>
                                                <div className='event-status-bar'>
                                                    <div 
                                                        className='event-status-fill'
                                                        style={{
                                                            width: `${(count / (statistics?.totalEvents || 1)) * 100}%`,
                                                            backgroundColor: getEventStatusColor(status)
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )
                                    })
                                })()}
                            </div>
                        </div>

                        {/* Process Point Distribution */}
                        <div className='stat-card process-points-card'>
                            <h3>Event Process Points</h3>
                            <div className='process-points-list'>
                                {(() => {
                                    const allProcessPoints = ['idle', 'ingest', 'cull', 'color', 'delivered']
                                    const processPointCounts = statistics?.eventProcessPointCounts || {}
                                    
                                    return allProcessPoints.map(processPoint => {
                                        const count = processPointCounts[processPoint] || 0
                                        return (
                                            <div key={processPoint} className='process-point-item'>
                                                <div className='process-point-info'>
                                                    <span className='process-point-name'>{processPoint}</span>
                                                    <span className='process-point-count'>{count} event{count !== 1 ? 's' : ''}</span>
                                                </div>
                                                <div className='process-point-bar'>
                                                    <div 
                                                        className='process-point-fill'
                                                        style={{
                                                            width: `${(count / (statistics?.totalEvents || 1)) * 100}%`,
                                                            backgroundColor: getProcessPointColor(processPoint)
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )
                                    })
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

// Helper function for process point colors
const getProcessPointColor = (processPoint) => {
    const point = processPoint?.toLowerCase()
    switch (point) {
        case 'idle': return '#757575'
        case 'ingest': return '#2196F3'
        case 'cull': return '#FF9800'
        case 'color': return '#9C27B0'
        case 'delivered': return '#4CAF50'
        default: return '#757575'
    }
}

// Helper function for event status colors
const getEventStatusColor = (status) => {
    const eventStatus = status?.toLowerCase()
    switch (eventStatus) {
        case 'scheduled': return '#2196F3'      // Blue
        case 'upcoming': return '#9C27B0'       // Purple
        case 'starting soon': return '#FF5722'   // Deep Orange
        case 'ongoing': return '#FF9800'         // Orange
        case 'done': return '#4CAF50'            // Green
        default: return '#757575'
    }
}