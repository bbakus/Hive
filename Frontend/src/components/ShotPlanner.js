import { Nav } from "./Nav";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import '../styles/shotplanner.css'

export const ShotPlanner = ({liftUserId}) => {
    const { userId } = useParams()
    const [activeTab, setActiveTab] = useState('overview')
    const [shotRequests, setShotRequests] = useState([])
    const [events, setEvents] = useState([])
    const [currentUser, setCurrentUser] = useState(null)
    const [selectedProject, setSelectedProject] = useState(null)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [filterQuickTurnaround, setFilterQuickTurnaround] = useState(false)
    const [filterProcessPoint, setFilterProcessPoint] = useState('')
    const [filterDate, setFilterDate] = useState('')
    const [selectedDate, setSelectedDate] = useState(() => {
        // Get today's date in local timezone
        const today = new Date()
        const year = today.getFullYear()
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const day = String(today.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    })
    
    // Shot Request Form state
    const [shotRequestForm, setShotRequestForm] = useState({
        shotDescription: '',
        startTime: '',
        endTime: '',
        stakeholder: '',
        quickTurn: false,
        deadline: '',
        keySponsor: '',
        eventId: ''
    })
    const [eventSearchTerm, setEventSearchTerm] = useState('')
    const [showEventDropdown, setShowEventDropdown] = useState(false)
    
    // Shot Request Modal state
    const [showShotRequestModal, setShowShotRequestModal] = useState(false)
    const [selectedShotRequest, setSelectedShotRequest] = useState(null)
    const [updatingProcessPoint, setUpdatingProcessPoint] = useState(false)
    
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
                console.log('Selected project in ShotPlanner:', projectData)
            } catch (error) {
                console.error('Error parsing stored project in ShotPlanner:', error)
            }
        }
        
        // Listen for selected project changes
        const handleSelectedProjectChange = (event) => {
            console.log('Selected project changed in ShotPlanner:', event.detail)
            setSelectedProject(event.detail)
        }
        
        window.addEventListener('selectedProjectChanged', handleSelectedProjectChange)
        
        return () => {
            window.removeEventListener('selectedProjectChanged', handleSelectedProjectChange)
        }
    }, [])

    // Close event dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.event-search-container')) {
                setShowEventDropdown(false)
            }
        }
        
        if (showEventDropdown) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showEventDropdown])

    // Update current time every minute
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 60000) // Update every minute

        return () => clearInterval(timer)
    }, [])

    // Fetch shot requests
    useEffect(() => {
        console.log('Fetching shot requests...')
        fetch('http://localhost:5001/shot-requests')
        .then(res => res.json())
        .then(data => {
            console.log('Shot requests fetched:', data)
            setShotRequests(data)
        })
        .catch(err => console.error('Error fetching shot requests:', err))
    }, [])

    // Fetch events to get process points
    useEffect(() => {
        console.log('Fetching events for shot planner...')
        fetch('http://localhost:5001/events')
        .then(res => res.json())
        .then(data => {
            console.log('Events fetched for shot planner:', data)
            setEvents(data.events || data)
        })
        .catch(err => console.error('Error fetching events:', err))
    }, [])

    const handleTabChange = (tab) => {
        setActiveTab(tab)
    }

    // Get shot requests for the selected project
    const getProjectShotRequests = () => {
        if (!selectedProject) return []
        
        // Get all events for this project
        const projectEvents = events.filter(event => 
            String(event.projectId) === String(selectedProject.id)
        )
        
        // Get shot requests for those events
        return shotRequests.filter(shotRequest => 
            projectEvents.some(event => String(event.id) === String(shotRequest.eventId))
        )
    }

    // Get upcoming shot requests (starting within next 24 hours)
    const getUpcomingShotRequests = () => {
        const projectShotRequests = getProjectShotRequests()
        const now = currentTime
        const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        
        return projectShotRequests.filter(shotRequest => {
            // Find the associated event to get the date
            const associatedEvent = events.find(event => 
                String(event.id) === String(shotRequest.eventId)
            )
            
            if (!associatedEvent || !associatedEvent.date) return false
            
            // If shot request has specific start time, use that
            if (shotRequest.startTime) {
                // Create date object for shot request start time
                const [year, month, day] = associatedEvent.date.split('-').map(Number)
                const [startHour, startMinute] = shotRequest.startTime.split(':').map(Number)
                const shotStartTime = new Date(year, month - 1, day, startHour, startMinute, 0, 0)
                
                // Check if shot starts between now and 24 hours from now
                return shotStartTime > now && shotStartTime <= twentyFourHoursFromNow
            } else {
                // If no specific time, use the associated event's start time
                if (!associatedEvent.startTime) return false
                
                const [year, month, day] = associatedEvent.date.split('-').map(Number)
                const [startHour, startMinute] = associatedEvent.startTime.split(':').map(Number)
                const eventStartTime = new Date(year, month - 1, day, startHour, startMinute, 0, 0)
                
                // Check if event starts between now and 24 hours from now
                return eventStartTime > now && eventStartTime <= twentyFourHoursFromNow
            }
        })
    }

    // Get shot requests for a specific date
    const getShotRequestsForDate = (date) => {
        const projectShotRequests = getProjectShotRequests()
        
        return projectShotRequests.filter(shotRequest => {
            // Find the associated event to get the date
            const associatedEvent = events.find(event => 
                String(event.id) === String(shotRequest.eventId)
            )
            
            return associatedEvent && associatedEvent.date === date
        })
    }

    // Get quick turnaround shot requests
    const getQuickTurnaroundShotRequests = () => {
        const projectShotRequests = getProjectShotRequests()
        return projectShotRequests.filter(shotRequest => shotRequest.quickTurn)
    }

    // Get delivered shot requests (based on event process point)
    const getDeliveredShotRequests = () => {
        const projectShotRequests = getProjectShotRequests()
        
        return projectShotRequests.filter(shotRequest => {
            // Find the associated event to get the process point
            const associatedEvent = events.find(event => 
                String(event.id) === String(shotRequest.eventId)
            )
            
            return associatedEvent && associatedEvent.processPoint?.toLowerCase() === 'delivered'
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

    // Apply filters to project shot requests
    const getFilteredProjectShotRequests = () => {
        let filteredShotRequests = getProjectShotRequests()
        
        // Apply quick turnaround filter
        if (filterQuickTurnaround) {
            filteredShotRequests = filteredShotRequests.filter(shotRequest => shotRequest.quickTurn)
        }
        
        // Apply process point filter (based on associated event's process point)
        if (filterProcessPoint && filterProcessPoint !== '') {
            filteredShotRequests = filteredShotRequests.filter(shotRequest => {
                const associatedEvent = events.find(event => 
                    String(event.id) === String(shotRequest.eventId)
                )
                return associatedEvent?.processPoint?.toLowerCase() === filterProcessPoint.toLowerCase()
            })
        }
        
        // Apply date filter (based on associated event's date)
        if (filterDate && filterDate !== '') {
            filteredShotRequests = filteredShotRequests.filter(shotRequest => {
                const associatedEvent = events.find(event => 
                    String(event.id) === String(shotRequest.eventId)
                )
                return associatedEvent?.date === filterDate
            })
        }
        
        // Sort by start time descending (latest first), then by deadline
        return filteredShotRequests.sort((a, b) => {
            // First sort by start time if available (descending - latest first)
            if (a.startTime && b.startTime) {
                return b.startTime.localeCompare(a.startTime) // Reversed for descending
            }
            if (a.startTime && !b.startTime) return -1
            if (!a.startTime && b.startTime) return 1
            
            // Then sort by deadline if both have deadlines (ascending for urgency)
            if (a.deadline && b.deadline) {
                return a.deadline.localeCompare(b.deadline)
            }
            if (a.deadline && !b.deadline) return -1
            if (!a.deadline && b.deadline) return 1
            
            return 0
        })
    }

    // Get event details for a shot request
    const getEventForShotRequest = (shotRequest) => {
        return events.find(event => String(event.id) === String(shotRequest.eventId))
    }

    // Format date helper
    const formatDate = (dateString) => {
        if (!dateString) return 'No date'
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        })
    }

    // Get process point color class
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

    // Handle shot request card click
    const handleShotRequestClick = (shotRequest) => {
        setSelectedShotRequest(shotRequest)
        setShowShotRequestModal(true)
    }

    // Handle process point update for shot request
    const handleShotRequestProcessPointUpdate = async (newProcessPoint) => {
        if (!selectedShotRequest) return
        
        setUpdatingProcessPoint(true)
        try {
            const response = await fetch(`http://localhost:5001/shot-requests/${selectedShotRequest.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    processPoint: newProcessPoint
                })
            })
            
            if (response.ok) {
                const updatedShotRequest = await response.json()
                
                // Update the shot request in the local state
                setShotRequests(prevRequests => 
                    prevRequests.map(request => 
                        request.id === selectedShotRequest.id 
                            ? { ...request, processPoint: newProcessPoint }
                            : request
                    )
                )
                
                // Update the selected shot request
                setSelectedShotRequest(prev => ({ ...prev, processPoint: newProcessPoint }))
                
                console.log('Shot request process point updated successfully')
            } else {
                const error = await response.json()
                console.error('Error updating shot request process point:', error)
                alert(`Error updating process point: ${error.error}`)
            }
        } catch (error) {
            console.error('Error updating shot request process point:', error)
            alert('Failed to update process point')
        } finally {
            setUpdatingProcessPoint(false)
        }
    }

    // Filter events for search dropdown
    const getFilteredEvents = () => {
        if (!selectedProject) return []
        
        const projectEvents = events.filter(event => 
            String(event.projectId) === String(selectedProject.id)
        )
        
        if (!eventSearchTerm.trim()) return projectEvents
        
        return projectEvents.filter(event =>
            event.name?.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
            event.location?.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
            event.date?.includes(eventSearchTerm)
        )
    }

    // Handle shot request form submission
    const handleShotRequestSubmit = async (e) => {
        e.preventDefault()
        
        // Validate required fields
        if (!shotRequestForm.shotDescription?.trim()) {
            alert('Shot description is required.')
            return
        }
        
        if (!shotRequestForm.startTime) {
            alert('Start time is required.')
            return
        }
        
        if (!shotRequestForm.endTime) {
            alert('End time is required.')
            return
        }
        
        if (!shotRequestForm.stakeholder?.trim()) {
            alert('Stakeholder is required.')
            return
        }
        
        if (!shotRequestForm.eventId) {
            alert('Please select an event for this shot request.')
            return
        }
        
        try {
            const shotRequestData = {
                shotDescription: shotRequestForm.shotDescription.trim(),
                startTime: shotRequestForm.startTime,
                endTime: shotRequestForm.endTime,
                stakeholder: shotRequestForm.stakeholder.trim(),
                quickTurn: shotRequestForm.quickTurn,
                deadline: shotRequestForm.deadline.trim() || null,
                keySponsor: shotRequestForm.keySponsor.trim() || null,
                eventId: parseInt(shotRequestForm.eventId)
            }
            
            console.log('Submitting shot request:', shotRequestData)
            
            const response = await fetch('http://localhost:5001/shot-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(shotRequestData)
            })
            
            if (response.ok) {
                const newShotRequest = await response.json()
                console.log('Shot request created:', newShotRequest)
                
                // Refresh shot requests list
                const updatedShotRequestsResponse = await fetch('http://localhost:5001/shot-requests')
                if (updatedShotRequestsResponse.ok) {
                    const updatedShotRequests = await updatedShotRequestsResponse.json()
                    setShotRequests(updatedShotRequests)
                }
                
                // Reset form
                setShotRequestForm({
                    shotDescription: '',
                    startTime: '',
                    endTime: '',
                    stakeholder: '',
                    quickTurn: false,
                    deadline: '',
                    keySponsor: '',
                    eventId: ''
                })
                setEventSearchTerm('')
                
                alert('Shot request created successfully!')
            } else {
                const error = await response.json()
                alert(`Error creating shot request: ${error.error || 'Unknown error'}`)
            }
        } catch (error) {
            console.error('Error creating shot request:', error)
            alert('Failed to create shot request')
        }
    }

    // Handle event selection from dropdown
    const handleEventSelect = (event) => {
        setShotRequestForm({
            ...shotRequestForm,
            eventId: String(event.id)
        })
        setEventSearchTerm(`${event.name} - ${event.date} (${event.location || 'No location'})`)
        setShowEventDropdown(false)
    }

    const renderOverviewTab = () => {
        const upcomingShotRequests = getUpcomingShotRequests()
        const filteredProjectShotRequests = getFilteredProjectShotRequests()
        const projectDateRange = getProjectDateRange()
        const shotRequestsForDate = getShotRequestsForDate(selectedDate)
        const quickTurnaroundShots = getQuickTurnaroundShotRequests()
        const deliveredShots = getDeliveredShotRequests()
        
        return (
            <div className='shotplanner-tab-content'>
                <h2>Shot Request Overview</h2>
                
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
                        <label htmlFor='shot-date-selector'>Select Date:</label>
                        <input
                            id='shot-date-selector'
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
                
                {/* Statistics for shot requests */}
                <div className='overview-stats'>
                    <div className='stat-card'>
                        <h3>All Shot Requests</h3>
                        <div className='stat-number'>{selectedProject ? getProjectShotRequests().length : 0}</div>
                    </div>
                    <div className='stat-card'>
                        <h3>Today's Shots</h3>
                        <div className='stat-number'>{shotRequestsForDate.length}</div>
                    </div>
                    <div className='stat-card'>
                        <h3>Quick Turnarounds</h3>
                        <div className='stat-number'>{quickTurnaroundShots.length}</div>
                    </div>
                    <div className='stat-card'>
                        <h3>Delivered</h3>
                        <div className='stat-number'>{deliveredShots.length}</div>
                    </div>
                </div>
                
                <div className='overview-content'>
                    {/* Left Panel - Upcoming Shot Requests */}
                    <div className='upcoming-shots-panel'>
                        <h3>Upcoming Shot Requests</h3>
                        <p className='panel-description'>Shot requests starting in the next 24 hours</p>
                        
                        <div className='upcoming-shots-list'>
                            {selectedProject ? (
                                upcomingShotRequests.length > 0 ? (
                                    upcomingShotRequests.map((shotRequest, index) => {
                                        const associatedEvent = getEventForShotRequest(shotRequest)
                                        return (
                                            <div 
                                                key={shotRequest.id || index} 
                                                className={`shot-request-card ${getProcessPointColor(shotRequest.processPoint || associatedEvent?.processPoint)} clickable`}
                                                onClick={() => handleShotRequestClick(shotRequest)}
                                            >
                                                <div className='shot-request-content'>
                                                    <div className='shot-request-header'>
                                                        <h5 className='shot-description'>{shotRequest.shotDescription}</h5>
                                                        <div className='shot-request-indicators'>
                                                            {shotRequest.quickTurn && (
                                                                <span className='quick-turnaround-indicator' title='Quick Turnaround'>
                                                                </span>
                                                            )}
                                                            {(shotRequest.processPoint || associatedEvent?.processPoint) && (
                                                                <span className='process-badge'>
                                                                    {shotRequest.processPoint || associatedEvent.processPoint}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className='shot-request-details'>
                                                        {associatedEvent && (
                                                            <p><strong>Event:</strong> {associatedEvent.name}</p>
                                                        )}
                                                        {associatedEvent?.date && (
                                                            <p><strong>Date:</strong> {formatDate(associatedEvent.date)}</p>
                                                        )}
                                                        {shotRequest.startTime && shotRequest.endTime && (
                                                            <p><strong>Time:</strong> {shotRequest.startTime} - {shotRequest.endTime}</p>
                                                        )}
                                                        {shotRequest.stakeholder && (
                                                            <p><strong>Stakeholder:</strong> {shotRequest.stakeholder}</p>
                                                        )}
                                                        {shotRequest.deadline && (
                                                            <p><strong>Deadline:</strong> {shotRequest.deadline}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className='no-upcoming-shots'>
                                        <p>No shot requests starting in the next 24 hours.</p>
                                    </div>
                                )
                            ) : (
                                <div className='no-project-selected'>
                                    <p>Select a project to view upcoming shot requests</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - All Shot Requests with Filters */}
                    <div className='all-shots-panel'>
                        <div className='all-shots-header'>
                            <h3>All Shot Requests</h3>
                            {selectedProject && (
                                <p className='shot-requests-count'>
                                    {filteredProjectShotRequests.length} of {getProjectShotRequests().length} shot requests
                                </p>
                            )}
                        </div>
                        
                        {/* Filters */}
                        <div className='shot-requests-filters'>
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
                            </div>
                            <div className='filter-row'>
                                <label className='filter-dropdown-label'>Date:</label>
                                <input
                                    type='date'
                                    className='filter-date-input'
                                    value={filterDate}
                                    onChange={(e) => setFilterDate(e.target.value)}
                                    placeholder='Filter by date'
                                />
                            </div>
                        </div>

                        {/* Shot Requests List */}
                        <div className='all-shots-list'>
                            {selectedProject ? (
                                filteredProjectShotRequests.length > 0 ? (
                                    filteredProjectShotRequests.map((shotRequest, index) => {
                                        const associatedEvent = getEventForShotRequest(shotRequest)
                                        return (
                                            <div 
                                                key={shotRequest.id || index} 
                                                className={`shot-request-item ${getProcessPointColor(shotRequest.processPoint || associatedEvent?.processPoint)} clickable`}
                                                onClick={() => handleShotRequestClick(shotRequest)}
                                            >
                                                <div className='shot-request-content'>
                                                    <div className='shot-request-header'>
                                                        <h5 className='shot-description'>{shotRequest.shotDescription}</h5>
                                                        <div className='shot-request-indicators'>
                                                            {shotRequest.quickTurn && (
                                                                <span className='quick-turnaround-indicator' title='Quick Turnaround'>
                                                                </span>
                                                            )}
                                                            {(shotRequest.processPoint || associatedEvent?.processPoint) && (
                                                                <span className='process-badge'>
                                                                    {shotRequest.processPoint || associatedEvent.processPoint}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className='shot-request-details-minimal'>
                                                        {associatedEvent && (
                                                            <p><strong>Event:</strong> {associatedEvent.name}</p>
                                                        )}
                                                        {associatedEvent?.date && (
                                                            <p><strong>Date:</strong> {formatDate(associatedEvent.date)}</p>
                                                        )}
                                                        {shotRequest.startTime && shotRequest.endTime && (
                                                            <p><strong>Time:</strong> {shotRequest.startTime} - {shotRequest.endTime}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <div className='no-filtered-shots'>
                                        <p>No shot requests match the current filters.</p>
                                        <button 
                                            className='clear-filters-btn'
                                            onClick={() => {
                                                setFilterQuickTurnaround(false)
                                                setFilterProcessPoint('')
                                                setFilterDate('')
                                            }}
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                )
                            ) : (
                                <div className='no-project-selected'>
                                    <p>Select a project to view shot requests</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const renderShotRequestTab = () => {
        const filteredEvents = getFilteredEvents()
        
        return (
            <div className='shotplanner-tab-content'>
                <h2>Create Shot Request</h2>
                
                {!selectedProject ? (
                    <div className='no-project-selected'>
                        <p>Please select a project to create shot requests.</p>
                    </div>
                ) : (
                    <div className='shot-request-form-container'>
                        <div className='form-header'>
                            <h3 className='project-name'>{selectedProject.name}</h3>
                            <p className='form-description'>Create a new shot request for this project</p>
                        </div>
                        
                        <form className='shot-request-form' onSubmit={handleShotRequestSubmit}>
                            <div className='form-grid'>
                                {/* Left Column */}
                                <div className='form-column'>
                                    <div className='form-group'>
                                        <label className='form-label'>Shot Description *</label>
                                        <textarea
                                            className='form-textarea'
                                            value={shotRequestForm.shotDescription}
                                            onChange={(e) => setShotRequestForm({...shotRequestForm, shotDescription: e.target.value})}
                                            placeholder='Describe the shot(s) needed...'
                                            rows={3}
                                            required
                                        />
                                    </div>
                                    
                                    <div className='form-row'>
                                        <div className='form-group'>
                                            <label className='form-label'>Start Time *</label>
                                            <input
                                                className='form-input'
                                                type='time'
                                                value={shotRequestForm.startTime}
                                                onChange={(e) => setShotRequestForm({...shotRequestForm, startTime: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className='form-group'>
                                            <label className='form-label'>End Time *</label>
                                            <input
                                                className='form-input'
                                                type='time'
                                                value={shotRequestForm.endTime}
                                                onChange={(e) => setShotRequestForm({...shotRequestForm, endTime: e.target.value})}
                                                required
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className='form-group'>
                                        <label className='form-label'>Stakeholder *</label>
                                        <input
                                            className='form-input'
                                            type='text'
                                            value={shotRequestForm.stakeholder}
                                            onChange={(e) => setShotRequestForm({...shotRequestForm, stakeholder: e.target.value})}
                                            placeholder='Who is requesting this shot?'
                                            required
                                        />
                                    </div>
                                </div>
                                
                                {/* Right Column */}
                                <div className='form-column'>
                                    <div className='form-group'>
                                        <label className='form-label'>Select Event *</label>
                                        <div className='event-search-container'>
                                            <input
                                                className='form-input event-search-input'
                                                type='text'
                                                value={eventSearchTerm}
                                                onChange={(e) => {
                                                    setEventSearchTerm(e.target.value)
                                                    setShowEventDropdown(true)
                                                }}
                                                onFocus={() => setShowEventDropdown(true)}
                                                placeholder='Search for an event...'
                                                required
                                            />
                                            {showEventDropdown && filteredEvents.length > 0 && (
                                                <div className='event-dropdown'>
                                                    {filteredEvents.map(event => (
                                                        <div
                                                            key={event.id}
                                                            className='event-dropdown-item'
                                                            onClick={() => handleEventSelect(event)}
                                                        >
                                                            <div className='event-dropdown-name'>{event.name}</div>
                                                            <div className='event-dropdown-details'>
                                                                {formatDate(event.date)} • {event.location || 'No location'}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className='form-group'>
                                        <label className='form-label'>Key Sponsor</label>
                                        <input
                                            className='form-input'
                                            type='text'
                                            value={shotRequestForm.keySponsor}
                                            onChange={(e) => setShotRequestForm({...shotRequestForm, keySponsor: e.target.value})}
                                            placeholder='Key sponsor (optional)'
                                        />
                                    </div>
                                    
                                    <div className='form-group'>
                                        <label className='form-label'>Deadline</label>
                                        <input
                                            className='form-input'
                                            type='text'
                                            value={shotRequestForm.deadline}
                                            onChange={(e) => setShotRequestForm({...shotRequestForm, deadline: e.target.value})}
                                            placeholder='e.g., End of week, ASAP, etc.'
                                        />
                                    </div>
                                    
                                    <div className='checkbox-group'>
                                        <label className='checkbox-label'>
                                            <input
                                                type='checkbox'
                                                checked={shotRequestForm.quickTurn}
                                                onChange={(e) => setShotRequestForm({...shotRequestForm, quickTurn: e.target.checked})}
                                            />
                                            <span className='checkbox-text'>Quick Turn Required</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div className='form-actions'>
                                <button type='submit' className='form-button form-button-primary'>
                                    Create Shot Request
                                </button>
                                <button 
                                    type='button' 
                                    className='form-button form-button-secondary'
                                    onClick={() => {
                                        setShotRequestForm({
                                            shotDescription: '',
                                            startTime: '',
                                            endTime: '',
                                            stakeholder: '',
                                            quickTurn: false,
                                            deadline: '',
                                            keySponsor: '',
                                            eventId: ''
                                        })
                                        setEventSearchTerm('')
                                        setShowEventDropdown(false)
                                    }}
                                >
                                    Clear Form
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        )
    }

    return(
        <>
        <Nav/>
        <div className='content-area'>
            <div className='shotplanner-container'>
                <div className='shotplanner-header'>
                    
                    {selectedProject && (
                        <p className='selected-project'>Project: <strong>{selectedProject.name}</strong></p>
                    )}
                </div>
                
                <div className='shotplanner-tabs'>
                    <button 
                        className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => handleTabChange('overview')}
                    >
                        Overview
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'shot-request' ? 'active' : ''}`}
                        onClick={() => handleTabChange('shot-request')}
                    >
                        Shot Request
                    </button>
                </div>
                
                <div className='shotplanner-content'>
                    {activeTab === 'overview' && renderOverviewTab()}
                    {activeTab === 'shot-request' && renderShotRequestTab()}
                </div>
            </div>

            {/* Shot Request Details Modal */}
            {showShotRequestModal && selectedShotRequest && (
                <div className='modal-overlay'>
                    <div className='modal-content'>
                        <h2>Shot Request Details</h2>
                        <div className='shot-request-modal-content'>
                            <h3 className='modal-shot-description'>{selectedShotRequest.shotDescription}</h3>
                            
                            <div className='modal-details-sections'>
                                {/* Timing & Schedule Section */}
                                <div className='detail-section'>
                                    <div className='section-label'>Timing & Schedule</div>
                                    <div className='section-details'>
                                        <div className='detail-item'>
                                            <label><strong>Start Time:</strong></label>
                                            <span>{selectedShotRequest.startTime || 'Not specified'}</span>
                                        </div>
                                        
                                        <div className='detail-item'>
                                            <label><strong>End Time:</strong></label>
                                            <span>{selectedShotRequest.endTime || 'Not specified'}</span>
                                        </div>
                                        
                                        <div className='detail-item'>
                                            <label><strong>Deadline:</strong></label>
                                            <span>{selectedShotRequest.deadline || 'Not specified'}</span>
                                        </div>
                                        
                                        <div className='detail-item'>
                                            <label><strong>Quick Turnaround:</strong></label>
                                            <span className={selectedShotRequest.quickTurn ? 'quick-turn-yes' : 'quick-turn-no'}>
                                                {selectedShotRequest.quickTurn ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* People & Responsibilities Section */}
                                <div className='detail-section'>
                                    <div className='section-label'>People & Responsibilities</div>
                                    <div className='section-details'>
                                        <div className='detail-item'>
                                            <label><strong>Stakeholder:</strong></label>
                                            <span>{selectedShotRequest.stakeholder || 'Not specified'}</span>
                                        </div>
                                        
                                        <div className='detail-item'>
                                            <label><strong>Key Sponsor:</strong></label>
                                            <span>{selectedShotRequest.keySponsor || 'Not specified'}</span>
                                        </div>
                                        
                                        {selectedShotRequest.eventId && (
                                            <div className='detail-item'>
                                                <label><strong>Associated Event:</strong></label>
                                                <span>
                                                    {(() => {
                                                        const associatedEvent = events.find(e => String(e.id) === String(selectedShotRequest.eventId))
                                                        return associatedEvent ? associatedEvent.name : 'Event not found'
                                                    })()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Process & Status Section */}
                                <div className='detail-section'>
                                    <div className='section-label'>Process & Status</div>
                                    <div className='section-details'>
                                        <div className='detail-item'>
                                            <label><strong>Current Status:</strong></label>
                                            <div className='status-controls'>
                                                <select
                                                    value={selectedShotRequest.processPoint || 'idle'}
                                                    onChange={(e) => handleShotRequestProcessPointUpdate(e.target.value)}
                                                    disabled={updatingProcessPoint}
                                                    className='process-point-dropdown'
                                                >
                                                    <option value='idle'>Idle</option>
                                                    <option value='ingest'>Ingest</option>
                                                    <option value='cull'>Cull</option>
                                                    <option value='color'>Color</option>
                                                    <option value='delivered'>Delivered</option>
                                                </select>
                                                {updatingProcessPoint && (
                                                    <span className='updating-indicator'>Updating...</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className='modal-actions'>
                            <button 
                                className='modal-button modal-button-secondary' 
                                onClick={() => {
                                    setShowShotRequestModal(false)
                                    setSelectedShotRequest(null)
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    )
}