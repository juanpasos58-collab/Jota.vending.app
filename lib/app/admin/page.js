'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function login() {
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError('Correo o clave incorrectos.'); return; }
    router.push('/admin/dashboard');
  }

  return (
    <div className="wrap" style={{ paddingTop: 60 }}>
      <h2>Acceso administrador</h2>
      <label>Correo</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <label>Clave</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <div className="error">{error}</div>}
      <div style={{ marginTop: 16 }}>
        <button className="btn" onClick={login}>Entrar</button>
      </div>
      <p className="note">El usuario administrador se crea desde el panel de Supabase (Authentication → Users), no hay registro público en esta página.</p>
    </div>
  );
}
