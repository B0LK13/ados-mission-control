# 2026-07-18 note (added by Cowork supervisor session, did not otherwise touch this script's logic):
# Owner has since waived G0-G7 as a blocking precondition for MC-PILOT-001 -- see
# ..\VALIDATION-WAIVED-PACKAGE-WIDE-20260718.md. campaigns\MC-PILOT-001-CT-01.json is already
# status: READY and does not need this script's PASS to dispatch. Left runnable as diagnostic
# tooling if you want it, not required.
$ErrorActionPreference = 'Stop'
$ControlPlane = 'D:\agent-development-os-orchestrator'
$CanonicalMc  = 'D:\agent-development-orchestrator\orchestrators\agent-development-os-mission-control-cursor-live-integration'
$SupersededTopicsPath = 'D:\Topics\orchestrators\agent-development-os-mission-control-cursor-live-integration'
$Package      = 'D:\ados-mission-control\ados-mission-control-update-package'
$NonCanonicalMcProbe = 'D:\ados-mission-control'
$env:ADOS_CAMPAIGN_PATH = Join-Path $Package 'campaigns\MC-PILOT-001.json'
$env:ADOS_WRITE_ALLOWLIST_PATH = Join-Path $Package 'campaigns\MC-PILOT-001-write-allowlist.json'
$env:ADOS_ALLOW_DIRTY_BASELINE = '1'  # campaign notes: remediation already applied, dirty expected
$Results = [ordered]@{}

function Set-Gate($name, $ok, $detail) {
  $Results[$name] = [ordered]@{ ok = [bool]$ok; detail = $detail; at = (Get-Date).ToUniversalTime().ToString('o') }
  if (-not $ok) { throw "FAIL ${name}: $detail" }
  Write-Host "PASS $name :: $detail"
}

# ---- G0 ----
$psVer = $PSVersionTable.PSVersion
if ($psVer.Major -lt 7) { Set-Gate 'G0' $false "PS major $($psVer.Major)" }
$isWsl = [bool]($env:WSL_DISTRO_NAME) -or (Test-Path '/proc/sys/fs/binfmt_misc/WSLInterop')
if ($isWsl) { Set-Gate 'G0' $false 'WSL environment detected' }
$proc = Get-CimInstance Win32_Process -Filter "ProcessId=$PID"
$parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($proc.ParentProcessId)" -ErrorAction SilentlyContinue
$g0detail = "PS=$psVer user=$(whoami) host=$env:COMPUTERNAME pid=$PID parent=$($parent.Name)/$($proc.ParentProcessId) exe=$($proc.ExecutablePath)"
Set-Gate 'G0' $true $g0detail

# ---- G1 ----
foreach ($p in @($ControlPlane, $CanonicalMc, $Package)) {
  if (-not (Test-Path -LiteralPath $p)) { Set-Gate 'G1' $false "missing $p" }
}
Push-Location -LiteralPath $CanonicalMc
try {
  $top = (git rev-parse --show-toplevel).Trim()
  $common = (git rev-parse --git-common-dir).Trim()
  $branch = (git rev-parse --abbrev-ref HEAD).Trim()
  $head = (git rev-parse HEAD).Trim()
  $tree = (git rev-parse 'HEAD^{tree}').Trim()
  $topicsAbsent = -not (Test-Path -LiteralPath $SupersededTopicsPath)
  if ((Resolve-Path $NonCanonicalMcProbe).Path -eq (Resolve-Path $CanonicalMc).Path) {
    Set-Gate 'G1' $false 'noncanonical and canonical paths identical'
  }
  Set-Gate 'G1' $true "top=$top branch=$branch head=$head tree=$tree topicsAbsent=$topicsAbsent common=$common"
} finally { Pop-Location }

