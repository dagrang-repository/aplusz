# PATCH-agent-layer.ps1  -  AplusZ AI/agent layer, in-place edits
# ASCII only. Idempotent. Writes .bak-agent backups. Reports patched-or-missed.
$ErrorActionPreference = 'Stop'
$root = 'C:\Users\Personal PC\Desktop\AplusZ'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function ReadF($p) { return [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8) }
function WriteF($p, $s) { [System.IO.File]::WriteAllText($p, $s, $utf8) }
function Backup($p) { $b = "$p.bak-agent"; if (-not (Test-Path -LiteralPath $b)) { Copy-Item -LiteralPath $p -Destination $b } }

# ---------------------------------------------------------------- page.js
$pagePath = Join-Path $root 'functions\_lib\page.js'
$page = ReadF $pagePath

if ($page -like '*aplusz-agent-graph*') {
  Write-Host 'page.js  : SKIP (already patched)'
} else {
  $m = [regex]::Match($page, '(?s)  const ld = \{.*?\} \] \};')
  if (-not $m.Success) {
    Write-Host 'page.js  : MISSED (ld block anchor not found) - nothing written'
  } else {
    $newLd = @'
  // aplusz-agent-graph : ONE JSON-LD @graph per page, stable @ids, cross-referenced.
  const mdUrl = `${CONFIG.SITE}/en/flights/${fs}-to-${ts}.md`;
  const today = new Date().toISOString().slice(0, 10);
  const ORG = `${CONFIG.SITE}/#org`, SITEID = `${CONFIG.SITE}/#site`, APIID = `${CONFIG.SITE}/#api`;
  const ld = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Organization', '@id': ORG, name: CONFIG.BRAND, legalName: 'AplusZ (A+Z).app',
        url: `${CONFIG.SITE}/`, email: 'dagrang@gmail.com',
        identifier: [
          { '@type': 'PropertyValue', name: 'SIREN', value: '927924621' },
          { '@type': 'PropertyValue', name: 'SIRET', value: '92792462100018' } ],
        sameAs: [ 'https://recherche-entreprises.api.gouv.fr/search?q=927924621',
                  'https://github.com/dagrang-repository/aplusz' ] },
      { '@type': 'WebSite', '@id': SITEID, url: `${CONFIG.SITE}/`, name: CONFIG.BRAND,
        inLanguage: lang, publisher: { '@id': ORG },
        potentialAction: { '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${CONFIG.SITE}/v1/fare?from={from}&to={to}` },
          'query-input': [
            { '@type': 'PropertyValueSpecification', valueRequired: true, valueName: 'from' },
            { '@type': 'PropertyValueSpecification', valueRequired: true, valueName: 'to' } ] } },
      { '@type': 'WebAPI', '@id': APIID, name: 'AplusZ fare API',
        description: 'Cheapest observed fare, six-month low and best departure date for a city pair.',
        url: `${CONFIG.SITE}/v1/fare`, documentation: `${CONFIG.SITE}/openapi.json`,
        termsOfService: `${CONFIG.SITE}/license.xml`, provider: { '@id': ORG } },
      { '@type': 'WebPage', '@id': `${canonical}#page`, url: canonical,
        name: t(lang, 'title', v), description: t(lang, 'desc', v), inLanguage: lang,
        isPartOf: { '@id': SITEID }, about: { '@id': `${canonical}#record` },
        dateModified: today,
        encoding: { '@type': 'MediaObject', encodingFormat: 'text/markdown', url: mdUrl },
        breadcrumb: { '@id': `${canonical}#crumb` }, mainEntity: { '@id': `${canonical}#faq` } },
      { '@type': 'Dataset', '@id': `${canonical}#record`,
        name: `Cheapest observed fare: ${from.name} to ${to.name}`,
        description: `I want to fly from ${from.name} to ${to.name} - what is the cheapest fare, what was the 6-month low, and which date is cheapest to book? Cached snapshot, not a live quote.`,
        dateModified: today, isAccessibleForFree: true,
        license: `${CONFIG.SITE}/license.xml`, creator: { '@id': ORG },
        includedInDataCatalog: { '@id': APIID },
        distribution: [
          { '@type': 'DataDownload', encodingFormat: 'application/json',
            contentUrl: `${CONFIG.SITE}/v1/fare?from=${from.iata}&to=${to.iata}` },
          { '@type': 'DataDownload', encodingFormat: 'text/markdown', contentUrl: mdUrl } ],
        variableMeasured: [
          { '@type': 'PropertyValue', name: 'cheapest_observed_fare',
            value: Math.round(route.price), unitText: route.currency || 'EUR' } ] },
      { '@type': 'BreadcrumbList', '@id': `${canonical}#crumb`, itemListElement: [
        { '@type': 'ListItem', position: 1, name: CONFIG.BRAND, item: CONFIG.SITE },
        { '@type': 'ListItem', position: 2, name: t(lang, 'h1', v), item: canonical } ] },
      { '@type': 'FAQPage', '@id': `${canonical}#faq`, mainEntity: faq.map(f => ({
        '@type': 'Question', name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a } })) } ] };
'@
    Backup $pagePath
    $page = $page.Replace($m.Value, $newLd)
    WriteF $pagePath $page
    Write-Host 'page.js  : PATCHED (JSON-LD graph)'
  }
}

