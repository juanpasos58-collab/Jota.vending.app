'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function Dashboard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('resumen');
  const [numbers, setNumbers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/admin'); return; }
      setReady(true);
      loadAll();
    });
  }, []);

  async function loadAll() {
    const { data: nums } = await supabase.from('numbers').select('*').order('numero');
    setNumbers(nums || []);
    const { data: reqs } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
    setRequests(reqs || []);
    const { data: cfg } = await supabase.from('raffle_config').select('*').eq('id', 1).single();
    setConfig(cfg);
  }

  async function setEstado(numero, estado) {
    const patch = { estado };
    if (estado === 'disponible') { patch.nombre = null; patch.celular = null; patch.reservado_hasta = null; patch.request_code = null; }
    await supabase.from('numbers').update(patch).eq('numero', numero);
    loadAll();
  }

  async function saveConfig(field, value) {
    const patch = { [field]: value };
    await supabase.from('raffle_config').update(patch).eq('id', 1);
  }

  async function regenerar() {
    if (!confirm('Esto reinicia todos los números y borra su estado actual. ¿Continuar?')) return;
    await supabase.rpc('generar_numeros');
    loadAll();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push('/admin');
  }

  if (!ready || !config) return null;

  const disp = numbers.filter((n) => n.estado === 'disponible').length;
  const res = numbers.filter((n) => n.estado === 'reservado').length;
  const pend = numbers.filter((n) => n.estado === 'pendiente').length;
  const conf = numbers.filter((n) => n.estado === 'confirmado').length;

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <span className="backlink" onClick={logout}>← Salir</span>
      <h2>Panel administrativo</h2>
      <div className="tabs">
        {['resumen', 'numeros', 'participantes', 'config'].map((t) => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'resumen' ? 'Resumen' : t === 'numeros' ? 'Números' : t === 'participantes' ? 'Participantes' : 'Configuración'}
          </div>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="statgrid">
          <div className="stat"><b>{numbers.length}</b><span>Total de números</span></div>
          <div className="stat"><b>{disp}</b><span>Disponibles</span></div>
          <div className="stat"><b>{res}</b><span>Reservados</span></div>
          <div className="stat"><b>{pend}</b><span>Pendientes</span></div>
          <div className="stat"><b>{conf}</b><span>Confirmados</span></div>
          <div className="stat"><b>${(conf * config.valor).toLocaleString('es-CO')}</b><span>Total confirmado (COP)</span></div>
        </div>
      )}

      {tab === 'numeros' && (
        <div className="card">
          <table>
            <thead><tr><th>Número</th><th>Estado</th><th>Nombre</th><th>Celular</th><th>Acciones</th></tr></thead>
            <tbody>
              {numbers.map((n) => (
                <tr key={n.numero}>
                  <td>{n.numero}</td>
                  <td>{n.estado}</td>
                  <td>{n.nombre || '—'}</td>
                  <td>{n.celular || '—'}</td>
                  <td>
                    {(n.estado === 'reservado' || n.estado === 'pendiente') && (
                      <>
                        <button className="mini" onClick={() => setEstado(n.numero, 'confirmado')}>Confirmar</button>{' '}
                        <button className="mini" onClick={() => setEstado(n.numero, 'disponible')}>Liberar</button>
                      </>
                    )}
                    {n.estado === 'confirmado' && (
                      <button className="mini" onClick={() => setEstado(n.numero, 'disponible')}>Liberar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'participantes' && (
        <div className="card">
          <table>
            <thead><tr><th>Nombre</th><th>Celular</th><th>Ciudad</th><th>Números</th><th>Código</th><th>Fecha</th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.nombre}</td><td>{r.celular}</td><td>{r.ciudad}</td>
                  <td>{r.numeros.join(', ')}</td><td>{r.code}</td>
                  <td>{new Date(r.created_at).toLocaleString('es-CO')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'config' && (
        <div>
          <label>Nombre del proyecto</label>
          <input defaultValue={config.nombre} onBlur={(e) => saveConfig('nombre', e.target.value)} />
          <label>Descripción del premio</label>
          <input defaultValue={config.premio} onBlur={(e) => saveConfig('premio', e.target.value)} />
          <label>Valor referencial por número (COP)</label>
          <input type="number" defaultValue={config.valor} onBlur={(e) => saveConfig('valor', parseInt(e.target.value))} />
          <label>WhatsApp (con indicativo, sin +)</label>
          <input defaultValue={config.whatsapp} onBlur={(e) => saveConfig('whatsapp', e.target.value)} />
          <label>Minutos de reserva</label>
          <input type="number" defaultValue={config.reserva_min} onBlur={(e) => saveConfig('reserva_min', parseInt(e.target.value))} />
          <label>Número inicial</label>
          <input type="number" defaultValue={config.numero_inicio} onBlur={(e) => saveConfig('numero_inicio', parseInt(e.target.value))} />
          <label>Número final</label>
          <input type="number" defaultValue={config.numero_fin} onBlur={(e) => saveConfig('numero_fin', parseInt(e.target.value))} />
          <div style={{ marginTop: 16 }}>
            <button className="btn secondary" onClick={regenerar}>Regenerar números con el nuevo rango</button>
          </div>
          <p className="note">Regenerar borra el estado de todos los números actuales. Úsalo solo antes de lanzar, no durante una dinámica activa.</p>
        </div>
      )}
    </div>
  );
}
