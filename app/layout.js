import './globals.css';
import { Space_Grotesk, IBM_Plex_Mono, Instrument_Serif } from 'next/font/google';

const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-grotesk' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });
const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: 'italic', variable: '--font-serif' });

export const metadata = {
  title: 'Reddit Agent · Casa Libre',
  description: 'Listening + AI drafting for real-estate conversations on Reddit. Read + draft only — a human posts.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${mono.variable} ${serif.variable}`}>
      <body className="min-h-screen antialiased font-sans">{children}</body>
    </html>
  );
}
