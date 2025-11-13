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
- **Payment Processing:** Integrates with Stripe for subscription management, including checkout flows, with a fallback to simulation mode if Stripe API keys are not configured.
- **Video Generation Parameters:** Supports customizable video length (5s, 10s, 15s), aspect ratio (1:1, 16:9, 9:16 with platform labels), and an optional style input.

### Feature Specifications
- **Video Generation:** Users input text prompts to generate 10-second cosmic ASMR videos with autoplay and looping.
- **User Authentication & Authorization:** Secure login/logout, protected routes, and role-based access control tied to subscription tiers.
- **Subscription Management:** Three membership tiers (Free, Pro, Premium) with varying video limits, lengths, quality, and features. Users can upgrade, downgrade, or cancel subscriptions. Monthly video limits are automatically reset.
- **Video Gallery:** Displays generated videos in a grid, with hover-to-play functionality, pagination, and deletion capabilities.
- **User Profile:** Displays authenticated user data.
- **Moon Navigation Menu:** A sliding navigation panel providing access to Home, Profile, Membership, Settings, and Contact pages.
- **Advertisement Showcase:** A scrollable section featuring example AI ASMR videos.

## External Dependencies
- **Pika Labs API:** Used for generating 10-second cosmic ASMR videos from text prompts.
- **Stripe API:** Integrated for handling payment processing, subscriptions, and webhooks for real-time updates.
- **Replit Auth:** Utilized for secure user authentication and session management.
- **PostgreSQL:** The primary database for storing application data.