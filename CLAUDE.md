# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the React TypeScript frontend for the Big Two card game. It provides a real-time multiplayer interface that connects to the Rust backend via REST APIs and WebSockets. The app features complete gameplay mechanics, real-time updates, drag-and-drop card interactions, and responsive game state management.

## Development Commands

```bash
# Development server with hot reload and HTTPS
npm run dev

# Production build (TypeScript compilation + Vite build)
npm run build

# ESLint for code quality
npm run lint

# Preview production build locally
npm run preview

# Generate TypeScript types from backend OpenAPI spec
npm run gen

# Install dependencies
npm install
```

## Key Features

### Production-Ready WebSocket Connection
- **Auto-reconnection**: Industry-standard exponential backoff with jitter
- **Connection resilience**: Immediate reconnect on page visibility and network events
- **Connection indicators**: Visual feedback for reconnecting/failed states
- **Heartbeat monitoring**: Optional application-level health checks

### Desktop Keyboard Shortcuts
- **Fast card selection**: Press rank keys (2-9, T, J, Q, K, A) to instantly select cards
- **Cycling**: Press same rank multiple times to cycle through cards
- **Arrow navigation**: Navigate cards with cursor (←/→)
- **Quick actions**: Enter to play, P to pass, Backspace to clear
- **Help dialog**: Built-in keyboard shortcuts reference (? button)

### Responsive Mobile-First Design
- **Adaptive card sizing**: Different card dimensions for mobile/tablet/desktop
- **Mobile-optimized UI**: Compact opponent display, larger play area
- **Snap scrolling**: Smooth card navigation on mobile devices
- **Touch-friendly**: Optimized button sizes and spacing

### Enhanced Game Experience
- **Per-player last plays**: See what each opponent played last
- **Bot indicators**: Clear badges for AI players
- **Batch card operations**: Drag multiple selected cards at once
- **Connection awareness**: Prevent actions when offline

## Architecture Overview

### Tech Stack
- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router DOM** for client-side routing
- **Axios** for REST API communication
- **ReconnectingWebSocket** for real-time game communication with automatic reconnection
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** component library (built on Radix UI primitives)
- **lucide-react** for icons
- **class-variance-authority** and **tailwind-merge** for component variants

### Application Structure
```
src/
├── components/          # React components organized by feature
│   └── ui/             # shadcn/ui components (button, card, badge, alert, dialog, etc.)
├── contexts/           # React contexts for global state
│   ├── SessionContext.tsx   # User authentication and session management
│   └── ThemeContext.tsx     # Dark/light theme switching
├── services/           # API and WebSocket communication layers
│   ├── api.ts          # REST API client with Axios
│   ├── websocket-reconnect.ts # ReconnectingWebSocket with exponential backoff
│   ├── socket.ts       # WebSocket client utilities
│   └── session.ts      # Session storage management
├── hooks/              # Custom React hooks
│   ├── useKeyboardShortcuts.ts  # Game keyboard shortcuts (desktop only)
│   ├── useMediaQuery.ts         # Responsive design hooks
│   └── useSession.ts            # Session management hook
├── utils/              # Helper functions and utilities
│   ├── cardSorting.ts  # Card sorting logic (numerical, by suit)
│   ├── cardDisplay.ts  # Card display utilities (suit colors, symbols, rank display)
│   ├── config.ts       # App configuration
│   └── jwt.ts          # JWT utilities
├── lib/                # Utility functions (cn for class merging)
├── types.d.ts          # Generated types from backend OpenAPI spec
├── types.websocket.d.ts # Generated WebSocket message types
└── App.tsx             # Main application component with routing
```

## Component Architecture

### Core Components

#### App.tsx (src/App.tsx:10)
- Main application entry point with routing logic
- Manages global error states and game state transitions
- Handles navigation between lobby and game rooms
- Manages session context and dark mode theming

#### GameRoom.tsx (src/components/GameRoom.tsx:29)
- Central component for the game room experience
- Manages WebSocket connection lifecycle and message handling
- Handles lobby state (waiting for players) and transitions to gameplay
- Integrates chat, player list, and game controls
- Switches to `GameScreen` when game starts

