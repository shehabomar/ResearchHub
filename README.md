# Academic Discovery Platform

A full-stack application for exploring academic research through interactive citation networks. Built with Node.js/Express backend and React frontend.

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- npm or yarn

### Setup

1. **Clone and install dependencies:**
```bash
# Install backend dependencies
npm install

# Install frontend dependencies  
cd frontend && npm install && cd ..
```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in your database credentials
   - The frontend automatically connects to `http://localhost:3000/api`

3. **Setup database:**
```bash
npm run db:setup
```

4. **Start development servers:**
```bash
# Start both frontend and backend in development mode
npm run dev:full

# Or start them separately:
npm run dev          # Backend only
cd frontend && npm run dev  # Frontend only
```

## 🎯 User Journey

### 1. Search Page (`/`)
- Clean search interface powered by Material-UI
- Enter keywords to search millions of academic papers
- Results show paper titles, authors, abstracts, and citation counts
- Click any paper to explore its details

### 2. Paper & Graph Page (`/paper/:id`)
- **Left Side**: Paper details (title, authors, abstract, metadata)  
- **Right Side**: Interactive citation graph powered by React Flow
- Click nodes in the graph to navigate to referenced papers
- Breadcrumb trail tracks your exploration path

### 3. Exploration Path (Breadcrumbs)
- Persistent navigation showing your research journey
- Tracks how you discovered each paper (search → citation → reference)
- Click breadcrumbs to backtrack through your exploration

## 🏗️ Architecture

### Backend (Node.js + Express + TypeScript)
```
src/
├── controllers/          # API route handlers
│   ├── AuthController.ts
│   ├── PaperController.ts
│   ├── ExplorationController.ts  # Future: session management
│   └── CitationController.ts     # Citation tree building
├── services/
│   ├── academicApiService.ts     # Semantic Scholar API
│   └── citationService.ts       # Citation graph logic
├── repositories/         # Database layer
│   ├── paperRepository.ts
│   └── explorationRepository.ts
├── middleware/          # Auth, validation, etc.
├── utils/              # JWT, password hashing
└── db/                 # Database setup and schema
```

### Frontend (React + TypeScript + Material-UI)
```
src/
├── components/          # Reusable UI components
│   ├── PaperCard.tsx           # Paper search result cards
│   ├── CitationGraph.tsx      # React Flow graph component  
│   └── ExplorationBreadcrumb.tsx  # Navigation breadcrumbs
├── pages/              # Main application pages
│   ├── SearchPage.tsx          # Homepage with search
│   └── PaperDetailPage.tsx     # Paper details + citation graph
├── context/            # React context for state management
│   └── ExplorationContext.tsx  # Tracks exploration path
├── services/           # API communication
│   └── api.ts                  # Axios-based API client
└── App.tsx             # Main routing and providers
```

## 🛠️ API Endpoints

### Papers
- `POST /api/papers/search` - Search papers by query
- `GET /api/papers/:paperId` - Get paper details
- `GET /api/papers/recent` - Get recently added papers
- `POST /api/papers/search/author` - Search by author name

### Citations  
- `POST /api/citations/tree/:paperId` - Build citation tree
- `GET /api/citations/tree/:paperId` - Get citation tree (GET version)

### Authentication (Future)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/user` - Get current user

### Exploration Sessions (Future)
- `POST /api/exploration/sessions` - Create exploration session
- `GET /api/exploration/sessions` - Get user's sessions

## 🎨 Key Features

### ✅ MVP Features (Current)
- **Paper Search**: Search academic papers via Semantic Scholar API
- **Citation Visualization**: Interactive citation graphs with React Flow
- **Exploration Trail**: Frontend-managed breadcrumb navigation
- **Responsive Design**: Works on desktop and mobile
- **Paper Details**: Full abstracts, author info, citation counts

### 🔮 Future Enhancements
- **User Authentication**: Save and share exploration sessions
- **Advanced Search**: Filter by year, venue, author, citation count
- **Export Features**: Save citation networks as images or data
- **Collaboration**: Share exploration paths with colleagues
- **Graph Analytics**: Citation impact analysis, author networks
- **Real-time Features**: Live collaboration on explorations

## 🛣️ Development

### Available Scripts

**Backend:**
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript  
- `npm run start` - Run production server
- `npm run db:setup` - Initialize database with schema

**Frontend:**
- `cd frontend && npm run dev` - Start React dev server
- `cd frontend && npm run build` - Build for production

**Full Stack:**
- Use VS Code tasks or run both servers in separate terminals

### Database Schema

**Papers Table:**
```sql
- id (string, primary key)
- title (text)  
- abstract (text)
- authors (jsonb)
- publication_date (date)
- citation_count (integer)
- api_source (string)
- meta_data (jsonb)
```

**Exploration Sessions:** (Future)
```sql
- id (serial)
- user_id (integer) 
- name (string)
- description (text)
- is_shared (boolean)
```

**Exploration Paths:** (Future)
```sql  
- id (serial)
- session_id (integer)
- paper_id (string)
- exploration_type (enum)
- depth (integer)
```

## 📚 Technology Stack

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL with raw SQL queries
- Semantic Scholar API integration
- JWT authentication (ready for future)
- bcrypt password hashing

**Frontend:**  
- React 18 + TypeScript
- Material-UI (MUI) components
- React Flow for graph visualization
- React Router for navigation
- Axios for API calls
- Vite for fast development

**DevOps:**
- VS Code tasks for development workflow
- Environment-based configuration
- CORS-enabled API
- Proxy setup for local development

## 🤝 Contributing

This is designed as a minimal MVP. Key areas for contribution:

1. **UI/UX Improvements**: Better graph layouts, search filters, mobile optimization
2. **Graph Features**: More layout algorithms, clustering, export options  
3. **Search Enhancement**: Advanced filters, saved searches, search history
4. **Performance**: Caching, pagination, lazy loading
5. **Analytics**: Citation impact analysis, research trend detection

## 📄 License

MIT License - feel free to use this as a starting point for your own research tools!
