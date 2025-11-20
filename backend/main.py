"""
SHAC Simulator YouTube Audio Backend
Simple service to extract audio from YouTube URLs using yt-dlp
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import yt_dlp
import os
import tempfile
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SHAC Simulator YouTube Backend")

# CORS - allow requests from anywhere (since this is a public tool)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "service": "SHAC Simulator YouTube Audio Backend",
        "status": "running",
        "endpoints": {
            "/audio": "GET - Extract audio from YouTube URL (query param: url)",
            "/info": "GET - Get video metadata (query param: url)"
        }
    }

@app.get("/info")
async def get_video_info(url: str):
    """Get metadata about a YouTube video without downloading"""
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            return {
                "title": info.get('title', 'Unknown'),
                "duration": info.get('duration', 0),
                "thumbnail": info.get('thumbnail', ''),
                "uploader": info.get('uploader', 'Unknown'),
                "url": url
            }
    except Exception as e:
        logger.error(f"Error getting video info: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to get video info: {str(e)}")

@app.get("/audio")
async def get_audio(url: str):
    """Extract audio from YouTube URL and stream it"""
    try:
        # Create temporary directory for this request
        temp_dir = tempfile.mkdtemp()
        output_template = os.path.join(temp_dir, 'audio.%(ext)s')

        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': output_template,
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': True,
            'no_warnings': True,
        }

        logger.info(f"Downloading audio from: {url}")

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = info.get('title', 'audio')

        # Find the downloaded file
        audio_file = os.path.join(temp_dir, 'audio.mp3')

        if not os.path.exists(audio_file):
            raise HTTPException(status_code=500, detail="Audio file not found after download")

        logger.info(f"Audio downloaded successfully: {title}")

        # Stream the file
        def iterfile():
            with open(audio_file, 'rb') as f:
                yield from f
            # Cleanup after streaming
            os.remove(audio_file)
            os.rmdir(temp_dir)

        return StreamingResponse(
            iterfile(),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f'attachment; filename="{title}.mp3"'
            }
        )

    except Exception as e:
        logger.error(f"Error extracting audio: {e}")
        # Cleanup on error
        try:
            if os.path.exists(temp_dir):
                for file in Path(temp_dir).glob('*'):
                    file.unlink()
                os.rmdir(temp_dir)
        except:
            pass
        raise HTTPException(status_code=400, detail=f"Failed to extract audio: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
