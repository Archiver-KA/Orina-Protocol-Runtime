# 🚀 PHASE 2 - OFF-CHAIN FEATURES ROADMAP

**Status:** Planning  
**Start Date:** February 3, 2026  
**Target Completion:** TBD  
**Priority:** Medium-High (Enhance UX)

---

## 📊 CURRENT STATE ANALYSIS

### **Existing Components (Already Built):**
✅ `/src/app/components/messages.tsx` - Chat interface (basic)  
✅ `/src/app/components/community.tsx` - Social feed (basic)  
✅ `/src/app/components/product-modal.tsx` - Asset details modal  
✅ `/src/app/components/seller-modal.tsx` - Seller profile view  
✅ `/src/app/components/profile.tsx` - User profile  
✅ `/src/app/components/settings.tsx` - Settings page  
✅ `/src/app/components/history.tsx` - Transaction history  

### **Components Need Enhancement:**
🔄 Messages - Needs real-time updates, better UX  
🔄 Community - Needs post creation, reactions, filtering  
🔄 Product Modal - Needs more asset details, metadata  
🔄 Seller Modal - Needs reputation system, reviews  
🔄 Profile - Needs editing, avatar upload  
🔄 History - Needs filtering, export, analytics  

### **Missing Components:**
❌ Asset Detail Page (comprehensive)  
❌ Notification System  
❌ Search System (global)  
❌ Review/Rating System  
❌ Favorites/Watchlist  
❌ User Reputation Dashboard  

---

## 🎯 PHASE 2 FEATURES BREAKDOWN

### **CATEGORY A - COMMUNICATION (High Priority)**

#### **BƯỚC 12 - ENHANCED CHAT SYSTEM** 🔥
**Estimated Time:** 3-4 hours  
**Priority:** High  
**Dependencies:** None

**Features:**
- [ ] Real-time message updates (mock with intervals)
- [ ] Message threading/replies
- [ ] File attachments preview (images, docs)
- [ ] Emoji picker integration
- [ ] Message search within conversation
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Group chats support
- [ ] Message reactions
- [ ] Link previews
- [ ] Code block formatting
- [ ] Pinned messages

**Technical Stack:**
- localStorage for persistence
- Context API for global state
- Motion for animations
- Emoji library (emoji-picker-react)

**Files to Create:**
- `/src/app/components/chat/chat-window.tsx`
- `/src/app/components/chat/message-bubble.tsx`
- `/src/app/components/chat/chat-input.tsx`
- `/src/app/components/chat/emoji-picker.tsx`
- `/src/app/components/chat/file-preview.tsx`
- `/src/hooks/useChat.ts`
- `/src/contexts/ChatContext.tsx`
- `/src/utils/chat.ts`

**Acceptance Criteria:**
✅ Messages persist in localStorage  
✅ Real-time updates (simulated)  
✅ Emoji picker functional  
✅ File attachments work  
✅ Search within chat  
✅ Responsive design  

---

#### **BƯỚC 13 - NOTIFICATION SYSTEM** 🔔
**Estimated Time:** 2-3 hours  
**Priority:** High  
**Dependencies:** Chat system (optional)

**Features:**
- [ ] Toast notifications (sonner)
- [ ] Notification center dropdown
- [ ] Multiple notification types (order, message, system)
- [ ] Mark as read/unread
- [ ] Notification preferences
- [ ] Desktop notifications (browser API)
- [ ] Notification history
- [ ] Clear all notifications
- [ ] Notification badges (counts)
- [ ] Sound effects (optional)

**Technical Stack:**
- Sonner for toasts
- localStorage for persistence
- Context API for global state
- Browser Notification API

**Files to Create:**
- `/src/app/components/notifications/notification-center.tsx`
- `/src/app/components/notifications/notification-item.tsx`
- `/src/app/components/notifications/notification-badge.tsx`
- `/src/hooks/useNotifications.ts`
- `/src/contexts/NotificationContext.tsx`
- `/src/utils/notifications.ts`

**Acceptance Criteria:**
✅ Toasts appear correctly  
✅ Notification center functional  
✅ Persist across sessions  
✅ Badge counts accurate  
✅ Desktop notifications work  

---

### **CATEGORY B - SOCIAL FEATURES (Medium Priority)**

