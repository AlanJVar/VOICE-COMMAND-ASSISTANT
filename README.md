# Deployed app link -> 
# https://voice-command-shopping-cfb9a.web.app
---


# 🛒 Voice-Command AI Shopping Assistant

An end-to-end, full-stack voice-enabled shopping list and recommendation assistant. This project combines a **Firebase Hosting + Firestore** frontend with a **Python REST API** backend deployed on Render. Users can log in using Google Authentication, manage their shopping lists using natural spoken commands, receive smart contextual suggestions, and maintain a seamless purchase history.

---

## 🚀 Key Features

- **Google Authentication:** Secure login via Firebase Google Auth (`signInWithPopup`).
- **Voice Recognition & Synthesis:** Speech-to-text input integrated with Web Speech API and text-to-speech feedback.
- **Smart Natural Language Parsing:** Python backend parses voice commands (e.g., *"Add 2 bottles of milk"*, *"Remove apples"*) into structured actions.
- **Contextual Suggestions:** Provides smart and seasonal shopping suggestions based on user context and history.
- **Real-Time Data Sync:** Instant database synchronization using Cloud Firestore.
- **Purchase History Archiving:** Automatically archives removed or checked-off items to user purchase history for future recommendations.

---

## 🛠️ Tech Stack & Architecture

### Frontend
- **HTML5 / CSS3 / JavaScript (ES6+ Modules)**
- **Firebase SDK v10** (Authentication & Cloud Firestore)
- **Web Speech API** (SpeechRecognition & SpeechSynthesis)

### Backend
- **Python** (REST API)
- **Deployment Platform:** Render
- **Hosting Platform:** Firebase Hosting

---

## 📂 Project Structure

```text
voice-command-shopping/
│
├── public/
│   ├── index.html        # Main Application Interface
│   ├── app.js            # Frontend Logic, Firebase Auth, & Speech Engine
│   └── styles.css        # UI Styling
│
├── firebase.json         # Firebase Hosting Configuration
├── .firebaserc           # Firebase Project Mapping
└── README.md             # Project Documentation
```

---

## 📋 Prerequisites & Requirements

Make sure you have the following installed/configured before setting up:

1. **Node.js & npm:** [Download Node.js](https://nodejs.org/) (includes `npm` and `npx`).
2. **Firebase CLI:** Install globally via terminal:
   ```bash
   npm install -g firebase-tools
   ```
3. **Google Firebase Account:** Access to the [Firebase Console](https://console.firebase.google.com/).

---

## 🔧 Firebase Console Setup

1. **Create a Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
   - Name your project (e.g., `voice-command-shopping`).

2. **Enable Firebase Authentication:**
   - Go to **Authentication** > **Get Started**.
   - Under the **Sign-in method** tab, enable **Google**.
   - Configure the **Project support email** and click **Save**.
   - Under the **Settings** tab > **Authorized domains**, ensure the following domains are listed:
     - `localhost`
     - `<your-project-id>.firebaseapp.com`
     - `<your-project-id>.web.app`

3. **Enable Cloud Firestore Database:**
   - Go to **Firestore Database** > **Create Database**.
   - Select **Standard Edition** and choose your preferred location.
   - Start in **Test mode** or **Production mode**.
   - Update your **Rules** under the Firestore **Rules** tab:
     ```javascript
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /users/{userId}/{document=**} {
           allow read, write: if request.auth != null && request.auth.uid == userId;
         }
       }
     }
     ```
   - Click **Publish**.

---

## 📦 Installation & Local Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/your-username/voice-command-shopping.git
   cd voice-command-shopping
   ```

2. **Configure Firebase Credentials:**
   Open `public/app.js` and ensure your `firebaseConfig` matches your Firebase Project settings:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

3. **Backend API URL:**
   In `public/app.js`, verify the Python API URL pointing to your Render service:
   ```javascript
   const PYTHON_API_URL = "https://voice-command-assistant.onrender.com";
   ```

4. **Run Locally:**
   Test your hosting locally using Firebase CLI:
   ```bash
   firebase serve --only hosting
   ```
   Open your browser at `http://localhost:5000`.

---

## 🚀 Deployment

To deploy updates to Firebase Hosting live on the web:

1. Log in to Firebase CLI (if not already logged in):
   ```bash
   firebase login
   ```

2. Deploy hosting:
   ```bash
   npx firebase-tools deploy --only hosting
   ```

3. Access your live application at:
   - `https://<your-project-id>.web.app`
   - `https://<your-project-id>.firebaseapp.com`

---

## 🎮 How to Use

1. **Log In:** Click **Log In with Google** to authenticate.
2. **Add Items via Voice:**
   - Click **🎤 Speak Command**.
   - Speak commands like:
     - *"Add 2 litres of milk"*
     - *"Add 5 apples"*
3. **Smart Suggestions:** If the assistant suggests a healthier or seasonal alternative, reply with *"Yes"* or *"No"* (or click the UI buttons).
4. **Remove Items:** Speak *"Remove milk"* or click the `✕` button next to an item in the list.
