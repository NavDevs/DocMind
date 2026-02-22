# 🧠 DocMind — AI-Powered Document Intelligence

DocMind is a full-stack **Retrieval-Augmented Generation (RAG)** application that lets you upload PDF documents and chat with them using AI. Get instant summaries, ask questions about your documents, and track usage through an analytics dashboard.

![Stack](https://img.shields.io/badge/React-18-blue?logo=react) ![Stack](https://img.shields.io/badge/Node.js-Express-green?logo=node.js) ![Stack](https://img.shields.io/badge/MongoDB-Atlas-brightgreen?logo=mongodb) ![Stack](https://img.shields.io/badge/OpenAI-RAG-412991?logo=openai) ![Stack](https://img.shields.io/badge/Firebase-Auth-orange?logo=firebase)

---

## 🌐 Live Links
- **Frontend App**: [https://docmind-client.onrender.com](https://docmind-client.onrender.com)
- **Backend API**: [https://docmind-server.onrender.com](https://docmind-server.onrender.com)

---

## ✨ Features

- 📄 **PDF Upload** — Drag & drop PDF documents for instant processing
- 🤖 **AI Chat** — Ask questions about your documents using a RAG pipeline
- 📝 **Auto Summaries** — Get AI-generated summaries for every uploaded document
- 📊 **Analytics Dashboard** — Track uploads, chats, and usage over time
- 🔐 **Firebase Auth** — Secure Google sign-in and email/password authentication
- 🛡️ **Rate Limiting** — Built-in API protection with express-rate-limit

---

## 🗂️ Project Structure

```
DocMind/
├── client/                   # React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── components/       # Navbar, ProtectedRoute
│   │   ├── context/          # AuthContext (Firebase)
│   │   ├── pages/            # Home, Documents, Chat, Analytics, Auth
│   │   └── services/         # Axios API client, Firebase config
│   └── vite.config.js
│
└── server/                   # Node.js + Express backend
    ├── config/               # DB, Firebase Admin, OpenAI setup
    ├── controllers/          # Auth, Document, Chat, Analytics
    ├── middleware/            # Auth guard, error handler, rate limiter, multer
    ├── models/               # Mongoose schemas (User, Document, Chat, Analytics)
    ├── routes/               # API route definitions
    ├── services/             # RAG, Embeddings, PDF parsing, Vector store, Summary
    └── utils/                # Text chunking utility
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Chart.js |
| Backend | Node.js, Express |
| Database | MongoDB Atlas (Mongoose) |
| AI / RAG | OpenAI API (embeddings + chat completions) |
| Auth | Firebase Authentication + Firebase Admin SDK |
| PDF | pdf-parse, Multer |
| Vector Store | In-memory (dev) / Pinecone (prod) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB Atlas account
- OpenAI API key
- Firebase project

### 1. Clone the repository

```bash
git clone https://github.com/NavDevs/DocMind.git
cd DocMind
```

### 2. Set up the Server

```bash
cd server
npm install
cp .env.example .env
# Fill in your values in .env
npm run dev
```

### 3. Set up the Client

```bash
cd client
npm install
cp .env.example .env
# Fill in your Firebase config values
npm run dev
```

The app will be available at `http://localhost:5173`

---

## 🔑 Environment Variables

### Server (`server/.env`)

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `OPENAI_API_KEY` | OpenAI API key for RAG + summaries |
| `VECTOR_STORE` | `local` (dev) or `pinecone` (prod) |
| `PINECONE_API_KEY` | Pinecone API key (if using Pinecone) |
| `PINECONE_INDEX_NAME` | Pinecone index name |
| `CLIENT_URL` | Frontend URL for CORS |

### Client (`client/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |
| `VITE_FIREBASE_*` | Firebase project configuration |

See `.env.example` in each folder for the full list.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login user |
| `POST` | `/api/documents/upload` | Upload a PDF |
| `GET` | `/api/documents` | List all user documents |
| `DELETE` | `/api/documents/:id` | Delete a document |
| `POST` | `/api/chat` | Chat with a document |
| `GET` | `/api/chat/:documentId` | Get chat history |
| `GET` | `/api/analytics` | Get usage analytics |

---

## 📄 License

This project is built as a college project. Feel free to use it for learning purposes.

---

<div align="center">
  Built with ❤️ by <a href="https://github.com/NavDevs">NavDevs</a>
</div>
