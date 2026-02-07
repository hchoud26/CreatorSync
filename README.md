# CreatorSync 🎬

**Created by Ariana Garcia Villalba, Ushnah Hussain, and Haya Choudhary**

AI-powered matching platform connecting Twitch streamers with video editors through bias-free, work-first discovery.

---

## Special Shoutout 🎉
A huge thank you to **Aedify AI** for sponsoring this hackathon and providing the AI embedding technology that powers our semantic matching system!

---

## What does our app do?
CreatorSync matches Twitch streamers with video editors based on creative compatibility—not follower count, appearance, or popularity. Editors upload sample clips anonymously, and AI suggests the best matches to creators looking for collaborators.

---

## What problem does it solve?
**For Streamers:**
- Finding editors is chaotic (scattered across Twitter, Discord, Google Forms)
- Hard to judge creative fit without seeing actual work
- Hiring often based on follower count instead of talent

**For Editors:**
- Get judged by appearance/gender/social media presence
- Flooded with applications or completely ignored
- Emerging talent has limited visibility

**The Result:** Talented creators never connect, and both sides lose potential partnerships.

---

## Why is it useful?
- **Fair Discovery:** Work speaks first—no bias based on identity or popularity
- **Smart Matching:** AI understands creative style beyond simple tags
- **Mutual Opt-In:** Both parties must accept before identities are revealed
- **Long-term Partnerships:** Focus on compatibility over transactional work
- **Emerging Creator Focused:** Levels the playing field for small streamers and new editors

---

## Who will benefit from it?
- **Emerging Twitch Streamers** looking for consistent, quality editing help
- **Video Editors & Camera Operators** seeking creators who match their style
- **The Creator Economy:** More successful collaborations = better content for everyone

This directly addresses the hackathon prompt: *empowering emerging creators to showcase work, connect with collaborators, and grow an audience* without relying on large algorithms or popularity contests.

---

## How did we come up with this idea?
We noticed that finding creative collaborators in the streaming space is incredibly broken. Streamers post "looking for editor" tweets that get hundreds of replies, but there's no good way to evaluate fit. Meanwhile, talented editors get overlooked because they don't have 10K followers on Twitter. We wanted to build a system where **work quality matters more than clout**.

---

## Instructions on how to run our project

### Prerequisites
- Node.js (v16+)
- npm
- Code editor (VS Code recommended)

### Steps

1. **Clone repo from GitHub**
   ```bash
   git clone https://github.com/yourteam/creatorsync.git
   cd creatorsync
   ```

2. **Set up Backend**
   ```bash
   cd backend
   npm install
   ```

3. **Add Environment Variables**
   - Create a `.env` file in the `backend/` folder
   - Add:
     ```
     PORT=3000
     AEDIFY_API_KEY=your_key_from_sponsor
     ```

4. **Start the Backend**
   ```bash
   npm start
   ```
   - Server runs at `http://localhost:3000`

5. **Open the Frontend**
   - Option A: Right-click `frontend/index.html` → Open with Live Server (VS Code)
   - Option B: Open `frontend/index.html` directly in browser

6. **Test the App**
   - Visit `http://localhost:3000/api/test` to verify backend
   - Frontend should load at `http://localhost:5500` (or your server port)

---

## Tech Stack & Code Structure Overview

**Frontend:**
- HTML5, CSS3, JavaScript (ES6+)
- Tailwind CSS (styling)
- Lucide Icons (UI elements)

**Backend:**
- Node.js + Express.js (API server)
- SQLite (database)
- CORS (cross-origin support)

**AI Integration:**
- Aedify AI (text embeddings & semantic matching)
- Cosine similarity algorithm (matching scores)

**Tools:**
- Git/GitHub (version control)
- VS Code (development)
- Postman (API testing)

