# Push local `main` to GitHub using a classic PAT stored in ./githubtoken (must stay gitignored).
# Origin is set to the SSH URL you use day-to-day; the push itself uses HTTPS + token once.
$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $ProjectRoot

$tokenPath = Join-Path $ProjectRoot 'githubtoken'
if (-not (Test-Path $tokenPath)) {
  throw "Missing file: githubtoken (place your GitHub classic PAT in this file; it is gitignored)."
}

$token = (Get-Content -LiteralPath $tokenPath -Raw).Trim()
if (-not $token) {
  throw "githubtoken is empty."
}

if (-not (Select-String -Path (Join-Path $ProjectRoot '.gitignore') -Pattern '^githubtoken\s*$' -Quiet)) {
  throw ".gitignore must list 'githubtoken' so the token file is never committed."
}

$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
  throw "Git is not on PATH. Install Git for Windows (https://git-scm.com/download/win) and reopen the terminal."
}

if (-not (Test-Path (Join-Path $ProjectRoot '.git'))) {
  & git -C $ProjectRoot init -b main
}

$email = (& git -C $ProjectRoot config user.email 2>$null)
if (-not $email) {
  & git -C $ProjectRoot config user.email 'arsalanrs@users.noreply.github.com'
  & git -C $ProjectRoot config user.name 'arsalanrs'
}

# SSH remote (as requested). Ongoing push/pull needs SSH keys configured, or run this script again.
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
& git -C $ProjectRoot remote remove origin 2>&1 | Out-Null
$ErrorActionPreference = $prevEap
& git -C $ProjectRoot remote add origin 'git@github.com:arsalanrs/smartmarketerdashboard.git'

$branch = (& git -C $ProjectRoot rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne 'main') {
  & git -C $ProjectRoot branch -M main
}

$dirty = & git -C $ProjectRoot status --porcelain
if ($dirty) {
  & git -C $ProjectRoot add -A
  & git -C $ProjectRoot commit -m "chore: sync local project"
}

# One-shot authenticated push (token not saved in .git/config).
# Classic PAT: use GitHub username + PAT in URL (see https://docs.github.com/en/get-started/git-basics/about-remote-repositories).
$pushUrl = "https://arsalanrs:${token}@github.com/arsalanrs/smartmarketerdashboard.git"
& git -C $ProjectRoot push $pushUrl HEAD:main
if ($LASTEXITCODE -ne 0) {
  throw "git push failed (exit $LASTEXITCODE). If the remote has new commits, pull main with your token URL, rebase, then push again."
}

Write-Host 'Done. Pushed main to arsalanrs/smartmarketerdashboard (main).'
Write-Host 'Origin is git@github.com:arsalanrs/smartmarketerdashboard.git - use SSH keys for day-to-day git push/pull, or run this script again to push with the token.'
Write-Host 'If the remote already has commits, pull/rebase first: git pull --rebase origin main'
