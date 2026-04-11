param(
  [string]$SourceDir = (Get-Location).Path,
  [Parameter(Mandatory = $true)]
  [string]$TargetDir,
  [switch]$Apply
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Convert-ToPlatformPath {
  param([string]$BaseDir, [string]$RepoPath)
  $relative = $RepoPath -replace '/', [IO.Path]::DirectorySeparatorChar
  return Join-Path $BaseDir $relative
}

function Ensure-DirectoryForFile {
  param([string]$FilePath)
  $parent = Split-Path -Parent $FilePath
  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
}

function Get-ActionKind {
  param([string]$RepoPath)

  if ($RepoPath.StartsWith('.clean-room/', [System.StringComparison]::Ordinal)) {
    return 'ignore'
  }

  $splitPaths = @(
    'docs/README.md',
    'docs/spec/11-ai-m2m-runtime-enablement.md',
    'docs/spec/12-ai-m2m-supabase-deploy-runtime-checklist.md',
    'docs/spec/19-supabase-split-function-runbook.md',
    'src/app/components/orders.tsx',
    'src/app/components/seller-asset-management-modal.tsx',
    'src/hooks/useUserOrders.ts',
    'src/utils/orderSorting.ts',
    'supabase/functions/server/seller-ai-minting-handler.ts',
    'supabase/migrations/000037_ai_agent_schema_fixes.sql'
  )

  $dropExact = @(
    "'",
    '0',
    's',
    '{',
    'tmp-edit.js',
    'tmp_collection_current.tsx',
    'tmp_collection_old.tsx',
    'tmp_py_test.py',
    'docs/spec/05-integrations-settings-and-tools.md',
    'docs/spec/15-local-api-audit-and-server-migration-plan.md',
    'docs/spec/17-ai-store-advisor-architecture.md',
    'docs/spec/18-api-credential-ai-agent-separation.md',
    'src/styles/fonts.css'
  )

  $dropPrefixes = @(
    '.clean-room/',
    'orina_agent/',
    'public/orina-home/',
    'supabase/audit/archive/json/',
    'supabase/audit/artifacts/'
  )

  if ($splitPaths -contains $RepoPath) {
    return 'split'
  }

  if ($dropExact -contains $RepoPath) {
    return 'drop'
  }

  foreach ($prefix in $dropPrefixes) {
    if ($RepoPath.StartsWith($prefix, [System.StringComparison]::Ordinal)) {
      return 'drop'
    }
  }

  return 'carry'
}

function Parse-GitStatusLine {
  param([string]$Line)

  if ($Line.Length -lt 4) {
    return $null
  }

  $x = $Line.Substring(0, 1)
  $y = $Line.Substring(1, 1)
  $path = $Line.Substring(3)

  return [pscustomobject]@{
    X = $x
    Y = $y
    Path = $path
    IsUntracked = ($x -eq '?' -and $y -eq '?')
    IsDeleted = ($x -eq 'D' -or $y -eq 'D')
  }
}

if (-not (Test-Path -LiteralPath $SourceDir)) {
  throw "SourceDir does not exist: $SourceDir"
}

if (-not (Test-Path -LiteralPath $TargetDir)) {
  if ($Apply) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
  } else {
    Write-Host "Preview: target directory does not exist yet: $TargetDir"
  }
}

$statusLines = git -C $SourceDir status --porcelain=v1 -uall
$entries = @()

foreach ($line in $statusLines) {
  $parsed = Parse-GitStatusLine -Line $line
  if ($null -eq $parsed) {
    continue
  }

  $entries += [pscustomobject]@{
    X = $parsed.X
    Y = $parsed.Y
    Path = $parsed.Path
    Kind = Get-ActionKind -RepoPath $parsed.Path
    IsDeleted = $parsed.IsDeleted
    IsUntracked = $parsed.IsUntracked
  }
}

$entries = $entries | Where-Object { $_.Kind -ne 'ignore' }

$carryEntries = $entries | Where-Object { $_.Kind -eq 'carry' }
$dropEntries = $entries | Where-Object { $_.Kind -eq 'drop' }
$splitEntries = $entries | Where-Object { $_.Kind -eq 'split' }

Write-Host "SourceDir: $SourceDir"
Write-Host "TargetDir: $TargetDir"
$modeLabel = 'PREVIEW'
if ($Apply) {
  $modeLabel = 'APPLY'
}
Write-Host "Mode: $modeLabel"
Write-Host ""
Write-Host "Carry entries: $($carryEntries.Count)"
Write-Host "Drop entries:  $($dropEntries.Count)"
Write-Host "Split entries: $($splitEntries.Count)"
Write-Host ""

foreach ($entry in $carryEntries) {
  $sourcePath = Convert-ToPlatformPath -BaseDir $SourceDir -RepoPath $entry.Path
  $targetPath = Convert-ToPlatformPath -BaseDir $TargetDir -RepoPath $entry.Path

  if (Test-Path -LiteralPath $sourcePath) {
    Write-Host "CARRY  $($entry.Path)"
    if ($Apply) {
      Ensure-DirectoryForFile -FilePath $targetPath
      Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Force
    }
  } else {
    Write-Host "REMOVE  $($entry.Path)"
    if ($Apply -and (Test-Path -LiteralPath $targetPath)) {
      Remove-Item -LiteralPath $targetPath -Force
    }
  }
}

foreach ($entry in $dropEntries) {
  $targetPath = Convert-ToPlatformPath -BaseDir $TargetDir -RepoPath $entry.Path
  Write-Host "DROP   $($entry.Path)"
  if ($Apply -and (Test-Path -LiteralPath $targetPath)) {
    Remove-Item -LiteralPath $targetPath -Force
  }
}

if ($splitEntries.Count -gt 0) {
  Write-Host ""
  Write-Host "Manual split required for these paths:"
  foreach ($entry in $splitEntries) {
    Write-Host "SPLIT  $($entry.Path) [$($entry.X)$($entry.Y)]"
  }
}

Write-Host ""
if ($Apply) {
  Write-Host "Clean-room sync complete."
} else {
  Write-Host "Preview complete. Re-run with -Apply to copy carry-able paths into the clean-room target."
}
