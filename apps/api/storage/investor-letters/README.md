# Investor-letter controlled register

Runtime state is stored in `letters.json` on the API host. It contains
investor contact emails, consent sources, campaign approval references and the
send log. It must never be committed, served as a static file or copied to a
public bucket.

- File mode: `0600`
- Directory mode: `0700`
- Access: admin API only
- Public access: signed unsubscribe links only
- Deployment: do not `rsync --delete` this directory; preserve `letters.json`

The API creates the file on first use.
