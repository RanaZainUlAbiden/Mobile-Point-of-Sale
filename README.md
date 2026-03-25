# Hisaab Pro 📦

> **Smart Inventory & Billing App for Pakistani Shopkeepers**  
> Built by [DevInfantary](https://github.com/DevInfantary) — Marching Innovation Forward

---

## What is Hisaab Pro?

Hisaab Pro is a mobile-first inventory management and billing application designed specifically for small shop owners in Pakistan. It allows shopkeepers to scan product barcodes, manage stock, create bills, track sales, and view reports — all from their Android phone, completely offline.

### Key Features

- 📷 **Barcode Scanner** — scan products using your phone camera
- 🔦 **Torch/Flash support** — scan in low light conditions
- 🛒 **Smart Billing** — build bills in real time with a live split-screen scanner
- 📦 **Stock Management** — track inventory, get low stock warnings, restock products
- 🔍 **Search by Name** — find products without a barcode
- 📊 **Reports & Sessions** — view daily sales history and totals
- 💾 **Save Bills** — save completed bills, auto-deduct stock
- 🔐 **License System** — device-locked 30-day subscription with WhatsApp renewal
- 💰 **PKR Currency** — built for Pakistan (Rs.)
- 📱 **Android APK** — installable on any Android phone

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js + Express.js |
| Database (server) | MongoDB + Mongoose |
| Database (mobile) | localStorage (offline) |
| Barcode Scanning | Quagga.js |
| Mobile Packaging | Capacitor (Android) |
| Font | Plus Jakarta Sans |

---

## Project Structure

```
Hisaab Pro/
├── public/                  # Frontend (served to browser/app)
│   ├── index.html           # Main app HTML
│   ├── logo.png             # App logo (with text)
│   ├── logo-icon.png        # App icon (without text)
│   ├── css/
│   │   └── app.css          # All styles
│   └── js/
│       ├── app.js           # Main app init + navigation
│       ├── license.js       # Activation + device locking + subscription
│       ├── db.js            # localStorage database (products, bills, sessions)
│       ├── scanner.js       # Camera + Quagga barcode scanner
│       └── ui.js            # All UI rendering + modals + actions
├── models/
│   ├── Product.js           # MongoDB Product schema
│   └── Session.js           # MongoDB Session schema
├── routes/
│   ├── products.js          # REST API for products
│   └── session.js           # REST API for sessions
├── android/                 # Capacitor Android project (auto-generated)
├── server.js                # Express server
├── capacitor.config.json    # Capacitor configuration
├── .env                     # Environment variables
└── package.json
```

---

## Getting Started

### Prerequisites

Make sure you have these installed on your computer:

- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB](https://www.mongodb.com/try/download/community) (Community Edition)
- [Git](https://git-scm.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/YourUsername/hisaab-pro.git
cd hisaab-pro
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root folder:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hisaabpro
```

### 4. Start MongoDB

**Windows:**
```bash
net start MongoDB
```

**Mac/Linux:**
```bash
sudo systemctl start mongod
```

### 5. Start the Server

```bash
nodemon server.js
```

Or without nodemon:
```bash
node server.js
```

### 6. Open in Browser

```
http://localhost:3000
```

You will see the **Activation Screen**. To bypass activation for development, open `public/js/app.js` and in the `init()` function, comment out the license check and call `this.start()` directly.

---

## Testing on Mobile Phone

Since the camera requires HTTPS, use **ngrok** to expose your local server:

```bash
npm install -g ngrok
ngrok http 3000
```

Copy the `https://...ngrok-free.app` URL and open it on your phone.

---

## Building the Android APK

### Prerequisites

- [Android Studio](https://developer.android.com/studio)
- [Java JDK 17](https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html)
- Android SDK (installed via Android Studio)

### Steps

```bash
# Sync web assets to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

In Android Studio:
```
Build → Generate App Bundles or APKs → Build APK(s)
```

The APK will be at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## License & Activation System

Hisaab Pro uses a **device-locked licensing system**:

- Each installation generates a unique **Device ID**
- The user shares their Device ID with the developer
- The developer generates an **Activation Code** (valid for that device only)
- Each activation lasts **30 days**
- After expiry, the user contacts the developer via WhatsApp to renew

### Generating Activation Codes

Use this JavaScript snippet to generate a code for any Device ID:

```javascript
const SALT = 'HISAABPRO2024DI';

function generateCode(deviceId, dateStr) {
  const str = deviceId + SALT + dateStr;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash = hash & hash;
  }
  const abs = Math.abs(hash).toString(36).toUpperCase().padStart(8, '0');
  return abs.substr(0, 4) + '-' + abs.substr(4, 4);
}

const today = new Date().toISOString().slice(0, 10);
console.log(generateCode('HP-XXXXXXXX-XXXXXX', today));
```

---

## App Screens

| Screen | Description |
|--------|-------------|
| **Activation** | Device ID + activation code entry |
| **Dashboard** | Today's sales, units sold, recent sessions |
| **Sale** | Scan/search products, build bill, save session |
| **Products** | Add/edit/delete products with stock levels |
| **Reports** | Full session history with totals |
| **Settings** | Device ID, subscription status, renewal |

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/hisaabpro` |

---

## API Endpoints

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products |
| GET | `/api/products/:barcode` | Get product by barcode |
| POST | `/api/products` | Add new product |
| PUT | `/api/products/:barcode` | Update product |
| DELETE | `/api/products/:barcode` | Delete product |

### Session
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/session` | Get current session |
| POST | `/api/session/item` | Add item to session |
| PUT | `/api/session/item/:barcode` | Update item quantity |
| DELETE | `/api/session/item/:barcode` | Remove item |
| DELETE | `/api/session/clear` | Clear entire session |

---

## Contributing

This project was built for Pakistani shopkeepers by DevInfantary. If you'd like to contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## Developer

**DevInfantary**  
*Marching Innovation Forward*

- 📧 Contact via WhatsApp for licensing and support
- 🌐 Built in Lahore, Pakistan 🇵🇰

---

## License

This project is proprietary software developed by DevInfantary.  
Unauthorized distribution or modification is not permitted without written consent.

---

*Hisaab Pro v1.0 — Making inventory management simple for every shopkeeper in Pakistan*
