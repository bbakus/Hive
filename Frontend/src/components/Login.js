import { useEffect, useState } from "react"
import {useNavigate} from 'react-router-dom'
import '../styles/login.css'


export const Login = () => {

    const navigate = useNavigate()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [userId, setUserId] = useState(0)

    function login(e){
        e.preventDefault()
        
        if(!email || !password){
            
            return
        }

        

        fetch('http://localhost:5001/auth/login', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        })
        .then(res => res.json())
        .then(data => {
            if(data.user){
                setUserId(data.user.id)
                // Store user data in localStorage
                localStorage.setItem('user', JSON.stringify(data.user))
                // Navigate to dashboard
                navigate(`/${userId}/home`)
            } else {
                console.error('Error Logging in')
            }
        })
        .catch(err => {
            
            console.error('Login error:', err)
        })
        .finally(() => {
            
        })
    }

    function handleEmail(e){
        setEmail(e.target.value)
    }

    function handlePassword(e){
        setPassword(e.target.value)
    }


    return(
        <div>
            <div className='login-container'>
                <div className='login-header'>
                    <img src='/images/logo.png' alt='logo'/>
                    <h1>HIVE</h1>
                </div>
                
                <form onSubmit={login} className='login-form'>
                    <p>EMAIL</p>
                        <input onChange={(e) => handleEmail(e)} value={email} placeholder='email@example.com'/>
                    <p>PASSWORD</p>
                        <input onChange={(e) => handlePassword(e)} value={password} placeholder='password123'/>
                    <div className='button-container'>
                        <button type='submit'>LOGIN</button>
                        <button type="button" onClick={() => navigate('/signup')}>SIGNUP</button>
                    </div>
                </form>
            </div>

        </div>
    )

}