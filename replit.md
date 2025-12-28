# Lunara AI - Cosmic ASMR Video Generation

## Overview
Lunara AI is a web application designed to generate 10-second cosmic ASMR videos from text prompts using the Pika Labs API. It features a unique "Glass Bubble Moon" design system with purple-pink gradients, smooth animations, and a polished user experience. The project aims to provide an immersive platform for creating short, aesthetically pleasing, AI-generated video content.

## User Preferences
- **Design Philosophy:** Focused, immersive single-purpose interface optimized for video generation
- **Color Scheme:** Cosmic purple-pink gradients with dark space background
- **Typography:** Poppins font family throughout

## System Architecture

### UI/UX Decisions
The application employs a "Glass Bubble Moon" design system characterized by:
- **Glassmorphism Effects:** Frosted glass UI elements with backdrop blur.
- **Color Scheme:** Dominant purple-pink gradients with soft glows.
- **Typography:** Consistent use of the Poppins font family.
- **Aesthetics:** Bubble-like rounded corners (rounded-3xl for cards, rounded-2xl for buttons), moon glow effects with ethereal shadows.
- **Responsiveness:** Optimized for both mobile and desktop.
- **Accessibility:** Includes ARIA labels and keyboard navigation.
- **Theming:** Supports both dark and light modes with adaptive glass effects.
- **Branding:** Custom moon & stars logo with purple-pink gradient used throughout (landing page header/footer, moon menu icon, favicon) replacing generic Moon icon for cohesive brand identity.

### Technical Implementations
- **Frontend:** Built with React and TypeScript, styled using Tailwind CSS with a custom cosmic theme. State management is handled by TanStack Query for API mutations, and Wouter is used for client-side routing.
- **Backend:** Developed with Express.js and TypeScript. Zod schemas are utilized for request validation, and the Pika Labs API is integrated via fetch requests.
- **Database:** PostgreSQL is used for data persistence, managed with Drizzle ORM, storing user, session, subscription, and video generation data.
- **Authentication:** Implements dual authentication system supporting both Replit OIDC and local password-based authentication. Features include:
  - User registration with email/username/password
  - Short 10-character user IDs using nanoid (e.g., `KgPhEIgVos`) instead of long UUIDs
  - Bcrypt password hashing (12 rounds)
  - Session persistence via PostgreSQL store
  - httpOnly, secure (production), sameSite: lax cookies
  - Automatic account migration from local to OIDC when same email is used
  - Transactional migration ensuring data integrity
  - Field-level form validation with inline error display
  - Glass bubble moon themed auth pages (Login, Register)
  - Account deletion with dual verification methods:
    - Local auth: Password verification
    - OIDC: Type "DELETE" to confirm
  - Comprehensive audit logging for account creation and deletion
- **Payment Processing:** Integrates with Stripe for subscription management, including checkout flows, with a fallback to simulation mode if Stripe API keys are not configured.
  - **Stripe Integration Status:** 
    - Environment variables configured: STRIPE_SECRET_KEY, VITE_STRIPE_PUBLIC_KEY, STRIPE_PRICE_ID_PRO, STRIPE_PRICE_ID_PREMIUM
    - Added validation and sanitization (trim whitespace, strip control characters, regex validation)
    - Automatic fallback to simulation mode if Stripe unavailable
    - Current limitation: Stripe checkout may encounter connection issues; simulation mode works perfectly for testing
    - To use real Stripe checkout: Ensure STRIPE_SECRET_KEY is exactly as shown in Stripe Dashboard (sk_test_* or sk_live_*) with no extra characters
- **Video Generation Parameters:** Supports customizable video length (5s, 10s, 15s), aspect ratio (1:1, 16:9, 9:16 with platform labels), and an optional style input. Reference images and styles are now available to all membership tiers (including Basic).

