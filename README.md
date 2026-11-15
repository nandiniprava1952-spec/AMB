# Anaemia Mukt Bharat – PWA

Offline-capable screening & treatment guide built from the AMB XLSForm (English + Odia).

## Publish on GitHub Pages
1. Create a new GitHub repo (e.g. `amb-pwa`) and upload **all files in this folder** (keep the `icons/` folder).
2. Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)` → Save.
3. Open `https://<your-username>.github.io/amb-pwa/` on your phone → **Install app / Add to Home Screen**.

To update: edit files, commit, and bump `V` in `sw.js` (e.g. `amb-v2`).
Records are stored on the device (localStorage) – use **Export CSV** to back up.

## How updates work for the user

1. **Update found** – the app checks for a new version when it opens, when you return to it, and every 30 minutes. If one exists, a card appears at the top with a circular progress ring and a percentage, labelled “Downloading update…”.
2. **Update ready** – at 100% the card changes to “Update available” with **Update** and **Later** buttons. Tapping Later hides the card until the next check.
3. **Installing** – tapping Update shows a spinning ring with “Installing update…”, then the app restarts on its own.
4. **After the restart** – a message “✔ Updated to the latest version” appears.

To publish an update: change any app file and raise `V` in `sw.js` (for example `amb-v15` → `amb-v16`).
