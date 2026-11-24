# Deploying the demo anonymously (GitHub Pages)

The paper is under double-blind review, so the demo link must not reveal the
authors. GitHub Pages is the cheapest way to get a clickable URL, but a GitHub
account name, commit metadata and repository activity are **public**. Work
through this checklist in order.

The demo is already published at
<https://opendialect.github.io/DSI-CDTTS/> (repository
`OpenDialect/DSI-CDTTS`, Pages source `gh-pages`, kept in sync from `main` by
`.github/workflows/sync-gh-pages.yml`). Use this document to re-create the setup
from scratch, or to verify it.

If you prefer not to host anything, skip to
[Option B — supplementary zip](#option-b--supplementary-zip); the page is fully
offline and reviewers can unzip and open it.

---

## 0. Before you start

- Repository content: this folder (`index.html`, `assets/`, `cases/`).
  Total size ≈ 3.3 MB, far below GitHub's limits.
- Do **not** commit `manifest.json`, `manifest.csv`, internal paths, personal
  notes or the deployment history. Both are now in `.gitignore` as a safety
  net; check `git status` before committing anyway.
- Anything pushed to a public repo is permanent in the network's caches. A
  public Pages site is readable by anyone, not only by reviewers — `noindex`
  only asks search engines not to index it.
- The reference recordings come from a dialect corpus: confirm that public
  hosting for review is acceptable under the corpus terms before publishing.

## 1. Create a throw-away GitHub account

1. Use a fresh, neutral e-mail address that is not linked to you (e.g. a new
   provider mailbox). Do not reuse an address that appears on your homepage,
   CV, ORCID or other papers.
2. Pick a neutral username, e.g. `dialect-demo-anon` — avoid your initials, lab
   name, city or paper title.
3. Do not add a name, bio, avatar, location, website or organisation to the
   profile. Leave it empty.
4. Do not link the account to your personal GitHub account (no followers, no
   starred personal repos, no pinned repos you maintain elsewhere).

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
<anonymous@example.com>`) and leaves your global config untouched. It refuses to
continue if the existing history contains a non-anonymous author:

```sh
cd cross-dialect-demo
./tools/init_git_anonymous.sh
```

Verify:

```sh
git log --all --format='%h %an <%ae> %s' -n 5
# <sha> Anonymous Author <anonymous@example.com> Anonymous demo page: …
git config --local --get user.email   # anonymous@example.com
```

If you already have commits with your real identity, do not push them. Remove
`.git/` and re-run the helper instead.

## 4. Push with an anonymous deploy key

The machine you push from may have a personal SSH key. Create a dedicated key
and add **its public half** to the anonymous account's
**Settings → SSH and GPG keys** (this is an account SSH key, not a
repository-scoped deploy key):

```sh
ssh-keygen -t ed25519 -C "demo-deploy@example.com" -f ~/.ssh/id_ed25519_anon -N ''
cat ~/.ssh/id_ed25519_anon.pub        # paste into the anonymous account
```

Then push using that key only:

```sh
export GIT_SSH_COMMAND='ssh -i ~/.ssh/id_ed25519_anon -o IdentitiesOnly=yes'
git remote add origin git@github.com:OPENANON/REPO.git \
  || git remote set-url origin git@github.com:OPENANON/REPO.git
git push -u origin main
```

(Write the real account and repository names in place of `OPENANON`/`REPO` —
`<` and `>` are shell redirections and will break the command.)

If you must push over HTTPS, create a fine-grained personal access token on the
anonymous account (Contents: read and write, this repository only) and do not
let macOS Keychain store it under your personal credentials. If Keychain
already holds a credential for `github.com`, clear it first:

```sh
printf 'protocol=https\nhost=github.com\n\n' | git credential-osxkeychain erase
```

Then double-check on github.com: the commit author must read
`Anonymous Author`, the account must have no personal details, and there must
be no unexpected branches or tags.

**Push identity matters as much as commit identity.** GitHub shows the pushing
account in public repository/activity metadata. Push from the anonymous account
itself — do not grant a personal account collaborator access, and remove any
collaborator that was only used to bootstrap the repository.

## 5. Enable Pages

The live setup uses the `gh-pages` branch, because it publishes only the site
files and keeps the repository's default branch free of deployment noise:

1. Repository → **Settings** → **Pages**.
2. **Build and deployment → Source: Deploy from a branch**.
3. Branch: `gh-pages`, folder: `/ (root)` → **Save**.
4. Wait 1–2 minutes. The page appears at
   `https://<anon-account>.github.io/<repo>/`.

`gh-pages` is produced automatically from `main` by
`.github/workflows/sync-gh-pages.yml`, so after the first push you only need
`git push origin main`. A `main / (root)` source also works — it simply serves
the repository root, including `tools/` and this checklist at the demo URL.

`.nojekyll` is already present, so Pages serves the folder as-is instead of
running Jekyll; the MP3s and JS are delivered as plain static files.

## 6. Verify the deployed page

Open the URL on desktop **and** on a phone, then check:

- [ ] all 7 cases render, each with a reference player and 6 system players;
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
# → DSI-CDTTS-demo-page.zip (~3.5 MB)
```

Reviewers unzip it, double-click `index.html`, and everything plays offline
(no network access required, works on macOS/Windows/Linux browsers). The
archive omits this deployment guide.

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
| Push key | dedicated SSH key added to the anonymous account only |
| Commit author | `Anonymous Author <anonymous@example.com>` (repo-local config) |
| Repo content | no `manifest.json/.csv` (scores), no paths with usernames |
| Audio metadata | only the ffmpeg encoder tag (checked) |
| Page content | no author names, affiliation, e-mail, acknowledgements |
| Speaker names | not shown; region only |
| Third-party scripts | none; no analytics, no external fonts |
| Screenshots | avoid screenshots with personal browser UI/bookmarks |
| Browser history | use a private window when you verify the public URL |
| Corpus terms | public hosting of reference recordings is acceptable |
