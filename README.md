# LEA Executive Residency - Professional Real Estate Communication Platform

A modern, minimalistic PWA for seamless tenant-landlord communication with real-time messaging, notifications, and property management tools.

## Features

### Core Features
- **Real-time Messaging** - Instant communication between tenants and landlords
- **Conversation Management** - Organized chat interface with search and filtering
- **Notification System** - Customizable alerts for messages, maintenance, and payments
- **User Settings** - Profile management, preferences, and security options
- **Dark Mode Support** - Professional dark theme for reduced eye strain

### PWA Features
- **Offline Support** - Access cached messages and draft replies when offline
- **Installable App** - Install on mobile devices for native-like experience
- **Push Notifications** - Real-time alerts even when the app is closed
- **Web App Manifest** - Full PWA manifest configuration with icons and shortcuts
- **Service Worker** - Advanced caching strategies and offline fallback

## Tech Stack

- **Frontend**: Next.js 16 with React 19
- **Styling**: Tailwind CSS with custom design tokens
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **PWA**: Service Worker API, Push API, Web App Manifest
- **State Management**: React hooks (localStorage for demo)

## Design System

### Color Palette (Minimalistic Professional)
- **Primary**: Deep Slate (#1f2937) - Professional, trustworthy
- **Accent**: Teal (#0D9488) - Modern, energetic
- **Neutrals**: White, grays, off-whites - Clean, minimal
- **Background**: Pure white with subtle accents
- **Dark Mode**: Optimized slate grays with teal accents

### Typography
- **Font**: Geist (Google Fonts)
- **Heading Weight**: Bold (600-700)
- **Body Weight**: Regular (400)
- **Line Height**: 1.4-1.6 for optimal readability

## Project Structure

```
├── app/
│   ├── layout.tsx           # Root layout with PWA metadata
│   ├── page.tsx             # Main entry point (auth routing)
│   └── globals.css          # Design tokens and base styles
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx
│   │   └── Sidebar.tsx
│   ├── chat/
│   │   └── ChatArea.tsx
│   ├── pages/
│   │   └── LoginPage.tsx
│   ├── settings/
│   │   └── SettingsPanel.tsx
│   ├── pwa/
│   │   └── InstallPrompt.tsx
│   └── ui/                  # shadcn/ui components
├── hooks/
│   ├── usePushNotifications.ts
│   └── usePWAInstall.ts
├── public/
│   ├── manifest.json        # PWA manifest
│   ├── sw.js               # Service Worker
│   ├── offline.html        # Offline fallback page
│   └── icons/              # PWA icons
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone or extract the project
cd LEA Executive Residency

# Install dependencies
npm install
# or
pnpm install

# Start development server
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Login
- Email: any email (e.g., `test@example.com`)
- Password: any password (e.g., `demo123`)
- Note: This is demo mode for testing. Production would use real authentication.

## Features Guide

### Authentication
- Simple login/registration interface
- Session management with localStorage (demo)
- Auto-login on page reload if authenticated

### Chat Interface
- Real-time message display with timestamps
- User avatar indicators (emoji placeholders)
- Responsive message bubbles (left/right alignment)
- Send messages with Enter key
- Call and video icons (ready for integration)

### Sidebar
- Conversation list with unread badges
- Search functionality
- Unread notification count
- Quick access to settings
- Logout button

### Settings Panel
- Profile management (name, email)
- Notification preferences (4 categories)
- Dark mode toggle
- Language selector
- Security options
- Account deletion (placeholder)

### PWA Features

#### Service Worker
- Network-first caching strategy
- Offline fallback page
- Background sync support
- Push notification handling

#### Installation Prompt
- Automatic prompt on compatible browsers
- One-click install to home screen
- Install banner in dashboard

#### Notifications
- Push notification support
- Web notifications API
- Customizable notification preferences
- Badge and icon configuration

## Configuration

### PWA Customization

Edit `public/manifest.json` to customize:
- App name and description
- Theme colors
- Icons
- Shortcuts
- Display mode

### Design Tokens

Modify `app/globals.css` to update colors:
```css
:root {
  --primary: oklch(...);
  --accent: oklch(...);
  /* ... other tokens ... */
}
```

### Environment Variables

For production deployment, add to `.env.local`:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
```

## Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Vercel auto-detects Next.js and deploys
4. PWA features work out of the box

```bash
# Deploy via CLI
npm install -g vercel
vercel
```

### Deploy to Other Platforms

The app is a standard Next.js 16 app:

```bash
# Build for production
npm run build

# Start production server
npm start
```

### PWA Requirements for Production
- HTTPS enabled (required for service workers)
- Valid manifest.json
- Web app icons (all sizes)
- Proper viewport meta tags
- Mobile-friendly responsive design

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Core App | ✓ | ✓ | ✓ | ✓ |
| Service Worker | ✓ | ✓ | 11.1+ | ✓ |
| Push API | ✓ | ✓ | ✗ | ✓ |
| Web App Install | ✓ | ✓ | 15.1+ | ✓ |
| Dark Mode | ✓ | ✓ | ✓ | ✓ |

## Development

### Adding New Components

Components follow shadcn/ui patterns:

```typescript
'use client'

import { Button } from '@/components/ui/button'

export default function MyComponent() {
  return <Button>Click me</Button>
}
```

### Styling

Use Tailwind CSS with design tokens:

```tsx
<div className="bg-background text-foreground">
  <h1 className="text-lg font-semibold text-primary">Title</h1>
</div>
```

### Adding Features

1. Create component in appropriate folder
2. Use design tokens for colors
3. Follow mobile-first responsive design
4. Add TypeScript types for props
5. Test on multiple devices

## Performance Optimizations

- Image optimization with Next.js Image component
- Code splitting via dynamic imports
- Service Worker caching strategies
- Optimized bundle size with tree-shaking
- CSS-in-JS via Tailwind

## Security Considerations

- HTTPS required for PWA features
- Secure session storage (use httpOnly cookies in production)
- Input validation on all forms
- CORS headers for API requests
- Content Security Policy headers

## Maintenance

### Updating Dependencies
```bash
npm update
# or
pnpm update
```

### Service Worker Cache
Modify cache version in `public/sw.js`:
```javascript
const CACHE_NAME = 'LEA Executive Residency-v2';
```

### Monitor PWA Performance
- Check service worker in DevTools
- Test offline functionality regularly
- Monitor installation metrics
- Track notification engagement

## Roadmap

- Backend API integration for real data
- WebSocket support for true real-time chat
- File upload/sharing for documents
- Voice/video call integration
- Advanced notification scheduling
- Payment integration for rent collection
- Mobile app wrappers (iOS/Android)

## Support & Contributing

For issues or questions:
1. Check the documentation
2. Review the code comments
3. Test in development mode
4. Contact support

## License

This project is provided as-is for professional real estate communication.

---

**Built with Next.js, React, and Tailwind CSS**
**Optimized for modern browsers and mobile devices**
**Production-ready PWA platform for real estate professionals**
