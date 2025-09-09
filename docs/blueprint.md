# **App Name**: WemaTrust

## Core Features:

- Mock NIP Event Generator: Simulates inbound NIP notifications (pending, success, failed) via a POST endpoint. Requires txn_ref, to_account, amount, from_bank, status, and optional note.
- Account Balance Retrieval: Retrieves account balance, including real balance and an array of shadow entries, via GET /account/{id}/balance.
- Transfer Simulation with Partner Status Check: Simulates a transfer, checking the destination bank's status before initiating.  If the partner bank is SLOW or DOWN, a pre-transfer warning is triggered, requiring user confirmation via POST /transfer. It checks the status through the 'partner_status_changed' event
- Shadow Balance Management: Creates, updates, and reconciles shadow balance entries based on simulated NIP events. Visible in the UI but non-spendable until cleared. Generates notifications on state changes (pending, cleared, failed). It marks entries as non-spendable for transfers, and then communicates status
- Real-time Updates via SSE/WebSocket: Uses SSE or WebSocket to push real-time updates to the frontend for shadow entry creation, clearing, failure, and partner status changes, updating with shadow_created, shadow_cleared, shadow_failed events and information.
- Partner Bank Status Tool: Uses AI to dynamically adjust partner bank status based on simulated network conditions or historical success/failure rates, and automatically sets warning alerts when destination banks are experiencing problems to minimize the issues involved with a large amount of issues. This AI will have the ability to send notification through SMS services. (UP/SLOW/DOWN)
- SMS Stub: Logs SMS messages to a file or console for demo purposes, triggered by shadow entry state changes.

## Style Guidelines:

- Primary color: Wema Purple (#990D81) to align with Wema Bank's brand identity. This color embodies reliability and innovation.
- Background color: Light gray (#F2F2F2) to provide a clean, neutral backdrop that enhances the visibility of other UI elements.
- Accent color: Warm gold (#FFD200) to highlight interactive elements and calls to action, adding a touch of sophistication and guidance.
- Body and headline font: 'Inter', a grotesque-style sans-serif font with a modern and neutral look.
- Use minimalist icons with rounded corners to maintain a modern and friendly aesthetic.
- Employ a card-based layout with generous whitespace to improve readability and focus.
- Implement subtle micro-animations on status changes using Framer Motion or CSS transitions to provide clear visual feedback to the user.