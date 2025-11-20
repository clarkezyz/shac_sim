# SHAC Simulator

**Walk through your music in 3D space.**

A web-based spatial audio explorer that lets you position audio tracks in 3D space and navigate through them using FPS-style controls. No VR headset required—just a browser and headphones.

## [Try It Live](https://clarkezyz.github.io/shac_simu) 

## What It Does

Upload your audio files (MP3, WAV, OGG), place them in 3D space, and walk around them. Each track becomes a positioned sound source that you can hear spatially as you move through the scene.

Perfect for:
- **Musicians**: Explore stems and multitrack recordings in spatial form
- **Music Fans**: Experience songs in a completely new way
- **Educators**: Teach spatial audio and mixing concepts visually
- **Audio Professionals**: Quick spatial audio prototyping without a game engine

## Features

### 🎵 Spatial Audio
- Real-time HRTF spatialization using Web Audio API
- Distance-based attenuation
- Works with regular stereo headphones

### 🎮 FPS-Style Controls
- **WASD** - Move through space
- **Mouse** - Look around (click to lock pointer for FPS mode)
- **Drag sources** - Reposition audio in real-time
- **Lock/unlock** - Finalize positions or keep editing

### 🎨 Two Modes
- **Composition Mode** (default) - Walk through your soundscape like exploring an album
- **Authoring Mode** - Stay at center (sonar view) while sources orbit around you

### 🎛️ Visual Interface
- Top-down and first-person views
- Real-time distance indicators
- Color-coded sources (green = editable, cyan = locked)
- Clean, minimal UI that stays out of your way

## Quick Start

### 1. Run Locally
```bash
# Clone the repo
git clone https://github.com/your-username/shac-simulator.git
cd shac-simulator

# Serve it (any static server works)
python3 -m http.server 8765
```

Open `http://localhost:8765` in your browser.

### 2. Add Audio
- **Drag & drop** audio files anywhere on the page
- **OR** click the "+ Add Files" button

### 3. Navigate
- **Click on empty space** to enable FPS mouse look
- **WASD** to move through the soundscape
- **Mouse** to rotate your view
- **ESC** to exit mouse look mode

### 4. Edit Positions
- **Drag sources** to reposition them
- **Type coordinates** in the panel and click "Update"
- **Lock sources** (🔒) to finalize their positions
- **Toggle modes** to switch between composition and authoring

## Technology

Built entirely with browser-native technologies:
- **Web Audio API** - HRTF spatialization (in browsers since 2011)
- **Pointer Lock API** - FPS-style mouse look
- **Vanilla JavaScript** - No frameworks, no build tools
- **HTML5 Canvas** - 3D visualization

No server needed. No installation. No tracking. Just audio and math.

## Why This Exists

Spatial audio has been locked behind:
- Expensive VR headsets
- Proprietary tools and formats (Dolby Atmos, Apple Spatial Audio)
- Complex professional software

But the Web Audio API has had everything needed for spatial audio since 2011. This tool democratizes spatial music exploration—anyone with a browser can experience and create spatial audio.

## How It's Different

Unlike other spatial audio tools:
- ✅ Works with any audio files you already have (no encoding needed)
- ✅ Real-time repositioning (not baked-in)
- ✅ No installation or account required
- ✅ Runs entirely in your browser (client-side only)
- ✅ Free and open source

## Browser Support

Works in all modern browsers that support:
- Web Audio API
- Pointer Lock API
- HTML5 File API

Tested on Chrome, Firefox, Edge, and Safari.

## Related Projects

**[SHAC Player](https://github.com/your-username/shac-player)** - High-quality spatial audio playback using Ambisonics (spherical harmonics). SHAC Simulator is the creative/exploratory tool; SHAC Player is the distribution format.

## Contributing

This is a passion project exploring what's possible with browser-based spatial audio. Contributions welcome!

## Philosophy

**Simplicity** - If it takes more than 30 seconds to start exploring, we failed.

**Openness** - No accounts, no tracking, no data harvesting.

**Quality** - Simple doesn't mean amateur. Every detail should feel professional.

**Accessibility** - Works for everyone, everywhere, on any device with a browser.

---

**Built with the "Be Impossible" philosophy - if it should exist, build it.**

## License

MIT License - See LICENSE file for details
