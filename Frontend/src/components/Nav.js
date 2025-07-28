import { useParams, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import '../styles/nav.css'
import '../styles/home.css'



export const Nav = () => {

    const navigate = useNavigate();
    const { userId } = useParams();
    const location = useLocation();
    
    const [projects, setProjects] = useState([])
    const [organizations, setOrganizations] = useState([])
    const [selectedOrganization, setSelectedOrganization] = useState('')
    const [selectedProject, setSelectedProject] = useState('')

    // Get current page for active tab styling
    const currentPage = location.pathname.split('/').pop() || 'home'
    
    // Get current sidebar page for active styling
    const currentSidebarPage = location.pathname.split('/').pop() || 'home'

    useEffect(() => {
        fetch('http://localhost:5001/projects')
        .then(res => res.json())
        .then(data => {
            console.log('Projects fetched for nav:', data)
            setProjects(data)
            
            // Try to restore selected project from localStorage
            const storedProject = localStorage.getItem('selectedProject')
            if (storedProject) {
                try {
                    const projectData = JSON.parse(storedProject)
                    // Check if this project still exists in the fetched data
                    const stillExists = data.find(p => String(p.id) === String(projectData.id))
                    if (stillExists) {
                        setSelectedProject(String(projectData.id))
                        console.log('Restored selected project:', projectData.name)
                        // Refresh the stored project data with latest backend data
                        fetch(`http://localhost:5001/projects/${projectData.id}`)
                        .then(res => res.json())
                        .then(latestProjectData => {
                            localStorage.setItem('selectedProject', JSON.stringify(latestProjectData))
                            window.dispatchEvent(new CustomEvent('selectedProjectChanged', { 
                                detail: latestProjectData 
                            }))
                            console.log('Restored project data refreshed from backend')
                        })
                        .catch(err => console.error('Error refreshing restored project:', err))
                    } else {
                        localStorage.removeItem('selectedProject')
                    }
                } catch (error) {
                    console.error('Error parsing stored project:', error)
                    localStorage.removeItem('selectedProject')
                }
            }
        })
        .catch(err => console.error('Error fetching projects:', err))
    },[])

    // Filter projects by selected organization
    const filteredProjects = projects.filter(project => {
        if (!selectedOrganization) return true
        
        // Convert both to strings for comparison since backend returns string IDs
        const orgId = String(selectedOrganization)
        const projectOrgId = String(project.organizationId)
        
        console.log('Filtering project:', project.name, 'Project orgId:', projectOrgId, 'Selected orgId:', orgId, 'Match:', projectOrgId === orgId)
        
        return projectOrgId === orgId
    })

    const handleOrganizationChange = (e) => {
        const orgId = e.target.value
        console.log('Organization changed in nav:', orgId)
        setSelectedOrganization(orgId)
        setSelectedProject('') // Reset project selection when organization changes
        console.log('Available projects:', projects.length, 'Filtered projects will be recalculated')
    }

    const handleProjectChange = (e) => {
        const projectId = e.target.value
        setSelectedProject(projectId)
        
        // Store selected project in localStorage and dispatch event
        if (projectId) {
            const selectedProjectData = projects.find(p => String(p.id) === String(projectId))
            if (selectedProjectData) {
                // Get full project data from backend to ensure we have keyPersonnel
                fetch(`http://localhost:5001/projects/${projectId}`)
                .then(res => res.json())
                .then(fullProjectData => {
                    console.log('Full project data fetched for navigation:', fullProjectData)
                    console.log('KeyPersonnel in navigation project:', fullProjectData.keyPersonnel)
                    localStorage.setItem('selectedProject', JSON.stringify(fullProjectData))
                    window.dispatchEvent(new CustomEvent('selectedProjectChanged', { 
                        detail: fullProjectData 
                    }))
                    console.log('Selected project stored and event dispatched with full data')
                })
                .catch(err => {
                    console.error('Error fetching full project data:', err)
                    // Fallback to basic project data
                    localStorage.setItem('selectedProject', JSON.stringify(selectedProjectData))
                    window.dispatchEvent(new CustomEvent('selectedProjectChanged', { 
                        detail: selectedProjectData 
                    }))
                })
            }
        } else {
            localStorage.removeItem('selectedProject')
            window.dispatchEvent(new CustomEvent('selectedProjectChanged', { 
                detail: null 
            }))
        }
    }

    const fetchOrganizations = () => {
        fetch('http://localhost:5001/organizations')
        .then(res => res.json())
        .then(data => {
            console.log('Organizations fetched for nav:', data)
            setOrganizations(data)
            // Set first organization as default if available
            if (data.length > 0) {
                console.log('Setting default organization in nav:', data[0].id)
                setSelectedOrganization(data[0].id)
            }
        })
        .catch(err => console.error('Error fetching organizations:', err))
    }

    useEffect(() => {
        fetchOrganizations()
        
        // Listen for organization refresh events
        const handleRefreshOrganizations = () => {
            console.log('Refreshing organizations in nav due to external event')
            fetchOrganizations()
        }
        
        window.addEventListener('refreshOrganizations', handleRefreshOrganizations)
        
        return () => {
            window.removeEventListener('refreshOrganizations', handleRefreshOrganizations)
        }
    },[])

    return(
        <div className='home-container'>
            {/* Top Bar */}
            <div className='topbar'>
                <div className='topbar-left'>
                    <img src='/images/logo.png' alt='logo' className='topbar-logo'/>
                    <button 
                        className={currentPage === 'home' ? 'active' : ''}
                        onClick={() => navigate(`/${userId}/home`)}
                    >
                        DASHBOARD
                    </button>
                    <button 
                        className={currentPage === 'shoot' ? 'active' : ''}
                        onClick={() => navigate(`/${userId}/shoot`)}
                    >
                        SHOOT
                    </button>
                    <button 
                        className={currentPage === 'edit' ? 'active' : ''}
                        onClick={() => navigate(`/${userId}/edit`)}
                    >
                        EDIT
                    </button>
                    <button 
                        className={currentPage === 'deliver' ? 'active' : ''}
                        onClick={() => navigate(`/${userId}/deliver`)}
                    >
                        DELIVER
                    </button>
                    <button 
                        className={currentPage === 'view' ? 'active' : ''}
                        onClick={() => navigate(`/${userId}/view`)}
                    >
                        VIEW
                    </button>
                </div>
                <div className='topbar-right'>
                    <p>ORGANIZATION</p>
                    <select value={selectedOrganization} onChange={handleOrganizationChange}>
                        <option value="">Select Organization</option>
                        {organizations.map( org => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                    </select>
                    <p>PROJECT</p>
                    <select value={selectedProject} onChange={handleProjectChange}>
                        <option value="">Select Project ({filteredProjects.length} available)</option>
                        {filteredProjects.map( project => (
                            <option key={project.id} value={project.id}>
                                {project.name} ({project.status})
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            
            {/* Sidebar */}
            <div className='sidebar'>
                <button 
                    className={currentSidebarPage === 'projects' ? 'active' : ''}
                    onClick={() => navigate(`/${userId}/projects`)}
                >
                    <img src='/images/folder.png' alt='projects' />
                    PROJECTS
                </button>
                <button 
                    className={currentSidebarPage === 'event-setup' ? 'active' : ''}
                    onClick={() => navigate(`/${userId}/event-setup`)}
                >
                    <img src='/images/calendar.png' alt='events' />
                    EVENT SETUP
                </button>
                <button 
                    className={currentSidebarPage === 'shot-planner' ? 'active' : ''}
                    onClick={() => navigate(`/${userId}/shot-planner`)}
                >
                    <img src='/images/checklist.png' alt='shot planner' />
                    SHOT PLANNER
                </button>
                <button 
                    className={currentSidebarPage === 'personnel' ? 'active' : ''}
                    onClick={() => navigate(`/${userId}/personnel`)}
                >
                    <img src='/images/personnel.png' alt='personnel' />
                    PERSONNEL
                </button>
                <button 
                    className={currentSidebarPage === 'settings' ? 'active' : ''}
                    onClick={() => navigate(`/${userId}/settings`)}
                >
                    <img src='/images/settings.png' alt='settings' />
                    SETTINGS
                </button>
            </div>
            
            {/* Main Content Area */}
            <div className='content-area'>
                {/* Your page content will go here */}
            </div>
        </div>
    )
}