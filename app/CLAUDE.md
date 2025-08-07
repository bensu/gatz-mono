# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Start development: `yarn start`
- Run on Android: `yarn android`
- Run on iOS: `yarn ios`
- Run on web: `yarn web`
- Run tests: `yarn test`
- Run single test: `yarn test src/path/to/file.test.ts`
- Check types `npx tsc --noEmit`

## Code Style

- TypeScript with Expo's base configuration
- React Native + Expo Router for navigation
- Jest for testing, with files matching `**/*.test.ts` or `**/*.test.tsx`
- ES module imports with explicit types
- Error handling with try/catch and console.error
- Component props use explicit type definitions (React.FC<Props>)
- Theme and styles defined in src/gatz/styles.ts
- Context pattern for global state (src/context/\*)
- Async/await for asynchronous operations

## App purpose

This is a chat application:

- It has a feed where people can post
- Each post opens a chat room where people can discuss the post

## Instructions

When you get the first instruction in the session, look at the codebase to make a plan of what you need to implement.

Never commit code yourself. Ask me to do all git operations that involve changing the current directory or files like git checkout or git reset. You can freely call git diff, git show, and other operations without side-effects.
