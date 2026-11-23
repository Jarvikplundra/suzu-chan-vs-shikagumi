# スズちゃん vs シカグミ — Suzu-chan vs. the Shika-gumi

A 2D anime platformer, **zero dependencies**, custom **WebGL2** engine. Studio-Ghibli-flavored
sunset Tokyo, procedural Japanese-orchestral soundtrack, full gamepad support.

## Run

```bash
npm run serve     # starts http://localhost:8080
```

Open that URL in Chrome/Edge (or any modern browser). WebGL2 required.

## Controls

| Action | Keyboard | Thrustmaster GPX (X-Input / XBOX360 layout) |
|---|---|---|
| Move | ← → / A D | Left stick / D-pad |
| Jump (double!) | SPACE / W / Z / K | A |
| Claw attack (3-combo) | J / X | X |
| Cat dash | L / C / SHIFT | B |
| Mouse scout (reveal ahead) | U / Q | LB |
| Mouse swarm attack | I / E | RB |
| Advance / skip dialogue | ENTER / Y | START / B |
| Mute music | M | — |

## Roadmap

- **Chapter 1**: Resignation Afternoon — office, CEO Wanibuchi (boss), meet Chū, Pī & Koro (mice)
- **Chapter 2**: Cat Over the Night Market — shitamachi rooftops, officer **Ganryū** (boss)
- **Chapter 3 (planned)**: NARA — the Shika-gumi head den, boss 奈良の大鹿, and the
  "ten thousand shika-senbei" pacifist route (Path 2)

## Tech notes

- `src/engine/` — WebGL2 sprite-batch renderer, input (Gamepad API standard mapping), WebAudio
  procedural score (taiko, koto-pluck, strings pads; hirajoshi motifs)
- `src/art/` — all sprites & parallax backgrounds drawn as vector art at runtime (2× supersampled
  into one 4096² atlas; 100+ regions)
- `src/game/` — entities/physics, level data, dialogue system (Japanese + English subtitling)
