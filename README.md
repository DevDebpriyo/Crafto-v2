# CRAFTO ✨

> **AI-Powered Text-to-3D Creation Platform**
> Turn simple prompts into fully editable 3D models in minutes.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-blue)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6)](https://www.typescriptlang.org/)

---

# 🎯 What is CRAFTO?

CRAFTO is a conversational AI platform that transforms **text prompts into production-ready 3D models**.
Describe what you imagine, refine it through chat, and export it for games, design, prototyping, or 3D printing.

Built for developers, creators, game designers, and 3D enthusiasts who want a fast and scalable way to generate and edit 3D assets using AI.

---

# 🚀 Key Features

## 🧠 Prompt → 3D Pipeline

* Generate 3D models from simple text prompts
* Multi-view image synthesis for accurate reconstruction
* Conversational editing using natural language
* Iterative design workflow

Example:

```
"A blue labubu doll in Japanese aesthetic"
```

---

## 🤖 Multi-Model AI Pipeline

CRAFTO uses a **multi-modal generation stack**:

* **Nano-Banana** → Multi-view image generation
* **Microsoft Trellis** → Image-to-3D reconstruction
* **Meshy AI** → Alternative 3D synthesis pipeline
* Intelligent orchestration between models for best results

This hybrid pipeline dramatically improves geometry quality and detail.

---

## 💬 Conversational Editing

Modify models using chat:

* Change materials or colors
* Adjust shape and proportions
* Add or remove features
* Iterate designs naturally

No traditional 3D software required.

---

## 🧩 Remeshing & Optimization

Advanced mesh controls for real production workflows:

* Increase / decrease polycount
* Mesh refinement and cleanup
* Optimize models for real-time rendering
* Prepare assets for game engines and 3D printing

---

## 🎮 Game-Ready Asset Creation

Generate assets ready for:

* Game development
* AR / VR projects
* Product visualization
* 3D printing
* Rapid prototyping

---

## 📦 Multi-Format Export

Export models in multiple industry formats:

* `.GLB / .GLTF`
* `.OBJ`
* `.STL`
* `.BLEND`
* `.SVG`

Use assets anywhere in your pipeline.

---

## ⚡ Advanced Capabilities

* Context-aware prompt engineering
* Smart asset caching for fast reloads
* Redis session persistence
* Real-time 3D viewer (React Three Fiber)
* Scalable event-driven backend

---

# 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│                 CRAFTO Platform             │
├─────────────────────────────────────────────┤
│                                             │
│  Frontend (Next.js + TypeScript + R3F)      │
│  ├─ Prompt Input & Generation Flow          │
│  ├─ Real-time 3D Viewer                     │
│  └─ Conversational Editing Interface        │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  Backend (FastAPI + Python)                 │
│  ├─ Prompt Orchestration Service            │
│  ├─ Remeshing & Optimization Pipeline       │
│  ├─ Export Service                          │
│  └─ Redis State Management                  │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  AI Services                                │
│  ├─ Nano-Banana (Multi-View Generation)     │
│  ├─ Microsoft Trellis (Image → 3D)          │
│  ├─ Meshy AI (3D Generation)                │
│  └─ Context-Aware Prompt Engineering        │
│                                             │
└─────────────────────────────────────────────┘
```

---

# 🛠️ Quick Start

## Prerequisites

* Node.js 18+
* Python 3.11+
* Redis
* API Keys:

  * Trellis / fal.ai key
  * Meshy AI key
  * Google Nano Banana 2 key

---

## Installation

### 1️⃣ Clone Repo

```bash
git clone https://github.com/DevDebpriyo/Crafto-v2.git
cd CRAFTO
```

### 2️⃣ Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp env.example .env
```

Add your API keys:

```
FAL_KEY=
MESHY_API_KEY=
REDIS_URL=
```

Start backend:

```bash
uvicorn main:app --reload
```

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open:

```
http://localhost:3000
```

---

# 🎮 Usage

1️⃣ Enter a prompt
2️⃣ Generate multi-view images
3️⃣ Convert to 3D model
4️⃣ Refine via chat
5️⃣ Remesh & optimize
6️⃣ Export assets

---

# 🎯 Roadmap

* [x] Text-to-3D generation
* [x] Conversational editing
* [x] Multi-model pipeline (Trellis + Meshy)
* [x] Remeshing & polycount control
* [x] Multi-format export
* [ ] Texture editing tools
* [ ] Animation support

---

# 🙏 Acknowledgments

* Microsoft Trellis
* Meshy AI
* Three.js
* FastAPI
* Next.js

---

**Built to turn imagination into 3D reality.** 🚀