#### **BƯỚC 14 - ENHANCED COMMUNITY FEED** 🌐
**Estimated Time:** 3-4 hours  
**Priority:** Medium-High  
**Dependencies:** None

**Features:**
- [ ] Create post modal
- [ ] Upload images/videos to posts
- [ ] Like/unlike posts
- [ ] Repost functionality
- [ ] Comment threads
- [ ] Reply to comments
- [ ] Tag users (@mentions)
- [ ] Hashtags support
- [ ] Filter by blockchain
- [ ] Sort by trending/new/top
- [ ] Infinite scroll
- [ ] Post editing/deletion
- [ ] Report post functionality

**Technical Stack:**
- localStorage for posts
- Unsplash for demo images
- Motion for animations
- React Hook Form for post creation

**Files to Create:**
- `/src/app/components/community/create-post-modal.tsx`
- `/src/app/components/community/post-card.tsx`
- `/src/app/components/community/comment-section.tsx`
- `/src/app/components/community/comment-item.tsx`
- `/src/app/components/community/feed-filters.tsx`
- `/src/hooks/useCommunity.ts`
- `/src/utils/community.ts`

**Acceptance Criteria:**
✅ Can create posts with images  
✅ Like/comment/repost work  
✅ Filtering functional  
✅ Infinite scroll smooth  
✅ @mentions and #hashtags  

---

#### **BƯỚC 15 - REVIEW & RATING SYSTEM** ⭐
**Estimated Time:** 2-3 hours  
**Priority:** Medium  
**Dependencies:** None

**Features:**
- [ ] Leave review modal
- [ ] Star rating (1-5 stars)
- [ ] Review text
- [ ] Review photos (optional)
- [ ] Review timestamps
- [ ] Edit/delete reviews
- [ ] Helpful votes (upvote reviews)
- [ ] Report reviews
- [ ] Review filtering (verified/recent/top)
- [ ] Seller response to reviews
- [ ] Review summary stats
- [ ] Average rating calculation

**Technical Stack:**
- localStorage for reviews
- React Hook Form
- Star rating component

**Files to Create:**
- `/src/app/components/reviews/review-modal.tsx`
- `/src/app/components/reviews/review-card.tsx`
- `/src/app/components/reviews/review-list.tsx`
- `/src/app/components/reviews/star-rating.tsx`
- `/src/app/components/reviews/review-summary.tsx`
- `/src/hooks/useReviews.ts`
- `/src/utils/reviews.ts`

**Acceptance Criteria:**
✅ Can submit reviews  
✅ Star rating functional  
✅ Photos upload (optional)  
✅ Helpful votes work  
✅ Review stats accurate  

---

### **CATEGORY C - ASSET INFORMATION (High Priority)**

#### **BƯỚC 16 - COMPREHENSIVE ASSET DETAILS PAGE** 📊
**Estimated Time:** 4-5 hours  
**Priority:** High  
**Dependencies:** Review system (optional)

**Features:**
- [ ] Full asset metadata display
- [ ] Image gallery with zoom
- [ ] 3D model viewer (if applicable)
- [ ] Price history chart
- [ ] Trading volume stats
- [ ] Owner history timeline
- [ ] Asset properties grid
- [ ] Rarity score calculation
- [ ] Similar assets suggestions
- [ ] Asset description (rich text)
- [ ] External links (IPFS, OpenSea, etc.)
- [ ] Share asset modal
- [ ] QR code for asset
- [ ] Provenance tracking

**Technical Stack:**
- Recharts for price history
- React Zoom Pan Pinch for images
- React Player for videos
- localStorage for mock data

**Files to Create:**
- `/src/app/components/asset-details/asset-details-page.tsx`
- `/src/app/components/asset-details/asset-gallery.tsx`
- `/src/app/components/asset-details/asset-metadata.tsx`
- `/src/app/components/asset-details/asset-properties.tsx`
- `/src/app/components/asset-details/price-history-chart.tsx`
- `/src/app/components/asset-details/ownership-timeline.tsx`
- `/src/app/components/asset-details/similar-assets.tsx`
- `/src/hooks/useAssetDetails.ts`
- `/src/utils/assetDetails.ts`

**Acceptance Criteria:**
✅ All metadata displayed  
✅ Image gallery functional  
✅ Price chart accurate  
✅ Similar assets relevant  
✅ Responsive design  

