# ============================================================
#  APlusZ - Consent + Affiliate activation patch (v2, parser-safe)
#  Run from anywhere. Edits in place, .bak backups, idempotent.
# ============================================================

$ErrorActionPreference = 'Stop'
$root = "C:\Users\Home PC\Desktop\AplusZ\frontend"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

function Backup($p){ if(Test-Path $p){ Copy-Item $p "$p.bak$stamp" -Force; Write-Host "  .bak -> $p.bak$stamp" -ForegroundColor DarkGray } }
function Info($m){ Write-Host $m -ForegroundColor Cyan }
function Ok($m){ Write-Host $m -ForegroundColor Green }
function Skip($m){ Write-Host $m -ForegroundColor Yellow }

Info "AplusZ consent+affiliate patch  ($stamp)"
Info "root: $root`n"

# ---------- 1. index.html ----------
$idx = Join-Path $root "index.html"
$h = Get-Content $idx -Raw
$changed = $false

# 1a. Consent Mode v2 default stub before the gtag loader.
$gtagAnchor = '<!-- Google tag (gtag.js) -->'
$consentStub = "<!-- Consent Mode v2 (default DENIED until user acknowledges) -->`r`n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});</script>`r`n<!-- Google tag (gtag.js) -->"
if($h.Contains("gtag('consent','default'")){ Skip "  [1a] consent default stub already present - skip" }
else{
  Backup $idx
  $h = $h.Replace($gtagAnchor, $consentStub)
  $changed = $true
  Ok "  [1a] consent-default stub inserted before gtag"
}

# 1b. Drop dead Google-Ads config line.
$awLine = "gtag('config','AW-995108846');"
if($h.Contains($awLine)){
  $h = $h.Replace($awLine, "")
  $changed = $true
  Ok "  [1b] removed dead Google-Ads config (AW-995108846)"
}else{ Skip "  [1b] AW-995108846 config already gone - skip" }

# 1c. Add consent.js before </head>.
if($h.Contains('assets/consent.js')){ Skip "  [1c] consent.js already linked - skip" }
else{
  $h = $h.Replace('</head>', "<script defer src=`"assets/consent.js`"></script>`r`n</head>")
  $changed = $true
  Ok "  [1c] consent.js linked before </head>"
}

# 1d. Footer re-consent link before the (c) span.
$copyAnchor = '<span>' + [char]0x00A9 + ' <span id="year">'
$reopenLink = '<a href="#" id="consent-reopen" data-i18n="consent.reopen">Cookies</a>' + "`r`n  " + '<span class="footer-sep"></span>' + "`r`n  "
if($h.Contains('id="consent-reopen"')){ Skip "  [1d] footer Cookies link already present - skip" }
elseif($h.Contains($copyAnchor)){
  $h = $h.Replace($copyAnchor, ($reopenLink + $copyAnchor))
  $changed = $true
  Ok "  [1d] footer 'Cookies' re-consent link inserted"
}else{ Skip "  [1d] footer (c) anchor not found - add link manually" }

if($changed){ Set-Content $idx $h -NoNewline -Encoding UTF8; Ok "  index.html written`n" }
else{ Skip "  index.html unchanged`n" }

# ---------- 2. config.js : activate hotel link ----------
$cfg = Join-Path $root "assets\config.js"
$c = Get-Content $cfg -Raw
if($c.Contains("booking:    'aplusz'") -or $c.Contains("booking: 'aplusz'")){ Skip "  [2] booking already 'aplusz' - skip" }
elseif($c.Contains("booking:    'placeholder'")){
  Backup $cfg
  $c = $c.Replace("booking:    'placeholder'", "booking:    'aplusz'")
  Set-Content $cfg $c -NoNewline -Encoding UTF8
  Ok "  [2] config.js booking 'placeholder' -> 'aplusz' (hotel CTA live)`n"
}elseif($c.Contains("booking: 'placeholder'")){
  Backup $cfg
  $c = $c.Replace("booking: 'placeholder'", "booking: 'aplusz'")
  Set-Content $cfg $c -NoNewline -Encoding UTF8
  Ok "  [2] config.js booking 'placeholder' -> 'aplusz' (hotel CTA live)`n"
}else{ Skip "  [2] booking key pattern not found - check config.js`n" }

# ---------- 3. append consent CSS to app.css + bundle.css ----------
$cssPath = Join-Path $PSScriptRoot "consent.css"
if(-not (Test-Path $cssPath)){ Skip "  [3] consent.css not next to script - CSS not appended" }
else{
  $cssBlock = Get-Content $cssPath -Raw
  foreach($css in @("assets\app.css","assets\bundle.css")){
    $p = Join-Path $root $css
    $body = Get-Content $p -Raw
    if($body.Contains('.consent-bar')){ Skip "  [3] $css already has .consent-bar - skip" }
    else{
      Backup $p
      Add-Content $p $cssBlock -Encoding UTF8
      Ok "  [3] appended consent styles -> $css"
    }
  }
}

Write-Host "`nDONE." -ForegroundColor Green
Write-Host "Verify consent.js is in assets\ and 20 json are in i18n\, then git push." -ForegroundColor Cyan
