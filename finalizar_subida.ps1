# Script final de subida
git config --global user.email "gusva.2608@gmail.com"
git config --global user.name "Gusva26"

Write-Host "Configurando repositorio..." -ForegroundColor Cyan
git add .
git commit -m "Configuracion final para produccion en Render"
git branch -M main

# Limpiar remotos anteriores si existen
git remote remove origin 2>$null
git remote add origin https://github.com/Gusva26/polleria-project.git

Write-Host "Lanzando ventana de inicio de sesion..." -ForegroundColor Yellow
git push -u origin main

Write-Host "Si la ventana no aparece, revisa tu barra de tareas." -ForegroundColor Gray
Pause