---

#### **BƯỚC 17 - ASSET SEARCH & FILTERING** 🔍
**Estimated Time:** 3-4 hours  
**Priority:** High  
**Dependencies:** None

**Features:**
- [ ] Global search bar
- [ ] Search by name/ID/address
- [ ] Advanced filters panel
- [ ] Filter by price range
- [ ] Filter by blockchain
- [ ] Filter by category
- [ ] Filter by status (listed/sold)
- [ ] Sort options (price, date, rarity)
- [ ] Search history
- [ ] Recent searches
- [ ] Popular searches
- [ ] Search suggestions (autocomplete)
- [ ] Search results pagination
- [ ] Save search queries

**Technical Stack:**
- Fuse.js for fuzzy search
- localStorage for search history
- Debouncing for performance

**Files to Create:**
- `/src/app/components/search/search-bar.tsx`
- `/src/app/components/search/search-results.tsx`
- `/src/app/components/search/advanced-filters.tsx`
- `/src/app/components/search/search-suggestions.tsx`
- `/src/app/components/search/search-history.tsx`
- `/src/hooks/useSearch.ts`
- `/src/utils/search.ts`

**Acceptance Criteria:**
✅ Search works across all data  
✅ Filters functional  
✅ Autocomplete helpful  
✅ Results paginated  
✅ Search history persists  

---

### **CATEGORY D - USER EXPERIENCE (Medium Priority)**

#### **BƯỚC 18 - USER PROFILE ENHANCEMENT** 👤
**Estimated Time:** 2-3 hours  
**Priority:** Medium  
**Dependencies:** Review system (optional)

**Features:**
- [ ] Edit profile modal
- [ ] Avatar upload (mock with Unsplash)
- [ ] Cover photo upload
- [ ] Bio/description editing
- [ ] Social links (Twitter, Discord, etc.)
- [ ] Display name & username
- [ ] Location (optional)
- [ ] Verified badge logic
- [ ] Profile stats (orders, reviews, reputation)
- [ ] Activity timeline
- [ ] Favorite assets display
- [ ] Collections owned
- [ ] Orders history
- [ ] Public/private profile toggle

**Technical Stack:**
- localStorage for profile data
- React Hook Form
- Image crop/resize (optional)

**Files to Create:**
- `/src/app/components/profile/edit-profile-modal.tsx`
- `/src/app/components/profile/profile-header.tsx`
- `/src/app/components/profile/profile-stats.tsx`
- `/src/app/components/profile/profile-activity.tsx`
- `/src/app/components/profile/profile-collections.tsx`
- `/src/hooks/useProfile.ts`
- `/src/utils/profile.ts`

**Acceptance Criteria:**
✅ Can edit all profile fields  
✅ Avatar upload works  
✅ Stats display correctly  
✅ Activity timeline accurate  
✅ Responsive design  

---

#### **BƯỚC 19 - FAVORITES & WATCHLIST** ⭐
**Estimated Time:** 2 hours  
**Priority:** Medium  
**Dependencies:** None

**Features:**
- [ ] Add/remove favorites
- [ ] Favorites page
- [ ] Watchlist for assets
- [ ] Price alerts (mock)
- [ ] Favorite collections
- [ ] Favorite sellers
- [ ] Categories/tags for favorites
- [ ] Share watchlist
- [ ] Export favorites
- [ ] Sync across devices (localStorage)

**Technical Stack:**
- localStorage for persistence
- Context API for global state

**Files to Create:**
- `/src/app/components/favorites/favorites-page.tsx`
- `/src/app/components/favorites/favorites-grid.tsx`
- `/src/app/components/favorites/watchlist-table.tsx`
- `/src/hooks/useFavorites.ts`
- `/src/contexts/FavoritesContext.tsx`
- `/src/utils/favorites.ts`

**Acceptance Criteria:**
✅ Add/remove favorites  
✅ Persist across sessions  
✅ Grid/table views  
✅ Categories functional  
✅ Export works  

---

#### **BƯỚC 20 - REPUTATION SYSTEM** 🏆
**Estimated Time:** 3 hours  
**Priority:** Medium-Low  
**Dependencies:** Review system

