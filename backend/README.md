# EventEase Backend

This backend verifies Firebase ID tokens and will later host protected APIs.

## Setup

1. Create a Firebase service account JSON in Firebase Console.
2. Copy values into `backend/.env`:

```
PORT=8080
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

Note: replace newlines in the private key with `\n`.

## Run

```
npm install
npm run dev
```

## Test token

POST `/auth/verify` with JSON body:

```
{ "idToken": "<token>" }
```

## Protected endpoint

GET `/auth/me` with header:

```
Authorization: Bearer <idToken>
```
