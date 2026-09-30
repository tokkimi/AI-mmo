import type { Metadata, Viewport } from 'next';
import './globals.css';
import {CurrencyProvider} from '@/components/currency';
import {Quicksand, Montserrat} from 'next/font/google';
const displayFont=Quicksand({subsets:['latin'],weight:['300','400','500'],variable:'--font-display',display:'swap'});
const bodyFont=Montserrat({subsets:['latin'],weight:['400','500','600'],variable:'--font-copy',display:'swap'});
export const metadata:Metadata={icons:{icon:'/brand/i-ateliers-logo.png',apple:'/brand/i-ateliers-logo.png'},title:'i-ateliers — De l’intelligence à l’action',description:'Formation en intelligence artificielle et organisation et automatisation des entreprises au Québec. Parcours guidés, prompts ChatGPT, exercices et accompagnement.'};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="fr-CA"><body className={`${displayFont.variable} ${bodyFont.variable}`}><CurrencyProvider>{children}</CurrencyProvider></body></html>}