#### GameScreen.tsx (src/components/GameScreen.tsx:33)
- Complete Big Two game interface implementation with full keyboard shortcuts support (desktop only)
- Manages complex game state including turn progression, card validation, and focused card tracking
- Handles player positioning in 4-player layout (top, left, right, bottom)
- Integrates card selection, sorting, and play/pass actions
- Displays game status, last played cards, and win conditions
- Shows connection state indicators (reconnecting/failed banners)
- Per-player last played cards tracking for better game visibility
- Bot badge display for AI players
- Responsive mobile/desktop layouts with optimized opponent displays
- Help dialog showing keyboard shortcuts reference

#### PlayerHand.tsx (src/components/PlayerHand.tsx:121)
- Advanced drag-and-drop card interface with batch card dragging
- Supports both single card and multiple selected cards dragging
- Visual feedback for card selection, drop targets, and focused cards (keyboard navigation)
- Real-time card reordering with smooth interactions
- Responsive card sizing (mobile: 50x70px, tablet: 65x91px, desktop: 90x126px)
- Snap scroll on mobile/tablet for better card visibility
- Optimized card overlap for different screen sizes

### Supporting Components
- **Lobby.tsx**: Room creation, joining, and browsing interface
- **ChatBox.tsx**: Real-time chat functionality within game rooms
- **PlayerList.tsx**: Display of players in room with host indication
- **Header.tsx**: Navigation header with user info and back button
- **RoomContainer.tsx**: Wrapper component managing room details and game state

## Styling Architecture

### Tailwind CSS Configuration
- **Config file**: `tailwind.config.js` with custom theme extensions
- **Dark mode**: Class-based strategy (`darkMode: ["class"]`)
- **CSS variables**: HSL-based color system for theme consistency
- **Plugins**: `tailwindcss-animate` for animations

### Component Styling Patterns
- **Utility-first**: Use Tailwind classes directly in JSX
- **Class merging**: Use `cn()` utility from `lib/utils.ts` to conditionally merge classes
- **Component variants**: Use `class-variance-authority` (cva) for complex component variations
- **shadcn/ui components**: Pre-styled, accessible components in `components/ui/`

### Color System
The app uses CSS variables for theming with HSL values:
- `--background`, `--foreground`: Base colors
- `--primary`, `--secondary`, `--accent`: Brand colors
- `--muted`, `--destructive`: Semantic colors
- `--card`, `--border`, `--input`: UI element colors
- All colors support light/dark mode variants

### Dark Mode Implementation
- Toggle via `ThemeContext` which adds/removes `dark` class on document root
- Tailwind's `dark:` variant for dark mode styles
- All colors defined with CSS variables that change based on theme
- Persistent preference stored in localStorage

## State Management

### Context Providers

#### SessionContext (src/contexts/SessionContext.tsx:16)
Manages user authentication and session state:
- Auto-generated usernames with 7-day JWT session expiry
- Session validation and automatic token refresh
- Logout functionality with session cleanup
- Used by: All components requiring user identity

#### ThemeContext (src/contexts/ThemeContext.tsx:13)
Manages dark/light theme switching:
- Persistent theme preference in localStorage
- Toggles `dark` class on document root for Tailwind dark mode
- Theme toggle functionality
- Used by: Components needing theme-aware styling

### Local State Patterns
- **GameScreen**: Complex state object with players, turn management, card selection, and game status
- **GameRoom**: WebSocket connection state, chat messages, and player lists
- **PlayerHand**: Drag-and-drop state with selection tracking and visual feedback

## Services Layer

### API Service (src/services/api.ts:5)
REST API communication with automatic session management:
- **Endpoints**: Room creation, joining, listing, and details
- **Authentication**: Automatic X-Session-ID header injection
- **Error handling**: JWT expiration detection and session cleanup
- **Type safety**: Uses generated types from backend OpenAPI spec

### ReconnectingWebSocket Service (src/services/websocket-reconnect.ts)
Industry-standard WebSocket client with automatic reconnection:
- **Exponential backoff**: Prevents thundering herd with jitter (1s to 30s delay)
- **Configurable retry limits**: Default 10 attempts, customizable
- **Connection state tracking**: CONNECTING, CONNECTED, DISCONNECTED, RECONNECTING, FAILED
- **Smart reconnection triggers**: Immediate reconnect on page visibility and network online events
- **Heartbeat mechanism**: Optional application-level heartbeat for connection health checks
- **Multiple listeners**: Support for multiple message handlers (GameRoom + GameScreen)
- **Proper cleanup**: Removes event listeners and clears timers on unmount

