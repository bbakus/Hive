import { Nav } from "./Nav";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import '../styles/eventplanner.css'

export const EventPlanner = ({liftUserId}) => {
    const { userId } = useParams()
    const [activeTab, setActiveTab] = useState('overview')
    const [events, setEvents] = useState([])
    const [selectedEvent, setSelectedEvent] = useState(null)
    const [currentUser, setCurrentUser] = useState(null)
    const [selectedProject, setSelectedProject] = useState(null)
    const [selectedDate, setSelectedDate] = useState(() => {
        // Get today's date in local timezone
        const today = new Date()
        const year = today.getFullYear()
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const day = String(today.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    })
    const [showEventModal, setShowEventModal] = useState(false)
    const [editingEvent, setEditingEvent] = useState(null)
    const [currentTime, setCurrentTime] = useState(new Date())
    
    // Get current user from localStorage 
    useEffect(() => {
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
            const user = JSON.parse(storedUser)
            console.log('Current user from localStorage:', user)
            setCurrentUser(user)
        }
    }, [])

    // Pass userId up to parent component
    useEffect(() => {
        if (userId && liftUserId) {
            liftUserId(userId)
        }
    }, [userId, liftUserId])

    // Get selected project from localStorage
    useEffect(() => {
        const storedProject = localStorage.getItem('selectedProject')
        if (storedProject) {
            try {
                const projectData = JSON.parse(storedProject)
                setSelectedProject(projectData)
                console.log('Selected project in EventPlanner:', projectData)
            } catch (error) {
                console.error('Error parsing stored project in EventPlanner:', error)
            }
        }
        
        // Listen for selected project changes
        const handleSelectedProjectChange = (event) => {
            console.log('Selected project changed in EventPlanner:', event.detail)
            setSelectedProject(event.detail)
        }
        
        window.addEventListener('selectedProjectChanged', handleSelectedProjectChange)
        
        return () => {
            window.removeEventListener('selectedProjectChanged', handleSelectedProjectChange)
        }
    }, [])

    // Fetch events
    useEffect(() => {
        console.log('Fetching events for event planner...')
        fetch('http://localhost:5001/events')
        .then(res => res.json())
        .then(data => {
            console.log('Events fetched for event planner:', data)
            setEvents(data.events || data)
        })
        .catch(err => console.error('Error fetching events:', err))
    }, [])

    const handleTabChange = (tab) => {
        setActiveTab(tab)
    }

    // Get events for a specific date
    const getEventsForDate = (date) => {
        return events.filter(event => {
            return event.date === date
        })
    }

    // Get project date range for date picker constraints
    const getProjectDateRange = () => {
        if (!selectedProject) return { min: null, max: null }
        
        const startDate = selectedProject.start_date || selectedProject.startDate
        const endDate = selectedProject.end_date || selectedProject.endDate
        
        return {
            min: startDate,
            max: endDate
        }
    }

    // Format date for display
    const formatDate = (dateString) => {
        // Parse the date string and create a date object in local timezone
        const [year, month, day] = dateString.split('-').map(Number)
        const date = new Date(year, month - 1, day) // month is 0-indexed
        
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    // Get process point color
    const getProcessPointColor = (processPoint) => {
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

    // Handle event click
    const handleEventClick = (event) => {
        setEditingEvent(event)
        setShowEventModal(true)
    }

    // Update current time every minute for live status tracking
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 60000) // Update every minute
        
        return () => clearInterval(timer)
    }, [])

    // Calculate event status based on current time
    const getEventStatus = (event) => {
        if (!event.startTime || !event.endTime) {
            return event.status || 'Scheduled'
        }
        
        // Create date objects for the event date
        const [year, month, day] = event.date.split('-').map(Number)
        const [startHour, startMinute] = event.startTime.split(':').map(Number)
        const [endHour, endMinute] = event.endTime.split(':').map(Number)
        
        const startTime = new Date(year, month - 1, day, startHour, startMinute, 0, 0)
        const endTime = new Date(year, month - 1, day, endHour, endMinute, 0, 0)
        
        const now = currentTime
        
        // Debug logging
        console.log('Event:', event.name)
        console.log('Event date:', event.date)
        console.log('Start time:', event.startTime, '->', startTime.toISOString())
        console.log('End time:', event.endTime, '->', endTime.toISOString())
        console.log('Current time:', now.toISOString())
        
        const timeUntilStart = startTime.getTime() - now.getTime()
        const timeUntilEnd = endTime.getTime() - now.getTime()
        
        // Convert to minutes
        const minutesUntilStart = timeUntilStart / (1000 * 60)
        const minutesUntilEnd = timeUntilEnd / (1000 * 60)
        
        console.log('Minutes until start:', minutesUntilStart)
        console.log('Minutes until end:', minutesUntilEnd)
        
        if (minutesUntilEnd <= 0) {
            return 'Done'
        } else if (minutesUntilStart <= 0 && minutesUntilEnd > 0) {
            return 'Ongoing'
        } else if (minutesUntilStart <= 15 && minutesUntilStart > 0) {
            return 'Starting Soon'
        } else if (minutesUntilStart <= 60 && minutesUntilStart > 15) {
            return 'Upcoming'
        } else {
            return 'Scheduled'
        }
    }

    // Handle process point update
    const handleProcessPointUpdate = async (eventId, newProcessPoint) => {
        try {
            const response = await fetch(`http://localhost:5001/events/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    processPoint: newProcessPoint
                })
            })
            
            if (response.ok) {
                // Refresh events
                const eventsResponse = await fetch('http://localhost:5001/events')
                if (eventsResponse.ok) {
                    const eventsData = await eventsResponse.json()
                    setEvents(eventsData.events || eventsData)
                }
                setShowEventModal(false)
                setEditingEvent(null)
                alert('Process point updated successfully!')
            } else {
                const error = await response.json()
                alert(`Error updating process point: ${error.error}`)
            }
        } catch (error) {
            console.error('Error updating process point:', error)
            alert('Failed to update process point')
        }
    }

    const renderOverviewTab = () => {
        const projectDateRange = getProjectDateRange()
        const eventsForSelectedDate = getEventsForDate(selectedDate)
        
        return (
            <div className='eventplanner-tab-content'>
                <h2>Event Overview</h2>
                
                {/* Date Selector */}
                <div className='date-selector-container'>
                    <div className='date-selector-info'>
                        {selectedProject && (
                            <p className='project-info'>
                                Project: <strong>{selectedProject.name}</strong>
                                {projectDateRange.min && projectDateRange.max && (
                                    <span className='date-range'>
                                        ({formatDate(projectDateRange.min)} - {formatDate(projectDateRange.max)})
                                    </span>
                                )}
                            </p>
                        )}
                    </div>
                    <div className='date-selector-controls'>
                        <label htmlFor='date-selector'>Select Date:</label>
                        <input
                            id='date-selector'
                            type='date'
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            min={projectDateRange.min}
                            max={projectDateRange.max}
                            disabled={!selectedProject}
                        />
                        {!selectedProject && (
                            <small className='date-selector-help'>
                                Select a project to enable date selection
                            </small>
                        )}
                    </div>
                </div>
                
                {/* Statistics for selected date */}
                <div className='overview-stats'>
                    <div className='stat-card'>
                        <h3>Events Today</h3>
                        <div className='stat-number'>{eventsForSelectedDate.length}</div>
                    </div>
                    <div className='stat-card'>
                        <h3>Scheduled</h3>
                        <div className='stat-number'>{eventsForSelectedDate.filter(e => e.status === 'Scheduled').length}</div>
                    </div>
                    <div className='stat-card'>
                        <h3>Completed</h3>
                        <div className='stat-number'>{eventsForSelectedDate.filter(e => e.status === 'Completed').length}</div>
                    </div>
                    <div className='stat-card'>
                        <h3>Upcoming</h3>
                        <div className='stat-number'>{eventsForSelectedDate.filter(e => e.status === 'Upcoming').length}</div>
                    </div>
                </div>
                
                {/* Events for selected date */}
                <div className='recent-events'>
                    <h3>Events for {formatDate(selectedDate)}</h3>
                    {eventsForSelectedDate.length > 0 ? (
                        <div className='events-grid'>
                            {eventsForSelectedDate.map((event, index) => (
                                <div key={event.id || index} className='event-card'>
                                    <div className='event-card-header'>
                                        <h4>{event.name}</h4>
                                        <span className={`status-badge status-${getEventStatus(event).toLowerCase().replace(' ', '-')}`}>
                                            {getEventStatus(event)}
                                        </span>
                                    </div>
                                    <div className='event-card-content'>
                                        <p><strong>Date:</strong> {formatDate(event.date)}</p>
                                        {event.startTime && event.endTime && (
                                            <p><strong>Time:</strong> {event.startTime} - {event.endTime}</p>
                                        )}
                                        {event.location && (
                                            <p><strong>Location:</strong> {event.location}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className='no-events'>
                            <p>No events scheduled for {formatDate(selectedDate)}</p>
                            {!selectedProject && (
                                <p className='no-project-help'>Select a project to view events within its date range</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const renderScheduleTab = () => {
        const eventsForSelectedDate = getEventsForDate(selectedDate)
        
        // Generate time slots from 6 AM to 10 PM
        const timeSlots = []
        for (let hour = 6; hour <= 22; hour++) {
            timeSlots.push(`${hour.toString().padStart(2, '0')}:00`)
        }
        
        // Helper function to get time slot for an event
        const getTimeSlot = (time) => {
            if (!time) return null
            const hour = parseInt(time.split(':')[0])
            return `${hour.toString().padStart(2, '0')}:00`
        }
        
        // Helper function to get column position for overlapping events
        const getEventColumn = (event, allEvents) => {
            const eventStart = event.startTime ? parseInt(event.startTime.split(':')[0]) : 0
            const eventEnd = event.endTime ? parseInt(event.endTime.split(':')[0]) : 24
            
            // Find overlapping events
            const overlappingEvents = allEvents.filter(otherEvent => {
                if (otherEvent.id === event.id) return false
                const otherStart = otherEvent.startTime ? parseInt(otherEvent.startTime.split(':')[0]) : 0
                const otherEnd = otherEvent.endTime ? parseInt(otherEvent.endTime.split(':')[0]) : 24
                
                return (eventStart < otherEnd && eventEnd > otherStart)
            })
            
            // Find the first available column (0-3)
            for (let col = 0; col < 4; col++) {
                const hasConflict = overlappingEvents.some(otherEvent => {
                    // Check if any event in this column overlaps
                    return false // Simplified for now
                })
                if (!hasConflict) return col
            }
            return 0
        }
        
        return (
            <div className='eventplanner-tab-content'>
                <h2>Event Schedule</h2>
                
                {/* Date Selector for Schedule */}
                <div className='schedule-date-selector'>
                    <label htmlFor='schedule-date-selector'>Schedule for:</label>
                    <input
                        id='schedule-date-selector'
                        type='date'
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={getProjectDateRange().min}
                        max={getProjectDateRange().max}
                        disabled={!selectedProject}
                    />
                    {!selectedProject && (
                        <small className='date-selector-help'>
                            Select a project to enable date selection
                        </small>
                    )}
                </div>
                
                <div className='schedule-view'>
                    <div className='timetable'>
                        <div className='timetable-header'>
                            <h3>Schedule for {formatDate(selectedDate)}</h3>
                        </div>
                        
                        <div className='timetable-grid'>
                            {/* Time column */}
                            <div className='time-column'>
                                {timeSlots.map((time, index) => (
                                    <div key={time} className='time-slot'>
                                        <span className='time-label'>{time}</span>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Event columns */}
                            {[0, 1, 2, 3].map(columnIndex => (
                                <div key={columnIndex} className='event-column'>
                                    {timeSlots.map((timeSlot, timeIndex) => {
                                        const eventsInThisSlot = eventsForSelectedDate.filter(event => {
                                            if (!event.startTime) return false
                                            const eventHour = parseInt(event.startTime.split(':')[0])
                                            const slotHour = parseInt(timeSlot.split(':')[0])
                                            return eventHour === slotHour
                                        })
                                        
                                        const eventInThisColumn = eventsInThisSlot[columnIndex]
                                        
                                        return (
                                            <div key={timeSlot} className='timetable-slot'>
                                                {eventInThisColumn ? (
                                                    <div 
                                                        className={`timetable-event ${getProcessPointColor(eventInThisColumn.processPoint)}`}
                                                        onClick={() => handleEventClick(eventInThisColumn)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <div className='event-header'>
                                                            <h4>{eventInThisColumn.name}</h4>
                                                            <div className='event-status-badge'>
                                                                <span className={`status-badge status-${getEventStatus(eventInThisColumn).toLowerCase().replace(' ', '-')}`}>
                                                                    {getEventStatus(eventInThisColumn)}
                                                                </span>
                                                                {eventInThisColumn.processPoint && (
                                                                    <span className='process-point-badge'>
                                                                        {eventInThisColumn.processPoint}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className='event-details'>
                                                            <p className='event-time'>
                                                                {eventInThisColumn.startTime} - {eventInThisColumn.endTime}
                                                            </p>
                                                            {eventInThisColumn.location && (
                                                                <p className='event-location'>{eventInThisColumn.location}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                        
                        {eventsForSelectedDate.length === 0 && (
                            <div className='no-schedule'>
                                <p>No events scheduled for {formatDate(selectedDate)}</p>
                                {!selectedProject && (
                                    <p className='no-project-help'>Select a project to view events within its date range</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    const renderDetailsTab = () => (
        <div className='eventplanner-tab-content'>
            <h2>Event Details</h2>
            
            <div className='event-selector'>
                <label htmlFor='event-select'>Select Event:</label>
                <select 
                    id='event-select'
                    value={selectedEvent?.id || ''}
                    onChange={(e) => {
                        const event = events.find(ev => ev.id == e.target.value)
                        setSelectedEvent(event)
                    }}
                >
                    <option value=''>Choose an event...</option>
                    {events.map(event => (
                        <option key={event.id} value={event.id}>
                            {event.name} - {new Date(event.date).toLocaleDateString()}
                        </option>
                    ))}
                </select>
            </div>
            
            {selectedEvent ? (
                <div className='event-details'>
                    <div className='detail-section'>
                        <h3>Basic Information</h3>
                        <div className='detail-grid'>
                            <div className='detail-item'>
                                <label>Event Name:</label>
                                <span>{selectedEvent.name}</span>
                            </div>
                            <div className='detail-item'>
                                <label>Date:</label>
                                <span>{new Date(selectedEvent.date).toLocaleDateString()}</span>
                            </div>
                            <div className='detail-item'>
                                <label>Time:</label>
                                <span>
                                    {selectedEvent.startTime && selectedEvent.endTime 
                                        ? `${selectedEvent.startTime} - ${selectedEvent.endTime}`
                                        : 'Not specified'
                                    }
                                </span>
                            </div>
                            <div className='detail-item'>
                                <label>Location:</label>
                                <span>{selectedEvent.location || 'Not specified'}</span>
                            </div>
                            <div className='detail-item'>
                                <label>Status:</label>
                                <span className={`status-badge status-${selectedEvent.status?.toLowerCase()}`}>
                                    {selectedEvent.status}
                                </span>
                            </div>
                            <div className='detail-item'>
                                <label>Discipline:</label>
                                <span>{selectedEvent.discipline || 'Not specified'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className='detail-section'>
                        <h3>Additional Information</h3>
                        <div className='detail-grid'>
                            <div className='detail-item'>
                                <label>Description:</label>
                                <span>{selectedEvent.description || 'No description provided'}</span>
                            </div>
                            <div className='detail-item'>
                                <label>Deadline:</label>
                                <span>{selectedEvent.deadline || 'Not specified'}</span>
                            </div>
                            <div className='detail-item'>
                                <label>Process Point:</label>
                                <span>{selectedEvent.processPoint || 'Not specified'}</span>
                            </div>
                            <div className='detail-item'>
                                <label>Quick Turnaround:</label>
                                <span>{selectedEvent.isQuickTurnaround ? 'Yes' : 'No'}</span>
                            </div>
                            <div className='detail-item'>
                                <label>Covered:</label>
                                <span>{selectedEvent.isCovered ? 'Yes' : 'No'}</span>
                            </div>
                            <div className='detail-item'>
                                <label>Standard Shot Package:</label>
                                <span>{selectedEvent.standardShotPackage ? 'Yes' : 'No'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className='no-event-selected'>
                    <p>Select an event from the dropdown above to view its details.</p>
                </div>
            )}
        </div>
    )

    return(
        <>
        <Nav/>
        <div className='content-area'>
            <div className='eventplanner-container'>
            
                
                <div className='eventplanner-tabs'>
                    <button 
                        className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => handleTabChange('overview')}
                    >
                        Overview
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
                        onClick={() => handleTabChange('schedule')}
                    >
                        Schedule
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => handleTabChange('details')}
                    >
                        Details
                    </button>
                </div>
                
                <div className='eventplanner-content'>
                    {activeTab === 'overview' && renderOverviewTab()}
                    {activeTab === 'schedule' && renderScheduleTab()}
                    {activeTab === 'details' && renderDetailsTab()}
                </div>
            </div>
        </div>
        
        {/* Event Details Modal */}
        {showEventModal && editingEvent && (
            <div className='modal-overlay'>
                <div className='modal-content event-modal'>
                    <div className='event-modal-header'>
                        <h2>Event Details</h2>
                        <button 
                            className='modal-close-btn'
                            onClick={() => {
                                setShowEventModal(false)
                                setEditingEvent(null)
                            }}
                        >
                            ×
                        </button>
                    </div>
                    
                    <div className='event-details-content'>
                        <div className='event-detail-section'>
                            <h3>Basic Information</h3>
                            <div className='detail-grid'>
                                <div className='detail-item'>
                                    <label>Event Name</label>
                                    <span>{editingEvent.name}</span>
                                </div>
                                <div className='detail-item'>
                                    <label>Date</label>
                                    <span>{formatDate(editingEvent.date)}</span>
                                </div>
                                <div className='detail-item'>
                                    <label>Time</label>
                                    <span>
                                        {editingEvent.startTime && editingEvent.endTime 
                                            ? `${editingEvent.startTime} - ${editingEvent.endTime}`
                                            : 'All Day'
                                        }
                                    </span>
                                </div>
                                <div className='detail-item'>
                                    <label>Location</label>
                                    <span>{editingEvent.location || 'Not specified'}</span>
                                </div>
                                <div className='detail-item'>
                                    <label>Status</label>
                                    <span className={`status-badge status-${getEventStatus(editingEvent).toLowerCase().replace(' ', '-')}`}>
                                        {getEventStatus(editingEvent)}
                                    </span>
                                </div>
                                <div className='detail-item'>
                                    <label>Discipline</label>
                                    <span>{editingEvent.discipline || 'Not specified'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className='event-detail-section'>
                            <h3>Process Information</h3>
                            <div className='process-point-editor'>
                                <label htmlFor='process-point-select'>Process Point:</label>
                                <select
                                    id='process-point-select'
                                    value={editingEvent.processPoint || ''}
                                    onChange={(e) => {
                                        const newProcessPoint = e.target.value
                                        handleProcessPointUpdate(editingEvent.id, newProcessPoint)
                                    }}
                                >
                                    <option value=''>Select Process Point</option>
                                    <option value='Idle'>Idle</option>
                                    <option value='Ingest'>Ingest</option>
                                    <option value='Cull'>Cull</option>
                                    <option value='Color'>Color</option>
                                    <option value='Delivered'>Delivered</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className='event-detail-section'>
                            <h3>Additional Information</h3>
                            <div className='detail-grid'>
                                <div className='detail-item'>
                                    <label>Description</label>
                                    <span>{editingEvent.description || 'No description'}</span>
                                </div>
                                <div className='detail-item'>
                                    <label>Deadline</label>
                                    <span>{editingEvent.deadline || 'Not specified'}</span>
                                </div>
                                <div className='detail-item'>
                                    <label>Quick Turnaround</label>
                                    <span>{editingEvent.isQuickTurnaround ? 'Yes' : 'No'}</span>
                                </div>
                                <div className='detail-item'>
                                    <label>Covered</label>
                                    <span>{editingEvent.isCovered ? 'Yes' : 'No'}</span>
                                </div>
                                <div className='detail-item'>
                                    <label>Standard Shot Package</label>
                                    <span>{editingEvent.standardShotPackage ? 'Yes' : 'No'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}

