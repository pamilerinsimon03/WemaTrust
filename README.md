# [Project Title]

## Team Members
- Olaniran Pamilerin Simon
- Oluremi Alao
- Victor Akinmoladun
- Ayooluwa Paul
- Kolawole Jegede

---

## 🚀 Live Demo

*   **Live Application:** [Link to your deployed Vercel/Netlify/Render URL]
*   **Backend API:** [Link to your live backend API endpoint URL, if separate]
*   **Recorded Demo:** [Link to your recorded demo explaining how your solution works using Loom].


---

## 🎯 The Problem

**Challenge Track:** E-Channels & Transaction Reliability  
**Challenge Question:**  
> How might we shield customers from internal system complexities and make every digital transaction feel instant and completely reliable, even when failures occur behind the scenes?

## ✨ Our Solution

Our project, **Instant-Feel Transactions**, is a prototype mobile banking app (built with Wema Bank colors) designed to **preserve customer trust during transaction delays**.  

Key features:
- **Proactive Communication:** Clear push + SMS notifications before, during, and after transactions (e.g., if a destination bank is slow or down).  
- **Shadow Balance (MoneyBox):** Incoming transfers appear instantly as a "pending balance" visible to customers, even if they aren’t yet fully cleared. Customers see proof of the transaction without being able to spend until confirmed.  
- **Monitoring & Transparency:** Simple dashboard showing partner bank statuses (UP / SLOW / DOWN). Users can check via app or USSD.  
- **Fallback Channels:** SMS + USSD support for feature-phone users or during poor internet conditions.  

This way, customers always see **instant feedback** on their money — turning potential frustration into **trust and confidence**.

---

## 🛠️ Tech Stack

*   **Frontend (Mobile App):** React Native + Expo, Tailwind CSS (via NativeWind), Framer Motion for animations  
*   **Backend:** FastAPI (Python) with WebSocket/SSE for real-time events  
*   **Database:** SQLite (for prototype persistence)  
*   **Deployment:** Vercel and Render
*   **APIs / Integrations:** Mock NIP Event Generator, SMS Stub, USSD Simulation 

---

## ⚙️ How to Set Up and Run Locally (Optional)

*Briefly explain the steps to get your project running on a local machine.*

**Example:**

1.  Clone the repository:
    ```bash
    git clone [your-repo-link]
    ```
2.  Navigate to the project directory:
    ```bash
    cd instant-feel-transactions
    ```
3.  Install dependencies (frontend + backend):
    ```bash
    cd frontend && npm install
    cd ../backend && pip install -r requirements.txt
    ```
4.  Run the backend:
    ```bash
    uvicorn main:app --reload
    ```
5.  Run the frontend:
    ```bash
    npm start
    ```
6.  Open the Expo Go app on your phone and scan the QR code to launch the prototype. 

---

## 📖 Documentation

- **Shadow Balance Lifecycle:** Pending → Cleared / Failed with reconciliation logic.  
- **Notifications:** All state changes generate push + SMS (stubbed).  
- **Monitoring Panel:** Toggles partner bank status to simulate real-world outages.  

---