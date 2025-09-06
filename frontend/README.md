# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# Academic Discovery Frontend

A minimal React frontend for the Academic Discovery platform that allows users to search for academic papers and explore their citation networks.

## Features

- **Search Interface**: Clean, minimal search interface powered by Material-UI
- **Paper Details**: View paper abstracts, authors, citation counts, and metadata
- **Citation Graph**: Interactive citation network visualization using React Flow
- **Exploration Path**: Breadcrumb navigation showing your research journey

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your backend API URL:
```
VITE_API_BASE_URL=http://localhost:3000/api
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Backend Setup

Make sure your backend is running on `http://localhost:3000` with the following endpoints available:

- `POST /api/papers/search` - Search for papers
- `GET /api/papers/:paperId` - Get paper details
- `POST /api/citations/tree/:paperId` - Build citation tree

## User Flow

1. **Search Page**: Enter keywords to search for academic papers
2. **Paper Detail Page**: Click on any paper to see its details and citation graph
3. **Citation Navigation**: Click on nodes in the graph to explore related papers
4. **Breadcrumb Trail**: Track your exploration path at the top of each page

## Technology Stack

- React 18 with TypeScript
- Material-UI (MUI) for components
- React Flow for graph visualization
- React Router for navigation
- Axios for API calls
- Vite for development and building

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Contributing

This is a minimal MVP. Future enhancements could include:

- User authentication and saved exploration sessions
- More advanced graph layouts and interactions
- Export functionality for citation data
- Advanced search filters and sorting
- Real-time collaboration features

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
