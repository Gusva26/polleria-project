// El Dorado Pollería - Login Page Module

// Tab switcher for Login / Register forms
window.switchLoginTab = (tab) => {
    const tabLogin = document.getElementById('tab-btn-login');
    const tabRegister = document.getElementById('tab-btn-register');
    const formLogin = document.getElementById('login-form');
    const formRegister = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    
    if (loginError) {
        loginError.style.display = 'none';
    }
    
    if (tab === 'login') {
        if (tabLogin) tabLogin.classList.add('active');
        if (tabRegister) tabRegister.classList.remove('active');
        if (formLogin) formLogin.style.display = 'block';
        if (formRegister) formRegister.style.display = 'none';
    } else {
        if (tabLogin) tabLogin.classList.remove('active');
        if (tabRegister) tabRegister.classList.add('active');
        if (formLogin) formLogin.style.display = 'none';
        if (formRegister) formRegister.style.display = 'block';
    }
};

function initLogin() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            
            if (loginError) {
                loginError.style.display = 'none';
            }
            
            try {
                const res = await fetch(`${window.API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                if (res.ok) {
                    const user = await res.json();
                    
                    localStorage.setItem('auth_token', user.token);
                    delete user.token;
                    
                    if (user.role === 'ROLE_CLIENTE') {
                        localStorage.setItem('customerUser', JSON.stringify({
                            name: user.firstName + ' ' + (user.lastName || ''),
                            phone: user.phone,
                            email: user.email
                        }));
                        window.showToast('¡Bienvenido! Redirigiendo... 👋', 'success');
                        setTimeout(() => { window.location.href = '/'; }, 800);
                        return;
                    }
                    
                    localStorage.setItem('user', JSON.stringify(user));
                    
                    if (user.role === 'ROLE_ADMIN') window.location.href = '/admin';
                    else if (user.role === 'ROLE_CAJERO') window.location.href = '/pos';
                    else if (user.role === 'ROLE_COCINERO') window.location.href = '/cocina';
                    else if (user.role === 'ROLE_MESERO') window.location.href = '/mesero';
                    else if (user.role === 'ROLE_REPARTIDOR') window.location.href = '/repartidor';
                    else window.location.href = '/';
                } else {
                    const data = await res.json();
                    if (loginError) {
                        loginError.textContent = data.message || 'Credenciales incorrectas';
                        loginError.style.display = 'block';
                    }
                    window.showToast(data.message || 'Credenciales incorrectas', 'error');
                }
            } catch (err) {
                if (loginError) {
                    loginError.textContent = 'Error de conexión con el servidor';
                    loginError.style.display = 'block';
                }
                window.showToast('Error de conexión. Verifica que el servidor esté activo.', 'error');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value.trim();
            const phone = document.getElementById('reg-phone').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            
            const pwdErrors = window.validatePassword(password);
            if (pwdErrors.length > 0) {
                if (loginError) {
                    loginError.innerHTML = pwdErrors.join('<br>');
                    loginError.style.display = 'block';
                }
                return;
            }

            if (loginError) {
                loginError.style.display = 'none';
            }

            try {
                const res = await fetch(`${window.API_BASE}/auth/register-client`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone, email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    if (loginError) {
                        loginError.innerHTML = '✅ Te enviamos un correo de verificación. Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.';
                        loginError.style.display = 'block';
                        loginError.className = 'badge badge-normal';
                    }
                    document.getElementById('register-form')?.reset();
                    window.showToast('📧 Revisa tu correo para verificar tu cuenta', 'success');
                } else {
                    if (loginError) {
                        loginError.textContent = data.message || 'Error al registrar';
                        loginError.style.display = 'block';
                    }
                    window.showToast(data.message || 'Error al registrar', 'error');
                }
            } catch (err) {
                if (loginError) {
                    loginError.textContent = 'Error de conexión con el servidor';
                    loginError.style.display = 'block';
                }
                window.showToast('Error de conexión. Verifica que el servidor esté activo.', 'error');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('login-page')) {
        initLogin();
    }
});