**Features:**
- [ ] Reputation score calculation
- [ ] Badges/achievements system
- [ ] Trust score algorithm
- [ ] Seller verification levels
- [ ] Reputation history
- [ ] Leaderboard (top sellers/buyers)
- [ ] Reputation breakdown (UI)
- [ ] Dispute resolution impact
- [ ] Activity-based scoring
- [ ] Social proof indicators

**Technical Stack:**
- localStorage for reputation data
- Algorithm for score calculation

**Files to Create:**
- `/src/app/components/reputation/reputation-dashboard.tsx`
- `/src/app/components/reputation/reputation-badge.tsx`
- `/src/app/components/reputation/reputation-breakdown.tsx`
- `/src/app/components/reputation/leaderboard.tsx`
- `/src/hooks/useReputation.ts`
- `/src/utils/reputation.ts`

**Acceptance Criteria:**
✅ Score calculates correctly  
✅ Badges display properly  
✅ Leaderboard updates  
✅ Breakdown clear  
✅ Trust score accurate  

---

### **CATEGORY E - ANALYTICS & INSIGHTS (Low Priority)**

#### **BƯỚC 21 - PERSONAL ANALYTICS DASHBOARD** 📈
**Estimated Time:** 3-4 hours  
**Priority:** Low-Medium  
**Dependencies:** None

**Features:**
- [ ] Portfolio value over time
- [ ] Order statistics (buy/sell ratio)
- [ ] Most traded assets
- [ ] Average order value
- [ ] Success rate metrics
- [ ] Monthly/yearly reports
- [ ] Export data (CSV/JSON)
- [ ] Spending analysis
- [ ] Profit/loss calculator
- [ ] Comparison to market averages
- [ ] Goals tracking (optional)

**Technical Stack:**
- Recharts for visualizations
- localStorage for historical data
- CSV export library

**Files to Create:**
- `/src/app/components/analytics/analytics-dashboard.tsx`
- `/src/app/components/analytics/portfolio-chart.tsx`
- `/src/app/components/analytics/order-stats.tsx`
- `/src/app/components/analytics/spending-breakdown.tsx`
- `/src/app/components/analytics/export-data-button.tsx`
- `/src/hooks/useAnalytics.ts`
- `/src/utils/analytics.ts`

**Acceptance Criteria:**
✅ Charts display correctly  
✅ Stats accurate  
✅ Export works  
✅ Responsive design  
✅ Historical data tracked  

---

## 🗓️ SUGGESTED IMPLEMENTATION ORDER

### **Week 1 - Foundation:**
1. BƯỚC 12 - Enhanced Chat System (Day 1-2)
2. BƯỚC 13 - Notification System (Day 2-3)
3. BƯỚC 16 - Asset Details Page (Day 3-5)

### **Week 2 - Social & Discovery:**
4. BƯỚC 17 - Search & Filtering (Day 6-8)
5. BƯỚC 14 - Enhanced Community Feed (Day 8-10)
6. BƯỚC 15 - Review & Rating System (Day 10-12)

### **Week 3 - User Experience:**
7. BƯỚC 18 - User Profile Enhancement (Day 13-14)
8. BƯỚC 19 - Favorites & Watchlist (Day 14-15)
9. BƯỚC 20 - Reputation System (Day 15-17)

### **Week 4 - Analytics & Polish:**
10. BƯỚC 21 - Personal Analytics Dashboard (Day 18-20)
11. Bug fixes & polish (Day 21)

---

## 🎯 PRIORITIZATION MATRIX

### **Must Have (Phase 2A):**
- ✅ BƯỚC 16 - Asset Details Page
- ✅ BƯỚC 17 - Search & Filtering
- ✅ BƯỚC 13 - Notification System

### **Should Have (Phase 2B):**
- ✅ BƯỚC 12 - Enhanced Chat
- ✅ BƯỚC 14 - Enhanced Community
- ✅ BƯỚC 15 - Review & Rating

### **Nice to Have (Phase 2C):**
- ✅ BƯỚC 18 - User Profile
- ✅ BƯỚC 19 - Favorites
- ✅ BƯỚC 20 - Reputation

### **Future (Phase 3):**
- ✅ BƯỚC 21 - Analytics
- ✅ Advanced features (TBD)

---

## 📦 DEPENDENCIES & PACKAGES

