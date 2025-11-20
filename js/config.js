/**
 * SHAC Simulator Configuration
 */

const CONFIG = {
    // Backend URL for YouTube audio extraction
    // Change this to your Railway deployment URL when deployed
    // Example: 'https://shac-backend-production.up.railway.app'
    BACKEND_URL: 'http://localhost:8000',

    // Set to true to enable debug logging
    DEBUG: true
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SHAC_CONFIG = CONFIG;
}
