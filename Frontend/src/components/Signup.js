
import { useEffect, useState } from "react"
import {useNavigate} from 'react-router-dom'
import '../styles/login.css'


export const Signup = () => {

    const navigate = useNavigate()

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [signupCode, setSignupCode] = useState('')

    function signup(e){
        e.preventDefault()
        
        if(!name || !email || !password || !signupCode){
            alert('All fields are required')
            return
        }

        if(password !== confirmPassword){
            alert('Passwords must match')
            return
        }
        

        fetch('http://localhost:5001/auth/signup', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password,
                signupCode: signupCode
            })
        })
        .then(res => res.json())
        .then(data => {
            if(data.user){
                alert('Succesful Signup!')
                // Store user data in localStorage
                localStorage.setItem('user', JSON.stringify(data.user))
                // Navigate to dashboard
                navigate(`/${data.user.id}/home`)
            } else {
                alert(data.error || 'Signup failed')
            }
        })
        .catch(err => {
            console.error('Signup error:', err)
            alert('Signup failed. Please try again.')
        })
    }

    function handleName(e){
        setName(e.target.value)
    }

    function handleEmail(e){
        setEmail(e.target.value)
    }

    function handlePassword(e){
        setPassword(e.target.value)
    }

    function handleConfirmPassword(e){
        setConfirmPassword(e.target.value)
    }

    function handleSignupCode(e){
        setSignupCode(e.target.value)
    }

    return(
        <div>
            <div className='login-container'>
            <div className='login-header'>
                    <img src='/images/logo.png' alt='logo'/>
                    <h1>HIVE</h1>
            </div>
                <form onSubmit={signup} className='login-form'>
                    <p>NAME</p>
                        <input onChange={(e) => handleName(e)} value={name} placeholder='John Doe'/>
                    <p>EMAIL</p>
                        <input onChange={(e) => handleEmail(e)} value={email} placeholder='email@example.com'/>
                    <p>PASSWORD</p>
                        <input type="password" onChange={(e) => handlePassword(e)} value={password} placeholder='password123'/>
                    <p>CONFIRM PASSWORD</p>
                        <input type="password" onChange={(e) => handleConfirmPassword(e)} value={confirmPassword} placeholder="password123"/>
                    <p>SIGNUP CODE</p>
                        <input onChange={(e) => handleSignupCode(e)} value={signupCode} placeholder="Enter organization code"/>
                    <div className='button-container'>
                        <button type="submit" >SIGNUP</button>
                    </div>
                </form>
            </div>

        </div>
    )

}