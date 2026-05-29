# Script de despliegue para El Dorado Pollería

$repoUrl = Read-Host "Introduce la URL de tu repositorio de GitHub (ej: https://github.com/usuario/repo.git)"

if (-not $repoUrl) {
    Write-Host "Error: No se ha proporcionado una URL." -ForegroundColor Red
    exit
}

Write-Host "Iniciando proceso de subida..." -ForegroundColor Cyan

# Inicializar git si no existe
if (-not (Test-Path .git)) {
    git init
    Write-Host "Repositorio Git inicializado."
}

# Configurar archivos
git add .
git commit -m "Configuracion de produccion para Render y Aiven"

# Subir cambios
git branch -M main
git remote remove origin 2>$null
git remote add origin $repoUrl

Write-Host "Subiendo codigo a GitHub..." -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n¡EXITO! Tu codigo ya esta en GitHub." -ForegroundColor Green
    Write-Host "Ahora puedes ir a Render.com y conectar este repositorio."
} else {
    Write-Host "`nHubo un error al subir el codigo. Revisa tus credenciales de GitHub." -ForegroundColor Red
}

Pause
