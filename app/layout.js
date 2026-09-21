import './globals.css';

export const metadata = {
  title: 'Casa Libre · Reddit Agent',
  description: 'Listening + AI drafting review queue for Paraguay real-estate threads. Discovery + drafting only — a human posts.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
