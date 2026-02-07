const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/data.json');

// Helper functions
function getData() {
  if (!fs.existsSync(DATA_FILE)) {
    // Create initial data structure
    const initialData = { users: [], clips: [], matches: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  const data = fs.readFileSync(DATA_FILE);
  return JSON.parse(data);
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Register
router.post('/register', (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const data = getData();
    
    // Check if user exists
    if (data.users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const user = {
      id: Date.now().toString(),
      email,
      password, // In production, hash this!
      role, // 'editor' or 'creator'
      createdAt: new Date().toISOString()
    };
    
    data.users.push(user);
    saveData(data);
    
    console.log('✅ User registered:', email, 'as', role);
    
    res.json({ 
      success: true,
      user: { id: user.id, email: user.email, role: user.role } 
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }
    
    const data = getData();
    const user = data.users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('✅ User logged in:', email);
    
    res.json({ 
      success: true,
      user: { id: user.id, email: user.email, role: user.role } 
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;