# SHAC Simulator YouTube Audio Backend

Simple FastAPI service that extracts audio from YouTube URLs using yt-dlp.

## What It Does

- Takes a YouTube URL as input
- Extracts the audio stream using yt-dlp
- Converts to MP3 (192kbps)
- Streams it back to the SHAC Simulator frontend
- SHAC Simulator then spatializes it with Web Audio API

## Why This Exists

To make SHAC Simulator accessible to everyone - users don't need audio files on their device, they can just paste YouTube URLs and explore spatial audio.

**Legal Note**: This extracts audio for personal spatial audio exploration. YouTube embeds are visible in the simulator for attribution.

## Endpoints

### `GET /`
Service info and status

### `GET /info?url=<youtube-url>`
Get video metadata (title, duration, thumbnail, etc.) without downloading

**Example**:
```
GET /info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

**Response**:
```json
{
  "title": "Rick Astley - Never Gonna Give You Up",
  "duration": 212,
  "thumbnail": "https://...",
  "uploader": "Rick Astley",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

### `GET /audio?url=<youtube-url>`
Extract and stream audio as MP3

**Example**:
```
GET /audio?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

**Response**: Streams MP3 file

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
python main.py
```

Server runs on `http://localhost:8000`

## Railway Deployment

### Option 1: From GitHub

1. Push this directory to GitHub
2. Create new Railway project
3. Connect GitHub repo
4. Railway auto-detects Python and deploys
5. Note the deployment URL (e.g., `https://shac-backend-production.up.railway.app`)

### Option 2: Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

### Environment Variables

Railway sets `PORT` automatically. No other config needed.

## Usage in SHAC Simulator

Update frontend to point to your Railway URL:

```javascript
const BACKEND_URL = 'https://your-app.up.railway.app';

// Get video info
const info = await fetch(`${BACKEND_URL}/info?url=${youtubeUrl}`);

// Get audio stream
const audioResponse = await fetch(`${BACKEND_URL}/audio?url=${youtubeUrl}`);
const audioBlob = await audioResponse.blob();
```

## Dependencies

- **FastAPI**: Web framework
- **uvicorn**: ASGI server
- **yt-dlp**: YouTube audio extraction
- **ffmpeg**: Audio conversion (Railway includes this)

## Notes

- Railway free tier has execution time limits
- For production, consider adding caching
- Could add Redis for repeated URL requests
- Currently no rate limiting (add if needed)

## Cost

Railway free tier includes:
- $5/month credit
- 500 hours execution time
- Should be enough for personal use

If you exceed limits, audio extraction will fail gracefully and users can still upload files.
