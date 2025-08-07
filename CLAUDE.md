# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### App (React Native/Expo)
- Start development: `cd app && yarn start`
- Run on Android: `cd app && yarn android`
- Run on iOS: `cd app && yarn ios`
- Run on web: `cd app && yarn web`
- Run tests: `cd app && yarn test`
- Run single test: `cd app && yarn test src/path/to/file.test.ts`
- Type check: `cd app && npx tsc --noEmit`

### Server (Clojure)
- Start server: `cd server && clojure -M -m gatz.system`
- Run tests: `cd server && clojure -M:test`
- Build uberjar: `cd server && lein uberjar`
- REPL: `cd server && clojure -M:repl`

## Architecture

This is a **monorepo** containing a chat application with the following structure:

### `/app` - React Native/Expo Frontend
- **Framework**: React Native with Expo Router for navigation
- **State Management**: Zustand stores, React Context for global state
- **Navigation**: File-based routing via Expo Router in `src/app/`
- **Key Components**:
  - `src/gatz/client.ts`: Main API client classes (`OpenClient`, `GatzClient`, `GatzSocket`)
  - `src/context/`: React contexts (Session, Theme, FrontendDB, Modal providers)
  - `src/components/`: Reusable UI components and screens
  - `src/gifted/`: Custom GiftedChat implementation
- **Testing**: Jest with React Native Testing Library
- **Shared Code**: Vendors shared CRDT logic from `vendor/shared/`

### `/server` - Clojure Backend
- **Framework**: Biff framework (web framework built on Ring/Reitit)
- **Database**: XTDB with PostgreSQL for transaction log/document store
- **Key Namespaces**:
  - `gatz.system`: Main system configuration and startup
  - `gatz.api`: HTTP API endpoints
  - `gatz.db.*`: Database layer with transaction functions
  - `gatz.crdt.*`: CRDT (Conflict-free Replicated Data Types) implementations
- **WebSocket**: Real-time connections via `/ws/connect`
- **Testing**: Clojure test with files ending in `_test.clj`
- **Dependencies**: Managed via `deps.edn` (tools.deps) with Leiningen for uberjar builds

### `/backlog` - Task Management (via MCP)
- Structured backlog system with projects, specs, and tasks
- Integrated with git commit tracking

## Application Domain

**Chat Application Features**:
- **Feed**: Users post content that others can see and respond to
- **Discussions**: Each post opens a chat room for threaded conversations  
- **Groups**: Organized chat rooms with member management
- **Contacts**: User relationships and contact management
- **Real-time**: WebSocket connections for live updates
- **Mobile-First**: Native iOS/Android apps with web fallback

## Key Integration Points

- **CRDT Synchronization**: Shared conflict resolution logic between frontend and backend
- **WebSocket Protocol**: Real-time message synchronization using EDN format
- **Authentication**: JWT-based auth with token migration support
- **File Uploads**: S3 integration for media (avatars, message attachments)
- **Push Notifications**: Expo notifications with server-side triggers

## Development Notes

- The app has an existing CLAUDE.md in `/app` - this root-level file covers the full monorepo
- Never commit code yourself - ask user to handle git operations
- Frontend uses TypeScript strict mode with explicit type definitions
- Server uses Clojure with Malli schemas for validation
- Both parts include comprehensive test suites that should be run before commits