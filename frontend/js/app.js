// 1. Define where your Backend is living
const BACKEND_URL = "http://localhost:5000";

// 2. The function to "Call" the backend
async function loadTwitchClips() {
    console.log("⏳ Connecting to Backend...");

    try {
        // This is the "Phone Call" to your backend route
        const response = await fetch(`${BACKEND_URL}/api/twitch/clips`);
        
        // Turn the answer into usable JSON data
        const clips = await response.json();
        
        console.log("✅ SUCCESS! Data received:", clips);

        // 3. (Optional) Show it on the screen
        const container = document.getElementById('clips-container');
        if (container) {
            container.innerHTML = clips.map(clip => `
                <div class="clip-card" style="border:1px solid #ddd; padding:10px; margin:10px;">
                    <h3>${clip.title}</h3>
                    <img src="${clip.thumbnail_url}" width="200" />
                    <p>Streamer: ${clip.broadcaster_name}</p>
                </div>
            `).join('');
        }

    } catch (error) {
        console.error("❌ CONNECTION FAILED:", error);
    }
}

// 4. Run the function when the page loads
window.onload = loadTwitchClips;