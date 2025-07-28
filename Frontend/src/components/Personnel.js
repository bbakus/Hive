import { useParams } from "react-router-dom"
import { Nav } from "./Nav"
import { useState, useEffect } from "react"
import '../styles/home.css'
import '../styles/personnel.css'

export const Personnel = ({liftUserId}) => {

    const { userId } = useParams()
    const [personnel, setPersonnel] = useState([])
    const [projects, setProjects] = useState([])
    const [selectedProject, setSelectedProject] = useState(null)
    const [showAddPersonnelDialog, setShowAddPersonnelDialog] = useState(false)
    const [showPersonnelListDialog, setShowPersonnelListDialog] = useState(false)
    const [showEditPersonnelDialog, setShowEditPersonnelDialog] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    const [editingPersonnel, setEditingPersonnel] = useState(null)
    
    // Add Personnel form state
    const [personnelForm, setPersonnelForm] = useState({
        name: '',
        role: '',
        phone: '',
        email: '',
        projectId: ''
    })
    
    // Edit Personnel form state
    const [editPersonnelForm, setEditPersonnelForm] = useState({
        name: '',
        role: '',
        phone: '',
        email: '',
        projectId: '',
        projectRole: ''
    })
    
    // Get current user from localStorage 
    useEffect(() => {
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
            const user = JSON.parse(storedUser)
            console.log('Current user from localStorage:', user)
            setCurrentUser(user)
        }
        
        // Get selected project from localStorage
        const storedProject = localStorage.getItem('selectedProject')
        if (storedProject) {
            try {
                const projectData = JSON.parse(storedProject)
                setSelectedProject(projectData)
                console.log('Initial selected project in Personnel:', projectData)
            } catch (error) {
                console.error('Error parsing stored project in Personnel:', error)
            }
        }
        
        // Listen for selected project changes
        const handleSelectedProjectChange = (event) => {
            console.log('Selected project changed in Personnel:', event.detail)
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

    // Fetch personnel
    useEffect(() => {
        console.log('Fetching personnel...')
        fetch('http://localhost:5001/personnel')
        .then(res => res.json())
        .then(data => {
            console.log('Personnel fetched:', data)
            setPersonnel(data)
        })
        .catch(err => console.error('Error fetching personnel:', err))
    },[])

    // Fetch projects
    useEffect(() => {
        console.log('Fetching projects for personnel page...')
        fetch('http://localhost:5001/projects')
        .then(res => res.json())
        .then(data => {
            console.log('Projects fetched for personnel:', data)
            setProjects(data)
        })
        .catch(err => console.error('Error fetching projects:', err))
    },[])

    // Handle add personnel form submission
    const handleAddPersonnelSubmit = async (e) => {
        e.preventDefault()
        
        console.log('Personnel form submission:', personnelForm)
        
        // Validate required fields
        if (!personnelForm.name?.trim()) {
            alert('Name is required.')
            return
        }
        
        if (!personnelForm.role?.trim()) {
            alert('Role is required.')
            return
        }
        
        if (!personnelForm.phone?.trim()) {
            alert('Phone is required.')
            return
        }
        
        if (!personnelForm.email?.trim()) {
            alert('Email is required.')
            return
        }
        
        try {
            const personnelData = {
                name: personnelForm.name.trim(),
                role: personnelForm.role.trim(),
                phone: personnelForm.phone.trim(),
                email: personnelForm.email.trim()
            }
            
            const response = await fetch('http://localhost:5001/photographers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(personnelData)
            })
            
            if (response.ok) {
                const newPersonnel = await response.json()
                
                // If a project is selected for assignment, add personnel to that project
                if (personnelForm.projectId) {
                    try {
                        
                        // First, get the current project data to get existing keyPersonnel
                        const currentProjectResponse = await fetch(`http://localhost:5001/projects/${personnelForm.projectId}`)
                        if (currentProjectResponse.ok) {
                            const currentProject = await currentProjectResponse.json()
                            
                            const existingPersonnel = currentProject.keyPersonnel || []
                            
                            
                            // Add the new personnel to the existing list
                            const newPersonnelEntry = {
                                personnelId: String(newPersonnel.id), // Ensure it's a string
                                projectRole: personnelForm.role
                            }
                            
                            const updatedPersonnel = [
                                ...existingPersonnel,
                                newPersonnelEntry
                            ]
                            
                            
                            const projectAssignmentResponse = await fetch(`http://localhost:5001/projects/${personnelForm.projectId}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    keyPersonnel: updatedPersonnel
                                })
                            })
                                
                                // Force refresh the selected project data from backend
                                if (selectedProject && String(selectedProject.id) === String(personnelForm.projectId)) {
                                    
                                    const refreshResponse = await fetch(`http://localhost:5001/projects/${selectedProject.id}`)
                                    if (refreshResponse.ok) {
                                        const refreshedProject = await refreshResponse.json()
                                        console.log('Refreshed project data:', refreshedProject)
                                        setSelectedProject(refreshedProject)
                                        localStorage.setItem('selectedProject', JSON.stringify(refreshedProject))
                                        window.dispatchEvent(new CustomEvent('selectedProjectChanged', { 
                                            detail: refreshedProject 
                                        }))
                                    }
                                }
                            } else {
                                console.error('Personnel created but project assignment failed:')
                            }
                        
                        } catch (assignmentError) {
                            console.error('Error assigning personnel to project:', assignmentError)
                        }
                }
                
                // Refresh personnel list
                const updatedPersonnelResponse = await fetch('http://localhost:5001/personnel')
                const updatedPersonnel = await updatedPersonnelResponse.json()
                setPersonnel(updatedPersonnel)
                
                setShowAddPersonnelDialog(false)
                setPersonnelForm({
                    name: '',
                    role: '',
                    phone: '',
                    email: '',
                    projectId: ''
                })
                alert('Personnel created successfully!')
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error creating personnel:', error)
            alert('Failed to create personnel')
        }
    }

    // Refresh selected project data
    const refreshSelectedProject = async () => {
        if (!selectedProject) {
            console.log('No selected project to refresh')
            return
        }
        
        try {
            console.log('Refreshing project with ID:', selectedProject.id)
            const response = await fetch(`http://localhost:5001/projects/${selectedProject.id}`)
            if (response.ok) {
                const updatedProject = await response.json()
                console.log('Project data received from backend:', updatedProject)
                console.log('KeyPersonnel in updated project:', updatedProject.keyPersonnel)
                setSelectedProject(updatedProject)
                localStorage.setItem('selectedProject', JSON.stringify(updatedProject))
                console.log('Selected project refreshed and stored')
            } else {
                console.error('Failed to fetch project, status:', response.status)
            }
        } catch (error) {
            console.error('Error refreshing selected project:', error)
        }
    }

    // Get personnel assigned to selected project with full details
    const getProjectPersonnel = () => {
        console.log('Getting project personnel for:', selectedProject?.name)
        console.log('Selected project object:', selectedProject)
        if (!selectedProject) {
            console.log('No selected project')
            return []
        }
        if (!selectedProject.keyPersonnel) {
            console.log('No keyPersonnel in selected project')
            return []
        }
        console.log('KeyPersonnel found:', selectedProject.keyPersonnel)
        
        // Enhance project personnel with full details from the personnel list
        const enhancedPersonnel = selectedProject.keyPersonnel.map(projectPerson => {
            const fullPersonnelData = personnel.find(p => 
                String(p.id) === String(projectPerson.personnelId) || 
                String(p.personnelId) === String(projectPerson.personnelId)
            )
            
            return {
                ...projectPerson,
                email: fullPersonnelData?.email || projectPerson.email || 'Not available',
                phone: fullPersonnelData?.phone || projectPerson.phone || 'Not available'
            }
        })
        
        console.log('Enhanced project personnel:', enhancedPersonnel)
        return enhancedPersonnel
    }

    // Remove personnel from project
    const removePersonnelFromProject = async (personnelId) => {
        if (!selectedProject) return
        
        try {
            // Filter out the personnel to remove
            const updatedPersonnel = selectedProject.keyPersonnel.filter(
                person => person.personnelId !== personnelId
            )
            
            console.log('Removing personnel:', personnelId)
            console.log('Updated personnel list:', updatedPersonnel)
            
            const response = await fetch(`http://localhost:5001/projects/${selectedProject.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    keyPersonnel: updatedPersonnel
                })
            })
            
            if (response.ok) {
                // Refresh the project data
                await refreshSelectedProject()
                alert('Personnel removed from project successfully!')
            } else {
                const error = await response.json()
                alert(`Error removing personnel: ${error.error}`)
            }
        } catch (error) {
            console.error('Error removing personnel from project:', error)
            alert('Failed to remove personnel from project')
        }
    }

    // Delete personnel completely from database
    const deletePersonnel = async (personnelId) => {
        try {
            console.log('Deleting personnel with ID:', personnelId)
            
            const response = await fetch(`http://localhost:5001/personnel/${personnelId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            
            if (response.ok) {
                // Refresh personnel list
                const updatedPersonnelResponse = await fetch('http://localhost:5001/personnel')
                const updatedPersonnel = await updatedPersonnelResponse.json()
                setPersonnel(updatedPersonnel)
                
                // If this personnel was in the selected project, refresh project data
                if (selectedProject && selectedProject.keyPersonnel) {
                    const isInProject = selectedProject.keyPersonnel.some(p => p.personnelId === personnelId)
                    if (isInProject) {
                        await refreshSelectedProject()
                    }
                }
                
                alert('Personnel deleted successfully!')
            } else {
                const error = await response.json()
                alert(`Error deleting personnel: ${error.error}`)
            }
        } catch (error) {
            console.error('Error deleting personnel:', error)
            alert('Failed to delete personnel')
        }
    }

    // Edit personnel
    const editPersonnel = async (personnelId, updatedData) => {
        try {
            console.log('Editing personnel with ID:', personnelId, 'Data:', updatedData)
            
            const response = await fetch(`http://localhost:5001/personnel/${personnelId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            })
            
            if (response.ok) {
                // Refresh personnel list
                const updatedPersonnelResponse = await fetch('http://localhost:5001/personnel')
                const updatedPersonnel = await updatedPersonnelResponse.json()
                setPersonnel(updatedPersonnel)
                
                // If this personnel was in the selected project, refresh project data
                if (selectedProject && selectedProject.keyPersonnel) {
                    const isInProject = selectedProject.keyPersonnel.some(p => p.personnelId === personnelId)
                    if (isInProject) {
                        await refreshSelectedProject()
                    }
                }
                
                alert('Personnel updated successfully!')
                setShowEditPersonnelDialog(false)
                setEditingPersonnel(null)
                setEditPersonnelForm({
                    name: '',
                    role: '',
                    phone: '',
                    email: ''
                })
            } else {
                const error = await response.json()
                alert(`Error updating personnel: ${error.error}`)
            }
        } catch (error) {
            console.error('Error updating personnel:', error)
            alert('Failed to update personnel')
        }
    }

    // Handle edit personnel form submission
    const handleEditPersonnelSubmit = async (e) => {
        e.preventDefault()
        
        if (!editingPersonnel) return
        
        // Validate required fields
        if (!editPersonnelForm.name?.trim()) {
            alert('Name is required.')
            return
        }
        
        if (!editPersonnelForm.role?.trim()) {
            alert('Role is required.')
            return
        }
        
        if (!editPersonnelForm.phone?.trim()) {
            alert('Phone is required.')
            return
        }
        
        if (!editPersonnelForm.email?.trim()) {
            alert('Email is required.')
            return
        }
        
        // Validate project assignment if project is selected
        if (editPersonnelForm.projectId && !editPersonnelForm.projectRole?.trim()) {
            alert('Project role is required when assigning to a project.')
            return
        }
        
        const updatedData = {
            name: editPersonnelForm.name.trim(),
            role: editPersonnelForm.role.trim(),
            phone: editPersonnelForm.phone.trim(),
            email: editPersonnelForm.email.trim()
        }
        
        // Update personnel details first
        await editPersonnel(editingPersonnel.id, updatedData)
        
        // Handle project assignment if specified
        if (editPersonnelForm.projectId && editPersonnelForm.projectRole) {
            try {
                // Get the current project data
                const currentProjectResponse = await fetch(`http://localhost:5001/projects/${editPersonnelForm.projectId}`)
                if (currentProjectResponse.ok) {
                    const currentProject = await currentProjectResponse.json()
                    
                    const existingPersonnel = currentProject.keyPersonnel || []
                    
                    // Check if personnel is already assigned to this project
                    const existingIndex = existingPersonnel.findIndex(p => p.personnelId === String(editingPersonnel.id))
                    
                    if (existingIndex >= 0) {
                        // Update existing assignment
                        existingPersonnel[existingIndex].projectRole = editPersonnelForm.projectRole.trim()
                    } else {
                        // Add new assignment
                        const newPersonnelEntry = {
                            personnelId: String(editingPersonnel.id),
                            projectRole: editPersonnelForm.projectRole.trim()
                        }
                        existingPersonnel.push(newPersonnelEntry)
                    }
                    
                    // Update the project
                    const projectUpdateResponse = await fetch(`http://localhost:5001/projects/${editPersonnelForm.projectId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            keyPersonnel: existingPersonnel
                        })
                    })
                    
                    if (projectUpdateResponse.ok) {
                        // Refresh project data if it's the currently selected project
                        if (selectedProject && String(selectedProject.id) === String(editPersonnelForm.projectId)) {
                            await refreshSelectedProject()
                        }
                        alert('Personnel updated and project assignment completed successfully!')
                    } else {
                        const error = await projectUpdateResponse.json()
                        alert(`Personnel updated but project assignment failed: ${error.error}`)
                    }
                }
            } catch (error) {
                console.error('Error updating project assignment:', error)
                alert('Personnel updated but project assignment failed')
            }
        } else if (editPersonnelForm.projectId === '') {
            // If no project is selected, remove from current project if they were assigned
            if (selectedProject?.keyPersonnel?.some(p => p.personnelId === String(editingPersonnel.id))) {
                try {
                    await removePersonnelFromProject(String(editingPersonnel.id))
                    alert('Personnel updated and removed from current project successfully!')
                } catch (error) {
                    console.error('Error removing from project:', error)
                    alert('Personnel updated but failed to remove from project')
                }
            }
        }
    }

    // Open edit personnel dialog
    const openEditPersonnelDialog = (person) => {
        // Check if person is already assigned to current project
        const isInCurrentProject = selectedProject?.keyPersonnel?.some(p => p.personnelId === person.id) || false
        const currentProjectAssignment = selectedProject?.keyPersonnel?.find(p => p.personnelId === person.id)
        
        setEditingPersonnel(person)
        setEditPersonnelForm({
            name: person.name || '',
            role: person.role || '',
            phone: person.phone || '',
            email: person.email || '',
            projectId: isInCurrentProject ? selectedProject.id : '',
            projectRole: currentProjectAssignment?.projectRole || ''
        })
        setShowEditPersonnelDialog(true)
    }

    const projectPersonnel = getProjectPersonnel()

    // Get CSS class for role-based styling
    const getRoleClass = (role) => {
        if (!role) return ''
        const cleanRole = role.toLowerCase().replace(/\s+/g, '-')
        return `role-${cleanRole}`
    }

    return(
        <>
        <Nav/>
        <div className='content-area'>
            
            <div className='personnel-grid'>
                {/* Column 1: Personnel Actions */}
                <div className='dashboard-card'>
                    <h3>Personnel Actions</h3>
                    <p className='personnel-modal-header'>Manage your team members</p>
                    <div className='quick-actions'>
                        <button 
                            className='quick-action-btn'
                            onClick={() => setShowAddPersonnelDialog(true)}
                        >
                            Add Personnel
                        </button>
                        <button 
                            className='quick-action-btn'
                            onClick={() => {
                                console.log('Opening personnel list dialog for project:', selectedProject?.name)
                                console.log('Full selected project data:', selectedProject)
                                console.log('Project keyPersonnel:', selectedProject?.keyPersonnel)
                                setShowPersonnelListDialog(true)
                            }}
                            disabled={!selectedProject}
                        >
                            View Project Team
                        </button>
                    </div>
                </div>
                
                {/* Column 2: Project Statistics */}
                <div className='dashboard-card'>
                    <h3>Project Statistics</h3>
                    {selectedProject ? (
                        <div className='stats-container'>
                            <div className='stat-item'>
                                <div className='stat-number'>{projectPersonnel.length}</div>
                                <div className='stat-label'>Team Members</div>
                            </div>
                            <div className='stat-item'>
                                <div className='stat-number'>{projectPersonnel.filter(p => 
                                    p.role?.toLowerCase().includes('photographer') || 
                                    p.projectRole?.toLowerCase().includes('photographer')
                                ).length}</div>
                                <div className='stat-label'>Photographers</div>
                            </div>
                            <div className='stat-item'>
                                <div className='stat-number'>{personnel.length}</div>
                                <div className='stat-label'>Total Available</div>
                            </div>
                        </div>
                    ) : (
                        <div className='project-statistics'>
                            <p>Select a project to view statistics</p>
                        </div>
                    )}
                </div>
                
                {/* Column 3: Project Team Members */}
                <div className='dashboard-card personnel-container-card'>
                    <h3>Project Team Members</h3>
                    {selectedProject ? (
                        <div className='personnel-container-content'>
                            <h4 className='personnel-modal-title'>{selectedProject.name}</h4>
                            <div className='scrollable-area'>
                                {projectPersonnel.length > 0 ? (
                                    projectPersonnel.map((person, index) => (
                                        <div key={person.personnelId || index} className={`personnel-card ${getRoleClass(person.projectRole || person.role)}`}>
                                            <div className='personnel-card-content'>
                                                <div className='personnel-card-info'>
                                                    <h5 className='personnel-name'>{person.name}</h5>
                                                    <p className={`personnel-project-role ${getRoleClass(person.projectRole)}`}><strong>Project Role:</strong> {person.projectRole}</p>
                                                    <div className='personnel-details'>
                                                        <p className='personnel-detail-item'><strong>Email:</strong> {person.email || 'Not available'}</p>
                                                        <p className='personnel-detail-item'><strong>Phone:</strong> {person.phone || 'Not available'}</p>
                                                        <p className='personnel-id'><strong>Personnel ID:</strong> {person.personnelId}</p>
                                                    </div>
                                                </div>
                                                <div className='personnel-card-actions'>
                                                    <button 
                                                        className='remove-button remove-from-project'
                                                        onClick={() => {
                                                            if (window.confirm(`Are you sure you want to remove ${person.name} from this project?`)) {
                                                                removePersonnelFromProject(person.personnelId)
                                                            }
                                                        }}
                                                        title="Remove from project only"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className='empty-state'>
                                        <p className='empty-state-title'>No personnel assigned to this project yet.</p>
                                        <p className='empty-state-subtitle'>Use "Add Personnel" to add team members to this project.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className='empty-state'>
                            <p className='empty-state-title'>No project selected</p>
                            <p className='empty-state-subtitle'>Select a project from the navigation to view its team members.</p>
                        </div>
                    )}
                </div>
                
                {/* Column 4: All Personnel */}
                <div className='dashboard-card all-personnel-card'>
                    <h3>All Personnel</h3>
                    <div className='personnel-container-content'>
                        <p className='personnel-modal-header'>Complete team directory</p>
                        <div className='scrollable-area'>
                            {personnel.length > 0 ? (
                                personnel.map((person, index) => {
                                    const isInProject = selectedProject?.keyPersonnel?.some(p => p.personnelId === person.id) || false
                                    return (
                                        <div key={person.id || index} className={`personnel-card ${getRoleClass(person.role)} ${isInProject ? 'in-project' : ''}`}>
                                            <div className='personnel-card-content'>
                                                <div className='personnel-card-info'>
                                                    <h5 className='personnel-name'>{person.name}</h5>
                                                    <p className={`personnel-role ${getRoleClass(person.role)}`}><strong>Role:</strong> {person.role}</p>
                                                    {isInProject && selectedProject && (
                                                        <p className='personnel-project-assignment'>
                                                            <strong>Assigned to:</strong> {selectedProject.name}
                                                        </p>
                                                    )}
                                                    <div className='personnel-details'>
                                                        <p className='personnel-detail-item'><strong>Email:</strong> {person.email || 'Not available'}</p>
                                                        <p className='personnel-detail-item'><strong>Phone:</strong> {person.phone || 'Not available'}</p>
                                                        <p className='personnel-id'><strong>Personnel ID:</strong> {person.id}</p>
                                                    </div>
                                                </div>
                                                <div className='personnel-card-actions'>
                                                    <button 
                                                        className='action-button edit-personnel'
                                                        onClick={() => openEditPersonnelDialog(person)}
                                                        title="Edit personnel details"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        className='remove-button delete-personnel'
                                                        onClick={() => {
                                                            if (window.confirm(`Are you sure you want to completely delete ${person.name} from the system? This action cannot be undone.`)) {
                                                                deletePersonnel(person.id)
                                                            }
                                                        }}
                                                        title="Delete personnel completely"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className='empty-state'>
                                    <p className='empty-state-title'>No personnel found</p>
                                    <p className='empty-state-subtitle'>Use "Add Personnel" to create your first team member.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Personnel Dialog */}
            {showAddPersonnelDialog && (
                <div className='modal-overlay'>
                    <div className='modal-content'>
                        <h2>Add New Personnel</h2>
                        <form onSubmit={handleAddPersonnelSubmit}>
                            <div className='personnel-form-group'>
                                <label className='personnel-form-label'>Name *</label>
                                <input
                                    className='personnel-form-input'
                                    type='text'
                                    value={personnelForm.name}
                                    onChange={(e) => setPersonnelForm({...personnelForm, name: e.target.value})}
                                    required
                                    placeholder='Enter full name'
                                />
                            </div>
                            <div className='personnel-form-group'>
                                <label className='personnel-form-label'>Role *</label>
                                <select
                                    className='personnel-form-select'
                                    value={personnelForm.role}
                                    onChange={(e) => setPersonnelForm({...personnelForm, role: e.target.value})}
                                    required
                                >
                                    <option value=''>Select Role</option>
                                    <option value='photographer'>Photographer</option>
                                    <option value='videographer'>Videographer</option>
                                    <option value='editor'>Editor</option>
                                    <option value='assistant'>Assistant</option>
                                    <option value='coordinator'>Coordinator</option>
                                    <option value='manager'>Manager</option>
                                    <option value='colorist'>Colorist</option>
                                </select>
                            </div>
                            <div className='personnel-form-group'>
                                <label className='personnel-form-label'>Phone *</label>
                                <input
                                    className='personnel-form-input'
                                    type='tel'
                                    value={personnelForm.phone}
                                    onChange={(e) => setPersonnelForm({...personnelForm, phone: e.target.value})}
                                    required
                                    placeholder='(555) 123-4567'
                                />
                            </div>
                            <div className='personnel-form-group'>
                                <label className='personnel-form-label'>Email *</label>
                                <input
                                    className='personnel-form-input'
                                    type='email'
                                    value={personnelForm.email}
                                    onChange={(e) => setPersonnelForm({...personnelForm, email: e.target.value})}
                                    required
                                    placeholder='email@example.com'
                                />
                            </div>
                            <div className='personnel-form-group'>
                                <label className='personnel-form-label'>Assign to Project (Optional)</label>
                                <select
                                    className='personnel-form-select'
                                    value={personnelForm.projectId}
                                    onChange={(e) => setPersonnelForm({...personnelForm, projectId: e.target.value})}
                                >
                                    <option value=''>No Project Assignment</option>
                                    {projects.map(project => (
                                        <option key={project.id} value={project.id}>
                                            {project.name} ({project.status})
                                        </option>
                                    ))}
                                </select>
                                <small className='personnel-form-help'>
                                    Optionally assign this person to a project with their specified role
                                </small>
                            </div>
                            <div className='personnel-form-actions'>
                                <button className='personnel-form-button personnel-form-button-primary' type='submit'>Add Personnel</button>
                                <button className='personnel-form-button personnel-form-button-secondary' type='button' onClick={() => setShowAddPersonnelDialog(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Personnel List Dialog */}
            {showPersonnelListDialog && (
                <div className='modal-overlay'>
                    <div className='modal-content personnel-modal-content'>
                        <h2>Project Team Members</h2>
                        {selectedProject ? (
                            <div>
                                <h3 className='personnel-modal-title'>{selectedProject.name}</h3>
                                <p className='personnel-modal-header'>
                                    Team members assigned to this project
                                </p>
                                {projectPersonnel.length > 0 ? (
                                    <div className='scrollable-area'>
                                        <p className='team-member-count'>
                                            Found {projectPersonnel.length} team member{projectPersonnel.length !== 1 ? 's' : ''}
                                        </p>
                                        {projectPersonnel.map((person, index) => (
                                            <div key={person.personnelId || index} className={`personnel-card ${getRoleClass(person.projectRole || person.role)}`}>
                                                <div className='personnel-card-content'>
                                                    <div className='personnel-card-info'>
                                                        <h4 className='personnel-name'>{person.name}</h4>
                                                        <p className={`personnel-detail-item ${getRoleClass(person.projectRole)}`}><strong>Project Role:</strong> {person.projectRole}</p>
                                                        <p className='personnel-detail-item'><strong>Primary Role:</strong> {person.role}</p>
                                                        <p className='personnel-id'>ID: {person.personnelId}</p>
                                                    </div>
                                                    <div className='personnel-card-actions'>
                                                        <button 
                                                            className='remove-button remove-from-project'
                                                            onClick={() => {
                                                                if (window.confirm(`Are you sure you want to remove ${person.name} from this project?`)) {
                                                                    removePersonnelFromProject(person.personnelId)
                                                                }
                                                            }}
                                                            title="Remove from project only"
                                                        >
                                                            Remove from Project
                                                        </button>
                                                        <button 
                                                            className='remove-button delete-personnel'
                                                            onClick={() => {
                                                                if (window.confirm(`Are you sure you want to completely delete ${person.name} from the system? This action cannot be undone.`)) {
                                                                    deletePersonnel(person.personnelId)
                                                                }
                                                            }}
                                                            title="Delete personnel completely"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className='empty-state'>
                                        <p className='empty-state-title'>No personnel assigned to this project yet.</p>
                                        <p className='empty-state-subtitle'>Use "Add Personnel" to add team members to this project.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p>No project selected.</p>
                        )}
                        <div className='personnel-modal-actions'>
                            <button className='personnel-form-button personnel-form-button-secondary' type='button' onClick={() => setShowPersonnelListDialog(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Personnel Dialog */}
            {showEditPersonnelDialog && editingPersonnel && (
                <div className='modal-overlay'>
                    <div className='modal-content'>
                        <h2>Edit Personnel</h2>
                        <form onSubmit={handleEditPersonnelSubmit}>
                            <div className='personnel-form-group'>
                                <label className='personnel-form-label'>Name *</label>
                                <input
                                    className='personnel-form-input'
                                    type='text'
                                    value={editPersonnelForm.name}
                                    onChange={(e) => setEditPersonnelForm({...editPersonnelForm, name: e.target.value})}
                                    required
                                    placeholder='Enter full name'
                                />
                            </div>
                            <div className='personnel-form-group'>
                                <label className='personnel-form-label'>Role *</label>
                                <select
                                    className='personnel-form-select'
                                    value={editPersonnelForm.role}
                                    onChange={(e) => setEditPersonnelForm({...editPersonnelForm, role: e.target.value})}
                                    required
                                >
                                    <option value=''>Select Role</option>
                                    <option value='photographer'>Photographer</option>
                                    <option value='videographer'>Videographer</option>
                                    <option value='editor'>Editor</option>
                                    <option value='assistant'>Assistant</option>
                                    <option value='coordinator'>Coordinator</option>
                                    <option value='manager'>Manager</option>
                                    <option value='colorist'>Colorist</option>
                                </select>
                            </div>
                            <div className='personnel-form-group'>
                                <label className='personnel-form-label'>Phone *</label>
                                <input
                                    className='personnel-form-input'
                                    type='tel'
                                    value={editPersonnelForm.phone}
                                    onChange={(e) => setEditPersonnelForm({...editPersonnelForm, phone: e.target.value})}
                                    required
                                    placeholder='(555) 123-4567'
                                />
                            </div>
                            <div className='personnel-form-group'>
                                <label className='personnel-form-label'>Email *</label>
                                <input
                                    className='personnel-form-input'
                                    type='email'
                                    value={editPersonnelForm.email}
                                    onChange={(e) => setEditPersonnelForm({...editPersonnelForm, email: e.target.value})}
                                    required
                                    placeholder='email@example.com'
                                />
                            </div>
                            <div className='personnel-form-group'>
                                <label className='personnel-form-label'>Assign to Project (Optional)</label>
                                <select
                                    className='personnel-form-select'
                                    value={editPersonnelForm.projectId}
                                    onChange={(e) => setEditPersonnelForm({...editPersonnelForm, projectId: e.target.value})}
                                >
                                    <option value=''>No Project Assignment</option>
                                    {projects.map(project => (
                                        <option key={project.id} value={project.id}>
                                            {project.name} ({project.status})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {editPersonnelForm.projectId && (
                                <div className='personnel-form-group'>
                                    <label className='personnel-form-label'>Project Role *</label>
                                    <select
                                        className='personnel-form-select'
                                        value={editPersonnelForm.projectRole}
                                        onChange={(e) => setEditPersonnelForm({...editPersonnelForm, projectRole: e.target.value})}
                                        required
                                    >
                                        <option value=''>Select Project Role</option>
                                        <option value='photographer'>Photographer</option>
                                        <option value='videographer'>Videographer</option>
                                        <option value='editor'>Editor</option>
                                        <option value='assistant'>Assistant</option>
                                        <option value='coordinator'>Coordinator</option>
                                        <option value='manager'>Manager</option>
                                        <option value='colorist'>Colorist</option>
                                    </select>
                                    <small className='personnel-form-help'>
                                        Role for this specific project
                                    </small>
                                </div>
                            )}
                            <div className='personnel-form-actions'>
                                <button className='personnel-form-button personnel-form-button-primary' type='submit'>Update Personnel</button>
                                <button className='personnel-form-button personnel-form-button-secondary' type='button' onClick={() => {
                                    setShowEditPersonnelDialog(false)
                                    setEditingPersonnel(null)
                                    setEditPersonnelForm({
                                        name: '',
                                        role: '',
                                        phone: '',
                                        email: '',
                                        projectId: '',
                                        projectRole: ''
                                    })
                                }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
        </>
    )

}
