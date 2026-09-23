'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [view, setView] = useState('landing');
  const [config, setConfig] = useState(null);
  const [numbers, setNumbers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [form, setForm] = useState({ nombre: '', celular: '', correo: '', ciudad: '' });
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState('');
  const [confirmData, setConfirmData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();
    loadNumbers();
    const channel = supabase
      .channel('numbers-public-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'numbers' }, () => {
        loadNumbers();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadConfig() {
    const { data } = await supabase.from('raffle_config').select('*').eq('id', 1).single();
    setConfig(data);
  }

  async function loadNumbers() {
    const { data } = await supabase.from('numbers_public').select('*').order('numero');
    setNumbers(data || []);
  }

  function toggleSelect(numero) {
    setSelected((prev) => prev.includes(numero) ? prev.filter((n) => n !== numero) : [...prev, numero]);
  }

  async function submit() {
    setError('');
    if (!form.nombre || !form.celular || !form.ciudad) {
      setError('Completa nombre, celular y ciudad.');
      return;
    }
    if (!terms) {
      setError('Debes aceptar el tratamiento de datos.');
      return;
    }
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc('reserve_numbers', {
      p_numeros: selected,
      p_nombre: form.nombre,
      p_celular: form.celular,
      p_correo: form.correo || null,
      p_ciudad: form.ciudad,
    });
    setLoading(false);
    if (rpcError) {
      setError('Uno de tus números ya no está disponible. Por favor elige de nuevo.');
      await loadNumbers();
      setView('selector');
      return;
    }
    const waMsg = encodeURIComponent(
      `Hola, soy ${form.nombre}. Acabo de solicitar los números ${selected.join(', ')}. Mi código de solicitud es ${data}. Te voy a enviar el comprobante.`
    );
    setConfirmData({ code: data, numeros: selected, waLink: `https://wa.me/${config.whatsapp}?text=${waMsg}` });
    setSelected([]);
    setView('confirm');
  }

  if (!config) return null;

  return (
    <div>
      <div className="top">
        <div className="brand">JOTA FAMILY <span>· Vending</span></div>
      </div>
      <div className="wrap">

        {view === 'landing' && (
          <>
            <h1>Participa por tu número</h1>
            <p style={{ opacity: .85 }}>Una dinámica de Jota Family. Elige tu número, reserva tu cupo y confirma por WhatsApp.</p>
            <div className="card">
              <h3>🎁 El premio</h3>
              <p>{config.premio}</p>
            </div>
            <div className="card">
              <h3>¿Cómo funciona?</h3>
              <p>1. Eliges uno o varios números disponibles.<br />2. Dejas tus datos.<br />3. Tu número queda reservado temporalmente.<br />4. Confirmas por WhatsApp y enviamos el comprobante — ahí validamos tu participación.</p>
            </div>
            <button className="btn" onClick={() => setView('selector')}>Escoger mi número</button>
          </>
        )}

        {view === 'selector' && (
          <>
            <span className="backlink" onClick={() => setView('landing')}>← Volver</span>
            <h2>Elige tus números</h2>
            <div className="legend">
              <span><i style={{ background: 'var(--green)' }}></i>Disponible</span>
              <span><i style={{ background: 'var(--yellow)' }}></i>Reservado</span>
              <span><i style={{ background: 'var(--red)' }}></i>Confirmado</span>
            </div>
            <div className="grid">
              {numbers.map((n) => (
                <button
                  key={n.numero}
                  className={`num ${n.estado} ${selected.includes(n.numero) ? 'selected' : ''}`}
                  disabled={n.estado !== 'disponible'}
                  onClick={() => toggleSelect(n.numero)}
                >{n.numero}</button>
              ))}
            </div>
            <div className="counter">Números seleccionados: {selected.length}</div>
            <div className="chips">{selected.map((s) => <span className="chip" key={s}>{s}</span>)}</div>
            <button className="btn" disabled={selected.length === 0} onClick={() => setView('form')}>Continuar</button>
          </>
        )}

        {view === 'form' && (
          <>
            <span className="backlink" onClick={() => setView('selector')}>← Volver</span>
            <h2>Tus datos</h2>
            <label>Nombre completo</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <label>Celular / WhatsApp</label>
            <input value={form.celular} onChange={(e) => setForm({ ...form, celular: e.target.value })} />
            <label>Correo (opcional)</label>
            <input value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
            <label>Ciudad</label>
            <input value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
            <div className="check">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
              <label style={{ margin: 0 }}>Acepto el tratamiento de mis datos personales para gestionar esta reserva.</label>
            </div>
            {error && <div className="error">{error}</div>}
            <div style={{ marginTop: 18 }}>
              <button className="btn" onClick={submit} disabled={loading}>{loading ? 'Enviando...' : 'Enviar solicitud'}</button>
            </div>
          </>
        )}

        {view === 'confirm' && confirmData && (
          <>
            <h2>¡Solicitud recibida!</h2>
            <p style={{ opacity: .85 }}>Tus números quedaron reservados temporalmente.</p>
            <div className="chips">{confirmData.numeros.map((n) => <span className="chip" key={n}>{n}</span>)}</div>
            <p style={{ opacity: .7, fontSize: '.85rem', marginTop: 10 }}>Código de solicitud</p>
            <div className="code">{confirmData.code}</div>
            <span className="status-badge">PENDIENTE DE CONFIRMACIÓN</span>
            <div style={{ marginTop: 22 }}>
              <a href={confirmData.waLink} target="_blank" rel="noreferrer">
                <button className="btn wa">Continuar por WhatsApp</button>
              </a>
            </div>
            <div style={{ marginTop: 10 }}>
              <button className="btn secondary" onClick={() => { setView('landing'); setConfirmData(null); }}>Volver al inicio</button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
