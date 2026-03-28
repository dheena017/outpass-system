import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import MobileSplashScreen from './components/MobileSplashScreen.jsx'
import { initNativeFeatures } from './utils/native'

// Initialize Capacitor features
initNativeFeatures();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MobileSplashScreen>
      <App />
    </MobileSplashScreen>
  </React.StrictMode>,
)