# markdown alternate link in the route-page head
$page = ReadF $pagePath
$anchor = '<link rel="canonical" href="${canonical}">${alts}'
if ($page -like '*rel="alternate" type="text/markdown"*') {
  Write-Host 'page.js  : SKIP (markdown alternate already present)'
} elseif ($page.Contains($anchor)) {
  Backup $pagePath
  $add = $anchor + "`n" + '<link rel="alternate" type="text/markdown" href="${CONFIG.SITE}/en/flights/${fs}-to-${ts}.md">'
  $page = $page.Replace($anchor, $add)
  WriteF $pagePath $page
  Write-Host 'page.js  : PATCHED (markdown alternate link)'
} else {
  Write-Host 'page.js  : MISSED (canonical anchor not found)'
}

# ------------------------------------------------------------- index.html
$idxPath = Join-Path $root 'frontend\index.html'
$idx = ReadF $idxPath

if ($idx -like '*aplusz-entity-graph*') {
  Write-Host 'index    : SKIP (already patched)'
} else {
  $i = $idx.IndexOf('</head>')
  if ($i -lt 0) {
    Write-Host 'index    : MISSED (no </head>) - nothing written'
  } else {
    # og:image only if a real icon exists
    $ogImage = ''
    $cand = Get-ChildItem -LiteralPath (Join-Path $root 'frontend\assets') -Recurse -Include *.png -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match '512|384|192' } | Sort-Object Length -Descending | Select-Object -First 1
    if ($cand) {
      $rel = $cand.FullName.Substring((Join-Path $root 'frontend').Length).Replace('\','/')
      $ogImage = '<meta property="og:image" content="https://aplusz.app' + $rel + '">' + "`n" +
                 '<meta name="twitter:image" content="https://aplusz.app' + $rel + '">' + "`n"
      Write-Host ('index    : og:image -> ' + $rel)
    } else {
      Write-Host 'index    : og:image omitted (no icon found)'
    }

    $head = @'
<!-- aplusz-entity-graph : identity, sharing cards and the machine surface -->
<link rel="canonical" href="https://aplusz.app/">
<link rel="license" href="https://aplusz.app/license.xml">
<link rel="alternate" type="text/markdown" href="https://aplusz.app/llms.txt" title="Site index for LLMs">
<link rel="search" type="application/opensearchdescription+xml" title="AplusZ" href="/opensearch.xml">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AplusZ">
<meta property="og:url" content="https://aplusz.app/">
<meta property="og:title" content="AplusZ - the cheapest fare, the 6-month low, and the best date to book">
<meta property="og:description" content="Tell it where you are and where you want to go. AplusZ shows the cheapest observed fare, what the route cost at its six-month low, and which departure date was cheapest. Free, no signup, 20 languages.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="AplusZ - the cheapest fare, the 6-month low, and the best date to book">
<meta name="twitter:description" content="Cheapest observed flight fares, six-month lows and the best date to book. Free, no signup, 20 languages.">
'@
    $ld = @'
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
{"@type":"Organization","@id":"https://aplusz.app/#org","name":"AplusZ","legalName":"AplusZ (A+Z).app","url":"https://aplusz.app/","email":"dagrang@gmail.com","identifier":[{"@type":"PropertyValue","name":"SIREN","value":"927924621"},{"@type":"PropertyValue","name":"SIRET","value":"92792462100018"}],"sameAs":["https://recherche-entreprises.api.gouv.fr/search?q=927924621","https://github.com/dagrang-repository/aplusz"]},
{"@type":"WebSite","@id":"https://aplusz.app/#site","url":"https://aplusz.app/","name":"AplusZ","publisher":{"@id":"https://aplusz.app/#org"},"potentialAction":{"@type":"SearchAction","target":{"@type":"EntryPoint","urlTemplate":"https://aplusz.app/v1/fare?from={from}&to={to}"},"query-input":[{"@type":"PropertyValueSpecification","valueRequired":true,"valueName":"from"},{"@type":"PropertyValueSpecification","valueRequired":true,"valueName":"to"}]}},
{"@type":"WebApplication","@id":"https://aplusz.app/#app","name":"AplusZ","url":"https://aplusz.app/","applicationCategory":"TravelApplication","operatingSystem":"Any","browserRequirements":"Requires JavaScript","isPartOf":{"@id":"https://aplusz.app/#site"},"publisher":{"@id":"https://aplusz.app/#org"},"description":"I want to fly from city A to city B - what is the cheapest fare, what was the 6-month low, and which date is cheapest to book?","offers":{"@type":"Offer","price":"0","priceCurrency":"EUR","description":"Unlimited flight searches, free, no signup"}},
{"@type":"WebAPI","@id":"https://aplusz.app/#api","name":"AplusZ fare API","description":"Cheapest observed fare, six-month low and best departure date for a city pair.","url":"https://aplusz.app/v1/fare","documentation":"https://aplusz.app/openapi.json","termsOfService":"https://aplusz.app/license.xml","provider":{"@id":"https://aplusz.app/#org"}}
]}</script>
'@
    Backup $idxPath
    $idx = $idx.Insert($i, $head + $ogImage + $ld)
    WriteF $idxPath $idx
    Write-Host 'index    : PATCHED (canonical, OG, Twitter, entity graph)'
  }
}

Write-Host ''
Write-Host 'done'