### **New Packages to Install:**
```bash
# Search & Filtering
npm install fuse.js

# Chat & Emoji
npm install emoji-picker-react

# Image Handling
npm install react-zoom-pan-pinch

# Video Player
npm install react-player

# CSV Export
npm install papaparse
npm install @types/papaparse --save-dev

# Rich Text Editor (optional)
npm install @tiptap/react @tiptap/starter-kit

# Date Utilities
npm install date-fns
```

---

## 🔧 TECHNICAL ARCHITECTURE

### **State Management Strategy:**
```
Global State (Context API):
├── ChatContext - Real-time chat state
├── NotificationContext - Notification queue
├── FavoritesContext - User favorites
└── SearchContext - Search results & history

Local Storage:
├── user_profile
├── chat_messages
├── notifications
├── favorites
├── search_history
├── reviews
└── reputation_data
```

### **File Structure (New):**
```
/src
├── /app
│   └── /components
│       ├── /chat
│       ├── /notifications
│       ├── /community
│       ├── /reviews
│       ├── /asset-details
│       ├── /search
│       ├── /profile
│       ├── /favorites
│       ├── /reputation
│       └── /analytics
├── /hooks
│   ├── useChat.ts
│   ├── useNotifications.ts
│   ├── useCommunity.ts
│   ├── useReviews.ts
│   ├── useAssetDetails.ts
│   ├── useSearch.ts
│   ├── useProfile.ts
│   ├── useFavorites.ts
│   ├── useReputation.ts
│   └── useAnalytics.ts
├── /contexts
│   ├── ChatContext.tsx
│   ├── NotificationContext.tsx
│   ├── FavoritesContext.tsx
│   └── SearchContext.tsx
└── /utils
    ├── chat.ts
    ├── notifications.ts
    ├── community.ts
    ├── reviews.ts
    ├── assetDetails.ts
    ├── search.ts
    ├── profile.ts
    ├── favorites.ts
    ├── reputation.ts
    └── analytics.ts
```

---

## 🎨 DESIGN CONSISTENCY

### **Color Palette (Maintain):**
- Primary: `#2CC295` (Teal)
- Background: `#121212` (Studio BG)
- Cards: `#141417`
- Borders: `rgba(255,255,255,0.08)`
- Text: White/Zinc shades

### **Component Patterns:**
- Metallic panels with gradients
- Smooth motion animations
- Consistent spacing (Tailwind)
- Dark theme throughout
- Lucide icons
- Responsive grid layouts

---

## 📝 DOCUMENTATION PLAN

Each BƯỚC will have:
- Feature specification
- Technical implementation details
- API/Hook documentation
- Component props reference
- Usage examples
- Testing checklist
- Acceptance criteria

---

## 🚀 GETTING STARTED

### **Which feature do you want to start with?**

**Popular choices:**

1. **BƯỚC 16 - Asset Details Page** 🔥
   - High impact on UX
   - Showcases assets beautifully
   - Foundation for marketplace

2. **BƯỚC 12 - Enhanced Chat** 💬
   - Improves communication
   - Real-time feel
   - User engagement

3. **BƯỚC 17 - Search & Filtering** 🔍
   - Essential for discovery
   - Improves navigation
   - High user value

4. **BƯỚC 13 - Notification System** 🔔
   - Critical for UX
   - Keeps users informed
   - Foundation for alerts

**Recommendation:** Start with **BƯỚC 16 (Asset Details)** or **BƯỚC 13 (Notifications)** for maximum impact!

---

## ✅ SUCCESS METRICS

### **User Experience:**
- [ ] Intuitive navigation
- [ ] Fast search results
- [ ] Clear asset information
- [ ] Engaging social features
- [ ] Helpful notifications

### **Technical:**
- [ ] Fast load times
- [ ] Smooth animations
- [ ] No console errors
- [ ] Responsive design
- [ ] localStorage efficient

### **Business:**
- [ ] Increased user engagement
- [ ] Better asset discovery
- [ ] More social interactions
- [ ] Higher conversion rates
- [ ] Positive user feedback

---

**Ready to start?** Pick a BƯỚC and let's build! 🚀

**Estimated Total Time:** 25-35 hours (2-3 weeks part-time)  
**Status:** Planning Complete ✅  
**Next Step:** Choose first feature to implement
