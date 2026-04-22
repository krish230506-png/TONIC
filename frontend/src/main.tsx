import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'
import VolunteerApp from './VolunteerApp.tsx'

import { BrowserRouter } from 'react-router-dom';

const isVolunteer = window.location.search.includes('view=volunteer');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {isVolunteer ? <VolunteerApp /> : <App />}
    </BrowserRouter>
  </StrictMode>,
)
