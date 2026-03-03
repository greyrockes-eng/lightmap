<p align="center">
  <img src="docs/lightmap-banner.png" alt="LightMap" width="600" />
</p>

<h1 align="center">LightMap</h1>

<p align="center">
  <strong>The world starts dark. We light it up together.</strong>
</p>

<p align="center">
  <em>While they track where the world is breaking, we track where it's healing.</em>
</p>

<p align="center">
  <a href="#demo">Demo</a> •
  <a href="#about">About</a> •
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#roadmap">Roadmap</a>
</p>

---

## About

**LightMap** is an open-source, real-time interactive 3D globe that visualizes acts of kindness, encouragement, peace, and humanitarian relief happening around the world — right now.

In a time of widespread conflict and division, we built the opposite of a war monitor. No threat levels. No conflict zones. No doom scrolling. Just a dark globe that glows brighter every time someone, somewhere, does something good.

The goal is simple: **Light the map. 100%.**

### How It Works

1. **The globe starts dark** — just like the world feels sometimes
2. **People add lights** — acts of kindness, encouragement, wishes for peace
3. **The map glows brighter** — every light is visible to everyone in real-time
4. **Arcs connect us** — send encouragement from your country to another, watch the arc trace across the globe
5. **The world brightness meter climbs** — together we push toward 100%

## Features

- **Real-time 3D Globe** — Interactive Three.js globe with drag, zoom, and touch support
- **Live Feed** — New lights stream in from around the world as they happen
- **Encouragement Arcs** — Glowing connections between countries, visible to all users
- **AI-Powered Moderation** — Claude ensures only positivity makes it through
- **World Brightness Meter** — Global progress toward lighting 100% of the map
- **Category System** — Kindness (gold), Encouragement (teal), Peace (purple), Relief (rose)
- **Fully Open Source** — MIT licensed, community-driven, transparent

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| 3D Globe | Three.js |
| Database | Supabase (PostgreSQL + Realtime) |
| Auth | Supabase Auth |
| AI Moderation | Claude API (Anthropic) |
| Hosting | Vercel |
| Geolocation | Browser API + IP fallback |

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account (free tier works)
- An Anthropic API key (for AI moderation)

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/lightmap.git
cd lightmap

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase and Anthropic keys

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and watch the world light up.

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Contributing

We believe the best technology brings people together. LightMap is built by a global community, and we welcome contributors of all skill levels.

### Ways to Contribute

- **Code** — New features, bug fixes, performance improvements
- **Translations** — Help us reach every language on Earth
- **Design** — UI/UX improvements, icons, animations
- **Content** — Write documentation, tutorials, blog posts
- **Ideas** — Open an issue with your vision for the project
- **Spread the Word** — Share LightMap and help grow the community

### Quick Start for Contributors

```bash
# Fork the repo, then:
git clone https://github.com/YOUR_USERNAME/lightmap.git
cd lightmap
npm install
npm run dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## Roadmap

### v1.0 — MVP (Current)
- [x] Interactive 3D globe prototype
- [ ] Supabase real-time database integration
- [ ] Add Light form with geolocation
- [ ] Encouragement arcs (send to any country)
- [ ] Claude AI moderation
- [ ] World brightness meter (live)
- [ ] Live feed panel

### v1.1 — Community
- [ ] User accounts and profiles
- [ ] Boost a light (make it glow brighter)
- [ ] AI-curated positive news feed
- [ ] Multi-language support (10+ languages)
- [ ] Shareable light links for social media

### v2.0 — Global
- [ ] Mobile apps (iOS + Android)
- [ ] Light Chains (collaborative chains across countries)
- [ ] Classroom edition for schools
- [ ] NGO/humanitarian organization API
- [ ] AR mode

## Philosophy

LightMap is:
- **Free forever** — No paywalls. Positivity shouldn't cost money.
- **Open source** — Transparent, community-owned, MIT licensed.
- **AI-protected** — Every post screened for positivity. No hate gets through.
- **Globally inclusive** — Every language, every culture, every religion welcome.
- **Privacy-first** — Minimal data collection. Anonymous posting supported.

## Support the Project

LightMap is free and open source. If you'd like to support its mission:

- ⭐ **Star this repo** — It helps more people discover the project
- 🗣️ **Share it** — Tell someone about LightMap today
- 💛 **Sponsor** — [GitHub Sponsors](https://github.com/sponsors/YOUR_USERNAME)

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Built in Loveland, Ohio. For the whole world.</strong>
</p>

<p align="center">
  <em>"The world is 34% lit — help us reach 100%."</em>
</p>
