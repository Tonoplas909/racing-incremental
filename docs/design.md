# Racing Incremental Game - Design Specification

**Date:** 2026-10-06  
**Project:** Racing Incremental Sim on GitHub Pages  
**Scope:** Single-file web game with local progression, no backend

---

## 1. Overview

A incremental/idle game where the player manages a racing circuit. Players don't control cars directly, but instead build and upgrade the circuit to earn money. Mechanics include adding track segments, managing multiple cars, and purchasing upgrades to increase earnings.

**Core Loop:**
- Cars race continuously around the circuit
- Player adds segments (turns, straights, checkpoints) via buttons
- Cars pass checkpoints and earn money
- Player spends money on upgrades (more cars, faster cars, higher payouts)
- Progression is saved locally; game continues when revisited

---

## 2. Feature Scope

### Must-Have
- Circuit as ordered list of segments (straights, left/right curves, checkpoints)
- 2D canvas rendering with smooth geometric shapes (rounded forms, no pixel art)
- Multiple cars racing continuously, progressing through the circuit
- Money earned when cars pass checkpoints
- Upgrades: add cars, increase car speed, increase checkpoint payout
- Local storage auto-save (JSON in localStorage)
- Add segment buttons that place new segments automatically without breaking the circuit

### Nice-to-Have (Phase 2+)
- Stats display (money/sec, total cars, average speed)
- Circuit quality upgrades (more efficient turns)
- Visual polish (animations, feedback)
- Reset button for new game

### Out of Scope
- Offline progression (no background simulation when tab is closed)
- Multiple circuits
- Advanced graphics or animations
- Leaderboards or multiplayer

---

## 3. Data Model

### Circuit
```
Circuit = [Segment, Segment, ...]

Segment = {
  id: string,
  type: "straight" | "curve_left" | "curve_right" | "checkpoint",
  length: number (in pixels or normalized units),
  checkpoint_payout: number (if type is checkpoint, else 0)
}
```

### Cars
```
Car = {
  id: string,
  progress: number (0.0 to 1.0, position in circuit),
  speed: number (units per frame, affects how fast progress advances),
  earnings: number (total earned by this car, for stats)
}
```

### Game State
```
GameState = {
  circuit: Circuit,
  cars: [Car, ...],
  totalMoney: number,
  checkpointPayout: number (base payout per checkpoint),
  carSpeed: number (current speed multiplier for new/all cars),
  stats: {
    moneyPerSecond: number,
    totalCheckpointsHit: number,
    totalMoneyEarned: number
  }
}
```

---

## 4. Rendering & Visuals

### Canvas Setup
- Single HTML5 canvas, 2D context
- Circuit drawn as connected path with smooth curves
- Cars rendered as small rounded rectangles or circles

### Circuit Visual Layout
- Segments positioned sequentially to form a closed loop
- Straights: horizontal or angled lines
- Curves: `quadraticCurveTo` or `bezierCurveTo` for smooth turns
- Checkpoints: distinct visual marker (ring, colored zone, etc.)
- All shapes use rounded corners/smooth transitions

### Car Rendering
- Position calculated based on `progress` and segment layout
- Small geometric shapes (rounded rectangle ~10x15px or circle ~8px)
- Different colors for visual distinction (optional)

### UI Elements
- Top bar: buttons to add segments
  - "Add Straight"
  - "Add Left Turn"
  - "Add Right Turn"
  - "Add Checkpoint"
- Stats panel: display current money, cars count, money/sec
- Upgrade panel: buttons and costs for upgrades

---

## 5. Simulation

### Car Movement
- Each frame (requestAnimationFrame), update all cars:
  ```
  car.progress += (car.speed * deltaTime) % 1.0
  ```
- Progress wraps at 1.0 (car loops back to start)

### Checkpoint Detection
- Track previous progress and current progress for each car per frame
- If car crosses a checkpoint segment boundary, add money:
  ```
  totalMoney += checkpointPayout
  car.earnings += checkpointPayout
  ```

### Adding Segments
- When player clicks "Add [Type]", insert new segment at the end of the circuit
  - Segments are appended sequentially, forming a closed loop
  - Visual layout adapts: circuit redistributes evenly on canvas to fit new length
  - If circuit grows too large visually, scale down the zoom or redistribute segments (Phase 2 optimization)

---

## 6. Upgrades & Economy

### Upgrade Types
| Upgrade | Cost Formula | Effect |
|---------|--------------|--------|
| New Car | `base_cost * (num_cars + 1)` | Add 1 car to the circuit |
| Speed Boost | `base_cost * speedLevel` | Increase all car speeds by 10% |
| Checkpoint Payout | `base_cost * payoutLevel` | Increase checkpoint earnings by 10% |

### Initial Values (TBD after testing)
- `base_cost` for car: 100
- `base_cost` for speed: 50
- `base_cost` for payout: 75
- Starting money: 0
- Starting cars: 2
- Starting speed: 1.0
- Starting checkpoint payout: 10

---

## 7. Persistence

### Auto-Save
- Save full `GameState` to `localStorage.racingGame` every 5 seconds or on upgrade purchase
- Format: JSON string

### Load on Startup
- Check `localStorage.racingGame`
- If exists, parse and restore state
- If not, create default state (circuit with 2 straights and 2 checkpoints, 2 cars)

### Clear/Reset (Phase 2)
- Optional button to clear localStorage and restart

---

## 8. User Interface Flow

1. **Startup**: Load from localStorage or create default circuit
2. **Main Loop**: 
   - Render circuit and cars
   - Update car positions
   - Detect checkpoint hits
   - Update money display
3. **Player Action**: Click segment button → circuit updates → UI refreshes
4. **Upgrade**: Click upgrade button → deduct money → apply effect → save state

---

## 9. Technical Stack

- **Language**: JavaScript (vanilla, no frameworks initially)
- **Rendering**: HTML5 Canvas 2D
- **Storage**: localStorage
- **Deployment**: GitHub Pages (static files)
- **File Structure**: Single HTML file + CSS inline + JS inline (or separate .js for clarity)

---

## 10. Testing Strategy

- Manual testing of:
  - Car movement and checkpoint detection
  - Money calculation and display
  - Upgrade costs and effects
  - Save/load cycle
  - Adding segments without visual overlap
- No unit tests initially (Phase 2+)

---

## 11. Acceptance Criteria

- [ ] Game runs locally without errors
- [ ] Cars move smoothly and loop the circuit
- [ ] Checkpoints award money correctly
- [ ] Upgrades apply and costs deduct money
- [ ] Game state persists via localStorage
- [ ] New segments can be added without breaking the circuit
- [ ] UI is responsive and clear (mobile-friendly not required v1)
