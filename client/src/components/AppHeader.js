import React from 'react';
import { Link } from 'react-router-dom'; // Import Link for navigation
import './AppHeader.css'; // We'll create this CSS file next

function AppHeader() {
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
                         <span className="header-title-new">Digital Thread Navigator</span>
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