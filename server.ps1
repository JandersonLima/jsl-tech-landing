# JSL Tech — Servidor local com headers de segurança
param([int]$Port = 8080)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
    '.woff2'= 'font/woff2'
    '.woff' = 'font/woff'
}

$server = [System.Net.HttpListener]::new()
$server.Prefixes.Add("http://localhost:$Port/")
$server.Start()
Write-Host "Servidor rodando em http://localhost:$Port" -ForegroundColor Cyan
Write-Host "Pressione Ctrl+C para parar." -ForegroundColor Gray

while ($server.IsListening) {
    $ctx  = $server.GetContext()
    $req  = $ctx.Request
    $resp = $ctx.Response

    # ── Security Headers ────────────────────────────────────────────
    $resp.AddHeader('X-Content-Type-Options',    'nosniff')
    $resp.AddHeader('X-Frame-Options',           'DENY')
    $resp.AddHeader('Referrer-Policy',           'strict-origin-when-cross-origin')
    $resp.AddHeader('Permissions-Policy',        'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
    $resp.AddHeader('Cache-Control',             'no-store, no-cache, must-revalidate')
    $resp.AddHeader('X-XSS-Protection',          '1; mode=block')
    # ── /Security Headers ────────────────────────────────────────────

    $urlPath  = $req.Url.AbsolutePath
    if ($urlPath -eq '/') { $urlPath = '/index.html' }

    # Bloqueia path traversal (ex: ../../etc/passwd)
    $safe     = [System.IO.Path]::GetFullPath((Join-Path $root $urlPath.TrimStart('/')))
    if (-not $safe.StartsWith($root)) {
        $resp.StatusCode = 403
        $body = [System.Text.Encoding]::UTF8.GetBytes('403 Forbidden')
        $resp.OutputStream.Write($body, 0, $body.Length)
        $resp.OutputStream.Close()
        continue
    }

    if (Test-Path $safe -PathType Leaf) {
        $ext  = [System.IO.Path]::GetExtension($safe).ToLower()
        $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }

        $bytes = [System.IO.File]::ReadAllBytes($safe)
        $resp.ContentType      = $mime
        $resp.ContentLength64  = $bytes.Length
        $resp.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $resp.StatusCode = 404
        $body = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
        $resp.OutputStream.Write($body, 0, $body.Length)
    }

    $resp.OutputStream.Close()
}
