# BlindOracle — Future Functionality

This document tracks expansion ideas and future features beyond the hackathon MVP. Items are organized by theme and roughly prioritized within each section.

---

## Game Modes

### Epoch-Based Night Rounds
- Fixed "night epoch" windows (e.g., every hour, every day at midnight UTC)
- All players enter during the epoch, round auto-locks at epoch close
- Creates anticipation and event-driven participation
- Strong thematic fit with "oracle" branding and Midnight's name

### Ranked Oracle Mode
- Players build a persistent reputation score based on predictive success
- Leaderboards (weekly, monthly, all-time)
- Ranking tiers with cosmetic badges
- Privacy-preserving leaderboard: prove your rank without revealing your full history

### Team Mode
- Groups of 2-4 players submit a collective secret value
- Team members vote on the team's guess
- Settlement is team vs team
- Introduces coordination and communication dynamics

### Tournament Brackets
- Single or double elimination brackets
- Multiple rounds per tournament
- Progressive stake increases (optional)
- Final table with God Window reveal for spectators

### Multi-Stage Hidden Logic
- Instead of one number, players commit to multi-part secrets or nested choices
- Example: commit to a number AND a category, guess both
- Partial credit for partial matches
- Increases strategic depth significantly

### Bluff Layer
- Players choose from multiple hidden signals — some real, some decoys
- Opponent must guess which signal is the "true" one
- Directly integrates bluffing mechanics (synergy with ProofOrBluff ecosystem)

### Creator / Custom Rooms
- Custom communities host branded prediction rounds
- Configurable parameters: range, stake, duration, God Window mode, theme
- Private invite-only rooms
- Community tournament hosting

---

## Ai Integration

### Ai Oracle Solo Play
- An Ai-driven oracle becomes the counterpart for single-player practice
- Ai commits its own secret number using a strategy model
- Difficulty levels: Random, Pattern-Based, Adaptive
- Useful for onboarding new players without needing a live opponent

### Ai Spectator Commentary
- Ai provides real-time commentary during God Window reveals
- Generates narrative around near-misses, streaks, upsets
- "The oracle speaks..." flavor text between rounds

### Ai Strategy Assistant
- Post-game analysis: "You tend to pick 7 — consider varying"
- Pattern detection across rounds
- Opt-in only — privacy of analysis results

---

## Social Features

### Spectator Mode
- Watch rounds in real-time without staking
- See player count, countdown, match assignments after lock
- God Window auto-opens for spectators after settlement
- Streaming-friendly layout

### Reactions and Chat
- In-round emote reactions (fire, eyes, skull, etc.)
- Post-settlement chat per match
- No chat during active play (preserves tension)

### Replay System
- Browse past rounds with full God Window data
- Share replays as links
- "Highlight reel" for dramatic moments

### Social Proof Badges
- Verifiable on-chain achievements:
  - "First Win"
  - "Perfect Round" (guessed correctly 3+ times in a row)
  - "Oracle Streak" (5+ consecutive correct guesses)
  - "Blind Faith" (entered 100 rounds)
- Privacy-preserving: prove you hold the badge without revealing your full history

---

## Monetization (Post-Hackathon)

### Entry Fee Rake
- Protocol takes a small percentage (2-5%) of each round's pot
- Configurable per room or mode

### Premium Private Rooms
- Pay to create a custom branded room with configurable rules
- One-time fee or monthly subscription

### Cosmetic Themes
- Custom UI skins: "Midnight Noir," "Oracle Gold," "Neon Cipher"
- Animated reveal effects for the God Window
- Custom card/number styles

### Tournament Events
- Sponsored or fee-based tournament entry
- Prize pools from entry fees + sponsors
- Featured on homepage

### Proof Collectible Badges
- Mint achievement badges as on-chain artifacts
- Tradeable or display-only (configurable)
- Integration with DIDz identity for cross-ecosystem recognition

---

## Protocol Extensions

### Private Polling
- Same commit-reveal pattern applied to surveys and polls
- Participants commit answers privately
- Aggregated results are revealed without individual disclosure
- Use case: community governance, market research

### Sealed-Bid Auctions
- Players commit hidden bids for an item or position
- After lock, highest bid wins
- Losers' bids are never revealed (or optionally revealed via God Window)
- Prevents bid sniping and strategic underbidding

### Selective-Reveal Prediction Markets
- Players commit predictions about real-world outcomes
- Settlement occurs when the oracle reports the actual result
- Correct predictors receive rewards
- Individual predictions can remain private

### Confidential Reputation System
- Players accumulate reputation scores based on game outcomes
- Can prove "my reputation is above X" without revealing exact score
- Transferable to other DIDzMonolith DApps via credential proofs

### Privacy-Preserving Lottery / Raffle
- Ticket purchase is a commitment
- Drawing selects winner(s) verifiably
- Ticket numbers revealed only for winners (or via God Window)

---

## Technical Improvements

### WebSocket Real-Time Updates
- Replace polling with WebSocket connections for round state changes
- Live player count updates during entry phase
- Instant settlement notifications

### Batch Settlement
- Optimize gas costs by settling multiple pairs in a single transaction
- Use merkle proofs for batch verification

### Cross-Chain Bridge (Long-Term)
- Allow entry from Cardano mainnet with bridge to Midnight
- Broader audience access
- NIGHT + ADA stake options

### Mobile-Responsive UI
- Touch-optimized commit flow
- Mobile-friendly God Window animations
- PWA support for home screen installation

### Analytics Dashboard
- Round statistics: participation rates, win distributions, popular numbers
- Aggregate analytics (privacy-preserving — no individual tracking)
- Useful for game balance tuning

---

## DIDzMonolith Ecosystem Integration

### DIDz Identity
- Optionally link BlindOracle profile to a `did:midnight:` identity
- Achievements and reputation tied to persistent identity
- Cross-game reputation portability

### ProofOrBluff Synergy
- Shared "bluff detection" mechanics
- Cross-promotion between games
- Unified achievement system

### KYCz Integration (Wagering Modes)
- For real-money modes, require ZK-KYC verification
- Prove age/jurisdiction without revealing identity
- Regulatory compliance without privacy sacrifice

---

## Brand and Thematic Expansion

### Seasonal Themes
- "Oracle's Eclipse" — dark mode limited event
- "Solstice Reveal" — extended God Window with full replay
- "Midnight Marathon" — 24-hour continuous rounds

### Lore System
- The BlindOracle as a character/entity in the game world
- Cryptic messages between rounds
- Progressive lore unlocks based on participation milestones

### Sound Design
- Ambient mystery soundscape during play
- Dramatic bass hit on God Window reveal
- Triumphant tone on win, somber tone on loss
- Optional — respects user's audio preferences

---

*This is a living document. Items will be prioritized and scheduled as the project evolves beyond the hackathon MVP.*
