import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import VolunteerApp from './VolunteerApp.tsx'

const isVolunteer = window.location.search.includes('view=volunteer');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isVolunteer ? <VolunteerApp /> : <App />}
  </StrictMode>,
)
