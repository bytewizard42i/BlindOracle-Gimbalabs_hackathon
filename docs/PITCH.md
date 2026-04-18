# BlindOracle — Pitch

## One-Liner

**BlindOracle** is a privacy-preserving prediction game on Midnight where players commit hidden secrets, guess blindly, and settle outcomes through zero-knowledge proofs.

---

## The Problem

Most games and decision systems assume that fairness requires full visibility. Every card is eventually shown, every vote is publicly tallied, every bid is revealed. But full exposure is not the only path to trust — and in many cases, it destroys the very tension that makes the experience compelling.

## The Insight

Games can be **more exciting** when hidden information remains hidden during play, but outcomes are still verifiable. Privacy is not just about hiding data — it is about **controlling when, how, and to whom truth is revealed**.

## The Solution

BlindOracle lets players:
1. **Commit** to a secret number — privately, on-chain
2. **Guess** what their unknown opponent chose
3. **Settle** through verifiable logic after the round locks
4. **Prove** the outcome without exposing everyone's private state

An optional **God Window** creates a dramatic post-settlement reveal for spectators and replays.

## Why Midnight?

Midnight is the **only** blockchain that makes this possible at the protocol level:

- **Private inputs** via zero-knowledge circuits
- **Selective revelation** — show exactly what needs to be shown, nothing more
- **Provable settlement** — cryptographic guarantees replace trust assumptions
- **On-chain commitments** — secrets are locked before matching, non-malleable

If everything were public, the tension disappears.
If nothing could be proven, trust disappears.
**Midnight lets the design live in the middle.** That middle is the product.

## MVP

- Players enter a round and commit a secret number (1-10) + a guess (1-10)
- Round closes → commitments lock → players are randomly paired
- Each guess is checked against the paired opponent's secret
- Winners receive the pot; all players receive a proof of outcome
- God Window optionally reveals all secrets after settlement

## Market Fit

| Audience | Why They Care |
|----------|---------------|
| **Midnight community** | Memorable showcase of selective privacy |
| **Hackathon judges** | Clear concept, strong Midnight alignment, visual demo |
| **Crypto gamers** | Novel mechanic — provable mystery, not just another casino |
| **Privacy advocates** | Demonstrates controlled disclosure in practice |
| **Developers** | Reusable pattern for sealed-bid, polling, matchmaking systems |

## Broader Protocol Applications

The BlindOracle pattern extends directly into:
- Private polling and surveys
- Sealed-bid auctions
- Confidential matchmaking
- Privacy-preserving raffles and lotteries
- Selective-reveal prediction markets
- Reputation systems with hidden scoring

## Taglines

- **Truth exists. Visibility is optional.**
- **Guess in the dark. Settle in certainty.**
- **Hidden choices. Provable outcomes.**
- **The game of unseen truth.**

## Team

**John Santi** — Midnight NightForce Bravo, Midnight Ambassador, Midnight Academy Triple Certified, Cardano Certified Blockchain Associate, Emurgo Certified Blockchain Business Consultant

## Ask

BlindOracle demonstrates that privacy-preserving systems can be **emotionally engaging**, not just technically impressive. We are building a product that is fun on its own, easy to demo, and serves as a memorable demonstration of selective privacy in action.

**BlindOracle is a game where players do not need to see everything to trust the outcome.**
