# Script to add export const dynamic = "force-dynamic" to API routes that use request.headers
$apiRoutesPath = "src\app\api"
$files = Get-ChildItem -Path $apiRoutesPath -Filter "route.ts" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Check if file uses request.headers and doesn't already have export const dynamic
    if ($content -match "request\.headers\.get|request\.headers\[|headers\.get\(" -and 
        $content -notmatch "export const dynamic") {
        
        Write-Host "Processing: $($file.FullName)"
        
        # Split content into lines
        $lines = $content -split "`r?`n"
        $newLines = @()
        $lastImportIndex = -1
        
        # Find the last import statement
        for ($i = 0; $i -lt $lines.Length; $i++) {
            if ($lines[$i] -match "^import\s+") {
                $lastImportIndex = $i
            }
        }
        
        if ($lastImportIndex -ge 0) {
            # Insert export const dynamic after the last import
            for ($i = 0; $i -le $lastImportIndex; $i++) {
                $newLines += $lines[$i]
            }
            $newLines += ""
            $newLines += "export const dynamic = `"force-dynamic`";"
            for ($i = $lastImportIndex + 1; $i -lt $lines.Length; $i++) {
                $newLines += $lines[$i]
            }
            
            $newContent = $newLines -join "`r`n"
            Set-Content -Path $file.FullName -Value $newContent -NoNewline
            Write-Host "  Added export const dynamic"
        }
    }
}

Write-Host ""
Write-Host "Done!"
