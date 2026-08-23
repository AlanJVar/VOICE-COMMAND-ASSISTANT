import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocs,
  where,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD48y_GmR7T2pSX4aam13jyJ8tjKjTOyDg",
  authDomain: "voice-command-shopping-cfb9a.firebaseapp.com",
  projectId: "voice-command-shopping-cfb9a",
  storageBucket: "voice-command-shopping-cfb9a.firebasestorage.app",
  messagingSenderId: "421055758523",
  appId: "1:421055758523:web:f1cb583e0bb5fdff8c699e"
};

const PYTHON_API_URL = "https://voice-command-assistant.onrender.com";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let pendingItemData = null;
let unsubscribeList = null;

// Auth State Listener - purely handles UI state updates
onAuthStateChanged(auth, (user) => {
  const authBtn = document.getElementById('authBtn');
  const userStatus = document.getElementById('userStatus');

  if (user) {
    currentUser = user;
    if (userStatus) userStatus.innerText = `Logged in as: ${user.displayName || user.email}`;
    if (authBtn) authBtn.innerText = "Log Out";
    listenToUserList();
  } else {
    currentUser = null;
    if (userStatus) userStatus.innerText = "Not logged in";
    if (authBtn) authBtn.innerText = "Log In with Google";
    if (unsubscribeList) unsubscribeList();
    const listElement = document.getElementById('shoppingList');
    if (listElement) listElement.innerHTML = '<li style="background:none;justify-content:center;color:#888;">Log in to view list</li>';
  }
});

// Single Auth Button Listener
document.getElementById('authBtn').addEventListener('click', async () => {
  if (currentUser) {
    await signOut(auth);
  } else {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        console.error("Sign-in error:", err);
      }
    }
  }
});

// Real-Time List Listener
function listenToUserList() {
  if (!currentUser) return;
  if (unsubscribeList) unsubscribeList();

  const userItemsCollection = collection(db, "users", currentUser.uid, "shopping_lists");
  const q = query(userItemsCollection, orderBy("createdAt", "desc"));

  unsubscribeList = onSnapshot(q, (snapshot) => {
    const listElement = document.getElementById('shoppingList');
    if (!listElement) return;
    listElement.innerHTML = '';
    
    if (snapshot.empty) {
      listElement.innerHTML = '<li style="background:none;justify-content:center;color:#888;">List is empty</li>';
      return;
    }

    snapshot.forEach((docSnapshot) => {
      const item = docSnapshot.data();
      const id = docSnapshot.id;

      const li = document.createElement('li');
      li.innerHTML = `
        <div>
          <strong>${item.item}</strong> (x${item.quantity}) 
          <br><small style="color:#007bff;text-transform:capitalize;">[${item.category}]</small>
        </div>
        <button class="delete-btn" data-id="${id}" data-name="${item.item}" data-cat="${item.category}">✕</button>
      `;
      listElement.appendChild(li);
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        const docId = e.target.getAttribute('data-id');
        const itemName = e.target.getAttribute('data-name');
        const itemCat = e.target.getAttribute('data-cat');
        
        await archivePurchase(itemName, itemCat);
        await deleteDoc(doc(db, "users", currentUser.uid, "shopping_lists", docId));
      });
    });
  }, (err) => {
    console.error("Firestore error:", err);
  });
}

function speak(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }
}

function showConfirmationUI(original, suggested, reason) {
  const promptBox = document.getElementById('confirmPrompt');
  if (promptBox) promptBox.style.display = 'block';
  document.getElementById('promptText').innerText = 
    `Suggestion: Replace "${original}" with "${suggested}" (${reason})?`;
}

