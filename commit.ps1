# commit.ps1 - lint/build check, then commit and push.
#
# Usage:
#   .\commit.ps1 -m "commit message"                 # commit only changed tracked files you pick (-p) or all (-a)
#   .\commit.ps1 -m "message" -a                     # stage everything (git add -A)
#   .\commit.ps1 -m "message" -f "src/pages/x.jsx"   # stage specific file(s), comma separated
#   .\commit.ps1 -m "message" -SkipChecks            # skip lint/build (use only when in a hurry)
#   .\commit.ps1 -m "message" -NoPush                # commit but do not push
#
# Notes:
#   - Deploys happen on push to main (Vercel), so pushing = deploying.
#   - Lint may report pre-existing errors in other files; this script only blocks
#     when the files you are committing have errors.

param(
    [Parameter(Mandatory = $true)][string]$m,
    [string[]]$f,
    [switch]$a,
    [switch]$SkipChecks,
    [switch]$NoPush
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

function Write-Step($text) { Write-Host "`n=== $text ===" -ForegroundColor Cyan }
function Write-Ok($text)   { Write-Host "  OK  $text" -ForegroundColor Green }
function Write-Warn($text) { Write-Host "  !!  $text" -ForegroundColor Yellow }
function Fail($text)       { Write-Host "`n  XX  $text" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------- 1. show status
Write-Step "Current changes"
git status --short
if (-not (git status --porcelain)) { Fail "Nothing to commit - working tree is clean." }

# ---------------------------------------------------------------- 2. lint + build
if ($SkipChecks) {
    Write-Warn "Skipping lint and build (-SkipChecks)."
} else {
    Write-Step "Lint"
    $lint = & npm run lint 2>&1
    $lintText = $lint -join "`n"
    if ($LASTEXITCODE -ne 0) {
        # Lint failed somewhere. Only block if it is in a file we are about to commit.
        $targets = if ($f) { $f } else { (git diff --name-only) + (git diff --cached --name-only) }
        $mine = @()
        foreach ($t in $targets) {
            $leaf = Split-Path $t -Leaf
            if ($leaf -and $lintText -match [regex]::Escape($leaf)) { $mine += $t }
        }
        if ($mine.Count -gt 0) {
            Write-Host $lintText
            Fail ("Lint errors in files you are committing: " + ($mine -join ", "))
        }
        Write-Warn "Lint reported pre-existing errors in other files - continuing."
    } else {
        Write-Ok "Lint passed."
    }

    Write-Step "Build"
    & npm run build | Out-Null
    if ($LASTEXITCODE -ne 0) { Fail "Build failed. Fix it before committing." }
    Write-Ok "Build passed."
}

# ---------------------------------------------------------------- 3. stage
Write-Step "Staging"
if ($f) {
    foreach ($file in $f) { git add -- $file }
    Write-Ok ("Staged: " + ($f -join ", "))
} elseif ($a) {
    git add -A
    Write-Ok "Staged everything (git add -A)."
} else {
    # Default: only tracked files that changed. Untracked files (reports, exports)
    # stay out unless you pass -a, which avoids accidentally committing deliverables.
    git add -u
    Write-Ok "Staged modified tracked files (untracked files skipped - use -a to include them)."
}

$staged = git diff --cached --name-only
if (-not $staged) { Fail "Nothing staged. Use -a to stage everything, or -f to pick files." }

Write-Host "`nFiles to be committed:" -ForegroundColor White
$staged | ForEach-Object { Write-Host "  - $_" }

# ---------------------------------------------------------------- 4. confirm
Write-Host ""
$answer = Read-Host "Commit with message `"$m`" ? (y/N)"
if ($answer -ne "y" -and $answer -ne "Y") {
    git reset | Out-Null
    Fail "Cancelled. Staging was reset."
}

# ---------------------------------------------------------------- 5. commit + push
Write-Step "Commit"
git commit -m $m
if ($LASTEXITCODE -ne 0) { Fail "git commit failed." }
Write-Ok "Committed."

if ($NoPush) {
    Write-Warn "Not pushed (-NoPush). Run 'git push origin main' when ready."
    exit 0
}

Write-Step "Push"
git push origin main
if ($LASTEXITCODE -ne 0) { Fail "git push failed. Check your network or credentials." }
Write-Ok "Pushed to main - Vercel deploy started."
