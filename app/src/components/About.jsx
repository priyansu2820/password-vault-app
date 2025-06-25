// app/src/components/About.jsx
import React from 'react';
import './About.css'; // Make sure this CSS file exists and is linked

/**
 * About component displays information about the application.
 * It receives an `onBack` prop to navigate back to the previous screen.
 */
function About({ onBack }) {
  // Get the application version from the package.json defined during the build process.
  // Falls back to '1.0.0' if not available (e.g., in development without specific env setup).
  const appVersion = process.env.npm_package_version || '1.0.0';
  const appName = "Password Vault"; // Define your application's name here

  return (
    <div className="about-container">
      <div className="about-content">
        <h2>About {appName}</h2>
        <p><strong>Version:</strong> {appVersion}</p>
        <p><strong>Developer:</strong> Priyansu Kundu</p> {/* Replace with your name */}
        <p>
          This is a simple, secure password manager built with Electron and React.
          It encrypts your passwords locally, protected by your master password.
        </p>
        <p>
          For more information or support, please refer to the application documentation.
        </p>
        {/* Button to navigate back. Calls the onBack prop passed from App.jsx */}
        <button className="back-button" onClick={onBack}>Back</button>
      </div>
    </div>
  );
}

export default About;
