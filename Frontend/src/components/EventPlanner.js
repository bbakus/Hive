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
    const [isEditingEvent, setIsEditingEvent] = useState(false)
    const [editEventForm, setEditEventForm] = useState({
        name: '',
        date: '',
        startTime: '',
        endTime: '',
        location: '',
        description: '',
        discipline: '',
        deadline: '',
        isQuickTurnaround: false,
        isCovered: false,
        standardShotPackage: false
    })
    const [currentTime, setCurrentTime] = useState(new Date())
    const [filterQuickTurnaround, setFilterQuickTurnaround] = useState(false)
    const [filterProcessPoint, setFilterProcessPoint] = useState('')
    const [filterTodayQuickTurnaround, setFilterTodayQuickTurnaround] = useState(false)
    const [filterAllEventsDate, setFilterAllEventsDate] = useState('')
    const [newEventForm, setNewEventForm] = useState({
        name: '',
        date: selectedDate,
        startTime: '',
        endTime: '',
        location: '',
        description: '',
        discipline: 'Photography',
        isQuickTurnaround: false,
        standardShotPackage: true,
        deadline: '',
        hasShotRequest: false
    })
    const [shotRequestForm, setShotRequestForm] = useState({
        shotDescription: '',
        startTime: '',
        endTime: '',
        stakeholder: '',
        quickTurn: false,
        deadline: '',
        keySponsor: ''
    })
    const [showShotRequestModal, setShowShotRequestModal] = useState(false)
    
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

    // Get filtered events for today with quick turnaround filter
    const getFilteredEventsForToday = (date) => {
        let filteredEvents = getEventsForDate(date)
        
        if (filterTodayQuickTurnaround) {
            filteredEvents = filteredEvents.filter(event => event.isQuickTurnaround)
        }
        
        return filteredEvents
    }

    // Get all events for the selected project
    const getProjectEvents = () => {
        if (!selectedProject) return []
        return events.filter(event => 
            String(event.projectId) === String(selectedProject.id)
        )
    }

    // Apply filters to project events
    const getFilteredProjectEvents = () => {
        let filteredEvents = getProjectEvents()
        
        // Apply date filter
        if (filterAllEventsDate && filterAllEventsDate !== '') {
            filteredEvents = filteredEvents.filter(event => event.date === filterAllEventsDate)
        }
        
        // Apply quick turnaround filter
        if (filterQuickTurnaround) {
            filteredEvents = filteredEvents.filter(event => event.isQuickTurnaround)
        }
        
        // Apply process point filter
        if (filterProcessPoint && filterProcessPoint !== '') {
            filteredEvents = filteredEvents.filter(event => 
                event.processPoint?.toLowerCase() === filterProcessPoint.toLowerCase()
            )
        }
        
        // Sort by date and time
        return filteredEvents.sort((a, b) => {
            const dateComparison = new Date(a.date) - new Date(b.date)
            if (dateComparison !== 0) return dateComparison
            
            // If same date, sort by start time
            if (a.startTime && b.startTime) {
                return a.startTime.localeCompare(b.startTime)
            }
            return 0
        })
    }

    // Get events starting within the next hour
    const getUpcomingEventsWithinHour = () => {
        const projectEvents = getProjectEvents()
        const now = currentTime
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000) // Add 1 hour
        
        return projectEvents.filter(event => {
            if (!event.startTime || !event.date) return false
            
            // Create date object for event start time
            const [year, month, day] = event.date.split('-').map(Number)
            const [startHour, startMinute] = event.startTime.split(':').map(Number)
            const eventStartTime = new Date(year, month - 1, day, startHour, startMinute, 0, 0)
            
            // Check if event starts between now and 1 hour from now
            return eventStartTime > now && eventStartTime <= oneHourFromNow
        })
    }

    // Get events that have already ended (completed)
    const getCompletedEvents = () => {
        const projectEvents = getProjectEvents()
        const now = currentTime
        
        return projectEvents.filter(event => {
            if (!event.endTime || !event.date) return false
            
            // Create date object for event end time
            const [year, month, day] = event.date.split('-').map(Number)
            const [endHour, endMinute] = event.endTime.split(':').map(Number)
            const eventEndTime = new Date(year, month - 1, day, endHour, endMinute, 0, 0)
            
            // Check if event has already ended
            return eventEndTime <= now
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

    const handleEventUpdate = async (e) => {
        e.preventDefault()
        
        if (!editingEvent) return
        
        try {
            const response = await fetch(`http://localhost:5001/events/${editingEvent.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editEventForm)
            })
            
            if (response.ok) {
                // Update the event in the local state
                const updatedEvents = events.map(event => 
                    event.id === editingEvent.id 
                        ? { ...event, ...editEventForm }
                        : event
                )
                setEvents(updatedEvents)
                
                // Update the editing event
                setEditingEvent({ ...editingEvent, ...editEventForm })
                
                // Exit edit mode
                setIsEditingEvent(false)
                
                alert('Event updated successfully!')
            } else {
                const error = await response.json()
                console.error('Error updating event:', error)
                alert('Failed to update event')
            }
        } catch (error) {
            console.error('Error updating event:', error)
            alert('Failed to update event')
        }
    }

    const startEditingEvent = () => {
        if (!editingEvent) return
        
        setEditEventForm({
            name: editingEvent.name || '',
            date: editingEvent.date || '',
            startTime: editingEvent.startTime || '',
            endTime: editingEvent.endTime || '',
            location: editingEvent.location || '',
            description: editingEvent.description || '',
            discipline: editingEvent.discipline || '',
            deadline: editingEvent.deadline || '',
            isQuickTurnaround: editingEvent.isQuickTurnaround || false,
            isCovered: editingEvent.isCovered || false,
            standardShotPackage: editingEvent.standardShotPackage || false
        })
        setIsEditingEvent(true)
    }

    const cancelEditingEvent = () => {
        setIsEditingEvent(false)
        setEditEventForm({
            name: '',
            date: '',
            startTime: '',
            endTime: '',
            location: '',
            description: '',
            discipline: '',
            deadline: '',
            isQuickTurnaround: false,
            isCovered: false,
            standardShotPackage: false
        })
    }

    // Handle new event form submission
    const handleNewEventSubmit = async (e) => {
        e.preventDefault()
        
        // Validate required fields
        if (!newEventForm.name?.trim()) {
            alert('Event name is required.')
            return
        }
        
        if (!newEventForm.date) {
            alert('Event date is required.')
            return
        }
        
        if (!selectedProject) {
            alert('Please select a project before creating an event.')
            return
        }
        
        // Validate shot request if selected
        if (newEventForm.hasShotRequest && !shotRequestForm.shotDescription?.trim()) {
            alert('Shot description is required when adding a shot request.')
            return
        }
        
        try {
            const eventData = {
                name: newEventForm.name.trim(),
                date: newEventForm.date,
                startTime: newEventForm.startTime,
                endTime: newEventForm.endTime,
                location: newEventForm.location.trim(),
                description: newEventForm.description.trim(),
                discipline: newEventForm.discipline,
                isQuickTurnaround: newEventForm.isQuickTurnaround,
                standardShotPackage: newEventForm.standardShotPackage,
                deadline: newEventForm.deadline,
                projectId: selectedProject.id,
                status: 'Scheduled'
            }
            
            const response = await fetch('http://localhost:5001/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            })
            
            if (response.ok) {
                const createdEvent = await response.json()
                
                // Create shot request if selected
                if (newEventForm.hasShotRequest) {
                    try {
                        const shotRequestData = {
                            shotDescription: shotRequestForm.shotDescription.trim(),
                            startTime: shotRequestForm.startTime,
                            endTime: shotRequestForm.endTime,
                            stakeholder: shotRequestForm.stakeholder.trim(),
                            quickTurn: shotRequestForm.quickTurn,
                            deadline: shotRequestForm.deadline,
                            keySponsor: shotRequestForm.keySponsor.trim(),
                            eventId: createdEvent.id
                        }
                        
                        const shotRequestResponse = await fetch('http://localhost:5001/shot-requests', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(shotRequestData)
                        })
                        
                        if (!shotRequestResponse.ok) {
                            const shotRequestError = await shotRequestResponse.json()
                            alert(`Event created but shot request failed: ${shotRequestError.error}`)
                        }
                    } catch (shotRequestError) {
                        console.error('Error creating shot request:', shotRequestError)
                        alert('Event created but shot request failed')
                    }
                }
                
                // Refresh events
                const eventsResponse = await fetch('http://localhost:5001/events')
                if (eventsResponse.ok) {
                    const eventsData = await eventsResponse.json()
                    setEvents(eventsData.events || eventsData)
                }
                
                // Reset forms
                setNewEventForm({
                    name: '',
                    date: selectedDate,
                    startTime: '',
                    endTime: '',
                    location: '',
                    description: '',
                    discipline: 'Photography',
                    isQuickTurnaround: false,
                    standardShotPackage: true,
                    deadline: '',
                    hasShotRequest: false
                })
                
                setShotRequestForm({
                    shotDescription: '',
                    startTime: '',
                    endTime: '',
                    stakeholder: '',
                    quickTurn: false,
                    deadline: '',
                    keySponsor: ''
                })
                
                alert('Event created successfully!')
            } else {
                const error = await response.json()
                alert(`Error creating event: ${error.error}`)
            }
        } catch (error) {
            console.error('Error creating event:', error)
            alert('Failed to create event')
        }
    }

    const renderOverviewTab = () => {
        const projectDateRange = getProjectDateRange()
        const eventsForSelectedDate = getEventsForDate(selectedDate)
        const filteredProjectEvents = getFilteredProjectEvents()
        
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
                        <h3>All Events</h3>
                        <div className='stat-number'>{selectedProject ? getProjectEvents().length : 0}</div>
                    </div>
                    <div className='stat-card'>
                        <h3>Events Today</h3>
                        <div className='stat-number'>{eventsForSelectedDate.length}</div>
                    </div>
                    <div className='stat-card'>
                        <h3>Upcoming</h3>
                        <div className='stat-number'>{selectedProject ? getUpcomingEventsWithinHour().length : 0}</div>
                    </div>
                    <div className='stat-card'>
                        <h3>Completed</h3>
                        <div className='stat-number'>{selectedProject ? getCompletedEvents().length : 0}</div>
                    </div>
                </div>
                
                <div className='overview-content'>
                    {/* Left Panel - Events for selected date */}
                    <div className='daily-events-panel'>
                        <div className='daily-events-header'>
                            <div className='daily-events-title-section'>
                                <h3>Events for {formatDate(selectedDate)}</h3>
                                {selectedProject && (
                                    <p className='daily-events-count'>
                                        {getFilteredEventsForToday(selectedDate).length} of {eventsForSelectedDate.length} events
                                    </p>
                                )}
                            </div>
                            <div className='daily-events-filter-section'>
                                <label className='filter-checkbox'>
                                    <input
                                        type='checkbox'
                                        checked={filterTodayQuickTurnaround}
                                        onChange={(e) => setFilterTodayQuickTurnaround(e.target.checked)}
                                    />
                                    <span className='filter-checkbox-label'>Quick Turnaround Only</span>
                                </label>
                            </div>
                        </div>
                        
                        {getFilteredEventsForToday(selectedDate).length > 0 ? (
                            <div className='events-grid'>
                                {getFilteredEventsForToday(selectedDate).map((event, index) => (
                                    <div key={event.id || index} className={`event-card ${getProcessPointColor(event.processPoint)}`} onClick={() => handleEventClick(event)}>
                                        <div className='event-card-header'>
                                            <h4>{event.name}</h4>
                                            <div className='event-indicators'>
                                                {event.isQuickTurnaround && (
                                                    <span className='quick-turnaround-indicator' title='Quick Turnaround'>
                                                    </span>
                                                )}
                                                <span className={`status-badge status-${getEventStatus(event).toLowerCase().replace(' ', '-')}`}>
                                                    {getEventStatus(event)}
                                                </span>
                                                {event.processPoint && (
                                                    <span className={`process-badge process-${event.processPoint.toLowerCase()}`}>
                                                        {event.processPoint}
                                                    </span>
                                                )}
                                            </div>
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
                                <p>
                                    {filterTodayQuickTurnaround 
                                        ? `No quick turnaround events scheduled for ${formatDate(selectedDate)}`
                                        : `No events scheduled for ${formatDate(selectedDate)}`
                                    }
                                </p>
                                {!selectedProject && (
                                    <p className='no-project-help'>Select a project to view events within its date range</p>
                                )}
                                {filterTodayQuickTurnaround && getEventsForDate(selectedDate).length > 0 && (
                                    <button 
                                        className='clear-filters-btn'
                                        onClick={() => setFilterTodayQuickTurnaround(false)}
                                    >
                                        Clear Filter
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Panel - All Project Events with Filters */}
                    <div className='project-events-panel'>
                        <div className='project-events-header'>
                            <h3>All Project Events</h3>
                            {selectedProject && (
                                <p className='project-events-count'>
                                    {filteredProjectEvents.length} of {getProjectEvents().length} events
                                </p>
                            )}
                        </div>
                        
                        {/* Filters */}
                        <div className='project-events-filters'>
                            <div className='filter-row'>
                                <label className='filter-checkbox'>
                                    <input
                                        type='checkbox'
                                        checked={filterQuickTurnaround}
                                        onChange={(e) => setFilterQuickTurnaround(e.target.checked)}
                                    />
                                    <span className='filter-checkbox-label'>Quick Turnaround Only</span>
                                </label>
                            </div>
                            <div className='filter-row'>
                                <label className='filter-dropdown-label'>Process Point:</label>
                                <select
                                    className='filter-dropdown'
                                    value={filterProcessPoint}
                                    onChange={(e) => setFilterProcessPoint(e.target.value)}
                                >
                                    <option value=''>All Process Points</option>
                                    <option value='idle'>Idle</option>
                                    <option value='ingest'>Ingest</option>
                                    <option value='cull'>Cull</option>
                                    <option value='color'>Color</option>
                                    <option value='delivered'>Delivered</option>
                                </select>
                                <label className='filter-dropdown-label'>Date:</label>
                                <select
                                    className='filter-dropdown'
                                    value={filterAllEventsDate}
                                    onChange={(e) => setFilterAllEventsDate(e.target.value)}
                                >
                                    <option value=''>All Dates</option>
                                    {getProjectEvents().map(event => event.date).filter((date, index, self) => self.indexOf(date) === index).sort().map(date => (
                                        <option key={date} value={date}>
                                            {formatDate(date)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Events List */}
                        <div className='project-events-list'>
                            {selectedProject ? (
                                filteredProjectEvents.length > 0 ? (
                                    filteredProjectEvents.map((event, index) => (
                                        <div key={event.id || index} className={`project-event-item ${getProcessPointColor(event.processPoint)}`} onClick={() => handleEventClick(event)}>
                                            <div className='project-event-content'>
                                                <div className='project-event-header'>
                                                    <h5 className='project-event-name'>{event.name}</h5>
                                                    <div className='project-event-indicators'>
                                                        {event.isQuickTurnaround && (
                                                            <span className='quick-turnaround-indicator' title='Quick Turnaround'>
                                                            </span>
                                                        )}
                                                        <span className={`status-badge status-${getEventStatus(event).toLowerCase().replace(' ', '-')}`}>
                                                            {getEventStatus(event)}
                                                        </span>
                                                        {event.processPoint && (
                                                            <span className={`process-badge process-${event.processPoint.toLowerCase()}`}>
                                                                {event.processPoint}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className='project-event-details'>
                                                    <p><strong>Date:</strong> {formatDate(event.date)}</p>
                                                    {event.startTime && event.endTime && (
                                                        <p><strong>Time:</strong> {event.startTime} - {event.endTime}</p>
                                                    )}
                                                    {event.location && (
                                                        <p><strong>Location:</strong> {event.location}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className='no-filtered-events'>
                                        <p>No events match the current filters.</p>
                                        <button 
                                            className='clear-filters-btn'
                                            onClick={() => {
                                                setFilterQuickTurnaround(false)
                                                setFilterProcessPoint('')
                                                setFilterAllEventsDate('')
                                            }}
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                )
                            ) : (
                                <div className='no-project-selected'>
                                    <p>Select a project to view all events</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const renderScheduleTab = () => {
        const eventsForSelectedDate = getEventsForDate(selectedDate)
        
        // Create hourly time slots from 6 AM to Midnight
        const hours = []
        for (let hour = 6; hour <= 24; hour++) {
            hours.push(hour)
        }
        
        // Convert time string to exact pixel position from top
        const timeToPixels = (timeStr) => {
            if (!timeStr) return 0
            const [hour, minute] = timeStr.split(':').map(Number)
            // Calculate exact position: each hour = 100px, each minute = 100/60 = 1.67px
            const hourOffset = (hour - 6) * 100  // Hours since 6 AM
            const minuteOffset = (minute / 60) * 100  // Minutes within the hour
            return Math.round(hourOffset + minuteOffset)
        }
        
        // Calculate position and height for events
        const processEvents = () => {
            return eventsForSelectedDate.map((event, index) => {
                const startPixels = timeToPixels(event.startTime)
                const endPixels = timeToPixels(event.endTime)
                const heightPixels = endPixels - startPixels
                
                return {
                    ...event,
                    topPosition: startPixels, // Exact pixel position from top
                    height: Math.max(30, heightPixels), // Minimum 30px visual height
                    column: index % 4 // Distribute across 4 columns
                }
            })
        }
        
        const processedEvents = processEvents()
        
        return (
            <div className='eventplanner-tab-content'>
                <h2>Event Schedule</h2>
                
                {/* Date Selector */}
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
                </div>
                
                {/* Timetable */}
                <div className='timetable-wrapper'>
                    <div className='timetable-header'>
                        <h3>Schedule for {formatDate(selectedDate)}</h3>
                    </div>
                    
                    <div className='timetable'>
                        {/* Time column */}
                        <div className='time-column'>
                            {hours.map(hour => (
                                <div key={hour} className='time-row'>
                                    <span className='time-label'>
                                        {hour === 24 ? '00:00' : hour.toString().padStart(2, '0') + ':00'}
                                    </span>
                                </div>
                            ))}
                        </div>
                        
                        {/* Events columns */}
                        <div className='events-grid'>
                            {/* Background time grid */}
                            <div className='time-grid'>
                                {hours.map(hour => (
                                    <div key={hour} className='time-grid-row' />
                                ))}
                            </div>
                            
                            {/* Event columns */}
                            {[0, 1, 2, 3].map(columnIndex => (
                                <div key={columnIndex} className='event-column'>
                                    {processedEvents
                                        .filter(event => event.column === columnIndex)
                                        .map(event => (
                                            <div
                                                key={event.id}
                                                className={`event-card ${getProcessPointColor(event.processPoint)}`}
                                                style={{
                                                    top: `${event.topPosition}px`,
                                                    height: `${event.height}px`
                                                }}
                                                onClick={() => handleEventClick(event)}
                                            >
                                                <div className='event-content'>
                                                    <h4 className='event-name'>{event.name}</h4>
                                                    <div className='event-time'>
                                                        {event.startTime} - {event.endTime}
                                                    </div>
                                                    <div className='event-status'>
                                                        {event.isQuickTurnaround && (
                                                            <span className='quick-turnaround-indicator' title='Quick Turnaround'>
                                                            </span>
                                                        )}
                                                        {event.processPoint && (
                                                            <span className={`process-badge process-${event.processPoint.toLowerCase()}`}>
                                                                {event.processPoint}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {event.location && (
                                                        <div className='event-location'>{event.location}</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {eventsForSelectedDate.length === 0 && (
                        <div className='no-events'>
                            <p>No events scheduled for this date</p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const renderDetailsTab = () => (
        <div className='eventplanner-tab-content'>
            <h2>Add New Event</h2>
            
            {selectedProject ? (
                <div className='new-event-form-container'>
                    <div className='form-header'>
                        <h3>Creating event for: <span className='project-name'>{selectedProject.name}</span></h3>
                        <p className='form-description'>Fill out the form below to add a new event to your project.</p>
                    </div>
                    
                    <form onSubmit={handleNewEventSubmit} className='new-event-form'>
                        <div className='form-grid'>
                            {/* Left Column */}
                            <div className='form-column'>
                                <div className='form-group'>
                                    <label className='form-label'>Event Name *</label>
                                    <input
                                        type='text'
                                        className='form-input'
                                        value={newEventForm.name}
                                        onChange={(e) => setNewEventForm({...newEventForm, name: e.target.value})}
                                        placeholder='Enter event name'
                                        required
                                    />
                                </div>
                                
                                <div className='form-group'>
                                    <label className='form-label'>Date *</label>
                                    <input
                                        type='date'
                                        className='form-input'
                                        value={newEventForm.date}
                                        onChange={(e) => setNewEventForm({...newEventForm, date: e.target.value})}
                                        min={getProjectDateRange().min}
                                        max={getProjectDateRange().max}
                                        required
                                    />
                                </div>
                                
                                <div className='form-row'>
                                    <div className='form-group'>
                                        <label className='form-label'>Start Time</label>
                                        <input
                                            type='time'
                                            className='form-input'
                                            value={newEventForm.startTime}
                                            onChange={(e) => setNewEventForm({...newEventForm, startTime: e.target.value})}
                                        />
                                    </div>
                                    <div className='form-group'>
                                        <label className='form-label'>End Time</label>
                                        <input
                                            type='time'
                                            className='form-input'
                                            value={newEventForm.endTime}
                                            onChange={(e) => setNewEventForm({...newEventForm, endTime: e.target.value})}
                                        />
                                    </div>
                                </div>
                                
                                <div className='form-group'>
                                    <label className='form-label'>Location</label>
                                    <input
                                        type='text'
                                        className='form-input'
                                        value={newEventForm.location}
                                        onChange={(e) => setNewEventForm({...newEventForm, location: e.target.value})}
                                        placeholder='Enter event location'
                                    />
                                </div>
                                
                                <div className='form-group'>
                                    <label className='form-label'>Discipline</label>
                                    <select
                                        className='form-select'
                                        value={newEventForm.discipline}
                                        onChange={(e) => setNewEventForm({...newEventForm, discipline: e.target.value})}
                                    >
                                        <option value='Photography'>Photography</option>
                                        <option value='Videography'>Videography</option>
                                        <option value='Both'>Both</option>
                                    </select>
                                </div>
                            </div>
                            
                            {/* Right Column */}
                            <div className='form-column'>
                                <div className='form-group'>
                                    <label className='form-label'>Description</label>
                                    <textarea
                                        className='form-textarea'
                                        value={newEventForm.description}
                                        onChange={(e) => setNewEventForm({...newEventForm, description: e.target.value})}
                                        placeholder='Enter event description'
                                        rows='4'
                                    />
                                </div>
                                
                                <div className='form-group'>
                                    <label className='form-label'>Deadline</label>
                                    <input
                                        type='text'
                                        className='form-input'
                                        value={newEventForm.deadline}
                                        onChange={(e) => setNewEventForm({...newEventForm, deadline: e.target.value})}
                                        placeholder='Enter deadline (e.g., "End of week", "2 days after event")'
                                    />
                                </div>
                                
                                <div className='form-group'>
                                    <label className='form-label'>Options</label>
                                    <div className='checkbox-group'>
                                        <label className='checkbox-label'>
                                            <input
                                                type='checkbox'
                                                checked={newEventForm.isQuickTurnaround}
                                                onChange={(e) => setNewEventForm({...newEventForm, isQuickTurnaround: e.target.checked})}
                                            />
                                            <span className='checkbox-text'>Quick Turnaround</span>
                                        </label>
                                        <label className='checkbox-label'>
                                            <input
                                                type='checkbox'
                                                checked={newEventForm.standardShotPackage}
                                                onChange={(e) => setNewEventForm({...newEventForm, standardShotPackage: e.target.checked})}
                                            />
                                            <span className='checkbox-text'>Standard Shot Package</span>
                                        </label>
                                        <label className='checkbox-label'>
                                            <input
                                                type='checkbox'
                                                checked={newEventForm.hasShotRequest}
                                                onChange={(e) => setNewEventForm({...newEventForm, hasShotRequest: e.target.checked})}
                                            />
                                            <span className='checkbox-text'>Add Shot Request</span>
                                        </label>
                                    </div>
                                    {newEventForm.hasShotRequest && (
                                        <button
                                            type='button'
                                            className='shot-request-details-btn'
                                            onClick={() => setShowShotRequestModal(true)}
                                        >
                                            Add Shot Request Details
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className='form-actions'>
                            <button type='submit' className='form-button form-button-primary'>
                                Create Event
                            </button>
                            <button 
                                type='button' 
                                className='form-button form-button-secondary'
                                onClick={() => {
                                    setNewEventForm({
                                        name: '',
                                        date: selectedDate,
                                        startTime: '',
                                        endTime: '',
                                        location: '',
                                        description: '',
                                        discipline: 'Photography',
                                        isQuickTurnaround: false,
                                        standardShotPackage: true,
                                        deadline: '',
                                        hasShotRequest: false
                                    })
                                    setShotRequestForm({
                                        shotDescription: '',
                                        startTime: '',
                                        endTime: '',
                                        stakeholder: '',
                                        quickTurn: false,
                                        deadline: '',
                                        keySponsor: ''
                                    })
                                    setShowShotRequestModal(false)
                                }}
                            >
                                Clear Form
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className='no-project-selected'>
                    <h3>No Project Selected</h3>
                    <p>Please select a project from the navigation before creating events.</p>
                </div>
            )}
            
            {/* Shot Request Modal */}
            {showShotRequestModal && (
                <div className='modal-overlay'>
                    <div className='modal-content shot-request-modal'>
                        <h2>Shot Request Details</h2>
                        <form onSubmit={(e) => {
                            e.preventDefault()
                            setShowShotRequestModal(false)
                        }} className='shot-request-form'>
                            <div className='shot-request-grid'>
                                <div className='form-group'>
                                    <label className='form-label'>Shot Description *</label>
                                    <textarea
                                        className='form-textarea'
                                        value={shotRequestForm.shotDescription}
                                        onChange={(e) => setShotRequestForm({...shotRequestForm, shotDescription: e.target.value})}
                                        placeholder='Describe the specific shots needed'
                                        rows='3'
                                        required
                                    />
                                </div>
                                
                                <div className='form-row'>
                                    <div className='form-group'>
                                        <label className='form-label'>Start Time</label>
                                        <input
                                            type='time'
                                            className='form-input'
                                            value={shotRequestForm.startTime}
                                            onChange={(e) => setShotRequestForm({...shotRequestForm, startTime: e.target.value})}
                                        />
                                    </div>
                                    <div className='form-group'>
                                        <label className='form-label'>End Time</label>
                                        <input
                                            type='time'
                                            className='form-input'
                                            value={shotRequestForm.endTime}
                                            onChange={(e) => setShotRequestForm({...shotRequestForm, endTime: e.target.value})}
                                        />
                                    </div>
                                </div>
                                
                                <div className='form-group'>
                                    <label className='form-label'>Stakeholder</label>
                                    <input
                                        type='text'
                                        className='form-input'
                                        value={shotRequestForm.stakeholder}
                                        onChange={(e) => setShotRequestForm({...shotRequestForm, stakeholder: e.target.value})}
                                        placeholder='Person requesting the shots'
                                    />
                                </div>
                                
                                <div className='form-group'>
                                    <label className='form-label'>Key Sponsor</label>
                                    <input
                                        type='text'
                                        className='form-input'
                                        value={shotRequestForm.keySponsor}
                                        onChange={(e) => setShotRequestForm({...shotRequestForm, keySponsor: e.target.value})}
                                        placeholder='Key sponsor or client'
                                    />
                                </div>
                                
                                <div className='form-group'>
                                    <label className='form-label'>Deadline</label>
                                    <input
                                        type='text'
                                        className='form-input'
                                        value={shotRequestForm.deadline}
                                        onChange={(e) => setShotRequestForm({...shotRequestForm, deadline: e.target.value})}
                                        placeholder='Enter shot deadline (e.g., "Next day", "Within 48 hours")'
                                    />
                                </div>
                                
                                <div className='form-group'>
                                    <label className='checkbox-label'>
                                        <input
                                            type='checkbox'
                                            checked={shotRequestForm.quickTurn}
                                            onChange={(e) => {
                                                const isChecked = e.target.checked
                                                setShotRequestForm({...shotRequestForm, quickTurn: isChecked})
                                                // Auto-enable event quick turnaround if shot request requires quick turn
                                                if (isChecked) {
                                                    setNewEventForm({...newEventForm, isQuickTurnaround: true})
                                                }
                                            }}
                                        />
                                        <span className='checkbox-text'>Quick Turn Required</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div className='modal-actions'>
                                <button type='submit' className='form-button form-button-primary'>
                                    Save Shot Request
                                </button>
                                <button 
                                    type='button' 
                                    className='form-button form-button-secondary'
                                    onClick={() => setShowShotRequestModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
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
                        Add Event
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
                        <div className='event-modal-actions'>
                            {!isEditingEvent && (
                                <button 
                                    className='edit-event-btn'
                                    onClick={startEditingEvent}
                                >
                                    Edit Event
                                </button>
                            )}
                            <button 
                                className='modal-close-btn'
                                onClick={() => {
                                    setShowEventModal(false)
                                    setEditingEvent(null)
                                    setIsEditingEvent(false)
                                }}
                            >
                                ×
                            </button>
                        </div>
                    </div>
                    
                    {!isEditingEvent ? (
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
                    ) : (
                        <form onSubmit={handleEventUpdate} className='edit-event-form'>
                            <div className='event-detail-section'>
                                <h3>Basic Information</h3>
                                <div className='form-grid'>
                                    <div className='form-group'>
                                        <label className='form-label'>Event Name *</label>
                                        <input
                                            type='text'
                                            className='form-input'
                                            value={editEventForm.name}
                                            onChange={(e) => setEditEventForm({...editEventForm, name: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className='form-group'>
                                        <label className='form-label'>Date *</label>
                                        <input
                                            type='date'
                                            className='form-input'
                                            value={editEventForm.date}
                                            onChange={(e) => setEditEventForm({...editEventForm, date: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className='form-group'>
                                        <label className='form-label'>Start Time</label>
                                        <input
                                            type='time'
                                            className='form-input'
                                            value={editEventForm.startTime}
                                            onChange={(e) => setEditEventForm({...editEventForm, startTime: e.target.value})}
                                        />
                                    </div>
                                    <div className='form-group'>
                                        <label className='form-label'>End Time</label>
                                        <input
                                            type='time'
                                            className='form-input'
                                            value={editEventForm.endTime}
                                            onChange={(e) => setEditEventForm({...editEventForm, endTime: e.target.value})}
                                        />
                                    </div>
                                    <div className='form-group'>
                                        <label className='form-label'>Location</label>
                                        <input
                                            type='text'
                                            className='form-input'
                                            value={editEventForm.location}
                                            onChange={(e) => setEditEventForm({...editEventForm, location: e.target.value})}
                                        />
                                    </div>
                                    <div className='form-group'>
                                        <label className='form-label'>Discipline</label>
                                        <select
                                            className='form-select'
                                            value={editEventForm.discipline}
                                            onChange={(e) => setEditEventForm({...editEventForm, discipline: e.target.value})}
                                        >
                                            <option value=''>Select Discipline</option>
                                            <option value='Photography'>Photography</option>
                                            <option value='Videography'>Videography</option>
                                            <option value='Both'>Both</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div className='event-detail-section'>
                                <h3>Additional Information</h3>
                                <div className='form-grid'>
                                    <div className='form-group'>
                                        <label className='form-label'>Description</label>
                                        <textarea
                                            className='form-textarea'
                                            value={editEventForm.description}
                                            onChange={(e) => setEditEventForm({...editEventForm, description: e.target.value})}
                                            rows={3}
                                        />
                                    </div>
                                    <div className='form-group'>
                                        <label className='form-label'>Deadline</label>
                                        <input
                                            type='date'
                                            className='form-input'
                                            value={editEventForm.deadline}
                                            onChange={(e) => setEditEventForm({...editEventForm, deadline: e.target.value})}
                                        />
                                    </div>
                                    <div className='form-group'>
                                        <label className='checkbox-label'>
                                            <input
                                                type='checkbox'
                                                checked={editEventForm.isQuickTurnaround}
                                                onChange={(e) => setEditEventForm({...editEventForm, isQuickTurnaround: e.target.checked})}
                                            />
                                            <span className='checkbox-text'>Quick Turnaround</span>
                                        </label>
                                    </div>
                                    <div className='form-group'>
                                        <label className='checkbox-label'>
                                            <input
                                                type='checkbox'
                                                checked={editEventForm.isCovered}
                                                onChange={(e) => setEditEventForm({...editEventForm, isCovered: e.target.checked})}
                                            />
                                            <span className='checkbox-text'>Covered</span>
                                        </label>
                                    </div>
                                    <div className='form-group'>
                                        <label className='checkbox-label'>
                                            <input
                                                type='checkbox'
                                                checked={editEventForm.standardShotPackage}
                                                onChange={(e) => setEditEventForm({...editEventForm, standardShotPackage: e.target.checked})}
                                            />
                                            <span className='checkbox-text'>Standard Shot Package</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div className='form-actions'>
                                <button type='submit' className='form-button form-button-primary'>Update Event</button>
                                <button type='button' className='form-button form-button-secondary' onClick={cancelEditingEvent}>Cancel</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        )}
        </>
    )
}