---
CreatorSync/
├── authentication-node-.../ # Auth module
├── backend/
│   ├── data/
│   │   ├── data.json          # JSON database
│   │   └── package.json       # Data module config
│   ├── database/              # SQLite setup
│   ├── node_modules/          # Dependencies
│   ├── routes/                # API endpoints
│   │   ├── auth.js           # Authentication routes
│   │   ├── chat.js           # Chat functionality
│   │   ├── creators.js       # Creator endpoints
│   │   ├── editors.js        # Editor endpoints
│   │   ├── matches.js        # Matching system
│   │   └── twitch.js         # Twitch OAuth
│   ├── scripts/              # Utility scripts
│   ├── .env.example          # Environment template
│   ├── package-lock.json
│   ├── package.json          # Backend dependencies
│   ├── server.js             # Express server
│   └── setup.ps1             # Windows setup script
├── frontend/
│   ├── assets/
│   │   └── images/           # Logos, icons
│   ├── css/                  # Stylesheets
│   ├── js/                   # JavaScript modules
│   ├── index.html            # Main app interface
│   └── .gitkeep
└── .gitignore

## Key Features

✅ **Anonymous Clip Discovery** - Editors upload 3-5 sample clips without revealing identity  
✅ **AI-Powered Ranking** - Aedify suggests best-matching clips for each creator  
✅ **Like/Pass System** - Tinder-style browsing for editor clips  
✅ **Two-Stage Matching** - Both parties must accept before identities revealed  
✅ **Built-in Chat** - Direct messaging after successful match  
✅ **Content Type Tags** - Minecraft, IRL, Politics, Valorant, etc.  
✅ **Style Tags** - Fast-paced, cinematic, meme-heavy, subtitles, etc.  

---

## Challenges We Faced

**1. Designing the Anonymous Identity System**
- We needed to hide all identifying information until BOTH parties agreed
- Solution: Multi-stage data reveal (clip → bio → full identity)

**2. Integrating Aedify AI**
- First time using embeddings and semantic matching
- Solution: Built a fallback tag-based system that works even if AI fails

**3. Building a Fair Matching Algorithm**
- How do we pick 1 clip from an editor's 3-5 samples?
- Solution: AI ranks clips by similarity to creator preferences

**4. Backend-Frontend Connection**
- CORS errors and API configuration issues
- Solution: Proper middleware setup and environment variables

**5. SQLite Database Design**
- Modeling the two-sided matching flow in SQL
- Solution: Status-based match lifecycle (liked → accepted → confirmed)

---

## How It Works (Demo Flow)

**As a Creator:**
1. Sign up → Select "I'm a Streamer"
2. Set preferences (content type, style tags)
3. Browse clips one at a time (completely anonymous)
4. Like clips that resonate with you
5. Wait for editor to accept
6. See editor's full portfolio (3-5 clips)
7. Confirm match → identities revealed
8. Start chatting and collaborating!

**As an Editor:**
1. Sign up → Select "I'm an Editor"
2. Upload 3-5 sample clips
3. Tag them with content types and styles
4. Receive notifications when creators like your work
5. Review creator bios (still anonymous)
6. Accept creators you want to work with
7. Match confirmed → identities revealed
8. Start chatting and collaborating!

**AI Magic Behind the Scenes:**
- When creators browse, AI picks the BEST 1 clip from each editor
- Uses semantic understanding: "fast-paced Minecraft chaos" matches better than just "Minecraft"
- Falls back to tag matching if AI is unavailable

---

## Acknowledgements

A HUGE thank you to:
- **SparkHacks Team** for organizing this incredible event
- **Aedify AI** for sponsoring and providing cutting-edge AI technology
- **All Sponsors** for making this hackathon possible
- **Mentors** who guided us through technical challenges

---

## Conclusion

CreatorSync is more than just a matching app—it's a movement toward **fair, bias-free collaboration in the creator economy**. By putting work quality first and identity last, we help talented creators find each other regardless of follower count or social media presence.

**Our mission:** Every emerging creator deserves a fair shot at success.

Thank you for your time and consideration! 🚀
