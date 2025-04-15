# 🐉 Picture Hunter API

An experimental multimodal API backend for generating real-time monsters from user-submitted images.  
Used in the interactive entertainment system **Picture Hunter II**, presented at EC2024.

---

## 🎮 Overview

**Picture Hunter API** is the backend component of the game *Picture Hunter II*, a real-time, multiplayer, photo-based strategy game.  
It transforms images submitted by players into monster attributes through a pipeline involving:

- 📷 Image Captioning via GPT-4o
- 🌤️ Text Embedding with OpenAI `text-embedding-3`
- 🧠 Semantic mapping to in-game stats (HP, ATK, SPEED, DPS)
- 📃 Real-time storage and syncing via Firestore

This API enables the connection between the physical world and the digital battlefield.

---

## 🧠 Core Concepts

- **Player-oriented input**: Players submit real-world photos to influence in-game outcomes.
- **Balanced mapping**: Combines *predictability* and *surprise* to maintain engagement.
- **Multimodal AI**: Leverages strengths and weaknesses of LLMs (e.g., hallucinations) as gameplay elements.

---

## 🛏 System Architecture

```text
Player Image
   │
   ├─▶ GPT-4o (Caption Generation)
   │
   ├─▶ Embedding (OpenAI Text-Embedding-3)
   │
   ├─▶ Vector Mapping → Game Stats (HP, ATK, DPS...)
   │
   └─▶ Store to Firebase Firestore
                 │
                 ▼
           React-based Frontend renders live
```

---

## 🔧 Tech Stack

- **LLM**: OpenAI GPT-4o
- **Embedding Model**: `text-embedding-3` (OpenAI)
- **Storage / Sync**: Firebase Firestore
- **Framework**: Python (Flask or FastAPI recommended)
- **Deployment**: Cloud Functions (GCP), or your own server

---

## 🛆 Example API Usage (pseudo-code)

```bash
POST /generate-monster

{
  "image_base64": "...",
  "team_id": "kanto"
}
```

**Response:**

```json
{
  "name": "Flame Basilisk",
  "caption": "A fiery lizard coiled in red smoke",
  "stats": {
    "hp": 1200,
    "atk": 300,
    "speed": 1.6,
    "dps": 250
  }
}
```

---

## 🌐 Live Demo (Frontend)

The frontend client is deployed here:  
🔗 https://picture-hunter2.web.app/  
(Accessible only during event sessions or via partner keys)

---

## 📒 Academic Reference

This project is part of the research presented at:

> **Entertainment Computing Symposium 2024 (EC2024)**  
> *“Picture Hunter II: A Real-Time Participatory Game Using Multimodal LLM-Based Monster Generation”*  
> 📘 Authors: Yudai Nakamura, Hiroyoshi Miwa, Sunao Hirano, Haruhiro Katayose

---

## 💡 Future Plans

- Add monster evolution logic & leveling system
- Improve numeric stability in LLM outputs
- Integrate text-to-image (e.g., DALL·E) for visuals
- Add embedding-based clustering for monster types

---

## 📄 License

MIT License

---

Made with 🧠 & 🐉 by [@kamekingdom](https://github.com/kamekingdom)