### Feature Specifications
- **Video Generation:** Users input text prompts to generate 10-second cosmic ASMR videos with autoplay and looping.
- **User Authentication & Authorization:** Secure login/logout, protected routes, and role-based access control tied to subscription tiers.
- **Account Management:** 
  - User profile displaying account information
  - Profile picture upload with Canvas API compression
  - **Edit Profile feature** with advanced form dialog:
    - Edit firstName, lastName, email, username
    - Password change for local auth users (with current password verification)
    - OIDC users cannot change password (section hidden)
    - Email/username uniqueness validation
    - Field-level Zod validation with inline error display
    - Password visibility toggles (Eye/EyeOff icons)
    - Form auto-resets when dialog opens with current user data
    - Only submits changed fields for efficiency
  - Sign out functionality
  - Delete account with verification dialog:
    - Local auth users: Must enter their password
    - OIDC users: Type "DELETE" to confirm
  - All user data (videos, settings, account) removed on deletion
  - Audit logs preserved for compliance
- **Audit Logging:**
  - Tracks all account creation events (local registration and OIDC sign-in)
  - Tracks all account deletion events
  - Immutable logs stored independently (persist after user deletion)
  - Includes userId, email, username, action type, auth provider, and timestamp
- **Subscription Management:** Three membership tiers (Basic, Pro, Premium) with varying video limits, lengths, quality, and features. Users can upgrade, downgrade, or cancel subscriptions. Monthly video limits are automatically reset.
- **Video Gallery:** Displays generated videos in a grid, with hover-to-play functionality, pagination, and deletion capabilities.
- **Video Sharing:** 
  - **Enhanced ShareModal** with cosmic glass bubble design:
    - DialogDescription for accessibility compliance
    - CosmicLoader with animated floating orbs and stars during share link generation
    - Video preview with dramatic glow effects and animated shimmer overlay
    - Copy button with success animation (checkmark + confetti-like feedback)
    - Social media buttons with platform-specific colors and glow hover effects
    - TikTok/Instagram/Snapchat section with gradient backgrounds and "Open App" deep links
    - Direct download button
  - **Direct Social Media Upload:**
    - Connect TikTok, Instagram, and YouTube accounts
    - Upload videos directly from Lunara to connected platforms
    - PlatformCard components showing connection status with badges
    - Caption input for customizing posts
    - Real-time upload progress with status polling
    - Simulated OAuth flow for MVP (ready for real OAuth integration)
    - Account management: connect/disconnect from Share Modal
    - Database tables: social_accounts, social_upload_jobs
    - Status tracking: pending → uploading → completed/failed
  - **Stunning Share Landing Page** (/share/:token):
    - Animated cosmic background with floating orbs, stars, and gradient mesh
    - Custom MoonStarsLogo SVG component matching brand identity
    - Video player card with dramatic glow and shimmer effects
    - View count badge with glass styling
    - Metadata tags (ASMR, Cosmic, AI Generated)
    - Action buttons with gradient backgrounds and hover glow
    - Social media cards with platform-specific colors and descriptions
    - TikTok/Instagram/Snapchat cards with gradient backgrounds and dual buttons (Download + Open App)
    - "Create Your Own" CTA with floating stars animation
  - Generates unique public share URLs with tokens
  - Social media sharing: X/Twitter, Facebook, LinkedIn, Reddit, WhatsApp, Telegram
  - Deep links for TikTok, Instagram, Snapchat (opens app for upload)
  - Native share API support for mobile devices
  - OG meta tags for rich social previews
  - View count tracking for shared videos
  - Token-based sharing with revocation capability
- **Moon Navigation Menu:** A sliding navigation panel providing access to Home, Profile, Membership, Settings, and Contact pages.
- **Advertisement Showcase:** A scrollable section featuring example AI ASMR videos.

## External Dependencies
- **Pika Labs API:** Used for generating 10-second cosmic ASMR videos from text prompts.
- **Stripe API:** Integrated for handling payment processing, subscriptions, and webhooks for real-time updates.
- **Replit Auth:** Utilized for secure user authentication and session management.
- **PostgreSQL:** The primary database for storing application data.