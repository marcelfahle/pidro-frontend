# Pidro Mobile Client - Project Setup Masterplan

**Last Updated**: November 23, 2025
**Target**: React Native + Expo MVP (iOS/Android/Web)
**Backend**: Phoenix/Elixir Server (already built)

---

## Executive Summary

This plan details the setup of a modern React Native mobile application using **Expo SDK 54+** with the **New Architecture**, targeting iOS and Android app stores with potential web support. The client will connect to your existing Phoenix server via WebSocket (Phoenix Channels) for real-time multiplayer gameplay.

**Key Technology Decisions:**

- ✅ **Expo** - Industry standard, excellent DX, supports all platforms
- ✅ **Expo Router** - File-based routing (Next.js paradigm)
- ✅ **NativeWind v4** - Tailwind CSS for React Native (future-proof for web)
- ✅ **Zustand** - Lightweight global state
- ✅ **TanStack Query** - Server state & API caching
- ✅ **Phoenix.js** - Official Phoenix Channels client
- ✅ **TypeScript** - Type safety throughout
- ✅ **EAS** - Cloud builds & App Store deployment
- ✅ **pnpm** - Fast, efficient package manager

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Project Initialization](#project-initialization)
3. [Folder Structure](#folder-structure)
4. [Core Dependencies](#core-dependencies)
5. [Configuration Files](#configuration-files)
6. [Phoenix Channels Integration](#phoenix-channels-integration)
7. [State Management Architecture](#state-management-architecture)
8. [Authentication Flow](#authentication-flow)
9. [UI Component Strategy](#ui-component-strategy)
10. [Development Workflow](#development-workflow)
11. [Testing Strategy](#testing-strategy)
12. [CI/CD Pipeline](#cicd-pipeline)
13. [App Store Deployment](#app-store-deployment)
14. [Future: Web Support](#future-web-support)
15. [Implementation Phases](#implementation-phases)

---

## 1. Technology Stack

### Core Framework

- **Expo SDK 54+** (React Native 0.81+, New Architecture)
- **React 19+** (concurrent features enabled)
- **TypeScript 5.7+**

### Navigation

- **Expo Router** - File-based routing
  - Stack navigation for auth flow
  - Tabs for main app (lobby, games, profile)
  - Deep linking support (rejoin games via URL)

### Styling

- **NativeWind v4** - Tailwind CSS for React Native
  - Works on iOS/Android/Web
  - Hot reload on tailwind.config.js changes
  - Custom CSS support for card graphics
  - Dark mode ready

### State Management

- **Zustand 5+** - Global client state
  - User session
  - App settings
  - UI state (modals, toasts)
- **TanStack Query v6** - Server state
  - API calls (REST endpoints)
  - Caching & optimistic updates
  - Background refetching
- **Phoenix Channels** - Real-time game state
  - Custom hooks for WebSocket connections
  - Event-driven updates

### Real-time Communication

- **phoenix (npm)** - Official Phoenix Channels client
  - WebSocket with fallback to long-polling
  - Automatic reconnection
  - Presence tracking

### Development Tools

- **ESLint + Prettier** - Code quality
- **Husky** - Git hooks
- **TypeScript Strict Mode** - Type safety
- **expo-dev-client** - Custom development builds

### Testing

- **Jest** - Unit tests
- **React Native Testing Library** - Component tests
- **Detox** - E2E tests (optional for MVP)

---

## 2. Project Initialization

### Step 1: Create Expo Project

```bash
# Use pnpm (or npm/yarn if you prefer)
npx create-expo-app pidro-mobile --template tabs

cd pidro-mobile

# Initialize with NativeWind
npx rn-new --nativewind  # Alternative: manual setup below
```

### Step 2: Install Core Dependencies

```bash
# Package manager (choose one)
corepack enable pnpm  # Recommended
# OR: npm install -g pnpm

# Core dependencies
pnpm add zustand @tanstack/react-query phoenix
pnpm add nativewind react-native-reanimated react-native-safe-area-context
pnpm add expo-router expo-constants expo-secure-store
pnpm add react-native-svg  # For card graphics

# Dev dependencies
pnpm add -D tailwindcss prettier-plugin-tailwindcss
pnpm add -D @tanstack/eslint-plugin-query
pnpm add -D @types/phoenix
```

### Step 3: Initialize Configuration

```bash
# Tailwind config
bunx tailwindcss init

# TypeScript (already included in Expo)
# Git hooks
bun add -d husky lint-staged
bunx husky init
```

---

## 3. Folder Structure

```
pidro-mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/                   # Auth layout group
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/                   # Main app tabs
│   │   ├── index.tsx             # Lobby (home)
│   │   ├── games.tsx             # Active games
│   │   ├── profile.tsx
│   │   └── _layout.tsx
│   ├── game/
│   │   └── [code].tsx            # Game screen (dynamic route)
│   ├── _layout.tsx               # Root layout
│   └── +not-found.tsx
│
├── src/
│   ├── api/                      # API client
│   │   ├── client.ts             # Axios/Fetch config
│   │   ├── auth.ts               # Auth endpoints
│   │   ├── rooms.ts              # Room endpoints
│   │   └── types.ts              # API types
│   │
│   ├── channels/                 # Phoenix Channels
│   │   ├── socket.ts             # Socket singleton
│   │   ├── game-channel.ts       # Game channel logic
│   │   ├── lobby-channel.ts      # Lobby channel logic
│   │   └── hooks/
│   │       ├── useGameChannel.ts
│   │       └── useLobbyChannel.ts
│   │
│   ├── components/               # Reusable components
│   │   ├── ui/                   # Generic UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Modal.tsx
│   │   ├── game/                 # Game-specific components
│   │   │   ├── CardTable.tsx
│   │   │   ├── PlayingCard.tsx
│   │   │   ├── PlayerHand.tsx
│   │   │   └── BiddingPanel.tsx
│   │   └── shared/
│   │       ├── ErrorBoundary.tsx
│   │       └── LoadingSpinner.tsx
│   │
│   ├── stores/                   # Zustand stores
│   │   ├── auth.ts               # User session
│   │   ├── settings.ts           # App settings
│   │   └── ui.ts                 # UI state
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useGame.ts
│   │   └── useToast.ts
│   │
│   ├── types/                    # TypeScript types
│   │   ├── game.ts               # Game state types
│   │   ├── user.ts
│   │   └── api.ts
│   │
│   ├── utils/                    # Utilities
│   │   ├── storage.ts            # Secure storage wrapper
│   │   ├── validation.ts
│   │   └── format.ts
│   │
│   └── constants/                # Constants
│       ├── config.ts             # App config
│       ├── colors.ts
│       └── game-rules.ts
│
├── assets/                       # Static assets
│   ├── images/
│   ├── fonts/
│   └── cards/                    # Card graphics
│
├── __tests__/                    # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── app.json                      # Expo config
├── eas.json                      # EAS Build config
├── tailwind.config.js
├── tsconfig.json
├── global.css                    # Tailwind directives
├── metro.config.js
├── babel.config.js
└── package.json
```

---

## 4. Core Dependencies

### Production Dependencies

```json
{
  "dependencies": {
    "expo": "~54.0.0",
    "expo-router": "^4.0.0",
    "react": "^19.0.0",
    "react-native": "^0.81.0",

    "zustand": "^5.0.0",
    "@tanstack/react-query": "^6.0.0",
    "phoenix": "^1.7.0",

    "nativewind": "^4.1.0",
    "react-native-reanimated": "~3.17.0",
    "react-native-safe-area-context": "^5.4.0",
    "react-native-svg": "^15.0.0",

    "expo-constants": "~17.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-linking": "~7.0.0",
    "expo-font": "~13.0.0",

    "axios": "^1.7.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/react": "~19.0.0",
    "typescript": "~5.7.0",
    "tailwindcss": "^3.4.0",
    "prettier": "^3.3.0",
    "prettier-plugin-tailwindcss": "^0.5.0",
    "eslint": "^9.0.0",
    "@tanstack/eslint-plugin-query": "^6.0.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0"
  }
}
```

---

## 5. Configuration Files

### 5.1 `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        // Add your Pidro brand colors
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

### 5.2 `metro.config.js`

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: './global.css',
});
```

### 5.3 `babel.config.js`

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [
      'react-native-reanimated/plugin', // Must be last!
    ],
  };
};
```

### 5.4 `global.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles for playing cards */
@layer utilities {
  .card-red {
    @apply text-red-600;
  }
  .card-black {
    @apply text-gray-900;
  }
}
```

### 5.5 `app.json`

```json
{
  "expo": {
    "name": "Pidro",
    "slug": "pidro-mobile",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "scheme": "pidro",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0ea5e9"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourdomain.pidro",
      "buildNumber": "1"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0ea5e9"
      },
      "package": "com.yourdomain.pidro",
      "versionCode": 1
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-font",
        {
          "fonts": ["./assets/fonts/Inter-Regular.ttf"]
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "router": {
        "origin": false
      },
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

### 5.6 `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/api/*": ["./src/api/*"],
      "@/stores/*": ["./src/stores/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

### 5.7 `nativewind-env.d.ts`

```typescript
/// <reference types="nativewind/types" />
```

---

## 6. Phoenix Channels Integration

### 6.1 Socket Singleton (`src/channels/socket.ts`)

```typescript
import { Socket } from 'phoenix';
import { Platform } from 'react-native';
import { useAuthStore } from '@/stores/auth';

const SOCKET_URL = __DEV__
  ? Platform.select({
      ios: 'ws://localhost:4000/socket',
      android: 'ws://10.0.2.2:4000/socket', // Android emulator
      default: 'ws://localhost:4000/socket',
    })
  : 'wss://api.pidro.app/socket'; // Production

class PhoenixSocket {
  private socket: Socket | null = null;

  connect() {
    if (this.socket) return this.socket;

    const token = useAuthStore.getState().token;

    this.socket = new Socket(SOCKET_URL, {
      params: { token },
      logger: __DEV__ ? console.log : undefined,
    });

    this.socket.connect();

    // Handle connection events
    this.socket.onOpen(() => console.log('🔌 Socket connected'));
    this.socket.onError((error) => console.error('❌ Socket error:', error));
    this.socket.onClose(() => console.log('🔌 Socket closed'));

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket || this.connect();
  }
}

export const phoenixSocket = new PhoenixSocket();
```

### 6.2 Game Channel Hook (`src/channels/hooks/useGameChannel.ts`)

```typescript
import { useEffect, useState, useCallback } from 'react';
import { Channel } from 'phoenix';
import { phoenixSocket } from '../socket';
import type { GameState, GameAction } from '@/types/game';

export function useGameChannel(roomCode: string) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = phoenixSocket.getSocket();
    const gameChannel = socket.channel(`game:${roomCode}`);

    // Join channel
    gameChannel
      .join()
      .receive('ok', (response) => {
        console.log('✅ Joined game channel', response);
        setGameState(response.state);
        setIsConnected(true);
      })
      .receive('error', (err) => {
        console.error('❌ Failed to join channel', err);
        setError(err.reason || 'Failed to join game');
      });

    // Handle game state updates
    gameChannel.on('game_state', (payload) => {
      setGameState(payload.state);
    });

    // Handle player events
    gameChannel.on('player_joined', (payload) => {
      console.log('Player joined:', payload);
    });

    gameChannel.on('turn_changed', (payload) => {
      console.log('Turn changed:', payload);
    });

    gameChannel.on('game_over', (payload) => {
      console.log('Game over:', payload);
    });

    setChannel(gameChannel);

    // Cleanup on unmount
    return () => {
      gameChannel.leave();
    };
  }, [roomCode]);

  // Send game action
  const sendAction = useCallback(
    (action: GameAction) => {
      if (!channel) {
        console.error('Channel not connected');
        return Promise.reject('Not connected');
      }

      return new Promise((resolve, reject) => {
        channel
          .push(action.type, action.payload)
          .receive('ok', (response) => resolve(response))
          .receive('error', (err) => reject(err));
      });
    },
    [channel]
  );

  return {
    gameState,
    isConnected,
    error,
    sendAction,
  };
}
```

### 6.3 Lobby Channel Hook (`src/channels/hooks/useLobbyChannel.ts`)

```typescript
import { useEffect, useState } from 'react';
import { Channel } from 'phoenix';
import { phoenixSocket } from '../socket';
import type { Room } from '@/types/game';

export function useLobbyChannel() {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    const socket = phoenixSocket.getSocket();
    const lobbyChannel = socket.channel('lobby');

    lobbyChannel
      .join()
      .receive('ok', (response) => {
        console.log('✅ Joined lobby', response);
        setRooms(response.rooms || []);
      })
      .receive('error', (err) => {
        console.error('❌ Failed to join lobby', err);
      });

    // Listen for room updates
    lobbyChannel.on('room_created', (payload) => {
      setRooms((prev) => [...prev, payload.room]);
    });

    lobbyChannel.on('room_updated', (payload) => {
      setRooms((prev) => prev.map((r) => (r.code === payload.room.code ? payload.room : r)));
    });

    lobbyChannel.on('room_closed', (payload) => {
      setRooms((prev) => prev.filter((r) => r.code !== payload.room_code));
    });

    setChannel(lobbyChannel);

    return () => {
      lobbyChannel.leave();
    };
  }, []);

  return { rooms, isConnected: !!channel };
}
```

---

## 7. State Management Architecture

### 7.1 Auth Store (`src/stores/auth.ts`)

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { User } from '@/types/user';

// SecureStore adapter for Zustand
const secureStorage = {
  getItem: async (name: string) => {
    const value = await SecureStore.getItemAsync(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string) => {
    await SecureStore.deleteItemAsync(name);
  },
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
```

### 7.2 TanStack Query Setup (`src/api/query-client.ts`)

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

### 7.3 API Client (`src/api/client.ts`)

```typescript
import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '@/stores/auth';

const BASE_URL = __DEV__
  ? Platform.select({
      ios: 'http://localhost:4000/api/v1',
      android: 'http://10.0.2.2:4000/api/v1',
      default: 'http://localhost:4000/api/v1',
    })
  : 'https://api.pidro.app/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, logout user
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
```

---

## 8. Authentication Flow

### 8.1 Login Screen (`app/(auth)/login.tsx`)

```typescript
import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { apiClient } from '@/api/client';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });
      return response.data;
    },
    onSuccess: (data) => {
      login(data.data.user, data.data.token);
      router.replace('/(tabs)');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.errors[0]?.detail || 'Login failed');
    },
  });

  return (
    <View className="flex-1 justify-center px-8 bg-white">
      <Text className="text-3xl font-bold mb-8 text-center">Pidro</Text>

      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-6"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable
        className="bg-primary-600 rounded-lg py-4 mb-4 active:bg-primary-700"
        onPress={() => loginMutation.mutate()}
        disabled={loginMutation.isPending}
      >
        <Text className="text-white text-center font-semibold text-lg">
          {loginMutation.isPending ? 'Logging in...' : 'Login'}
        </Text>
      </Pressable>

      <Pressable onPress={() => router.push('/(auth)/register')}>
        <Text className="text-center text-primary-600">
          Don't have an account? Register
        </Text>
      </Pressable>
    </View>
  );
}
```

### 8.2 Root Layout with Auth Guard (`app/_layout.tsx`)

```typescript
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/api/query-client';
import { useAuthStore } from '@/stores/auth';

import '../global.css';

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to app if already logged in
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments]);

  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}
```

---

## 9. UI Component Strategy

### 9.1 Playing Card Component (`src/components/game/PlayingCard.tsx`)

```typescript
import { View, Text, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Card } from '@/types/game';

interface PlayingCardProps {
  card: Card;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  disabled?: boolean;
}

export function PlayingCard({
  card,
  faceDown = false,
  size = 'md',
  onPress,
  disabled = false,
}: PlayingCardProps) {
  const sizeClasses = {
    sm: 'w-12 h-16',
    md: 'w-16 h-24',
    lg: 'w-20 h-32',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const colorClass = isRed ? 'card-red' : 'card-black';

  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };

  const rankDisplay = {
    14: 'A',
    13: 'K',
    12: 'Q',
    11: 'J',
  }[card.rank] || card.rank.toString();

  if (faceDown) {
    return (
      <View
        className={`${sizeClasses[size]} bg-blue-800 rounded-lg border-2 border-blue-900 items-center justify-center`}
      >
        <Text className="text-blue-200 text-2xl">🂠</Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      className={`${sizeClasses[size]} bg-white rounded-lg border-2 border-gray-300 p-2 ${
        !disabled && onPress ? 'active:scale-95' : ''
      }`}
    >
      <View className="flex-1 justify-between">
        <Text className={`${textSizes[size]} font-bold ${colorClass}`}>
          {rankDisplay}
        </Text>
        <Text className={`text-center text-2xl ${colorClass}`}>
          {suitSymbols[card.suit]}
        </Text>
        <Text className={`${textSizes[size]} font-bold self-end ${colorClass}`}>
          {rankDisplay}
        </Text>
      </View>
    </Pressable>
  );
}
```

### 9.2 Reusable Button (`src/components/ui/Button.tsx`)

```typescript
import { Pressable, Text, ActivityIndicator } from 'react-native';
import type { ReactNode } from 'react';

interface ButtonProps {
  onPress: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Button({
  onPress,
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
}: ButtonProps) {
  const variantClasses = {
    primary: 'bg-primary-600 active:bg-primary-700',
    secondary: 'bg-gray-200 active:bg-gray-300',
    danger: 'bg-red-600 active:bg-red-700',
  };

  const textVariantClasses = {
    primary: 'text-white',
    secondary: 'text-gray-900',
    danger: 'text-white',
  };

  const sizeClasses = {
    sm: 'py-2 px-3',
    md: 'py-3 px-4',
    lg: 'py-4 px-6',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`rounded-lg ${variantClasses[variant]} ${sizeClasses[size]} ${
        disabled ? 'opacity-50' : ''
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? '#000' : '#fff'} />
      ) : (
        <Text
          className={`text-center font-semibold ${textVariantClasses[variant]} ${textSizeClasses[size]}`}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}
```

---

## 10. Development Workflow

### 10.1 Local Development

```bash
# Start development server
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android

# Run on web browser
pnpm web

# Clear cache if needed
pnpm start --clear
```

### 10.2 Phoenix Server Connection

**iOS Simulator**: `localhost:4000` works
**Android Emulator**: Use `10.0.2.2:4000` (Android's special alias)
**Physical Device**: Use your computer's local IP (e.g., `192.168.1.100:4000`)

**Environment Variables** (`.env.local`):

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.100:4000
EXPO_PUBLIC_WS_URL=ws://192.168.1.100:4000/socket
```

Access in code:

```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL;
```

### 10.3 Hot Reload

Expo supports:

- ✅ **Fast Refresh** - React component changes
- ✅ **Metro bundler** - JavaScript changes
- ✅ **NativeWind hot reload** - Tailwind config changes

No need to rebuild for most changes!

### 10.4 Debugging

```bash
# React Developer Tools (in Chrome)
# Open http://localhost:8081/debugger-ui

# Expo Dev Tools
# Press 'm' in terminal to open menu
# Press 'i' for iOS, 'a' for Android, 'w' for web

# View logs
bun expo start --dev-client

# Flipper (advanced debugging)
bun add -d react-native-flipper
```

---

## 11. Testing Strategy

### 11.1 Unit Tests (Jest)

**Setup** (`jest.config.js`):

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/*.stories.tsx'],
};
```

**Example Test** (`__tests__/unit/utils/format.test.ts`):

```typescript
import { formatCardRank } from '@/utils/format';

describe('formatCardRank', () => {
  it('formats face cards correctly', () => {
    expect(formatCardRank(14)).toBe('A');
    expect(formatCardRank(13)).toBe('K');
    expect(formatCardRank(12)).toBe('Q');
    expect(formatCardRank(11)).toBe('J');
  });

  it('formats number cards correctly', () => {
    expect(formatCardRank(10)).toBe('10');
    expect(formatCardRank(5)).toBe('5');
    expect(formatCardRank(2)).toBe('2');
  });
});
```

### 11.2 Component Tests (React Native Testing Library)

```bash
bun add -d @testing-library/react-native @testing-library/jest-native
```

**Example** (`__tests__/integration/Button.test.tsx`):

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders correctly', () => {
    const { getByText } = render(<Button onPress={() => {}}>Click me</Button>);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button onPress={onPress}>Click me</Button>);

    fireEvent.press(getByText('Click me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled when loading', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button onPress={onPress} loading>
        Click me
      </Button>
    );

    fireEvent.press(getByText('Click me'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

### 11.3 E2E Tests (Detox - Optional)

For MVP, manual testing is sufficient. Add Detox later for automated flows:

```bash
bun add -d detox detox-cli
```

---

## 12. CI/CD Pipeline

### 12.1 GitHub Actions (`.github/workflows/ci.yml`)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - run: bun install --frozen-lockfile
      - run: bun lint
      - run: bun typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - run: bun install --frozen-lockfile
      - run: bun test --coverage
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json

  build-preview:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - run: bun install --frozen-lockfile
      - run: eas build --profile preview --platform all --non-interactive
```

### 12.2 EAS Configuration (`eas.json`)

```json
{
  "cli": {
    "version": ">= 13.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production"
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-email@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      }
    }
  }
}
```

---

## 13. App Store Deployment

### 13.1 iOS App Store

**Prerequisites:**

1. **Apple Developer Account** ($99/year)
2. **App Store Connect** - Create app listing
3. **Certificates & Provisioning Profiles** (EAS handles this!)

**Build & Submit:**

```bash
# Configure credentials
eas credentials

# Build for production
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest
```

**App Store Connect:**

1. Fill out app metadata (description, screenshots, keywords)
2. Set up pricing (free for Pidro)
3. Submit for review (7-14 days typically)

### 13.2 Google Play Store

**Prerequisites:**

1. **Google Play Console Account** ($25 one-time)
2. **Service Account** - For automated submissions

**Build & Submit:**

```bash
# Build for production
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --latest
```

**Play Console:**

1. Create app listing
2. Fill out Store Listing (description, graphics)
3. Set up Content Rating questionnaire
4. Release to Internal Testing → Closed Testing → Production

### 13.3 Over-the-Air (OTA) Updates

Expo's killer feature - push updates instantly without app store approval:

```bash
# Publish update to preview channel
eas update --branch preview --message "Fix bug in bidding"

# Publish to production
eas update --branch production --message "v1.0.1 - Bug fixes"
```

**What can be updated via OTA:**

- ✅ JavaScript code
- ✅ Assets (images, fonts)
- ✅ App logic

**What requires new build:**

- ❌ Native code changes
- ❌ Config changes (app.json)
- ❌ New native dependencies

---

## 14. Future: Web Support

Expo Router supports web out of the box! To enable:

### 14.1 Web Setup

```bash
# Run on web
bun web

# Build for production
bun expo export:web
```

### 14.2 Deploy Web App

**Vercel** (Recommended):

```bash
bun add -d @expo/cli

# Build
bun expo export:web

# Deploy
bunx vercel --prod
```

Or use **Netlify, Cloudflare Pages, AWS S3**, etc.

### 14.3 Code Sharing

Your components already work on web thanks to:

- ✅ **NativeWind** - Same Tailwind classes
- ✅ **Expo Router** - Same file-based routing
- ✅ **Phoenix Channels** - WebSocket works everywhere

Only platform-specific code needs guards:

```typescript
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  // Web-specific code
} else {
  // Mobile code
}
```

---

## 15. Implementation Phases

### Phase 1: Foundation (Week 1) ✅ MVP Focus ✅ COMPLETED

**Goal**: Runnable app with auth

- [x] Initialize Expo project with NativeWind
- [x] Setup folder structure
- [x] Configure TypeScript, ESLint, Prettier
- [x] Create base layout with Expo Router
- [x] Implement auth screens (login, register)
- [x] Setup API client (axios)
- [x] Create auth store (Zustand)
- [x] Implement login flow with Phoenix API
- [x] Test on iOS simulator and Android emulator

**Success Criteria**: Can register, login, and reach authenticated home screen ✅

---

### Phase 2: Lobby & Room Management (Week 2) ✅ MVP Focus 🚧 IN PROGRESS

**Goal**: Browse and create rooms

- [x] Setup Phoenix Channels (socket singleton)
- [ ] Create lobby screen with room list
- [ ] Implement lobby channel hook
- [ ] Fetch available rooms from API
- [ ] Create room creation form
- [ ] Implement join room functionality
- [ ] Add error handling and loading states
- [ ] Test room lifecycle (create → join → leave)

**Success Criteria**: Can see rooms, create new room, join existing room

---

### Phase 3: Game Screen Foundation (Week 2-3) ✅ MVP Focus 🚧 STARTED

**Goal**: Basic game UI with real-time updates

- [x] Create game screen layout (`/game/[code]`)
- [ ] Implement game channel hook
- [ ] Connect to game channel via WebSocket
- [ ] Display game state (phase, scores, current player)
- [ ] Create card components (PlayingCard, PlayerHand)
- [ ] Implement bidding UI (buttons for 6-14, pass)
- [ ] Implement trump selection UI
- [ ] Handle phase transitions
- [ ] Test with 4 players (you + 3 Phoenix bots)

**Success Criteria**: Can join game, see updates in real-time, complete bidding phase

---

### Phase 4: Gameplay Implementation (Week 3-4) ✅ MVP Focus

**Goal**: Play complete games

- [ ] Implement card table layout
- [ ] Add playing card interactions (tap to play)
- [ ] Send play_card actions to server
- [ ] Display trick results
- [ ] Show scoring after hand
- [ ] Implement game over screen
- [ ] Add sound effects (optional)
- [ ] Polish animations (card movements)
- [ ] Test complete game flow

**Success Criteria**: Can play full game from start to finish

---

### Phase 5: Polish & UX (Week 4-5)

**Goal**: Production-ready app

- [ ] Add loading states everywhere
- [ ] Improve error messages
- [ ] Add reconnection logic for WebSocket
- [ ] Implement toast notifications
- [ ] Add user profile screen
- [ ] Add game history/stats
- [ ] Accessibility improvements (labels, contrast)
- [ ] Dark mode support
- [ ] Add animations (react-native-reanimated)
- [ ] Performance optimization
- [ ] User testing and feedback

**Success Criteria**: Smooth, polished experience

---

### Phase 6: Testing & CI/CD (Week 5)

**Goal**: Stable, tested codebase

- [ ] Write unit tests (utils, stores)
- [ ] Write component tests (UI components)
- [ ] Setup GitHub Actions CI
- [ ] Add test coverage reports
- [ ] Configure EAS builds
- [ ] Test on real devices
- [ ] Beta testing with friends

**Success Criteria**: >70% test coverage, CI green

---

### Phase 7: App Store Launch (Week 6)

**Goal**: Public release

- [ ] Create app store assets (screenshots, icons, descriptions)
- [ ] Setup App Store Connect / Play Console
- [ ] Build production releases with EAS
- [ ] Submit to Apple App Store
- [ ] Submit to Google Play Store
- [ ] Setup analytics (optional - PostHog, Mixpanel)
- [ ] Monitor crash reports (Sentry)
- [ ] Launch! 🚀

**Success Criteria**: Apps live in stores

---

## Quick Start Commands

```bash
# Initial setup (run once)
bun create expo-app pidro-mobile --template tabs
cd pidro-mobile
bun install
bun add zustand @tanstack/react-query phoenix
bun add nativewind react-native-reanimated react-native-safe-area-context
bun add -d tailwindcss prettier-plugin-tailwindcss
bunx tailwindcss init

# Daily development
bun start          # Start dev server
bun ios            # Run iOS
bun android        # Run Android
bun test           # Run tests
bun lint           # Lint code

# Building
eas build --profile preview --platform all       # Preview build
eas build --profile production --platform all    # Production build

# Deployment
eas submit --platform ios --latest               # Submit to App Store
eas submit --platform android --latest           # Submit to Play Store
eas update --branch production --message "v1.0"  # OTA update
```

---

## Critical Path to MVP

**Priority Order:**

1. ✅ **Auth Flow** (login/register) - Week 1
2. ✅ **Lobby** (see/create/join rooms) - Week 2
3. ✅ **Game Screen** (connect to WebSocket, display state) - Week 2-3
4. ✅ **Gameplay** (bid, select trump, play cards) - Week 3-4
5. ⏳ **Polish** (UX, error handling, animations) - Week 4-5
6. ⏳ **Deploy** (App Store submission) - Week 5-6

**Estimated Timeline**: 5-6 weeks to production-ready MVP

---

## Alternative Technologies Considered

### ❌ **Bare React Native CLI**

- **Pros**: More control, slightly smaller bundle
- **Cons**: Much slower setup, manual native config, no web support, harder CI/CD
- **Verdict**: Expo is better for 95% of apps, including Pidro

### ❌ **Flutter**

- **Pros**: Great performance, beautiful UI
- **Cons**: Dart language (you know React/TypeScript), less web compatibility, harder to share code with potential web client
- **Verdict**: React Native ecosystem is better for your skillset

### ❌ **Ionic/Capacitor**

- **Pros**: Web-first, easier web reuse
- **Cons**: Not truly native, worse performance for games, less mature ecosystem
- **Verdict**: React Native is better for card game performance

### ⚠️ **Tamagui** (instead of NativeWind)

- **Pros**: Excellent performance, styled-components API
- **Cons**: Steeper learning curve, more opinionated
- **Verdict**: NativeWind is simpler and you know Tailwind

**Recommendation**: Stick with Expo + NativeWind as specified above.

---

## Success Criteria

### Technical

- ✅ TypeScript strict mode with no errors
- ✅ All tests passing (>70% coverage goal)
- ✅ CI/CD pipeline green
- ✅ <3 second app launch time
- ✅ <100ms WebSocket latency
- ✅ <200ms action response time

### User Experience

- ✅ Smooth 60fps animations
- ✅ Instant game state updates via WebSocket
- ✅ Offline-friendly (cached data with TanStack Query)
- ✅ Clear error messages
- ✅ Accessible (screen reader support, contrast)

### Business

- ✅ App Store approved (both iOS and Android)
- ✅ <1% crash rate
- ✅ Positive user reviews (>4.0 rating goal)

---

## Common Pitfalls to Avoid

1. **Don't over-abstract early** - Start simple, refactor later
2. **Don't skip TypeScript** - You'll thank yourself later
3. **Don't ignore performance** - Use React.memo, useMemo wisely
4. **Don't hardcode URLs** - Use environment variables
5. **Don't forget error handling** - Every API call, every WebSocket event
6. **Don't skip testing** - Write tests as you go, not at the end
7. **Don't ignore accessibility** - Use proper labels, test with screen reader
8. **Don't over-engineer** - MVP first, polish later

---

## Resources & Documentation

### Official Docs

- **Expo**: https://docs.expo.dev/
- **Expo Router**: https://docs.expo.dev/router/introduction/
- **NativeWind**: https://www.nativewind.dev/
- **Phoenix Channels**: https://hexdocs.pm/phoenix/channels.html
- **Zustand**: https://zustand-demo.pmnd.rs/
- **TanStack Query**: https://tanstack.com/query/latest

### Learning Resources

- **Expo Tutorial**: https://docs.expo.dev/tutorial/introduction/
- **React Native Docs**: https://reactnative.dev/docs/getting-started
- **Phoenix Channels + React**: https://shift.infinite.red/prototyping-a-chat-app-with-react-native-and-phoenix-5e65677a8217

### Community

- **Expo Discord**: https://chat.expo.dev/
- **React Native Community**: https://github.com/react-native-community
- **NativeWind Showcase**: https://www.nativewind.dev/showcase

---

## Final Checklist

Before starting development:

- [ ] Read this entire plan
- [ ] Install Xcode (for iOS development)
- [ ] Install Android Studio (for Android development)
- [ ] Create Apple Developer Account (if targeting iOS)
- [ ] Create Google Play Developer Account (if targeting Android)
- [ ] Setup Expo account (free)
- [ ] Verify Phoenix server is running locally
- [ ] Clone/create Git repository
- [ ] Setup project management (Linear, GitHub Projects, etc.)

---

**Next Step**: Run `bun create expo-app pidro-mobile --template tabs` and follow Phase 1!

Good luck! 🚀🎮🃏
