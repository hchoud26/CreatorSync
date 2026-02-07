const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/data.json');

function getData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = { users: [], clips: [], matches: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

// Get all matches for a user
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const data = getData();
    
    const matches = data.matches.filter(
      m => (m.creatorId === userId || m.editorId === userId) && m.status !== 'passed'
    );
    
    res.json({ matches });
  } catch (error) {
    console.error('❌ Get matches error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;