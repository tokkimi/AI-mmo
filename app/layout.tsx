import { Suspense } from 'react';
import { SiteMeasurement, MeasurementConsent } from '@/components/site-measurement';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import {CurrencyProvider} from '@/components/currency';
import {Quicksand, Montserrat} from 'next/font/google';
const displayFont=Quicksand({subsets:['latin'],weight:['300','400','500'],variable:'--font-display',display:'swap'});
const bodyFont=Montserrat({subsets:['latin'],weight:['400','500','600'],variable:'--font-copy',display:'swap'});
export const metadata:Metadata={metadataBase:new URL('https://i-ateliers.store'),creator:'Alexia Naudy',authors:[{name:'Alexia Naudy'}],alternates:{canonical:'/'},icons:{icon:'/brand/i-ateliers-logo.png',apple:'/brand/i-ateliers-logo.png'},title:'Formation IA pour entreprises au Québec | i-ateliers',description:'Formation pratique en intelligence artificielle, ChatGPT, organisation et automatisation pour les entreprises du Québec. Parcours guidés et accompagnement humain.',openGraph:{type:'website',locale:'fr_CA',siteName:'i-ateliers',title:'i-ateliers — De l’intelligence à l’action',description:'Formations IA pratiques et outils d’automatisation conçus au Québec.',url:'https://i-ateliers.store'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="fr-CA"><body className={`${displayFont.variable} ${bodyFont.variable}`}><Suspense fallback={null}><SiteMeasurement /><MeasurementConsent /></Suspense><CurrencyProvider>{children}</CurrencyProvider></body></html>}

