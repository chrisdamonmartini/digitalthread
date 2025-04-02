import React from 'react';
import { Link, useLocation } from 'react-router-dom'; // Added useLocation for active route detection
import './AppHeader.css'; // We'll create this CSS file next

function AppHeader() {
    // Get current location to highlight active link
    const location = useLocation();
    
    // Placeholder for Siemens logo - replace with actual <img> or SVG later
    const SiemensLogoPlaceholder = () => (
        <div className="logo-placeholder-siemens">SIEMENS</div>
    );

    return (
        // Outer container for potential top/bottom sections
        <div className="app-header-container">
            {/* Top Section (lighter blue) */} 
            <div className="header-top-section"> 
                 {/* Can add top-level nav items here if needed later */} 
            </div>
             {/* Bottom Section (darker blue) */} 
            <header className="app-header-themed-new">
                <div className="header-content">
                    {/* Left side can contain icons/main nav later */} 
                    <div className="header-left">
                         {/* Placeholder for left icons/nav */}
                         <span className="header-title-new">Thread Xplorer</span>
                         
                         {/* Main navigation links */}
                         <nav className="main-nav">
                            <Link 
                                to="/" 
                                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                            >
                                Flow View
                            </Link>
                         </nav>
                    </div>
                    {/* Right side */} 
                    <div className="header-right">
                        <Link to="/settings" className="settings-link-new">Settings</Link>
                        <SiemensLogoPlaceholder />
                    </div>
                </div>
            </header>
        </div>
    );
}

export default AppHeader; 