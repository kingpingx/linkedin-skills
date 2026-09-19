# LinkedIn Week Planner

A small static web app for planning and tracking a week of LinkedIn posts.

- **Rolling 7-day view**: always today and the next 6 days, with each day's post status and progress on every activity. Posts from before today move to Earlier posts
- **Tabs for each day**: ✍️ Post, 💬 Comment, 👍 Like, ↩️ Reply, 🔁 Repost. Do any mix on any day, even all of them, and add a post to a day that had none
- **Activity tracking**: a daily target, a +/− counter, and a list of saved links and notes you tick off as you go (ticking counts it)
- **Editor + feed preview** showing where LinkedIn's "…see more" cut lands
- **Built-in checks**: unfilled `[placeholders]`, length (900–1,300 sweet spot, 3,000 limit), question opener, closing question, em dashes, hashtag count, links in the body
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

## Plan ahead

Add days to `data.js` with any date and a unique `id`; the planner picks up whichever fall in the next 7 days, and a date with nothing planned shows as an empty day. A day can come with saved items already in its activity tabs, such as a drafted reply: `todo: { reply: [{ note, text }] }`. Paste the comment's link onto it later to send it through Publora.

Edits you make in the browser are saved in `localStorage` by day `id` (edits from the old weekly planner are brought over on first load). Keep `week:` on the older days as it is: it's the key their images and Publora records were saved under.

## Schedule or post from the planner

With `python serve.py` running, every post has a **Publora** panel at the top of its editor:

- **Not on Publora yet**: pick a time and press **Schedule**, or **Post now**.
- Once sent it shows the real status from Publora (scheduled, published, failed), with **Check status** and **Cancel on Publora**.

`serve.py` sends the post using `PUBLORA_API_KEY` and `LINKEDIN_PLATFORM_ID` from the linkedin-skills folder's `.env` (it looks in `../LinkedIn`; set `LINKEDIN_SKILLS_DIR` to change that), so your key never reaches the browser. **Schedule** and **Post now** ask you to confirm in the page (time, image, length, first line) and then send; the desktop Yes box is off for these by choice. **Cancel**, and the like/comment/reply/repost buttons below, still pop a **Yes/No approval box** on your desktop first. A post with your own image goes through Publora's upload flow (draft, upload the image, then schedule). What was sent is recorded in `published.json` (git-ignored).

## Like, comment, reply, and repost

In the Like, Comment, Reply, and Repost tabs, save the LinkedIn link of a post you want to engage with. Then either do it on LinkedIn yourself and tick it off, or, with `serve.py` running, use the button on the saved link:

- **Like:** pick a reaction (Like, Celebrate, Support, Love, Insightful, Funny) and press **React via Publora**.
- **Comment:** write your comment (up to 1,250 characters) and press **Post comment via Publora**.
- **Reply:** save the comment's own link (… on the comment → Copy link to comment), write your reply, and press **Post reply via Publora**.
- **Repost:** optionally write your thoughts on top and press **Repost via Publora**. The post is looked up through Apify first (needs `APIFY_TOKEN`), and posts whose author turned off reposting are refused.

Each one pops the same Yes/No approval box first. Once sent, the item is ticked off and counts toward the day's target.

## Images

Each post has an **Image** section:

- **Paste a URL** of an image that's already online, or
- **Upload your own** (or drag and drop a PNG, JPG, GIF, or WebP onto the section).

Tick or untick **Attach image to this post** to post with or without it. The feed preview shows the image under the text.

When the planner runs through `python serve.py`, your own images are saved as base64 in **`images.json`** next to the app: one image per post, a new upload replaces the old one, and **Remove image** deletes it. A scheduler can read the image straight from that file and upload it to Publora's media storage (draft, upload, then schedule), so no public hosting is needed. `images.json` is git-ignored.

Opened without the server (straight from the file, or on GitHub Pages), your images stay in this browser's IndexedDB instead, and the planner reminds you to run `serve.py` before scheduling.

## Privacy

Everything stays in your browser. Nothing is sent anywhere, and no API keys are used.
