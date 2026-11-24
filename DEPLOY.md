# Deploying the demo anonymously (GitHub Pages)

The paper is under double-blind review, so the demo link must not reveal the
authors. GitHub Pages is the cheapest way to get a clickable URL, but a GitHub
account name and commit metadata are **public**. Work through this checklist in
order.

If you prefer not to host anything, skip to
[Option B — supplementary zip](#option-b--supplementary-zip); the page is fully
offline and reviewers can unzip and open it.

---

## 0. Before you start

- Repository content: this folder (`index.html`, `assets/`, `cases/`).
  Total size ≈ 3.3 MB, far below GitHub's limits.
- Do **not** commit `manifest.json`, `manifest.csv`, internal paths, personal
  notes or this checklist's "who did what" history.
- Anything pushed to a public repo is permanent in the network's caches. Treat
  the link as public from the moment you push.

## 1. Create a throw-away GitHub account

1. Use a fresh, neutral e-mail address that is not linked to you (e.g. a new
   provider mailbox). Do not reuse an address that appears on your homepage,
   CV, ORCID or other papers.
2. Pick a neutral username, e.g. `dialect-demo-anon`, `speech-demo-7x6` —
   avoid your initials, lab name, city or paper title.
3. Do not add a name, bio, avatar, location, website or organisation to the
   profile. Leave it empty.
4. Do not enable two-factor via a phone number that is publicly associated with
   you (GitHub may show nothing, but keep the account clean anyway).

## 2. Create an empty public repository

If the repository already exists (this folder is already published at
`https://github.com/OpenDialect/DSI-CDTTS`), skip this step and continue with
step 3.

- Name: neutral, e.g. `cross-dialect-demo`.
- Description: `Audio demo (anonymous submission)` or empty.
- Visibility: **Public** (GitHub Pages for private repos requires a paid plan).
- Do not initialise with a README, .gitignore or licence — the folder already
  has them.

## 3. Create the commit with an anonymous identity

`git` records an author name and e-mail in every commit. Run the helper, which
sets a **repository-local** identity (`Anonymous Author
<anonymous@example.com>`) and leaves your global config untouched:

```sh
cd cross-dialect-demo
./tools/init_git_anonymous.sh
```

Verify:

```sh
git log --format='%h %an <%ae> %s' -n 3
# 0000000 Anonymous Author <anonymous@example.com> Anonymous demo page: …
git config --local --get user.email   # anonymous@example.com
```

If you already have commits with your real identity, do not push them. Remove
`.git/` and re-run the helper instead.

## 4. Push

```sh
git remote add origin https://github.com/<anon-account>/<repo>.git \
  || git remote set-url origin https://github.com/<anon-account>/<repo>.git
git push -u origin main
```

When git asks for credentials:

- create a **fine-grained personal access token** on the anonymous account
  (Settings → Developer settings → Tokens) with `Contents: Read and write` on
  this repo only;
- use it as the password once, and do **not** let macOS Keychain save it
  under your main account's credentials. If the keychain already stores
  credentials for `github.com`, clear them first
  (`git credential-osxkeychain erase`), or push over SSH with a key that was
  generated for the anonymous account.

Then double-check on github.com: the commit author must read
`Anonymous Author`, the account must have no personal details, and there must
be no other branches or tags.

**Push identity matters as much as commit identity.** GitHub shows the pushing
account in the repository's public activity; if a personal account (or a
personal account added as a collaborator) pushes, that links the demo to you.
Push from the anonymous account itself — add the deploy key to that account's
**Settings → SSH keys** rather than granting a personal account collaborator
access, and remove any collaborator that was only used to bootstrap the repo.

## 5. Enable Pages

1. Repository → **Settings** → **Pages**.
2. **Build and deployment → Source: Deploy from a branch**.
3. Branch: `main`, folder: `/ (root)` → **Save**.
4. Wait 1–2 minutes. The page appears at
   `https://<anon-account>.github.io/<repo>/`.

`.nojekyll` is already present, so Pages serves the folder as-is instead of
running Jekyll; the MP3s and JS are delivered as plain static files.

## 6. Verify the deployed page

Open the URL on desktop **and** on a phone, then check:

- [ ] page renders with all 7 cases and 6 players per case;
- [ ] first clip of a case plays; starting another clip stops the previous one;
- [ ] waveform click seeks; the per-case "Play all" advances automatically;
- [ ] language toggle switches every label, theme toggle switches colours;
- [ ] `#case-04_dongbei_s12` opens the right case, nav chip highlights;
- [ ] DevTools → Network: only local requests (html, css, js, mp3) — no
      third-party domains;
- [ ] the page still works with the network throttled to "Slow 3G" (audio
      loads on first click by design).

## 7. After the review

Delete the repository (Settings → General → Delete this repository) or make it
private once the anonymity period ends. Keep the URL out of the camera-ready
version until you are ready to de-anonymise.

---

## Option B — supplementary zip

If the venue only accepts a supplementary file, package the site and upload the
zip:

```sh
./tools/package_offline.sh
# → DSI-CDTTS-demo-page.zip (~3 MB)
```

Reviewers unzip it, double-click `index.html`, and everything plays offline
(no network access required, works on macOS/Windows/Linux browsers).

Test it yourself before uploading:

```sh
cd /tmp && unzip -q ~/path/to/DSI-CDTTS-demo-page.zip -d demo-check
open demo-check/index.html
```

---

## Anonymity checklist

| Item | Requirement |
|---|---|
| GitHub account | throw-away, no personal details, neutral name |
| Commit author | `Anonymous Author <anonymous@example.com>` (repo-local config) |
| Repo content | no `manifest.json/.csv` (scores), no paths with usernames |
| Audio metadata | only the ffmpeg encoder tag (checked) |
| Page content | no author names, affiliation, e-mail, acknowledgements |
| Speaker names | not shown; region only |
| Third-party scripts | none; no analytics, no external fonts |
| Screenshots | avoid screenshots with personal browser UI/bookmarks |
| Browser history | use a private window when you verify the public URL |
