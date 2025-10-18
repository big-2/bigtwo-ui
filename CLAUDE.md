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

## Architecture Overview

### Tech Stack
- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router DOM** for client-side routing
- **Axios** for REST API communication
- **Native WebSocket API** for real-time game communication
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** component library (built on Radix UI primitives)
- **lucide-react** for icons
- **class-variance-authority** and **tailwind-merge** for component variants

### Application Structure
```
src/
├── components/          # React components organized by feature
│   └── ui/             # shadcn/ui components (button, card, badge, alert, etc.)
├── contexts/           # React contexts for global state
├── services/           # API and WebSocket communication layers
├── hooks/              # Custom React hooks
├── utils/              # Helper functions and utilities
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
- Complete Big Two game interface implementation
- Manages complex game state including turn progression and card validation
- Handles player positioning in 4-player layout (top, left, right, bottom)
- Integrates card selection, sorting, and play/pass actions
- Displays game status, last played cards, and win conditions

#### PlayerHand.tsx (src/components/PlayerHand.tsx:121)
- Advanced drag-and-drop card interface
- Supports both single card and batch card dragging
- Visual feedback for card selection and drop targets
- Real-time card reordering with smooth interactions

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

### WebSocket Service (src/services/socket.ts:3)
Real-time game communication:
- **Connection management**: Room-specific WebSocket connections with session authentication
- **Protocol**: JSON message format with type, payload, and metadata
- **Reconnection**: Basic connection lifecycle management

### Session Service (src/services/session.ts)
Session and localStorage management:
- JWT token storage and retrieval
- Session creation and validation
- Cleanup on logout or expiration

## WebSocket Message Handling

### Message Types
Generated from backend WebSocket protocol (src/types.websocket.d.ts):
- **Client→Server**: `CHAT`, `MOVE`, `START_GAME`, `LEAVE`
- **Server→Client**: `PLAYERS_LIST`, `HOST_CHANGE`, `MOVE_PLAYED`, `TURN_CHANGE`, `GAME_STARTED`, `GAME_WON`, `ERROR`

### Message Flow
1. **GameRoom** handles lobby-related messages (chat, players, host changes)
2. **GameScreen** handles game-specific messages (moves, turns, win conditions)
3. Both components use message handler objects with type-safe message processing

## Game Logic Implementation

### Card System (src/utils/cardSorting.ts:5)
Big Two card mechanics:
- **Ranks**: 3 (lowest) → 2 (highest)
- **Suits**: Diamonds < Clubs < Hearts < Spades
- **Format**: "3D", "KH", "AS" (rank + suit)
- **Sorting**: Numerical (by rank) or by suit grouping

### Game State Management
- **Turn progression**: Automatic turn rotation with skip logic for invalid moves
- **Card validation**: Real-time feedback on playable cards
- **Win conditions**: Player elimination tracking and winner announcement
- **Pass mechanics**: Players can pass with cards remaining on table until next valid play

### Player Positioning (src/components/GameScreen.tsx:35)
Dynamic 4-player layout calculation:
- Current player always at bottom
- Opponents positioned clockwise: right, top, left
- Card count display for opponents
- Turn indicator visualization

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
- **WebSocket messages**: Selective message processing to avoid unnecessary updates
- **State updates**: Immutable state patterns for reliable React updates

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
4. Test message flow with backend integration

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

## Testing Strategy

Currently the frontend relies on manual testing and integration testing with the backend. Key test scenarios:
- **Session management**: Login, session expiration, logout flows
- **Room lifecycle**: Creating, joining, leaving rooms
- **Game progression**: Full game from start to win condition
- **Real-time features**: WebSocket message handling and UI updates
- **Card interactions**: Drag-and-drop, selection, sorting functionality

## UI Framework Migration

The frontend is currently migrating from Mantine UI to Tailwind CSS + shadcn/ui:

### Migration Status
- **In Progress**: Components are being gradually migrated to use Tailwind and shadcn/ui
- **Coexistence**: Both Mantine and Tailwind dependencies may be present during migration
- **Target**: Complete migration to Tailwind + shadcn/ui for better customization and smaller bundle size

### Why Tailwind + shadcn/ui?
- **Utility-first**: More flexible and customizable styling approach
- **Smaller bundle**: No runtime CSS-in-JS overhead
- **Better DX**: Faster development with utility classes
- **Copy-paste components**: shadcn/ui components are owned by the project, not a dependency
- **Better TypeScript**: Full type safety with component variants via CVA

### During Migration
- Prefer using Tailwind classes for new components
- Use shadcn/ui components from `components/ui/` when available
- Existing Mantine components will be gradually replaced
- Run `npx shadcn@latest add <component>` to add new UI components

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