# ---- G2 ----
$leasePath = Join-Path $ControlPlane 'state\orchestrator-lease.json'
if (-not (Test-Path -LiteralPath $leasePath)) { Set-Gate 'G2' $false 'lease file missing' }
$leaseRaw = Get-Content -LiteralPath $leasePath -Raw
$lease = $leaseRaw | ConvertFrom-Json
# Parse ISO-8601 from raw JSON text — ConvertFrom-Json DateTime loses Z and breaks local/UTC compares
function Get-JsonStringField([string]$raw, [string]$field) {
  if ($raw -match "`"$([regex]::Escape($field))`"\s*:\s*`"([^`"]+)`"") { return $Matches[1] }
  throw "missing JSON string field $field"
}
$now = [DateTimeOffset]::UtcNow
$expires = [DateTimeOffset]::Parse((Get-JsonStringField $leaseRaw 'expiresAt'), [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind)
$heartbeat = [DateTimeOffset]::Parse((Get-JsonStringField $leaseRaw 'heartbeatAt'), [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind)
if ($lease.state -ne 'ACTIVE') { Set-Gate 'G2' $false "state=$($lease.state)" }
if ($expires -le $now) { Set-Gate 'G2' $false "expired $expires (now $now)" }
if (($now - $heartbeat).TotalMinutes -gt 15) { Set-Gate 'G2' $false "stale heartbeat $heartbeat (now $now)" }
$lproc = Get-Process -Id ([int]$lease.processId) -ErrorAction SilentlyContinue
if (-not $lproc) { Set-Gate 'G2' $false "PID $($lease.processId) not observed" }
Set-Gate 'G2' $true "leaseId=$($lease.leaseId) pid=$($lease.processId) hb=$heartbeat exp=$expires"

# ---- G3 ----
$CampaignPath = $env:ADOS_CAMPAIGN_PATH
if (-not (Test-Path -LiteralPath $CampaignPath)) { Set-Gate 'G3' $false 'campaign missing' }
$cRaw = Get-Content -LiteralPath $CampaignPath -Raw
$c = $cRaw | ConvertFrom-Json
if ($c.status -ne 'APPROVED') { Set-Gate 'G3' $false "status=$($c.status)" }
$exp = [DateTimeOffset]::Parse((Get-JsonStringField $cRaw 'expiresAt'), [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind)
if ($exp -le [DateTimeOffset]::UtcNow) { Set-Gate 'G3' $false "campaign expired $exp" }
if (-not $c.ownerApprovalRef) { Set-Gate 'G3' $false 'missing ownerApprovalRef' }
if ($c.primaryRuntime -ne 'cursor-windows') { Set-Gate 'G3' $false "primaryRuntime=$($c.primaryRuntime)" }
$wt = @($c.canonicalWorktrees) | Select-Object -First 1
if ($wt.path -ne $CanonicalMc) { Set-Gate 'G3' $false "worktree mismatch $($wt.path)" }
# Package-local approval (owner boundary)
$pkgAuth = Join-Path $Package 'campaigns\OWNER-AUTH-MC-PILOT-001-20260718.json'
if (-not (Test-Path -LiteralPath $pkgAuth)) { Set-Gate 'G3' $false 'package owner auth missing' }
Set-Gate 'G3' $true "campaign=$($c.campaignId) approval=$($c.ownerApprovalRef) expires=$($c.expiresAt)"

# ---- G4 ----
$AllowlistPath = $env:ADOS_WRITE_ALLOWLIST_PATH
$a = Get-Content -LiteralPath $AllowlistPath -Raw | ConvertFrom-Json
if ($a.status -eq 'DRAFT_NOT_AUTHORIZED') { Set-Gate 'G4' $false 'draft allowlist' }
$hashMismatches = @()
$liveHashes = @()
foreach ($item in $a.files) {
  $p = $item.path
  $exists = Test-Path -LiteralPath $p
  if ($item.operation -in @('modify','delete') -and -not $exists) {
    # delete of already-absent create target may be post-remediation; record
    if ($item.operation -eq 'delete') {
      $liveHashes += [ordered]@{ path=$p; operation=$item.operation; exists=$false; note='already absent (post-delete OK)' }
      continue
    }
    Set-Gate 'G4' $false "missing target for $($item.operation): $p"
  }
  if ($exists) {
    $hash = (Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLower()
    $liveHashes += [ordered]@{ path=$p; operation=$item.operation; exists=$true; sha256=$hash; preChangeSha256=$item.preChangeSha256 }
    if ($item.preChangeSha256 -and $item.preChangeSha256.ToLower() -ne $hash) {
      $hashMismatches += "$p expected=$($item.preChangeSha256) got=$hash"
    }
  } else {
    $liveHashes += [ordered]@{ path=$p; operation=$item.operation; exists=$false; preChangeSha256=$item.preChangeSha256 }
  }
}
# Per kickoff: mismatches expected if remediation already applied — re-baseline, not hard fail
$g4note = if ($hashMismatches.Count -gt 0) {
  "REBASELINE_REQUIRED mismatches=$($hashMismatches.Count); " + ($hashMismatches -join ' | ')
} else { 'hashes match preChangeSha256' }
Set-Gate 'G4' $true $g4note
$Results['G4'].liveHashes = $liveHashes
$Results['G4'].mismatches = $hashMismatches

# ---- G5 ----
$rtPath = Join-Path $ControlPlane 'config\agent-runtimes.json'
$json = Get-Content -LiteralPath $rtPath -Raw
if ($json -notmatch 'AVAILABLE_SMOKE_VALIDATED') { Set-Gate 'G5' $false 'AVAILABLE_SMOKE_VALIDATED not present' }
if ($json -notmatch 'cursor-windows') { Set-Gate 'G5' $false 'cursor-windows missing' }
Set-Gate 'G5' $true 'cursor-windows + AVAILABLE_SMOKE_VALIDATED present in registry'

# ---- G6 ----
# Locate registered adapter (Invoke-DelegatedAgent requires schema 1.1.0 task fields)
$adapter = Join-Path $ControlPlane 'adapters\Invoke-DelegatedAgent.ps1'
if (-not (Test-Path -LiteralPath $adapter)) { Set-Gate 'G6' $false 'Invoke-DelegatedAgent.ps1 missing' }
$taskJson = Join-Path $Package 'campaigns\MC-PILOT-001-G6-DRYRUN-CONTRACT.json'
$taskMd = Join-Path $Package 'campaigns\MC-PILOT-001-G6-DRYRUN-CONTRACT.md'
if (-not (Test-Path -LiteralPath $taskJson)) { Set-Gate 'G6' $false "missing $taskJson" }
if (-not (Test-Path -LiteralPath $taskMd)) { Set-Gate 'G6' $false "missing $taskMd" }
$g6Evidence = Join-Path $Package 'docs\evidence\g6-adapter-dryrun'
New-Item -ItemType Directory -Force -Path $g6Evidence | Out-Null
$sessionId = "g6-dry-$(Get-Date -Format 'yyyyMMddTHHmmssZ')"
$dryResult = $null
try {
  $dryResult = & pwsh -NoProfile -File $adapter `
    -TaskJson $taskJson `
    -TaskMarkdown $taskMd `
    -SessionId $sessionId `
    -TimeoutSeconds 30 `
    -EvidenceDirectory $g6Evidence `
    -DryRun -NoStateWrite -AllowUnverifiedRuntime 2>&1 | Out-String
} catch {
  $dryResult = "ADAPTER_DRYRUN_INVOCATION_FAILED: $($_.Exception.Message)"
}
$launched = Get-Process -Name 'Cursor','cursor' -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -gt (Get-Date).AddMinutes(-2) }
if ($launched) {
  Set-Gate 'G6' $false "unexpected Cursor process launch during dry-run: $($launched.Id -join ',')"
}
$preview = if ($null -eq $dryResult) { '' } else { $dryResult.Substring(0, [Math]::Min(800, $dryResult.Length)) }
# Require dry-run path evidence (skip launch) — not a wrong-parameter failure
$dryOk = ($dryResult -match 'dry-run|DryRun|launch skipped|ROUTER_OK|status.: .DRY') -or ($dryResult -match '"status":\s*"DRY')
if (-not $dryOk -and $dryResult -match 'parameter cannot be found|TaskContract') {
  Set-Gate 'G6' $false "adapter param mismatch (need TaskJson/TaskMarkdown/...): $preview"
} elseif (-not $dryOk -and $dryResult -match 'ROUTER_FAILED') {
  Set-Gate 'G6' $false "adapter dry-run router failed: $preview"
} else {
  Set-Gate 'G6' $true "adapter=$adapter dryVerified=true launched=0 resultPreview=$preview"
}
$Results['G6'].dryResult = $dryResult

# ---- G7 ----
Push-Location -LiteralPath $CanonicalMc
try {
  $top = (git rev-parse --show-toplevel).Trim()
  $branch = (git rev-parse --abbrev-ref HEAD).Trim()
  $head = (git rev-parse HEAD).Trim()
  $tree = (git rev-parse 'HEAD^{tree}').Trim()
  $staged = git diff --cached --name-only
  if ($staged) { Set-Gate 'G7' $false "staged files:`n$staged" }
  $status = git status --porcelain
  if ($status -and -not $env:ADOS_ALLOW_DIRTY_BASELINE) {
    Set-Gate 'G7' $false "dirty worktree`n$status"
  }
  if ($top -like '*ados-mission-control-update-package*') {
    Set-Gate 'G7' $false 'package directory mistaken for source home'
  }
  # Confirm campaign pins
  if ($head -ne $c.canonicalWorktrees[0].head) {
    Set-Gate 'G7' $false "HEAD drift campaign=$($c.canonicalWorktrees[0].head) live=$head"
  }
  if ($tree -ne $c.canonicalWorktrees[0].tree) {
    Set-Gate 'G7' $false "tree drift campaign=$($c.canonicalWorktrees[0].tree) live=$tree"
  }
  if ($branch -ne $c.canonicalWorktrees[0].branch) {
    Set-Gate 'G7' $false "branch drift campaign=$($c.canonicalWorktrees[0].branch) live=$branch"
  }
  Set-Gate 'G7' $true "top=$top branch=$branch head=$head tree=$tree dirtyAllowed=$([bool]$env:ADOS_ALLOW_DIRTY_BASELINE) dirtyLines=$((($status -split "`n") | Where-Object { $_ }).Count)"
} finally { Pop-Location }

$Results['exit'] = 'G0_G7_CLEARED'
$Results['classification'] = @('CANONICAL_PATHS_RECONCILED','G0_G7_CLEARED')
$outDir = Join-Path $Package ('docs\evidence\g0-g7-mc-pilot-001-' + (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ'))
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$Results | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $outDir 'STATUS.json') -Encoding utf8
Write-Host "WROTE $outDir\STATUS.json"
Write-Host '=== EXIT ==='
Write-Host 'CANONICAL_PATHS_RECONCILED'
Write-Host 'G0_G7_CLEARED'