### WebSocket Service (src/services/socket.ts:3)
Legacy WebSocket utilities (being phased out in favor of ReconnectingWebSocket):
- **Connection management**: Room-specific WebSocket connections with session authentication
- **Protocol**: JSON message format with type, payload, and metadata

### Session Service (src/services/session.ts)
Session and localStorage management:
- JWT token storage and retrieval
- Session creation and validation
- Cleanup on logout or expiration

## Custom Hooks

### useKeyboardShortcuts (src/hooks/useKeyboardShortcuts.ts)
Desktop-only keyboard shortcuts for fast gameplay:
- **Card selection by rank**: Press 2-9, T (10), J, Q, K, A to select cards
  - Cycling: Press same rank key multiple times to cycle through cards of that rank
  - Stack behavior: After cycling all cards, press again to deselect the first one
- **Cursor navigation**: Arrow keys (←/→) to move cursor between cards
- **Selection actions**:
  - Up arrow: Select card at cursor
  - Down arrow: Deselect card at cursor
  - Space: Toggle selection at cursor
- **Game actions**:
  - Enter: Play selected cards
  - P: Pass turn (when cards are on table)
  - Backspace: Clear all selections
  - Escape: Clear cursor focus
- **Hold + Arrow**: Hold rank key + arrow keys to scroll through cards of that rank
- **Auto-repeat**: Arrow keys repeat after 300ms delay at 100ms intervals
- **Safety**: Disabled during input focus (text fields) and when game is won

### useMediaQuery (src/hooks/useMediaQuery.ts)
Responsive design hooks for viewport detection:
- **useMediaQuery(query)**: Generic media query matcher
- **useIsMobile()**: Returns true for screens < 768px (Tailwind md breakpoint)
- **useIsSmallMobile()**: Returns true for screens < 640px (Tailwind sm breakpoint)
- **useScreenSize()**: Returns 'mobile' (<640px), 'tablet' (640-767px), or 'desktop' (≥768px)
- **Optimized**: Single resize listener with debouncing for performance

### useSession (src/hooks/useSession.ts)
Session management hook:
- Session validation and token management
- Automatic session refresh on mount
- Logout functionality with cleanup

## WebSocket Message Handling

### Message Types
Generated from backend WebSocket protocol (src/types.websocket.d.ts):
- **Client→Server**: `CHAT`, `MOVE`, `START_GAME`, `LEAVE`, `HEARTBEAT` (internal)
- **Server→Client**: `PLAYERS_LIST`, `HOST_CHANGE`, `MOVE_PLAYED`, `TURN_CHANGE`, `GAME_STARTED`, `GAME_WON`, `ERROR`, `HEARTBEAT_ACK` (internal)

### Message Flow
1. **GameRoom** handles lobby-related messages (chat, players, host changes)
2. **GameScreen** handles game-specific messages (moves, turns, win conditions)
3. Both components use message handler objects with type-safe message processing

## Game Logic Implementation

### Card System

#### Card Sorting (src/utils/cardSorting.ts:5)
Big Two card mechanics:
- **Ranks**: 3 (lowest) → 2 (highest)
- **Suits**: Diamonds < Clubs < Hearts < Spades
- **Format**: "3D", "KH", "AS" (rank + suit)
- **Sorting types**:
  - `numerical`: Sort by rank (3 → 2)
  - `suit`: Group by suit (♦♣♥♠)
- **Utilities**:
  - `sortSelectedCards()`: Sort selected cards while maintaining unselected order
  - `findCardsByRank()`: Find all cards matching a specific rank

#### Card Display (src/utils/cardDisplay.ts)
Display utilities for cards:
- **getSuitColorClass(suit, theme)**: Returns Tailwind CSS class for suit color
  - Red suits (♥♦): `text-destructive`
  - Black suits (♠♣): `text-black` or `text-white` based on theme
- **getSuitSymbol(suit)**: Returns Unicode symbol for suit
  - H → ♥, D → ♦, S → ♠, C → ♣
