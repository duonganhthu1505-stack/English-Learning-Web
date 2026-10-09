# English-Learning-Web

A responsive personal English-learning web app with daily lessons, browser-based pronunciation, short quizzes, and local progress tracking.

## Run locally

Open `index.html` in a modern browser (Chrome or Edge recommended). Pronunciation uses the browser Web Speech API and available system voices.

## Publish with GitHub Pages

1. Open the repository's **Settings**.
2. Select **Pages** in the sidebar.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`, then click **Save**.
5. Wait for the deployment and open the URL shown in Settings → Pages.

## Features

- Seven starter lessons with English-for-work vocabulary and examples.
- Click-to-hear pronunciation using built-in browser speech synthesis (en-US / en-GB where available).
- Multiple-choice exercises with instant explanations and scores.
- Completion tracking, best scores, and a simple study streak.
- Progress saved in this browser via `localStorage`; it does not sync between devices.
- Responsive beige, cream, and brown design.

## Notes

This is a static website: no backend, sign-in, or paid speech API is required. Available voices depend on the browser and operating system.
