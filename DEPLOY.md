# Deploying the demo anonymously (GitHub Pages)

The paper is under double-blind review, so the demo link must not reveal the
authors. The live site is <https://opendialect.github.io/DSI-CDTTS/>.

## What is deployed

- Repository: `OpenDialect/DSI-CDTTS` (public).
- Pages source: `gh-pages` branch, `/ (root)`.
- `gh-pages` is force-updated from `main` by
  `.github/workflows/sync-gh-pages.yml`, so `git push origin main` is the only
  deploy step.

## Re-creating the setup from scratch

1. **Throw-away GitHub account.** Neutral username, no name/bio/avatar,
   e-mail not linked to you, not connected to your personal account.
2. **Empty public repository** named neutrally (e.g. `cross-dialect-demo`).
   Public is required for free GitHub Pages; a Pages site is publicly readable.
3. **Anonymous commits.** Run:

   ```sh
   ./tools/init_git_anonymous.sh
   git log --all --format='%h %an <%ae>'
   ```

   All commits must read `Anonymous Author <anonymous@example.com>`. The script
   refuses to run on a history that already contains a real author.
4. **Push with an anonymous key.** Create a dedicated key and add its public
   half to the anonymous account's **Settings → SSH and GPG keys**:

   ```sh
   ssh-keygen -t ed25519 -C "demo-deploy@example.com" -f ~/.ssh/id_ed25519_anon -N ''
   cat ~/.ssh/id_ed25519_anon.pub
   export GIT_SSH_COMMAND='ssh -i ~/.ssh/id_ed25519_anon -o IdentitiesOnly=yes'
   git remote add origin git@github.com:ANON/REPO.git \
     || git remote set-url origin git@github.com:ANON/REPO.git
   git push -u origin main
   ```

   Write the real account/repository names instead of `ANON`/`REPO` (`<` and
   `>` are shell redirections). Push from the anonymous account itself —
   GitHub shows the pushing account in repository/activity metadata.
5. **Enable Pages.** Settings → Pages → *Deploy from a branch* → `gh-pages` /
   `(root)` → Save. Wait 1–2 minutes.
6. **Verify** the URL on desktop and phone:
   - 7 sections, each with 7 native players (reference + six systems);
   - all players start, and only one plays at a time;
   - `#03_sichuan_s19`-style anchors jump to the right section;
   - Network panel shows only local files — no third-party requests.
7. **After the review:** delete the repository or make it private.

## Supplementary zip instead of a link

```sh
./tools/package_offline.sh
# → DSI-CDTTS-demo-page.zip (~3.4 MB)
```

Reviewers unzip and open `index.html`; no network needed. The archive omits
this deployment guide.

## Anonymity checklist

| Item | Requirement |
|---|---|
| GitHub account | throw-away, no personal details |
| Push key | dedicated key on the anonymous account only |
| Commit author | `Anonymous Author <anonymous@example.com>` |
| Repo content | no manifest/scores, no personal paths |
| Audio metadata | only the ffmpeg encoder tag |
| Page content | no names, affiliations, e-mails, acknowledgements |
| Corpus terms | public hosting of reference recordings is acceptable |
