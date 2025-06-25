// app/src/components/PasswordForm.jsx
import React, { useState, useEffect } from 'react';
import './PasswordForm.css';
import generatePassword from '../utils/passwordGenerator'; // NEW IMPORT

function PasswordForm({ onSubmit, onCancel, initialData }) {
  const [website, setWebsite] = useState(initialData.website || '');
  const [username, setUsername] = useState(initialData.username || '');
  const [password, setPassword] = useState(initialData.password || '');
  const [notes, setNotes] = useState(initialData.notes || '');

  // NEW STATES for password generation options
  const [genLength, setGenLength] = useState(16);
  const [genUppercase, setGenUppercase] = useState(true);
  const [genLowercase, setGenLowercase] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);


  useEffect(() => {
    // This effect runs when initialData changes, typically when opening the form for edit
    if (initialData.id) { // If initialData has an ID, it's an edit operation
      setWebsite(initialData.website || '');
      setUsername(initialData.username || '');
      setPassword(initialData.password || '');
      setNotes(initialData.notes || '');
    } else { // If no ID, it's a new entry operation
      // Clear form for new entry, but only if not already empty
      if (website || username || password || notes) {
        setWebsite('');
        setUsername('');
        setPassword('');
        setNotes('');
      }
    }
    // Reset generation options to default whenever the form is opened/re-opened
    setGenLength(16);
    setGenUppercase(true);
    setGenLowercase(true);
    setGenNumbers(true);
    setGenSymbols(true);
  }, [initialData]); // Depend on initialData to re-render form correctly for edits/new entries

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!website || !username || !password) {
      alert('Website, Username, and Password are required!');
      return;
    }
    onSubmit({
      id: initialData.id, // Pass existing ID for edits, or undefined for new
      website,
      username,
      password,
      notes,
    });
  };

  // NEW: Handle password generation
  const handleGeneratePassword = () => {
    try {
      const generated = generatePassword(
        genLength,
        genUppercase,
        genLowercase,
        genNumbers,
        genSymbols
      );
      setPassword(generated);
      // Optional: Give feedback that password was generated
      alert('New password generated and added to the field!');
    } catch (error) {
      console.error('Password generation failed:', error);
      alert('Failed to generate password: ' + error.message);
    }
  };


  return (
    <div className="password-form-overlay">
      <div className="password-form-container">
        <h3>{initialData.id ? 'Edit Password Entry' : 'Add New Password'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="website">Website:</label>
            <input
              type="text"
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group password-field-group"> {/* NEW CLASS */}
            <label htmlFor="password">Password:</label>
            <input
              type="text" // Keep as text for easy viewing while typing/generating
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button" // Important: type="button" to prevent form submission
              onClick={handleGeneratePassword}
              className="generate-password-btn" // NEW CLASS
              title="Generate a strong password"
            >
              Generate
            </button>
          </div>

          {/* NEW: Password generation options */}
          <div className="password-generation-options">
            <label>Generate Options:</label>
            <div>
              <input type="range" min="8" max="32" value={genLength} onChange={(e) => setGenLength(Number(e.target.value))} />
              <span> Length: {genLength}</span>
            </div>
            <div>
              <input type="checkbox" id="genUppercase" checked={genUppercase} onChange={(e) => setGenUppercase(e.target.checked)} />
              <label htmlFor="genUppercase"> Uppercase (A-Z)</label>
            </div>
            <div>
              <input type="checkbox" id="genLowercase" checked={genLowercase} onChange={(e) => setGenLowercase(e.target.checked)} />
              <label htmlFor="genLowercase"> Lowercase (a-z)</label>
            </div>
            <div>
              <input type="checkbox" id="genNumbers" checked={genNumbers} onChange={(e) => setGenNumbers(e.target.checked)} />
              <label htmlFor="genNumbers"> Numbers (0-9)</label>
            </div>
            <div>
              <input type="checkbox" id="genSymbols" checked={genSymbols} onChange={(e) => setGenSymbols(e.target.checked)} />
              <label htmlFor="genSymbols"> Symbols (!@#$)</label>
            </div>
          </div>
          {/* END NEW: Password generation options */}

          <div className="form-group">
            <label htmlFor="notes">Notes:</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
            ></textarea>
          </div>
          <div className="form-actions">
            <button type="submit" className="submit-btn">{initialData.id ? 'Update Entry' : 'Add Entry'}</button>
            <button type="button" onClick={onCancel} className="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PasswordForm;