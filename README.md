# GLOAMFALL — Endless Survivors

A fast, top-down survival action game inspired by **Vampire Survivors** and **Megabonk**. Pick a survivor, outlast endless waves, hoard glowing relics, and stack upgrades until the night breaks.

## Play

No build step, no external assets. Serve the folder with any static web server:

```bash
python3 -m http.server 3002
```

Then open <http://localhost:3002>. On OMGithub, `./start.sh` starts the bundled dev server.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | `WASD` / arrow keys | Drag the on-screen joystick |
| Use ability | `Space` | Tap the ability orb |
| Pause | `P` / `Esc` | Pause button |
| Choose upgrade | `1` / `2` / `3` or click | Tap a card |

Attacks are automatic. Movement is the only defensive skill you have — keep kiting.

## Survivors

| Survivor | Starting weapon | Ability |
| --- | --- | --- |
| **Vesper** | Arcane Bolt | Blink Nova |
| **Bramble** | Thorn Orbit | Bramble Guard |
| **Kite** | Scatter Shot | Overdrive |
| **Sable** | Chain Lightning | Singularity |

## Features

- Endless escalating waves, elites, and bosses every ~72 seconds.
- Level-up ascensions: new weapons, passive stacks, and emergency heals.
- Frequent relic drops across **common / rare / epic / legendary** rarities.
- Stacking damage, attack speed, movement, area, crit, lifesteal, burn, frost, chain, and void effects.
- Screen shake, hit flashes, damage numbers, particles, glowing loot beams, and legendary banners.
- Responsive desktop and mobile HUD with safe-area-aware touch controls.
- Synthesized WebAudio soundtrack and SFX — no audio files required.
- Best run saved locally.

## Project layout

```
index.html        DOM shell, HUD, and overlays
styles.css        neon UI, overlays, responsive/mobile layout
src/data.js       characters, weapons, passives, relics, enemies, balance
src/audio.js      WebAudio synth engine and music
src/game.js       loop, combat, spawning, loot, upgrades, rendering, input
```

---

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/tropaudoma/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/tropaudoma/PlayGround)

- 🎮 [Open the project](https://go.ondev.store/tropaudoma/PlayGround).
- ✨ [Remix this project](https://go.ondev.store/tropaudoma/PlayGround?remix=1).
- 💻 [Explore the source](https://github.com/tropaudoma/PlayGround).
- 🛠️ [Check build runs](https://github.com/tropaudoma/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/tropaudoma/PlayGround/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/tropaudoma).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
<!-- omgithub:readme:end -->
