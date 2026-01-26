# Script to add export const revalidate = 0 to all page.tsx files
$pagesPath = "src\app"
$files = Get-ChildItem -Path $pagesPath -Filter "page.tsx" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName
    
    # Check if file is a client component and doesn't already have revalidate
    $isClient = $false
    $hasRevalidate = $false
    
    foreach ($line in $content) {
        if ($line -match '"use client"') {
            $isClient = $true
        }
        if ($line -match "export const revalidate") {
            $hasRevalidate = $true
        }
    }
    
    if ($isClient -and -not $hasRevalidate) {
        Write-Host "Processing: $($file.FullName)"
        
        $newContent = @()
        $foundDynamic = $false
        
        foreach ($line in $content) {
            $newContent += $line
            if ($line -match "export const dynamic") {
                $foundDynamic = $true
                $newContent += "export const revalidate = 0;"
            }
        }
        
        # If no dynamic export found, add both after "use client"
        if (-not $foundDynamic) {
            $newContent2 = @()
            foreach ($line in $newContent) {
                $newContent2 += $line
                if ($line -match '"use client"') {
                    $newContent2 += ""
                    $newContent2 += "export const dynamic = `"force-dynamic`";"
                    $newContent2 += "export const revalidate = 0;"
                }
            }
            $newContent = $newContent2
        }
        
        $newContent -join "`r`n" | Set-Content -Path $file.FullName
        Write-Host "  Added revalidate = 0"
    }
}

Write-Host ""
Write-Host "Done!"