- **getRankDisplay(rank)**: Converts "T" to "10" for readability
  - All other ranks (2-9, J, Q, K, A) pass through unchanged

### Game State Management
- **Turn progression**: Automatic turn rotation with skip logic for invalid moves
- **Card validation**: Real-time feedback on playable cards
- **Win conditions**: Player elimination tracking and winner announcement
- **Pass mechanics**: Players can pass with cards remaining on table until next valid play
- **Per-player last plays**: Track each player's last played cards for better game visibility
- **Focused card tracking**: Keyboard navigation cursor position for desktop users
- **Connection awareness**: Game state updates respect connection status to prevent actions when offline

### Player Positioning (src/components/GameScreen.tsx:35)
Dynamic 4-player layout calculation:
- Current player always at bottom
- Opponents positioned clockwise: right, top, left
- Card count display for opponents
- Turn indicator visualization
- **Desktop layout**: Full opponent displays with rotated side players
- **Mobile layout**: Compact opponent cards in horizontal bar at top
- **Per-player cards**: Each opponent's last played cards shown individually

## Development Patterns

### Type Safety
- **Generated types**: Backend OpenAPI spec generates REST API types via `npm run gen`
- **WebSocket types**: Strongly typed message handling with payload validation
- **Component props**: Full TypeScript coverage for all component interfaces

### Error Handling
- **API errors**: Axios interceptors for JWT expiration and network errors
- **WebSocket errors**: Connection lifecycle management with error logging
- **User feedback**: Error messages displayed in UI with appropriate context

### Performance Optimizations
- **Card rendering**: Efficient drag-and-drop with minimal re-renders
  - Responsive card sizing based on screen size (mobile/tablet/desktop)
  - Optimized card overlap calculations
- **WebSocket messages**: Selective message processing to avoid unnecessary updates
  - Message handler objects for type-safe, efficient routing
  - HEARTBEAT/HEARTBEAT_ACK messages filtered from application handlers
- **State updates**: Immutable state patterns for reliable React updates
- **Keyboard shortcuts**: Refs for stable callbacks, debounced event handlers
- **Media queries**: Single resize listener with state-based memoization
- **Connection management**: Exponential backoff prevents server overload on reconnection

## Common Development Tasks

### Adding New Components
1. Create component in appropriate `components/` subdirectory
2. Import and use existing contexts (`SessionContext`, `ThemeContext`)
3. Follow existing naming patterns and TypeScript interfaces
4. Use Tailwind utility classes for styling
5. For reusable UI components, consider adding to `components/ui/` following shadcn patterns

### Handling New WebSocket Messages
1. Add message type to `types.websocket.d.ts` (usually auto-generated)
2. Add handler in appropriate component (`GameRoom` or `GameScreen`)
3. Update message handler object with type-safe processing
4. For internal/control messages (like HEARTBEAT_ACK), handle in `ReconnectingWebSocket.handleMessage()` and return early to avoid passing to app handlers
5. Test message flow with backend integration, including reconnection scenarios

### API Integration
1. Add new endpoint functions to `src/services/api.ts`
2. Use generated types from `types.d.ts` for request/response typing
3. Handle errors appropriately with user feedback
4. Update components to use new API functions

### Adding Bot Support
The backend supports AI bots via `POST /room/{room_id}/bot/add` endpoint. Bots appear as regular players in the game and play automatically.

### Styling Updates
1. Use Tailwind utility classes for styling components
2. Use shadcn/ui components from `components/ui/` for common UI elements
3. Global styles and CSS custom properties in `index.css`
4. Dark mode support via Tailwind's `dark:` variant (class-based strategy)
5. Use `cn()` utility from `lib/utils.ts` to merge Tailwind classes conditionally
6. Component variants managed with `class-variance-authority` (cva)
7. Follow shadcn/ui component patterns for consistency

### Adding shadcn/ui Components
To add new shadcn/ui components:
```bash
npx shadcn@latest add <component-name>
```
This will automatically add the component to `src/components/ui/` with proper styling and TypeScript types.

### Implementing Keyboard Shortcuts
1. Use `useKeyboardShortcuts` hook in your component
2. Pass handlers for each shortcut action (onRankKey, onArrowKey, etc.)
3. Set `isEnabled` to control when shortcuts are active (e.g., desktop only, game in progress)
4. The hook automatically handles:
   - Key repeat for arrow keys
   - Ignoring shortcuts when typing in input fields
   - Cleanup on unmount

