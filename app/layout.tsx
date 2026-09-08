import type { Metadata } from 'next';
import './globals.css';
import {Quicksand, Montserrat} from 'next/font/google';
const displayFont=Quicksand({subsets:['latin'],weight:['300','400','500'],variable:'--font-display',display:'swap'});
const bodyFont=Montserrat({subsets:['latin'],weight:['400','500','600'],variable:'--font-copy',display:'swap'});
export const metadata:Metadata={title:'AI IMMO — L’académie des courtiers de demain',description:'Formation en intelligence artificielle et marketing immobilier au Québec. Parcours guidés, prompts ChatGPT, exercices et accompagnement.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="fr-CA"><body className={`${displayFont.variable} ${bodyFont.variable}`}>{children}</body></html>}

