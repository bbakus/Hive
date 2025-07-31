import { Nav } from "./Nav";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import '../styles/projects.css'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export const Projects = () => {
    const [selectedProject, setSelectedProject] = useState(null)
    const [projects, setProjects] = useState([])
    const [events, setEvents] = useState([])
    const [shotRequests, setShotRequests] = useState([])
    const [personnel, setPersonnel] = useState([])
    const [loading, setLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [showEditProjectModal, setShowEditProjectModal] = useState(false)
    const [editProjectForm, setEditProjectForm] = useState({
        name: '',
        client: '',
        description: '',
        location: '',
        startDate: '',
        endDate: '',
        status: ''
    })

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

        // Calculate all assigned staff members with their counts
        const personnelEventCounts = {}
        
        // Count assignments for each personnel member
        projectEvents.forEach(event => {
            const assignedPersonnelIds = event.assignedPersonnelIds || []
            console.log(`Event "${event.name}" has assignments:`, assignedPersonnelIds)
            
            assignedPersonnelIds.forEach(personnelId => {
                const id = String(personnelId)
                personnelEventCounts[id] = (personnelEventCounts[id] || 0) + 1
            })
        })
        
        console.log('Final personnel event counts:', personnelEventCounts)
        
        // Get all assigned staff members with their details
        const assignedStaffMembers = []
        
        Object.entries(personnelEventCounts).forEach(([personnelId, eventCount]) => {
            const staffMember = personnel.find(p => String(p.id) === String(personnelId))
            if (staffMember) {
                assignedStaffMembers.push({
                    ...staffMember,
                    eventCount
                })
            }
        })
        
        // Sort by event count (highest first)
        assignedStaffMembers.sort((a, b) => b.eventCount - a.eventCount)
        
        console.log('All assigned staff members:', assignedStaffMembers)

        return {
            totalEvents: projectEvents.length,
            totalShotRequests: projectShotRequests.length,
            imagesDelivered: completedEvents,  // Events with process point "delivered"
            eventStatusCounts,
            eventProcessPointCounts,
            completionPercentage,
            staffLoadPercentage,
            assignedPersonnel,
            totalPersonnel,
            completedEvents,
            assignedStaffMembers
        }
    }

    const statistics = getProjectStatistics()

    // Chart configurations
    const getEventStatusChartData = () => {
        if (!statistics?.eventStatusCounts) return null
        
        const allStatuses = ['Scheduled', 'Upcoming', 'Starting Soon', 'Ongoing', 'Done']
        const data = allStatuses.map(status => statistics.eventStatusCounts[status] || 0)
        
        return {
            labels: allStatuses,
            datasets: [
                {
                    label: 'Events',
                    data: data,
                    backgroundColor: allStatuses.map(status => getEventStatusColor(status)),
                    borderColor: allStatuses.map(status => getEventStatusColor(status)),
                    borderWidth: 1,
                    borderRadius: 4,
                }
            ]
        }
    }

    const getProcessPointsChartData = () => {
        if (!statistics?.eventProcessPointCounts) return null
        
        const allProcessPoints = ['idle', 'ingest', 'cull', 'color', 'delivered']
        const data = allProcessPoints.map(point => statistics.eventProcessPointCounts[point] || 0)
        
        return {
            labels: allProcessPoints.map(point => point.charAt(0).toUpperCase() + point.slice(1)),
            datasets: [
                {
                    label: 'Events',
                    data: data,
                    backgroundColor: allProcessPoints.map(point => getProcessPointColor(point)),
                    borderColor: allProcessPoints.map(point => getProcessPointColor(point)),
                    borderWidth: 1,
                    borderRadius: 4,
                }
            ]
        }
    }

    const getStaffAssignmentChartData = () => {
        if (!statistics?.assignedStaffMembers || statistics.assignedStaffMembers.length === 0) return null
        
        // Limit to top 10 staff members for better chart readability
        const topStaff = statistics.assignedStaffMembers.slice(0, 10)
        
        return {
            labels: topStaff.map(member => member.name),
            datasets: [
                {
                    label: 'Events Assigned',
                    data: topStaff.map(member => member.eventCount),
                    backgroundColor: '#2196F3',
                    borderColor: '#1976D2',
                    borderWidth: 1,
                    borderRadius: 4,
                }
            ]
        }
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
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
                        return `${context.parsed.y} events`
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                },
                ticks: {
                    color: '#ffffff',
                    font: {
                        size: 11
                    },
                    maxTicksLimit: 8, // Limit Y-axis ticks for better readability
                    callback: function(value) {
                        return Math.round(value)
                    }
                }
            },
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                },
                ticks: {
                    color: '#ffffff',
                    font: {
                        size: 10
                    },
                    maxRotation: 45, // Rotate labels for better fit
                    minRotation: 0
                }
            }
        }
    }

    // Handle edit project form submission
    const handleEditProjectSubmit = async (e) => {
        e.preventDefault()
        
        if (!selectedProject) return
        
        try {
            const response = await fetch(`http://localhost:5001/projects/${selectedProject.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editProjectForm)
            })
            
            if (response.ok) {
                // Update the selected project with new data
                const updatedProject = { ...selectedProject, ...editProjectForm }
                setSelectedProject(updatedProject)
                
                // Update localStorage
                localStorage.setItem('selectedProject', JSON.stringify(updatedProject))
                
                // Dispatch event to notify other components
                window.dispatchEvent(new CustomEvent('selectedProjectChanged', { 
                    detail: updatedProject 
                }))
                
                setShowEditProjectModal(false)
                alert('Project updated successfully!')
            } else {
                const error = await response.json()
                console.error('Error updating project:', error)
                alert('Failed to update project')
            }
        } catch (error) {
            console.error('Error updating project:', error)
            alert('Failed to update project')
        }
    }

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
                                <div className='project-title-row'>
                                    <h1 className='project-title'>{selectedProject.name}</h1>
                                    <button 
                                        className='edit-project-btn'
                                        onClick={() => {
                                            setEditProjectForm({
                                                name: selectedProject.name || '',
                                                client: selectedProject.client || '',
                                                description: selectedProject.description || '',
                                                location: selectedProject.location || '',
                                                startDate: selectedProject.startDate || '',
                                                endDate: selectedProject.endDate || '',
                                                status: selectedProject.status || 'Planning'
                                            })
                                            setShowEditProjectModal(true)
                                        }}
                                    >
                                        Edit Project
                                    </button>
                                </div>
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
                                    <div className='metric-number'>{statistics?.imagesDelivered || 0}</div>
                                    <div className='metric-label'>Events Delivered</div>
                                </div>
                                <div className='metric-item'>
                                    <div className='metric-number'>{statistics?.completedEvents || 0}</div>
                                    <div className='metric-label'>Finished Events</div>
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
                                
                                <div className='assigned-staff-section'>
                                    <div className='assigned-staff-header'>
                                        <strong>Assigned Staff Members</strong>
                                    </div>
                                    {statistics?.assignedStaffMembers && statistics.assignedStaffMembers.length > 0 ? (
                                        <div className='assigned-staff-list'>
                                            {statistics.assignedStaffMembers.map((member, index) => (
                                                <div key={member.id} className='assigned-staff-item'>
                                                    <div className='staff-member-info'>
                                                        <div className='staff-member-name'>{member.name}</div>
                                                        <div className='staff-member-role'>{member.role}</div>
                                                    </div>
                                                    <div className='staff-member-count'>
                                                        {member.eventCount} event{member.eventCount !== 1 ? 's' : ''} assigned
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className='assigned-staff-empty'>
                                            <div className='empty-message'>No assignments found</div>
                                            <div className='empty-subtitle'>No personnel assigned to events</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Event Status Chart */}
                        <div className='stat-card chart-card'>
                            <h3>Event Status Distribution</h3>
                            <div className='chart-container'>
                                {getEventStatusChartData() ? (
                                    <Bar data={getEventStatusChartData()} options={chartOptions} />
                                ) : (
                                    <div className='chart-placeholder'>No data available</div>
                                )}
                            </div>
                        </div>

                        {/* Process Points Chart */}
                        <div className='stat-card chart-card'>
                            <h3>Event Process Points</h3>
                            <div className='chart-container'>
                                {getProcessPointsChartData() ? (
                                    <Bar data={getProcessPointsChartData()} options={chartOptions} />
                                ) : (
                                    <div className='chart-placeholder'>No data available</div>
                                )}
                            </div>
                        </div>

                        {/* Staff Assignment Chart */}
                        <div className='stat-card chart-card'>
                            <h3>Staff Event Assignments</h3>
                            {statistics?.assignedStaffMembers && statistics.assignedStaffMembers.length > 10 && (
                                <p className='chart-note'>Showing top 10 staff members</p>
                            )}
                            <div className='chart-container'>
                                {getStaffAssignmentChartData() ? (
                                    <Bar data={getStaffAssignmentChartData()} options={chartOptions} />
                                ) : (
                                    <div className='chart-placeholder'>No staff assignments found</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Project Modal */}
            {showEditProjectModal && (
                <div className='modal-overlay'>
                    <div className='modal-content'>
                        <h2>Edit Project</h2>
                        <form onSubmit={handleEditProjectSubmit}>
                            <div className='form-group'>
                                <label className='form-label'>Project Name *</label>
                                <input
                                    className='form-input'
                                    type='text'
                                    value={editProjectForm.name}
                                    onChange={(e) => setEditProjectForm({...editProjectForm, name: e.target.value})}
                                    required
                                    placeholder='Enter project name'
                                />
                            </div>
                            <div className='form-group'>
                                <label className='form-label'>Client *</label>
                                <input
                                    className='form-input'
                                    type='text'
                                    value={editProjectForm.client}
                                    onChange={(e) => setEditProjectForm({...editProjectForm, client: e.target.value})}
                                    required
                                    placeholder='Enter client name'
                                />
                            </div>
                            <div className='form-group'>
                                <label className='form-label'>Description</label>
                                <textarea
                                    className='form-textarea'
                                    value={editProjectForm.description}
                                    onChange={(e) => setEditProjectForm({...editProjectForm, description: e.target.value})}
                                    placeholder='Enter project description'
                                    rows={3}
                                />
                            </div>
                            <div className='form-group'>
                                <label className='form-label'>Location</label>
                                <input
                                    className='form-input'
                                    type='text'
                                    value={editProjectForm.location}
                                    onChange={(e) => setEditProjectForm({...editProjectForm, location: e.target.value})}
                                    placeholder='Enter project location'
                                />
                            </div>
                            <div className='form-row'>
                                <div className='form-group'>
                                    <label className='form-label'>Start Date</label>
                                    <input
                                        className='form-input'
                                        type='date'
                                        value={editProjectForm.startDate}
                                        onChange={(e) => setEditProjectForm({...editProjectForm, startDate: e.target.value})}
                                    />
                                </div>
                                <div className='form-group'>
                                    <label className='form-label'>End Date</label>
                                    <input
                                        className='form-input'
                                        type='date'
                                        value={editProjectForm.endDate}
                                        onChange={(e) => setEditProjectForm({...editProjectForm, endDate: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className='form-group'>
                                <label className='form-label'>Status</label>
                                <select
                                    className='form-select'
                                    value={editProjectForm.status}
                                    onChange={(e) => setEditProjectForm({...editProjectForm, status: e.target.value})}
                                >
                                    <option value='Planning'>Planning</option>
                                    <option value='Prepped'>Prepped</option>
                                    <option value='Active'>Active</option>
                                    <option value='Wrapped'>Wrapped</option>
                                    <option value='Delivered'>Delivered</option>
                                </select>
                            </div>
                            <div className='form-actions'>
                                <button className='form-button form-button-primary' type='submit'>Update Project</button>
                                <button className='form-button form-button-secondary' type='button' onClick={() => setShowEditProjectModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
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
        case 'color': return '#DC3545'  // Red to match EventPlanner
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