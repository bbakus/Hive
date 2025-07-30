import {BrowserRouter, Routes, Route} from 'react-router-dom'
import { useState } from 'react'
import './App.css';
import { Login } from './components/Login.js'
import { Signup } from './components/Signup.js'
import { Home } from './components/Home.js'
import { Settings } from './components/Settings.js'
import { Personnel } from './components/Personnel.js'
import { EventPlanner } from './components/EventPlanner.js';
import { ShotPlanner } from './components/ShotPlanner.js';
import { Projects } from './components/Projects.js';

function App() {

  const [userId, setUserId] = useState('')

  function liftUserId(userId){
    setUserId(userId)
  }
  
  return (
    <div className="App">
     <BrowserRouter>
      <Routes>
        <Route element={<Login/>} path='/'/>
        <Route element={<Signup/>} path='/signup'/>
        <Route element={<Home liftUserId={liftUserId}/>} path='/:userId/home'/>
        <Route element={<Settings liftUserId={liftUserId}/>} path='/:userId/settings'/>
        <Route element={<Personnel liftUserId={liftUserId}/>} path='/:userId/personnel'/>
        <Route element={<EventPlanner liftUserId={liftUserId}/>} path='/:userId/event-setup'/>
        <Route element={<ShotPlanner liftUserId={liftUserId}/>} path='/:userId/shot-planner'/>
        <Route element={<Projects liftUserId={liftUserId}/>} path='/:userId/projects'/>
      </Routes>
     </BrowserRouter>
    </div>
  );
}

export default App;
