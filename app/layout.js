import './globals.css';

export const metadata = {
  title: 'Jota Family · Vending — Participa por tu número',
  description: 'Elige tu número y reserva tu cupo en la dinámica de Jota Family.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
