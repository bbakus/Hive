import { useParams } from "react-router-dom"
import { Nav } from "./Nav"
import { useState, useEffect } from "react"
import '../styles/home.css'

export const Settings = ({liftUserId}) => {

    const { userId } = useParams()
    const [projects, setProjects] = useState([])
    const [organizations, setOrganizations] = useState([])
    const [events, setEvents] = useState([])
    const [showProjectForm, setShowProjectForm] = useState(false)
    const [showEventForm, setShowEventForm] = useState(false)
    const [showOrganizationForm, setShowOrganizationForm] = useState(false)
    const [showEditOrganizationForm, setShowEditOrganizationForm] = useState(false)
    const [editingOrganization, setEditingOrganization] = useState(null)
    const [showDeleteProjectDialog, setShowDeleteProjectDialog] = useState(false)
    const [showDeleteEventDialog, setShowDeleteEventDialog] = useState(false)
    const [showDeleteOrganizationDialog, setShowDeleteOrganizationDialog] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    
    // Project form state
    const [projectForm, setProjectForm] = useState({
        name: '',
        client: '',
        organization_id: '',
        status: 'In Planning',
        description: '',
        start_date: '',
        end_date: '',
        location: ''
    })
    
    // Event form state
    const [eventForm, setEventForm] = useState({
        name: '',
        date: '',
        start_time: '',
        end_time: '',
        event_type: '',
        standard_shot_package: true,
        location: '',
        status: 'Scheduled',
        description: '',
        project_id: null,
        organization_id: null,
        discipline: 'Photography',
        is_quick_turnaround: false,
        is_covered: false,
        deadline: '',
        process_point: ''
    })
    
    // Organization form state
    const [organizationForm, setOrganizationForm] = useState({
        name: '',
        description: '',
        signup_code: ''
    })
    
    // Edit organization form state
    const [editOrganizationForm, setEditOrganizationForm] = useState({
        name: '',
        description: '',
        signup_code: ''
    })
    
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

    // Fetch organizations and set default
    useEffect(() => {
        fetch('http://localhost:5001/organizations')
        .then(res => res.json())
        .then(data => {
            console.log('Organizations fetched:', data)
            setOrganizations(data)
            // Set first organization as default if none selected
            if (data.length > 0 && !projectForm.organization_id) {
                setProjectForm(prev => ({ ...prev, organization_id: data[0].id }))
                setEventForm(prev => ({ ...prev, organization_id: data[0].id }))
            }
        })
        .catch(err => console.error('Error fetching organizations:', err))
    },[])

    // Handle project form submission
    const handleProjectSubmit = async (e) => {
        e.preventDefault()
        
        console.log('Form submission - Raw form data:', projectForm)
        
        // Validate required fields first
        if (!projectForm.name?.trim()) {
            alert('Project name is required.')
            return
        }
        
        // Check if organization_id exists and convert it properly
        const orgIdValue = projectForm.organization_id
        console.log('Organization ID value:', orgIdValue, 'Type:', typeof orgIdValue)
        
        if (!orgIdValue) {
            alert('Please select an organization.')
            return
        }
        
        // Convert to integer
        const orgId = parseInt(String(orgIdValue))
        if (isNaN(orgId)) {
            alert('Invalid organization selected.')
            return
        }
        
        console.log('FINAL organization ID being used:', orgId, 'Type:', typeof orgId)
        
        // Create clean data object with explicit conversions - BACKEND EXPECTS CAMELCASE
        const projectData = {
            name: projectForm.name.trim(),
            client: projectForm.client?.trim() || '',
            organizationId: orgId, // CAMELCASE FOR BACKEND
            status: projectForm.status || 'Planning',
            description: projectForm.description?.trim() || '',
            startDate: projectForm.start_date && projectForm.start_date.trim() !== '' ? projectForm.start_date : null,
            endDate: projectForm.end_date && projectForm.end_date.trim() !== '' ? projectForm.end_date : null,
            location: projectForm.location?.trim() || ''
        }
        
        console.log('Final project data being sent:', projectData)
        console.log('Organization ID type check:', typeof projectData.organizationId, projectData.organizationId)
        
        try {
            const response = await fetch('http://localhost:5001/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectData)
            })
            
            if (response.ok) {
                const newProject = await response.json()
                setProjects([...projects, newProject])
                setShowProjectForm(false)
                setProjectForm({
                    name: '',
                    client: '',
                    organization_id: projectForm.organization_id, // Keep the same organization
                    status: 'In Planning',
                    description: '',
                    start_date: '',
                    end_date: '',
                    location: ''
                })
                alert('Project created successfully!')
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error creating project:', error)
            alert('Failed to create project')
        }
    }

    // Handle event form submission
    const handleEventSubmit = async (e) => {
        e.preventDefault()
        try {
            // Convert form data to camelCase for backend
            const eventData = {
                name: eventForm.name,
                date: eventForm.date,
                startTime: eventForm.start_time,
                endTime: eventForm.end_time,
                eventType: eventForm.event_type,
                standardShotPackage: eventForm.standard_shot_package,
                location: eventForm.location,
                status: eventForm.status,
                description: eventForm.description,
                projectId: eventForm.project_id,
                organizationId: eventForm.organization_id,
                discipline: eventForm.discipline,
                isQuickTurnaround: eventForm.is_quick_turnaround,
                isCovered: eventForm.is_covered,
                deadline: eventForm.deadline,
                processPoint: eventForm.process_point
            }
            
            const response = await fetch('http://localhost:5001/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            })
            
            if (response.ok) {
                const newEvent = await response.json()
                // Refresh the events list instead of manually adding
                const eventsResponse = await fetch('http://localhost:5001/events')
                if (eventsResponse.ok) {
                    const eventsData = await eventsResponse.json()
                    setEvents(eventsData.events || eventsData)
                }
                setShowEventForm(false)
                setEventForm({
                    name: '',
                    date: '',
                    start_time: '',
                    end_time: '',
                    event_type: '',
                    standard_shot_package: true,
                    location: '',
                    status: 'Scheduled',
                    description: '',
                    project_id: null,
                    organization_id: eventForm.organization_id,
                    discipline: 'Photography',
                    is_quick_turnaround: false,
                    is_covered: false,
                    deadline: '',
                    process_point: ''
                })
                alert('Event created successfully!')
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error creating event:', error)
            alert('Failed to create event')
        }
    }

    // Handle organization form submission
    const handleOrganizationSubmit = async (e) => {
        e.preventDefault()
        
        console.log('Organization form submission:', organizationForm)
        
        // Validate required fields
        if (!organizationForm.name?.trim()) {
            alert('Organization name is required.')
            return
        }
        
        if (!organizationForm.signup_code?.trim()) {
            alert('Signup code is required.')
            return
        }
        
        try {
            const orgData = {
                name: organizationForm.name.trim(),
                description: organizationForm.description?.trim() || '',
                signupCode: organizationForm.signup_code.trim()
            }
            
            console.log('Submitting organization:', orgData)
            
            const response = await fetch('http://localhost:5001/organizations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orgData)
            })
            
            if (response.ok) {
                const newOrganization = await response.json()
                setOrganizations([...organizations, newOrganization])
                setShowOrganizationForm(false)
                setOrganizationForm({
                    name: '',
                    description: '',
                    signup_code: ''
                })
                
                // Dispatch event to refresh organizations in Nav
                window.dispatchEvent(new CustomEvent('refreshOrganizations'))
                
                alert('Organization created successfully!')
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error creating organization:', error)
            alert('Failed to create organization')
        }
    }

    // Handle edit organization form submission
    const handleEditOrganizationSubmit = async (e) => {
        e.preventDefault()
        
        if (!editingOrganization) return
        
        console.log('Edit organization form submission:', editOrganizationForm)
        
        // Validate required fields
        if (!editOrganizationForm.name?.trim()) {
            alert('Organization name is required.')
            return
        }
        
        if (!editOrganizationForm.signup_code?.trim()) {
            alert('Signup code is required.')
            return
        }
        
        try {
            const orgData = {
                name: editOrganizationForm.name.trim(),
                description: editOrganizationForm.description?.trim() || '',
                signupCode: editOrganizationForm.signup_code.trim()
            }
            
            console.log('Updating organization:', orgData)
            
            const response = await fetch(`http://localhost:5001/organizations/${editingOrganization.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orgData)
            })
            
            if (response.ok) {
                const updatedOrganization = await response.json()
                
                // Update the organizations list
                setOrganizations(organizations.map(org => 
                    org.id === editingOrganization.id ? updatedOrganization : org
                ))
                
                setShowEditOrganizationForm(false)
                setEditingOrganization(null)
                setEditOrganizationForm({
                    name: '',
                    description: '',
                    signup_code: ''
                })
                
                // Dispatch event to refresh organizations in Nav
                window.dispatchEvent(new CustomEvent('refreshOrganizations'))
                
                alert('Organization updated successfully!')
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error updating organization:', error)
            alert('Failed to update organization')
        }
    }

    // Open edit organization dialog
    const openEditOrganizationDialog = (organization) => {
        setEditingOrganization(organization)
        setEditOrganizationForm({
            name: organization.name || '',
            description: organization.description || '',
            signup_code: organization.signupCode || organization.signup_code || ''
        })
        setShowEditOrganizationForm(true)
    }

    // Delete functions
    const deleteProject = async (projectId) => {
        try {
            const response = await fetch(`http://localhost:5001/projects/${projectId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            
            if (response.ok) {
                setProjects(projects.filter(p => p.id !== projectId))
                alert('Project deleted successfully!')
            } else {
                const error = await response.json()
                alert(`Error deleting project: ${error.error}`)
            }
        } catch (error) {
            console.error('Error deleting project:', error)
            alert('Failed to delete project')
        }
    }

    const deleteEvent = async (eventId) => {
        try {
            const response = await fetch(`http://localhost:5001/events/${eventId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            
            if (response.ok) {
                setEvents(events.filter(e => e.id !== eventId))
                alert('Event deleted successfully!')
            } else {
                const error = await response.json()
                alert(`Error deleting event: ${error.error}`)
            }
        } catch (error) {
            console.error('Error deleting event:', error)
            alert('Failed to delete event')
        }
    }

    const deleteOrganization = async (organizationId) => {
        try {
            const response = await fetch(`http://localhost:5001/organizations/${organizationId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            
            if (response.ok) {
                setOrganizations(organizations.filter(o => o.id !== organizationId))
                // Dispatch event to refresh organizations in Nav
                window.dispatchEvent(new CustomEvent('refreshOrganizations'))
                alert('Organization deleted successfully!')
            } else {
                const error = await response.json()
                alert(`Error deleting organization: ${error.error}`)
            }
        } catch (error) {
            console.error('Error deleting organization:', error)
            alert('Failed to delete organization')
        }
    }

    return(
        <>
        <Nav/>
        <div className='content-area'>
            
            <div className='dashboard-grid'>
                <div className='dashboard-card'>
                    <h3>Quick Actions</h3>
                    <p style={{marginBottom: '1rem', color: '#b0b0b0'}}>Create and manage items in the system</p>
                    <div className='quick-actions'>
                        <button 
                            className='quick-action-btn'
                            onClick={() => setShowProjectForm(true)}
                        >
                            Add Project
                        </button>
                        <button 
                            className='quick-action-btn'
                            onClick={() => setShowEventForm(true)}
                        >
                            Add Event
                        </button>
                        <button 
                            className='quick-action-btn'
                            onClick={() => setShowOrganizationForm(true)}
                        >
                            Add Organization
                        </button>
                        <button 
                            className='quick-action-btn delete-btn'
                            onClick={() => setShowDeleteProjectDialog(true)}
                        >
                            Delete Project
                        </button>
                        <button 
                            className='quick-action-btn delete-btn'
                            onClick={() => setShowDeleteEventDialog(true)}
                        >
                            Delete Event
                        </button>
                        <button 
                            className='quick-action-btn delete-btn'
                            onClick={() => setShowDeleteOrganizationDialog(true)}
                        >
                            Delete Organization
                        </button>
                    </div>
                </div>
                
                <div className='dashboard-card'>
                    <h3>System Statistics</h3>
                    <div className='stats-container'>
                        <div className='stat-item'>
                            <div className='stat-number'>{organizations.length}</div>
                            <div className='stat-label'>Organizations</div>
                        </div>
                        <div className='stat-item'>
                            <div className='stat-number'>{projects.length}</div>
                            <div className='stat-label'>Projects</div>
                        </div>
                        <div className='stat-item'>
                            <div className='stat-number'>{events.length}</div>
                            <div className='stat-label'>Events</div>
                        </div>
                    </div>
                </div>
                
                <div className='dashboard-card'>
                    <h3>User Information</h3>
                    <p><strong>User ID:</strong> {userId}</p>
                    <p><strong>Name:</strong> {currentUser?.name || 'Loading...'}</p>
                    <p><strong>Email:</strong> {currentUser?.email || 'Loading...'}</p>
                    <p><strong>Organization:</strong> {currentUser?.organization?.name || 'Loading...'}</p>
                </div>
                
                <div className='dashboard-card'>
                    <h3>Organizations</h3>
                    <p style={{marginBottom: '1rem', color: '#b0b0b0'}}>Manage your organizations</p>
                    {organizations.length > 0 ? (
                        <div className='organizations-list'>
                            {organizations.map(org => (
                                <div key={org.id} className='organization-item'>
                                    <div className='organization-info'>
                                        <h4>{org.name}</h4>
                                        <p>{org.description || 'No description'}</p>
                                        <small>Signup Code: {org.signupCode || org.signup_code}</small>
                                    </div>
                                    <div className='organization-actions'>
                                        <button 
                                            className='edit-btn'
                                            onClick={() => openEditOrganizationDialog(org)}
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{color: '#b0b0b0', fontStyle: 'italic'}}>No organizations found. Create your first organization above.</p>
                    )}
                </div>
            </div>

            {/* Project Form Modal */}
            {showProjectForm && (
                <div className='modal-overlay'>
                    <div className='modal-content'>
                        <h2>Add New Project</h2>
                        <form onSubmit={handleProjectSubmit}>
                            <div className='form-group'>
                                <label>Project Name *</label>
                                <input
                                    type='text'
                                    value={projectForm.name}
                                    onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className='form-group'>
                                <label>Client</label>
                                <input
                                    type='text'
                                    value={projectForm.client}
                                    onChange={(e) => setProjectForm({...projectForm, client: e.target.value})}
                                />
                            </div>
                            <div className='form-group'>
                                <label>Organization *</label>
                                <select
                                    value={projectForm.organization_id || 1}
                                    onChange={(e) => {
                                        const selectedValue = parseInt(e.target.value) || 1
                                        console.log('ORG SELECTION:', selectedValue)
                                        setProjectForm({...projectForm, organization_id: selectedValue})
                                    }}
                                    required
                                >
                                    <option value=''>Select Organization ({organizations.length} available)</option>
                                    {organizations.map(org => (
                                        <option key={org.id} value={org.id}>{org.name} (ID: {org.id})</option>
                                    ))}
                                </select>
                            </div>
                            <div className='form-group'>
                                <label>Status</label>
                                <select
                                    value={projectForm.status}
                                    onChange={(e) => setProjectForm({...projectForm, status: e.target.value})}
                                >
                                    <option value='In Planning'>In Planning</option>
                                    <option value='Active'>Active</option>
                                    <option value='Completed'>Completed</option>
                                    <option value='On Hold'>On Hold</option>
                                </select>
                            </div>
                            <div className='form-group'>
                                <label>Description</label>
                                <textarea
                                    value={projectForm.description}
                                    onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                                />
                            </div>
                            <div className='form-row'>
                                <div className='form-group'>
                                    <label>Start Date</label>
                                    <input
                                        type='date'
                                        value={projectForm.start_date}
                                        onChange={(e) => setProjectForm({...projectForm, start_date: e.target.value})}
                                    />
                                </div>
                                <div className='form-group'>
                                    <label>End Date</label>
                                    <input
                                        type='date'
                                        value={projectForm.end_date}
                                        onChange={(e) => setProjectForm({...projectForm, end_date: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className='form-group'>
                                <label>Location</label>
                                <input
                                    type='text'
                                    value={projectForm.location}
                                    onChange={(e) => setProjectForm({...projectForm, location: e.target.value})}
                                />
                            </div>
                            <div className='form-actions'>
                                <button type='submit'>Create Project</button>
                                <button type='button' onClick={() => setShowProjectForm(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Event Form Modal */}
            {showEventForm && (
                <div className='modal-overlay'>
                    <div className='modal-content'>
                        <h2>Add New Event</h2>
                        <form onSubmit={handleEventSubmit}>
                            <div className='form-group'>
                                <label>Event Name *</label>
                                <input
                                    type='text'
                                    value={eventForm.name}
                                    onChange={(e) => setEventForm({...eventForm, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className='form-group'>
                                <label>Date *</label>
                                <input
                                    type='date'
                                    value={eventForm.date}
                                    onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                                    required
                                />
                            </div>
                            <div className='form-row'>
                                <div className='form-group'>
                                    <label>Start Time *</label>
                                    <input
                                        type='time'
                                        value={eventForm.start_time}
                                        onChange={(e) => setEventForm({...eventForm, start_time: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className='form-group'>
                                    <label>End Time *</label>
                                    <input
                                        type='time'
                                        value={eventForm.end_time}
                                        onChange={(e) => setEventForm({...eventForm, end_time: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                            <div className='form-group'>
                                <label>Event Type</label>
                                <input
                                    type='text'
                                    value={eventForm.event_type}
                                    onChange={(e) => setEventForm({...eventForm, event_type: e.target.value})}
                                />
                            </div>
                            <div className='form-group'>
                                <label>Location</label>
                                <input
                                    type='text'
                                    value={eventForm.location}
                                    onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                                />
                            </div>
                            <div className='form-group'>
                                <label>Project</label>
                                <select
                                    value={eventForm.project_id || ''}
                                    onChange={(e) => {
                                        const projId = e.target.value ? parseInt(e.target.value) : null
                                        console.log('Project selected:', e.target.value, 'Converted to:', projId)
                                        setEventForm({...eventForm, project_id: projId})
                                    }}
                                >
                                    <option value=''>No Project</option>
                                    {projects.map(project => (
                                        <option key={project.id} value={project.id}>{project.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className='form-group'>
                                <label>Organization *</label>
                                <select
                                    value={eventForm.organization_id || ''}
                                    onChange={(e) => {
                                        const orgId = e.target.value ? parseInt(e.target.value) : null
                                        console.log('Event organization selected:', e.target.value, 'Converted to:', orgId)
                                        setEventForm({...eventForm, organization_id: orgId})
                                    }}
                                    required
                                >
                                    <option value=''>Select Organization</option>
                                    {organizations.map(org => (
                                        <option key={org.id} value={org.id}>{org.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className='form-group'>
                                <label>Discipline</label>
                                <select
                                    value={eventForm.discipline}
                                    onChange={(e) => setEventForm({...eventForm, discipline: e.target.value})}
                                >
                                    <option value='Photography'>Photography</option>
                                    <option value='Videography'>Videography</option>
                                    <option value='Both'>Both</option>
                                </select>
                            </div>
                            <div className='form-group'>
                                <label>Description</label>
                                <textarea
                                    value={eventForm.description}
                                    onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                                />
                            </div>
                            <div className='form-group'>
                                <label>Deadline</label>
                                <input
                                    type='text'
                                    value={eventForm.deadline}
                                    onChange={(e) => setEventForm({...eventForm, deadline: e.target.value})}
                                    placeholder='e.g., 24 hours'
                                />
                            </div>
                            <div className='form-group'>
                                <label>Process Point</label>
                                <input
                                    type='text'
                                    value={eventForm.process_point}
                                    onChange={(e) => setEventForm({...eventForm, process_point: e.target.value})}
                                />
                            </div>
                            <div className='form-checkboxes'>
                                <label>
                                    <input
                                        type='checkbox'
                                        checked={eventForm.standard_shot_package}
                                        onChange={(e) => setEventForm({...eventForm, standard_shot_package: e.target.checked})}
                                    />
                                    Standard Shot Package
                                </label>
                                <label>
                                    <input
                                        type='checkbox'
                                        checked={eventForm.is_quick_turnaround}
                                        onChange={(e) => setEventForm({...eventForm, is_quick_turnaround: e.target.checked})}
                                    />
                                    Quick Turnaround
                                </label>
                                <label>
                                    <input
                                        type='checkbox'
                                        checked={eventForm.is_covered}
                                        onChange={(e) => setEventForm({...eventForm, is_covered: e.target.checked})}
                                    />
                                    Is Covered
                                </label>
                            </div>
                            <div className='form-actions'>
                                <button type='submit'>Create Event</button>
                                <button type='button' onClick={() => setShowEventForm(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Organization Form Modal */}
            {showOrganizationForm && (
                <div className='modal-overlay'>
                    <div className='modal-content'>
                        <h2>Add New Organization</h2>
                        <form onSubmit={handleOrganizationSubmit}>
                            <div className='form-group'>
                                <label>Organization Name *</label>
                                <input
                                    type='text'
                                    value={organizationForm.name}
                                    onChange={(e) => setOrganizationForm({...organizationForm, name: e.target.value})}
                                    required
                                    placeholder='Enter organization name'
                                />
                            </div>
                            <div className='form-group'>
                                <label>Description</label>
                                <textarea
                                    value={organizationForm.description}
                                    onChange={(e) => setOrganizationForm({...organizationForm, description: e.target.value})}
                                    placeholder='Optional description of the organization'
                                />
                            </div>
                            <div className='form-group'>
                                <label>Signup Code *</label>
                                <input
                                    type='text'
                                    value={organizationForm.signup_code}
                                    onChange={(e) => setOrganizationForm({...organizationForm, signup_code: e.target.value})}
                                    required
                                    placeholder='Unique code for user signup (e.g., ORG001)'
                                />
                                <small style={{color: '#b0b0b0', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block'}}>
                                    Users will need this code to sign up for this organization
                                </small>
                            </div>
                            <div className='form-actions'>
                                <button type='submit'>Create Organization</button>
                                <button type='button' onClick={() => setShowOrganizationForm(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Organization Form Modal */}
            {showEditOrganizationForm && editingOrganization && (
                <div className='modal-overlay'>
                    <div className='modal-content'>
                        <h2>Edit Organization</h2>
                        <form onSubmit={handleEditOrganizationSubmit}>
                            <div className='form-group'>
                                <label>Organization Name *</label>
                                <input
                                    type='text'
                                    value={editOrganizationForm.name}
                                    onChange={(e) => setEditOrganizationForm({...editOrganizationForm, name: e.target.value})}
                                    required
                                    placeholder='Enter organization name'
                                />
                            </div>
                            <div className='form-group'>
                                <label>Description</label>
                                <textarea
                                    value={editOrganizationForm.description}
                                    onChange={(e) => setEditOrganizationForm({...editOrganizationForm, description: e.target.value})}
                                    placeholder='Optional description of the organization'
                                />
                            </div>
                            <div className='form-group'>
                                <label>Signup Code *</label>
                                <input
                                    type='text'
                                    value={editOrganizationForm.signup_code}
                                    onChange={(e) => setEditOrganizationForm({...editOrganizationForm, signup_code: e.target.value})}
                                    required
                                    placeholder='Unique code for user signup (e.g., ORG001)'
                                />
                                <small style={{color: '#b0b0b0', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block'}}>
                                    Users will need this code to sign up for this organization
                                </small>
                            </div>
                            <div className='form-actions'>
                                <button type='submit'>Update Organization</button>
                                <button type='button' onClick={() => {
                                    setShowEditOrganizationForm(false)
                                    setEditingOrganization(null)
                                    setEditOrganizationForm({
                                        name: '',
                                        description: '',
                                        signup_code: ''
                                    })
                                }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Project Dialog */}
            {showDeleteProjectDialog && (
                <div className='modal-overlay'>
                    <div className='modal-content'>
                        <h2>Delete Project</h2>
                        <p style={{marginBottom: '1.5rem', color: '#b0b0b0'}}>Select a project to delete:</p>
                        {projects.length > 0 ? (
                            <div className='delete-list'>
                                {projects.map(project => (
                                    <div key={project.id} className='delete-item'>
                                        <div className='delete-item-info'>
                                            <h4>{project.name}</h4>
                                            <p>Status: {project.status}</p>
                                            <p>Client: {project.client || 'Not specified'}</p>
                                        </div>
                                        <button 
                                            className='delete-btn'
                                            onClick={() => {
                                                if (window.confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
                                                    deleteProject(project.id)
                                                    setShowDeleteProjectDialog(false)
                                                }
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{color: '#b0b0b0', fontStyle: 'italic'}}>No projects available to delete</p>
                        )}
                        <div className='form-actions'>
                            <button type='button' onClick={() => setShowDeleteProjectDialog(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Event Dialog */}
            {showDeleteEventDialog && (
                <div className='modal-overlay'>
                    <div className='modal-content'>
                        <h2>Delete Event</h2>
                        <p style={{marginBottom: '1.5rem', color: '#b0b0b0'}}>Select an event to delete:</p>
                        {events.length > 0 ? (
                            <div className='delete-list'>
                                {events.map(event => (
                                    <div key={event.id} className='delete-item'>
                                        <div className='delete-item-info'>
                                            <h4>{event.name}</h4>
                                            <p>Date: {new Date(event.date).toLocaleDateString()}</p>
                                            <p>Status: {event.status}</p>
                                            <p>Location: {event.location || 'Not specified'}</p>
                                        </div>
                                        <button 
                                            className='delete-btn'
                                            onClick={() => {
                                                if (window.confirm(`Are you sure you want to delete "${event.name}"? This action cannot be undone.`)) {
                                                    deleteEvent(event.id)
                                                    setShowDeleteEventDialog(false)
                                                }
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{color: '#b0b0b0', fontStyle: 'italic'}}>No events available to delete</p>
                        )}
                        <div className='form-actions'>
                            <button type='button' onClick={() => setShowDeleteEventDialog(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Organization Dialog */}
            {showDeleteOrganizationDialog && (
                <div className='modal-overlay'>
                    <div className='modal-content'>
                        <h2>Delete Organization</h2>
                        <p style={{marginBottom: '1.5rem', color: '#b0b0b0'}}>Select an organization to delete:</p>
                        {organizations.length > 0 ? (
                            <div className='delete-list'>
                                {organizations.map(org => (
                                    <div key={org.id} className='delete-item'>
                                        <div className='delete-item-info'>
                                            <h4>{org.name}</h4>
                                            <p>Description: {org.description || 'No description'}</p>
                                            <p>Signup Code: {org.signupCode || org.signup_code}</p>
                                        </div>
                                        <button 
                                            className='delete-btn'
                                            onClick={() => {
                                                if (window.confirm(`Are you sure you want to delete "${org.name}"? This action cannot be undone.`)) {
                                                    deleteOrganization(org.id)
                                                    setShowDeleteOrganizationDialog(false)
                                                }
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{color: '#b0b0b0', fontStyle: 'italic'}}>No organizations available to delete</p>
                        )}
                        <div className='form-actions'>
                            <button type='button' onClick={() => setShowDeleteOrganizationDialog(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    )

} 