function hideConfirmationUI() {
  const promptBox = document.getElementById('confirmPrompt');
  if (promptBox) promptBox.style.display = 'none';
  pendingItemData = null;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

async function archivePurchase(itemName, category) {
  if (!currentUser) return;
  const historyRef = doc(db, "users", currentUser.uid, "purchase_history", itemName.toLowerCase());
  await setDoc(historyRef, {
    item: itemName.toLowerCase(),
    category: category || "general",
    lastBoughtAt: serverTimestamp()
  }, { merge: true });
}

async function saveToFirestore(itemData) {
  if (!currentUser) {
    alert("Please log in first to save items!");
    return;
  }

  try {
    const userItemsCollection = collection(db, "users", currentUser.uid, "shopping_lists");
    const existingQuery = query(userItemsCollection, where("item", "==", itemData.item));
    const querySnapshot = await getDocs(existingQuery);

    if (!querySnapshot.empty) {
      const existingDoc = querySnapshot.docs[0];
      const currentQty = existingDoc.data().quantity || 1;
      await updateDoc(doc(db, "users", currentUser.uid, "shopping_lists", existingDoc.id), {
        quantity: currentQty + itemData.quantity
      });
      document.getElementById('status').innerText = `Updated "${itemData.item}" quantity.`;
    } else {
      await addDoc(userItemsCollection, {
        item: itemData.item,
        quantity: itemData.quantity,
        category: itemData.category,
        createdAt: serverTimestamp()
      });
      document.getElementById('status').innerText = `Added "${itemData.item}" to list.`;
    }
  } catch (e) {
    console.error("Firestore Save Error:", e);
  } finally {
    hideConfirmationUI();
  }
}

// Speech Recognition Engine
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  const speakBtn = document.getElementById('speakBtn');
  const statusEl = document.getElementById('status');

  speakBtn.addEventListener('click', () => {
    if (!currentUser) {
      alert("Please log in first.");
      return;
    }
    recognition.lang = document.getElementById('langSelect').value;
    recognition.start();
    speakBtn.innerText = "Listening...";
  });

  recognition.onend = () => {
    speakBtn.innerText = "🎤 Speak Command";
  };

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase().trim();
    statusEl.innerText = `Recognized: "${transcript}"`;

    if (pendingItemData) {
      const dataToSave = { ...pendingItemData };
      hideConfirmationUI();

      if (transcript.includes("yes") || transcript.includes("sure") || transcript.includes("accept") || transcript.includes("swap")) {
        dataToSave.item = dataToSave.suggested_item;
        speak(`Adding ${dataToSave.item}`);
      } else {
        speak(`Adding original item: ${dataToSave.item}`);
      }

      await saveToFirestore(dataToSave);
      return;
    }

    try {
      const res = await fetch(`${PYTHON_API_URL}/parse-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command: transcript,
          user_id: currentUser ? currentUser.uid : "guest" 
        })
      });

      const parsedData = await res.json();

      if (parsedData.action === "add") {
        if (parsedData.has_suggestion) {
          pendingItemData = parsedData;
          showConfirmationUI(parsedData.item, parsedData.suggested_item, parsedData.suggestion_reason);
          speak(`Would you like ${parsedData.suggested_item} instead of ${parsedData.item}? Say yes or no.`);
        } else {
          await saveToFirestore(parsedData);
        }
      } else if (parsedData.action === "remove") {
        const userItemsCollection = collection(db, "users", currentUser.uid, "shopping_lists");
        const allDocs = await getDocs(userItemsCollection);
        let deleted = false;
        
        allDocs.forEach(async (docSnap) => {
          const storedItemName = docSnap.data().item.toLowerCase();
          if (storedItemName.includes(parsedData.item) || parsedData.item.includes(storedItemName)) {
            await archivePurchase(docSnap.data().item, docSnap.data().category);
            await deleteDoc(doc(db, "users", currentUser.uid, "shopping_lists", docSnap.id));
            deleted = true;
          }
        });

        statusEl.innerText = deleted 
          ? `Removed "${parsedData.item}" from list and saved to purchase history.` 
          : `Item "${parsedData.item}" not found in list.`;
      }

    } catch (err) {
      console.error(err);
      statusEl.innerText = "Error reaching API.";
    }
  };
}

// UI Buttons for Suggestions
document.getElementById('acceptBtn').addEventListener('click', async () => {
  if (pendingItemData) {
    const dataToSave = { ...pendingItemData };
    dataToSave.item = dataToSave.suggested_item;
    hideConfirmationUI();
    await saveToFirestore(dataToSave);
  }
});

document.getElementById('rejectBtn').addEventListener('click', async () => {
  if (pendingItemData) {
    const dataToSave = { ...pendingItemData };
    hideConfirmationUI();
    await saveToFirestore(dataToSave);
  }
});

// Suggestions Loader
async function loadSuggestions() {
  try {
    const res = await fetch(`${PYTHON_API_URL}/suggestions`);
    const data = await res.json();
    document.getElementById('suggestions').innerHTML = `
      <p>📌 <strong>Smart:</strong> ${data.smart}</p>
      <p>🌿 <strong>Seasonal:</strong> ${data.seasonal}</p>
    `;
  } catch (e) {
    document.getElementById('suggestions').innerText = "Suggestions unavailable.";
  }
}
loadSuggestions();
