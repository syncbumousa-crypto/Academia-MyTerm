# ============================================================
# # 🛡️ 📌  THE GUARD THAT KEEPS TWO STYLESHEETS APART
# # 🔤 PowerShell
# # 🎯 Prints every class, id and variable name owned by BOTH the
# #    MyTerm stylesheets and the Academia rail. The answer must be
# #    none. Run it before every publish that touches CSS.
# # 🔗 A clash between two stylesheets is the quietest bug there is:
# #    no error, no warning, no line number — just a box that moved,
# #    noticed weeks later. TermBoard.css alone is 143 KB and already
# #    owns .tabs, .sidebar and .is-active. So the rule is not "try
# #    not to clash", it is "prove there is no clash", and this file
# #    is the proof. It exits 1 when it fails, so a publish script
# #    can refuse to run.
# ============================================================

$ErrorActionPreference = 'Stop'
$docs = Join-Path (Split-Path $PSScriptRoot -Parent) 'docs'

# Comments are stripped first: a class named inside a /* note */ is
# prose, not a selector, and counting it would raise a false alarm
function Get-Names([string]$path) {
    $text = [IO.File]::ReadAllText($path)
    $text = [Text.RegularExpressions.Regex]::Replace($text, '/\*.*?\*/', ' ', 'Singleline')
    $skip = 'css','md','html','js','json','svg','png','jpg','jpeg','webp','woff','woff2','ttf','txt'
    $out = [ordered]@{ cls = @(); ids = @(); vars = @() }
    foreach ($m in [regex]::Matches($text, '\.([A-Za-z][\w-]*)')) {
        if ($skip -notcontains $m.Groups[1].Value.ToLower()) { $out.cls += $m.Groups[1].Value }
    }
    foreach ($m in [regex]::Matches($text, '#([A-Za-z][\w-]*)'))  { $out.ids  += $m.Groups[1].Value }
    foreach ($m in [regex]::Matches($text, '--([A-Za-z][\w-]*)')) { $out.vars += $m.Groups[1].Value }
    foreach ($k in @($out.Keys)) { $out[$k] = @($out[$k] | Sort-Object -Unique) }
    return $out
}

# The host is every stylesheet that was here before Academia arrived
$guest = @(Get-ChildItem -Path $docs -Recurse -Filter '*.css' |
           Where-Object { $_.FullName -like '*Academia*' })
$hostCss = @(Get-ChildItem -Path $docs -Recurse -Filter '*.css' |
             Where-Object { $_.FullName -notlike '*Academia*' })

if (-not $guest) { "No guest stylesheet yet - nothing to check."; exit 0 }

$h = [ordered]@{ cls = @(); ids = @(); vars = @() }
foreach ($f in $hostCss) {
    $n = Get-Names $f.FullName
    foreach ($k in @($h.Keys)) { $h[$k] = @($h[$k]) + @($n[$k]) }
}
$g = [ordered]@{ cls = @(); ids = @(); vars = @() }
foreach ($f in $guest) {
    $n = Get-Names $f.FullName
    foreach ($k in @($g.Keys)) { $g[$k] = @($g[$k]) + @($n[$k]) }
}

"host : $($hostCss.Count) files, $((@($h.cls)|Sort-Object -Unique).Count) classes"
"guest: $($guest.Count) files, $((@($g.cls)|Sort-Object -Unique).Count) classes"
""

# A prefix on every class closes one door and leaves another open: a
# guest rule whose subject is a plain element - body, a, button - lands
# on the host no matter how its classes are named. Three such rules were
# already in the imported sheet, one of them padding the host's body.
# So a guest rule may name a host element only when it also carries an
# ac- hook, which makes the effect opt-in instead of automatic.
function Get-Leaks([string]$path) {
    $text = [IO.File]::ReadAllText($path)
    $text = [Text.RegularExpressions.Regex]::Replace($text, '/\*.*?\*/', ' ', 'Singleline')
    $elements = 'html','body','a','p','ul','ol','li','button','input','select','textarea',
                'svg','img','div','span','nav','aside','main','header','footer','section',
                'table','tr','td','th','h1','h2','h3','h4','h5','h6'
    $found = @()
    foreach ($m in [regex]::Matches($text, '(?m)(?:^|[}\n])\s*([^{}@\n][^{}]*?)\s*\{')) {
        foreach ($part in $m.Groups[1].Value -split '\s*,\s*') {
            $p = $part.Trim()
            if (-not $p) { continue }
            $firstWord = ($p -split '[\s>+~\[:.#]')[0].ToLower()
            if ($elements -contains $firstWord -and $p -notmatch '\.ac-') { $found += $p }
        }
    }
    return @($found | Sort-Object -Unique)
}

$leaks = @()
foreach ($f in $guest) { $leaks += Get-Leaks $f.FullName }
$leaks = @($leaks | Sort-Object -Unique)

$bad = 0
if ($leaks.Count) {
    $bad += $leaks.Count
    "FAIL  guest rules landing on host elements ($($leaks.Count)):"
    $leaks | ForEach-Object { "        $_" }
} else { "ok    no guest rule lands on a host element" }

foreach ($k in 'cls','ids','vars') {
    $both = @(Compare-Object -ReferenceObject @($h[$k] | Sort-Object -Unique) `
                             -DifferenceObject @($g[$k] | Sort-Object -Unique) `
                             -IncludeEqual -ExcludeDifferent |
              ForEach-Object { $_.InputObject })
    if ($both.Count) {
        $bad += $both.Count
        "FAIL  shared $k ($($both.Count)):"
        $both | ForEach-Object { "        $_" }
    } else { "ok    no shared $k" }
}

""
if ($bad) { "GUARD FAILED - $bad shared name(s)."; exit 1 }
"GUARD PASSED - zero collisions."
exit 0