### Adding Responsive Features
1. Use `useScreenSize()` hook to get current breakpoint ('mobile', 'tablet', 'desktop')
2. Define responsive constants (like `CARD_DIMENSIONS`) with values for each breakpoint
3. Use Tailwind responsive classes (sm:, md:, lg:) for layout changes
4. Test across all breakpoints - particularly mobile (< 640px) and desktop (≥ 768px)

## Responsive Design

### Breakpoints
Following Tailwind CSS default breakpoints:
- **Mobile**: < 640px (sm breakpoint)
- **Tablet**: 640px - 767px (between sm and md)
- **Desktop**: ≥ 768px (md breakpoint and above)

### Responsive Features
- **Card sizing**: Dynamic card dimensions (PlayerHand.tsx:10-26)
  - Mobile: 50x70px with reduced overlap (-28px gap)
  - Tablet: 65x91px with medium overlap (-20px gap)
  - Desktop: 90x126px with spacing (12px gap)
- **Keyboard shortcuts**: Desktop only (disabled on mobile/tablet)
- **Layout adaptations**:
  - Desktop: Full 4-player layout with rotated side players
  - Mobile: Compact opponent bar at top, larger center play area
- **Font scaling**: Responsive text sizes based on card dimensions
- **Snap scrolling**: Mobile card hand uses snap scroll for better card visibility
- **Touch optimizations**: Touch-friendly button sizes and spacing on mobile

## Testing Strategy

Currently the frontend relies on manual testing and integration testing with the backend. Key test scenarios:
- **Session management**: Login, session expiration, logout flows
- **Room lifecycle**: Creating, joining, leaving rooms
- **Game progression**: Full game from start to win condition
- **Real-time features**: WebSocket message handling and UI updates
  - Reconnection behavior (exponential backoff, page visibility, network events)
  - Connection state indicators
- **Card interactions**: Drag-and-drop, selection, sorting functionality
  - Batch card dragging
  - Keyboard shortcuts (desktop only)
- **Responsive design**: Test across mobile, tablet, and desktop viewports

## UI Framework - Tailwind CSS + shadcn/ui

The frontend uses Tailwind CSS with shadcn/ui components for a modern, customizable UI:

### Current Stack
- **Tailwind CSS**: Utility-first CSS framework for styling
- **shadcn/ui**: Copy-paste component library built on Radix UI primitives
- **class-variance-authority (CVA)**: Component variant system
- **lucide-react**: Icon library

### Benefits
- **Utility-first**: Highly flexible and customizable styling approach
- **No runtime overhead**: Pure CSS, no CSS-in-JS runtime cost
- **Full ownership**: Components are copied into the project, not imported from npm
- **Type safety**: Full TypeScript support with CVA for variants
- **Accessibility**: Built on Radix UI primitives with WAI-ARIA compliance
- **Dark mode**: Built-in dark mode support via Tailwind's class strategy

### Component Development
- Use Tailwind classes for component styling
- Use shadcn/ui components from `components/ui/` for UI elements
- Run `npx shadcn@latest add <component>` to add new UI components
- Use `cn()` utility for conditional class merging
- Define variants with CVA for complex component states

## Build and Deployment

### Development Build
- Uses Vite dev server with hot module replacement
- HTTPS enabled via `@vitejs/plugin-basic-ssl` for secure WebSocket connections
- Proxy configuration may be needed for backend API calls

### Production Build
- TypeScript compilation check (`tsc -b`) followed by Vite build
- Static asset optimization and code splitting
- Environment-specific configuration for API endpoints

## Integration with Backend

### API Compatibility
- REST endpoints expect `X-Session-ID` header for authentication
- WebSocket connections authenticate via `session_id` query parameter
- Generated types ensure frontend/backend type compatibility

### Development Workflow
- Backend must be running for full functionality
- Use `npm run gen` after backend OpenAPI spec changes
- WebSocket protocol changes require manual type updates
- Test reconnection behavior by:
  - Stopping/starting backend server
  - Switching browser tabs (page visibility)
  - Disabling/enabling network
- Connection state should show appropriate indicators (RECONNECTING/FAILED banners)