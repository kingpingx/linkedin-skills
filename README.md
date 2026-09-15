# LinkedIn Week Planner

A small static web app for planning and tracking a week of LinkedIn posts.

- **Week view** with each day's post time, goal, and status (draft, ready, scheduled, posted)
- **Editor + feed preview** showing where LinkedIn's "…see more" cut lands
- **Built-in checks**: unfilled `[placeholders]`, length (900–1,300 sweet spot, 3,000 limit), question opener, closing question, em dashes, hashtag count, links in the body
- **Comment tracker**: daily target and who to comment on
- **Weekly checklist** and progress
- **Export JSON** of the week's final texts and statuses

No build step and no dependencies: plain HTML, CSS, and JavaScript.

## Run it

Open `index.html` in a browser, or run the local server (caching off, so edits show on a normal refresh):

```bash
python serve.py        # http://127.0.0.1:8080
```

## Host it on GitHub Pages

Repository **Settings → Pages → Build and deployment → Deploy from a branch**, pick `main` and `/ (root)`.

## Plan a new week

Edit `data.js`: change `week.start`, the `days`, and the post texts. Edits you make in the browser are saved in `localStorage` per week (keyed by `week.start`), so a new week starts clean.

## Images

Each post has an **Image** section:

- **Paste a URL** of an image that's already online, or
- **Upload your own** (or drag and drop a PNG, JPG, GIF, or WebP onto the section).

Tick or untick **Attach image to this post** to post with or without it. The feed preview shows the image under the text.

Your own images are stored in this browser (IndexedDB), so they survive a refresh but not a different browser. Scheduling tools such as Publora need a **hosted link**, so before scheduling a post with your own image, upload it somewhere public and paste that link in.

## Privacy

Everything stays in your browser. Nothing is sent anywhere, and no API keys are used.
