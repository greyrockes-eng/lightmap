# Contributing to LightMap

First off, **thank you**. The fact that you want to help light up the world means everything.

## Our Mission

LightMap exists to prove that there's more good in the world than bad — and to make it visible. Every contribution, no matter how small, helps that mission.

## How to Contribute

### 🐛 Found a Bug?

1. Check if it's already reported in [Issues](https://github.com/YOUR_USERNAME/lightmap/issues)
2. If not, open a new issue with:
   - What you expected to happen
   - What actually happened
   - Steps to reproduce
   - Screenshots if helpful

### 💡 Have an Idea?

Open an issue with the tag `enhancement` and describe:
- What the feature would do
- Why it would help the LightMap community
- Any rough ideas on how to implement it

### 🔧 Want to Write Code?

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test locally with `npm run dev`
5. Commit with a clear message: `git commit -m "Add: description of what you did"`
6. Push: `git push origin feature/your-feature-name`
7. Open a Pull Request

### 🌍 Want to Help with Translations?

We want LightMap in every language on Earth. Translation files are in `src/locales/`. To add a new language:

1. Copy `src/locales/en.json` to `src/locales/[language-code].json`
2. Translate the strings
3. Submit a PR

### 🎨 Want to Improve the Design?

We welcome design contributions! Open an issue with mockups, sketches, or ideas. Even rough drawings on a napkin are welcome.

## Development Setup

```bash
git clone https://github.com/YOUR_USERNAME/lightmap.git
cd lightmap
npm install
cp .env.example .env.local
# Fill in your Supabase and Anthropic keys
npm run dev
```

## Code Style

- TypeScript everywhere
- Functional React components with hooks
- Tailwind for styling
- Keep components small and focused
- Comment the "why", not the "what"

## Community Guidelines

LightMap is a positivity project. Our community reflects that:

- **Be kind** — Always. To everyone.
- **Be patient** — Not everyone has the same experience level.
- **Be constructive** — If something could be better, suggest how.
- **Be inclusive** — Every culture, language, and background is welcome.
- **Be respectful** — Disagree with ideas, not people.

## Recognition

All contributors are recognized in our README and on the LightMap website. Founding contributors (pre-v1.0) get a special badge.

---

*"The world starts dark. We light it up together."*
