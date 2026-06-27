# Adds the footer "Cookies" re-consent link. Targets id="year" (ASCII-safe).
$ErrorActionPreference='Stop'
$idx="C:\Users\Home PC\Desktop\AplusZ\frontend\index.html"
$stamp=Get-Date -Format "yyyyMMdd-HHmmss"
$h=Get-Content $idx -Raw

if($h.Contains('id="consent-reopen"')){ Write-Host "Already present - skip" -ForegroundColor Yellow; exit }

# Anchor on the <span> that immediately precedes the (c) year span.
# Live markup: <span>(c) <span id="year"></span> ...
# We insert the Cookies link + separator right BEFORE that wrapping <span>.
$anchor='<span id="year">'
if(-not $h.Contains($anchor)){ Write-Host "year span not found" -ForegroundColor Red; exit }

# Find the '<span>' that opens just before '(c) <span id="year">'.
# Simplest robust move: inject the link + sep right before the copyright wrapper <span>.
# The wrapper is the last '<span>' before id="year". Insert before the whole "(c)" span by
# splitting on the unique 'id="year"' and walking back to its opening '<span>'.

$idxPos=$h.IndexOf($anchor)
$open=$h.LastIndexOf('<span>',$idxPos)   # opening tag of the copyright span
if($open -lt 0){ Write-Host "wrapper span not found" -ForegroundColor Red; exit }

Copy-Item $idx "$idx.bakfoot$stamp" -Force
$link='<a href="#" id="consent-reopen" data-i18n="consent.reopen">Cookies</a>' + "`r`n  " + '<span class="footer-sep"></span>' + "`r`n  "
$h=$h.Substring(0,$open) + $link + $h.Substring($open)
Set-Content $idx $h -NoNewline -Encoding UTF8
Write-Host ".bak -> $idx.bakfoot$stamp" -ForegroundColor DarkGray
Write-Host "[1d] footer Cookies link inserted before copyright span" -ForegroundColor Green
