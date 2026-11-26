# Demo assets

`assets/demo.gif` is a looping animated mockup. `assets/demo.mp4` is a nine-second H.264 video with player controls. `preview.png` is a still for the catalog and for people who prefer no motion.

Every name, host, path, task and result in these assets is fictional. They are drawn from constants by `tools/render_demos.py`; the generator never reads Herdr sessions, screenshots, terminal buffers or credentials. No screenshot of a working desktop is included.

The animation takes its timing from the terminal idea in the jpisgeek profile: stepped command typing, line-by-line ASCII, then a blinking prompt. The signal bars and test progress are demo terminal output, not features added to Herdr. Layout status spinners and attention pulses are native; the two wallpaper options are static artwork.

To regenerate in a parent directory containing both package folders:

```sh
python3 -m venv .demo-venv
.demo-venv/bin/pip install Pillow pyfiglet imageio-ffmpeg
.demo-venv/bin/python nightwire/tools/render_demos.py
```

The script uses Menlo from macOS. For another OS, set FONT in the script to a local monospace TTF. The demo has no network widgets or telemetry. The video has no audio track.
